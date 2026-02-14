/**
 * TracesView — full audit trail for a selected agent.
 *
 * Opens as a tab in the center viewport.
 * Timeline of events: movement, knowledge acquisition, goal changes,
 * rewards. Each event is a card with details. Filterable by event type.
 */

import { useState } from "react";
import { FileText, MapPin, Brain, Target, TrendingUp, Filter } from "lucide-react";
import { useAgentHistoryStore, type AgentSnapshot } from "../store/agentHistoryStore";

interface TracesViewProps {
  agentId?: string;
  agentName?: string;
}

type EventKind = "move" | "knowledge" | "goal" | "reward";

interface TraceEvent {
  tick: number;
  timestamp: string;
  kind: EventKind;
  description: string;
  detail?: string;
  reward?: number;
}

function deriveEvents(snapshots: AgentSnapshot[]): TraceEvent[] {
  const events: TraceEvent[] = [];
  let prevGoalKind: string | null = null;

  for (const snap of snapshots) {
    // Movement trace
    if (snap.fromLocationId !== snap.toLocationId) {
      events.push({
        tick: snap.tick,
        timestamp: snap.timestamp,
        kind: "move",
        description: `Moved from location ${snap.fromLocationId} to ${snap.toLocationId}`,
        detail: `Action: ${snap.action}`,
      });
    }

    // Knowledge gain
    if (snap.action === "explore" || snap.action === "learn") {
      events.push({
        tick: snap.tick,
        timestamp: snap.timestamp,
        kind: "knowledge",
        description: `Knowledge acquired at location ${snap.toLocationId}`,
        detail: `Score: ${snap.knowledgeScore.toFixed(1)}`,
      });
    }

    // Goal change
    const goalKind = snap.goal ? String(snap.goal.kind ?? "") : "";
    if (goalKind && goalKind !== prevGoalKind) {
      events.push({
        tick: snap.tick,
        timestamp: snap.timestamp,
        kind: "goal",
        description: `Goal changed to: ${goalKind}`,
        detail: snap.goal?.target_location_name ? `Target: ${snap.goal.target_location_name}` : undefined,
      });
    }
    prevGoalKind = goalKind;

    // Notable rewards
    if (Math.abs(snap.reward) >= 0.5) {
      events.push({
        tick: snap.tick,
        timestamp: snap.timestamp,
        kind: "reward",
        description: snap.reward > 0 ? `Positive reward: +${snap.reward.toFixed(2)}` : `Negative reward: ${snap.reward.toFixed(2)}`,
        reward: snap.reward,
      });
    }
  }

  return events.reverse(); // newest first
}

function kindIcon(kind: EventKind) {
  switch (kind) {
    case "move": return <MapPin size={11} />;
    case "knowledge": return <Brain size={11} />;
    case "goal": return <Target size={11} />;
    case "reward": return <TrendingUp size={11} />;
  }
}

function kindColor(kind: EventKind): string {
  switch (kind) {
    case "move": return "var(--el-accent)";
    case "knowledge": return "var(--el-warning)";
    case "goal": return "var(--el-text-accent)";
    case "reward": return "var(--el-success)";
  }
}

export default function TracesView({ agentId, agentName }: TracesViewProps) {
  const history = useAgentHistoryStore((s) => (agentId ? s.histories[agentId] : undefined));
  const snapshots = history?.snapshots ?? [];
  const allEvents = deriveEvents(snapshots);

  const [filter, setFilter] = useState<EventKind | "all">("all");
  const filtered = filter === "all" ? allEvents : allEvents.filter((e) => e.kind === filter);

  const filterOptions: { key: EventKind | "all"; label: string }[] = [
    { key: "all", label: "All" },
    { key: "move", label: "Movement" },
    { key: "knowledge", label: "Knowledge" },
    { key: "goal", label: "Goals" },
    { key: "reward", label: "Rewards" },
  ];

  return (
    <div className="h-full w-full flex flex-col" style={{ background: "var(--el-bg-panel-alt)" }}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 shrink-0" style={{ borderBottom: "1px solid var(--el-border)" }}>
        <FileText size={14} style={{ color: "var(--el-text-accent)" }} />
        <span className="text-sm font-semibold" style={{ color: "var(--el-text)" }}>
          Traces{agentName ? ` — ${agentName}` : ""}
        </span>
        <span className="text-[10px] font-mono" style={{ color: "var(--el-text-faint)" }}>
          {filtered.length} events
        </span>

        {/* Filter buttons */}
        <div className="flex items-center gap-1 ml-auto">
          <Filter size={10} style={{ color: "var(--el-text-faint)" }} />
          {filterOptions.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setFilter(opt.key)}
              className="px-2 py-0.5 rounded text-[9px] font-medium cursor-default transition-colors"
              style={{
                background: filter === opt.key ? "var(--el-accent-soft)" : "transparent",
                color: filter === opt.key ? "var(--el-text-accent)" : "var(--el-text-faint)",
                border: filter === opt.key ? "1px solid var(--el-accent)" : "1px solid transparent",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {snapshots.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-16">
          <FileText size={24} style={{ color: "var(--el-text-faint)" }} />
          <span className="text-xs" style={{ color: "var(--el-text-faint)" }}>
            No trace events recorded yet. The world must be running.
          </span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <span className="text-xs" style={{ color: "var(--el-text-faint)" }}>No events match the filter.</span>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-4 py-3">
          <div className="flex flex-col gap-1">
            {filtered.map((event, i) => (
              <div
                key={i}
                className="flex items-start gap-3 py-2"
                style={{ borderBottom: "1px solid var(--el-border-subtle)" }}
              >
                {/* Timeline dot */}
                <div
                  className="flex items-center justify-center shrink-0 mt-0.5 rounded-full"
                  style={{
                    width: 22,
                    height: 22,
                    background: "var(--el-bg-panel)",
                    border: `1.5px solid ${kindColor(event.kind)}`,
                    color: kindColor(event.kind),
                  }}
                >
                  {kindIcon(event.kind)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono" style={{ color: "var(--el-text-faint)" }}>
                      t{event.tick}
                    </span>
                    <span className="text-[10px]" style={{ color: "var(--el-text-faint)" }}>
                      {event.timestamp}
                    </span>
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: "var(--el-text)" }}>
                    {event.description}
                  </div>
                  {event.detail && (
                    <div className="text-[10px] mt-0.5" style={{ color: "var(--el-text-muted)" }}>
                      {event.detail}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
