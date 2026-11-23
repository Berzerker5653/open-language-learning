#!/usr/bin/env node
/**
 * BAKEOFF-LIVECAPTURE-001 — live phone-viewport capture of the fixed Today
 * first screen (visual-inspection gate evidence, dev-only evidence tooling).
 *
 * Same plumbing as scripts/firstscreen-capture.mjs (real engine: lts-serve
 * over an isolated data dir + freshly created profile with NO seeded
 * traffic, headless Chrome at 390x844 mobile via CDP
 * Emulation.setDeviceMetricsOverride — no new deps), but this run serves
 * the CURRENT dist on the card's port 127.0.0.1:17631 and applies the
 * three LEARNER assertions the visual-inspection gate demands
 * (docs/design/PROGRESSION-UX-AUDIT-2026-11-22.md § MARKET NAVIGATION
 * RULES + owner gate 2026-11-23: a green harness is not an inspection —
 * the PNGs here are for reading as a learner):
 *   1. the first fully-visible content IS the frontier node with its Start
 *      pill: the pinned row sits fully inside the fold, the pill rides the
 *      pin row, and NEITHER serve-mode infra strings (SERVE-BANNER-001
 *      list) NOR Today meta (greeting h1, time-budget segment) intersect
 *      the first fold — measured at the load-time auto-scroll AND at
 *      scrollY 0 (the DOM order the learner gets before any scroll);
 *   2. ZERO locked path nodes above the pinned/current node, measured on
 *      document coordinates (locked row top above the pin row top);
 *   3. ONE interaction — a single tap on the frontier node's Start pill —
 *      lands on the practice surface (lesson card or drill choices).
 * Sequence of folds captured: fold0 at load, document-top fold (scroll 0),
 * full path beyond viewport (proves locked-below visually), and the
 * post-tap practice surface. Every measured value lands in audit.json;
 * navigation errors ride INTO the audit (MOBILE-UX-001 rule); any failed
 * assertion exits non-zero, so this file IS the gate.
 *
 *   usage: SERVE_BIN=<path> SERVE_DIST=<dist dir> \
 *          node scripts/bakeoff-today-livecapture.mjs
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
const TAG = process.env.CAPTURE_TAG ?? "green";
const OUT = join(REPO, "state/evidence/BAKEOFF-LIVECAPTURE-001");
mkdirSync(OUT, { recursive: true });
const PACK_ID = "org.openlanguage.ru-ru.reference";
const PROFILE = "Bakeoff Fresh";
const VW = 390;
const VH = 844;
// The card names this exact port for the live serve instance.
const PORT = 17631;
const BASE = `http://127.0.0.1:${PORT}`;

// The infra strings the first fold must never carry (SERVE-BANNER-001 list,
// substrings of the server's own /api/capabilities lines).
const INFRA = ["Browser mode", "serve bridge", "install progress", "Privacy settings", "secure context"];

const result = { viewport: `${VW}x${VH}`, port: PORT, tag: TAG, checks: [], failures: 0, error: null };
const check = (name, pass, measured) => {
  result.checks.push({ name, pass, measured });
  if (!pass) result.failures++;
  console.log(`${pass ? "PASS" : "FAIL"} ${name} — ${JSON.stringify(measured)}`);
};

const dataDir = mkdtempSync(join(tmpdir(), "lts-bakeoffcap-data-"));
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
  throw new Error(`serve did not answer capabilities on :${PORT}:\n${serveLog.slice(-1200)}`);
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
  const profileDir = mkdtempSync(join(tmpdir(), "lts-bakeoffcap-chrome-"));
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
  await send("Page.navigate", { url: `${BASE}/?v=bakeoffcap` }, sessionId);
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
        document.querySelectorAll('[data-unit]').length > 0 &&
        document.querySelectorAll('[data-testid="path-pin"]').length === 1
      );
    })()`);
  let healthyStreak = 0;
  for (let i = 0; i < 40 && healthyStreak < 3; i++) {
    await sleep(300);
    healthyStreak = (await homeHealthy()) ? healthyStreak + 1 : 0;
  }
  check(
    "fresh home reached a stable pack-loaded state with exactly one pin before measurement",
    healthyStreak >= 3,
    { healthyStreak },
  );
  if (healthyStreak < 3)
    throw new Error("navigation error: home never settled into a pack-loaded pinned state");

  // ---- fold-0 visual oracle at the load state the learner actually gets. ----
  await shot("bakeoff-fold0", true);

  // ---- ASSERTION 1 at auto-scroll: the pin row is the first fully-visible
  // learner content, with its Start pill; no meta, no infra. ----
  const fold = await evaluate(`(() => {
    const infra = ${JSON.stringify(INFRA)};
    const hits = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    let node;
    while ((node = walker.nextNode())) {
      const text = (node.textContent ?? '').trim();
      if (!text) continue;
      const el = node.parentElement;
      if (!el) continue;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      range.selectNodeContents(node);
      const r = range.getBoundingClientRect();
      if (r.bottom <= 0 || r.top >= ${VH}) continue; // not in the first fold
      for (const s of infra) {
        if (text.includes(s)) hits.push({ string: s, snippet: text.slice(0, 120) });
      }
    }
    const pin = document.querySelector('[data-testid="path-pin"]');
    const row = pin?.closest('li[data-unit]');
    const r = row?.getBoundingClientRect();
    const pill = document.querySelector('[data-testid="path-start-pill"]');
    const pr = pill?.getBoundingClientRect();
    const greet = document.querySelector('h1');
    const gr = greet?.getBoundingClientRect();
    const seg = document.querySelector('[aria-label="Time budget"]');
    const sr = seg?.getBoundingClientRect();
    const overlaps = (x) => Boolean(x) && x.bottom > 0 && x.top < innerHeight;
    return {
      scrollY: Math.round(scrollY),
      unit: row?.getAttribute('data-unit') ?? null,
      pinTop: r ? Math.round(r.top) : null,
      pinBottom: r ? Math.round(r.bottom) : null,
      pinVisible: Boolean(r) && r.top >= 0 && r.bottom <= innerHeight,
      pillCount: document.querySelectorAll('[data-testid="path-start-pill"]').length,
      pillOnPinRow: Boolean(pill && pill.closest('li[data-unit]') === row),
      pillLabel: pill ? (pill.textContent ?? '').trim() : null,
      pillHeight: pr ? Math.round(pr.height) : null,
      pillInFold: Boolean(pr) && pr.top >= 0 && pr.bottom <= innerHeight,
      foldInfraHits: hits.length,
      foldInfraSnippets: hits.slice(0, 6),
      greetingShown: overlaps(gr),
      budgetShown: overlaps(sr),
    };
  })()`);
  check(
    "A1a: the pinned frontier node + its single Start pill sit fully inside the first fold (no scroll)",
    fold.pinVisible && fold.pillCount === 1 && fold.pillOnPinRow && fold.pillInFold,
    fold,
  );
  check(
    "A1b: zero serve-mode infra strings inside the first fold",
    fold.foldInfraHits === 0,
    { foldInfraHits: fold.foldInfraHits, foldInfraSnippets: fold.foldInfraSnippets },
  );
  check(
    "A1c: Today meta (greeting h1, time budget) does not occupy the pin-centred first fold",
    !fold.greetingShown && !fold.budgetShown,
    { greetingShown: fold.greetingShown, budgetShown: fold.budgetShown },
  );
  result.fold = fold;

  // ---- ASSERTION 1 also at scrollY 0: the DOM order the learner gets
  // before any scroll must carry no infra block above the learner content;
  // the top visible strings ride into the audit for the visual inspection. ----
  const atTop = await evaluate(`(async () => {
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 150));
    const infra = ${JSON.stringify(INFRA)};
    const hits = [];
    const topTexts = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    let node;
    while ((node = walker.nextNode())) {
      const text = (node.textContent ?? '').trim();
      if (!text) continue;
      const el = node.parentElement;
      if (!el) continue;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      range.selectNodeContents(node);
      const r = range.getBoundingClientRect();
      if (r.bottom <= 0 || r.top >= ${VH}) continue;
      for (const s of infra) {
        if (text.includes(s)) hits.push({ string: s, snippet: text.slice(0, 120) });
      }
      topTexts.push({ top: Math.round(r.top), text: text.slice(0, 80) });
    }
    topTexts.sort((a, b) => a.top - b.top);
    const pin = document.querySelector('[data-testid="path-pin"]');
    const row = pin?.closest('li[data-unit]');
    const rr = row?.getBoundingClientRect();
    return {
      scrollY: Math.round(window.scrollY),
      foldInfraHits: hits.length,
      foldInfraSnippets: hits.slice(0, 6),
      topVisibleTexts: topTexts.slice(0, 8),
      pinTopAtDocTop: rr ? Math.round(rr.top) : null,
      pinBottomAtDocTop: rr ? Math.round(rr.bottom) : null,
      pinFullyVisibleAtDocTop: Boolean(rr) && rr.top >= 0 && rr.bottom <= innerHeight,
    };
  })()`);
  result.atDocumentTop = atTop;
  check(
    "A1d: at document top (scrollY 0) the first fold carries zero infra strings",
    atTop.foldInfraHits === 0,
    { foldInfraHits: atTop.foldInfraHits, foldInfraSnippets: atTop.foldInfraSnippets },
  );
  await shot("bakeoff-document-top", true);

  // ---- ASSERTION 2: zero locked nodes above the pinned/current node,
  // measured on document coordinates (rows are the whole path; the fold
  // only shows part of it). ----
  const order = await evaluate(`(() => {
    const rows = [...document.querySelectorAll('li[data-unit]')];
    const pinIdx = rows.findIndex(
      (r) => r.querySelector('[data-testid="path-pin"]') !== null,
    );
    const pin = rows[pinIdx];
    const pinPageTop = pin.getBoundingClientRect().top + scrollY;
    const lockedAbove = [];
    const lockedAfter = [];
    rows.forEach((r, i) => {
      if (r.getAttribute('data-state') !== 'locked') return;
      const pageTop = r.getBoundingClientRect().top + scrollY;
      (pageTop < pinPageTop ? lockedAbove : lockedAfter).push({
        unit: r.getAttribute('data-unit'),
        index: i,
        pageTop: Math.round(pageTop),
      });
    });
    return {
      rowCount: rows.length,
      pinIndex: pinIdx,
      pinUnit: pin?.getAttribute('data-unit') ?? null,
      pinPageTop: Math.round(pinPageTop),
      lockedAboveCount: lockedAbove.length,
      lockedAbove: lockedAbove.slice(0, 10),
      lockedBelowCount: lockedAfter.length,
      states: rows.map((r) => r.getAttribute('data-state')),
    };
  })()`);
  result.pathOrder = order;
  check(
    "A2: ZERO locked path nodes render above the pinned/current node",
    order.lockedAboveCount === 0 && order.pinIndex >= 0,
    {
      lockedAboveCount: order.lockedAboveCount,
      lockedAbove: order.lockedAbove,
      pinIndex: order.pinIndex,
      lockedBelowCount: order.lockedBelowCount,
    },
  );

  // ---- full-path beyond-viewport shot: proves locked-below visually.
  // Scroll back to the pin first so the capture starts where the learner is. ----
  await evaluate(`(() => {
    const pin = document.querySelector('[data-testid="path-pin"]');
    const row = pin?.closest('li[data-unit]');
    row?.scrollIntoView({ block: 'start' });
    return true;
  })()`);
  await sleep(200);
  await shot("bakeoff-fullpath", false);

  // ---- ASSERTION 3: ONE interaction (tap the frontier node's Start pill)
  // lands on the practice surface: lesson card or first drill question. ----
  const tapped = await evaluate(`(() => {
    const p = document.querySelector('[data-testid="path-start-pill"]');
    if (!p) return false;
    p.click();
    return true;
  })()`);
  if (!tapped) throw new Error("navigation error: no start pill to tap");
  let practice = null;
  for (let i = 0; i < 30 && !practice; i++) {
    await sleep(300);
    practice = await evaluate(`(() => {
      const lesson = document.querySelector('[aria-label="Lesson"]');
      const choices = document.querySelector('[aria-label="Choices"]');
      if (!lesson && !choices) return null;
      const prompt =
        (lesson?.querySelector('h1, h2, p')?.textContent ?? '').trim() ||
        (document.body.innerText ?? '').split('\\n').find((l) => l.trim().length > 12) ||
        null;
      return {
        surface: lesson ? 'lesson' : 'drill-choices',
        prompt: prompt ? prompt.slice(0, 160) : null,
        choiceCount: choices ? choices.querySelectorAll('button').length : 0,
      };
    })()`);
  }
  check(
    "A3: one tap on the frontier Start pill reaches the first practice/drill question",
    Boolean(practice),
    { taps: 1, practice },
  );
  result.practice = practice;
  if (practice) await shot("bakeoff-after-pill-tap", true);
  await send("Emulation.clearDeviceMetricsOverride", {}, sessionId);

  result.failures === 0
    ? console.log("ALL CHECKS PASS")
    : console.log(`${result.failures} CHECK(S) FAILED`);
} catch (e) {
  result.error = String(e?.message ?? e);
  console.error(`navigation/measure error: ${result.error}`);
  result.failures++;
} finally {
  writeFileSync(join(OUT, `audit-${TAG}.json`), JSON.stringify(result, null, 2) + "\n");
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
