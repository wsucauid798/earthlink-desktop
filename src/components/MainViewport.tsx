/**
 * MainViewport — the central visualisation area.
 *
 * The map IS the app:
 * - 2D / 2.5D: Map2D (MapLibre mercator + pitch)
 * - 3D globe: Map3D (MapLibre globe projection) — different implementation
 * - Floating search bar on top of the map
 *
 * When disconnected, shows a quiet status — no buttons, no prompts.
 * The app auto-connects; manual fallback is in the World menu.
 */

import { Globe, Loader, AlertCircle } from "lucide-react";
import { useConnectionStore } from "../store/connectionStore";
import { useViewModeStore } from "../store/viewModeStore";
import MapSearch from "./MapSearch";
import Map2D from "./Map2D";
import Map3D from "./Map3D";

export default function MainViewport() {
  const viewMode = useViewModeStore((s) => s.viewMode);
  const connected = useConnectionStore((s) => s.connected);
  const connecting = useConnectionStore((s) => s.connecting);
  const retriesExhausted = useConnectionStore((s) => s.retriesExhausted);
  const retryCancelled = useConnectionStore((s) => s.retryCancelled);
  const retryCount = useConnectionStore((s) => s.retryCount);
  const error = useConnectionStore((s) => s.error);
  const connect = useConnectionStore((s) => s.connect);
  const cancelRetry = useConnectionStore((s) => s.cancelRetry);

  const isGlobe = viewMode === "3d";

  // Are we actively connecting or waiting between retries?
  const isRetrying = !connecting && !retriesExhausted && !retryCancelled && retryCount > 0;

  return (
    <div
      className="h-full w-full relative overflow-hidden"
      style={{ background: "var(--el-bg-viewport)" }}
    >
      {/* --- Map: 2D/2.5D vs 3D are different implementations --- */}
      {connected && (isGlobe ? <Map3D /> : <Map2D />)}

      {/* --- Floating search overlay --- */}
      {connected && <MapSearch />}

      {/* --- Disconnected state --- */}
      {!connected && (
        <div className="flex flex-col items-center justify-center h-full w-full gap-4">
          {/* Subtle globe */}
          <Globe
            size={32}
            style={{ color: "var(--el-text-faint)", opacity: 0.4 }}
          />

          {/* Actively connecting or between retries */}
          {(connecting || isRetrying) && (
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-2">
                <Loader size={12} className="animate-spin" style={{ color: "var(--el-text-faint)" }} />
                <span className="text-[11px]" style={{ color: "var(--el-text-faint)" }}>
                  Connecting...
                </span>
              </div>
              <span className="text-[10px]" style={{ color: "var(--el-text-faint)", opacity: 0.6 }}>
                {retryCount > 0 ? `Attempt ${retryCount} of 5` : "Reaching server\u2026"}
              </span>
              <button
                onClick={cancelRetry}
                className="text-[11px] cursor-default mt-1"
                style={{ color: "var(--el-text-faint)", textDecoration: "underline", textUnderlineOffset: 2 }}
              >
                Cancel
              </button>
            </div>
          )}

          {/* Retries exhausted */}
          {retriesExhausted && (
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-1.5">
                <AlertCircle size={12} style={{ color: "var(--el-danger)" }} />
                <span className="text-[11px]" style={{ color: "var(--el-text-muted)" }}>
                  Could not reach the server
                </span>
              </div>
              {error && (
                <span className="text-[10px] max-w-80 text-center" style={{ color: "var(--el-text-faint)" }}>
                  {error}
                </span>
              )}
              <button
                onClick={() => connect()}
                className="text-[11px] cursor-default mt-1"
                style={{ color: "var(--el-text-accent)", textDecoration: "underline", textUnderlineOffset: 2 }}
              >
                Try again
              </button>
            </div>
          )}

          {/* User cancelled */}
          {retryCancelled && (
            <div className="flex flex-col items-center gap-2">
              <span className="text-[11px]" style={{ color: "var(--el-text-muted)" }}>
                Connection cancelled
              </span>
              <button
                onClick={() => connect()}
                className="text-[11px] cursor-default mt-1"
                style={{ color: "var(--el-text-accent)", textDecoration: "underline", textUnderlineOffset: 2 }}
              >
                Try again
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
