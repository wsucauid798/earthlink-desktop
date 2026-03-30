/**
 * DeclinationTrack — solar declination slider with framer-motion animated indicator.
 */

import { motion, useSpring, useTransform } from "framer-motion";

export default function DeclinationTrack({ declination }: { declination: number }) {
  const W = 260;
  const H = 52;
  const PX = 18;
  const trackY = 18;
  const trackW = W - PX * 2;
  const targetX = PX + ((declination + 23.44) / 46.88) * trackW;

  const springX = useSpring(targetX, { stiffness: 80, damping: 18 });
  const springDec = useSpring(declination, { stiffness: 100, damping: 20 });
  const displayDec = useTransform(springDec, (v) =>
    `${v >= 0 ? "+" : ""}${v.toFixed(2)}\u00B0`
  );

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="block" style={{ marginTop: 4 }}>
      <line x1={PX} y1={trackY} x2={PX + trackW} y2={trackY}
        stroke="var(--el-border-subtle)" strokeWidth={3} strokeLinecap="round" />
      <line x1={PX + trackW / 2} y1={trackY - 7} x2={PX + trackW / 2} y2={trackY + 7}
        stroke="var(--el-text-faint)" strokeWidth={1} />
      <line x1={PX} y1={trackY - 5} x2={PX} y2={trackY + 5} stroke="var(--el-text-faint)" strokeWidth={1} />
      <line x1={PX + trackW} y1={trackY - 5} x2={PX + trackW} y2={trackY + 5} stroke="var(--el-text-faint)" strokeWidth={1} />
      {/* Animated indicator */}
      <motion.circle cy={trackY} r={5} fill="var(--el-warning)" opacity={0.18}
        style={{ cx: springX }} />
      <motion.circle cy={trackY} r={2.5} fill="var(--el-warning)"
        style={{ cx: springX }} />
      <text x={PX} y={H - 18} fontSize={8} fill="var(--el-text-muted)">Tropic S</text>
      <text x={PX + trackW / 2} y={H - 18} fontSize={8} fill="var(--el-text-muted)" textAnchor="middle">Equator</text>
      <text x={PX + trackW} y={H - 18} fontSize={8} fill="var(--el-text-muted)" textAnchor="end">Tropic N</text>
      <motion.text y={H - 4} fontSize={9} fill="var(--el-text)" textAnchor="middle" fontWeight="600"
        style={{ x: springX }}>
        {displayDec}
      </motion.text>
    </svg>
  );
}
