/**
 * BottomPanel — tabbed log panel.
 *
 * Console, Events, Agent Log. Dense monospace entries.
 * No World State tab (that info lives in the Explorer).
 */

import { useState } from "react";
import {
  Terminal,
  Activity,
  Bot,
  ArrowRight,
  Clock,
  AlertCircle,
  CheckCircle,
  Info,
  AlertTriangle,
} from "lucide-react";
import { useLogStore, type LogLevel } from "../store/logStore";

const ICON = 11;

interface TabDef { id: string; label: string; icon: React.ReactNode }

const TABS: TabDef[] = [
  { id: "console", label: "Console", icon: <Terminal size={ICON} /> },
  { id: "events", label: "Events", icon: <Activity size={ICON} /> },
  { id: "agents", label: "Agent Log", icon: <Bot size={ICON} /> },
];

function levelIcon(l: LogLevel) {
  switch (l) {
    case "success": return <CheckCircle size={ICON} />;
    case "error": return <AlertCircle size={ICON} />;
    case "warning": return <AlertTriangle size={ICON} />;
    default: return <Info size={ICON} />;
  }
}

function levelColor(l: LogLevel) {
  switch (l) {
    case "success": return "var(--el-success)";
    case "error": return "var(--el-danger)";
    case "warning": return "var(--el-warning)";
    default: return "var(--el-info)";
  }
}

function ConsoleTab() {
  const entries = useLogStore((s) => s.consoleEntries);
  if (entries.length === 0) {
    return <Empty text="Console output appears here." />;
  }
  return (
    <div className="font-mono">
      {entries.map((e) => (
        <div key={e.id} className="flex items-start gap-2 px-3 py-[3px]" style={{ borderBottom: "1px solid var(--el-border-subtle)" }}>
          <span className="shrink-0 mt-px" style={{ color: levelColor(e.level) }}>{levelIcon(e.level)}</span>
          <span className="text-[11px] flex-1 min-w-0 break-all" style={{ color: "var(--el-text)" }}>{e.message}</span>
          <span className="shrink-0 text-[10px] tabular-nums" style={{ color: "var(--el-text-faint)" }}>{e.time}</span>
        </div>
      ))}
    </div>
  );
}

function EventsTab() {
  const entries = useLogStore((s) => s.tickEntries);
  if (entries.length === 0) {
    return <Empty text="Tick events stream here when the world is running." />;
  }
  return (
    <div className="font-mono">
      {entries.map((e) => (
        <div key={e.id} className="flex items-center gap-2 px-3 py-[3px]" style={{ borderBottom: "1px solid var(--el-border-subtle)" }}>
          <Clock size={ICON} style={{ color: "var(--el-text-faint)" }} />
          <span className="text-[11px] font-medium" style={{ color: "var(--el-text-accent)" }}>T{e.tick}</span>
          <span className="text-[11px]" style={{ color: "var(--el-text-muted)" }}>{e.time}</span>
          <span className="text-[11px]" style={{ color: "var(--el-text-faint)" }}>{e.agentEventCount} agents</span>
          {e.weatherUpdated && <span className="text-[10px] font-medium" style={{ color: "var(--el-info)" }}>weather</span>}
          <span className="ml-auto text-[11px]" style={{ color: "var(--el-text-faint)" }}>{e.season}</span>
        </div>
      ))}
    </div>
  );
}

function AgentLogTab() {
  const entries = useLogStore((s) => s.agentEntries);
  if (entries.length === 0) {
    return <Empty text="Agent events appear here." />;
  }
  return (
    <div className="font-mono">
      {entries.map((e) => {
        const moved = e.fromLocationId !== e.toLocationId;
        return (
          <div key={e.id} className="flex items-center gap-2 px-3 py-[3px]" style={{ borderBottom: "1px solid var(--el-border-subtle)" }}>
            <ArrowRight size={ICON} style={{ color: moved ? "var(--el-info)" : "var(--el-text-faint)" }} />
            <span className="text-[11px] font-medium" style={{ color: "var(--el-text)" }}>{e.agentId}</span>
            <span className="text-[10px]" style={{ color: "var(--el-text-muted)" }}>{e.action}</span>
            {moved && (
              <span className="text-[10px]" style={{ color: "var(--el-text-faint)" }}>
                {e.fromLocationId} → {e.toLocationId}
              </span>
            )}
            <span className="ml-auto text-[10px] tabular-nums" style={{ color: e.reward >= 0 ? "var(--el-success)" : "var(--el-danger)" }}>
              {e.reward >= 0 ? "+" : ""}{e.reward.toFixed(2)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center py-6 text-[10px]" style={{ color: "var(--el-text-faint)" }}>
      {text}
    </div>
  );
}

export default function BottomPanel() {
  const [tab, setTab] = useState("console");

  return (
    <div
      className="el-no-select flex flex-col h-full overflow-hidden"
      style={{ background: "var(--el-bg-panel)", borderTop: "1px solid var(--el-border)" }}
    >
      <div className="flex items-center shrink-0 gap-0.5 px-1" style={{ borderBottom: "1px solid var(--el-border)" }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium cursor-default"
            style={{
              color: t.id === tab ? "var(--el-text-accent)" : "var(--el-text-muted)",
              borderBottom: t.id === tab ? "2px solid var(--el-accent)" : "2px solid transparent",
            }}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto">
        {tab === "console" && <ConsoleTab />}
        {tab === "events" && <EventsTab />}
        {tab === "agents" && <AgentLogTab />}
      </div>
    </div>
  );
}
