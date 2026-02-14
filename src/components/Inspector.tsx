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
} from "lucide-react";
import { useSelectionStore } from "../store/selectionStore";
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
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 px-6">
      <div
        className="flex items-center justify-center rounded-full"
        style={{
          width: 48,
          height: 48,
          background: "var(--el-bg-badge)",
        }}
      >
        <Eye size={20} style={{ color: "var(--el-text-faint)" }} />
      </div>
      <div className="text-center">
        <div className="text-xs font-medium" style={{ color: "var(--el-text-muted)" }}>
          Nothing selected
        </div>
        <div className="text-[10px] mt-1" style={{ color: "var(--el-text-faint)" }}>
          Select a location or agent in the explorer or map to inspect it.
        </div>
      </div>
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
    </>
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
