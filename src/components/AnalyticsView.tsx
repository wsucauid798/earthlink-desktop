/**
 * AnalyticsView — real-time charts for a selected agent.
 *
 * Opens as a tab in the center viewport.
 * Shows reward over time, knowledge over time, energy,
 * Q-values, and action distribution.
 */

import { BarChart3, Activity, Brain, Zap, TrendingUp, PieChart } from "lucide-react";
import { useAgentHistoryStore } from "../store/agentHistoryStore";
import Sparkline from "./Sparkline";

interface AnalyticsViewProps {
  agentId?: string;
  agentName?: string;
}

/* ---------- Metric card ---------- */

function MetricCard({
  label,
  icon,
  value,
  unit,
  data,
  color,
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  unit?: string;
  data: number[];
  color?: string;
}) {
  return (
    <div
      className="flex flex-col gap-2 p-3 rounded-lg"
      style={{
        background: "var(--el-bg-panel)",
        border: "1px solid var(--el-border-card)",
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--el-text-muted)" }}>
          {icon}
          {label}
        </div>
        <div className="text-sm font-mono font-semibold" style={{ color: "var(--el-text)" }}>
          {value}
          {unit && <span className="text-[10px] font-normal ml-0.5" style={{ color: "var(--el-text-faint)" }}>{unit}</span>}
        </div>
      </div>
      <Sparkline data={data} width={280} height={48} color={color} />
    </div>
  );
}

/* ---------- Action distribution ---------- */

function ActionDistribution({ snapshots }: { snapshots: { action: string }[] }) {
  const counts: Record<string, number> = {};
  for (const s of snapshots) {
    counts[s.action] = (counts[s.action] || 0) + 1;
  }

  const total = snapshots.length || 1;
  const sorted = Object.entries(counts).sort(([, a], [, b]) => b - a);

  const colors = [
    "var(--el-accent)",
    "var(--el-success)",
    "var(--el-warning)",
    "var(--el-danger)",
    "var(--el-text-muted)",
  ];

  return (
    <div
      className="flex flex-col gap-2 p-3 rounded-lg"
      style={{
        background: "var(--el-bg-panel)",
        border: "1px solid var(--el-border-card)",
      }}
    >
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--el-text-muted)" }}>
        <PieChart size={10} />
        Action Distribution
      </div>
      <div className="flex flex-col gap-1.5">
        {sorted.map(([action, count], i) => {
          const pct = (count / total) * 100;
          return (
            <div key={action} className="flex items-center gap-2">
              <span className="text-[10px] font-mono w-20 truncate" style={{ color: "var(--el-text-muted)" }}>{action}</span>
              <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--el-bg-app)" }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, background: colors[i % colors.length] }}
                />
              </div>
              <span className="text-[10px] font-mono w-10 text-right" style={{ color: "var(--el-text-faint)" }}>
                {pct.toFixed(0)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Main ---------- */

export default function AnalyticsView({ agentId, agentName }: AnalyticsViewProps) {
  const history = useAgentHistoryStore((s) => (agentId ? s.histories[agentId] : undefined));
  const snapshots = history?.snapshots ?? [];

  const latestReward = snapshots.length > 0 ? snapshots[snapshots.length - 1].reward : 0;
  const latestKnowledge = snapshots.length > 0 ? snapshots[snapshots.length - 1].knowledgeScore : 0;
  const latestEnergy = snapshots.length > 0 ? (snapshots[snapshots.length - 1].energy ?? 0) : 0;
  const latestQ = snapshots.length > 0 ? snapshots[snapshots.length - 1].qValue : 0;
  const cumulativeReward = snapshots.reduce((sum, s) => sum + s.reward, 0);

  return (
    <div className="h-full w-full overflow-y-auto" style={{ background: "var(--el-bg-panel-alt)" }}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: "1px solid var(--el-border)" }}>
        <BarChart3 size={14} style={{ color: "var(--el-text-accent)" }} />
        <span className="text-sm font-semibold" style={{ color: "var(--el-text)" }}>
          Analytics{agentName ? ` — ${agentName}` : ""}
        </span>
        <span className="text-[10px] font-mono" style={{ color: "var(--el-text-faint)" }}>
          {snapshots.length} ticks recorded
        </span>
      </div>

      {snapshots.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-16">
          <Activity size={24} style={{ color: "var(--el-text-faint)" }} />
          <span className="text-xs" style={{ color: "var(--el-text-faint)" }}>
            Awaiting tick data for this agent. The world must be running.
          </span>
        </div>
      ) : (
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <MetricCard
            label="Reward"
            icon={<TrendingUp size={10} />}
            value={latestReward >= 0 ? `+${latestReward.toFixed(2)}` : latestReward.toFixed(2)}
            data={snapshots.map((s) => s.reward)}
            color="var(--el-success)"
          />
          <MetricCard
            label="Cumulative Reward"
            icon={<TrendingUp size={10} />}
            value={cumulativeReward.toFixed(2)}
            data={snapshots.reduce<number[]>((acc, s) => {
              const prev = acc.length > 0 ? acc[acc.length - 1] : 0;
              acc.push(prev + s.reward);
              return acc;
            }, [])}
            color="var(--el-accent)"
          />
          <MetricCard
            label="Knowledge"
            icon={<Brain size={10} />}
            value={latestKnowledge.toFixed(1)}
            data={snapshots.map((s) => s.knowledgeScore)}
            color="var(--el-warning)"
          />
          <MetricCard
            label="Energy"
            icon={<Zap size={10} />}
            value={`${Math.round(latestEnergy * 100)}%`}
            data={snapshots.map((s) => (s.energy ?? 0) * 100)}
            color="var(--el-danger)"
          />
          <MetricCard
            label="Q-Value"
            icon={<Activity size={10} />}
            value={latestQ.toFixed(3)}
            data={snapshots.map((s) => s.qValue)}
            color="var(--el-text-accent)"
          />
          <ActionDistribution snapshots={snapshots} />
        </div>
      )}
    </div>
  );
}
