/**
 * Explorer — left sidebar. World dashboard.
 *
 * Dense, compact information about the state of the virtual world.
 * No redundancy with other panels. Empty sections are hidden.
 */

import { useEffect, useState } from "react";
import {
  Globe,
  Bot,
  MapPin,
  Link,
  Activity,
  Clock,
  Sun,
  Moon,
  Server,
  Map,
  Flag,
  Building2,
  Mountain,
  Droplets,
  Orbit,
} from "lucide-react";
import { useWorldStore } from "../store/worldStore";
import { useConnectionStore } from "../store/connectionStore";

/* ---------- Compact row: label left, value right ---------- */

function Row({
  icon,
  label,
  value,
  color,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div className="flex items-center gap-2 py-[3px] min-h-[22px]">
      {icon && (
        <span className="shrink-0 w-4 flex justify-center" style={{ color: "var(--el-text-faint)" }}>
          {icon}
        </span>
      )}
      <span className="text-[11px] truncate" style={{ color: "var(--el-text-muted)" }}>
        {label}
      </span>
      <span
        className="ml-auto text-[11px] font-medium tabular-nums shrink-0"
        style={{ color: color || "var(--el-text)" }}
      >
        {typeof value === "number" ? value.toLocaleString() : value}
      </span>
    </div>
  );
}

/* ---------- Section divider ---------- */

function Section({ label }: { label: string }) {
  return (
    <div
      className="text-[9px] font-semibold uppercase tracking-widest pt-3 pb-1 px-3"
      style={{ color: "var(--el-text-faint)" }}
    >
      {label}
    </div>
  );
}

/* ---------- Main ---------- */

export default function Explorer() {
  const connected = useConnectionStore((s) => s.connected);
  const {
    time,
    isRunning,
    locationCount,
    connectionCount,
    agentCount,
    agentBackend,
    tickCount,
    geographyStats,
  } = useWorldStore();

  // Real-time ticking clock — updates every second
  const [clockTime, setClockTime] = useState(() => new Date());
  useEffect(() => {
    if (!connected) return;
    const id = setInterval(() => setClockTime(new Date()), 1000);
    return () => clearInterval(id);
  }, [connected]);

  const hours = connected ? String(clockTime.getUTCHours()).padStart(2, "0") : "--";
  const minutes = connected ? String(clockTime.getUTCMinutes()).padStart(2, "0") : "--";
  const seconds = connected ? String(clockTime.getUTCSeconds()).padStart(2, "0") : "--";

  // Full date from server time (authoritative world date)
  let fullDate = "";
  if (time?.current_time) {
    const utc = new Date(time.current_time);
    fullDate = utc.toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
  }

  return (
    <div className="el-panel el-no-select">
      <div className="el-panel-header"><Globe size={12} />World</div>

      <div className="flex-1 overflow-y-auto">
        {/* Connected world data */}
        {connected && (
          <>
            {/* Time block — real-time ticking clock */}
            <div className="px-3 pt-3 pb-1">
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold tabular-nums tracking-tight" style={{ color: "var(--el-text)" }}>
                  {hours}:{minutes}:{seconds}
                </span>
                <span className="text-[11px]" style={{ color: "var(--el-text-muted)" }}>
                  UTC
                </span>
              </div>
              {fullDate && (
                <div className="mt-0.5">
                  <span className="text-[11px]" style={{ color: "var(--el-text-faint)" }}>
                    {fullDate}
                  </span>
                </div>
              )}
            </div>

            {/* Simulation status */}
            <Section label="Simulation" />
            <div className="px-3">
              <Row icon={<Activity size={11} />} label="Status" value={isRunning ? "Running" : "Stopped"} color={isRunning ? "var(--el-success)" : "var(--el-text-faint)"} />
              <Row icon={<Clock size={11} />} label="Tick" value={tickCount} />
              {agentBackend && (
                <Row icon={<Server size={11} />} label="Runtime" value={agentBackend} />
              )}
            </div>

            {/* Physical */}
            <Section label="Physical" />
            <div className="px-3">
              <Row icon={<Globe size={11} />} label="Radius" value="6,371 km" />
              <Row icon={<Globe size={11} />} label="Surface Area" value="510.1M km²" />
              <Row icon={<Droplets size={11} />} label="Water" value="71%" />
              <Row icon={<Mountain size={11} />} label="Land" value="29%" />
              <Row icon={<Mountain size={11} />} label="Highest Point" value="8,849 m" />
              <Row icon={<Mountain size={11} />} label="Lowest Point" value="-11,034 m" />
            </div>

            {/* Orbital */}
            <Section label="Orbital" />
            <div className="px-3">
              <Row icon={<Orbit size={11} />} label="Axial Tilt" value="23.44°" />
              <Row icon={<Clock size={11} />} label="Rotation" value="23h 56m" />
              <Row icon={<Orbit size={11} />} label="Orbital Period" value="365.25 days" />
              <Row icon={<Sun size={11} />} label="Distance from Sun" value="149.6M km" />
              <Row icon={<Moon size={11} />} label="Moons" value="1" />
            </div>

            {/* Places */}
            <Section label="Places" />
            <div className="px-3">
              <Row icon={<MapPin size={11} />} label="Locations" value={locationCount} />
              <Row icon={<Link size={11} />} label="Connections" value={connectionCount} />
              {geographyStats && Object.keys(geographyStats.countries).length > 0 && (
                <Row icon={<Flag size={11} />} label="Countries" value={Object.keys(geographyStats.countries).length} />
              )}
              {geographyStats && Object.keys(geographyStats.regions).length > 0 && (
                <Row icon={<Map size={11} />} label="Regions" value={Object.keys(geographyStats.regions).length} />
              )}
              {geographyStats && Object.keys(geographyStats.location_types).length > 0 && (
                <Row icon={<Building2 size={11} />} label="Place Types" value={Object.keys(geographyStats.location_types).length} />
              )}
            </div>

            {/* Agents */}
            <Section label="Agents" />
            <div className="px-3">
              <Row icon={<Bot size={11} />} label="Active" value={agentCount} color="var(--el-info)" />
            </div>



          </>
        )}
      </div>
    </div>
  );
}
