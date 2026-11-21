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
