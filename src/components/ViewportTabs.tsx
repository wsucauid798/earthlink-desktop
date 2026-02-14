/**
 * ViewportTabs — tab bar for the center viewport area.
 *
 * Map is the permanent first tab. Other views (Analytics, Decisions,
 * Traces) open as closable tabs alongside it. Like Cursor's editor tabs.
 */

import { X, Map as MapIcon, BarChart3, ListChecks, FileText } from "lucide-react";
import { useViewportStore, type ViewportTabKind } from "../store/viewportStore";

function tabIcon(kind: ViewportTabKind) {
  switch (kind) {
    case "map": return <MapIcon size={12} />;
    case "analytics": return <BarChart3 size={12} />;
    case "decisions": return <ListChecks size={12} />;
    case "traces": return <FileText size={12} />;
  }
}

export default function ViewportTabs() {
  const { tabs, activeTabId, setActiveTab, closeTab } = useViewportStore();

  // Only show the tab bar if there's more than just the map
  if (tabs.length <= 1) return null;

  return (
    <div
      className="flex items-center shrink-0 gap-0 overflow-x-auto el-no-select"
      style={{
        background: "var(--el-bg-panel)",
        borderBottom: "1px solid var(--el-border)",
      }}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            className="flex items-center gap-1.5 shrink-0 cursor-default"
            style={{
              padding: "6px 10px",
              borderRight: "1px solid var(--el-border-subtle)",
              background: isActive ? "var(--el-bg-panel)" : "var(--el-bg-panel-alt)",
              borderBottom: isActive ? "2px solid var(--el-accent)" : "2px solid transparent",
            }}
            onClick={() => setActiveTab(tab.id)}
          >
            <span style={{ color: isActive ? "var(--el-text-accent)" : "var(--el-text-faint)" }}>
              {tabIcon(tab.kind)}
            </span>
            <span
              className="text-[11px] font-medium max-w-[160px] truncate"
              style={{ color: isActive ? "var(--el-text)" : "var(--el-text-muted)" }}
            >
              {tab.label}
            </span>
            {tab.closable && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
                className="flex items-center justify-center rounded p-0.5 cursor-default transition-colors"
                style={{ color: "var(--el-text-faint)" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "var(--el-text)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "var(--el-text-faint)"; }}
              >
                <X size={10} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
