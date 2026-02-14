/**
 * Explorer — left sidebar panel.
 *
 * World information panel. Shows the state of the virtual world
 * as it is: time, date, season, weather, astronomy, population.
 * This is not a game control panel — worlds don't have pause buttons.
 */

import {
  Globe,
  Clock,
  Bot,
  MapPin,
  Cloud,
  Sun,
  Sunset,
  Sunrise,
  Thermometer,
  Wind,
  Droplets,
  Eye,
  WifiOff,
  CalendarDays,
  Link,
} from "lucide-react";
import { useWorldStore } from "../store/worldStore";
import { useConnectionStore } from "../store/connectionStore";
import { useSelectionStore } from "../store/selectionStore";

/* ---------- Section header ---------- */

function SectionLabel({ label }: { label: string }) {
  return (
    <div
      className="text-[9px] font-semibold uppercase tracking-widest mt-3 mb-1.5 px-1"
      style={{ color: "var(--el-text-faint)" }}
    >
      {label}
    </div>
  );
}

/* ---------- Info row ---------- */

function InfoRow({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | React.ReactNode;
  accent?: string;
}) {
  return (
    <div className="flex items-center gap-2.5 py-1.5">
      <span
        className="shrink-0"
        style={{ color: accent || "var(--el-text-faint)" }}
      >
        {icon}
      </span>
      <span className="text-[11px]" style={{ color: "var(--el-text-muted)" }}>
        {label}
      </span>
      <span
        className="ml-auto text-[11px] font-medium text-right"
        style={{ color: accent || "var(--el-text)" }}
      >
        {value}
      </span>
    </div>
  );
}

/* ---------- Large time display ---------- */

function TimeDisplay() {
  const time = useWorldStore((s) => s.time);

  if (!time) {
    return (
      <div className="el-card px-4 py-4 text-center">
        <div className="text-2xl font-bold tabular-nums" style={{ color: "var(--el-text-faint)" }}>
          --:--
        </div>
        <div className="text-[10px] mt-1" style={{ color: "var(--el-text-faint)" }}>
          Waiting for world data
        </div>
      </div>
    );
  }

  const hours = String(time.hour).padStart(2, "0");
  const minutes = String(time.minute).padStart(2, "0");

  return (
    <div className="el-card px-4 py-4">
      <div className="flex items-baseline justify-between">
        <div
          className="text-3xl font-bold tabular-nums tracking-tight"
          style={{ color: "var(--el-text)" }}
        >
          {hours}:{minutes}
        </div>
        <div className="text-right">
          <div className="text-[11px] font-medium" style={{ color: "var(--el-text-secondary)" }}>
            {time.timezone_abbr}
          </div>
          <div className="text-[10px]" style={{ color: "var(--el-text-faint)" }}>
            {time.utc_offset}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-1.5">
          <CalendarDays size={11} style={{ color: "var(--el-text-faint)" }} />
          <span className="text-[11px]" style={{ color: "var(--el-text-secondary)" }}>
            {time.date}
          </span>
        </div>
        <span
          className="el-badge el-badge-accent"
          style={{ fontSize: "10px" }}
        >
          {time.season}
        </span>
      </div>
    </div>
  );
}

/* ---------- Selected entity indicator ---------- */

function SelectionIndicator() {
  const { kind, id, locationDetail, agentDetail, clearSelection } = useSelectionStore();

  if (!kind) return null;

  const name =
    kind === "location"
      ? locationDetail?.name ?? `Location ${id}`
      : agentDetail?.name ?? `Agent ${id}`;

  const icon = kind === "location" ? <MapPin size={12} /> : <Bot size={12} />;

  return (
    <div className="mb-2">
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-lg"
        style={{
          background: "var(--el-accent-soft)",
          border: "1px solid var(--el-accent)",
        }}
      >
        <span style={{ color: "var(--el-text-accent)" }}>{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="text-[10px]" style={{ color: "var(--el-text-accent)" }}>
            Selected {kind}
          </div>
          <div className="text-xs font-semibold truncate" style={{ color: "var(--el-text)" }}>
            {name}
          </div>
        </div>
        <button
          onClick={clearSelection}
          className="text-[10px] px-1.5 py-0.5 rounded cursor-default"
          style={{ color: "var(--el-text-faint)" }}
        >
          Clear
        </button>
      </div>
    </div>
  );
}

/* ---------- Disconnected state ---------- */

function DisconnectedState() {
  const { connect, connecting } = useConnectionStore();

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12 px-4">
      <div
        className="flex items-center justify-center rounded-full"
        style={{
          width: 48,
          height: 48,
          background: "var(--el-bg-badge)",
        }}
      >
        <WifiOff size={22} style={{ color: "var(--el-text-faint)" }} />
      </div>
      <div className="text-center">
        <div className="text-xs font-medium" style={{ color: "var(--el-text-muted)" }}>
          Not connected
        </div>
        <div className="text-[10px] mt-1 leading-relaxed" style={{ color: "var(--el-text-faint)" }}>
          Connect to the EarthLink server to see the world.
        </div>
      </div>
      <button
        onClick={() => connect()}
        disabled={connecting}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium cursor-default disabled:opacity-60"
        style={{
          background: "var(--el-accent)",
          color: "var(--el-text-on-accent)",
        }}
      >
        <Globe size={14} />
        {connecting ? "Connecting..." : "Connect"}
      </button>
    </div>
  );
}

/* ---------- Main Explorer ---------- */

export default function Explorer() {
  const connected = useConnectionStore((s) => s.connected);
  const {
    locationCount,
    agentCount,
    weatherStations,
    connectionCount,
    tickCount,
  } = useWorldStore();

  return (
    <div className="el-panel el-no-select">
      {/* Panel header */}
      <div className="el-panel-header">
        <Globe size={12} />
        World
      </div>

      <div className="flex-1 overflow-y-auto">
        {!connected ? (
          <DisconnectedState />
        ) : (
          <div className="p-3 flex flex-col gap-1">
            {/* Selection indicator */}
            <SelectionIndicator />

            {/* Time — the most prominent piece of world info */}
            <TimeDisplay />

            {/* Weather (placeholder until per-location weather is wired) */}
            <SectionLabel label="Conditions" />

            <div className="el-card px-3 py-2.5 flex flex-col gap-0.5">
              <InfoRow
                icon={<Thermometer size={12} />}
                label="Temperature"
                value="--"
              />
              <InfoRow
                icon={<Cloud size={12} />}
                label="Conditions"
                value="--"
              />
              <InfoRow
                icon={<Wind size={12} />}
                label="Wind"
                value="--"
              />
              <InfoRow
                icon={<Droplets size={12} />}
                label="Humidity"
                value="--"
              />
            </div>

            {/* Astronomy */}
            <SectionLabel label="Astronomy" />

            <div className="el-card px-3 py-2.5 flex flex-col gap-0.5">
              <InfoRow
                icon={<Sunrise size={12} />}
                label="Sunrise"
                value="--:--"
              />
              <InfoRow
                icon={<Sunset size={12} />}
                label="Sunset"
                value="--:--"
              />
              <InfoRow
                icon={<Sun size={12} />}
                label="Day length"
                value="--"
              />
              <InfoRow
                icon={<Eye size={12} />}
                label="Daylight"
                value="--"
              />
            </div>

            {/* World stats */}
            <SectionLabel label="Virtual World" />

            <div className="el-card px-3 py-2.5 flex flex-col gap-0.5">
              <InfoRow
                icon={<MapPin size={12} />}
                label="Locations"
                value={locationCount.toLocaleString()}
              />
              <InfoRow
                icon={<Link size={12} />}
                label="Connections"
                value={connectionCount.toLocaleString()}
              />
              <InfoRow
                icon={<Bot size={12} />}
                label="Agents"
                value={agentCount.toString()}
                accent="var(--el-info)"
              />
              <InfoRow
                icon={<Cloud size={12} />}
                label="Weather stations"
                value={weatherStations.toString()}
              />
              <InfoRow
                icon={<Clock size={12} />}
                label="Tick"
                value={tickCount.toLocaleString()}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
