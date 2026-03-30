/**
 * OrbitalDiagram — Earth's orbital position with framer-motion animated Earth dot.
 */

import { motion, useSpring, useTransform } from "framer-motion";

export default function OrbitalDiagram({ position }: { position: number }) {
  const S = 96;
  const CX = S / 2;
  const CY = S / 2;
  const R = 34;

  const springPos = useSpring(position, { stiffness: 60, damping: 15 });
  const ex = useTransform(springPos, (p) => CX + R * Math.cos(((p - 90) * Math.PI) / 180));
  const ey = useTransform(springPos, (p) => CY + R * Math.sin(((p - 90) * Math.PI) / 180));

  const markers = [
    { deg: 0, label: "Mar" },
    { deg: 90, label: "Jun" },
    { deg: 180, label: "Sep" },
    { deg: 270, label: "Dec" },
  ];

  return (
    <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} className="shrink-0">
      <circle cx={CX} cy={CY} r={R}
        fill="none" stroke="var(--el-border-subtle)" strokeWidth={1} strokeDasharray="3,2" />
      {markers.map((marker) => {
        const a = ((marker.deg - 90) * Math.PI) / 180;
        const tx = CX + (R + 12) * Math.cos(a);
        const ty = CY + (R + 12) * Math.sin(a);
        return (
          <text key={marker.label} x={tx} y={ty + 3} fontSize={8}
            fill="var(--el-text-muted)" textAnchor="middle">
            {marker.label}
          </text>
        );
      })}
      {/* Sun */}
      <circle cx={CX} cy={CY} r={7} fill="var(--el-warning)" opacity={0.18} />
      <circle cx={CX} cy={CY} r={4.5} fill="var(--el-warning)" opacity={0.8} />
      {/* Earth — animated position */}
      <motion.circle r={4} fill="var(--el-info)" opacity={0.9}
        style={{ cx: ex, cy: ey }} />
    </svg>
  );
}
