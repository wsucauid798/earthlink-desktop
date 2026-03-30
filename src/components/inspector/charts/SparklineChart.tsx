/**
 * SparklineChart — minimal recharts-based inline sparkline.
 *
 * Drop-in replacement for the SVG Sparkline component using recharts
 * for smoother data transitions.
 */

import { useMemo } from "react";
import { ResponsiveContainer, LineChart, Line } from "recharts";

interface SparklineChartProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  className?: string;
}

export default function SparklineChart({
  data,
  width = 200,
  height = 40,
  color = "var(--el-accent)",
  className,
}: SparklineChartProps) {
  const chartData = useMemo(
    () => data.map((v, i) => ({ idx: i, val: v })),
    [data]
  );

  if (data.length < 2) {
    return (
      <div className={className} style={{ width, height, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 9, color: "var(--el-text-faint)" }}>awaiting data</span>
      </div>
    );
  }

  // Custom dot that only shows on the last point
  const LastDot = (props: { cx?: number; cy?: number; index?: number }) => {
    if (props.index !== data.length - 1) return null;
    return <circle cx={props.cx} cy={props.cy} r={2.5} fill={color} />;
  };

  return (
    <div className={className} style={{ width, height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 2, right: 4, bottom: 2, left: 2 }}>
          <Line
            type="monotone"
            dataKey="val"
            stroke={color}
            strokeWidth={1.5}
            dot={<LastDot />}
            activeDot={false}
            isAnimationActive={true}
            animationDuration={200}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
