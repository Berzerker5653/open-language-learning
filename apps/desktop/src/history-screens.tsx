/**
 * WEB-HISTORY-001 evidence entry (dev-only; never shipped — vite builds it
 * only through apps/desktop/vite.history-harness.config.ts).
 *
 * The card's acceptance is a REAL-browser back-button walk, which the
 * vitest journey cannot prove (its fake history mirror approximates the
 * History API). This page mounts the shipped <App/> against the journeys'
 * fake engine exactly like src/mobile-screens.tsx does, with one addition:
 * `window.__LTS_HISTORY = true` before the app boots, so the history shim
 * (src/history-nav.ts) installs and real pushState/popstate traversals drive
 * real navigation.
 *
 * It exposes a small step driver on `window.__LH` so the capture script
 * (state/evidence/WEB-HISTORY-001/history-walk.mjs) orchestrates one step
 * per CDP evaluate and screenshots BETWEEN steps. Per the run-107 lesson,
 * every navigation error rides into `#lh-json` and an on-screen banner — a
 * stalled walk can never masquerade as clean evidence.
 *
 * Fixture: the journeys' JA seeded profile (Dana) — the same scenario the
 * history-nav journey asserts, so the browser walk and the unit-level
 * journey measure one and the same state machine.
 */
import { createRoot } from "react-dom/client";
import "@openlang/ui/styles.css";
import { App } from "./App";
import { JA, LearnerEngine } from "./journeys/harness";

const WAIT = (ms: number) => new Promise((r) => setTimeout(r, ms));

// The shim's activation flag — set BEFORE the app mounts.
(window as unknown as Record<string, unknown>).__LTS_HISTORY = true;

const steps: string[] = [];
let walkError: string | null = null;

function record(step: string, error?: string): void {
  steps.push(step);
  if (error) walkError = walkError ?? error;
  emit();
}

/** Machine-readable walk state the capture script extracts (mirrors the
 * MOBILE-UX-001 #audit-json pattern). */
function emit(): void {
  let pre = document.querySelector<HTMLPreElement>("#lh-json");
  if (!pre) {
    pre = document.createElement("pre");
    pre.id = "lh-json";
    pre.style.display = "none";
    document.body.append(pre);
  }
  pre.textContent = JSON.stringify({
    ready,
    steps,
    error: walkError,
    location: `${window.location.pathname}${window.location.search}`,
    historyState: (window.history.state as { lts?: string } | null)?.lts ?? null,
  });
  let banner = document.querySelector<HTMLElement>("[data-lh-banner]");
  if (!banner) {
    banner = document.createElement("div");
    banner.setAttribute("data-lh-banner", "");
    banner.style.cssText =
      "position:fixed;left:0;right:0;top:0;z-index:99;padding:.3rem .6rem;font:600 12px system-ui;";
    document.body.append(banner);
  }
  banner.style.background = walkError ? "#b23a2e" : "#276b3c";
  banner.textContent = walkError
    ? `history-walk ERROR: ${walkError.slice(0, 140)}`
    : `history-walk steps: ${steps.join(" > ")}`;
}

async function buttonWith(label: string): Promise<HTMLElement> {
  const start = Date.now();
  for (;;) {
    const buttons = [...document.querySelectorAll("button, a")];
    // Accessible name counts (the profile chooser carries the learner name
    // via aria-label, per the MOBILE-UX-001 harness lesson).
    const hit = buttons.find((b) => {
      const text = `${(b.textContent ?? "").trim()} ${(b.getAttribute("aria-label") ?? "").trim()}`;
      return text.includes(label);
    });
    if (hit) return hit as HTMLElement;
    if (Date.now() - start > 10000) {
      const err = `no button carrying "${label}" (saw: ${buttons
        .map((b) => (b.textContent ?? "").trim())
        .join(" | ")})`;
      record(`click:${label}`, err);
      throw new Error(err);
    }
    await WAIT(150);
  }
}

let ready = false;

async function main(): Promise<void> {
  const host = document.createElement("div");
  host.id = "root";
  document.body.append(host);
  const engine = new LearnerEngine({
    profiles: [{ id: "dana", display_name: "Dana", active: JA }],
    installed: [JA],
  });
  (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ = {
    invoke: (cmd: string, args?: Record<string, unknown>) => engine.run(cmd, args ?? {}),
    transformCallback: (callback: (value: unknown) => void, once?: boolean) =>
      engine.addCallback(callback, once),
  };
  (window as unknown as Record<string, unknown>).__TAURI_EVENT_PLUGIN_INTERNALS__ = {
    unregisterListener: (event: string, eventId: number) =>
      engine.unregisterListener(event, eventId),
  };
  createRoot(host).render(<App />);
  // Let the boot settle, then take the profile chooser — the walk itself is
  // driven step-by-step by the capture script through window.__LH.click().
  try {
    await buttonWith("Dana");
    (await buttonWith("Dana")).click();
    await WAIT(900);
    ready = true;
    record("boot+profile");
  } catch (e) {
    record("boot", String(e));
  }
}

interface StepDriver {
  ready: () => boolean;
  click: (label: string) => Promise<string>;
  back: () => Promise<string>;
}

// The capture script's step surface. click/back settle before returning so
// screenshots land on settled state.
(window as unknown as Record<string, unknown>).__LH = {
  ready: () => ready,
  click: async (label: string) => {
    await buttonWith(label);
    (await buttonWith(label)).click();
    await WAIT(900);
    record(`click:${label}`);
    return `${window.location.pathname}${window.location.search}`;
  },
  back: async () => {
    window.history.go(-1);
    await WAIT(900);
    record("back");
    return `${window.location.pathname}${window.location.search}`;
  },
} satisfies StepDriver;

void main();
