#!/usr/bin/env node
/**
 * PATH-SECTIONS-DEDUP-001 acceptance capture (dev-only evidence tooling).
 *
 * Same plumbing as scripts/path-visual-capture.mjs (real engine: lts-serve
 * over an isolated data dir, headless Chrome at a 390x844 phone viewport,
 * raw CDP — no new deps). The card's claim, measured here:
 *   1. the pack-level audit (unit-band-audit.json from
 *      tools/path_sections_audit.py) says every unit maps into exactly one
 *      band — zero unmapped;
 *   2. API: unit_path's nodes group into a canonical band ladder with NO
 *      duplicate band labels and per-band counts matching the audit
 *      (the nine tail journey units merge into A2/B1/B2, never beside);
 *   3. DOM at 390px: exactly ONE .path-section header row per band, in
 *      canonical order, each counter matching the audit's per-band count
 *      (the owner's screenshot showed 8 rows: a second A2/B1/B2 pair at
 *      0/3 each — that shape must be impossible now);
 *   4. after-screenshots of the sections header area at 390px.
 * Every measured value lands in result.json; any failed assertion exits
 * non-zero, so this file IS the gate. Navigation errors ride INTO the
 * result (MOBILE-UX-001 rule).
 *
 *   usage: SERVE_BIN=<path> SERVE_DIST=<dist dir> \
 *          node scripts/path-sections-capture.mjs
 */
import { spawn } from "node:child_process";
import {
  mkdirSync,
  writeFileSync,
  readFileSync,
  mkdtempSync,
  existsSync,
  rmSync,
} from "node:fs";
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
const OUT = join(REPO, "state/evidence/PATH-SECTIONS-DEDUP-001");
mkdirSync(OUT, { recursive: true });
const PACK_ID = "org.openlanguage.ru-ru.reference";
const PROFILE = "Sections Walker";
const VW = 390;
const VH = 844;
const PORT = 17900 + (process.pid % 60);
const BASE = `http://127.0.0.1:${PORT}`;

// The pack-level truth: every unit -> exactly one band, zero unmapped.
const audit = JSON.parse(
  readFileSync(join(OUT, "unit-band-audit.json"), "utf8"),
);
const auditSections = audit.sections; // { band: unitCount }

const result = { viewport: `${VW}x${VH}`, checks: [], failures: 0, error: null };
const check = (name, pass, measured) => {
  result.checks.push({ name, pass, measured });
  if (!pass) result.failures++;
  console.log(`${pass ? "PASS" : "FAIL"} ${name} — ${JSON.stringify(measured)}`);
};

const dataDir = mkdtempSync(join(tmpdir(), "lts-pathsections-data-"));
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
    } catch {}
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

// The same canonical ladder the fixed view groups by.
const LADDER = ["on-ramp", "a1", "a2", "b1", "b2", "c1", "c2", "other"];
const rankOf = (key, customs) => {
  const rung = LADDER.indexOf(key);
  return rung >= 0 ? rung : LADDER.length + customs.indexOf(key);
};
const sectionsFromNodes = (nodes) => {
  const customs = [];
  const groups = new Map();
  for (const n of nodes) {
    const raw = n.band && String(n.band).trim() ? n.band : "other";
    const key = raw.trim().toLowerCase();
    if (!groups.has(key)) {
      if (!LADDER.includes(key) && !customs.includes(key)) customs.push(key);
      groups.set(key, []);
    }
    groups.get(key).push(n);
  }
  return [...groups.entries()]
    .sort((a, b) => rankOf(a[0], customs) - rankOf(b[0], customs))
    .map(([key, list]) => ({ key, count: list.length }));
};

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

  // ---- API: the engine's unit nodes group into a duplicate-free ladder. ----
  const nodes = (await api("unit_path", { profileId })).value ?? [];
  check("unit_path reports the full pack path", nodes.length >= 800, { nodes: nodes.length });
  const apiSections = sectionsFromNodes(nodes);
  const apiKeys = apiSections.map((s) => s.key);
  check("API sections carry NO duplicate band label", new Set(apiKeys).size === apiKeys.length, {
    bands: apiKeys,
  });
  check("API section order is the canonical ladder",
    apiKeys.join(",") === "on-ramp,a1,a2,b1,b2",
    { order: apiKeys });
  const countsMatch = Object.entries(auditSections).every(
    ([band, n]) => apiSections.find((s) => s.key === band)?.count === n,
  );
  check("API per-band counts match the pack audit exactly", countsMatch, {
    audit: auditSections,
    api: Object.fromEntries(apiSections.map((s) => [s.key, s.count])),
  });

  // ---- browser: the real app on a phone viewport. ----
  const profileDir = mkdtempSync(join(tmpdir(), "lts-pathsections-chrome-"));
  chromeDir = profileDir;
  chrome = spawn(
    process.env.CHROME ?? "google-chrome-stable",
    [
      "--headless=new",
      "--no-sandbox",
      "--disable-gpu",
      "--remote-debugging-port=0",
      `--user-data-dir=${profileDir}`,
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
    writeFileSync(join(OUT, `${name}.png`), Buffer.from(s.data, "base64"));
  }

  await send(
    "Emulation.setDeviceMetricsOverride",
    { width: VW, height: VH, deviceScaleFactor: 1, mobile: true },
    sessionId,
  );
  await send("Page.navigate", { url: `${BASE}/?v=pathsections` }, sessionId);
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

  const homeHealthy = () =>
    evaluate(`(() => {
      const t = document.body.innerText;
      return (
        !t.includes('No language is set') &&
        !t.includes('could not read which language pack') &&
        t.includes('Russian Reference Pack') &&
        document.querySelectorAll('.path-section').length > 0
      );
    })()`);
  let healthyStreak = 0;
  for (let i = 0; i < 40 && healthyStreak < 3; i++) {
    await sleep(300);
    healthyStreak = (await homeHealthy()) ? healthyStreak + 1 : 0;
  }
  check("home reached a stable pack-loaded state before measurement (no load flicker)",
    healthyStreak >= 3, { healthyStreak });
  if (healthyStreak < 3)
    throw new Error("navigation error: home never settled into a pack-loaded state");

  // ---- the section headers: assert on ELEMENTS, never body text. ----
  await evaluate(`(() => {
    const first = document.querySelector('.path-section');
    if (first) first.scrollIntoView({ block: 'start' });
    return Boolean(first);
  })()`);
  await sleep(400);
  const dom = await evaluate(`(() => {
    const secs = [...document.querySelectorAll('.path-section')];
    return secs.map((s) => ({
      band: s.getAttribute('data-band'),
      name: s.querySelector('.path-section-name')?.textContent?.trim() ?? '',
      cefr: s.querySelector('.path-section-cefr')?.textContent?.trim() ?? '',
      count: s.querySelector('.path-section-count')?.textContent?.trim() ?? '',
    }));
  })()`);
  const domKeys = dom.map((s) => (s.band ?? "").trim().toLowerCase());
  check("exactly ONE section header row per band in the DOM",
    new Set(domKeys).size === domKeys.length && domKeys.length >= 5,
    { rows: domKeys.length, bands: domKeys });
  check("DOM section order is the canonical ladder",
    domKeys.join(",") === "on-ramp,a1,a2,b1,b2", { order: domKeys });
  // Counters read "done/total units done" — the TOTAL is what dedup fixes.
  const totals = Object.fromEntries(dom.map((s) => [
    (s.band ?? "").trim().toLowerCase(),
    Number((s.count.match(/\/(\d+)/) ?? [])[1] ?? NaN),
  ]));
  const domTotalsMatch = Object.entries(auditSections).every(
    ([band, n]) => totals[band] === n,
  );
  check("DOM per-band TOTALS match the pack audit (merged counts, no 0/3 strays)",
    domTotalsMatch, { audit: auditSections, domTotals: totals });
  check("no stray 0/3-style section exists (every total >= 20)",
    dom.every((s) => Number((s.count.match(/\/(\d+)/) ?? [])[1] ?? 0) >= 20),
    dom.map((s) => s.count));
  check("section banners carry friendly name + CEFR subtitle",
    dom.every((s) => s.name.length > 0 && (s.cefr.length > 0 || s.band === "on-ramp")),
    dom.map((s) => `${s.name}/${s.cefr}`));

  // One after-shot PER BAND header, and the shot is only trusted when the
  // header's own rect is provably inside the viewport at capture time
  // (MOBILE-UX-001 rule: an unseen screen must never yield a PASS png).
  // The scroll targets the header BUTTON, not the section container — an
  // open section is hundreds of nodes tall and centering it buries the
  // header above the viewport.
  const visible = [];
  for (const key of domKeys) {
    const inView = await evaluate(`(() => {
      const sec = [...document.querySelectorAll('.path-section')].find(
        (s) => (s.getAttribute('data-band') ?? '').trim().toLowerCase() === ${JSON.stringify(key)},
      );
      const btn = sec?.querySelector('.path-section-toggle');
      if (!btn) return false;
      btn.scrollIntoView({ block: 'center' });
      const r = btn.getBoundingClientRect();
      return r.top >= 0 && r.bottom <= window.innerHeight && r.height > 0;
    })()`);
    visible.push({ band: key, inView });
    await sleep(250);
    await shot(`path-section-${key}-390`, true);
  }
  check("every band header row was provably in-viewport for its own after-shot",
    visible.length === 5 && visible.every((v) => v.inView), visible);
  if (!(await homeHealthy()))
    throw new Error("navigation error: home dropped pack state during the per-band shots");
  await shot("path-sections-full", false);
} catch (err) {
  result.error = String(err?.message ?? err);
  result.failures++;
  console.error(`capture failed: ${result.error}`);
} finally {
  result.serveLogTail = (serve?.getLog?.() ?? "").slice(-2000);
  writeFileSync(join(OUT, "result.json"), JSON.stringify(result, null, 2) + "\n");
  chrome?.kill();
  serve?.kill();
  if (chromeDir) {
    await sleep(500);
    rmSync(chromeDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 });
  }
}
process.exit(result.failures > 0 ? 1 : 0);
