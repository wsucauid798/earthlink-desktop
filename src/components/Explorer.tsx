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
  Cloud,
  Link,
  Activity,
  Clock,
  Zap,
  Brain,
  TrendingUp,
  Route,
  Thermometer,
  Sun,
  Moon,
  Server,
  Mountain,
  Users,
  Map,
  Flag,
  Building2,
} from "lucide-react";
import { useWorldStore } from "../store/worldStore";
import { useConnectionStore } from "../store/connectionStore";
import { useAgentHistoryStore } from "../store/agentHistoryStore";

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

/* ---------- Aggregate agent metrics ---------- */

function AgentAggregates() {
  const agents = useWorldStore((s) => s.agents);
  const histories = useAgentHistoryStore((s) => s.histories);

  if (agents.length === 0) return null;

  // Energy stats — normalise to 0-1 (server may return 0-1 or 0-100)
  const energies = agents.map((a) => (a.energy > 1 ? a.energy / 100 : a.energy));
  const avgEnergy = energies.reduce((s, e) => s + e, 0) / energies.length;
  const minEnergy = Math.min(...energies);

  // Knowledge stats
  const knowledges = agents.map((a) => a.knowledge_score);
  const avgKnowledge = knowledges.reduce((s, k) => s + k, 0) / knowledges.length;
  const maxKnowledge = Math.max(...knowledges);

  // Reward stats from history
  const allHistories = Object.values(histories);
  let totalReward = 0;
  let totalTicks = 0;
  let uniqueVisited = new Set<number>();
  for (const h of allHistories) {
    for (const snap of h.snapshots) {
      totalReward += snap.reward;
      totalTicks++;
      uniqueVisited.add(snap.toLocationId);
    }
  }
  const avgRewardPerTick = totalTicks > 0 ? totalReward / totalTicks : 0;

  // Action distribution — extract verb only (e.g. "move" from "move:63755->62793")
  const actionCounts: Record<string, number> = {};
  for (const a of agents) {
    const verb = a.last_action.split(":")[0];
    actionCounts[verb] = (actionCounts[verb] || 0) + 1;
  }
  const sortedActions = Object.entries(actionCounts).sort(([, a], [, b]) => b - a);

  return (
    <>
      <Section label="Population Metrics" />
      <div className="px-3">
        <Row icon={<Zap size={11} />} label="Avg Energy" value={`${Math.round(avgEnergy * 100)}%`} color={avgEnergy >= 0.5 ? "var(--el-success)" : "var(--el-warning)"} />
        <Row icon={<Zap size={11} />} label="Min Energy" value={`${Math.round(minEnergy * 100)}%`} color={minEnergy >= 0.3 ? "var(--el-text-muted)" : "var(--el-danger)"} />
        <Row icon={<Brain size={11} />} label="Avg Knowledge" value={avgKnowledge.toFixed(1)} />
        <Row icon={<Brain size={11} />} label="Max Knowledge" value={maxKnowledge.toFixed(1)} />
        <Row icon={<TrendingUp size={11} />} label="Avg Reward/tick" value={avgRewardPerTick.toFixed(3)} color={avgRewardPerTick >= 0 ? "var(--el-success)" : "var(--el-danger)"} />
        {uniqueVisited.size > 0 && (
          <Row icon={<Route size={11} />} label="Unique Places Visited" value={uniqueVisited.size} />
        )}
      </div>

      {sortedActions.length > 0 && (
        <>
          <Section label="Activity" />
          <div className="px-3">
            {sortedActions.map(([verb, count]) => (
              <Row
                key={verb}
                icon={<Activity size={11} />}
                label={verb}
                value={`${count} agent${count !== 1 ? "s" : ""}`}
                color="var(--el-text-secondary)"
              />
            ))}
          </div>
        </>
      )}
    </>
  );
}

/* ---------- Weather summary stats ---------- */

function WeatherStats({ summary }: { summary: Record<string, { temperature_c?: number | null; conditions?: string | null; is_daylight?: boolean }> }) {
  const entries = Object.values(summary);
  if (entries.length === 0) return null;

  // Average temperature
  const temps = entries.map((e) => e.temperature_c).filter((t): t is number => t != null);
  const avgTemp = temps.length > 0 ? temps.reduce((s, t) => s + t, 0) / temps.length : null;

  // Daylight count
  const daylightCount = entries.filter((e) => e.is_daylight).length;

  // Most common condition
  const condCounts: Record<string, number> = {};
  for (const e of entries) {
    if (e.conditions) {
      condCounts[e.conditions] = (condCounts[e.conditions] || 0) + 1;
    }
  }
  const topCondition = Object.entries(condCounts).sort(([, a], [, b]) => b - a)[0];

  return (
    <>
      {avgTemp != null && (
        <Row icon={<Thermometer size={11} />} label="Avg Temp" value={`${avgTemp.toFixed(1)}\u00B0C`} />
      )}
      {topCondition && (
        <Row icon={<Cloud size={11} />} label="Conditions" value={`${topCondition[0]}`} />
      )}
      <Row icon={daylightCount > 0 ? <Sun size={11} /> : <Moon size={11} />} label="Daylight" value={`${daylightCount}/${entries.length} stations`} />
    </>
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
    weatherStations,
    tickCount,
    weatherSummary,
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

            {/* Geography */}
            <Section label="Geography" />
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
              {geographyStats?.total_population != null && geographyStats.total_population > 0 && (
                <Row icon={<Users size={11} />} label="Population" value={geographyStats.total_population} />
              )}
              {geographyStats?.elevation_min != null && geographyStats?.elevation_max != null && (
                <Row icon={<Mountain size={11} />} label="Elevation" value={`${geographyStats.elevation_min}m \u2013 ${geographyStats.elevation_max}m`} />
              )}
            </div>

            {/* Agents */}
            <Section label="Agents" />
            <div className="px-3">
              <Row icon={<Bot size={11} />} label="Active" value={agentCount} color="var(--el-info)" />
            </div>

            {/* Aggregate metrics — strategy space overview */}
            <AgentAggregates />

            {/* Weather — summary stats from station data */}
            {weatherStations > 0 && (
              <>
                <Section label="Weather" />
                <div className="px-3">
                  <Row icon={<Cloud size={11} />} label="Stations" value={weatherStations} />
                  <WeatherStats summary={weatherSummary} />
                </div>
              </>
            )}

          </>
        )}
      </div>
    </div>
  );
}
