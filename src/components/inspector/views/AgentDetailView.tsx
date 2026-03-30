/**
 * AgentDetailView — agent detail panel with status, goal, top locations, knowledge.
 */

import { useState } from "react";
import {
  Bot, X, MessageCircle, BarChart3, Target, Navigation, Brain,
  Send, Loader, ListChecks, FileText, Gauge, Shield, Route,
} from "lucide-react";
import { motion } from "framer-motion";
import { useViewportStore } from "../../../store/viewportStore";
import { useAgentHistoryStore } from "../../../store/agentHistoryStore";
import { agentActionLabel } from "../../../lib/agentAction";
import type { AgentDetail, AgentAnswer } from "../../../api/types";
import { CardSection, Prop } from "../CardSection";
import SparklineChart from "../charts/SparklineChart";

/* ---------- Viewport quick actions ---------- */

function ViewportActions({ agentId, agentName }: { agentId: string; agentName: string }) {
  const openTab = useViewportStore((s) => s.openTab);

  const actions = [
    { kind: "analytics" as const, icon: <BarChart3 size={11} />, label: "Analytics" },
    { kind: "decisions" as const, icon: <ListChecks size={11} />, label: "Decisions" },
    { kind: "traces" as const, icon: <FileText size={11} />, label: "Traces" },
  ];

  return (
    <div className="flex items-center gap-1.5 px-3 pb-3">
      {actions.map((a) => (
        <button
          key={a.kind}
          onClick={() => openTab(a.kind, agentId, agentName)}
          className="el-action-btn text-[10px]"
        >
          {a.icon}
          {a.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- Utility section ---------- */

function AgentUtilitySection({ agentId }: { agentId: string }) {
  const history = useAgentHistoryStore((s) => s.histories[agentId]);
  const snaps = history?.snapshots ?? [];

  if (snaps.length === 0) {
    return (
      <CardSection title="Utility" icon={<Gauge size={10} />} defaultOpen={false}>
        <div className="text-[10px] py-1" style={{ color: "var(--el-text-faint)" }}>
          Awaiting tick data...
        </div>
      </CardSection>
    );
  }

  const latest = snaps[snaps.length - 1];
  const cumReward = snaps.reduce((s, x) => s + x.reward, 0);
  const avgReward = cumReward / snaps.length;

  return (
    <CardSection title="Utility" icon={<Gauge size={10} />}>
      <Prop label="Last Reward" value={latest.reward >= 0 ? `+${latest.reward.toFixed(2)}` : latest.reward.toFixed(2)} />
      <Prop label="Cumulative" value={cumReward.toFixed(2)} />
      <Prop label="Avg / tick" value={avgReward.toFixed(3)} />
      <Prop label="Q-Value" value={latest.qValue.toFixed(3)} />
      <div className="mt-1">
        <SparklineChart data={snaps.map((s) => s.reward)} width={200} height={28} color="var(--el-success)" />
      </div>
    </CardSection>
  );
}

/* ---------- Exploration section ---------- */

function AgentExplorationSection({ agent }: { agent: AgentDetail }) {
  const totalLocations = agent.visited_places.length;
  const topScores = agent.top_locations.slice(0, 5).map((tl) => tl.score);

  return (
    <CardSection title="Exploration" icon={<Route size={10} />}>
      <Prop label="Unique Places" value={String(totalLocations)} />
      <Prop label="Top-5 Rated" value={topScores.length > 0 ? topScores.map((s) => s.toFixed(1)).join(", ") : "—"} />
      {topScores.length >= 2 && (
        <div className="mt-1">
          <SparklineChart data={topScores} width={200} height={24} color="var(--el-warning)" />
        </div>
      )}
    </CardSection>
  );
}

/* ---------- Placeholder sections ---------- */

function AgentBeliefSection() {
  return (
    <CardSection title="Belief Confidence" icon={<Shield size={10} />} defaultOpen={false}>
      <div className="text-[10px] py-1" style={{ color: "var(--el-text-faint)" }}>
        Belief confidence tracking is pending server-side support.
      </div>
    </CardSection>
  );
}

function AgentReadinessSection() {
  return (
    <CardSection title="Readiness" icon={<Gauge size={10} />} defaultOpen={false}>
      <div className="text-[10px] py-1" style={{ color: "var(--el-text-faint)" }}>
        Readiness metrics are pending server-side support.
      </div>
    </CardSection>
  );
}

/* ---------- Main agent detail ---------- */

export default function AgentDetailView({
  agent,
  onAsk,
  askLoading,
  lastAnswer,
  onClose,
}: {
  agent: AgentDetail;
  onAsk: (q: string) => void;
  askLoading: boolean;
  lastAnswer: AgentAnswer | null;
  onClose: () => void;
}) {
  const [question, setQuestion] = useState("");
  const rawEnergy = agent.energy > 1 ? agent.energy / 100 : agent.energy;
  const energy = Math.round(rawEnergy * 100);

  function energyColor(e: number): string {
    if (e >= 70) return "var(--el-success)";
    if (e >= 40) return "var(--el-warning)";
    return "var(--el-danger)";
  }

  const handleAsk = () => {
    if (question.trim()) {
      onAsk(question.trim());
      setQuestion("");
    }
  };

  return (
    <>
      {/* Hero */}
      <div className="flex items-center gap-3 px-3 py-4">
        <div className="flex items-center justify-center shrink-0 rounded-full"
          style={{ width: 40, height: 40, background: "var(--el-accent-soft)", color: "var(--el-text-accent)" }}>
          <Bot size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold truncate" style={{ color: "var(--el-text)" }}>{agent.name}</div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="el-badge el-badge-accent">{agentActionLabel(agent.last_action)}</span>
            <span className="text-[10px]" style={{ color: "var(--el-text-faint)" }}>
              {agent.location_name || `Loc ${agent.location_id}`}
            </span>
          </div>
        </div>
        <button onClick={onClose} className="shrink-0 flex items-center justify-center rounded p-1 cursor-default hover:opacity-80"
          style={{ color: "var(--el-text-muted)" }} title="Close">
          <X size={14} />
        </button>
      </div>

      {/* Energy bar */}
      <div className="px-3 pb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-medium" style={{ color: "var(--el-text-muted)" }}>Energy</span>
          <span className="text-[10px] font-mono" style={{ color: energyColor(energy) }}>{energy}%</span>
        </div>
        <div className="el-energy-bar" style={{ height: 4 }}>
          <motion.div
            className="el-energy-bar-fill"
            animate={{ width: `${energy}%` }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
            style={{ height: "100%", background: energyColor(energy) }}
          />
        </div>
      </div>

      <ViewportActions agentId={agent.id} agentName={agent.name} />

      {/* Ask agent */}
      <div className="px-3 pb-3">
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs"
          style={{ background: "var(--el-bg-input)", border: "1px solid var(--el-border-card)" }}>
          <MessageCircle size={12} style={{ color: "var(--el-text-faint)" }} />
          <input type="text" placeholder="Ask this agent a question..."
            value={question} onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleAsk(); }}
            className="flex-1 bg-transparent outline-none text-xs"
            style={{ color: "var(--el-text)" }} disabled={askLoading} />
          <button onClick={handleAsk} disabled={askLoading || !question.trim()}
            className="flex items-center justify-center rounded p-0.5 transition-colors cursor-default disabled:opacity-40"
            style={{ color: "var(--el-text-accent)" }}>
            {askLoading ? <Loader size={12} className="animate-spin" /> : <Send size={12} />}
          </button>
        </div>
      </div>

      {lastAnswer && (
        <div className="mx-3 mb-2">
          <div className="el-card px-3 py-2.5">
            <div className="text-[10px] font-semibold mb-1" style={{ color: "var(--el-text-muted)" }}>
              Answer ({lastAnswer.answer_certainty}, {Math.round(lastAnswer.answer_confidence * 100)}% conf.)
            </div>
            <div className="text-xs leading-relaxed" style={{ color: "var(--el-text)" }}>{lastAnswer.answer}</div>
            {lastAnswer.supporting_facts.length > 0 && (
              <div className="mt-2 text-[10px]" style={{ color: "var(--el-text-faint)" }}>
                Based on {lastAnswer.supporting_facts.length} supporting fact(s)
              </div>
            )}
          </div>
        </div>
      )}

      <CardSection title="Status" icon={<BarChart3 size={10} />}>
        <Prop label="ID" value={agent.id} />
        <Prop label="Policy" value={agent.policy} />
        <Prop label="Last Action" value={agentActionLabel(agent.last_action)} />
        <Prop label="Last Reward" value={agent.last_reward >= 0 ? `+${agent.last_reward.toFixed(2)}` : agent.last_reward.toFixed(2)} />
        <Prop label="Knowledge Score" value={agent.knowledge_score.toFixed(1)} />
        <Prop label="Visited Places" value={String(agent.visited_locations)} />
      </CardSection>

      {agent.goal && (
        <CardSection title="Current Goal" icon={<Target size={10} />}>
          <Prop label="Kind" value={String(agent.goal.kind ?? "unknown")} />
          {agent.goal.target_location_name != null && <Prop label="Target" value={String(agent.goal.target_location_name as string)} />}
          {agent.goal.priority != null && <Prop label="Priority" value={String(agent.goal.priority)} />}
        </CardSection>
      )}

      {agent.top_locations.length > 0 && (
        <CardSection title="Top Locations" icon={<Navigation size={10} />} defaultOpen={false}>
          {agent.top_locations.slice(0, 5).map((tl) => (
            <Prop key={tl.location_id} label={tl.location_name ?? `Loc ${tl.location_id}`}
              value={`${tl.score.toFixed(1)} (${tl.visits} visits)`} />
          ))}
        </CardSection>
      )}

      <CardSection title="Knowledge" icon={<Brain size={10} />} defaultOpen={false}>
        <Prop label="Known Conditions" value={String(Object.keys(agent.known_conditions).length)} />
        <Prop label="Visited Places" value={String(agent.visited_places.length)} />
      </CardSection>

      <AgentUtilitySection agentId={agent.id} />
      <AgentExplorationSection agent={agent} />
      <AgentBeliefSection />
      <AgentReadinessSection />
    </>
  );
}
