/**
 * Map3D — MapLibre GL JS globe projection.
 *
 * Renders the virtual world on a 3D globe:
 * - All locations as GeoJSON circles (same styling as Map2D)
 * - All agents as real-time GeoJSON markers
 * - Click interaction: select location/agent
 * - Fly-to on selection
 * - Uses MapLibre's `projection: "globe"` for a spherical earth view
 */

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { ZoomIn, ZoomOut, LocateFixed, Compass, Globe } from "lucide-react";
import { client } from "../api/client";
import { useWorldStore } from "../store/worldStore";
import { useSelectionStore } from "../store/selectionStore";
import { useConnectionStore } from "../store/connectionStore";
import { useLogStore } from "../store/logStore";
import { buildLocationLookup, locationLookup } from "./Map2D";

// Default view — whole earth, data-driven after locations load
const DEFAULT_CENTER: [number, number] = [0, 20];
const GLOBE_ZOOM = 2;

// OpenFreeMap style (free, no key needed)
const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

export default function Map3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const locationsLoaded = useRef(false);
  const agentSourceReady = useRef(false);

  const connected = useConnectionStore((s) => s.connected);
  const agents = useWorldStore((s) => s.agents);
  const selectLocation = useSelectionStore((s) => s.selectLocation);
  const selectAgent = useSelectionStore((s) => s.selectAgent);

  // --- Initialise globe map ---
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: DEFAULT_CENTER,
      zoom: GLOBE_ZOOM,
      pitch: 0,
      bearing: 0,
      attributionControl: false,
    });

    map.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      "bottom-left",
    );

    mapRef.current = map;

    map.on("load", () => {
      // Enable globe projection after style is loaded
      map.setProjection({ type: "globe" });
      // --- Location layers (same styling as Map2D) ---

      map.addSource("locations", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      map.addLayer({
        id: "locations-circle",
        type: "circle",
        source: "locations",
        paint: {
          "circle-radius": [
            "interpolate", ["linear"], ["zoom"],
            4, ["match", ["get", "type"],
              "capital", 5,
              "city", 3.5,
              "town", 2,
              1.5,
            ],
            10, ["match", ["get", "type"],
              "capital", 10,
              "city", 7,
              "town", 5,
              3.5,
            ],
          ],
          "circle-color": [
            "match", ["get", "type"],
            "capital", "#f59e0b",
            "city", "#3b82f6",
            "town", "#8b5cf6",
            "village", "#10b981",
            "#6b7280",
          ],
          "circle-stroke-width": 1,
          "circle-stroke-color": [
            "match", ["get", "type"],
            "capital", "#d97706",
            "city", "#2563eb",
            "town", "#7c3aed",
            "village", "#059669",
            "#4b5563",
          ],
          "circle-opacity": 0.85,
        },
      });

      map.addLayer({
        id: "locations-label",
        type: "symbol",
        source: "locations",
        minzoom: 8,
        layout: {
          "text-field": ["get", "name"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 8, 9, 12, 12],
          "text-offset": [0, 1.2],
          "text-anchor": "top",
          "text-max-width": 8,
        },
        paint: {
          "text-color": "#374151",
          "text-halo-color": "#ffffff",
          "text-halo-width": 1.5,
        },
      });

      // --- Agent layers ---

      map.addSource("agents", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      map.addLayer({
        id: "agents-circle",
        type: "circle",
        source: "agents",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 6, 10, 12],
          "circle-color": "#ef4444",
          "circle-stroke-width": 2.5,
          "circle-stroke-color": "#ffffff",
          "circle-opacity": 0.95,
        },
      });

      map.addLayer({
        id: "agents-pulse",
        type: "circle",
        source: "agents",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 10, 10, 18],
          "circle-color": "#ef4444",
          "circle-opacity": 0.15,
        },
      }, "agents-circle");

      map.addLayer({
        id: "agents-label",
        type: "symbol",
        source: "agents",
        minzoom: 7,
        layout: {
          "text-field": ["get", "name"],
          "text-size": 11,
          "text-offset": [0, 1.6],
          "text-anchor": "top",
          "text-font": ["Open Sans Bold"],
        },
        paint: {
          "text-color": "#ef4444",
          "text-halo-color": "#ffffff",
          "text-halo-width": 2,
        },
      });

      agentSourceReady.current = true;

      // --- Click handlers ---

      map.on("click", "locations-circle", (e) => {
        const feat = e.features?.[0];
        if (feat?.properties?.id != null) {
          selectLocation(Number(feat.properties.id));
        }
      });

      map.on("click", "agents-circle", (e) => {
        const feat = e.features?.[0];
        if (feat?.properties?.agent_id) {
          selectAgent(String(feat.properties.agent_id));
        }
      });

      // Cursor changes
      for (const layer of ["locations-circle", "agents-circle"]) {
        map.on("mouseenter", layer, () => { map.getCanvas().style.cursor = "pointer"; });
        map.on("mouseleave", layer, () => { map.getCanvas().style.cursor = ""; });
      }

      // Location hover popup
      const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 12 });

      map.on("mouseenter", "locations-circle", (e) => {
        const feat = e.features?.[0];
        if (!feat) return;
        const coords = (feat.geometry as GeoJSON.Point).coordinates.slice() as [number, number];
        const { name, type, population } = feat.properties as Record<string, string>;
        const popStr = population && Number(population) > 0
          ? `${Number(population).toLocaleString()} pop.`
          : "";
        popup
          .setLngLat(coords)
          .setHTML(`<strong>${name}</strong><br/><span style="opacity:0.7">${type}${popStr ? " · " + popStr : ""}</span>`)
          .addTo(map);
      });

      map.on("mouseleave", "locations-circle", () => { popup.remove(); });
    });

    return () => {
      mapRef.current = null;
      map.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Load locations GeoJSON ---
  useEffect(() => {
    if (!connected || locationsLoaded.current) return;
    const map = mapRef.current;
    if (!map) return;

    const load = async () => {
      try {
        const geojson = await client.getLocationsGeoJSON();
        buildLocationLookup(geojson);
        const src = map.getSource("locations") as maplibregl.GeoJSONSource | undefined;
        if (src) {
          src.setData(geojson);
          locationsLoaded.current = true;
          useLogStore.getState().addConsole(
            "success",
            `${geojson.features.length.toLocaleString()} locations rendered on 3D globe`,
          );
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        useLogStore.getState().addConsole("error", `Failed to load locations GeoJSON: ${msg}`);
      }
    };

    if (map.isStyleLoaded()) {
      load();
    } else {
      map.on("load", load);
    }
  }, [connected]);

  // --- Update agent positions ---
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !agentSourceReady.current || agents.length === 0) return;

    const agentFeatures: GeoJSON.Feature[] = [];
    for (const agent of agents) {
      const coord = locationLookup.get(agent.location_id);
      if (!coord) continue;
      agentFeatures.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: coord },
        properties: {
          agent_id: agent.id,
          name: agent.name,
          action: agent.last_action,
          energy: agent.energy,
          knowledge_score: agent.knowledge_score,
        },
      });
    }

    const agentSource = map.getSource("agents") as maplibregl.GeoJSONSource | undefined;
    if (agentSource) {
      agentSource.setData({ type: "FeatureCollection", features: agentFeatures });
    }
  }, [agents]);

  // --- Fly to selected entity ---
  const selectedKind = useSelectionStore((s) => s.kind);
  const selectedId = useSelectionStore((s) => s.id);
  const locationDetail = useSelectionStore((s) => s.locationDetail);
  const agentDetail = useSelectionStore((s) => s.agentDetail);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (selectedKind === "location" && locationDetail) {
      map.flyTo({
        center: [locationDetail.lng, locationDetail.lat],
        zoom: Math.max(map.getZoom(), 10),
        duration: 1200,
      });
    } else if (selectedKind === "agent" && agentDetail) {
      const coord = locationLookup.get(agentDetail.location_id);
      if (coord) {
        map.flyTo({
          center: coord as [number, number],
          zoom: Math.max(map.getZoom(), 10),
          duration: 1200,
        });
      }
    }
  }, [selectedKind, selectedId, locationDetail, agentDetail]);

  // --- Control handlers ---
  const zoomIn = () => mapRef.current?.zoomIn({ duration: 300 });
  const zoomOut = () => mapRef.current?.zoomOut({ duration: 300 });
  const resetView = () => {
    mapRef.current?.flyTo({
      center: DEFAULT_CENTER,
      zoom: GLOBE_ZOOM,
      pitch: 0,
      bearing: 0,
      duration: 1200,
    });
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

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />

      {/* Map controls — right side */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-1 z-10">
        <button className={ctrlBtn} style={ctrlStyle} title="Zoom in" onClick={zoomIn}><ZoomIn size={14} /></button>
        <button className={ctrlBtn} style={ctrlStyle} title="Zoom out" onClick={zoomOut}><ZoomOut size={14} /></button>
        <button className={ctrlBtn} style={ctrlStyle} title="Reset view" onClick={resetView}><LocateFixed size={14} /></button>
        <button className={ctrlBtn} style={ctrlStyle} title="North" onClick={resetNorth}><Compass size={14} /></button>
      </div>

      {/* View mode badge — bottom right */}
      <div
        className="absolute bottom-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-semibold z-10"
        style={{
          background: "var(--el-bg-panel)",
          border: "1px solid var(--el-border-card)",
          color: "var(--el-text-muted)",
          boxShadow: "var(--el-shadow-sm)",
        }}
      >
        <Globe size={12} />
        3D Globe
      </div>
    </div>
  );
}
