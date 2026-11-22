/**
 * WEB-SERVE-001: the single IPC adapter for HTTP serve mode.
 *
 * `lts-serve` injects `window.__LTS_SERVE = true` into the index.html it
 * serves; when that marker is present and the page is NOT inside the Tauri
 * shell, every `invoke(cmd, args)` call routes through
 * `fetch('/api/<cmd>')` to the server's IPC bridge. One module, no
 * per-call forks — `detectInvoke()` in App.tsx is the only call site.
 *
 * The marker (not the protocol) gates the mode, so vitest DOMs and plain
 * static hosting keep the existing null-bridge behavior.
 */

import type { EngineProgress } from "./progress";

type ServeWindow = Window & { __LTS_SERVE?: boolean };

export function inLtsServeMode(): boolean {
  return typeof window !== "undefined" && (window as ServeWindow).__LTS_SERVE === true;
}

/**
 * Rebuild the rejection shape the Tauri bridge produces: a command error
 * arrives as `{ "error": ... }` with a non-2xx status, and the UI's error
 * handling sees an Error whose message is that value — the same string the
 * desktop webview would have rejected the invoke promise with.
 */
export async function httpInvoke(cmd: string, args?: Record<string, unknown>): Promise<unknown> {
  const res = await fetch(`/api/${cmd}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(args ?? {}),
    credentials: "same-origin",
  });
  const text = await res.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }
  if (!res.ok) {
    const message =
      payload !== null && typeof payload === "object" && "error" in payload
        ? String((payload as { error: unknown }).error)
        : text || `HTTP ${res.status}`;
    throw new Error(message);
  }
  return payload;
}

export type ServeCapabilities = {
  mode: string;
  install_progress_events: boolean;
  install_progress_note?: string;
  microphone_capture?: string;
  /** SETTINGS-SCOPE-001: whether THIS context can reveal microphone names at
   * all (secure-context rule). The serve bridge computes it from the page
   * origin it served; the Settings mic button grays with this truth instead
   * of offering a dead click. Absent (older bridge) = unknown, not false. */
  microphone_names_available?: boolean;
  microphone_names_note?: string;
  privacy_modes?: string;
  network?: string;
};

/** The capability report the server publishes (scope 4). Never invents a
 * report locally — absence (fetch failure) is null, and the UI then says
 * plainly that the bridge is unreachable. */
export async function fetchCapabilities(): Promise<ServeCapabilities | null> {
  try {
    const res = await fetch("/api/capabilities");
    if (!res.ok) return null;
    return (await res.json()) as ServeCapabilities;
  } catch {
    return null;
  }
}

/**
 * WEB-PROGRESS-001: the browser twin of the desktop `engine-progress`
 * listener. The serve mode streams the SAME install stages over
 * `GET /api/progress/events` (SSE); this feeds each frame to the same
 * handler the desktop listener uses, so the existing progress UI renders
 * in browser mode. EventSource reconnects on its own; a dropped frame
 * loses a stage, never an install — progress stays a nicety.
 * Returns the close function.
 */
export function subscribeServeProgress(onStage: (p: EngineProgress) => void): () => void {
  if (typeof EventSource === "undefined") return () => {};
  const es = new EventSource("/api/progress/events");
  es.onmessage = (e: MessageEvent<string>) => {
    try {
      const p = JSON.parse(e.data) as EngineProgress;
      if (p && typeof p.stage === "string" && typeof p.operation === "string") {
        onStage(p);
      }
    } catch {
      // A malformed frame is ignored exactly like a failed event delivery
      // on desktop: it must never surface as an error to the learner.
    }
  };
  return () => es.close();
}
