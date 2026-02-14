/**
 * Explorer — left sidebar. World dashboard.
 *
 * Dense, compact information about the state of the virtual world.
 * No redundancy with other panels. Empty sections are hidden.
 */

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

  // Energy stats
  const energies = agents.map((a) => a.energy);
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

  // Action distribution across all agents (latest action)
  const actionCounts: Record<string, number> = {};
  for (const a of agents) {
    actionCounts[a.last_action] = (actionCounts[a.last_action] || 0) + 1;
  }
  const topAction = Object.entries(actionCounts).sort(([, a], [, b]) => b - a)[0];

  return (
    <>
      <Section label="Population Metrics" />
      <div className="px-3">
        <Row icon={<Zap size={11} />} label="Avg Energy" value={`${Math.round(avgEnergy * 100)}%`} color={avgEnergy >= 0.5 ? "var(--el-success)" : "var(--el-warning)"} />
        <Row icon={<Zap size={11} />} label="Min Energy" value={`${Math.round(minEnergy * 100)}%`} color={minEnergy >= 0.3 ? "var(--el-text-muted)" : "var(--el-danger)"} />
        <Row icon={<Brain size={11} />} label="Avg Knowledge" value={avgKnowledge.toFixed(1)} />
        <Row icon={<Brain size={11} />} label="Max Knowledge" value={maxKnowledge.toFixed(1)} />
        <Row icon={<TrendingUp size={11} />} label="Avg Reward/tick" value={avgRewardPerTick.toFixed(3)} color={avgRewardPerTick >= 0 ? "var(--el-success)" : "var(--el-danger)"} />
        <Row icon={<Route size={11} />} label="Unique Places Visited" value={uniqueVisited.size} />
        {topAction && (
          <Row icon={<Activity size={11} />} label="Dominant Action" value={`${topAction[0]} (${topAction[1]})`} />
        )}
      </div>
    </>
  );
}

/* ---------- Main ---------- */

export default function Explorer() {
  const connected = useConnectionStore((s) => s.connected);
  const connecting = useConnectionStore((s) => s.connecting);
  const {
    time,
    isRunning,
    locationCount,
    connectionCount,
    agentCount,
    weatherStations,
    tickCount,
  } = useWorldStore();

  const hours = time ? String(time.hour).padStart(2, "0") : "--";
  const minutes = time ? String(time.minute).padStart(2, "0") : "--";

  return (
    <div className="el-panel el-no-select">
      <div className="el-panel-header"><Globe size={12} />World</div>

      <div className="flex-1 overflow-y-auto">
        {/* When not connected, show minimal waiting state */}
        {!connected && (
          <div className="px-3 py-6 text-center">
            <span className="text-[11px]" style={{ color: "var(--el-text-faint)" }}>
              {connecting ? "Connecting..." : "Awaiting connection"}
            </span>
          </div>
        )}

        {/* Connected world data */}
        {connected && (
          <>
            {/* Time block */}
            <div className="px-3 pt-3 pb-1">
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold tabular-nums tracking-tight" style={{ color: "var(--el-text)" }}>
                  {hours}:{minutes}
                </span>
                <span className="text-[11px]" style={{ color: "var(--el-text-muted)" }}>
                  {time?.timezone_abbr ?? ""}
                </span>
              </div>
              {time && (
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-[11px]" style={{ color: "var(--el-text-faint)" }}>
                    {time.date}
                  </span>
                  <span className="text-[10px] font-medium" style={{ color: "var(--el-text-accent)" }}>
                    {time.season}
                  </span>
                </div>
              )}
            </div>

            {/* Simulation status */}
            <Section label="Simulation" />
            <div className="px-3">
              <Row icon={<Activity size={11} />} label="Status" value={isRunning ? "Running" : "Stopped"} color={isRunning ? "var(--el-success)" : "var(--el-text-faint)"} />
              <Row icon={<Clock size={11} />} label="Tick" value={tickCount} />
            </div>

            {/* Geography */}
            <Section label="Geography" />
            <div className="px-3">
              <Row icon={<MapPin size={11} />} label="Locations" value={locationCount} />
              <Row icon={<Link size={11} />} label="Connections" value={connectionCount} />
            </div>

            {/* Agents */}
            <Section label="Agents" />
            <div className="px-3">
              <Row icon={<Bot size={11} />} label="Active" value={agentCount} color="var(--el-info)" />
            </div>

            {/* Aggregate metrics — strategy space overview */}
            <AgentAggregates />

            {/* Weather — only show if we have stations */}
            {weatherStations > 0 && (
              <>
                <Section label="Weather" />
                <div className="px-3">
                  <Row icon={<Cloud size={11} />} label="Stations" value={weatherStations} />
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
