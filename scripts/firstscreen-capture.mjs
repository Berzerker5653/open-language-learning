#!/usr/bin/env node
/**
 * TODAY-FIRSTSCREEN-001 acceptance capture (dev-only evidence tooling).
 *
 * Same plumbing as scripts/whatsnext-capture.mjs (real engine: lts-serve
 * over an isolated data dir, headless Chrome at a 390x844 phone viewport
 * via CDP Emulation.setDeviceMetricsOverride — no new deps). The card's
 * oracle is the FRESH-LEARNER first screen — the market rule (docs/design/
 * PROGRESSION-UX-AUDIT-2026-11-22.md § MARKET NAVIGATION RULES) says the
 * app opens AT the frontier node with one start pill anchored to it, and
 * one tap takes the learner into the first question. Sequence:
 *   1. fresh profile (install + create + switch, NO seeded traffic) — the
 *      exact world the owner's phone opened in;
 *   2. wait for the stable pack-loaded home (the ~1s flicker rule);
 *   3. BEFORE any manual scroll: the pinned frontier node's rect must sit
 *      fully inside the first viewport, and the meta (greeting, time
 *      budget) must NOT intersect it — the path is the first screen;
 *   4. exactly one prominent start pill, inside the pinned node's row,
 *      height >= 44px, an accent-filled background (prominent, not a
 *      quiet text button), and it is the ONLY plan CTA on the screen;
 *   5. fold-0 screenshot as the visual oracle, re-validated after the
 *      shot;
 *   6. one click on the pill lands on the practice surface.
 * Every measured value lands in result.json; any failed assertion exits
 * non-zero, so this file IS the gate. Navigation errors ride INTO the
 * result (MOBILE-UX-001 rule). CAPTURE_TAG=<red|green> labels the run.
 *
 *   usage: SERVE_BIN=<path> SERVE_DIST=<dist dir> \
 *          node scripts/firstscreen-capture.mjs
 */
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync, mkdtempSync, existsSync, rmSync } from "node:fs";
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
  if (!existsSync(p)) {
    console.error(`${name} not found: ${p}`);
    process.exit(2);
  }
}
const REPO = resolve(import.meta.dirname, "..");
const TAG = process.env.CAPTURE_TAG ?? "run";
const OUT = join(REPO, "state/evidence/TODAY-FIRSTSCREEN-001");
mkdirSync(OUT, { recursive: true });
const PACK_ID = "org.openlanguage.ru-ru.reference";
const PROFILE = "Fold Zero";
const VW = 390;
const VH = 844;
const PORT = 17890 + (process.pid % 60);
const BASE = `http://127.0.0.1:${PORT}`;

const result = { viewport: `${VW}x${VH}`, tag: TAG, checks: [], failures: 0, error: null };
const check = (name, pass, measured) => {
  result.checks.push({ name, pass, measured });
  if (!pass) result.failures++;
  console.log(`${pass ? "PASS" : "FAIL"} ${name} — ${JSON.stringify(measured)}`);
};

const dataDir = mkdtempSync(join(tmpdir(), "lts-firstscreen-data-"));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function startServe() {
  const serve = spawn(SERVE_BIN, [`127.0.0.1:${PORT}`], {
    env: { ...process.env, LTS_DATA_DIR: dataDir, LTS_SERVE_DIST: SERVE_DIST },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let serveLog = "";
  serve.stdout.on("data", (c) => (serveLog += c));
  serve.stderr.on("data", (c) => (serveLog += c));
  serve.getLog = () => serveLog;
  for (let i = 0; i < 80; i++) {
    try {
      const r = await fetch(`${BASE}/api/capabilities`);
      if (r.ok) return serve;
    } catch {
      // capabilities not up yet: retry next tick
    }
    await sleep(250);
  }
  throw new Error(`serve did not answer capabilities:\n${serveLog.slice(-1200)}`);
}

async function api(command, body) {
  const r = await fetch(`${BASE}/api/${command}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  return { status: r.status, value: await r.json().catch(() => null) };
}

let serve = null;
let chrome = null;
let chromeDir = null;
try {
  serve = await startServe();
  const imp = await api("install_pack", { packId: PACK_ID });
  if (imp.status !== 200) throw new Error(`install_pack failed: ${JSON.stringify(imp)}`);
  const prof = await api("create_profile", { displayName: PROFILE });
  if (prof.status !== 200) throw new Error(`create_profile failed: ${JSON.stringify(prof)}`);
  const profileId = prof.value?.id;
  if (!profileId) throw new Error(`create_profile returned no id: ${JSON.stringify(prof)}`);
  const sw = await api("switch_pack", { profileId, packId: PACK_ID });
  if (sw.status !== 200) throw new Error(`switch_pack failed: ${JSON.stringify(sw)}`);
  result.profileId = profileId;

  // ---- browser: the real app on a phone viewport. ----
  const profileDir = mkdtempSync(join(tmpdir(), "lts-firstscreen-chrome-"));
  chromeDir = profileDir;
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
  for (let i = 0; !wsUrl && i < 100; i++) await sleep(100);
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
  const { targetId } = await send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
  await send("Page.enable", {}, sessionId);
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
  async function shot(name, viewportOnly = true) {
    const s = await send(
      "Page.captureScreenshot",
      { format: "png", captureBeyondViewport: !viewportOnly },
      sessionId,
    );
    writeFileSync(join(OUT, `${name}-${TAG}.png`), Buffer.from(s.data, "base64"));
  }

  await send(
    "Emulation.setDeviceMetricsOverride",
    { width: VW, height: VH, deviceScaleFactor: 1, mobile: true },
    sessionId,
  );
  await send("Page.navigate", { url: `${BASE}/?v=firstscreen` }, sessionId);
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
            if (n && (n.textContent ?? '').includes(${JSON.stringify(PROFILE)})) return true;
          }
          return false;
        });
      if (!el) return false;
      el.click();
      return true;
    })()`);
  }
  if (!resumed) throw new Error(`navigation error: profile chooser never offered ${PROFILE}`);

  // ---- stable pack-loaded home before ANY measurement (load-flicker rule). ----
  const homeHealthy = () =>
    evaluate(`(() => {
      const t = document.body.innerText;
      return (
        !t.includes('No language is set') &&
        !t.includes('could not read which language pack') &&
        t.includes('Russian Reference Pack') &&
        document.querySelectorAll('[data-unit]').length > 0
      );
    })()`);
  let healthyStreak = 0;
  for (let i = 0; i < 40 && healthyStreak < 3; i++) {
    await sleep(300);
    healthyStreak = (await homeHealthy()) ? healthyStreak + 1 : 0;
  }
  check(
    "home reached a stable pack-loaded state before measurement (no load flicker)",
    healthyStreak >= 3,
    { healthyStreak },
  );
  if (healthyStreak < 3)
    throw new Error("navigation error: home never settled into a pack-loaded state");

  // ---- THE first screen, no manual scroll: the frontier pin must sit fully
  // inside the first viewport and the meta must not. The app's load-time
  // auto-scroll (PATH-PIN-CONSISTENCY-001) is re-pinned here at phone size. ----
  const fold = await evaluate(`(() => {
    const pin = document.querySelector('[data-testid="path-pin"]');
    const row = pin?.closest('li[data-unit]');
    const r = row?.getBoundingClientRect();
    const greet = document.querySelector('h1');
    const gr = greet?.getBoundingClientRect();
    const seg = document.querySelector('[aria-label="Time budget"]');
    const sr = seg?.getBoundingClientRect();
    const overlaps = (x) => Boolean(x) && x.bottom > 0 && x.top < innerHeight;
    return {
      unit: row?.getAttribute('data-unit') ?? null,
      top: r ? Math.round(r.top) : null,
      bottom: r ? Math.round(r.bottom) : null,
      innerHeight,
      pinVisible: Boolean(r) && r.top >= 0 && r.bottom <= innerHeight,
      scrollY: Math.round(scrollY),
      greetingShown: overlaps(gr),
      budgetShown: overlaps(sr),
      docHeight: Math.round(document.documentElement.scrollHeight),
    };
  })()`);
  check(
    "the frontier node sits fully inside the first viewport on load (no manual scroll)",
    fold.pinVisible,
    fold,
  );
  check(
    "meta (greeting, time budget) does not occupy the pin-centred first screen",
    !fold.greetingShown && !fold.budgetShown,
    { greetingShown: fold.greetingShown, budgetShown: fold.budgetShown },
  );
  result.fold = fold;

  // ---- ONE prominent start pill, anchored on the pinned node. ----
  const pill = await evaluate(`(() => {
    const pills = [...document.querySelectorAll('[data-testid="path-start-pill"]')];
    const p = pills[0];
    if (!p) return { count: pills.length, present: false };
    const r = p.getBoundingClientRect();
    const cs = getComputedStyle(p);
    const row = p.closest('li[data-unit]');
    const pinRow = row && Boolean(row.querySelector('[data-testid="path-pin"]'));
    const planCtas = [...document.querySelectorAll('button')].filter((b) =>
      (b.textContent ?? '').includes("Start today's plan"));
    return {
      count: pills.length,
      present: true,
      onPinRow: pinRow,
      label: (p.textContent ?? '').trim(),
      height: Math.round(r.height),
      bg: cs.backgroundColor,
      intersectsViewport: r.bottom > 0 && r.top < innerHeight,
      planCtaCount: planCtas.length,
      planCtaIsPill: planCtas.length === 1 && planCtas[0] === p,
    };
  })()`);
  check(
    "exactly one start pill exists and rides the pinned node's row",
    pill.present && pill.count === 1 && pill.onPinRow === true,
    pill,
  );
  check(
    "the pill is prominent: >=44px tall, accent-filled, and visible in the first viewport",
    pill.present &&
      pill.height >= 44 &&
      pill.bg !== "rgba(0, 0, 0, 0)" &&
      pill.bg !== "transparent" &&
      pill.intersectsViewport === true,
    { height: pill.height, bg: pill.bg, intersectsViewport: pill.intersectsViewport },
  );
  check(
    "the pill is the ONLY plan CTA on Today (the begin block moved, never duplicated)",
    pill.present && pill.planCtaCount === 1 && pill.planCtaIsPill === true,
    { planCtaCount: pill.planCtaCount, planCtaIsPill: pill.planCtaIsPill },
  );

  // ---- fold-0 visual oracle (viewport-only: this is what the learner sees). ----
  await shot("firstscreen-fold0", true);
  if (!(await homeHealthy())) {
    let streak2 = 0;
    for (let i = 0; i < 40 && streak2 < 3; i++) {
      await sleep(300);
      streak2 = (await homeHealthy()) ? streak2 + 1 : 0;
    }
    if (streak2 < 3)
      throw new Error("navigation error: home dropped pack state after the fold-0 shot");
    await shot("firstscreen-fold0", true);
  }
  check("fold-0 screenshot re-validated: home still pack-loaded and on the path", true, {
    retaken: false,
  });

  // ---- one tap from the pill to the practice surface. ----
  const tapped = await evaluate(`(() => {
    const p = document.querySelector('[data-testid="path-start-pill"]');
    if (!p) return false;
    p.click();
    return true;
  })()`);
  if (!tapped) throw new Error("navigation error: no start pill to tap");
  let inPractice = false;
  for (let i = 0; i < 20 && !inPractice; i++) {
    await sleep(300);
    inPractice = await evaluate(`(() => {
      return Boolean(document.querySelector('[aria-label="Lesson"]')) ||
        Boolean(document.querySelector('[aria-label="Choices"] button'));
    })()`);
  }
  check(
    "one tap on the pill lands on the practice surface (lesson card or first choices)",
    inPractice,
    { taps: 1 },
  );
  if (inPractice) await shot("firstscreen-after-pill-tap", true);
  await send("Emulation.clearDeviceMetricsOverride", {}, sessionId);

  if (result.failures === 0) console.log("ALL CHECKS PASS");
  else console.log(`${result.failures} CHECK(S) FAILED`);
} catch (e) {
  result.error = String(e?.message ?? e);
  console.error(`navigation/measure error: ${result.error}`);
  result.failures++;
} finally {
  writeFileSync(join(OUT, `result-${TAG}.json`), JSON.stringify(result, null, 2) + "\n");
  try {
    serve?.kill();
  } catch {
    // already gone
  }
  try {
    chrome?.kill();
  } catch {
    // already gone
  }
  try {
    if (chromeDir) rmSync(chromeDir, { recursive: true, force: true });
  } catch {
    // best effort
  }
  try {
    rmSync(dataDir, { recursive: true, force: true });
  } catch {
    // best effort
  }
}
process.exit(result.failures > 0 ? 1 : 0);
