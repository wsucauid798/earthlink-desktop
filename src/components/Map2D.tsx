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
import { ZoomIn, ZoomOut, LocateFixed, Compass, Layers, Map as MapIcon } from "lucide-react";
import { client } from "../api/client";
import { useWorldStore } from "../store/worldStore";
import { useSelectionStore } from "../store/selectionStore";
import { useConnectionStore } from "../store/connectionStore";
import { useLogStore } from "../store/logStore";

// UK centre
const UK_CENTER: [number, number] = [-2.5, 54.5];
const UK_ZOOM = 5.5;

// OpenFreeMap style (free, no key needed)
const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

interface Map2DProps {
  viewMode: "2d" | "2.5d" | "3d";
}

export default function Map2D({ viewMode }: Map2DProps) {
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
      center: UK_CENTER,
      zoom: UK_ZOOM,
      pitch: viewMode === "2.5d" ? 45 : 0,
      bearing: viewMode === "2.5d" ? -15 : 0,
      attributionControl: false,
    });

    map.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      "bottom-left",
    );

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

  // --- View mode switching (2D vs 2.5D) ---
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const pitch = viewMode === "2.5d" ? 45 : 0;
    const bearing = viewMode === "2.5d" ? -15 : 0;

    map.easeTo({
      pitch,
      bearing,
      duration: 800,
    });
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

  // --- Control handlers ---
  const zoomIn = () => mapRef.current?.zoomIn({ duration: 300 });
  const zoomOut = () => mapRef.current?.zoomOut({ duration: 300 });
  const resetView = () => {
    mapRef.current?.flyTo({
      center: UK_CENTER,
      zoom: UK_ZOOM,
      pitch: viewMode === "2.5d" ? 45 : 0,
      bearing: viewMode === "2.5d" ? -15 : 0,
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
        {viewMode === "2.5d" ? <Layers size={12} /> : <MapIcon size={12} />}
        {viewMode === "2.5d" ? "2.5D Perspective" : "2D Map"}
      </div>
    </div>
  );
}

/**
 * Module-level location coordinate lookup.
 * Built once when locations GeoJSON is loaded, used to plot agents.
 */
const locationLookup = new Map<number, [number, number]>();

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
