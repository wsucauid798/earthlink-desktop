/**
 * useChartTheme — resolves CSS custom properties for recharts theming.
 *
 * Uses getComputedStyle to read --el-* variables, returning concrete color strings
 * that recharts can use (it doesn't understand CSS variables).
 */

import { useRef, useMemo, useEffect, useState } from "react";

export interface ChartTheme {
  textColor: string;
  textFaint: string;
  gridColor: string;
  bgPanel: string;
  bgCard: string;
  accent: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
}

export function useChartTheme(): { theme: ChartTheme; themeRef: React.RefObject<HTMLDivElement | null> } {
  const themeRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const theme = useMemo<ChartTheme>(() => {
    if (!mounted || !themeRef.current) {
      // Fallback before mount
      return {
        textColor: "#aaa",
        textFaint: "#666",
        gridColor: "#333",
        bgPanel: "#1a1a1a",
        bgCard: "#222",
        accent: "#6b8afd",
        success: "#4ade80",
        warning: "#fbbf24",
        danger: "#f87171",
        info: "#60a5fa",
      };
    }

    const cs = getComputedStyle(themeRef.current);
    const resolve = (prop: string) => cs.getPropertyValue(prop).trim() || "#888";

    return {
      textColor: resolve("--el-text-muted"),
      textFaint: resolve("--el-text-faint"),
      gridColor: resolve("--el-border-subtle"),
      bgPanel: resolve("--el-bg-panel"),
      bgCard: resolve("--el-bg-card"),
      accent: resolve("--el-accent"),
      success: resolve("--el-success"),
      warning: resolve("--el-warning"),
      danger: resolve("--el-danger"),
      info: resolve("--el-info"),
    };
  }, [mounted]);

  return { theme, themeRef };
}
