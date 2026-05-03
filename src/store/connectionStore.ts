/**
 * Connection store — manages server connection lifecycle.
 *
 * Auto-connects on first use. Retries with exponential backoff
 * on failure. Manual connect only exposed as a last resort.
 */

import { create } from "zustand";
import { client } from "../api/client";
import { worldWs, type WsStatus } from "../api/ws";
import { useWorldStore } from "./worldStore";
import { useLogStore } from "./logStore";
import { useAgentHistoryStore } from "./agentHistoryStore";
import { useSelectionStore } from "./selectionStore";
import { useViewportStore } from "./viewportStore";
import type { TickEvent } from "../api/types";

const RETRY_DELAYS = [2_000, 4_000, 8_000, 15_000, 30_000]; // escalating backoff
const MAX_RETRIES = RETRY_DELAYS.length;

/** Map raw fetch/network errors to something a human can read. */
function humanizeError(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower === "failed to fetch" || lower.includes("networkerror") || lower.includes("net::err"))
    return "The server isn't running or can't be reached";
  if (lower.includes("econnrefused"))
    return "Connection refused — is the server running?";
  if (lower.includes("timeout") || lower.includes("timed out"))
    return "The server took too long to respond";
  if (/api\s+5\d\d/.test(lower))
    return "The server encountered an internal error";
  return raw; // already informative
}

export interface ConnectionState {
  serverUrl: string;
  connected: boolean;
  wsStatus: WsStatus;
  serverVersion: string | null;
  error: string | null;
  connecting: boolean;
  /** How many auto-connect attempts have been made */
  retryCount: number;
  /** Whether auto-retry has been exhausted (manual connect available) */
  retriesExhausted: boolean;
  /** Whether the user manually cancelled the retry loop */
  retryCancelled: boolean;

  setServerUrl: (url: string) => void;
  connect: () => Promise<void>;
  disconnect: () => void;
  /** Called once on app boot — kicks off auto-connect */
  autoConnect: () => void;
  /** Cancel the current auto-retry loop */
  cancelRetry: () => void;
}

let retryTimer: ReturnType<typeof setTimeout> | null = null;

import { invoke } from "@tauri-apps/api/core";

const DEFAULT_SERVER_URL = "http://localhost:8000";

/** Load server URL synchronously from localStorage (fast), then async from disk config. */
function loadServerUrlSync(): string {
  try {
    return localStorage.getItem("earthlink_server_url") || DEFAULT_SERVER_URL;
  } catch {
    return DEFAULT_SERVER_URL;
  }
}

/** Load config from ~/.earthlink/config.json and update the store + localStorage. */
async function loadConfigFromDisk(): Promise<void> {
  try {
    const raw = await invoke<string>("load_config");
    const config = JSON.parse(raw);
    if (config.serverUrl) {
      localStorage.setItem("earthlink_server_url", config.serverUrl);
      useConnectionStore.setState({ serverUrl: config.serverUrl });
    }
  } catch { /* first run — no config yet */ }
}

/** Save server URL to both localStorage and ~/.earthlink/config.json. */
async function saveServerUrl(url: string): Promise<void> {
  try { localStorage.setItem("earthlink_server_url", url); } catch { /* ignore */ }
  try {
    const raw = await invoke<string>("load_config").catch(() => "{}");
    const config = JSON.parse(raw);
    config.serverUrl = url;
    await invoke("save_config", { json: JSON.stringify(config, null, 2) });
  } catch { /* ignore */ }
}

// Kick off async disk load on module init
setTimeout(() => loadConfigFromDisk(), 0);

export const useConnectionStore = create<ConnectionState>((set, get) => ({
  serverUrl: loadServerUrlSync(),
  connected: false,
  wsStatus: "disconnected",
  serverVersion: null,
  error: null,
  connecting: false,
  retryCount: 0,
  retriesExhausted: false,
  retryCancelled: false,

  setServerUrl: (url) => {
    saveServerUrl(url);  // async — writes to localStorage + ~/.earthlink/config.json
    set({ serverUrl: url });
  },

  autoConnect: () => {
    // Start the auto-connect loop
    get().connect();
  },

  cancelRetry: () => {
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
    set({ connecting: false, retryCancelled: true, retryCount: 0 });
    useLogStore.getState().addConsole("info", "Connection cancelled by user");
  },

  connect: async () => {
    const { serverUrl, connected } = get();
    if (connected) return;

    set({ connecting: true, error: null, retriesExhausted: false, retryCancelled: false });
    const log = useLogStore.getState();
    const retryCount = get().retryCount;

    if (retryCount === 0) {
      log.addConsole("info", `Connecting to ${serverUrl}...`);
    } else {
      log.addConsole("info", `Retry ${retryCount}/${RETRY_DELAYS.length}...`);
    }

    // 1. Test REST connection by fetching version
    try {
      client.baseUrl = serverUrl;
      const ver = await client.getVersion();
      set({ serverVersion: ver.version, retryCount: 0 });
      log.addConsole("success", `Server v${ver.version} found`);
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      const friendly = humanizeError(raw);
      set({ connecting: false, error: friendly });

      const nextRetry = retryCount + 1;
      if (nextRetry <= MAX_RETRIES) {
        const delay = RETRY_DELAYS[Math.min(nextRetry - 1, MAX_RETRIES - 1)];
        log.addConsole("warning", `Connection failed. Retrying in ${delay / 1000}s...`);
        set({ retryCount: nextRetry });
        retryTimer = setTimeout(() => get().connect(), delay);
      } else {
        log.addConsole("error", `Connection failed after ${MAX_RETRIES} retries: ${raw}`);
        set({ retriesExhausted: true, retryCount: 0 });
      }
      return;
    }

    // 2. Fetch initial world state
    try {
      const state = await client.getWorldState();
      useWorldStore.getState().setWorldState(state);
      log.addConsole(
        "success",
        `World loaded: ${state.location_count.toLocaleString()} locations, ${state.agent_count} agents`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log.addConsole("warning", `Could not fetch world state: ${msg}`);
    }

    // 3. Fetch ALL agents — they're rendered on the map in real time
    try {
      const agents = await client.getAgents({ limit: 5000 });
      useWorldStore.getState().setAgents(agents);
      log.addConsole("success", `${agents.length} agents loaded`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log.addConsole("warning", `Could not fetch agents: ${msg}`);
    }

    // 4. Open stream transport for tick streaming (WT preferred, WS fallback)
    worldWs.on({
      onStatusChange: (status) => {
        set({ wsStatus: status });
        if (status === "connected") {
          log.addConsole("success", "World stream connected");
        } else if (status === "reconnecting") {
          log.addConsole("warning", "World stream reconnecting...");
        }
      },
      onTick: (event: TickEvent) => {
        useWorldStore.getState().handleTick(event);
        log.addTickEvent(event);

        // Live refresh: re-fetch stale data for selected location
        useSelectionStore.getState().handleTick(event);

        // Record history only for relevant agents (selected + open agent tabs).
        const tracked = new Set<string>();
        const selection = useSelectionStore.getState();
        if (selection.kind === "agent" && selection.id) {
          tracked.add(String(selection.id));
        }
        for (const tab of useViewportStore.getState().tabs) {
          if (tab.agentId) tracked.add(tab.agentId);
        }
        const trackedIds = Array.from(tracked);
        useAgentHistoryStore.getState().setTrackedAgents(trackedIds);
        useAgentHistoryStore.getState().recordTick(
          event.tick, event.time, event.agent_events, trackedIds,
        );
      },
      onError: (msg) => {
        log.addConsole("warning", `Stream transport: ${msg}`);
      },
    });

    worldWs.connect(serverUrl);

    set({ connected: true, connecting: false, retryCount: 0 });
    log.addConsole("success", "Connected to EarthLink server");
  },

  disconnect: () => {
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
    worldWs.disconnect();
    set({
      connected: false,
      wsStatus: "disconnected",
      serverVersion: null,
      retryCount: 0,
      retriesExhausted: false,
      retryCancelled: false,
    });
    useLogStore.getState().addConsole("info", "Disconnected from server");
  },
}));
