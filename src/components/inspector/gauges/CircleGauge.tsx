/**
 * CircleGauge — circular percentage ring with framer-motion animated stroke.
 */

import { useEffect } from "react";
import { motion, useSpring, useTransform } from "framer-motion";

export default function CircleGauge({ value, max, color, label, unit, size = 56 }: {
  value: number; max: number; color: string;
  label: string; unit: string; size?: number;
}) {
  const R = (size - 8) / 2;
  const CX = size / 2, CY = size / 2;
  const circumference = 2 * Math.PI * R;
  const pct = Math.min(1, Math.max(0, value / max));
  const targetOffset = circumference * (1 - pct);

  const springOffset = useSpring(targetOffset, { stiffness: 60, damping: 15 });
  const displayVal = useSpring(value, { stiffness: 100, damping: 20 });

  useEffect(() => { springOffset.set(targetOffset); }, [targetOffset, springOffset]);
  useEffect(() => { displayVal.set(value); }, [value, displayVal]);
  const displayText = useTransform(displayVal, (v) =>
    v < 10 ? v.toFixed(1) : String(Math.round(v))
  );

  return (
    <div className="flex flex-col items-center gap-0.5">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={CX} cy={CY} r={R} fill="none"
          stroke="var(--el-border-subtle)" strokeWidth={3} />
        <motion.circle cx={CX} cy={CY} r={R} fill="none"
          stroke={color} strokeWidth={3} strokeLinecap="round"
          strokeDasharray={circumference}
          style={{ strokeDashoffset: springOffset }}
          transform={`rotate(-90 ${CX} ${CY})`} />
        <motion.text x={CX} y={CY + 1} fontSize={size > 50 ? 11 : 9} fill="var(--el-text)"
          textAnchor="middle" dominantBaseline="middle" fontWeight="600">
          {displayText}
        </motion.text>
      </svg>
      <div className="text-[9px] text-center" style={{ color: "var(--el-text-muted)" }}>
        {label}
        <span className="block text-[8px]" style={{ color: "var(--el-text-faint)" }}>{unit}</span>
      </div>
    </div>
  );
}
