/**
 * useEarthMap — shared hook for Map2D and Map3D.
 *
 * Handles everything common to both map views:
 * - MapLibre map initialisation (with caller-provided options)
 * - Location + agent GeoJSON sources and layers
 * - Click handlers, cursor changes, hover popups
 * - Location GeoJSON loading from server
 * - Agent position updates from worldStore (every tick)
 * - Fly-to on entity selection
 *
 * Returns refs and state the caller needs to render the container
 * and add view-specific behaviour (projection, pitch, trajectory, etc.).
 */

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { client } from "../api/client";
import { agentActionLabel, normalizeAgentAction } from "../lib/agentAction";
import { useWorldStore } from "../store/worldStore";
import { useSelectionStore } from "../store/selectionStore";
import { useConnectionStore } from "../store/connectionStore";
import { useLogStore } from "../store/logStore";
import {
  buildLocationLookup,
  locationLookup,
  locationNameLookup,
  MAP_STYLE,
} from "./mapShared";

export interface EarthMapOptions {
  /** Initial center [lng, lat]. */
  center: [number, number];
  /** Initial zoom level. */
  zoom: number;
  /** Initial pitch (degrees). */
  pitch?: number;
  /** Initial bearing (degrees). */
  bearing?: number;
  /**
   * Called once after the style has loaded.
   * Use this to set projection, add extra layers, etc.
   */
  onStyleLoaded?: (map: maplibregl.Map) => void;
  /** Label for log messages (e.g. "map" or "3D globe"). */
  logLabel?: string;
}

export interface EarthMapResult {
  containerRef: React.RefObject<HTMLDivElement | null>;
  mapRef: React.RefObject<maplibregl.Map | null>;
  /** Number of location features loaded — useful as a dependency trigger. */
  locationsFeatureCount: number;
}

export function useEarthMap(options: EarthMapOptions): EarthMapResult {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const locationsLoaded = useRef(false);
  const agentSourceReady = useRef(false);
  const lastAgentFeatures = useRef<GeoJSON.Feature[]>([]);
  const agentMarkers = useRef<Map<string, maplibregl.Marker>>(new Map());
  const [locationsFeatureCount, setLocationsFeatureCount] = useState(0);

  const connected = useConnectionStore((s) => s.connected);
  const agents = useWorldStore((s) => s.agents);
  const selectLocation = useSelectionStore((s) => s.selectLocation);
  const selectAgent = useSelectionStore((s) => s.selectAgent);
  const clearSelection = useSelectionStore((s) => s.clearSelection);

  // --- Initialise map ---
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: options.center,
      zoom: options.zoom,
      pitch: options.pitch ?? 0,
      bearing: options.bearing ?? 0,
      attributionControl: false,
    });

    mapRef.current = map;

    map.on("load", () => {
      // Let the caller configure projection / extras
      options.onStyleLoaded?.(map);

      // --- Location layers ---

      map.addSource("locations", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      // Insert location circles below the first symbol layer so map labels stay visible
      const firstSymbolLayer = map.getStyle().layers.find((l: any) => l.type === "symbol");

      map.addLayer({
        id: "locations-circle",
        type: "circle",
        source: "locations",
        paint: {
          "circle-radius": [
            "interpolate", ["linear"], ["zoom"],
            4, ["match", ["get", "type"],
              "capital", 4, "city", 2.5, "town", 1, 0.5,
            ],
            8, ["match", ["get", "type"],
              "capital", 6, "city", 4, "town", 2.5, 1.5,
            ],
            12, ["match", ["get", "type"],
              "capital", 10, "city", 7, "town", 5, 3.5,
            ],
          ],
          "circle-color": [
            "match", ["get", "type"],
            "capital", "#f59e0b", "city", "#3b82f6",
            "town", "#8b5cf6", "village", "#10b981", "#6b7280",
          ],
          "circle-stroke-width": [
            "interpolate", ["linear"], ["zoom"],
            4, 0, 8, 0.5, 12, 1,
          ],
          "circle-stroke-color": [
            "match", ["get", "type"],
            "capital", "#d97706", "city", "#2563eb",
            "town", "#7c3aed", "village", "#059669", "#4b5563",
          ],
          "circle-opacity": [
            "interpolate", ["linear"], ["zoom"],
            4, 0.3, 7, 0.5, 10, 0.75, 12, 0.85,
          ],
        },
      }, firstSymbolLayer?.id);

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
      //
      // Core dot (blue) with white stroke.  Pulse is done via HTML marker
      // overlays with CSS @keyframes — each agent gets its own animation
      // delay so they ripple independently.
      //
      // Dot sizes scale with zoom, capped at both ends:
      //   zoom  2 → 3px,  zoom 14 → 8px

      const AGENT_COLOR = "#0ea5e9";        // sky-500

      // Inject agent CSS (always replace to pick up code changes on HMR)
      {
        const existing = document.getElementById("el-agent-pulse-css");
        if (existing) existing.remove();
        const style = document.createElement("style");
        style.id = "el-agent-pulse-css";
        style.textContent = `
          @keyframes el-sonar {
            0%   { transform: translate(-50%,-50%) scale(1);   opacity: 1; }
            70%  { opacity: 0.4; }
            100% { transform: translate(-50%,-50%) scale(var(--el-pulse-scale, 2.5)); opacity: 0; }
          }
          .el-agent-wrap {
            width: 0px; height: 0px;
            overflow: visible;
            position: relative;
            z-index: 10;
          }
          .el-agent-pulse {
            position: absolute;
            top: 0; left: 0;
            transform: translate(-50%,-50%);
            border-radius: 50%;
            background: #ec4899;
            pointer-events: none;
            width: var(--el-dot-size, 12px);
            height: var(--el-dot-size, 12px);
            animation: el-sonar 1.6s ease-out infinite;
          }
          .el-agent-dot {
            position: absolute;
            top: 0; left: 0;
            transform: translate(-50%,-50%);
            border-radius: 50%;
            background: #ec4899;
            border: 2px solid #fff;
            box-shadow: 0 0 6px rgba(0,0,0,0.45);
            pointer-events: none;
            width: var(--el-dot-size, 12px);
            height: var(--el-dot-size, 12px);
          }
        `;
        document.head.appendChild(style);
      }

      map.addSource("agents", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      // GeoJSON circle layer — used for click/hover hit detection only.
      // Visual rendering is handled by HTML markers so the pulse works.
      map.addLayer({
        id: "agents-circle",
        type: "circle",
        source: "agents",
        paint: {
          "circle-radius": [
            "interpolate", ["linear"], ["zoom"],
            2, 3, 6, 5, 10, 7, 14, 8,
          ],
          "circle-color": AGENT_COLOR,
          "circle-stroke-width": [
            "interpolate", ["linear"], ["zoom"],
            2, 1.5, 10, 2.5, 14, 3,
          ],
          "circle-stroke-color": "#ffffff",
          "circle-opacity": 0,       // invisible — markers handle visuals
          "circle-stroke-opacity": 0, // invisible — markers handle visuals
        },
      });

      // Name label
      map.addLayer({
        id: "agents-label",
        type: "symbol",
        source: "agents",
        minzoom: 7,
        layout: {
          "text-field": ["get", "name"],
          "text-size": ["step", ["zoom"], 10, 9, 11, 12, 12],
          "text-offset": [0, 1.6],
          "text-anchor": "top",
          "text-font": ["Open Sans Bold"],
        },
        paint: {
          "text-color": "#c53610",
          "text-halo-color": "#ffffff",
          "text-halo-width": 1,
        },
      });

      // --- Zoom-responsive agent sizing ---
      //
      // Dot: 12px zoomed out, 14px zoomed in.
      // Pulse: 2.5x → 3x.

      const dotSizeForZoom = (z: number): number =>
        Math.round(Math.min(14, Math.max(12, 12 + (z - 3) * 0.22)));

      const pulseScaleForZoom = (z: number): number =>
        Math.min(3.0, 2.5 + (z - 3) * 0.055);

      const updateAgentMarkerSizing = () => {
        const z = map.getZoom();
        const dotSize = dotSizeForZoom(z);
        const pulseScale = pulseScaleForZoom(z);
        for (const [, marker] of agentMarkers.current) {
          const el = marker.getElement();
          el.style.setProperty("--el-dot-size", `${dotSize}px`);
          el.style.setProperty("--el-pulse-scale", String(pulseScale));
        }
      };

      map.on("zoom", updateAgentMarkerSizing);

      // --- Trajectory source (used by Map2D; harmless if unused) ---

      map.addSource("trajectory", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      map.addLayer({
        id: "trajectory-line",
        type: "line",
        source: "trajectory",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": AGENT_COLOR,
          "line-width": 2,
          "line-opacity": 0.6,
          "line-dasharray": [2, 2],
        },
      }, "agents-circle");

      agentSourceReady.current = true;

      // --- Hide agent markers on far side of globe ---
      //
      // HTML markers are always projected to screen space by MapLibre,
      // even when the underlying coordinate is on the back of the globe.
      // On every move we compute the great-circle angular distance from
      // the map center to each marker and hide any that are > 90° away.

      const DEG2RAD = Math.PI / 180;

      const updateMarkerVisibility = () => {
        const proj = map.getProjection?.();
        if (!proj || proj.type !== "globe") {
          // In Mercator, all markers are always visible
          for (const [, m] of agentMarkers.current) {
            m.getElement().style.visibility = "";
          }
          return;
        }

        const center = map.getCenter();
        const cLat = center.lat * DEG2RAD;
        const cLng = center.lng * DEG2RAD;
        const sinCLat = Math.sin(cLat);
        const cosCLat = Math.cos(cLat);

        for (const [, marker] of agentMarkers.current) {
          const ll = marker.getLngLat();
          const mLat = ll.lat * DEG2RAD;
          const mLng = ll.lng * DEG2RAD;
          // cos of angular distance — positive means same hemisphere
          const cosD =
            sinCLat * Math.sin(mLat) +
            cosCLat * Math.cos(mLat) * Math.cos(mLng - cLng);
          marker.getElement().style.visibility = cosD > 0 ? "" : "hidden";
        }
      };

      map.on("move", updateMarkerVisibility);

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

      // Click empty map space → clear selection
      map.on("click", (e) => {
        const features = map.queryRenderedFeatures(e.point, {
          layers: ["locations-circle", "agents-circle"],
        });
        if (features.length === 0) {
          clearSelection();
        }
      });

      // --- Cursor changes ---

      for (const layer of ["locations-circle", "agents-circle"]) {
        map.on("mouseenter", layer, () => { map.getCanvas().style.cursor = "pointer"; });
        map.on("mouseleave", layer, () => { map.getCanvas().style.cursor = ""; });
      }

      // --- Location hover popup ---

      const locPopup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 12 });

      map.on("mouseenter", "locations-circle", (e) => {
        const feat = e.features?.[0];
        if (!feat) return;
        const coords = (feat.geometry as GeoJSON.Point).coordinates.slice() as [number, number];
        const { name, type, population } = feat.properties as Record<string, string>;
        const popStr = population && Number(population) > 0
          ? `${Number(population).toLocaleString()} pop.`
          : "";
        locPopup
          .setLngLat(coords)
          .setHTML(`<strong>${name}</strong><br/><span style="opacity:0.7">${type}${popStr ? " · " + popStr : ""}</span>`)
          .addTo(map);
      });

      map.on("mouseleave", "locations-circle", () => { locPopup.remove(); });

      // --- Agent hover popup ---

      const agentPopup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 12 });

      map.on("mouseenter", "agents-circle", (e) => {
        const feat = e.features?.[0];
        if (!feat) return;
        const coords = (feat.geometry as GeoJSON.Point).coordinates.slice() as [number, number];
        const { name, location_name, action } = feat.properties as Record<string, string>;
        const locLine = location_name ? `at <strong>${location_name}</strong>` : "";
        const actionVerb = agentActionLabel(action, "");
        const actionLine = actionVerb ? `· ${actionVerb}` : "";
        agentPopup
          .setLngLat(coords)
          .setHTML(`<strong>${name ?? "Agent"}</strong><br/><span style="opacity:0.85">${locLine} ${actionLine}</span>`)
          .addTo(map);
      });

      map.on("mouseleave", "agents-circle", () => { agentPopup.remove(); });
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
          setLocationsFeatureCount(geojson.features.length);

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
            `${geojson.features.length.toLocaleString()} locations rendered on ${options.logLabel ?? "map"}`,
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

  // --- Update agent positions from VW state ---
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !agentSourceReady.current) return;
    if (agents.length === 0 && locationsFeatureCount === 0) return;

    // --- DEBUG: log agent data flow ---
    console.warn(
      `[EarthMap] Agent update: ${agents.length} agents in store, ` +
      `locationLookup size: ${locationLookup.size}, ` +
      `agentSourceReady: ${agentSourceReady.current}`
    );

    const agentFeatures: GeoJSON.Feature[] = [];
    for (const agent of agents) {
      // Use agent's own coordinates (from server), fall back to locationLookup
      const coord: [number, number] | undefined =
        (agent.lat != null && agent.lng != null) ? [agent.lng, agent.lat] :
        locationLookup.get(agent.location_id);
      if (!coord) continue;
      agentFeatures.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: coord },
        properties: {
          agent_id: agent.id,
          name: agent.name,
          location_name: locationNameLookup.get(agent.location_id) ?? agent.location_name ?? "",
          action: normalizeAgentAction(agent.last_action, ""),
          energy: agent.energy,
          knowledge_score: agent.knowledge_score,
        },
      });
    }

    lastAgentFeatures.current = agentFeatures;

    // Update GeoJSON source (for click/hover hit detection + labels)
    const src = map.getSource("agents") as maplibregl.GeoJSONSource | undefined;
    if (src) {
      src.setData({ type: "FeatureCollection", features: agentFeatures });
    }

    // --- Sync HTML markers (pulse + dot) ---
    const currentIds = new Set<string>();

    for (const agent of agents) {
      const coord: [number, number] | undefined =
        (agent.lat != null && agent.lng != null) ? [agent.lng, agent.lat] :
        locationLookup.get(agent.location_id);
      if (!coord) continue;
      currentIds.add(agent.id);

      let marker = agentMarkers.current.get(agent.id);
      if (!marker) {
        // Create marker wrapper — 0x0 with overflow:visible so children show
        const el = document.createElement("div");
        el.className = "el-agent-wrap";

        // Set initial zoom-responsive sizes (mirrors dotSizeForZoom / pulseScaleForZoom)
        const z = map.getZoom();
        const ds = Math.round(Math.min(14, Math.max(12, 12 + (z - 3) * 0.22)));
        const ps = Math.min(3.0, 2.5 + (z - 3) * 0.055);
        el.style.setProperty("--el-dot-size", `${ds}px`);
        el.style.setProperty("--el-pulse-scale", String(ps));

        const pulse = document.createElement("div");
        pulse.className = "el-agent-pulse";
        // Random delay + duration — guaranteed unique per agent
        const delay = Math.random() * 2;              // 0–2s offset
        const duration = 1.0 + Math.random() * 1.2;   // 1.0–2.2s cycle
        pulse.style.animationDelay = `${delay.toFixed(2)}s`;
        pulse.style.animationDuration = `${duration.toFixed(2)}s`;

        const dot = document.createElement("div");
        dot.className = "el-agent-dot";

        el.appendChild(pulse);
        el.appendChild(dot);

        marker = new maplibregl.Marker({ element: el, anchor: "center" })
          .setLngLat(coord as [number, number])
          .addTo(map);

        // Smooth movement: apply transition to MapLibre's positioning wrapper
        const wrapper = el.parentElement;
        if (wrapper) {
          const dur = getComputedStyle(document.documentElement)
            .getPropertyValue("--el-agent-transition-duration").trim() || "0.8s";
          wrapper.style.transition = `transform ${dur} ease-out`;
        }

        agentMarkers.current.set(agent.id, marker);
      } else {
        // Update position
        marker.setLngLat(coord as [number, number]);
      }
    }

    // Remove markers for agents no longer present
    for (const [id, marker] of agentMarkers.current) {
      if (!currentIds.has(id)) {
        marker.remove();
        agentMarkers.current.delete(id);
      }
    }

    console.warn(`[EarthMap] Active agent markers: ${agentMarkers.current.size}`);
  }, [agents, locationsFeatureCount]);

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
      const coord: [number, number] | undefined =
        (agentDetail.lat != null && agentDetail.lng != null) ? [agentDetail.lng, agentDetail.lat] :
        locationLookup.get(agentDetail.location_id);
      if (coord) {
        map.flyTo({
          center: coord as [number, number],
          zoom: Math.max(map.getZoom(), 10),
          duration: 1200,
        });
      }
    }
  }, [selectedKind, selectedId, locationDetail, agentDetail]);

  return { containerRef, mapRef, locationsFeatureCount };
}
