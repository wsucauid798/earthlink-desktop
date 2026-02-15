/**
 * Map3D — 3D globe view (MapLibre globe projection).
 *
 * View-specific logic only:
 * - Globe projection set on style load
 * - Globe-specific default zoom and reset
 *
 * All shared logic (layers, popups, data loading, fly-to) lives in useEarthMap.
 * All shared controls live in MapControls.
 */

import { DEFAULT_CENTER } from "./mapShared";
import { useEarthMap } from "./useEarthMap";
import MapControls from "./MapControls";

const GLOBE_ZOOM = 2.35;

export default function Map3D() {
  const { containerRef, mapRef } = useEarthMap({
    center: DEFAULT_CENTER,
    zoom: GLOBE_ZOOM,
    logLabel: "3D globe",
    onStyleLoaded: (map) => {
      map.setProjection({ type: "globe" });
    },
  });

  const resetView = () => {
    mapRef.current?.flyTo({
      center: DEFAULT_CENTER,
      zoom: GLOBE_ZOOM,
      pitch: 0,
      bearing: 0,
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
