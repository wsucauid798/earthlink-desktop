import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

/** True only inside the Tauri webview — not plain `vite dev` in a browser. */
function inTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export interface UpdateCheckOptions {
  /** Ask the user before downloading/installing. Default: true. */
  prompt?: boolean;
}

/**
 * Check GitHub Releases for a newer signed build. If one exists (and the user
 * agrees, when `prompt` is on), download + install it and relaunch.
 *
 * Safe to call anywhere: it's a no-op outside the Tauri runtime (e.g. browser
 * dev) and swallows/loggs any error so a flaky update check never breaks the
 * app. Signature verification against the embedded pubkey is enforced by the
 * Rust plugin — a tampered bundle is rejected before install.
 */
export async function checkForUpdates(opts: UpdateCheckOptions = {}): Promise<void> {
  if (!inTauri()) return;
  const { prompt = true } = opts;

  try {
    const update = await check();
    if (!update) return;

    const accepted =
      !prompt ||
      window.confirm(
        `EarthLink ${update.version} is available.` +
          (update.body ? `\n\n${update.body}` : "") +
          `\n\nDownload and install now? The app will restart.`,
      );
    if (!accepted) return;

    await update.downloadAndInstall((event) => {
      switch (event.event) {
        case "Started":
          console.info(`[updater] downloading ${event.data.contentLength ?? "?"} bytes`);
          break;
        case "Finished":
          console.info("[updater] download finished — installing");
          break;
      }
    });

    await relaunch();
  } catch (err) {
    console.error("[updater] update check failed:", err);
  }
}
