/**
 * Map3D — CesiumJS 3D Globe component.
 *
 * Renders the virtual world on a 3D globe:
 * - All locations as billboards/points
 * - All agents as animated entities
 * - Click interaction: select location/agent
 * - Fly-to on selection
 */

import { useEffect, useRef } from "react";
import * as Cesium from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";
import { ZoomIn, ZoomOut, LocateFixed, Globe, RotateCcw } from "lucide-react";
import { client } from "../api/client";
import { useWorldStore } from "../store/worldStore";
import { useSelectionStore } from "../store/selectionStore";
import { useConnectionStore } from "../store/connectionStore";
import { useLogStore } from "../store/logStore";
import { buildLocationLookup } from "./Map2D";

// UK centre
const UK_CENTER = Cesium.Cartesian3.fromDegrees(-2.5, 54.5, 2_000_000);

// Type colour mapping (matching Map2D)
const TYPE_COLORS: Record<string, Cesium.Color> = {
  capital: Cesium.Color.fromCssColorString("#f59e0b"),
  city: Cesium.Color.fromCssColorString("#3b82f6"),
  town: Cesium.Color.fromCssColorString("#8b5cf6"),
  village: Cesium.Color.fromCssColorString("#10b981"),
};
const DEFAULT_LOC_COLOR = Cesium.Color.fromCssColorString("#6b7280");
const AGENT_COLOR = Cesium.Color.fromCssColorString("#ef4444");

export default function Map3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);
  const locationsLoadedRef = useRef(false);
  const locationEntityMap = useRef(new Map<number, Cesium.Entity>());
  const agentEntityMap = useRef(new Map<string, Cesium.Entity>());

  const connected = useConnectionStore((s) => s.connected);
  const agents = useWorldStore((s) => s.agents);
  const selectLocation = useSelectionStore((s) => s.selectLocation);
  const selectAgent = useSelectionStore((s) => s.selectAgent);

  // --- Initialize viewer ---
  useEffect(() => {
    if (!containerRef.current || viewerRef.current) return;

    // CesiumJS ion token not needed for basic OSM imagery
    Cesium.Ion.defaultAccessToken = "";

    const viewer = new Cesium.Viewer(containerRef.current, {
      baseLayerPicker: false,
      geocoder: false,
      homeButton: false,
      sceneModePicker: false,
      selectionIndicator: false,
      timeline: false,
      animation: false,
      navigationHelpButton: false,
      fullscreenButton: false,
      infoBox: false,
      creditContainer: document.createElement("div"), // hide default credits
      baseLayer: new Cesium.ImageryLayer(
        new Cesium.OpenStreetMapImageryProvider({
          url: "https://tile.openstreetmap.org/",
        }),
      ),
      terrain: undefined,
    });

    // Fly to UK
    viewer.camera.flyTo({
      destination: UK_CENTER,
      duration: 0,
    });

    // Dark space background
    viewer.scene.backgroundColor = Cesium.Color.fromCssColorString("#1a1a2e");
    viewer.scene.globe.enableLighting = true;

    // Click handler
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction((click: { position: Cesium.Cartesian2 }) => {
      const picked = viewer.scene.pick(click.position);
      if (Cesium.defined(picked) && picked.id) {
        const entity = picked.id as Cesium.Entity;
        const props = entity.properties;
        if (props?.entityType?.getValue(Cesium.JulianDate.now()) === "agent") {
          selectAgent(props.entityId.getValue(Cesium.JulianDate.now()));
        } else if (props?.entityType?.getValue(Cesium.JulianDate.now()) === "location") {
          selectLocation(Number(props.entityId.getValue(Cesium.JulianDate.now())));
        }
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    viewerRef.current = viewer;

    return () => {
      handler.destroy();
      viewer.destroy();
      viewerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Load locations ---
  useEffect(() => {
    if (!connected || locationsLoadedRef.current) return;
    const viewer = viewerRef.current;
    if (!viewer) return;

    const load = async () => {
      try {
        const geojson = await client.getLocationsGeoJSON();
        buildLocationLookup(geojson);

        for (const feat of geojson.features) {
          if (feat.geometry.type !== "Point" || !feat.properties) continue;
          const [lng, lat] = (feat.geometry as GeoJSON.Point).coordinates;
          const id = feat.properties.id as number;
          const name = feat.properties.name as string;
          const type = feat.properties.type as string;
          const pop = feat.properties.population as number;

          const color = TYPE_COLORS[type] ?? DEFAULT_LOC_COLOR;
          const size = type === "capital" ? 8 : type === "city" ? 6 : type === "town" ? 4 : 3;

          const entity = viewer.entities.add({
            position: Cesium.Cartesian3.fromDegrees(lng, lat),
            point: {
              pixelSize: size,
              color: color,
              outlineColor: Cesium.Color.WHITE.withAlpha(0.6),
              outlineWidth: 1,
              heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
              scaleByDistance: new Cesium.NearFarScalar(1e4, 1.5, 1e7, 0.5),
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
            },
            label: {
              text: name,
              font: "11px sans-serif",
              fillColor: Cesium.Color.WHITE,
              outlineColor: Cesium.Color.BLACK,
              outlineWidth: 2,
              style: Cesium.LabelStyle.FILL_AND_OUTLINE,
              verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
              pixelOffset: new Cesium.Cartesian2(0, -10),
              scaleByDistance: new Cesium.NearFarScalar(1e4, 1.0, 5e5, 0),
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
            },
            properties: {
              entityType: "location",
              entityId: String(id),
              locationType: type,
              population: pop,
            },
          });

          locationEntityMap.current.set(id, entity);
        }

        locationsLoadedRef.current = true;
        useLogStore.getState().addConsole(
          "success",
          `${geojson.features.length.toLocaleString()} locations rendered on 3D globe`,
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        useLogStore.getState().addConsole("error", `Failed to load 3D locations: ${msg}`);
      }
    };

    load();
  }, [connected]);

  // --- Update agent positions ---
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || agents.length === 0) return;

    const seenIds = new Set<string>();

    for (const agent of agents) {
      seenIds.add(agent.id);
      const existing = agentEntityMap.current.get(agent.id);

      // Get coordinates from the location lookup
      // We need the lookup from Map2D module — it's module-level so we import the function
      // and the map is populated. Let's import it differently — we'll build our own from viewer entities.
      const locEntity = locationEntityMap.current.get(agent.location_id);
      if (!locEntity?.position) continue;

      const position = locEntity.position.getValue(Cesium.JulianDate.now());
      if (!position) continue;

      if (existing) {
        // Update position
        (existing.position as Cesium.ConstantPositionProperty).setValue(position);
      } else {
        // Create new agent entity
        const entity = viewer.entities.add({
          position: position,
          point: {
            pixelSize: 12,
            color: AGENT_COLOR,
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: 2.5,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
          label: {
            text: agent.name,
            font: "bold 12px sans-serif",
            fillColor: AGENT_COLOR,
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: 3,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, -14),
            scaleByDistance: new Cesium.NearFarScalar(1e4, 1.0, 5e5, 0),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
          properties: {
            entityType: "agent",
            entityId: agent.id,
          },
        });
        agentEntityMap.current.set(agent.id, entity);
      }
    }

    // Remove agents that no longer exist
    for (const [id, entity] of agentEntityMap.current) {
      if (!seenIds.has(id)) {
        viewer.entities.remove(entity);
        agentEntityMap.current.delete(id);
      }
    }
  }, [agents]);

  // --- Fly to selected entity ---
  const selectedKind = useSelectionStore((s) => s.kind);
  const selectedId = useSelectionStore((s) => s.id);
  const locationDetail = useSelectionStore((s) => s.locationDetail);
  const agentDetail = useSelectionStore((s) => s.agentDetail);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    if (selectedKind === "location" && locationDetail) {
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(
          locationDetail.lng,
          locationDetail.lat,
          50_000,
        ),
        duration: 1.5,
      });
    } else if (selectedKind === "agent" && agentDetail) {
      const locEntity = locationEntityMap.current.get(agentDetail.location_id);
      if (locEntity) {
        viewer.flyTo(locEntity, { duration: 1.5 });
      }
    }
  }, [selectedKind, selectedId, locationDetail, agentDetail]);

  // --- Controls ---
  const zoomIn = () => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    viewer.camera.zoomIn(viewer.camera.positionCartographic.height * 0.3);
  };
  const zoomOut = () => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    viewer.camera.zoomOut(viewer.camera.positionCartographic.height * 0.3);
  };
  const resetView = () => {
    viewerRef.current?.camera.flyTo({
      destination: UK_CENTER,
      duration: 1.5,
    });
  };
  const resetRotation = () => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    const pos = viewer.camera.positionCartographic;
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromRadians(pos.longitude, pos.latitude, pos.height),
      orientation: { heading: 0, pitch: -Cesium.Math.PI_OVER_TWO, roll: 0 },
      duration: 0.8,
    });
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
        <button className={ctrlBtn} style={ctrlStyle} title="Reset rotation" onClick={resetRotation}><RotateCcw size={14} /></button>
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
