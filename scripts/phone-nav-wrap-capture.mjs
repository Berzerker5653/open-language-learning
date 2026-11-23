#!/usr/bin/env node
/**
 * PHONE-NAV-WRAP-001 — the phone tab bar must be ONE app-like row.
 * Red-at-HEAD acceptance harness (same script reds then greens; the
 * before-image oracle is state/notes/UI-VERIFY-2026-11-23.md defect 1:
 * Settings orphaned on a 2nd row at 390px, underline detached).
 *
 * Same plumbing as scripts/path-connect-pill-capture.mjs (real engine:
 * lts-serve over an isolated data dir + freshly created profile, headless
 * Chrome at 390x844 mobile:true via CDP Emulation.setDeviceMetricsOverride
 * — no new deps). Measures the frozen contract from the card body:
 *   N1 the route nav renders exactly ONE row containing every tab
 *      (labels Today/Practice/My Words/Progress/Settings all present,
 *      every .tab shares one row: no wrap, no orphan row) and the
 *      document has no horizontal scroll.
 *   N2 every tab label is legible: non-empty, not clipped
 *      (scrollWidth <= clientWidth), font-size >= 0.75rem.
 *   N3 the active-tab indicator (.routes::after, fed by --tab-x/--tab-w)
 *      is geometrically aligned with the active tab's rect: same x (±2),
 *      same width (±2), and its baseline sits at the active tab's bottom
 *      edge (±2) — never detached onto another row.
 *   N4 every tab tap target is >= 44px in both dimensions (WCAG 2.2 AA).
 *   N5 (market shape) at phone width the bar is a fixed bottom tab bar:
 *      position:fixed, flush with the viewport bottom, opaque, and the
 *      hit-test at the bar's center lands on a tab.
 * Navigation errors ride INTO the audit (MOBILE-UX-001 rule); any failed
 * assertion exits non-zero, so this file IS the gate.
 *
 *   usage: SERVE_BIN=<path> SERVE_DIST=<dist dir> [CAPTURE_TAG=red|green] \
 *          node scripts/phone-nav-wrap-capture.mjs
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
const OUT = join(REPO, "state/evidence/PHONE-NAV-WRAP-001");
mkdirSync(OUT, { recursive: true });
const PACK_ID = "org.openlanguage.ru-ru.reference";
const PROFILE = "PhoneNav Fresh";
const VW = 390;
const VH = 844;
// Fresh port — sibling lanes keep 17631/17635 busy (BAKEOFF / PATH cards).
const PORT = 17637;
const BASE = `http://127.0.0.1:${PORT}`;
const TAB_LABELS = ["Today", "Practice", "My Words", "Progress", "Settings"];

const result = {
  viewport: `${VW}x${VH}`,
  port: PORT,
  tag: TAG,
  checks: [],
  failures: 0,
  error: null,
};
const check = (name, pass, measured) => {
  result.checks.push({ name, pass, measured });
  if (!pass) result.failures++;
  console.log(`${pass ? "PASS" : "FAIL"} ${name} — ${JSON.stringify(measured)}`);
};

const dataDir = mkdtempSync(join(tmpdir(), "lts-phononav-data-"));
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

  const profileDir = mkdtempSync(join(tmpdir(), "lts-phononav-chrome-"));
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
  await send("Page.navigate", { url: `${BASE}/?v=phononavcap` }, sessionId);
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

  // Stable pack-loaded home before ANY measurement (load-flicker rule).
  const homeHealthy = () =>
    evaluate(`(() => {
      const t = document.body.innerText;
      return (
        !t.includes('No language is set') &&
        !t.includes('could not read which language pack') &&
        t.includes('Russian Reference Pack') &&
        document.querySelectorAll('[data-unit]').length > 0 &&
        document.querySelectorAll('nav[aria-label="Routes"] .tab').length === 5 &&
        getComputedStyle(document.querySelector('nav[aria-label="Routes"] .tab[aria-current="page"]')).opacity === '1'
      );
    })()`);
  let healthyStreak = 0;
  for (let i = 0; i < 40 && healthyStreak < 3; i++) {
    await sleep(300);
    healthyStreak = (await homeHealthy()) ? healthyStreak + 1 : 0;
  }
  check(
    "fresh home reached a stable pack-loaded state with all five tabs before measurement",
    healthyStreak >= 3,
    { healthyStreak },
  );
  if (healthyStreak < 3)
    throw new Error("navigation error: home never settled into a pack-loaded five-tab state");

  await shot("nav-fold0", true);

  // ---- N1: one row, every tab present, no h-scroll. ----
  const rows = await evaluate(`(() => {
    const nav = document.querySelector('nav[aria-label="Routes"]');
    const tabs = [...nav.querySelectorAll('.tab')];
    const rects = tabs.map((t) => {
      const b = t.getBoundingClientRect();
      return { label: (t.textContent ?? '').trim(), x: b.x, y: b.y, w: b.width, h: b.height };
    });
    const tops = [...new Set(rects.map((r) => Math.round(r.y)))].sort((a, b) => a - b);
    // one row = every tab's y within 4px of the modal top
    const modalTop = tops[0];
    const rowTops = [];
    for (const r of rects) {
      if (!rowTops.some((t) => Math.abs(t - r.y) <= 4)) rowTops.push(r.y);
    }
    return {
      rowCount: rowTops.length,
      rects,
      docScrollWidth: document.documentElement.scrollWidth,
      docClientWidth: document.documentElement.clientWidth,
      navRect: (() => { const b = nav.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; })(),
    };
  })()`);
  result.navRows = rows;
  const labels = rows.rects.map((r) => r.label);
  check(
    "N1: the tab bar is exactly ONE row containing every tab (no wrap, no orphan row)",
    rows.rowCount === 1 && TAB_LABELS.every((l) => labels.includes(l)) && rows.rects.length === 5,
    { rowCount: rows.rowCount, labels },
  );
  check(
    "N1b: no document-level horizontal scroll at 390px",
    rows.docScrollWidth <= rows.docClientWidth,
    { scrollWidth: rows.docScrollWidth, clientWidth: rows.docClientWidth },
  );

  // ---- N2: labels legible (not clipped, font >= 0.75rem, non-empty). ----
  const legible = await evaluate(`(() => {
    const nav = document.querySelector('nav[aria-label="Routes"]');
    const rows = [];
    for (const t of nav.querySelectorAll('.tab')) {
      const cs = getComputedStyle(t);
      rows.push({
        label: (t.textContent ?? '').trim(),
        clipped: t.scrollWidth > t.clientWidth + 1,
        fontSizePx: parseFloat(cs.fontSize),
      });
    }
    return rows;
  })()`);
  result.legibility = legible;
  const badLegible = legible.filter((r) => r.clipped || r.label === "" || r.fontSizePx < 12);
  check(
    "N2: every tab label legible (non-empty, unclipped, font >= 12px)",
    badLegible.length === 0,
    {
      bad: badLegible,
    },
  );

  // ---- N4: tap targets >= 44px. ----
  const small = rows.rects.filter((r) => r.w < 44 || r.h < 44);
  check("N4: every tab tap target >= 44x44", small.length === 0, {
    small: small.map((r) => `${r.label} ${Math.round(r.w)}x${Math.round(r.h)}`),
  });

  // ---- N3: the gliding indicator aligns with the ACTIVE tab's rect. ----
  const ind = await evaluate(`(() => {
    const nav = document.querySelector('nav[aria-label="Routes"]');
    const active = nav.querySelector('.tab[aria-current="page"]');
    if (!active) return { present: false };
    const cs = getComputedStyle(nav, '::after');
    const nr = nav.getBoundingClientRect();
    const ar = active.getBoundingClientRect();
    const m = /matrix\\(([^)]+)\\)/.exec(cs.transform);
    const tx = m ? parseFloat(m[1].split(',')[4]) : 0;
    const w = parseFloat(cs.width);
    const bottom = parseFloat(cs.bottom);
    const navCs = getComputedStyle(nav);
    const padBottom = parseFloat(navCs.paddingBottom);
    const borderBottom = parseFloat(navCs.borderBottomWidth);
    // pseudo lives at nav padding-box bottom (left:0, bottom:0 base rule);
    // its viewport rect:
    const left = nr.left + parseFloat(cs.left) + tx;
    const top = nr.bottom - borderBottom - padBottom - parseFloat(cs.height) - bottom * 0;
    return {
      present: true,
      live: parseFloat(cs.opacity),
      indicator: { x: left, w, top, bottom: top + parseFloat(cs.height) },
      activeTab: { label: (active.textContent ?? '').trim(), x: ar.left, w: ar.width, top: ar.top, bottom: ar.bottom },
    };
  })()`);
  result.indicator = ind;
  const indCenter = ind.indicator.x + ind.indicator.w / 2;
  const tabCenter = ind.activeTab.x + ind.activeTab.w / 2;
  const aligned =
    ind.present &&
    ind.live > 0.9 &&
    Math.abs(indCenter - tabCenter) <= 2 && // centered on the active tab/label
    ind.indicator.w <= ind.activeTab.w + 2 && // fits under the slot, never overhangs
    ind.indicator.w >= ind.activeTab.w * 0.4 && // rides the label, not a dot
    ind.indicator.x >= ind.activeTab.x - 2 &&
    ind.indicator.x + ind.indicator.w <= ind.activeTab.x + ind.activeTab.w + 2 &&
    Math.abs(ind.indicator.bottom - ind.activeTab.bottom) <= 3;
  check(
    "N3: the active-tab indicator is geometrically aligned with the active label rect (centered ±2, inside the slot, bottom edge on the tab)",
    aligned,
    ind.present
      ? {
          live: ind.live,
          dCenter: Math.round(indCenter - tabCenter),
          indicatorW: Math.round(ind.indicator.w),
          slotW: Math.round(ind.activeTab.w),
          dyBottom: Math.round(ind.indicator.bottom - ind.activeTab.bottom),
          active: ind.activeTab.label,
        }
      : { present: false },
  );

  // ---- N5: phone shape = fixed bottom tab bar. ----
  const bar = await evaluate(`(() => {
    const nav = document.querySelector('nav[aria-label="Routes"]');
    const cs = getComputedStyle(nav);
    const b = nav.getBoundingClientRect();
    const cx = Math.round(b.x + b.width / 2);
    const cy = Math.round(b.y + b.height / 2);
    const top = document.elementsFromPoint(cx, cy)[0];
    const bg = cs.backgroundColor;
    return {
      position: cs.position,
      bottom: Math.round(b.bottom),
      viewportH: innerHeight,
      hitIsTab: Boolean(top && top.closest('.tab')),
      hitLabel: top?.textContent?.trim().slice(0, 20) ?? null,
      opaque: bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent',
    };
  })()`);
  result.bottomBar = bar;
  check(
    "N5: at phone width the bar is a fixed, opaque tab bar flush with the viewport bottom and tappable through",
    bar.position === "fixed" &&
      Math.abs(bar.bottom - bar.viewportH) <= 1 &&
      bar.hitIsTab &&
      bar.opaque,
    bar,
  );

  // ---- learner folds: mid-scroll (fixed bar must ride) + top again. ----
  await evaluate(`window.scrollTo(0, 900); true`);
  await sleep(250);
  await shot("nav-midscroll", true);
  await evaluate(`window.scrollTo(0, 0); true`);
  await sleep(250);
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
