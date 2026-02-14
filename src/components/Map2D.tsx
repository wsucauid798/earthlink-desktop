/**
 * Map2D — MapLibre GL JS map component.
 *
 * Renders the entire virtual world:
 * - All locations as a GeoJSON layer (circles styled by type)
 * - All agents as a real-time GeoJSON layer (updated every tick)
 * - Click interaction: select location or agent
 * - Supports 2D (flat) and 2.5D (pitched) modes
 * - Fly-to on selection
 */

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { ZoomIn, ZoomOut, LocateFixed, Compass, Map as MapIcon, Layers, Box } from "lucide-react";
import { client } from "../api/client";
import { useWorldStore } from "../store/worldStore";
import { useSelectionStore } from "../store/selectionStore";
import { useConnectionStore } from "../store/connectionStore";
import { useLogStore } from "../store/logStore";
import { useAgentHistoryStore } from "../store/agentHistoryStore";
import { useViewModeStore, type ViewMode } from "../store/viewModeStore";

// Default view — will be overridden once locations are loaded
const DEFAULT_CENTER: [number, number] = [0, 20];
const DEFAULT_ZOOM = 2;
const GLOBE_ZOOM = 1.4; // 3D globe — shows the full Earth, slightly smaller

// OpenFreeMap style (free, no key needed)
const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

export default function Map2D() {
  const viewMode = useViewModeStore((s) => s.viewMode);
  const setViewMode = useViewModeStore((s) => s.setViewMode);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const locationsLoaded = useRef(false);
  const agentSourceReady = useRef(false);

  const connected = useConnectionStore((s) => s.connected);
  const agents = useWorldStore((s) => s.agents);
  const selectLocation = useSelectionStore((s) => s.selectLocation);
  const selectAgent = useSelectionStore((s) => s.selectAgent);

  // --- Initialise map ---
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      pitch: viewMode === "2.5d" ? 45 : 0,
      bearing: viewMode === "2.5d" ? -15 : 0,
      attributionControl: false,
    });

    mapRef.current = map;

    map.on("load", () => {
      // Location source (populated later)
      map.addSource("locations", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      // Location circles — sized and coloured by type
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

      // Location labels — shown at higher zoom
      map.addLayer({
        id: "locations-label",
        type: "symbol",
        source: "locations",
        minzoom: 8,
        layout: {
          "text-field": ["get", "name"],
          "text-size": [
            "interpolate", ["linear"], ["zoom"],
            8, 9,
            12, 12,
          ],
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

      // Agent source (updated every tick)
      map.addSource("agents", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      // Agent markers — bright, distinct from locations
      map.addLayer({
        id: "agents-circle",
        type: "circle",
        source: "agents",
        paint: {
          "circle-radius": [
            "interpolate", ["linear"], ["zoom"],
            4, 6,
            10, 12,
          ],
          "circle-color": "#ef4444",
          "circle-stroke-width": 2.5,
          "circle-stroke-color": "#ffffff",
          "circle-opacity": 0.95,
        },
      });

      // Agent pulse ring (outer glow)
      map.addLayer({
        id: "agents-pulse",
        type: "circle",
        source: "agents",
        paint: {
          "circle-radius": [
            "interpolate", ["linear"], ["zoom"],
            4, 10,
            10, 18,
          ],
          "circle-color": "#ef4444",
          "circle-opacity": 0.15,
        },
      }, "agents-circle");

      // Agent labels
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

      // Trajectory line for selected agent
      map.addSource("trajectory", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      map.addLayer({
        id: "trajectory-line",
        type: "line",
        source: "trajectory",
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
        paint: {
          "line-color": "#ef4444",
          "line-width": 2,
          "line-opacity": 0.6,
          "line-dasharray": [2, 2],
        },
      }, "agents-pulse"); // draw under agents

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
      map.on("mouseenter", "locations-circle", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "locations-circle", () => {
        map.getCanvas().style.cursor = "";
      });
      map.on("mouseenter", "agents-circle", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "agents-circle", () => {
        map.getCanvas().style.cursor = "";
      });

      // Location hover popup
      const popup = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 12,
      });

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

      map.on("mouseleave", "locations-circle", () => {
        popup.remove();
      });
    });

    return () => {
      mapRef.current = null;
      map.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Load locations GeoJSON when connected ---
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

          // Fit map to the loaded data
          if (geojson.features.length > 0) {
            const bounds = new maplibregl.LngLatBounds();
            for (const feat of geojson.features) {
              if (feat.geometry.type === "Point") {
                const [lng, lat] = (feat.geometry as GeoJSON.Point).coordinates;
                bounds.extend([lng, lat]);
              }
            }
            map.fitBounds(bounds, { padding: 40, duration: 1200 });
          }

          useLogStore.getState().addConsole(
            "success",
            `${geojson.features.length.toLocaleString()} locations rendered on map`,
          );
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        useLogStore.getState().addConsole("error", `Failed to load locations GeoJSON: ${msg}`);
      }
    };

    // Wait for map to be loaded
    if (map.isStyleLoaded()) {
      load();
    } else {
      map.on("load", load);
    }
  }, [connected]);

  // --- Update agent positions on every tick ---
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !agentSourceReady.current || agents.length === 0) return;

    // Build agent GeoJSON from the store — we need lat/lng for each agent
    // Agents have location_id but we need coordinates. We look them up from
    // the locations GeoJSON source that's already loaded.
    const locSource = map.getSource("locations") as maplibregl.GeoJSONSource | undefined;
    if (!locSource) return;

    // Build a location_id -> [lng, lat] map from the loaded features
    // We cache this in a module-level map and rebuild on location source change
    const agentFeatures: GeoJSON.Feature[] = [];

    for (const agent of agents) {
      // Query the location's coords from the location source data
      // Use a simple approach: query rendered features near the agent's location
      // Better approach: maintain a location lookup map
      const coord = locationLookup.get(agent.location_id);
      if (!coord) continue;

      agentFeatures.push({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: coord,
        },
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
      agentSource.setData({
        type: "FeatureCollection",
        features: agentFeatures,
      });
    }
  }, [agents]);

  // --- View mode switching (2D / 2.5D / 3D globe) ---
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const is25d = viewMode === "2.5d";
    const is3d = viewMode === "3d";

    // Globe projection for 3D, mercator for 2D/2.5D
    if (is3d) {
      map.setProjection({ type: "globe" });
    } else {
      map.setProjection({ type: "mercator" });
    }

    // In 2.5D, enforce a minimum zoom so the map tiles always fill the
    // viewport — prevents the void from showing at the horizon.
    map.setMinZoom(is25d ? 3 : 0);

    if (is3d) {
      // Zoom out to show the full globe
      map.easeTo({
        zoom: GLOBE_ZOOM,
        pitch: 0,
        bearing: 0,
        duration: 800,
      });
    } else {
      const minZoom = is25d ? 3 : 0;
      const targetZoom = map.getZoom() < minZoom ? minZoom : undefined;

      map.easeTo({
        pitch: is25d ? 45 : 0,
        bearing: is25d ? -15 : 0,
        ...(targetZoom !== undefined ? { zoom: targetZoom } : {}),
        duration: 800,
      });
    }
  }, [viewMode]);

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

    // Build a LineString from the agent's movement history
    const coords: [number, number][] = [];
    for (const snap of trajectorySnapshots) {
      const c = locationLookup.get(snap.toLocationId);
      if (c) {
        // Avoid duplicates (agent stayed at same location)
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

  // --- Control handlers ---
  const ZOOM_STEP = 0.5;
  const zoomIn = () => {
    const map = mapRef.current;
    if (map) map.zoomTo(map.getZoom() + ZOOM_STEP, { duration: 300 });
  };
  const zoomOut = () => {
    const map = mapRef.current;
    if (map) map.zoomTo(map.getZoom() - ZOOM_STEP, { duration: 300 });
  };
  const resetView = () => {
    const is25d = viewMode === "2.5d";
    const is3d = viewMode === "3d";
    mapRef.current?.flyTo({
      center: DEFAULT_CENTER,
      zoom: is3d ? GLOBE_ZOOM : is25d ? Math.max(DEFAULT_ZOOM, 3) : DEFAULT_ZOOM,
      pitch: is25d ? 45 : 0,
      bearing: is25d ? -15 : 0,
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

  const viewModes: { key: ViewMode; label: string; icon: React.ReactNode }[] = [
    { key: "2d", label: "2D", icon: <MapIcon size={11} /> },
    { key: "2.5d", label: "2.5D", icon: <Layers size={11} /> },
    { key: "3d", label: "3D", icon: <Box size={11} /> },
  ];

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
    </div>
  );
}

/**
 * Module-level location coordinate lookup.
 * Built once when locations GeoJSON is loaded, used to plot agents.
 * Exported so Map3D can share the same lookup.
 */
export const locationLookup = new Map<number, [number, number]>();

/**
 * Call this after loading the locations GeoJSON to populate the lookup.
 */
export function buildLocationLookup(geojson: GeoJSON.FeatureCollection): void {
  locationLookup.clear();
  for (const feat of geojson.features) {
    if (feat.geometry.type === "Point" && feat.properties?.id != null) {
      locationLookup.set(
        Number(feat.properties.id),
        feat.geometry.coordinates as [number, number],
      );
    }
  }
}
