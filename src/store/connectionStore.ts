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
import type { TickEvent } from "../api/types";

const RETRY_DELAYS = [2_000, 4_000, 8_000, 15_000, 30_000]; // escalating backoff

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

  setServerUrl: (url: string) => void;
  connect: () => Promise<void>;
  disconnect: () => void;
  /** Called once on app boot — kicks off auto-connect */
  autoConnect: () => void;
}

let retryTimer: ReturnType<typeof setTimeout> | null = null;

export const useConnectionStore = create<ConnectionState>((set, get) => ({
  serverUrl: "http://localhost:8000",
  connected: false,
  wsStatus: "disconnected",
  serverVersion: null,
  error: null,
  connecting: false,
  retryCount: 0,
  retriesExhausted: false,

  setServerUrl: (url) => set({ serverUrl: url }),

  autoConnect: () => {
    // Start the auto-connect loop
    get().connect();
  },

  connect: async () => {
    const { serverUrl, connected } = get();
    if (connected) return;

    set({ connecting: true, error: null, retriesExhausted: false });
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
      const msg = err instanceof Error ? err.message : String(err);
      set({ connecting: false, error: msg });

      const nextRetry = retryCount + 1;
      if (nextRetry <= RETRY_DELAYS.length) {
        const delay = RETRY_DELAYS[Math.min(nextRetry - 1, RETRY_DELAYS.length - 1)];
        log.addConsole("warning", `Connection failed. Retrying in ${delay / 1000}s...`);
        set({ retryCount: nextRetry });
        retryTimer = setTimeout(() => get().connect(), delay);
      } else {
        log.addConsole("error", `Connection failed after ${RETRY_DELAYS.length} retries: ${msg}`);
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

    // 4. Open WebSocket for tick streaming
    worldWs.on({
      onStatusChange: (status) => {
        set({ wsStatus: status });
        if (status === "connected") {
          log.addConsole("success", "WebSocket stream connected");
        } else if (status === "reconnecting") {
          log.addConsole("warning", "WebSocket reconnecting...");
        }
      },
      onTick: (event: TickEvent) => {
        useWorldStore.getState().handleTick(event);
        log.addTickEvent(event);

        // Record into history store for Analytics/Decisions/Traces
        const energyMap: Record<string, number> = {};
        for (const a of useWorldStore.getState().agents) {
          energyMap[a.id] = a.energy;
        }
        useAgentHistoryStore.getState().recordTick(
          event.tick, event.time, event.agent_events, energyMap,
        );
      },
      onError: (msg) => {
        log.addConsole("error", `WebSocket: ${msg}`);
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
    });
    useLogStore.getState().addConsole("info", "Disconnected from server");
  },
}));
