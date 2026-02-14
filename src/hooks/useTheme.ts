/**
 * Theme management hook.
 *
 * Modes:
 *  - "light"  — always light
 *  - "dark"   — always dark
 *  - "system" — follows OS preference
 *  - "auto"   — follows time of day (dark at night, light during day)
 *
 * Applies/removes the `dark` class on <html> to drive CSS custom properties.
 */

import { useCallback, useEffect, useRef, useState } from "react";

export type ThemeMode = "light" | "dark" | "system" | "auto";

const STORAGE_KEY = "earthlink-theme-mode";

/** Is it currently daytime? Simple heuristic: 06:00–18:00 local. */
function isDaytimeNow(): boolean {
  const h = new Date().getHours();
  return h >= 6 && h < 18;
}

/** Read the OS preference. */
function systemPrefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function resolveEffective(mode: ThemeMode): "light" | "dark" {
  switch (mode) {
    case "light":
      return "light";
    case "dark":
      return "dark";
    case "system":
      return systemPrefersDark() ? "dark" : "light";
    case "auto":
      return isDaytimeNow() ? "light" : "dark";
  }
}

function applyClass(effective: "light" | "dark") {
  const root = document.documentElement;
  if (effective === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

export function useTheme() {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system" || stored === "auto") {
      return stored;
    }
    return "system";
  });

  const [effective, setEffective] = useState<"light" | "dark">(() => resolveEffective(mode));
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(() => {
    const next = resolveEffective(mode);
    setEffective(next);
    applyClass(next);
  }, [mode]);

  // Apply on mount and whenever mode changes
  useEffect(() => {
    refresh();

    // Listen for OS preference changes (relevant for "system" mode)
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => refresh();
    mq.addEventListener("change", handler);

    // For "auto" mode, poll every 60s to detect day/night transition
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (mode === "auto") {
      intervalRef.current = setInterval(refresh, 60_000);
    }

    return () => {
      mq.removeEventListener("change", handler);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [mode, refresh]);

  const setMode = useCallback((next: ThemeMode) => {
    localStorage.setItem(STORAGE_KEY, next);
    setModeState(next);
  }, []);

  return { mode, effective, setMode } as const;
}
