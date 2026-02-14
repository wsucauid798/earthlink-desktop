/**
 * Viewport store — manages tabs in the center viewport area.
 *
 * The Map is always the first tab and cannot be closed.
 * Other views (Analytics, Decisions, Traces, etc.) are opened
 * as closable tabs alongside the map — like Cursor's editor tabs.
 */

import { create } from "zustand";

export type ViewportTabKind = "map" | "analytics" | "decisions" | "traces";

export interface ViewportTab {
  id: string;
  kind: ViewportTabKind;
  label: string;
  /** For agent-scoped views, the agent id */
  agentId?: string;
  /** For agent-scoped views, the agent name (for the tab label) */
  agentName?: string;
  closable: boolean;
}

interface ViewportStoreState {
  tabs: ViewportTab[];
  activeTabId: string;

  /** Open a new tab or focus it if already open */
  openTab: (kind: ViewportTabKind, agentId?: string, agentName?: string) => void;
  /** Close a tab by id */
  closeTab: (id: string) => void;
  /** Switch to a tab */
  setActiveTab: (id: string) => void;
}

function makeTabId(kind: ViewportTabKind, agentId?: string): string {
  return agentId ? `${kind}:${agentId}` : kind;
}

function makeLabel(kind: ViewportTabKind, agentName?: string): string {
  const base = kind === "analytics" ? "Analytics" : kind === "decisions" ? "Decisions" : kind === "traces" ? "Traces" : "Map";
  return agentName ? `${base} — ${agentName}` : base;
}

const MAP_TAB: ViewportTab = {
  id: "map",
  kind: "map",
  label: "Map",
  closable: false,
};

export const useViewportStore = create<ViewportStoreState>((set, get) => ({
  tabs: [MAP_TAB],
  activeTabId: "map",

  openTab: (kind, agentId, agentName) => {
    const id = makeTabId(kind, agentId);
    const { tabs } = get();

    // If tab already exists, just focus it
    if (tabs.find((t) => t.id === id)) {
      set({ activeTabId: id });
      return;
    }

    const newTab: ViewportTab = {
      id,
      kind,
      label: makeLabel(kind, agentName),
      agentId,
      agentName,
      closable: true,
    };

    set({ tabs: [...tabs, newTab], activeTabId: id });
  },

  closeTab: (id) => {
    if (id === "map") return; // can't close the map
    const { tabs, activeTabId } = get();
    const newTabs = tabs.filter((t) => t.id !== id);
    const newActive = activeTabId === id ? "map" : activeTabId;
    set({ tabs: newTabs, activeTabId: newActive });
  },

  setActiveTab: (id) => set({ activeTabId: id }),
}));
