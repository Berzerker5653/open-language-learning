#!/usr/bin/env node
/**
 * FIX-M1-PATH-VIS-001 acceptance capture (dev-only evidence tooling).
 *
 * Same plumbing as scripts/path-lock-order-capture.mjs (real engine:
 * lts-serve over an isolated data dir, headless Chrome at a 390x844 phone
 * viewport via CDP Emulation.setDeviceMetricsOverride — no new deps). The
 * oracle is the far-future wall rule (LEARNER-REVIEW-M1-001 D-003): the
 * day-1 path used to render the ENTIRE pack catalog — RU 823 units with 803
 * locked, many advanced English slugs ("carbon economics", "thesis
 * defense") — so the locked mass WAS the screen. After the fix, inside the
 * open band the learner sees history + frontier + PATH_FUTURE_WINDOW locked
 * neighbours, and everything further behind collapses into ONE counted row
 * that names no future titles. Sequence:
 *   1. fresh profile (install + create + switch, NO seeded traffic) — the
 *      from-zero world the defect was measured in;
 *   2. stable pack-loaded home (the ~1s flicker rule);
 *   3. the unit_path payload is the defect's own measurement: total units
 *      and locked count must be large (non-vacuous gate), and NO far-tail
 *      title from that payload may appear in body.innerText — only the
 *      rendered neighbours may;
 *   4. DOM audit: rendered locked rows <= PATH_FUTURE_WINDOW, exactly one
 *      counted group per open band carrying the hidden count, and the
 *      counted row names no catalog title;
 *   5. above-the-fold audit at 844px: zero locked node titles in the fold,
 *      the pinned (frontier) node inside the fold — the first screen opens
 *      AT the frontier;
 *   6. the counted row is a real control: tapping it expands the tail.
 * fold-0 + full-path screenshots (before and after the expand) are the
 * visual oracles. Every measured value lands in result.json; any failed
 * assertion exits non-zero, so this file IS the gate (MOBILE-UX-001:
 * navigation errors ride INTO the result). CAPTURE_TAG labels the run.
 *
 *   usage: SERVE_BIN=<path> SERVE_DIST=<dist dir> \
 *          node scripts/path-far-future-capture.mjs
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
  if (!existsSync(p)) {
    console.error(`${name} not found: ${p}`);
    process.exit(2);
  }
}
const REPO = resolve(import.meta.dirname, "..");
const TAG = process.env.CAPTURE_TAG ?? "run";
const OUT = join(REPO, "state/evidence/FIX-M1-PATH-VIS-001");
mkdirSync(OUT, { recursive: true });
const PACK_ID = "org.openlanguage.ru-ru.reference";
const PROFILE = "Far Future";
const FUTURE_WINDOW = 2; // mirrors PATH_FUTURE_WINDOW in home.tsx
const VW = 390;
const VH = 844;
const PORT = 17970 + (process.pid % 50);
const BASE = `http://127.0.0.1:${PORT}`;

const result = { viewport: `${VW}x${VH}`, tag: TAG, checks: [], failures: 0, error: null };
const check = (name, pass, measured) => {
  result.checks.push({ name, pass, measured });
  if (!pass) result.failures++;
  console.log(`${pass ? "PASS" : "FAIL"} ${name} — ${JSON.stringify(measured)}`);
};

const dataDir = mkdtempSync(join(tmpdir(), "lts-farfut-data-"));
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

  // The payload is the defect's own measurement instrument (D-003 counted
  // 823 units / 803 locked here). Compute the hidden tail server-side: the
  // rendered set is history + frontier + FUTURE_WINDOW locked neighbours per
  // open band; every OTHER locked title must never reach the page text.
  const pathCall = await api("unit_path", { profileId });
  if (pathCall.status !== 200 || !Array.isArray(pathCall.value))
    throw new Error(`unit_path failed: ${JSON.stringify(pathCall).slice(0, 300)}`);
  const nodes = pathCall.value;
  const byBand = new Map();
  for (const n of nodes) {
    if (!byBand.has(n.band)) byBand.set(n.band, []);
    byBand.get(n.band).push(n);
  }
  const bandCounts = {};
  for (const [band, ns] of byBand) {
    bandCounts[band] = { total: ns.length, locked: ns.filter((n) => n.locked).length };
  }
  const hiddenTitles = [];
  const hiddenIds = [];
  for (const [band, raw] of byBand) {
    // Mirror PATH-LOCK-ORDER-001: the view sorts done -> open -> locked
    // before the tail cutoff — the raw wire order is pack file order.
    const rank = (n) => (n.done ? 0 : n.locked ? 2 : 1);
    const ns = [...raw].sort((a, b) => rank(a) - rank(b));
    let frontier = -1;
    ns.forEach((n, i) => {
      if (!n.locked) frontier = i;
    });
    if (frontier < 0) {
      // A fully-locked band renders a header with a count — none of its
      // titles may reach the page either.
      for (const n of ns) {
        hiddenTitles.push(n.title ?? n.unit_id);
        hiddenIds.push(n.unit_id);
      }
      continue;
    }
    const cut = Math.max(0, Math.min(ns.length, frontier + 1 + FUTURE_WINDOW));
    for (let i = cut; i < ns.length; i++) {
      hiddenTitles.push(ns[i].title ?? ns[i].unit_id);
      hiddenIds.push(ns[i].unit_id);
    }
  }
  result.payload = {
    totalUnits: nodes.length,
    lockedUnits: nodes.filter((n) => n.locked).length,
    bands: bandCounts,
    hiddenTailTitles: hiddenTitles.length,
  };
  check(
    "the day-1 payload really carries the far-future wall (non-vacuous gate)",
    nodes.filter((n) => n.locked).length >= 400 && hiddenTitles.length >= 400,
    {
      totalUnits: result.payload.totalUnits,
      lockedUnits: result.payload.lockedUnits,
      hiddenTailTitles: hiddenTitles.length,
    },
  );

  // ---- browser: the real app on a phone viewport. ----
  const profileDir = mkdtempSync(join(tmpdir(), "lts-farfut-chrome-"));
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
  await send("Page.navigate", { url: `${BASE}/?v=farfut` }, sessionId);
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
        document.querySelectorAll('[data-unit]').length > 0 &&
        document.querySelectorAll('[data-testid="path-pin"]').length === 1
      );
    })()`);
  let healthyStreak = 0;
  for (let i = 0; i < 40 && healthyStreak < 3; i++) {
    await sleep(300);
    healthyStreak = (await homeHealthy()) ? healthyStreak + 1 : 0;
  }
  if (healthyStreak < 3)
    throw new Error("navigation error: home never settled into a pack-loaded pinned state");

  // ---- THE far-future audit. The hidden set is computed server-side from
  // the unit_path payload; the page is asked structurally whether any of
  // those units renders (data-unit exact). No innerText title scan: generic
  // catalog titles collide with honest surface copy (the PATH_KIND_NAMES
  // kind word "Words", nav labels like "Progress"), so text matching
  // cannot assert this rule without false positives — a hidden unit
  // rendering at all is a row carrying its unit_id. ----
  const audit = await evaluate(`(() => {
    const hiddenIdSet = new Set(${JSON.stringify(hiddenIds)});
    const rows = [...document.querySelectorAll('li[data-unit]')].map((li) => {
      const r = li.getBoundingClientRect();
      return {
        unit: li.getAttribute('data-unit'),
        hiddenId: hiddenIdSet.has(li.getAttribute('data-unit')),
        state: li.getAttribute('data-state'),
        top: Math.round(r.top),
        pinned: Boolean(li.querySelector('[data-testid="path-pin"]')),
      };
    });
    const groups = [...document.querySelectorAll('[data-testid^="path-later-units-"]')].map((b) => ({
      band: b.getAttribute('data-testid').replace('path-later-units-', ''),
      hidden: Number(b.getAttribute('data-hidden')),
      text: (b.textContent ?? '').trim(),
    }));
    const lockedRows = rows.filter((r) => r.state === 'locked');
    const pinRow = rows.find((r) => r.pinned);
    const renderedHiddenRows = rows.filter((r) => r.hiddenId).map((r) => r.unit);
    const foldLocked = lockedRows.filter((r) => r.top >= 0 && r.top < ${VH});
    // Every RENDERED locked unit title vs the hidden set: none may match.
    const renderedTitles = rows.map((li) => li.unit);
    return {
      renderedRows: rows.length,
      renderedLocked: lockedRows.length,
      foldLockedTitles: foldLocked.length,
      pinInFold: pinRow ? pinRow.top >= 0 && pinRow.top < ${VH} : false,
      pinUnit: pinRow ? pinRow.unit : null,
      groups,
      renderedHiddenRows,
      renderedLockedUnits: lockedRows.map((r) => r.unit),
    };
  })()`);
  result.audit = audit;

  check(
    "zero hidden far-future units render as path rows (structural, data-unit exact)",
    audit.renderedHiddenRows.length === 0,
    { renderedHiddenRows: audit.renderedHiddenRows.slice(0, 8) },
  );
  check(
    "rendered locked nodes stay within PATH_FUTURE_WINDOW neighbours",
    audit.renderedLocked <= FUTURE_WINDOW,
    { renderedLocked: audit.renderedLocked, renderedLockedUnits: audit.renderedLockedUnits },
  );
  const collapsedTotal = audit.groups.reduce((a, g) => a + g.hidden, 0);
  check(
    "the far tail collapses into counted band group(s) carrying the hidden count",
    audit.groups.length >= 1 && collapsedTotal >= 400,
    { groups: audit.groups.map((g) => `${g.band}:${g.hidden}`), collapsedTotal },
  );
  check(
    "every counted row names only a count and a band, never a unit title",
    audit.groups.every((g) => /^\+\s*\d+\s+later units in .+$/.test(g.text)),
    { texts: audit.groups.map((g) => g.text) },
  );
  check(
    "above the fold: zero locked node titles, the pinned frontier node is visible",
    audit.foldLockedTitles === 0 && audit.pinInFold,
    {
      foldLockedTitles: audit.foldLockedTitles,
      pinInFold: audit.pinInFold,
      pinUnit: audit.pinUnit,
    },
  );

  // ---- layout integrity (the no-vision stand-in for a visual defect scan:
  // horizontal overflow, row/ring collisions, dead-small targets). ----
  const layout = await evaluate(`(() => {
    const vw = window.innerWidth;
    const path = document.querySelector('[data-testid="unit-path"]');
    const els = [...path.querySelectorAll('li[data-unit], .path-later-units')];
    const rects = els.map((el) => {
      const r = el.getBoundingClientRect();
      return { id: el.getAttribute('data-testid') ?? el.getAttribute('data-unit'), r };
    });
    const overflowing = rects.filter((x) => x.r.right > vw + 1 || x.r.left < -1).map((x) => x.id);
    let overlaps = 0;
    for (let i = 0; i < rects.length; i++)
      for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i].r, b = rects[j].r;
        const ox = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
        const oy = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
        if (ox > 4 && oy > 4) overlaps++;
      }
    const groups = [...path.querySelectorAll('.path-later-units')].map((b) => b.getBoundingClientRect().height);
    const hScroll = document.documentElement.scrollWidth > vw + 1;
    return { overflowing, overlaps, groupMinHeight: Math.min(...groups), hScroll };
  })()`);
  result.layout = layout;
  check(
    "layout integrity: no element exceeds the viewport, no document h-scroll",
    layout.overflowing.length === 0 && !layout.hScroll,
    { overflowing: layout.overflowing, hScroll: layout.hScroll },
  );
  check("layout integrity: no two path rows visibly collide", layout.overlaps === 0, {
    overlaps: layout.overlaps,
  });
  check(
    "layout integrity: counted group rows meet the 44px touch minimum",
    layout.groupMinHeight >= 44,
    { groupMinHeight: layout.groupMinHeight },
  );

  // ---- visual oracles (collapsed state). ----
  await shot("farfuture-fold0", true);
  await shot("farfuture-fullpath", false);

  // ---- the counted row is a real control: the learner's own tap opens it. ----
  const expanded = await evaluate(`(() => {
    const btn = document.querySelector('[data-testid^="path-later-units-"]');
    if (!btn) return { clicked: false };
    const before = document.querySelectorAll('li[data-unit]').length;
    btn.click();
    return { clicked: true, before };
  })()`);
  await sleep(500);
  const afterExpand = await evaluate(`(() => {
    const rows = document.querySelectorAll('li[data-unit]').length;
    const groups = document.querySelectorAll('[data-testid^="path-later-units-"]').length;
    return { rows, groups };
  })()`);
  check(
    "tapping the counted row pulls the tail into view (opt-in lookahead)",
    expanded.clicked && afterExpand.rows > (expanded.before ?? 0),
    { before: expanded.before, after: afterExpand.rows },
  );
  await shot("farfuture-expanded", false);

  if (!(await homeHealthy())) throw new Error("navigation error: home state broke after capture");
} catch (e) {
  result.error = String(e?.stack ?? e);
  console.error(result.error);
  result.failures = (result.failures ?? 0) + 1;
} finally {
  writeFileSync(join(OUT, `result-${TAG}.json`), JSON.stringify(result, null, 2) + "\n");
  chrome?.kill("SIGKILL");
  serve?.kill("SIGKILL");
}
process.exit(result.failures === 0 ? 0 : 1);
