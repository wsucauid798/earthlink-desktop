import { attachConsole, info } from "@tauri-apps/plugin-log";
import { arch, hostname, locale, platform, version } from "@tauri-apps/plugin-os";

/** True only inside the Tauri webview — not plain `vite dev` in a browser. */
function inTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

/**
 * Forward log records emitted through the log plugin (Rust + JS) into the
 * webview devtools console, and stamp the logfile with the machine's OS
 * context so a logfile pulled from a user's device is self-describing
 * (essential for triaging issues on machines you can't see).
 *
 * No-op outside the Tauri runtime; never throws.
 */
export async function initLogging(): Promise<void> {
  if (!inTauri()) return;
  try {
    await attachConsole();
    const [p, a, v, host, loc] = await Promise.all([
      platform(),
      arch(),
      version(),
      hostname(),
      locale(),
    ]);
    await info(`environment: ${p} ${a}, OS ${v}, host=${host ?? "?"}, locale=${loc ?? "?"}`);
  } catch (err) {
    console.error("[log] init failed:", err);
  }
}

// Re-export the leveled loggers so app code logs through the plugin (→ logfile)
// instead of bare console.* (which only lives in devtools).
export { trace, debug, info, warn, error } from "@tauri-apps/plugin-log";
