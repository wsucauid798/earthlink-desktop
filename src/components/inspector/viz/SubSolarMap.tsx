/**
 * SubSolarMap — equirectangular world projection showing Sun's sub-solar point.
 */

import { motion, useSpring } from "framer-motion";

export default function SubSolarMap({ subSolarLat, subSolarLng }: { subSolarLat: number; subSolarLng: number }) {
  const W = 260;
  const H = 92;
  const PX = 8;
  const PY = 8;
  const mapW = W - PX * 2;
  const mapH = H - PY * 2;
  const targetX = PX + ((subSolarLng + 180) / 360) * mapW;
  const targetY = PY + ((90 - subSolarLat) / 180) * mapH;

  const springX = useSpring(targetX, { stiffness: 80, damping: 18 });
  const springY = useSpring(targetY, { stiffness: 80, damping: 18 });

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="block" style={{ marginTop: 4 }}>
      <rect
        x={PX} y={PY} width={mapW} height={mapH}
        rx={6} fill="var(--el-bg-panel)"
        stroke="var(--el-border-subtle)" strokeWidth={1}
      />
      {[0.25, 0.5, 0.75].map((t) => (
        <line key={`lon-${t}`}
          x1={PX + mapW * t} y1={PY} x2={PX + mapW * t} y2={PY + mapH}
          stroke="var(--el-border-subtle)" strokeWidth={0.5} strokeDasharray="3,3"
        />
      ))}
      {[0.25, 0.5, 0.75].map((t) => (
        <line key={`lat-${t}`}
          x1={PX} y1={PY + mapH * t} x2={PX + mapW} y2={PY + mapH * t}
          stroke="var(--el-border-subtle)" strokeWidth={0.5} strokeDasharray="3,3"
        />
      ))}
      <line x1={PX} y1={PY + mapH / 2} x2={PX + mapW} y2={PY + mapH / 2}
        stroke="var(--el-text-faint)" strokeWidth={0.7} opacity={0.65} />
      <line x1={PX + mapW / 2} y1={PY} x2={PX + mapW / 2} y2={PY + mapH}
        stroke="var(--el-text-faint)" strokeWidth={0.7} opacity={0.65} />
      {/* Animated sub-solar point */}
      <motion.circle r={5} fill="var(--el-warning)" opacity={0.18}
        style={{ cx: springX, cy: springY }} />
      <motion.circle r={2.5} fill="var(--el-warning)"
        style={{ cx: springX, cy: springY }} />
      <text x={PX + 2} y={PY + 9} fontSize={8} fill="var(--el-text-faint)">90°N</text>
      <text x={PX + 2} y={PY + mapH / 2 - 2} fontSize={8} fill="var(--el-text-faint)">0°</text>
      <text x={PX + 2} y={PY + mapH - 2} fontSize={8} fill="var(--el-text-faint)">90°S</text>
      <text x={PX} y={H - 2} fontSize={8} fill="var(--el-text-faint)">180°W</text>
      <text x={PX + mapW / 2} y={H - 2} fontSize={8} fill="var(--el-text-faint)" textAnchor="middle">0°</text>
      <text x={PX + mapW} y={H - 2} fontSize={8} fill="var(--el-text-faint)" textAnchor="end">180°E</text>
    </svg>
  );
}
