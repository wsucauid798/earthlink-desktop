/**
 * Agent History Store — accumulates per-agent time series from tick events.
 *
 * Each tick snapshot records the agent's key metrics so the Analytics,
 * Decisions, and Traces views can render real-time charts and logs.
 *
 * Ring-buffer per agent (configurable max length) to cap memory.
 */

import { create } from "zustand";
import type { AgentEvent, WorldTime } from "../api/types";

/** A single tick's snapshot for one agent. */
export interface AgentSnapshot {
  tick: number;
  timestamp: string; // WorldTime.current_time
  fromLocationId: number;
  toLocationId: number;
  action: string;
  knowledgeScore: number;
  reward: number;
  qValue: number;
  energy?: number; // injected from AgentSummary when available
  goal: Record<string, unknown> | null;
}

/** Accumulated history for one agent. */
export interface AgentHistory {
  agentId: string;
  snapshots: AgentSnapshot[];
}

interface AgentHistoryStoreState {
  /** agentId -> history */
  histories: Record<string, AgentHistory>;
  /** Max snapshots per agent before old ones are dropped */
  maxSnapshots: number;

  /** Record a tick's agent events into history */
  recordTick: (tick: number, time: WorldTime, events: AgentEvent[], trackedAgentIds?: string[]) => void;
  /** Set which agents should be tracked for history (selection + open tabs). */
  setTrackedAgents: (agentIds: string[]) => void;
  /** Clear all history (e.g. on world reset) */
  clearAll: () => void;
  /** Clear one agent's history */
  clearAgent: (agentId: string) => void;
  /** Get history for a specific agent */
  getAgentHistory: (agentId: string) => AgentHistory | undefined;
}

const DEFAULT_MAX_SNAPSHOTS = 400;
const MAX_TRACKED_AGENTS = 32;

export const useAgentHistoryStore = create<AgentHistoryStoreState>((set, get) => ({
  histories: {},
  maxSnapshots: DEFAULT_MAX_SNAPSHOTS,
  setTrackedAgents: (agentIds) => {
    const unique = Array.from(new Set(agentIds.filter(Boolean))).slice(0, MAX_TRACKED_AGENTS);
    const tracked = new Set(unique);
    const { histories } = get();
    const pruned: Record<string, AgentHistory> = {};
    for (const id of Object.keys(histories)) {
      if (tracked.has(id)) pruned[id] = histories[id];
    }
    set({ histories: pruned });
  },

  recordTick: (tick, time, events, trackedAgentIds) => {
    if (events.length === 0) return;
    const trackedSet = trackedAgentIds && trackedAgentIds.length > 0
      ? new Set(trackedAgentIds)
      : null;
    if (trackedSet && trackedSet.size === 0) return;

    const { histories, maxSnapshots } = get();
    const updated = trackedSet ? Object.fromEntries(
      Object.entries(histories).filter(([agentId]) => trackedSet.has(agentId)),
    ) : { ...histories };

    for (const e of events) {
      if (trackedSet && !trackedSet.has(e.agent_id)) continue;
      const snapshot: AgentSnapshot = {
        tick,
        timestamp: time.current_time,
        fromLocationId: e.from_location_id,
        toLocationId: e.to_location_id,
        action: e.action,
        knowledgeScore: e.knowledge_score,
        reward: e.reward,
        qValue: e.q_value,
        energy: e.energy,
        goal: e.goal,
      };

      const existing = updated[e.agent_id];
      if (existing) {
        const snaps = [...existing.snapshots, snapshot];
        // Ring buffer: trim from front if over limit
        updated[e.agent_id] = {
          ...existing,
          snapshots: snaps.length > maxSnapshots ? snaps.slice(snaps.length - maxSnapshots) : snaps,
        };
      } else {
        updated[e.agent_id] = {
          agentId: e.agent_id,
          snapshots: [snapshot],
        };
      }
    }

    set({ histories: updated });
  },

  clearAll: () => set({ histories: {} }),
  clearAgent: (agentId) => {
    const { histories } = get();
    const updated = { ...histories };
    delete updated[agentId];
    set({ histories: updated });
  },
  getAgentHistory: (agentId) => get().histories[agentId],
}));
