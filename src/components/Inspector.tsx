/**
 * Inspector — right sidebar panel.
 *
 * Card-based detail view of the selected entity. Driven by the
 * selection store — fetches location/agent detail from the server.
 */

import { useState } from "react";
import {
  MapPin,
  Bot,
  ChevronDown,
  ChevronRight,
  Navigation,
  Thermometer,
  Wind,
  Cloud,
  Brain,
  Eye,
  MessageCircle,
  BarChart3,
  Compass,
  Mountain,
  Target,
  Send,
  Loader,
  ListChecks,
  FileText,
  Gauge,
  Shield,
  Route,
} from "lucide-react";
import { useSelectionStore } from "../store/selectionStore";
import { useConnectionStore } from "../store/connectionStore";
import { useViewportStore } from "../store/viewportStore";
import { useAgentHistoryStore } from "../store/agentHistoryStore";
import Sparkline from "./Sparkline";
import type { AgentDetail, Location, Weather, AgentAnswer } from "../api/types";

/* ---------- Collapsible card section ---------- */

function CardSection({
  title,
  icon,
  defaultOpen = true,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="el-card mx-3 mb-2 overflow-hidden">
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-2 w-full px-3 py-2 text-[10px] font-semibold uppercase tracking-wider cursor-default"
        style={{ color: "var(--el-text-muted)" }}
      >
        {open ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
        {icon}
        {title}
      </button>
      {open && (
        <div
          className="px-3 pb-3"
          style={{ borderTop: "1px solid var(--el-border-subtle)" }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

/* ---------- Property row ---------- */

function Prop({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string | React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="flex items-center gap-1.5 text-xs" style={{ color: "var(--el-text-muted)" }}>
        {icon}
        {label}
      </span>
      <span className="text-xs font-medium text-right" style={{ color: "var(--el-text)" }}>
        {value}
      </span>
    </div>
  );
}

/* ---------- Empty state ---------- */

function EmptyState() {
  const connected = useConnectionStore((s) => s.connected);

  return (
    <div className="px-3 py-4">
      <span className="text-[11px]" style={{ color: "var(--el-text-faint)" }}>
        {connected
          ? "Select a location or agent on the map."
          : "Awaiting connection"
        }
      </span>
    </div>
  );
}

/* ---------- Loading state ---------- */

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      <Loader size={20} className="animate-spin" style={{ color: "var(--el-text-faint)" }} />
      <div className="text-[10px]" style={{ color: "var(--el-text-faint)" }}>Loading detail...</div>
    </div>
  );
}

/* ---------- Location detail ---------- */

function LocationDetail({ loc, weather }: { loc: Location; weather: Weather | null }) {
  return (
    <>
      {/* Hero */}
      <div className="flex items-center gap-3 px-3 py-4">
        <div
          className="flex items-center justify-center shrink-0 rounded-lg"
          style={{
            width: 40,
            height: 40,
            background: "var(--el-accent-soft)",
            color: "var(--el-text-accent)",
          }}
        >
          <MapPin size={20} />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold truncate" style={{ color: "var(--el-text)" }}>
            {loc.name}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`el-badge ${loc.type === "capital" ? "el-badge-warning" : "el-badge-accent"}`}>
              {loc.type}
            </span>
            {loc.population != null && loc.population > 0 && (
              <span className="text-[10px]" style={{ color: "var(--el-text-faint)" }}>
                {loc.population.toLocaleString()} pop.
              </span>
            )}
          </div>
        </div>
      </div>

      <CardSection title="Geography" icon={<Compass size={10} />}>
        <Prop icon={<Navigation size={11} />} label="Coordinates" value={`${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`} />
        {loc.elevation != null && (
          <Prop icon={<Mountain size={11} />} label="Elevation" value={`${loc.elevation}m`} />
        )}
        {loc.terrain && <Prop label="Terrain" value={loc.terrain} />}
        {loc.admin_level_3 && <Prop label="Region" value={loc.admin_level_3} />}
        {loc.admin_level_2 && <Prop label="Country" value={loc.admin_level_2} />}
      </CardSection>

      {weather && (
        <CardSection title="Weather" icon={<Cloud size={10} />}>
          {weather.temperature_c != null && (
            <Prop icon={<Thermometer size={11} />} label="Temperature" value={`${weather.temperature_c} C`} />
          )}
          {weather.wind_speed_kmh != null && (
            <Prop icon={<Wind size={11} />} label="Wind" value={`${weather.wind_speed_kmh} km/h`} />
          )}
          {weather.humidity_pct != null && (
            <Prop label="Humidity" value={`${weather.humidity_pct}%`} />
          )}
          {weather.conditions && (
            <Prop icon={<Cloud size={11} />} label="Conditions" value={weather.conditions} />
          )}
        </CardSection>
      )}
    </>
  );
}

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
          className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium cursor-default transition-colors"
          style={{
            background: "var(--el-bg-input)",
            border: "1px solid var(--el-border-card)",
            color: "var(--el-text-muted)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--el-accent)";
            e.currentTarget.style.color = "var(--el-text-accent)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--el-border-card)";
            e.currentTarget.style.color = "var(--el-text-muted)";
          }}
        >
          {a.icon}
          {a.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- Agent detail ---------- */

function AgentDetailView({
  agent,
  onAsk,
  askLoading,
  lastAnswer,
}: {
  agent: AgentDetail;
  onAsk: (q: string) => void;
  askLoading: boolean;
  lastAnswer: AgentAnswer | null;
}) {
  const [question, setQuestion] = useState("");
  const energy = Math.round(agent.energy * 100);

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
        <div
          className="flex items-center justify-center shrink-0 rounded-full"
          style={{
            width: 40,
            height: 40,
            background: "var(--el-accent-soft)",
            color: "var(--el-text-accent)",
          }}
        >
          <Bot size={20} />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold truncate" style={{ color: "var(--el-text)" }}>
            {agent.name}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="el-badge el-badge-accent">{agent.last_action}</span>
            <span className="text-[10px]" style={{ color: "var(--el-text-faint)" }}>
              {agent.location_name || `Loc ${agent.location_id}`}
            </span>
          </div>
        </div>
      </div>

      {/* Energy bar */}
      <div className="px-3 pb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-medium" style={{ color: "var(--el-text-muted)" }}>Energy</span>
          <span className="text-[10px] font-mono" style={{ color: energyColor(energy) }}>{energy}%</span>
        </div>
        <div className="el-energy-bar" style={{ height: 4 }}>
          <div
            className="el-energy-bar-fill"
            style={{ width: `${energy}%`, background: energyColor(energy) }}
          />
        </div>
      </div>

      {/* Quick actions — open views in the center viewport */}
      <ViewportActions agentId={agent.id} agentName={agent.name} />

      {/* Ask agent input */}
      <div className="px-3 pb-3">
        <div
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs"
          style={{
            background: "var(--el-bg-input)",
            border: "1px solid var(--el-border-card)",
          }}
        >
          <MessageCircle size={12} style={{ color: "var(--el-text-faint)" }} />
          <input
            type="text"
            placeholder="Ask this agent a question..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleAsk(); }}
            className="flex-1 bg-transparent outline-none text-xs"
            style={{ color: "var(--el-text)" }}
            disabled={askLoading}
          />
          <button
            onClick={handleAsk}
            disabled={askLoading || !question.trim()}
            className="flex items-center justify-center rounded p-0.5 transition-colors cursor-default disabled:opacity-40"
            style={{ color: "var(--el-text-accent)" }}
          >
            {askLoading ? <Loader size={12} className="animate-spin" /> : <Send size={12} />}
          </button>
        </div>
      </div>

      {/* Agent answer */}
      {lastAnswer && (
        <div className="mx-3 mb-2">
          <div className="el-card px-3 py-2.5">
            <div className="text-[10px] font-semibold mb-1" style={{ color: "var(--el-text-muted)" }}>
              Answer ({lastAnswer.answer_certainty}, {Math.round(lastAnswer.answer_confidence * 100)}% conf.)
            </div>
            <div className="text-xs leading-relaxed" style={{ color: "var(--el-text)" }}>
              {lastAnswer.answer}
            </div>
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
        <Prop label="Last Action" value={agent.last_action} />
        <Prop label="Last Reward" value={agent.last_reward >= 0 ? `+${agent.last_reward.toFixed(2)}` : agent.last_reward.toFixed(2)} />
        <Prop label="Knowledge Score" value={agent.knowledge_score.toFixed(1)} />
        <Prop label="Visited Places" value={String(agent.visited_locations)} />
      </CardSection>

      {agent.goal && (
        <CardSection title="Current Goal" icon={<Target size={10} />}>
          <Prop label="Kind" value={String(agent.goal.kind ?? "unknown")} />
          {agent.goal.target_location_name != null && (
            <Prop label="Target" value={String(agent.goal.target_location_name as string)} />
          )}
          {agent.goal.priority != null && (
            <Prop label="Priority" value={String(agent.goal.priority)} />
          )}
        </CardSection>
      )}

      {agent.top_locations.length > 0 && (
        <CardSection title="Top Locations" icon={<Navigation size={10} />} defaultOpen={false}>
          {agent.top_locations.slice(0, 5).map((tl) => (
            <Prop
              key={tl.location_id}
              label={tl.location_name ?? `Loc ${tl.location_id}`}
              value={`${tl.score.toFixed(1)} (${tl.visits} visits)`}
            />
          ))}
        </CardSection>
      )}

      <CardSection title="Knowledge" icon={<Brain size={10} />} defaultOpen={false}>
        <Prop label="Known Conditions" value={String(Object.keys(agent.known_conditions).length)} />
        <Prop label="Visited Places" value={String(agent.visited_places.length)} />
      </CardSection>

      {/* ----- New research sections ----- */}
      <AgentUtilitySection agentId={agent.id} />
      <AgentExplorationSection agent={agent} />
      <AgentBeliefSection />
      <AgentReadinessSection />
    </>
  );
}

/* ---------- Utility section (real-time from history) ---------- */

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
        <Sparkline data={snaps.map((s) => s.reward)} width={200} height={28} color="var(--el-success)" />
      </div>
    </CardSection>
  );
}

/* ---------- Exploration progress ---------- */

function AgentExplorationSection({ agent }: { agent: AgentDetail }) {
  const totalLocations = agent.visited_places.length;
  // Exploration breadth (unique places) — we don't know total world locations from agent detail
  // but we can show raw count and the exploration pattern
  const topScores = agent.top_locations.slice(0, 5).map((tl) => tl.score);

  return (
    <CardSection title="Exploration" icon={<Route size={10} />}>
      <Prop label="Unique Places" value={String(totalLocations)} />
      <Prop label="Top-5 Rated" value={topScores.length > 0 ? topScores.map((s) => s.toFixed(1)).join(", ") : "—"} />
      {topScores.length >= 2 && (
        <div className="mt-1">
          <Sparkline data={topScores} width={200} height={24} color="var(--el-warning)" />
        </div>
      )}
    </CardSection>
  );
}

/* ---------- Belief confidence (placeholder) ---------- */

function AgentBeliefSection() {
  return (
    <CardSection title="Belief Confidence" icon={<Shield size={10} />} defaultOpen={false}>
      <div className="text-[10px] py-1" style={{ color: "var(--el-text-faint)" }}>
        Belief confidence tracking is pending server-side support. This section will show per-location belief strength, confidence intervals, and staleness indicators.
      </div>
    </CardSection>
  );
}

/* ---------- Readiness metrics (placeholder) ---------- */

function AgentReadinessSection() {
  return (
    <CardSection title="Readiness" icon={<Gauge size={10} />} defaultOpen={false}>
      <div className="text-[10px] py-1" style={{ color: "var(--el-text-faint)" }}>
        Readiness metrics are pending server-side support. This section will show archetype classification, task readiness score, and resource sufficiency indicators.
      </div>
    </CardSection>
  );
}

/* ---------- Main Inspector ---------- */

export default function Inspector() {
  const { kind, locationDetail, locationWeather, agentDetail, askLoading, lastAnswer, askAgent } =
    useSelectionStore();

  return (
    <div className="el-panel el-no-select">
      <div className="el-panel-header">
        <Eye size={12} />
        Inspector
      </div>

      <div className="flex-1 overflow-y-auto">
        {kind === null && <EmptyState />}

        {kind === "location" && !locationDetail && <LoadingState />}
        {kind === "location" && locationDetail && (
          <LocationDetail loc={locationDetail} weather={locationWeather} />
        )}

        {kind === "agent" && !agentDetail && <LoadingState />}
        {kind === "agent" && agentDetail && (
          <AgentDetailView
            agent={agentDetail}
            onAsk={askAgent}
            askLoading={askLoading}
            lastAnswer={lastAnswer}
          />
        )}
      </div>
    </div>
  );
}
