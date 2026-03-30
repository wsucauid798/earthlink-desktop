/**
 * SolarCurve — 24-hour solar elevation curve with framer-motion pulsing effects.
 */

import { motion } from "framer-motion";

export default function SolarCurve({ dayOfYear, hourFrac, elevation, isDaytime, lat = 53, idPrefix = "el-solar" }: {
  dayOfYear: number; hourFrac: number; elevation: number; isDaytime: boolean;
  lat?: number; idPrefix?: string;
}) {
  const W = 260, H = 82;
  const PX = 22, PY = 6, LABEL_H = 14;
  const pW = W - PX * 2;
  const pH = H - PY - LABEL_H;
  const horizonY = PY + pH * 0.55;

  const latRad = (lat * Math.PI) / 180;
  const dec = -23.44 * Math.cos((2 * Math.PI * (dayOfYear + 10)) / 365);
  const decRad = (dec * Math.PI) / 180;

  const points: [number, number][] = [];
  for (let h = 0; h <= 24; h += 0.25) {
    const ha = ((h - 12) * 15 * Math.PI) / 180;
    const el = (Math.asin(
      Math.sin(latRad) * Math.sin(decRad) +
      Math.cos(latRad) * Math.cos(decRad) * Math.cos(ha)
    ) * 180) / Math.PI;
    const x = PX + (h / 24) * pW;
    const y = horizonY - (el / 90) * (horizonY - PY);
    points.push([x, y]);
  }

  const cx = PX + (hourFrac / 24) * pW;
  const cy = horizonY - (elevation / 90) * (horizonY - PY);
  const polyPts = points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const fillD = points.map(([x, y], i) =>
    `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`
  ).join(" ") + ` L${PX + pW} ${horizonY} L${PX} ${horizonY} Z`;

  const dotColor = isDaytime ? "var(--el-warning)" : "var(--el-info)";

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="block" style={{ marginTop: 4 }}>
      <defs>
        <clipPath id={`${idPrefix}-clip`}>
          <rect x={PX} y={0} width={pW} height={horizonY} />
        </clipPath>
        <linearGradient id={`${idPrefix}-grad`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--el-warning)" stopOpacity="0.2" />
          <stop offset="100%" stopColor="var(--el-warning)" stopOpacity="0.04" />
        </linearGradient>
      </defs>
      <rect x={PX} y={horizonY} width={pW} height={PY + pH - horizonY}
        fill="var(--el-info)" opacity={0.05} />
      <path d={fillD} fill={`url(#${idPrefix}-grad)`} clipPath={`url(#${idPrefix}-clip)`} />
      <line x1={PX} y1={horizonY} x2={PX + pW} y2={horizonY}
        stroke="var(--el-text-faint)" strokeWidth={0.5} strokeDasharray="4,3" />
      {/* Glow polyline with pulsing */}
      <motion.polyline points={polyPts} fill="none"
        stroke="var(--el-warning)" strokeWidth={5} strokeLinejoin="round"
        animate={{ opacity: [0.08, 0.03, 0.08] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} />
      <polyline points={polyPts} fill="none"
        stroke="var(--el-warning)" strokeWidth={1.5} strokeLinejoin="round" />
      <line x1={cx} y1={PY} x2={cx} y2={PY + pH}
        stroke="var(--el-text-faint)" strokeWidth={0.5} opacity={0.4} />
      {/* Pulsing outer dot */}
      <motion.circle cx={cx} cy={cy} r={5} fill={dotColor}
        animate={{ opacity: [0.15, 0.05, 0.15] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }} />
      {/* Inner dot */}
      <circle cx={cx} cy={cy} r={2.5} fill={dotColor} />
      <text x={PX} y={H - 1} fontSize={8} fill="var(--el-text-muted)">0h</text>
      <text x={PX + pW * 0.25} y={H - 1} fontSize={8} fill="var(--el-text-muted)" textAnchor="middle">6h</text>
      <text x={PX + pW * 0.5} y={H - 1} fontSize={8} fill="var(--el-text-muted)" textAnchor="middle">12h</text>
      <text x={PX + pW * 0.75} y={H - 1} fontSize={8} fill="var(--el-text-muted)" textAnchor="middle">18h</text>
      <text x={PX + pW} y={H - 1} fontSize={8} fill="var(--el-text-muted)" textAnchor="end">24h</text>
      <text x={PX - 3} y={horizonY + 3} fontSize={8} fill="var(--el-text-muted)" textAnchor="end">0°</text>
    </svg>
  );
}
