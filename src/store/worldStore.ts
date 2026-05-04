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
import { normalizeAgentAction, withNormalizedAgentAction } from "../lib/agentAction";
import { locationLookup, locationNameLookup } from "../components/mapShared";
import type {
  AgentEvent,
  AgentSummary,
  EarthProxyStatus,
  EarthRotation,
  GeographyStats,
  RefreshStatus,
  TickEvent,
  WeatherSummary,
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
  agentBackend: string;

  // Time
  time: WorldTime | null;

  // Weather summary (keyed by location name)
  weatherSummary: Record<string, WeatherSummary>;

  // Earth geography statistics
  geographyStats: GeographyStats | null;

  // Earth proxy
  earthProxy: EarthProxyStatus | null;

  // Data freshness
  refresh: Record<string, RefreshStatus> | null;

  // ALL agents — always in memory, rendered on the map in real time
  agents: AgentSummary[];

  // Earth rotation (updated every tick from server)
  rotation: EarthRotation | null;

  // Tick
  tickCount: number;
  lastAgentEvents: AgentEvent[];
  earthProxyResolves: number;
  dataFeedsUpdated: boolean;
  agentPhaseExceeded: boolean;

  // Simulation speed
  speedMultiplier: number;
  setSpeedMultiplier: (speed: number) => void;

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
  agentBackend: "",
  time: null,
  weatherSummary: {},
  geographyStats: null,
  earthProxy: null,
  refresh: null,
  rotation: null,
  agents: [],
  tickCount: 0,
  lastAgentEvents: [],
  earthProxyResolves: 0,
  dataFeedsUpdated: false,
  agentPhaseExceeded: false,
  speedMultiplier: 1,
  setSpeedMultiplier: (speed) => set({ speedMultiplier: speed }),

  setWorldState: (state) =>
    set({
      isRunning: state.is_running,
      locationCount: state.location_count,
      connectionCount: state.connection_count,
      weatherStations: state.weather_stations,
      agentCount: state.agent_count,
      agentBackend: state.agent_backend ?? "",
      time: state.time,
      tickCount: state.time?.tick_count ?? 0,
      weatherSummary: state.weather ?? {},
      geographyStats: state.geography_stats ?? null,
      earthProxy: state.earth_proxy ?? null,
      refresh: state.refresh ?? null,
      earthProxyResolves: state.earth_proxy?.total_resolves ?? get().earthProxyResolves,
      // World state also includes agent summaries
      agents: (state.agents ?? get().agents).map(withNormalizedAgentAction),
    }),

  setAgents: (agents) => set({
    agents: agents.map(withNormalizedAgentAction),
    agentCount: agents.length,
  }),

  handleTick: (event) => {
    const { agents } = get();
    const updatedAgents = [...agents];

    // Update every agent's live state from tick events
    for (const ae of event.agent_events) {
      const idx = updatedAgents.findIndex((a) => a.id === ae.agent_id);
      if (idx !== -1) {
        // Use coordinates from tick event (server-resolved), fall back to locationLookup
        const coord = locationLookup.get(ae.to_location_id);
        const lat = ae.lat ?? (coord ? coord[1] : null);
        const lng = ae.lng ?? (coord ? coord[0] : null);
        updatedAgents[idx] = {
          ...updatedAgents[idx],
          location_id: ae.to_location_id,
          lat,
          lng,
          location_name: ae.location_name ?? locationNameLookup.get(ae.to_location_id) ?? updatedAgents[idx].location_name,
          last_action: normalizeAgentAction(ae.action),
          energy: ae.energy,
          knowledge_score: ae.knowledge_score,
          visited_locations: ae.visited_count,
          last_reward: ae.reward,
          goal: ae.goal,
          travel: ae.travel ?? null,
        };
      }
    }

    set({
      time: event.time,
      tickCount: event.tick,
      rotation: event.rotation ?? get().rotation,
      lastAgentEvents: event.agent_events,
      earthProxyResolves: event.earth_proxy_resolves ?? get().earthProxyResolves,
      dataFeedsUpdated: event.data_feeds_updated,
      agentPhaseExceeded: event.agent_phase_exceeded ?? false,
      isRunning: true,
      agents: updatedAgents,
    });
  },
}));
