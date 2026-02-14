/**
 * MainViewport — the central visualisation area.
 *
 * The map IS the app:
 * - 2D / 2.5D via MapLibre GL JS (inside Map2D)
 * - 3D placeholder for CesiumJS
 * - Floating search bar on top of the map
 */

import { lazy, Suspense } from "react";
import { Globe, Wifi, Loader } from "lucide-react";
import { useConnectionStore } from "../store/connectionStore";
import MapSearch from "./MapSearch";
import Map2D from "./Map2D";

// Lazy-load CesiumJS (it's huge) — only when 3D mode is activated
const Map3D = lazy(() => import("./Map3D"));

interface MainViewportProps {
  viewMode: "2d" | "2.5d" | "3d";
}

export default function MainViewport({ viewMode }: MainViewportProps) {
  const { connected, connecting, connect } = useConnectionStore();
  const is3D = viewMode === "3d";

  return (
    <div
      className="h-full w-full relative overflow-hidden"
      style={{ background: "var(--el-bg-viewport)" }}
    >
      {/* --- The map (2D / 2.5D) --- */}
      {connected && !is3D && <Map2D viewMode={viewMode} />}

      {/* --- Floating search overlay --- */}
      {connected && <MapSearch />}

      {/* --- Disconnected state --- */}
      {!connected && (
        <div className="flex flex-col items-center justify-center h-full w-full">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(ellipse at center, var(--el-accent-soft) 0%, transparent 60%)`,
              opacity: 0.3,
            }}
          />
          <div className="relative flex flex-col items-center gap-6">
            <div
              className="flex items-center justify-center rounded-full"
              style={{
                width: 80,
                height: 80,
                background: "var(--el-accent-soft)",
                boxShadow: "0 0 40px var(--el-accent-soft)",
              }}
            >
              <Globe size={36} style={{ color: "var(--el-text-accent)" }} />
            </div>
            <div className="text-center">
              <div
                className="text-base font-semibold tracking-tight"
                style={{ color: "var(--el-text-secondary)" }}
              >
                EarthLink
              </div>
              <div
                className="text-xs mt-1.5 max-w-72"
                style={{ color: "var(--el-text-faint)" }}
              >
                Connect to the EarthLink server to see the virtual world come alive.
              </div>
            </div>
            <button
              onClick={() => connect()}
              disabled={connecting}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors cursor-default disabled:opacity-60"
              style={{
                background: "var(--el-accent)",
                color: "var(--el-text-on-accent)",
                boxShadow: "var(--el-shadow-md)",
              }}
            >
              {connecting ? (
                <>
                  <Loader size={14} className="animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Wifi size={14} />
                  Connect to Server
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* --- 3D Globe (CesiumJS) --- */}
      {connected && is3D && (
        <Suspense
          fallback={
            <div className="flex flex-col items-center justify-center h-full w-full gap-3">
              <Loader size={24} className="animate-spin" style={{ color: "var(--el-text-faint)" }} />
              <div className="text-xs" style={{ color: "var(--el-text-faint)" }}>Loading 3D globe...</div>
            </div>
          }
        >
          <Map3D />
        </Suspense>
      )}
    </div>
  );
}
