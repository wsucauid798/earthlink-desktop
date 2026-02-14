/**
 * StatusBar — bottom dashboard strip.
 *
 * Shows live world indicators as pill badges: connection status,
 * tick count, world time, agent count, season.
 * Wired to Zustand stores for live data.
 */

import {
  Circle,
  Activity,
  Clock,
  Bot,
  Droplets,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useConnectionStore } from "../store/connectionStore";
import { useWorldStore } from "../store/worldStore";

function Indicator({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div
      className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px]"
      style={{
        background: "var(--el-bg-badge)",
      }}
    >
      <span style={{ color: color || "var(--el-text-faint)" }}>{icon}</span>
      {label && <span style={{ color: "var(--el-text-faint)" }}>{label}</span>}
      <span className="font-semibold tabular-nums" style={{ color: color || "var(--el-text-secondary)" }}>
        {value}
      </span>
    </div>
  );
}

export default function StatusBar() {
  const { connected, wsStatus } = useConnectionStore();
  const { tickCount, time, agentCount, isRunning } = useWorldStore();

  const worldTime = time
    ? `${String(time.hour).padStart(2, "0")}:${String(time.minute).padStart(2, "0")} ${time.timezone_abbr}`
    : "--:--";

  const season = time?.season ?? "--";

  const wsConnected = wsStatus === "connected";

  return (
    <div
      className="el-no-select flex items-center justify-between px-2 shrink-0"
      style={{
        height: "var(--el-statusbar-h)",
        background: "var(--el-bg-panel)",
        borderTop: "1px solid var(--el-border)",
      }}
    >
      {/* Left indicators */}
      <div className="flex items-center gap-1.5">
        {/* REST connection */}
        <div
          className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold"
          style={{
            background: connected ? "var(--el-success-soft)" : "var(--el-danger-soft)",
            color: connected ? "var(--el-success)" : "var(--el-danger)",
          }}
        >
          {connected ? <Wifi size={10} /> : <WifiOff size={10} />}
          {connected ? "Connected" : "Disconnected"}
        </div>

        {/* WS status */}
        {connected && (
          <div
            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px]"
            style={{
              background: wsConnected ? "var(--el-success-soft)" : "var(--el-warning-soft)",
              color: wsConnected ? "var(--el-success)" : "var(--el-warning)",
            }}
          >
            <Circle size={5} fill="currentColor" />
            WS {wsStatus}
          </div>
        )}

        {connected && (
          <>
            <Indicator
              icon={<Activity size={10} />}
              label="Tick"
              value={tickCount.toLocaleString()}
              color="var(--el-text-accent)"
            />
            <Indicator
              icon={<Clock size={10} />}
              label=""
              value={worldTime}
            />
          </>
        )}
      </div>

      {/* Right indicators */}
      <div className="flex items-center gap-1.5">
        {connected && (
          <>
            <Indicator
              icon={<Bot size={10} />}
              label="Agents"
              value={agentCount.toString()}
            />

            <Indicator
              icon={<Droplets size={10} />}
              label=""
              value={season}
            />

            {isRunning && (
              <div
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                style={{
                  background: "var(--el-success-soft)",
                  color: "var(--el-success)",
                }}
              >
                <Circle size={5} fill="currentColor" />
                Running
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
