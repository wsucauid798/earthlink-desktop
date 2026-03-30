/**
 * CompassRose — wind direction compass with framer-motion animated rotation.
 */

import { motion, useSpring } from "framer-motion";
import { useEffect, useRef } from "react";

export default function CompassRose({ direction, speed, gustSpeed, maxSpeed = 120 }: {
  direction: number; speed: number; gustSpeed?: number; maxSpeed?: number;
}) {
  const S = 120, CX = S / 2, CY = S / 2;
  const outerR = 48, innerR = 12;
  const dirs = ["N", "E", "S", "W"] as const;
  const speedPct = Math.min(1, speed / maxSpeed);
  const speedR = innerR + (outerR - innerR) * speedPct;

  // Track cumulative rotation to avoid jumps across 0/360
  const cumulativeDeg = useRef(direction);
  useEffect(() => {
    let diff = direction - (((cumulativeDeg.current % 360) + 360) % 360);
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    cumulativeDeg.current += diff;
  }, [direction]);

  const springRotate = useSpring(cumulativeDeg.current, { stiffness: 60, damping: 15 });
  // Update spring target when cumulative changes
  useEffect(() => {
    springRotate.set(cumulativeDeg.current);
  }, [direction]);

  const springSpeedR = useSpring(speedR, { stiffness: 60, damping: 15 });
  const gustR = gustSpeed != null && gustSpeed > speed
    ? innerR + (outerR - innerR) * Math.min(1, gustSpeed / maxSpeed)
    : null;

  return (
    <svg width="100%" viewBox={`0 0 ${S} ${S}`} className="block" style={{ maxWidth: S }}>
      {/* Speed rings at 25%, 50%, 75%, 100% */}
      {[0.25, 0.5, 0.75, 1].map((t) => (
        <circle key={t} cx={CX} cy={CY} r={innerR + (outerR - innerR) * t}
          fill="none" stroke="var(--el-border-subtle)" strokeWidth={0.5}
          strokeDasharray={t === 1 ? "none" : "2,3"} />
      ))}
      {/* Cardinal labels */}
      {dirs.map((d, i) => {
        const a = (i * 90 - 90) * Math.PI / 180;
        const tx = CX + (outerR + 8) * Math.cos(a);
        const ty = CY + (outerR + 8) * Math.sin(a);
        return <text key={d} x={tx} y={ty + 3} fontSize={9}
          fill="var(--el-text-muted)" textAnchor="middle" fontWeight={d === "N" ? "bold" : "normal"}>{d}</text>;
      })}
      {/* Speed fill arc */}
      <motion.circle cx={CX} cy={CY} fill="var(--el-info)" opacity={0.08}
        style={{ r: springSpeedR }} />
      {/* Gust ring */}
      {gustR != null && (
        <circle cx={CX} cy={CY} r={gustR}
          fill="none" stroke="var(--el-warning)" strokeWidth={1} strokeDasharray="3,3" opacity={0.5}
          style={{ transition: "r 0.8s cubic-bezier(0.4,0,0.2,1)" }} />
      )}
      {/* Direction arrow */}
      <motion.g style={{ rotate: springRotate, transformOrigin: `${CX}px ${CY}px` }}>
        <line x1={CX} y1={CY + 10} x2={CX} y2={CY - outerR + 4}
          stroke="var(--el-info)" strokeWidth={2} strokeLinecap="round" />
        <polygon points={`${CX},${CY - outerR + 1} ${CX - 5},${CY - outerR + 9} ${CX + 5},${CY - outerR + 9}`}
          fill="var(--el-info)" />
      </motion.g>
      {/* Center speed readout */}
      <circle cx={CX} cy={CY} r={innerR} fill="var(--el-bg-panel)" />
      <text x={CX} y={CY - 1} fontSize={12} fill="var(--el-text)"
        textAnchor="middle" dominantBaseline="middle" fontWeight="700">
        {speed.toFixed(0)}
      </text>
      <text x={CX} y={CY + 9} fontSize={7} fill="var(--el-text-faint)"
        textAnchor="middle">km/h</text>
    </svg>
  );
}
