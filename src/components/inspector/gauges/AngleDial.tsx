/**
 * AngleDial — half-circle dial for inclination/declination.
 * Uses CSS transitions for smooth needle animation.
 */

export default function AngleDial({ angle, label, range = 90, color }: {
  angle: number; label: string; range?: number; color: string;
}) {
  const S = 64, CX = S / 2, CY = S - 6;
  const R = 26;
  const clampedAngle = Math.max(-range, Math.min(range, angle));
  const needleRad = Math.PI - (clampedAngle + range) / (2 * range) * Math.PI;
  const nx = CX + R * Math.cos(needleRad);
  const ny = CY - R * Math.abs(Math.sin(needleRad));

  return (
    <div className="flex flex-col items-center gap-0.5">
      <svg width={S} height={S * 0.65} viewBox={`0 0 ${S} ${S * 0.65}`}>
        <path d={`M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`}
          fill="none" stroke="var(--el-border-subtle)" strokeWidth={3} strokeLinecap="round" />
        <line x1={CX} y1={CY - R - 2} x2={CX} y2={CY - R + 2}
          stroke="var(--el-text-faint)" strokeWidth={1} />
        <line x1={CX} y1={CY} x2={nx} y2={ny}
          stroke={color} strokeWidth={2} strokeLinecap="round"
          style={{ transition: "x2 0.8s cubic-bezier(0.4,0,0.2,1), y2 0.8s cubic-bezier(0.4,0,0.2,1)" }} />
        <circle cx={CX} cy={CY} r={3} fill={color} />
        <text x={CX - R - 2} y={CY + 8} fontSize={7} fill="var(--el-text-faint)" textAnchor="middle">-{range}</text>
        <text x={CX + R + 2} y={CY + 8} fontSize={7} fill="var(--el-text-faint)" textAnchor="middle">+{range}</text>
      </svg>
      <div className="text-[9px] text-center" style={{ color: "var(--el-text-muted)" }}>
        {label} <span className="font-bold tabular-nums" style={{ color }}>{angle.toFixed(1)}{"\u00B0"}</span>
      </div>
    </div>
  );
}
