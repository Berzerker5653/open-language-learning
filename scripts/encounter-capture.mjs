#!/usr/bin/env node
/**
 * ENCOUNTER-BEFORE-TEST-001 acceptance capture (dev-only evidence tooling).
 *
 * Plumbing copied from scripts/practice-gate-capture.mjs (PRACTICE-GATE-001 /
 * SETTINGS-SCOPE-001 rules): headless Chrome over raw CDP, Node built-in
 * WebSocket/fetch, serve's OWN install_pack (no base64 over HTTP), per-screen
 * cache-buster, Page.enable after attach, SERVE_DIST is the dist DIRECTORY.
 *
 * What it proves:
 *   1. lesson_plan (the API that RENDERS the encounter panel) carries the
 *      pack's new confusable copy for both arms: friendly letters (А) and
 *      false friends (Н/С) — measured from the same rows the UI shows.
 *   2. The session path actually SHOWS the lesson encounter panel with that
 *      copy on-screen — captured to encounter-panel.png.
 *   3. The lesson "Start practicing" control fires the encounter_complete
 *      IPC once per encounter view (window.fetch instrumentation measures
 *      the call itself).
 *   4. Progression (the encounter route) is intact for a zero-encounter
 *      profile: home_state still offers introduction items, and NO
 *      due-review/weak-skill row for a cyrillic letter exists — the
 *      engine's test routes cannot outrun the encounter.
 *
 *   usage: SERVE_BIN=<lts-serve binary> SERVE_DIST=<apps/desktop/dist dir> \
 *          node scripts/encounter-capture.mjs
 */
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync, mkdtempSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const SERVE_BIN = resolve(process.env.SERVE_BIN ?? "");
const SERVE_DIST = resolve(process.env.SERVE_DIST ?? "");
for (const [name, p] of [
  ["SERVE_BIN", SERVE_BIN],
  ["SERVE_DIST", SERVE_DIST],
]) {
  if (!p) {
    console.error(`${name} is required`);
    process.exit(2);
  }
  // existsSync, not readFileSync: SERVE_DIST is a DIRECTORY (serve joins
  // dist/index.html itself).
  if (!existsSync(p)) {
    console.error(`${name} not found: ${p}`);
    process.exit(2);
  }
}
const REPO = resolve(import.meta.dirname, "..");
const OUT = join(REPO, "state/evidence/ENCOUNTER-BEFORE-TEST-001");
mkdirSync(OUT, { recursive: true });
const PACK_ID = "org.openlanguage.ru-ru.reference";
const VW = 390;
const VH = 844;
const PORT = 17800 + (process.pid % 90);
const BASE = `http://127.0.0.1:${PORT}`;

const result = { viewport: `${VW}x${VH}`, checks: [], failures: 0, error: null };
const check = (name, pass, measured) => {
  result.checks.push({ name, pass, measured });
  if (!pass) result.failures++;
  console.log(`${pass ? "PASS" : "FAIL"} ${name} — ${JSON.stringify(measured)}`);
};

const dataDir = mkdtempSync(join(tmpdir(), "lts-encounter-data-"));
const serve = spawn(SERVE_BIN, [`127.0.0.1:${PORT}`], {
  env: { ...process.env, LTS_DATA_DIR: dataDir, LTS_SERVE_DIST: SERVE_DIST },
  stdio: ["ignore", "pipe", "pipe"],
});
let serveLog = "";
serve.stdout.on("data", (c) => (serveLog += c));
serve.stderr.on("data", (c) => (serveLog += c));

async function api(command, body) {
  const r = await fetch(`${BASE}/api/${command}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  return { status: r.status, value: await r.json().catch(() => null) };
}

let chrome = null;
let exitCode;
try {
  for (let i = 0; i < 80; i++) {
    try {
      const r = await fetch(`${BASE}/api/capabilities`);
      if (r.ok) break;
    } catch {
      // capabilities not up yet: retry next tick
    }
    await new Promise((r) => setTimeout(r, 250));
  }

  // ---- seed (API only; never click onboarding, MOBILE-UX-001 lesson) ----
  const imp = await api("install_pack", { packId: PACK_ID });
  if (imp.status !== 200) throw new Error(`install_pack failed: ${JSON.stringify(imp)}`);
  const prof = await api("create_profile", { displayName: "Encounter Tester" });
  if (prof.status !== 200) throw new Error(`create_profile failed: ${JSON.stringify(prof)}`);
  const profileId = prof.value?.id;
  if (!profileId) throw new Error(`create_profile returned no id: ${JSON.stringify(prof)}`);
  const sw = await api("switch_pack", { profileId, packId: PACK_ID });
  if (sw.status !== 200) throw new Error(`switch_pack failed: ${JSON.stringify(sw)}`);
  result.profileId = profileId;

  // ---- 1. the panel's data carries the confusable copy (both arms) ----
  const lpA = await api("lesson_plan", { profileId, contentId: "ru.orth.cyrillic.a" });
  const explA = (lpA.value?.stages ?? [])
    .flatMap((s) => s.content ?? [])
    .map((c) => c.explanation ?? "");
  check(
    "lesson_plan carries the friendly-letter copy for А",
    explA.some((e) => e.startsWith("Friendly letter")),
    {
      explanations: [explA.find((e) => e.startsWith("Friendly letter")) ?? explA[0] ?? ""].filter(
        Boolean,
      ),
    },
  );
  const lpN = await api("lesson_plan", { profileId, contentId: "ru.orth.cyrillic.n" });
  const explN = (lpN.value?.stages ?? [])
    .flatMap((s) => s.content ?? [])
    .map((c) => c.explanation ?? "");
  const nLine = explN.find((e) => e.startsWith("False friend") && e.includes("Н"));
  check("lesson_plan carries the false-friend copy for Н", nLine !== undefined, {
    explanations: [nLine ?? explN[0] ?? ""].filter(Boolean),
  });

  // ---- 4. test routes never outrun the encounter (API level) ----
  const home = await api("home_state", { profileId });
  const items = home.value?.plan?.items ?? [];
  const letterTestRows = items.filter(
    (i) => i.content_id.startsWith("ru.orth.cyrillic.") && i.reason !== "progression",
  );
  check(
    "home_state offers progression items for a zero-encounter profile",
    items.some((i) => i.reason === "progression"),
    { total: items.length, reasons: [...new Set(items.map((i) => i.reason))] },
  );
  check(
    "no due-review/weak-skill row for any cyrillic letter pre-encounter",
    letterTestRows.length === 0,
    { offenders: letterTestRows.map((i) => [i.content_id, i.reason]) },
  );

  // ---- browser: the real app on the owner's phone viewport ----
  const profileDir = mkdtempSync(join(tmpdir(), "lts-encounter-profile-"));
  chrome = spawn(
    process.env.CHROME ?? "google-chrome-stable",
    [
      "--headless=new",
      "--no-sandbox",
      "--disable-gpu",
      "--remote-debugging-port=0",
      `--user-data-dir=${profileDir}`,
      "--use-fake-ui-for-media-stream",
      "--use-fake-device-for-media-stream",
    ],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  let wsUrl = null;
  chrome.stderr.on("data", (chunk) => {
    const m = /DevTools listening on (ws:\/\/\S+)/.exec(chunk.toString());
    if (m) wsUrl = m[1];
  });
  for (let i = 0; !wsUrl && i < 100; i++) await new Promise((r) => setTimeout(r, 100));
  if (!wsUrl) throw new Error("chrome did not report a DevTools WebSocket URL");

  const ws = new WebSocket(wsUrl);
  await new Promise((r) => ws.addEventListener("open", r));
  let nextId = 1;
  const pending = new Map();
  ws.addEventListener("message", (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
  });
  function send(method, params = {}, sessionId) {
    const id = nextId++;
    ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    return new Promise((res, rej) =>
      pending.set(id, (msg) =>
        msg.error ? rej(new Error(`${method}: ${msg.error.message}`)) : res(msg.result),
      ),
    );
  }
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const { targetId } = await send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
  await send("Page.enable", {}, sessionId); // flattened sessions need this
  async function evaluate(expression) {
    const r = await send(
      "Runtime.evaluate",
      { expression, awaitPromise: true, returnByValue: true },
      sessionId,
    );
    if (r.exceptionDetails)
      throw new Error(`page eval: ${r.exceptionDetails.exception?.description ?? "error"}`);
    return r.result.value;
  }
  async function clickByText(label, scope = "button") {
    const clicked = await evaluate(`(() => {
      const el = [...document.querySelectorAll('${scope}')].find(
        (e) => (e.textContent ?? '').includes(${JSON.stringify(label)}),
      );
      if (!el) return false;
      el.click();
      return true;
    })()`);
    if (!clicked)
      throw new Error(`navigation error: no ${scope} containing ${JSON.stringify(label)}`);
    await sleep(500);
  }

  await send(
    "Emulation.setDeviceMetricsOverride",
    { width: VW, height: VH, deviceScaleFactor: 1, mobile: true },
    sessionId,
  );
  await send("Page.navigate", { url: `${BASE}/?v=encounter` }, sessionId);

  // Instrument fetch BEFORE any click so the encounter_complete IPC call
  // itself is measured, not a text echo (WEB-HISTORY-001 lesson).
  await sleep(700);
  await evaluate(`(() => {
    window.__enc = [];
    const f = window.fetch.bind(window);
    window.fetch = (...a) => {
      if (String(a[0] ?? '').includes('encounter_complete')) window.__enc.push(String(a[0]));
      return f(...a);
    };
    return true;
  })()`);

  // Resume the seeded profile (chooser card exposes 'Continue' with the
  // NAME in the wrapper, not the button text).
  let resumed = false;
  for (let i = 0; i < 60 && !resumed; i++) {
    await sleep(250);
    resumed = await evaluate(`(() => {
      const el = [...document.querySelectorAll('button')]
        .filter((b) => (b.textContent ?? '').includes('Continue'))
        .find((b) => {
          let n = b;
          for (let i = 0; i < 6 && n; i++) {
            n = n.parentElement;
            if (n && (n.textContent ?? '').includes('Encounter Tester')) return true;
          }
          return false;
        });
      if (!el) return false;
      el.click();
      return true;
    })()`);
  }
  if (!resumed)
    throw new Error("navigation error: profile chooser never offered 'Encounter Tester'");
  await sleep(700);

  // Today -> start the plan; the FIRST session activity shows the lesson
  // encounter card (the session path the notes recipe names).
  await clickByText("Today");
  await sleep(500);
  const started = await evaluate(`(() => {
    const el = [...document.querySelectorAll('button')].find(
      (b) => (b.textContent ?? '').includes('Start'),
    );
    if (!el) return false;
    el.click();
    return true;
  })()`);
  if (!started) throw new Error("navigation error: no 'Start ...' plan button on Today");
  await sleep(900);

  const panel = await evaluate(`(() => {
    const sec = document.querySelector('[data-testid="lesson-encounter"]');
    const expl = [...document.querySelectorAll('.lesson__explanation')].map(
      (e) => e.textContent ?? '',
    );
    return {
      panel: Boolean(sec),
      friendly: expl.filter((t) => t.includes('Friendly letter')).length,
      falseFriend: expl.filter((t) => t.includes('False friend')).length,
      sample: expl[0] ?? null,
    };
  })()`);
  // LESSON-TITLE-FIT-001: the title must FIT the column — measured from the
  // h1's own line rects (viewport screenshots can crop, so ink-in-a-png can
  // never prove this), never from body text (WEB-HISTORY-001 rule).
  const titleFit = await evaluate(`(() => {
    const sec = document.querySelector('[data-testid="lesson-encounter"]');
    const h1 = sec && sec.querySelector('h1');
    if (!h1) return { error: 'no lesson title h1' };
    const rg = document.createRange();
    rg.selectNodeContents(h1);
    const lines = [...rg.getClientRects()];
    return {
      text: h1.textContent,
      clientW: h1.clientWidth,
      scrollW: h1.scrollWidth,
      lineCount: lines.length,
      widestLineW: lines.length ? Math.max(...lines.map((r) => r.width)) : 0,
      docScrollW: document.documentElement.scrollWidth,
      viewportW: window.innerWidth,
    };
  })()`);
  check(
    "the lesson title wraps inside its column with no overflow at 390px (LESSON-TITLE-FIT-001)",
    !titleFit.error &&
      titleFit.scrollW <= titleFit.clientW &&
      titleFit.widestLineW <= titleFit.clientW + 1 &&
      titleFit.docScrollW <= titleFit.viewportW,
    titleFit,
  );
  await send(
    "Page.captureScreenshot",
    { format: "png", captureBeyondViewport: true },
    sessionId,
  ).then((shot) =>
    writeFileSync(join(OUT, "encounter-panel.png"), Buffer.from(shot.data, "base64")),
  );
  check(
    "the lesson encounter panel renders with the new copy on-screen",
    panel.panel && panel.friendly > 0,
    panel,
  );

  // Start practicing: fires the encounter_complete IPC once per view.
  const startClicked = await evaluate(`(() => {
    const el = document.querySelector('[data-testid="lesson-start"]');
    if (!el) return false;
    el.click();
    return true;
  })()`);
  if (!startClicked) throw new Error("navigation error: no [data-testid=lesson-start] button");
  await sleep(900);
  const calls = await evaluate(`(window.__enc ?? []).length`);
  check("lesson 'Start practicing' fires encounter_complete exactly once per view", calls === 1, {
    calls,
  });

  // The runner (not the encounter card) is now on-screen — the session
  // resumed at the encounter and moved on, never at a test the learner
  // had not earned.
  const after = await evaluate(`(() => {
    return {
      stillEncounter: Boolean(document.querySelector('[data-testid="lesson-encounter"]')),
      bodyHasRunner: Boolean(document.querySelector('button, input')),
    };
  })()`);
  check("after Start, the session moved past the encounter view", !after.stillEncounter, after);
} catch (err) {
  result.error = String(err?.message ?? err);
  result.failures++;
  console.error(`capture failed: ${result.error}`);
} finally {
  result.serveLogTail = serveLog.slice(-2000);
  writeFileSync(join(OUT, "result.json"), JSON.stringify(result, null, 2) + "\n");
  chrome?.kill();
  serve.kill();
  exitCode = result.failures > 0 ? 1 : 0;
}
process.exit(exitCode);
