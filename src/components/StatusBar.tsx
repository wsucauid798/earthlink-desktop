/**
 * StatusBar — slim bottom strip.
 *
 * Only shows what isn't already visible elsewhere:
 * connection state and server version. Nothing more.
 */

import { Wifi, WifiOff, Circle } from "lucide-react";
import { useConnectionStore } from "../store/connectionStore";

export default function StatusBar() {
  const { connected, wsStatus, serverVersion } = useConnectionStore();
  const wsOk = wsStatus === "connected";

  return (
    <div
      className="el-no-select flex items-center justify-between px-3 shrink-0"
      style={{
        height: "var(--el-statusbar-h)",
        background: "var(--el-bg-panel)",
        borderTop: "1px solid var(--el-border)",
      }}
    >
      {/* Left: connection */}
      <div className="flex items-center gap-2">
        <div
          className="flex items-center gap-1 text-[10px] font-medium"
          style={{ color: connected ? "var(--el-success)" : "var(--el-text-faint)" }}
        >
          {connected ? <Wifi size={10} /> : <WifiOff size={10} />}
          {connected ? "Connected" : "Disconnected"}
        </div>

        {connected && (
          <div
            className="flex items-center gap-1 text-[10px]"
            style={{ color: wsOk ? "var(--el-success)" : "var(--el-warning)" }}
          >
            <Circle size={4} fill="currentColor" />
            <span style={{ color: "var(--el-text-faint)" }}>
              Stream {wsOk ? "live" : wsStatus}
            </span>
          </div>
        )}
      </div>

      {/* Right: version */}
      <div className="text-[10px]" style={{ color: "var(--el-text-faint)" }}>
        {serverVersion ? `v${serverVersion}` : ""}
      </div>
    </div>
  );
}
