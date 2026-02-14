/**
 * DecisionsView — per-tick decision log for a selected agent.
 *
 * Opens as a tab in the center viewport.
 * Each row shows: tick, timestamp, from -> to location, action,
 * reward, Q-value, knowledge score, energy, goal.
 *
 * Auto-scrolls to the latest entry. Newest on top.
 */

import { useRef, useEffect } from "react";
import { ListChecks, ArrowRight } from "lucide-react";
import { useAgentHistoryStore, type AgentSnapshot } from "../store/agentHistoryStore";

interface DecisionsViewProps {
  agentId?: string;
  agentName?: string;
}

function rewardColor(r: number): string {
  if (r > 0) return "var(--el-success)";
  if (r < 0) return "var(--el-danger)";
  return "var(--el-text-faint)";
}

function DecisionRow({ snap }: { snap: AgentSnapshot }) {
  return (
    <tr
      className="transition-colors"
      style={{ borderBottom: "1px solid var(--el-border-subtle)" }}
    >
      <td className="px-2 py-1.5 text-[10px] font-mono" style={{ color: "var(--el-text-faint)" }}>
        {snap.tick}
      </td>
      <td className="px-2 py-1.5 text-[10px] font-mono" style={{ color: "var(--el-text-muted)" }}>
        {snap.timestamp}
      </td>
      <td className="px-2 py-1.5 text-[10px]">
        <span className="inline-flex items-center gap-1">
          <span className="font-mono" style={{ color: "var(--el-text-muted)" }}>{snap.fromLocationId}</span>
          <ArrowRight size={8} style={{ color: "var(--el-text-faint)" }} />
          <span className="font-mono" style={{ color: "var(--el-text)" }}>{snap.toLocationId}</span>
        </span>
      </td>
      <td className="px-2 py-1.5">
        <span className="el-badge el-badge-accent text-[9px]">{snap.action}</span>
      </td>
      <td className="px-2 py-1.5 text-[10px] font-mono text-right" style={{ color: rewardColor(snap.reward) }}>
        {snap.reward >= 0 ? `+${snap.reward.toFixed(2)}` : snap.reward.toFixed(2)}
      </td>
      <td className="px-2 py-1.5 text-[10px] font-mono text-right" style={{ color: "var(--el-text-muted)" }}>
        {snap.qValue.toFixed(3)}
      </td>
      <td className="px-2 py-1.5 text-[10px] font-mono text-right" style={{ color: "var(--el-text-muted)" }}>
        {snap.knowledgeScore.toFixed(1)}
      </td>
      <td className="px-2 py-1.5 text-[10px] font-mono text-right" style={{ color: "var(--el-text-muted)" }}>
        {snap.energy != null ? `${Math.round(snap.energy * 100)}%` : "—"}
      </td>
      <td className="px-2 py-1.5 text-[10px] font-mono truncate max-w-[140px]" style={{ color: "var(--el-text-faint)" }}>
        {snap.goal ? String(snap.goal.kind ?? "—") : "—"}
      </td>
    </tr>
  );
}

export default function DecisionsView({ agentId, agentName }: DecisionsViewProps) {
  const history = useAgentHistoryStore((s) => (agentId ? s.histories[agentId] : undefined));
  const snapshots = history?.snapshots ?? [];
  const tableRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new entries
  useEffect(() => {
    if (tableRef.current) {
      tableRef.current.scrollTop = tableRef.current.scrollHeight;
    }
  }, [snapshots.length]);

  return (
    <div className="h-full w-full flex flex-col" style={{ background: "var(--el-bg-panel-alt)" }}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 shrink-0" style={{ borderBottom: "1px solid var(--el-border)" }}>
        <ListChecks size={14} style={{ color: "var(--el-text-accent)" }} />
        <span className="text-sm font-semibold" style={{ color: "var(--el-text)" }}>
          Decisions{agentName ? ` — ${agentName}` : ""}
        </span>
        <span className="text-[10px] font-mono" style={{ color: "var(--el-text-faint)" }}>
          {snapshots.length} entries
        </span>
      </div>

      {snapshots.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-16">
          <ListChecks size={24} style={{ color: "var(--el-text-faint)" }} />
          <span className="text-xs" style={{ color: "var(--el-text-faint)" }}>
            No decisions recorded yet. The world must be running.
          </span>
        </div>
      ) : (
        <div ref={tableRef} className="flex-1 overflow-auto">
          <table className="w-full text-left" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--el-border)", background: "var(--el-bg-panel)" }}>
                {["Tick", "Time", "Location", "Action", "Reward", "Q-Value", "Knowledge", "Energy", "Goal"].map((h) => (
                  <th
                    key={h}
                    className="px-2 py-1.5 text-[9px] font-semibold uppercase tracking-wider sticky top-0"
                    style={{ color: "var(--el-text-faint)", background: "var(--el-bg-panel)" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {snapshots.map((snap, i) => (
                <DecisionRow key={i} snap={snap} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
