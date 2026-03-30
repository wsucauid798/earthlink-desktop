/** Shared utility functions for the Inspector panel. */

/** Convert a resolved CSS color (#hex or rgb()) to rgba with given alpha. */
export function cssRgba(color: string, alpha: number): string {
  if (color.startsWith("#")) {
    let h = color.slice(1);
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${alpha})`;
  }
  const m = color.match(/rgb\(\s*(\d+),\s*(\d+),\s*(\d+)/);
  if (m) return `rgba(${m[1]},${m[2]},${m[3]},${alpha})`;
  return color;
}

/** Format elevation, hiding sentinel values like -9999. */
export function formatElevation(m: number): string | null {
  if (m <= -9000) return null;
  if (m < 0) return `${m}m (below sea level)`;
  return `${m}m`;
}

/** Convert wind degrees to compass direction. */
export function degToCompass(deg: number): string {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(deg / 22.5) % 16];
}

/** Format an ISO datetime string to a short time (HH:MM). */
export function fmtTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
  } catch {
    return iso;
  }
}

/** Color based on Beaufort scale. */
export function beaufortColor(b: number): string {
  if (b <= 1) return "var(--el-text-faint)";
  if (b <= 3) return "var(--el-success)";
  if (b <= 5) return "var(--el-info)";
  if (b <= 7) return "var(--el-warning)";
  return "var(--el-danger)";
}

/** Color based on temperature thresholds. */
export function tempColor(c: number): string {
  if (c <= 0) return "var(--el-info)";
  if (c <= 15) return "var(--el-text)";
  if (c <= 30) return "var(--el-warning)";
  return "var(--el-danger)";
}
