/**
 * AgentsAtLocation — shows agents present at a location.
 */

import { Bot, Users } from "lucide-react";
import { motion } from "framer-motion";
import { useWorldStore } from "../../../store/worldStore";
import { agentActionLabel } from "../../../lib/agentAction";
import { CardSection } from "../CardSection";

export default function AgentsAtLocation({ locationId }: { locationId: number }) {
  const agents = useWorldStore((s) => s.agents);
  const here = agents.filter((a) => a.location_id === locationId);

  return (
    <CardSection title="Activity" icon={<Users size={10} />} defaultOpen={here.length > 0}>
      {here.length === 0 ? (
        <div className="text-[10px] py-1" style={{ color: "var(--el-text-faint)" }}>
          No agents at this location. Activity will appear here as agents arrive.
        </div>
      ) : (
        <>
          <div className="text-[10px] mb-2" style={{ color: "var(--el-text-muted)" }}>
            {here.length} agent{here.length !== 1 ? "s" : ""} here
          </div>
          {here.slice(0, 6).map((a) => {
            const rawE = a.energy > 1 ? a.energy / 100 : a.energy;
            const e = Math.round(rawE * 100);
            return (
              <div key={a.id} className="flex items-center gap-2 py-1">
                <Bot size={10} style={{ color: "var(--el-text-faint)" }} />
                <span className="text-[11px] truncate flex-1" style={{ color: "var(--el-text)" }}>
                  {a.name}
                </span>
                <span className="text-[9px]" style={{ color: "var(--el-text-faint)" }}>
                  {agentActionLabel(a.last_action)}
                </span>
                <div className="el-energy-bar shrink-0" style={{ width: 32, height: 3 }}>
                  <motion.div
                    className="el-energy-bar-fill"
                    animate={{ width: `${e}%` }}
                    transition={{ type: "spring", stiffness: 100, damping: 20 }}
                    style={{
                      height: "100%",
                      background: e >= 70 ? "var(--el-success)" : e >= 40 ? "var(--el-warning)" : "var(--el-danger)",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </>
      )}
    </CardSection>
  );
}
