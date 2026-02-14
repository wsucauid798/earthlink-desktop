/**
 * View mode store — controls which map projection is active.
 *
 * Used by the map components to render the correct view and
 * to display the view mode toggle on the map itself.
 */

import { create } from "zustand";

export type ViewMode = "2d" | "2.5d" | "3d";

interface ViewModeState {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
}

export const useViewModeStore = create<ViewModeState>((set) => ({
  viewMode: "2d",
  setViewMode: (mode) => set({ viewMode: mode }),
}));
