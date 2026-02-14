/**
 * World store — the live state of the virtual world.
 *
 * ALL agents are held in memory and updated on every tick.
 * They must be available to the map for real-time rendering.
 *
 * Locations are not bulk-loaded (100K+). They're rendered on
 * the map via tile layers / viewport queries and fetched
 * individually on demand (click, search).
 */

import { create } from "zustand";
import type {
  AgentEvent,
  AgentSummary,
  TickEvent,
  WorldState,
  WorldTime,
} from "../api/types";

export interface WorldStoreState {
  // World meta
  isRunning: boolean;
  locationCount: number;
  connectionCount: number;
  weatherStations: number;
  agentCount: number;

  // Time
  time: WorldTime | null;

  // ALL agents — always in memory, rendered on the map in real time
  agents: AgentSummary[];

  // Tick
  tickCount: number;
  lastAgentEvents: AgentEvent[];

  // Setters
  setWorldState: (state: WorldState) => void;
  setAgents: (agents: AgentSummary[]) => void;
  handleTick: (event: TickEvent) => void;
}

export const useWorldStore = create<WorldStoreState>((set, get) => ({
  isRunning: false,
  locationCount: 0,
  connectionCount: 0,
  weatherStations: 0,
  agentCount: 0,
  time: null,
  agents: [],
  tickCount: 0,
  lastAgentEvents: [],

  setWorldState: (state) =>
    set({
      isRunning: state.is_running,
      locationCount: state.location_count,
      connectionCount: state.connection_count,
      weatherStations: state.weather_stations,
      agentCount: state.agent_count,
      time: state.time,
      tickCount: state.time?.tick_count ?? 0,
      // World state also includes agent summaries
      agents: state.agents ?? get().agents,
    }),

  setAgents: (agents) => set({ agents, agentCount: agents.length }),

  handleTick: (event) => {
    const { agents } = get();
    const updatedAgents = [...agents];

    // Update every agent's live state from tick events
    for (const ae of event.agent_events) {
      const idx = updatedAgents.findIndex((a) => a.id === ae.agent_id);
      if (idx !== -1) {
        updatedAgents[idx] = {
          ...updatedAgents[idx],
          location_id: ae.to_location_id,
          last_action: ae.action,
          knowledge_score: ae.knowledge_score,
          last_reward: ae.reward,
          goal: ae.goal,
        };
      }
    }

    set({
      time: event.time,
      tickCount: event.tick,
      lastAgentEvents: event.agent_events,
      isRunning: true,
      agents: updatedAgents,
    });
  },
}));
