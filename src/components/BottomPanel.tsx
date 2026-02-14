/**
 * BottomPanel — tabbed panel at the bottom of the window.
 *
 * Tabs: Console, Events, Agent Log, World State
 * Wired to the log store for live streaming data.
 */

import { useState } from "react";
import {
  Terminal,
  Activity,
  Bot,
  Globe,
  ArrowRight,
  Clock,
  Zap,
  AlertCircle,
  CheckCircle,
  Info,
  AlertTriangle,
} from "lucide-react";
import { useLogStore, type LogLevel } from "../store/logStore";
import { useWorldStore } from "../store/worldStore";

const ICON_SIZE = 12;

interface TabDef {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const TABS: TabDef[] = [
  { id: "console", label: "Console", icon: <Terminal size={ICON_SIZE} /> },
  { id: "events", label: "Events", icon: <Activity size={ICON_SIZE} /> },
  { id: "agents", label: "Agent Log", icon: <Bot size={ICON_SIZE} /> },
  { id: "state", label: "World State", icon: <Globe size={ICON_SIZE} /> },
];

/* ---------- Console level icons ---------- */

function levelIcon(level: LogLevel) {
  switch (level) {
    case "success":
      return <CheckCircle size={ICON_SIZE} />;
    case "error":
      return <AlertCircle size={ICON_SIZE} />;
    case "warning":
      return <AlertTriangle size={ICON_SIZE} />;
    default:
      return <Info size={ICON_SIZE} />;
  }
}

function levelColor(level: LogLevel): string {
  switch (level) {
    case "success": return "var(--el-success)";
    case "error": return "var(--el-danger)";
    case "warning": return "var(--el-warning)";
    default: return "var(--el-info)";
  }
}

/* ---------- Console tab ---------- */

function ConsoleTab() {
  const entries = useLogStore((s) => s.consoleEntries);

  if (entries.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-[10px]" style={{ color: "var(--el-text-faint)" }}>
        Console output will appear here when you connect to the server.
      </div>
    );
  }

  return (
    <div>
      {entries.map((entry) => (
        <div
          key={entry.id}
          className="flex items-start gap-2.5 px-3 py-2"
          style={{ borderBottom: "1px solid var(--el-border-subtle)" }}
        >
          <span className="shrink-0 mt-0.5" style={{ color: levelColor(entry.level) }}>
            {levelIcon(entry.level)}
          </span>
          <div className="flex-1 min-w-0">
            <span className="text-[11px]" style={{ color: "var(--el-text)" }}>
              {entry.message}
            </span>
            {entry.detail && (
              <div className="text-[10px] mt-0.5" style={{ color: "var(--el-text-faint)" }}>
                {entry.detail}
              </div>
            )}
          </div>
          <span
            className="shrink-0 text-[10px] font-mono tabular-nums"
            style={{ color: "var(--el-text-faint)" }}
          >
            {entry.time}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ---------- Events tab ---------- */

function EventsTab() {
  const entries = useLogStore((s) => s.tickEntries);

  if (entries.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-[10px]" style={{ color: "var(--el-text-faint)" }}>
        Tick events will stream here when the world is running.
      </div>
    );
  }

  return (
    <div>
      {entries.map((entry) => (
        <div
          key={entry.id}
          className="flex items-start gap-2.5 px-3 py-2"
          style={{ borderBottom: "1px solid var(--el-border-subtle)" }}
        >
          <span className="shrink-0 mt-0.5" style={{ color: "var(--el-text-accent)" }}>
            <Clock size={ICON_SIZE} />
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium" style={{ color: "var(--el-text)" }}>
                Tick {entry.tick.toLocaleString()}
              </span>
              {entry.weatherUpdated && (
                <span className="el-badge el-badge-info">weather</span>
              )}
            </div>
            <div className="text-[10px] mt-0.5" style={{ color: "var(--el-text-faint)" }}>
              {entry.time}, {entry.season}, {entry.agentEventCount} agent event{entry.agentEventCount !== 1 ? "s" : ""}
            </div>
          </div>
          <span
            className="shrink-0 text-[10px] font-mono tabular-nums"
            style={{ color: "var(--el-text-faint)" }}
          >
            {entry.time}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ---------- Agent log tab ---------- */

function AgentLogTab() {
  const entries = useLogStore((s) => s.agentEntries);

  if (entries.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-[10px]" style={{ color: "var(--el-text-faint)" }}>
        Agent movement and action events will appear here.
      </div>
    );
  }

  return (
    <div>
      {entries.map((entry) => {
        const moved = entry.fromLocationId !== entry.toLocationId;
        return (
          <div
            key={entry.id}
            className="flex items-start gap-2.5 px-3 py-2"
            style={{ borderBottom: "1px solid var(--el-border-subtle)" }}
          >
            <span className="shrink-0 mt-0.5" style={{ color: moved ? "var(--el-info)" : "var(--el-text-faint)" }}>
              <ArrowRight size={ICON_SIZE} />
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[11px]" style={{ color: "var(--el-text)" }}>
                  <span className="font-medium">{entry.agentId}</span>
                  {moved
                    ? ` moved from loc ${entry.fromLocationId} to ${entry.toLocationId}`
                    : ` stayed at loc ${entry.toLocationId}`}
                </span>
                <span className="el-badge el-badge-muted">{entry.action}</span>
              </div>
              <div className="text-[10px] mt-0.5" style={{ color: "var(--el-text-faint)" }}>
                Reward: {entry.reward >= 0 ? "+" : ""}{entry.reward.toFixed(2)}, Knowledge: {entry.knowledgeScore.toFixed(1)}
              </div>
            </div>
            <span
              className="shrink-0 text-[10px] font-mono tabular-nums"
              style={{ color: "var(--el-text-faint)" }}
            >
              T{entry.tick}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- World state tab ---------- */

function WorldStateTab() {
  const {
    isRunning,
    locationCount,
    connectionCount,
    weatherStations,
    agentCount,
    tickCount,
    time,
  } = useWorldStore();

  const stats = [
    { label: "Status", value: isRunning ? "Running" : "Paused", icon: <Activity size={12} /> },
    { label: "Tick", value: tickCount.toLocaleString(), icon: <Activity size={12} /> },
    { label: "Time", value: time ? `${String(time.hour).padStart(2, "0")}:${String(time.minute).padStart(2, "0")} ${time.timezone_abbr}` : "--", icon: <Clock size={12} /> },
    { label: "Season", value: time?.season ?? "--", icon: <Globe size={12} /> },
    { label: "Locations", value: locationCount.toLocaleString(), icon: <Globe size={12} /> },
    { label: "Connections", value: connectionCount.toLocaleString(), icon: <Zap size={12} /> },
    { label: "Agents", value: String(agentCount), icon: <Bot size={12} /> },
    { label: "Weather Stations", value: String(weatherStations), icon: <Activity size={12} /> },
  ];

  return (
    <div className="p-3">
      <div className="grid grid-cols-2 gap-2">
        {stats.map((item) => (
          <div key={item.label} className="el-card flex items-center gap-2 px-3 py-2">
            <span style={{ color: "var(--el-text-faint)" }}>{item.icon}</span>
            <div>
              <div className="text-[10px]" style={{ color: "var(--el-text-faint)" }}>
                {item.label}
              </div>
              <div className="text-xs font-semibold" style={{ color: "var(--el-text)" }}>
                {item.value}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Main BottomPanel ---------- */

export default function BottomPanel() {
  const [activeTab, setActiveTab] = useState("console");

  return (
    <div
      className="el-no-select flex flex-col h-full overflow-hidden"
      style={{
        background: "var(--el-bg-panel)",
        borderTop: "1px solid var(--el-border)",
      }}
    >
      {/* Tab bar */}
      <div
        className="flex items-center shrink-0 gap-0.5 px-1"
        style={{ borderBottom: "1px solid var(--el-border)" }}
      >
        {TABS.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium transition-colors cursor-default rounded-t-md"
              style={{
                color: isActive ? "var(--el-text-accent)" : "var(--el-text-muted)",
                borderBottom: isActive ? "2px solid var(--el-accent)" : "2px solid transparent",
                background: isActive ? "var(--el-accent-soft)" : "transparent",
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "console" && <ConsoleTab />}
        {activeTab === "events" && <EventsTab />}
        {activeTab === "agents" && <AgentLogTab />}
        {activeTab === "state" && <WorldStateTab />}
      </div>
    </div>
  );
}
