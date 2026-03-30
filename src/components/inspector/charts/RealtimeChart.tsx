/**
 * RealtimeChart — recharts AreaChart with proper dark-theme gradient fills.
 */

import { useMemo, useRef, useId, useEffect, useState } from "react";
import {
  ResponsiveContainer, AreaChart, Area, Line,
  YAxis, CartesianGrid, Tooltip,
} from "recharts";

interface Series {
  label: string;
  data: number[];
  color: string; // CSS var like "var(--el-accent)" or concrete hex
  dashed?: boolean;
}

/** Resolve a CSS custom property to a concrete color string. */
function resolveColor(color: string, el: HTMLElement): string {
  if (!color.startsWith("var(")) return color;
  const prop = color.slice(4, -1).trim();
  return getComputedStyle(el).getPropertyValue(prop).trim() || "#888";
}

export default function RealtimeChart({
  series,
  height = 72,
  gridLines: _gridLines = 3,
  unit = "",
}: {
  series: Series[];
  height?: number;
  gridLines?: number;
  unit?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const uid = useId().replace(/:/g, "");

  // Resolved concrete colors — populated after mount via useEffect
  const [resolvedColors, setResolvedColors] = useState<string[]>(() =>
    series.map(() => "#888")
  );
  const [themeColors, setThemeColors] = useState({
    textFaint: "#555",
    gridColor: "#333",
    bgCard: "#1e1e1e",
  });

  // Resolve CSS variables after mount (and whenever series colors change)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    setResolvedColors(series.map(s => resolveColor(s.color, el)));
    const cs = getComputedStyle(el);
    setThemeColors({
      textFaint: cs.getPropertyValue("--el-text-faint").trim() || "#555",
      gridColor: cs.getPropertyValue("--el-border-subtle").trim() || "#333",
      bgCard: cs.getPropertyValue("--el-bg-card").trim() || "#1e1e1e",
    });
  // re-resolve when series change (different colors)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [series.map(s => s.color).join(",")]);

  const maxLen = Math.max(...series.map(s => s.data.length), 0);

  const chartData = useMemo(() => {
    if (maxLen < 2) return [];
    return Array.from({ length: maxLen }, (_, i) => {
      const pt: Record<string, number> = { idx: i };
      for (const s of series) {
        const offset = i - (maxLen - s.data.length);
        pt[s.label] = offset >= 0 ? s.data[offset] : (s.data[0] ?? 0);
      }
      return pt;
    });
  }, [series, maxLen]);

  if (maxLen < 2) {
    return (
      <div ref={containerRef} className="flex items-center justify-center"
        style={{ height, marginTop: 4 }}>
        <span className="text-[9px]" style={{ color: "var(--el-text-faint)" }}>
          awaiting data&hellip;
        </span>
      </div>
    );
  }

  const { textFaint, gridColor, bgCard } = themeColors;

  return (
    <div ref={containerRef} style={{ marginTop: 4, height }}>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart
          data={chartData}
          margin={{ top: 4, right: 4, bottom: series.length > 1 ? 16 : 4, left: 28 }}
        >
          <defs>
            {series.map((s, i) => !s.dashed && (
              <linearGradient key={s.label} id={`${uid}${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={resolvedColors[i] ?? "#888"} stopOpacity={0.28} />
                <stop offset="100%" stopColor={resolvedColors[i] ?? "#888"} stopOpacity={0.02} />
              </linearGradient>
            ))}
          </defs>

          <CartesianGrid stroke={gridColor} strokeDasharray="2 3" vertical={false} />

          <YAxis
            width={26}
            tick={{ fill: textFaint, fontSize: 7 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={fmtY}
            domain={["auto", "auto"]}
            label={unit ? {
              value: unit, position: "insideTopRight",
              fill: textFaint, fontSize: 7, offset: -22,
            } : undefined}
          />

          <Tooltip
            contentStyle={{
              background: bgCard,
              border: `1px solid ${gridColor}`,
              borderRadius: 6,
              fontSize: 9,
              color: textFaint,
              padding: "3px 8px",
            }}
            labelFormatter={() => ""}
            formatter={(value: unknown, name: unknown) => {
              const v = Number(value);
              return [`${fmtY(v)}${unit}`, String(name ?? "")];
            }}
          />

          {series.map((s, i) =>
            s.dashed ? (
              <Line key={s.label} type="monotone" dataKey={s.label}
                stroke={resolvedColors[i] ?? s.color}
                strokeWidth={1.5} strokeDasharray="4 3"
                dot={false} activeDot={{ r: 3 }}
                isAnimationActive={false}
              />
            ) : (
              <Area key={s.label} type="monotone" dataKey={s.label}
                stroke={resolvedColors[i] ?? s.color}
                strokeWidth={1.5}
                fill={`url(#${uid}${i})`}
                dot={false} activeDot={{ r: 3 }}
                isAnimationActive={false}
              />
            )
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function fmtY(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1000) return `${(v / 1000).toFixed(1)}k`;
  if (abs >= 100) return String(Math.round(v));
  if (abs >= 10) return v.toFixed(1);
  return v.toFixed(2);
}
