/**
 * ThermometerGauge — vertical thermometer with framer-motion animated fill.
 */

import { useEffect } from "react";
import { motion, useSpring, useTransform } from "framer-motion";

export default function ThermometerGauge({ temp, min = -30, max = 45 }: { temp: number; min?: number; max?: number }) {
  const W = 28, H = 72;
  const BULB_R = 7, TUBE_W = 6;
  const tubeTop = 6, tubeBot = H - BULB_R - 4;
  const tubeH = tubeBot - tubeTop;
  const pct = Math.min(1, Math.max(0, (temp - min) / (max - min)));
  const fillTop = tubeBot - tubeH * pct;
  const col = temp <= 0 ? "var(--el-info)" : temp <= 15 ? "var(--el-success)" : temp <= 30 ? "var(--el-warning)" : "var(--el-danger)";

  const springY = useSpring(fillTop, { stiffness: 60, damping: 15 });
  const springH = useSpring(tubeBot - fillTop, { stiffness: 60, damping: 15 });
  const springTemp = useSpring(temp, { stiffness: 100, damping: 20 });

  useEffect(() => { springY.set(fillTop); }, [fillTop, springY]);
  useEffect(() => { springH.set(tubeBot - fillTop); }, [fillTop, tubeBot, springH]);
  useEffect(() => { springTemp.set(temp); }, [temp, springTemp]);
  const displayTemp = useTransform(springTemp, (v) => `${v.toFixed(1)}\u00B0C`);

  return (
    <div className="flex flex-col items-center gap-0.5">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {/* Tube background */}
        <rect x={(W - TUBE_W) / 2} y={tubeTop} width={TUBE_W} height={tubeH}
          rx={TUBE_W / 2} fill="var(--el-border-subtle)" />
        {/* Tube fill */}
        <motion.rect x={(W - TUBE_W) / 2} width={TUBE_W}
          rx={TUBE_W / 2} fill={col}
          style={{ y: springY, height: springH }} />
        {/* Bulb */}
        <circle cx={W / 2} cy={H - BULB_R - 2} r={BULB_R} fill={col} opacity={0.8} />
        <circle cx={W / 2} cy={H - BULB_R - 2} r={BULB_R - 2} fill={col} />
        {/* Ticks */}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const y = tubeBot - tubeH * t;
          return <line key={t} x1={W / 2 + TUBE_W / 2 + 1} y1={y} x2={W / 2 + TUBE_W / 2 + 3} y2={y}
            stroke="var(--el-text-faint)" strokeWidth={0.5} />;
        })}
      </svg>
      <motion.div className="text-[10px] font-bold tabular-nums text-center" style={{ color: col }}>
        {displayTemp}
      </motion.div>
    </div>
  );
}
