/**
 * MoonDisc — moon illumination disc with phase emoji.
 */

export default function MoonDisc({ illuminationPct, phaseEmoji }: { illuminationPct: number; phaseEmoji?: string }) {
  const S = 44, CX = S / 2, CY = S / 2, R = 18;
  const ill = Math.min(100, Math.max(0, illuminationPct)) / 100;
  const bulge = (ill - 0.5) * 2 * R;

  return (
    <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} className="shrink-0">
      <circle cx={CX} cy={CY} r={R} fill="var(--el-border-subtle)" />
      <clipPath id="moon-lit">
        <ellipse cx={CX + bulge * 0.3} cy={CY} rx={R * Math.max(0.05, ill)} ry={R} />
      </clipPath>
      <circle cx={CX} cy={CY} r={R} fill="var(--el-text-muted)" clipPath="url(#moon-lit)" opacity={0.7} />
      <circle cx={CX} cy={CY} r={R} fill="none" stroke="var(--el-text-faint)" strokeWidth={0.5} />
      {phaseEmoji && (
        <text x={CX} y={CY + 1} fontSize={16} textAnchor="middle" dominantBaseline="middle">{phaseEmoji}</text>
      )}
    </svg>
  );
}
