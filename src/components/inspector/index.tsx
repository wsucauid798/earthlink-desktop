/**
 * Inspector — right sidebar panel.
 *
 * Card-based detail view of the selected entity. Driven by the
 * selection store — fetches location/agent detail from the server.
 *
 * Uses framer-motion for smooth animations and recharts for charts.
 */

import { Eye, Loader } from "lucide-react";
import { useSelectionStore } from "../../store/selectionStore";
import { useConnectionStore } from "../../store/connectionStore";
import EarthDashboard from "./views/EarthDashboard";
import LocationDetail from "./views/LocationDetail";
import AgentDetailView from "./views/AgentDetailView";

function EmptyState() {
  const connected = useConnectionStore((s) => s.connected);
  if (!connected) return null;
  return <EarthDashboard />;
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      <Loader size={20} className="animate-spin" style={{ color: "var(--el-text-faint)" }} />
      <div className="text-[10px]" style={{ color: "var(--el-text-faint)" }}>Loading detail...</div>
    </div>
  );
}

export default function Inspector() {
  const {
    kind, locationDetail, locationWeather, locationWind, locationNearby,
    locationAstronomy, locationGeophysics, locationAtmosphere,
    agentDetail, askLoading, lastAnswer, askAgent, clearSelection, selectLocation,
  } = useSelectionStore();

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
          <LocationDetail
            loc={locationDetail} weather={locationWeather} wind={locationWind}
            astronomy={locationAstronomy} geophysics={locationGeophysics}
            atmosphere={locationAtmosphere} nearby={locationNearby}
            onSelectLocation={selectLocation} onClose={clearSelection}
          />
        )}

        {kind === "agent" && !agentDetail && <LoadingState />}
        {kind === "agent" && agentDetail && (
          <AgentDetailView
            agent={agentDetail} onAsk={askAgent}
            askLoading={askLoading} lastAnswer={lastAnswer}
            onClose={clearSelection}
          />
        )}
      </div>
    </div>
  );
}
