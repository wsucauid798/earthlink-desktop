/**
 * Map2D — 2D and 2.5D map views (MapLibre mercator + pitch).
 *
 * View-specific logic only:
 * - 2D ↔ 2.5D pitch/bearing switching
 * - Trajectory line for selected agent
 * - Reset view for 2D/2.5D
 *
 * All shared logic (layers, popups, data loading, fly-to) lives in useEarthMap.
 * All shared controls live in MapControls.
 */

import { useEffect } from "react";
import { useViewModeStore } from "../store/viewModeStore";
import { useSelectionStore } from "../store/selectionStore";
import { useAgentHistoryStore } from "../store/agentHistoryStore";
import { locationLookup, DEFAULT_CENTER } from "./mapShared";
import { useEarthMap } from "./useEarthMap";
import MapControls from "./MapControls";

const DEFAULT_ZOOM = 2;

export default function Map2D() {
  const viewMode = useViewModeStore((s) => s.viewMode);

  const { containerRef, mapRef } = useEarthMap({
    center: DEFAULT_CENTER,
    zoom: DEFAULT_ZOOM,
    pitch: viewMode === "2.5d" ? 45 : 0,
    bearing: viewMode === "2.5d" ? -15 : 0,
    logLabel: "map",
  });

  // --- 2D ↔ 2.5D switching ---
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    if (viewMode === "3d") return; // 3D is rendered by Map3D

    const is25d = viewMode === "2.5d";
    map.setProjection({ type: "mercator" });
    map.setMinZoom(is25d ? 3 : 0);

    const minZoom = is25d ? 3 : 0;
    const targetZoom = map.getZoom() < minZoom ? minZoom : undefined;

    map.easeTo({
      pitch: is25d ? 45 : 0,
      bearing: is25d ? -15 : 0,
      ...(targetZoom !== undefined ? { zoom: targetZoom } : {}),
      duration: 800,
    });
  }, [viewMode]);

  // --- Trajectory line for selected agent ---
  const selectedAgentId = useSelectionStore((s) => s.kind === "agent" ? s.id : null);
  const trajectorySnapshots = useAgentHistoryStore((s) =>
    selectedAgentId ? s.histories[selectedAgentId]?.snapshots : undefined,
  );

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const src = map.getSource("trajectory") as maplibregl.GeoJSONSource | undefined;
    if (!src) return;

    if (!selectedAgentId || !trajectorySnapshots || trajectorySnapshots.length < 2) {
      src.setData({ type: "FeatureCollection", features: [] });
      return;
    }

    const coords: [number, number][] = [];
    for (const snap of trajectorySnapshots) {
      const c = locationLookup.get(snap.toLocationId);
      if (c) {
        const last = coords[coords.length - 1];
        if (!last || last[0] !== c[0] || last[1] !== c[1]) {
          coords.push(c);
        }
      }
    }

    if (coords.length >= 2) {
      src.setData({
        type: "FeatureCollection",
        features: [{
          type: "Feature",
          geometry: { type: "LineString", coordinates: coords },
          properties: {},
        }],
      });
    } else {
      src.setData({ type: "FeatureCollection", features: [] });
    }
  }, [selectedAgentId, trajectorySnapshots]);

  // --- Reset for 2D/2.5D ---
  const resetView = () => {
    const is25d = viewMode === "2.5d";
    mapRef.current?.flyTo({
      center: DEFAULT_CENTER,
      zoom: is25d ? Math.max(DEFAULT_ZOOM, 3) : DEFAULT_ZOOM,
      pitch: is25d ? 45 : 0,
      bearing: is25d ? -15 : 0,
      duration: 1200,
    });
  };

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />
      <MapControls mapRef={mapRef} onReset={resetView} />
    </div>
  );
}
