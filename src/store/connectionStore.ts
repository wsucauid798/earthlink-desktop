/**
 * Connection store — manages server connection lifecycle.
 *
 * Handles: server URL, REST client, WebSocket, connection status,
 * initial world state fetch, and tick streaming.
 */

import { create } from "zustand";
import { client } from "../api/client";
import { worldWs, type WsStatus } from "../api/ws";
import { useWorldStore } from "./worldStore";
import { useLogStore } from "./logStore";
import type { TickEvent } from "../api/types";

export interface ConnectionState {
  serverUrl: string;
  connected: boolean;
  wsStatus: WsStatus;
  serverVersion: string | null;
  error: string | null;
  connecting: boolean;

  setServerUrl: (url: string) => void;
  connect: () => Promise<void>;
  disconnect: () => void;
}

export const useConnectionStore = create<ConnectionState>((set, get) => ({
  serverUrl: "http://localhost:8000",
  connected: false,
  wsStatus: "disconnected",
  serverVersion: null,
  error: null,
  connecting: false,

  setServerUrl: (url) => set({ serverUrl: url }),

  connect: async () => {
    const { serverUrl } = get();
    set({ connecting: true, error: null });
    const log = useLogStore.getState();
    log.addConsole("info", `Connecting to ${serverUrl}...`);

    // 1. Test REST connection by fetching version
    try {
      client.baseUrl = serverUrl;
      const ver = await client.getVersion();
      set({ serverVersion: ver.version });
      log.addConsole("success", `Server v${ver.version} found`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ connected: false, connecting: false, error: msg });
      log.addConsole("error", `Connection failed: ${msg}`);
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
      },
      onError: (msg) => {
        log.addConsole("error", `WebSocket: ${msg}`);
      },
    });

    worldWs.connect(serverUrl);

    set({ connected: true, connecting: false });
    log.addConsole("success", "Connected to EarthLink server");
  },

  disconnect: () => {
    worldWs.disconnect();
    set({
      connected: false,
      wsStatus: "disconnected",
      serverVersion: null,
    });
    useLogStore.getState().addConsole("info", "Disconnected from server");
  },
}));
