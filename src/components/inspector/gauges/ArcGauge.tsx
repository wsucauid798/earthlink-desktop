/**
 * ArcGauge — arc sweep gauge with CSS transition animation.
 */

export default function ArcGauge({ cx, cy, r, value, max, color, label, unit }: {
  cx: number; cy: number; r: number;
  value: number; max: number; color: string;
  label: string; unit: string;
}) {
  const SWEEP = 240;
  const START = 210;

  const arcPoints = (sweep: number) => {
    const pts: string[] = [];
    const steps = Math.max(2, Math.round(40 * (sweep / SWEEP)));
    for (let i = 0; i <= steps; i++) {
      const deg = START - (i / steps) * sweep;
      const rad = (deg * Math.PI) / 180;
      pts.push(`${(cx + r * Math.cos(rad)).toFixed(1)},${(cy - r * Math.sin(rad)).toFixed(1)}`);
    }
    return pts.join(" ");
  };

  const pct = Math.min(1, Math.max(0, value / max));
  const displayText = value < 10 ? value.toFixed(2) : value < 100 ? value.toFixed(1) : String(Math.round(value));

  return (
    <g>
      <polyline points={arcPoints(SWEEP)} fill="none"
        stroke="var(--el-border-subtle)" strokeWidth={3} strokeLinecap="round" />
      <polyline points={arcPoints(SWEEP * pct)} fill="none"
        stroke={color} strokeWidth={3} strokeLinecap="round"
        style={{ transition: "all 0.6s cubic-bezier(0.4, 0, 0.2, 1)" }} />
      <text x={cx} y={cy + 1} fontSize={10} fill="var(--el-text)"
        textAnchor="middle" fontWeight="600">
        {displayText}
      </text>
      <text x={cx} y={cy + 10} fontSize={7} fill="var(--el-text-muted)" textAnchor="middle">
        {unit}
      </text>
      <text x={cx} y={cy + 22} fontSize={8} fill="var(--el-text-muted)" textAnchor="middle">
        {label}
      </text>
    </g>
  );
}
