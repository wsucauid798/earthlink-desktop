/**
 * VertBarChart — recharts vertical bar chart for pollutant levels etc.
 */

import { useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  LabelList,
} from "recharts";
import { useChartTheme } from "./useChartTheme";

interface BarItem {
  label: string;
  value: number;
  max: number;
  color: string;
}

export default function VertBarChart({ bars }: { bars: BarItem[] }) {
  const { theme, themeRef } = useChartTheme();

  const chartData = useMemo(
    () => bars.map((b) => ({
      name: b.label,
      value: b.value,
      max: b.max,
      color: b.color,
    })),
    [bars]
  );

  return (
    <div ref={themeRef} style={{ marginTop: 4, height: 64 }}>
      <ResponsiveContainer width="100%" height={64}>
        <BarChart data={chartData} margin={{ top: 12, right: 6, bottom: 0, left: 6 }}>
          <XAxis
            dataKey="name"
            tick={{ fill: theme.textFaint, fontSize: 8 }}
            axisLine={false}
            tickLine={false}
          />
          <Bar
            dataKey="value"
            radius={[3, 3, 0, 0]}
            isAnimationActive={true}
            animationDuration={400}
            animationEasing="ease-out"
          >
            {chartData.map((entry, index) => (
              <Cell key={index} fill={entry.color} opacity={0.8} />
            ))}
            <LabelList
              dataKey="value"
              position="top"
              fill={theme.textColor}
              fontSize={8}
              fontWeight={600}
              formatter={(v: unknown) => { const n = Number(v); return n < 10 ? n.toFixed(1) : String(Math.round(n)); }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
