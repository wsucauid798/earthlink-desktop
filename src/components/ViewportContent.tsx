/**
 * ViewportContent — renders the active viewport tab's content.
 *
 * Map is rendered when the "map" tab is active.
 * Other views (Analytics, Decisions, Traces) render their
 * respective components.
 */

import { useViewportStore } from "../store/viewportStore";
import MainViewport from "./MainViewport";
import AnalyticsView from "./AnalyticsView";
import DecisionsView from "./DecisionsView";
import TracesView from "./TracesView";

export default function ViewportContent() {
  const { tabs, activeTabId } = useViewportStore();
  const activeTab = tabs.find((t) => t.id === activeTabId);

  if (!activeTab || activeTab.kind === "map") {
    return <MainViewport />;
  }

  switch (activeTab.kind) {
    case "analytics":
      return <AnalyticsView agentId={activeTab.agentId} agentName={activeTab.agentName} />;
    case "decisions":
      return <DecisionsView agentId={activeTab.agentId} agentName={activeTab.agentName} />;
    case "traces":
      return <TracesView agentId={activeTab.agentId} agentName={activeTab.agentName} />;
    default:
      return <MainViewport />;
  }
}
