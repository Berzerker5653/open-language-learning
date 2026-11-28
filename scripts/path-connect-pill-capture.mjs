#!/usr/bin/env node
/**
 * PATH-CONNECT-PILL-001 — the winding track must actually connect.
 * Red-at-HEAD acceptance harness (same script reds then greens; the
 * before-image oracle is state/evidence/UI-VERIFY-2026-11-23/today_pill.png).
 *
 * Same plumbing as scripts/bakeoff-today-livecapture.mjs (real engine:
 * lts-serve over an isolated data dir + freshly created profile, headless
 * Chrome at 390x844 via CDP Emulation.setDeviceMetricsOverride — no new
 * deps). Measures the frozen contract in state/notes/PATH-CONNECT-PILL-001.md:
 *   A1 every consecutive ring-center dy in the open band equals
 *      PATH_ROW_PITCH_PX (76) ± 2 — measured on document coordinates.
 *   A2 for every consecutive pair, the midpoint of the straight segment
 *      between ring centers lies ON drawn dash pixels: hit-test
 *      elementsFromPoint at the midpoint and ±5px along the segment,
 *      expecting the pair's .path-conn stub.
 *   A3 the start pill is one line (height <= 56px) and its rect starts
 *      right of every visible ring's right edge (never in the connector
 *      channel).
 *   A4 the first visible node carries [data-testid="path-head-cap"], and
 *      every row's title sits right of its ring (title.x > ring.x).
 *   A5 >= 2 distinct marker glyphs across the visible nodes (identical
 *      "A" on every letters node was the owner complaint).
 * Navigation errors ride INTO the audit (MOBILE-UX-001 rule); any failed
 * assertion exits non-zero, so this file IS the gate.
 *
 *   usage: SERVE_BIN=<path> SERVE_DIST=<dist dir> [CAPTURE_TAG=red|green] \
 *          node scripts/path-connect-pill-capture.mjs
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
const OUT = join(REPO, "state/evidence/PATH-CONNECT-PILL-001");
mkdirSync(OUT, { recursive: true });
const PACK_ID = "org.openlanguage.ru-ru.reference";
const PROFILE = "PathConnect Fresh";
const VW = 390;
const VH = 844;
// Fresh port — sibling lanes keep 17631 busy (BAKEOFF-LIVECAPTURE-001).
const PORT = 17635;
const BASE = `http://127.0.0.1:${PORT}`;
// The nominal pitch the connector math is computed against
// (apps/desktop/src/home.tsx PATH_ROW_PITCH_PX). The card pins 76;
// R1 makes the DOM match it.
const PITCH = 76;

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

const dataDir = mkdtempSync(join(tmpdir(), "lts-pathconnect-data-"));
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

  const profileDir = mkdtempSync(join(tmpdir(), "lts-pathconnect-chrome-"));
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
  await send("Page.navigate", { url: `${BASE}/?v=pathconnectcap` }, sessionId);
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

  await shot("connect-fold0", true);

  // ---- A1: consecutive ring-center pitch over DOCUMENT coordinates. ----
  const pitch = await evaluate(`(() => {
    const PITCH = ${PITCH};
    const rows = [...document.querySelectorAll('li[data-unit]')];
    const centers = rows.map((r) => {
      const ring = r.querySelector('.path-node-ring');
      const b = ring.getBoundingClientRect();
      return {
        unit: r.getAttribute('data-unit'),
        x: b.x + b.width / 2 + scrollX,
        y: b.y + b.height / 2 + scrollY,
      };
    });
    const pairs = [];
    for (let i = 0; i + 1 < centers.length; i++) {
      pairs.push({
        pair: i,
        units: [centers[i].unit, centers[i + 1].unit],
        dy: Math.round((centers[i + 1].y - centers[i].y) * 10) / 10,
        pass: Math.abs(centers[i + 1].y - centers[i].y - PITCH) <= 2,
      });
    }
    return { rowCount: rows.length, pairs };
  })()`);
  result.pitch = pitch;
  const offPitch = (pitch.pairs ?? []).filter((p) => !p.pass);
  check(
    `A1: every consecutive ring-center dy = ${PITCH}px ±2 in the open band`,
    pitch.rowCount >= 3 &&
      (pitch.pairs ?? []).length === pitch.rowCount - 1 &&
      offPitch.length === 0,
    { rowCount: pitch.rowCount, offPitch },
  );

  // ---- A4: head cap present on the first visible node; labels right of rings. ----
  const head = await evaluate(`(() => {
    const rows = [...document.querySelectorAll('li[data-unit]')];
    const first = rows[0];
    const cap = document.querySelectorAll('[data-testid="path-head-cap"]');
    const capInFirst = Boolean(first?.querySelector('[data-testid="path-head-cap"]'));
    const labelOff = [];
    rows.forEach((r) => {
      const ring = r.querySelector('.path-node-ring').getBoundingClientRect();
      const title = r.querySelector('.path-node-title')?.getBoundingClientRect();
      if (!title || title.x <= ring.x) {
        labelOff.push({ unit: r.getAttribute('data-unit'), titleX: title ? Math.round(title.x) : null, ringX: Math.round(ring.x) });
      }
    });
    return {
      capCount: cap.length,
      capInFirst,
      firstUnit: first?.getAttribute('data-unit') ?? null,
      labelOff,
    };
  })()`);
  result.head = head;
  check(
    "A4: first visible node carries the path-head-cap and every title sits right of its ring",
    head.capCount === 1 && head.capInFirst && head.labelOff.length === 0,
    head,
  );

  // ---- A5: distinct marker glyphs across visible nodes. R5's complaint
  // is that every UNLOCKED letters node wore the identical "A" pictogram,
  // so count distinct glyphs among non-locked nodes (locks sharing one
  // glyph is market-normal). ----
  const glyphs = await evaluate(`(() => {
    const rows = [...document.querySelectorAll('li[data-unit]')];
    const seen = new Map();
    const seenOpen = new Map();
    rows.forEach((r) => {
      const m = r.querySelector('.path-node-marker');
      if (!m) return;
      const key = (m.textContent ?? '').trim() ||
        (m.querySelector('svg')?.getAttribute('data-glyph') ??
         m.querySelector('svg')?.outerHTML.slice(0, 80));
      seen.set(key, (seen.get(key) ?? 0) + 1);
      if (r.getAttribute('data-state') !== 'locked') {
        seenOpen.set(key, (seenOpen.get(key) ?? 0) + 1);
      }
    });
    return {
      distinct: [...seen.keys()],
      distinctOpen: [...seenOpen.keys()],
      counts: Object.fromEntries(seen),
    };
  })()`);
  result.glyphs = glyphs;
  check("A5: >= 2 distinct marker glyphs across the visible nodes", glyphs.distinct.length >= 2, {
    distinct: glyphs.distinct.length,
    counts: glyphs.counts,
  });
  check(
    "A5b: >= 2 distinct glyphs among UNLOCKED nodes (the shared 'A' on every letters unit was the owner complaint)",
    glyphs.distinctOpen.length >= 2,
    { distinctOpen: glyphs.distinctOpen },
  );

  // ---- A3: pill one line, outside the connector channel. ----
  const pill = await evaluate(`(() => {
    const p = document.querySelector('[data-testid="path-start-pill"]');
    if (!p) return { present: false };
    const pr = p.getBoundingClientRect();
    let worstGap = Infinity;
    document.querySelectorAll('.path-node-ring').forEach((ring) => {
      const b = ring.getBoundingClientRect();
      worstGap = Math.min(worstGap, pr.left - b.right);
    });
    const cs = getComputedStyle(p);
    const rowLine = parseFloat(cs.lineHeight) + parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom) + parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth);
    return {
      present: true,
      label: (p.textContent ?? '').trim(),
      height: Math.round(pr.height),
      linesEstimate: Math.max(1, Math.round(pr.height / rowLine)),
      leftOfEveryRing: worstGap > 2,
      gapToNearestRing: Math.round(worstGap),
      left: Math.round(pr.left),
      inFlow: cs.position !== 'absolute' && cs.position !== 'fixed',
    };
  })()`);
  result.pill = pill;
  check(
    "A3: start pill is one line (height <= 56px), absolutely positioned, right of every ring (outside the channel)",
    pill.present &&
      pill.height <= 56 &&
      pill.linesEstimate <= 1 &&
      pill.leftOfEveryRing &&
      pill.inFlow === false,
    pill,
  );

  // ---- A2: midpoints lie on drawn dash pixels. Walk the whole open band
  // by scrolling in ~600px steps; at each stop measure every still-
  // unmeasured pair whose midpoint is inside the viewport (hit-test
  // elementsFromPoint at the midpoint and ±5px along the segment, and
  // re-anchor x to the current live rect x at the hit-test moment).
  const a2 = await evaluate(`(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const rows = [...document.querySelectorAll('li[data-unit]')];
    const centersAt = (r) => {
      const b = r.querySelector('.path-node-ring').getBoundingClientRect();
      return { x: b.x + b.width / 2 + scrollX, y: b.y + b.height / 2 + scrollY };
    };
    const docCenters = rows.map(centersAt);
    const measured = new Map();
    const maxScroll = document.documentElement.scrollHeight - innerHeight;
    for (let top = 0; top <= maxScroll + 10; top += 600) {
      window.scrollTo(0, Math.min(top, maxScroll));
      await sleep(180);
      for (let i = 0; i + 1 < rows.length; i++) {
        if (measured.has(i)) continue;
        const a = centersAt(rows[i]);
        const b = centersAt(rows[i + 1]);
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        const vy = my - scrollY;
        if (vy < 4 || vy > innerHeight - 4) continue;
        const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
        const ux = (b.x - a.x) / len;
        const uy = (b.y - a.y) / len;
        const samples = [];
        for (const off of [0, -5, 5]) {
          const px = Math.round(mx - scrollX + ux * off);
          const py = Math.round(vy + uy * off);
          const hitEls = document.elementsFromPoint(px, py).map(
            (el) => el.className?.baseVal ?? el.className ?? '',
          );
          samples.push({ px, py, dashes: hitEls.some((c) => String(c).includes('path-conn')) });
        }
        measured.set(i, {
          pair: i,
          units: [rows[i].getAttribute('data-unit'), rows[i + 1].getAttribute('data-unit')],
          midpoint: { x: Math.round(mx - scrollX), y: Math.round(vy) },
          pass: samples.some((s) => s.dashes),
          samples,
        });
      }
      if (measured.size >= rows.length - 1) break;
    }
    return {
      pairsNeeded: rows.length - 1,
      pairsMeasured: [...measured.values()],
    };
  })()`);
  result.connectorMidpoints = a2;
  const unmeasured = a2.pairsNeeded - a2.pairsMeasured.length;
  const orphaned = a2.pairsMeasured.filter((p) => !p.pass);
  check(
    "A2: every consecutive segment midpoint lies on drawn dash pixels (no orphan stubs)",
    unmeasured === 0 && orphaned.length === 0,
    { pairsNeeded: a2.pairsNeeded, unmeasured, orphaned: orphaned.map((p) => p.units) },
  );

  // ---- learner folds: top of the open band (head cap) + load fold + full band. ----
  await evaluate(`(() => {
    const first = document.querySelector('li[data-unit]');
    first?.scrollIntoView({ block: 'start' });
    return true;
  })()`);
  await sleep(200);
  await shot("connect-band-head", true);
  await shot("connect-fullpath", false);
  await send("Emulation.clearDeviceMetricsOverride", {}, sessionId);

  if (result.failures === 0) console.log("ALL CHECKS PASS");
  else console.log(`${result.failures} CHECK(S) FAILED`);
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
