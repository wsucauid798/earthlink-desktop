/**
 * Selection store — tracks what entity is currently selected.
 *
 * The Explorer, Map, and Inspector all share this state.
 * When a selection changes, the Inspector fetches detail.
 */

import { create } from "zustand";
import { client } from "../api/client";
import type { AgentDetail, Location, Weather, AgentAnswer } from "../api/types";

export type SelectionKind = "location" | "agent" | null;

export interface SelectionState {
  kind: SelectionKind;
  id: string | number | null;

  // Fetched detail (populated after selection)
  locationDetail: Location | null;
  locationWeather: Weather | null;
  agentDetail: AgentDetail | null;

  // Ask agent
  askLoading: boolean;
  lastAnswer: AgentAnswer | null;

  // Actions
  selectLocation: (id: number) => void;
  selectAgent: (id: string) => void;
  clearSelection: () => void;
  askAgent: (question: string) => Promise<void>;
}

export const useSelectionStore = create<SelectionState>((set, get) => ({
  kind: null,
  id: null,
  locationDetail: null,
  locationWeather: null,
  agentDetail: null,
  askLoading: false,
  lastAnswer: null,

  selectLocation: async (id) => {
    set({
      kind: "location",
      id,
      locationDetail: null,
      locationWeather: null,
      agentDetail: null,
      lastAnswer: null,
    });
    try {
      const [loc, weather] = await Promise.all([
        client.getLocation(id),
        client.getWeather(id).catch(() => null),
      ]);
      // Only update if still selected
      if (get().kind === "location" && get().id === id) {
        set({ locationDetail: loc, locationWeather: weather });
      }
    } catch {
      // Selection may have changed
    }
  },

  selectAgent: async (id) => {
    set({
      kind: "agent",
      id,
      locationDetail: null,
      locationWeather: null,
      agentDetail: null,
      lastAnswer: null,
    });
    try {
      const detail = await client.getAgent(id);
      if (get().kind === "agent" && get().id === id) {
        set({ agentDetail: detail });
      }
    } catch {
      // Selection may have changed
    }
  },

  clearSelection: () =>
    set({
      kind: null,
      id: null,
      locationDetail: null,
      locationWeather: null,
      agentDetail: null,
      lastAnswer: null,
    }),

  askAgent: async (question) => {
    const { kind, id } = get();
    if (kind !== "agent" || !id) return;
    set({ askLoading: true, lastAnswer: null });
    try {
      const answer = await client.askAgent(String(id), question);
      set({ lastAnswer: answer, askLoading: false });
    } catch {
      set({ askLoading: false });
    }
  },
}));
