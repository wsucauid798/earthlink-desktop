/**
 * MapControls — shared map control buttons for Map2D and Map3D.
 *
 * Renders:
 * - Zoom in / out
 * - Reset view
 * - Reset north (compass)
 * - View mode toggle (2D / 2.5D / 3D)
 */

import React from "react";
import maplibregl from "maplibre-gl";
import { ZoomIn, ZoomOut, LocateFixed, Compass, Map as MapIcon, Layers, Box } from "lucide-react";
import { useViewModeStore, type ViewMode } from "../store/viewModeStore";

interface MapControlsProps {
  mapRef: React.RefObject<maplibregl.Map | null>;
  onReset: () => void;
}

const ZOOM_STEP = 0.5;

export default function MapControls({ mapRef, onReset }: MapControlsProps) {
  const viewMode = useViewModeStore((s) => s.viewMode);
  const setViewMode = useViewModeStore((s) => s.setViewMode);

  const zoomIn = () => {
    const map = mapRef.current;
    if (map) map.zoomTo(map.getZoom() + ZOOM_STEP, { duration: 300 });
  };
  const zoomOut = () => {
    const map = mapRef.current;
    if (map) map.zoomTo(map.getZoom() - ZOOM_STEP, { duration: 300 });
  };
  const resetNorth = () => {
    mapRef.current?.easeTo({ bearing: 0, duration: 600 });
  };

  const ctrlBtn = "flex items-center justify-center rounded-md transition-colors cursor-default";
  const ctrlStyle = {
    width: 32,
    height: 32,
    background: "var(--el-bg-panel)",
    border: "1px solid var(--el-border-card)",
    color: "var(--el-text-muted)",
    boxShadow: "var(--el-shadow-sm)",
  };

  const viewModes: { key: ViewMode; label: string; icon: React.ReactNode }[] = [
    { key: "2d", label: "2D", icon: <MapIcon size={11} /> },
    { key: "2.5d", label: "2.5D", icon: <Layers size={11} /> },
    { key: "3d", label: "3D", icon: <Box size={11} /> },
  ];

  return (
    <>
      {/* Map controls — right side */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-1 z-10">
        <button className={ctrlBtn} style={ctrlStyle} title="Zoom in" onClick={zoomIn}><ZoomIn size={14} /></button>
        <button className={ctrlBtn} style={ctrlStyle} title="Zoom out" onClick={zoomOut}><ZoomOut size={14} /></button>
        <button className={ctrlBtn} style={ctrlStyle} title="Reset view" onClick={onReset}><LocateFixed size={14} /></button>
        <button className={ctrlBtn} style={ctrlStyle} title="North" onClick={resetNorth}><Compass size={14} /></button>
      </div>

      {/* View mode toggle — bottom-right */}
      <div className="absolute bottom-3 right-3 z-10">
        <div
          className="flex items-center rounded-md overflow-hidden"
          style={{
            background: "var(--el-bg-panel)",
            border: "1px solid var(--el-border-card)",
            boxShadow: "var(--el-shadow-sm)",
          }}
        >
          {viewModes.map((m) => (
            <button
              key={m.key}
              onClick={() => setViewMode(m.key)}
              className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-semibold cursor-default transition-colors"
              style={{
                background: viewMode === m.key ? "var(--el-accent-soft)" : "transparent",
                color: viewMode === m.key ? "var(--el-text-accent)" : "var(--el-text-faint)",
              }}
            >
              {m.icon}
              {m.label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
