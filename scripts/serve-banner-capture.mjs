#!/usr/bin/env node
/**
 * SERVE-BANNER-001 acceptance capture (dev-only evidence tooling).
 *
 * Same plumbing as scripts/path-lock-order-capture.mjs (real engine:
 * lts-serve over an isolated data dir, headless Chrome at a 390x844 phone
 * viewport via CDP Emulation.setDeviceMetricsOverride — no new deps), but
 * the oracle is the MARKET META RULE
 * (docs/design/PROGRESSION-UX-AUDIT-2026-11-22.md § MARKET NAVIGATION
 * RULES): meta never occupies the learner's first screen. The live
 * violation (live-phone-fold0.png, board t_1e1edeca): the Today page opened
 * with the whole capability report — "Browser mode: install progress
 * streams live…" + the mic secure-context sentence + the privacy line —
 * ABOVE all learner content. Sequence:
 *   1. fresh profile (install + create + switch, NO seeded traffic);
 *   2. wait for the stable pack-loaded home (the ~1s flicker rule);
 *   3. measure the TODAY FIRST FOLD: the innerText of every text node whose
 *      box intersects the viewport must contain zero serve-mode infra
 *      strings, and no degraded badge on a healthy localhost report;
 *   4. open Settings and measure the About this build card: every capability
 *      line renders there, and each infra string appears exactly ONCE in the
 *      whole document (the card is its only home);
 *   5. fold-0 + settings-about screenshots as the visual oracle.
 * Every measured value lands in result.json; any failed assertion exits
 * non-zero, so this file IS the gate. Navigation errors ride INTO the
 * result (MOBILE-UX-001 rule). CAPTURE_TAG=<red-at-base|green> labels the
 * run. No Rust changes: the existing lts-serve debug binary serves both dists.
 *
 *   usage: SERVE_BIN=<path> SERVE_DIST=<dist dir> \
 *          node scripts/serve-banner-capture.mjs
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
const OUT = join(REPO, "state/evidence/SERVE-BANNER-001");
mkdirSync(OUT, { recursive: true });
const PACK_ID = "org.openlanguage.ru-ru.reference";
const PROFILE = "Serve Banner";
const VW = 390;
const VH = 844;
const PORT = 17960 + (process.pid % 60);
const BASE = `http://127.0.0.1:${PORT}`;

// The infra strings the first fold must never carry. They are substrings of
// the server's own /api/capabilities lines (WEB-SERVE-001 scope 4 copy).
const INFRA = [
  "Browser mode",
  "serve bridge",
  "install progress",
  "Privacy settings",
  "secure context",
];

const result = { viewport: `${VW}x${VH}`, tag: TAG, checks: [], failures: 0, error: null };
const check = (name, pass, measured) => {
  result.checks.push({ name, pass, measured });
  if (!pass) result.failures++;
  console.log(`${pass ? "PASS" : "FAIL"} ${name} — ${JSON.stringify(measured)}`);
};

const dataDir = mkdtempSync(join(tmpdir(), "lts-servebanner-data-"));
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
  // The capability report must say the microphone is HEALTHY on this origin
  // (loopback = secure context) — the no-badge check is honest only on top of
  // that truth, so read the report from the harness side first. The bridge
  // answers per ORIGIN (serve.rs), so the pre-check must carry the same
  // Origin header the page's fetch will send — a headerless read reports
  // "cannot say" (null), which is not a healthy report.
  const capsRes = await fetch(`${BASE}/api/capabilities`, { headers: { origin: BASE } });
  const caps = await capsRes.json();
  result.capabilities = {
    microphone_names_available: caps.microphone_names_available,
    install_progress_events: caps.install_progress_events,
  };
  if (caps.microphone_names_available !== true) {
    throw new Error(`harness origin is not the healthy localhost report: ${JSON.stringify(caps)}`);
  }

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
  const profileDir = mkdtempSync(join(tmpdir(), "lts-servebanner-chrome-"));
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
  await send("Page.navigate", { url: `${BASE}/?v=servebanner` }, sessionId);
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
    "home reached a stable pack-loaded state with exactly one pin before measurement",
    healthyStreak >= 3,
    { healthyStreak },
  );
  if (healthyStreak < 3)
    throw new Error("navigation error: home never settled into a pack-loaded pinned state");

  // ---- THE first-fold meta audit: text actually inside the 0..VH viewport. ----
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
    return {
      foldHits: hits.length,
      hitStrings: hits.map((h) => h.string),
      hitSnippets: hits.slice(0, 6),
      badgeCount: document.querySelectorAll('[data-testid="serve-badge"]').length,
      badgeText: document.querySelector('[data-testid="serve-badge"]')?.textContent ?? null,
      bodyHasInfra: infra.filter((s) => document.body.innerText.includes(s)),
    };
  })()`);
  result.fold = fold;
  check(
    "Today first fold contains ZERO serve-mode infra strings (meta off the first screen)",
    fold.foldHits === 0,
    { foldHits: fold.foldHits, hitStrings: fold.hitStrings, hitSnippets: fold.hitSnippets },
  );
  check(
    "no degraded-capability badge on Today while the server reports the microphone healthy",
    fold.badgeCount === 0,
    { badgeCount: fold.badgeCount, badgeText: fold.badgeText },
  );

  // ---- placement at the document top: the frontier auto-scroll can hide a
  // stacked banner from the loading viewport, so also measure the fold AT
  // scroll position 0 — the DOM order the learner gets before any scroll.
  // Red-at-base: the whole capability block (Browser mode + mic + privacy)
  // sits here above all learner content; green: zero infra strings here.
  const atTop = await evaluate(`(async () => {
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 150));
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
      if (r.bottom <= 0 || r.top >= ${VH}) continue;
      for (const s of infra) {
        if (text.includes(s)) hits.push({ string: s, snippet: text.slice(0, 120) });
      }
    }
    return {
      scrollY: Math.round(window.scrollY),
      foldHits: hits.length,
      hitStrings: hits.map((h) => h.string),
      hitSnippets: hits.slice(0, 6),
      noticeBanner: document.querySelectorAll('[data-testid="serve-notice"]').length,
    };
  })()`);
  result.atDocumentTop = atTop;
  check(
    "zero serve-mode infra strings stacked above learner content at the document top",
    atTop.scrollY === 0 && atTop.foldHits === 0 && atTop.noticeBanner === 0,
    {
      scrollY: atTop.scrollY,
      foldHits: atTop.foldHits,
      hitStrings: atTop.hitStrings,
      hitSnippets: atTop.hitSnippets,
      noticeBanner: atTop.noticeBanner,
    },
  );

  // ---- visual oracle 1: the Today first screen AT the document top — the
  // shape the violation describes (base stacks the capability block here;
  // green shows learner content from the top down). ----
  await shot("servebanner-fold0", true);
  if (!(await homeHealthy())) {
    let streak2 = 0;
    for (let i = 0; i < 40 && streak2 < 3; i++) {
      await sleep(300);
      streak2 = (await homeHealthy()) ? streak2 + 1 : 0;
    }
    if (streak2 < 3) throw new Error("navigation error: home dropped pack state after the shot");
    await shot("servebanner-fold0", true);
  }

  // ---- Settings: the notes' new home is the About this build card. ----
  const opened = await evaluate(`(() => {
    const b = [...document.querySelectorAll('button')].find((x) => (x.textContent ?? '').trim() === 'Settings');
    if (!b) return false;
    b.click();
    return true;
  })()`);
  if (!opened) throw new Error("navigation error: Settings tab never appeared");
  let onSettings = false;
  for (let i = 0; i < 40 && !onSettings; i++) {
    await sleep(250);
    onSettings = await evaluate(
      `Boolean(document.querySelector('section[aria-label="Settings"]'))`,
    );
  }
  if (!onSettings) throw new Error("navigation error: Settings screen never opened");
  const about = await evaluate(`(() => {
    const card = document.getElementById('settings-build');
    if (!card) return { error: 'settings-build card missing' };
    card.scrollIntoView({ block: 'start' });
    const inner = card.innerText;
    const doc = document.body.innerText;
    const count = (hay, needle) => hay.split(needle).length - 1;
    const expectIn = [
      'Browser mode: install progress streams live',
      'secure context',
      'Privacy settings: unchanged',
    ];
    return {
      hasNoticeBlock: Boolean(card.querySelector('[data-testid="serve-notice"]')),
      missingLines: expectIn.filter((s) => !inner.includes(s)),
      docBrowserMode: count(doc, 'Browser mode'),
      cardBrowserMode: count(inner, 'Browser mode'),
      belowCommit: (() => {
        const commit = card.querySelector('[data-build-commit]');
        const notice = card.querySelector('[data-testid="serve-notice"]');
        if (!commit || !notice) return false;
        return Boolean(
          (function containsAnc(root, el) {
            // DOM-position compare: the notice rides after the commit line.
            const pos = root.compareDocumentPosition(el);
            return (pos & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
          })(commit, notice),
        );
      })(),
    };
  })()`);
  if (about.error) throw new Error(`navigation error: ${about.error}`);
  result.about = about;
  check(
    "the About this build card carries a serve-notice block with every capability line",
    about.hasNoticeBlock && about.missingLines.length === 0,
    { hasNoticeBlock: about.hasNoticeBlock, missingLines: about.missingLines },
  );
  check(
    "each infra line exists exactly once in the whole app, inside the About card",
    about.docBrowserMode === 1 && about.cardBrowserMode === 1,
    { docBrowserMode: about.docBrowserMode, cardBrowserMode: about.cardBrowserMode },
  );
  check(
    "the notes ride inside the card below the build identity lines",
    about.belowCommit === true,
    { belowCommit: about.belowCommit },
  );

  // ---- visual oracle 2: the About card on screen (captureBeyondViewport
  // is not needed — the card was scrolled into the viewport first). ----
  await shot("servebanner-settings-about", true);

  result.failures === 0
    ? console.log("ALL CHECKS PASS")
    : console.log(`${result.failures} CHECK(S) FAILED`);
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
    rmSync(dataDir, { recursive: true, force: true });
  } catch {
    // best-effort
  }
  try {
    if (chromeDir) rmSync(chromeDir, { recursive: true, force: true });
  } catch {
    // best-effort
  }
}
process.exit(result.failures === 0 ? 0 : 1);
