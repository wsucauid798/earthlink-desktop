import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";

/** True only inside the Tauri webview — not plain `vite dev` in a browser. */
function inTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

/**
 * Ask the OS for notification permission. Call this from a *deliberate user
 * action* (e.g. enabling alerts in Settings) — not cold on launch. Returns
 * true if notifications are now permitted. No-op (false) outside Tauri.
 */
export async function ensureNotificationPermission(): Promise<boolean> {
  if (!inTauri()) return false;
  try {
    if (await isPermissionGranted()) return true;
    return (await requestPermission()) === "granted";
  } catch (err) {
    console.error("[notify] permission request failed:", err);
    return false;
  }
}

export interface NotifyOptions {
  /** Fire even when the app window is focused. Default false (focus-gated). */
  force?: boolean;
}

/**
 * Fire a native OS notification for a HIGH-PRIORITY alert — reserve this for
 * the few events worth pulling the user out of the app for (server drop, tick
 * stall, storms, agent milestones). The in-app bell/timeline (D65) carries the
 * everyday firehose.
 *
 * Behaviour:
 *  - Focus-gated: skipped when the window is focused (no double-surfacing),
 *    unless `force` is set.
 *  - Never prompts: only sends if permission is already granted — call
 *    `ensureNotificationPermission()` first, from a user opt-in.
 *  - No-op outside Tauri; never throws.
 *
 * Returns whether a notification was actually sent.
 */
export async function notify(
  title: string,
  body?: string,
  opts: NotifyOptions = {},
): Promise<boolean> {
  if (!inTauri()) return false;
  try {
    if (!opts.force && (await getCurrentWindow().isFocused())) return false;
    if (!(await isPermissionGranted())) return false;
    sendNotification(body ? { title, body } : { title });
    return true;
  } catch (err) {
    console.error("[notify] failed:", err);
    return false;
  }
}
