/**
 * MOBILE-UX-001 evidence entry (dev-only; never shipped — vite builds it only
 * through apps/desktop/vite.mobile-harness.config.ts).
 *
 * Mounts the shipped <App/> against the journeys' fake engine (harness.tsx
 * replaces only the seam under the IPC boundary), drives it with real DOM
 * clicks to the screen named in the URL hash, then measures:
 *   - horizontal overflow at the current viewport, and
 *   - every interactive element's rendered touch-target box.
 * The results are printed BOTH visibly (banner on screen, so the screenshot
 * carries the verdict) and as JSON in <pre id="audit-json"> so the capture
 * script can extract them with --dump-dom.
 *
 * Screens: onboarding | today | drill | reader | settings | session.
 */
import { createRoot } from "react-dom/client";
import "@openlang/ui/styles.css";
import { App } from "./App";
import { JA, LearnerEngine, RU } from "./journeys/harness";

const WAIT = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Poll until a selector exists (boot timing is real time here, so never
 * blind-wait past a missing element). */
async function waitFor(selector: string, limit = 15000): Promise<HTMLElement> {
  const start = Date.now();
  for (;;) {
    const el = document.querySelector<HTMLElement>(selector);
    if (el) return el;
    if (Date.now() - start > limit)
      throw new Error(`mobile-screens: timeout waiting for ${selector}`);
    await WAIT(150);
  }
}

async function buttonWith(label: string): Promise<HTMLElement> {
  const start = Date.now();
  for (;;) {
    const buttons = [...document.querySelectorAll("button, a")];
    // Accessible name counts as part of the label (the profile chooser's
    // Continue button carries the learner-visible name only via aria-label).
    const hit = buttons.find((b) => {
      const text = `${(b.textContent ?? "").trim()} ${(b.getAttribute("aria-label") ?? "").trim()}`;
      return text.includes(label);
    });
    if (hit) return hit as HTMLElement;
    if (Date.now() - start > 10000)
      throw new Error(
        `mobile-screens: no button carrying "${label}" (saw: ${buttons
          .map((b) => (b.textContent ?? "").trim())
          .join(" | ")})`,
      );
    await WAIT(150);
  }
}

async function clickWith(label: string): Promise<void> {
  (await buttonWith(label)).click();
  await WAIT(700);
}

async function typeInto(selector: string, value: string): Promise<void> {
  const el = (await waitFor(selector)) as HTMLInputElement;
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
  setter?.call(el, value);
  el.dispatchEvent(new window.Event("input", { bubbles: true }));
}

/** Learner path shared by every screen capture: privacy notice -> profile ->
 * pack -> skip mic. Mirrors first-run.journey.tsx's click sequence. The
 * reader screen runs on the Japanese fixture (the journeys' only story);
 * RU stays on device for the drill lane. */
async function onboard(packName: string): Promise<void> {
  await waitFor("#profile-name"); // boot + privacy notice settle
  await typeInto("#profile-name", "Mobile");
  await WAIT(300);
  await clickWith("Create local profile");
  const radio = [...document.querySelectorAll<HTMLInputElement>('[name="pack"]')].find((r) =>
    (r.closest("label")?.textContent ?? "").includes(packName),
  );
  if (!radio) throw new Error(`mobile-screens: pack "${packName}" not offered`);
  radio.click();
  await WAIT(300);
  await clickWith("Install");
  await clickWith("Continue");
  await clickWith("Skip for now");
}

async function goto(hash: string): Promise<void> {
  if (hash === "onboarding") return;
  if (hash === "session") {
    // SESSION-FLOW-COPY-001 evidence walk: one bounded session, driven to
    // the moment it advances itself. The capture script catches the
    // "Next: <what>" bridge as it appears and screenshots it, then checks
    // the runner opened WITHOUT another Start click.
    await clickWith("Dana");
    await clickWith("Start today's plan");
    await clickWith("Start practicing");
    await clickWith("how do you do (first meeting)");
    await clickWith("Continue to next activity");
    return;
  }
  const reader = hash === "reader";
  // SETTINGS-SCOPE-001 evidence: the Settings screen under three install
  // shapes (RU-only, JA-only, both) — the seeded scenario is chosen per
  // screen, never by clicking an install through onboarding.
  const settingsScreen = hash === "settings" || hash.startsWith("settings-");
  if (hash === "today" || hash === "drill" || settingsScreen) {
    // These screens run on the seeded RU profile (the same scenario shape
    // ru-modality.journey.tsx uses). The pack picker does not complete the
    // RU install through the onboarding UI in this fake engine (run 107's
    // captures stalled at the mic step), so seeding is the honest path.
    await clickWith("Continue Katya"); // profile chooser -> active profile
    if (hash === "today") return;
    if (settingsScreen) {
      await clickWith("Settings");
      return;
    }
    // Drill: a RU writing activity, authored-lesson path (the fixture's RU
    // plan rows carry per-row verbs; there is no bundled "Start today's
    // plan" queue for RU).
    const row = [...section("Meet something new").querySelectorAll("button")].find((b) =>
      (b.textContent ?? "").includes("Write it"),
    );
    if (!row) throw new Error('mobile-screens: no RU "Write it" plan row');
    row.click();
    await WAIT(700);
    await clickWith("Start practicing");
    return;
  }
  await onboard("Japanese");
  if (reader) {
    await clickWith("Practice");
    await clickWith("Reading");
    await clickWith("quiet morning");
    return;
  }
}

function section(label: string): HTMLElement {
  const el = document.querySelector<HTMLElement>(`[aria-label="${label}"]`);
  if (!el) throw new Error(`mobile-screens: no section ${label}`);
  return el;
}

type Box = { tag: string; label: string; w: number; h: number; inline: boolean };

function audit(): { overflow: { scrollWidth: number; clientWidth: number }; boxes: Box[] } {
  const overflow = {
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  };
  const boxes: Box[] = [];
  for (const el of document.querySelectorAll<HTMLElement>(
    "button, a[href], input, select, summary, [role='progressbar'] ~ *",
  )) {
    if (el.tagName === "INPUT" && (el as HTMLInputElement).type === "radio") {
      // A radio's touch surface is its whole row label; the audit measures
      // the label box, flagged as such.
      const row = el.closest("label");
      if (row) {
        const r = (row as HTMLElement).getBoundingClientRect();
        boxes.push({
          tag: "label>input[radio]",
          label: (row.textContent ?? "").trim().slice(0, 40),
          w: Math.round(r.width),
          h: Math.round(r.height),
          inline: false,
        });
      }
      continue;
    }
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue; // hidden controls are not tap targets
    boxes.push({
      tag:
        el.tagName.toLowerCase() + (el.className ? "." + String(el.className).split(" ")[0] : ""),
      label: (el.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 40),
      w: Math.round(r.width),
      h: Math.round(r.height),
      inline:
        getComputedStyle(el).display === "inline-block" ||
        getComputedStyle(el).display === "inline",
    });
  }
  return { overflow, boxes };
}

function report(hash: string, error: string | null): void {
  const data = audit();
  const noHScroll = data.overflow.scrollWidth <= data.overflow.clientWidth;
  const fails = data.boxes.filter((b) => !b.inline && (b.w < 44 || b.h < 44));
  const banner = document.createElement("div");
  banner.setAttribute("data-banner", String(noHScroll && fails.length === 0 && !error));
  banner.style.cssText =
    "position:fixed;left:0;right:0;bottom:0;z-index:99;padding:.4rem .8rem;font:600 13px system-ui;" +
    `background:${noHScroll && fails.length === 0 && !error ? "#276b3c" : "#b23a2e"};color:#fff`;
  banner.textContent = `screen=${hash} · h-scroll=${noHScroll ? "none" : "YES"} · tap<44px=${fails.length}${
    error ? ` · ERROR ${error.slice(0, 120)}` : ""
  }`;
  document.body.append(banner);
  const pre = document.createElement("pre");
  pre.id = "audit-json";
  pre.style.display = "none";
  // `error` rides in the JSON too, so a stalled navigation can never again
  // masquerade as a passing audit in the evidence files (run 107 lesson).
  pre.textContent = JSON.stringify({ screen: hash, ...data, fails: fails.length, error });
  document.body.append(pre);
}

async function main(): Promise<void> {
  const hash = (window.location.hash || "#today").slice(1);
  const host = document.createElement("div");
  host.id = "root";
  document.body.append(host);
  // RU screens run on the seeded profile (see goto()); the rest boot to a
  // fresh first-run, like first-run.journey.tsx. The settings-* screens run
  // three install shapes (SETTINGS-SCOPE-001): RU-only, JA-only, and both
  // with RU active — the union case for declared settings capabilities.
  const shape: Record<string, string> = {
    "settings-ja": JA,
    "settings-both": JA,
  };
  const seeded =
    hash === "today" || hash === "drill" || hash === "session" || hash.startsWith("settings");
  const engine = new LearnerEngine(
    seeded
      ? hash === "session"
        ? // The session journey's exact shape: one JA profile, two
          // planned activities (journeys/session.journey.tsx).
          {
            profiles: [{ id: "dana", display_name: "Dana", active: JA }],
            installed: [JA],
          }
        : {
            profiles: [{ id: "katya", display_name: "Katya", active: shape[hash] ?? RU }],
            installed: hash === "settings-ja" ? [JA] : hash === "settings-both" ? [RU, JA] : [RU],
          }
      : {},
  );
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
  let error: string | null = null;
  try {
    await goto(hash);
  } catch (e) {
    error = String(e);
  }
  await WAIT(1200);
  report(hash, error);
}

void main();
