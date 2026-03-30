/**
 * AnimNum — smoothly interpolates between numeric values using framer-motion springs.
 */

import { useEffect } from "react";
import { useSpring, motion, useTransform } from "framer-motion";

export default function AnimNum({
  value,
  decimals = 1,
  suffix = "",
  prefix = "",
  style,
  className,
}: {
  value: number;
  decimals?: number;
  duration?: number; // kept for API compat
  suffix?: string;
  prefix?: string;
  style?: React.CSSProperties;
  className?: string;
}) {
  const spring = useSpring(value, { stiffness: 120, damping: 22 });

  // Animate to new target whenever the prop value changes
  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  const display = useTransform(spring, (v) => `${prefix}${v.toFixed(decimals)}${suffix}`);

  return (
    <motion.span className={`tabular-nums ${className ?? ""}`} style={style}>
      {display}
    </motion.span>
  );
}
