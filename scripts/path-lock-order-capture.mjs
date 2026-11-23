#!/usr/bin/env node
/**
 * PATH-LOCK-ORDER-001 acceptance capture (dev-only evidence tooling).
 *
 * Same plumbing as scripts/firstscreen-capture.mjs (real engine: lts-serve
 * over an isolated data dir, headless Chrome at a 390x844 phone viewport
 * via CDP Emulation.setDeviceMetricsOverride — no new deps), but the oracle
 * is the MARKET LOCK RULE (docs/design/PROGRESSION-UX-AUDIT-2026-11-22.md
 * § MARKET NAVIGATION RULES): completed above, current in the middle,
 * locked strictly below — nothing locked sits above the learner. The live
 * violation (live-phone-fold0.png, board t_2a800b60) had two locked
 * number-words nodes above the "You are here" pin, each repeating the same
 * unlock sentence; on a FRESH profile the pack's file order puts TEN locked
 * on-ramp word nodes above the unlocked Cyrillic frontier. Sequence:
 *   1. fresh profile (install + create + switch, NO seeded traffic) — the
 *      exact world the owner's phone opened in;
 *   2. wait for the stable pack-loaded home (the ~1s flicker rule);
 *   3. measure every RENDERED node row: locked-above-frontier == 0,
 *      no locked row above any open row, done rows never below open
 *      rows, and every distinct unlock sentence appears exactly once;
 *   4. fold-0 + full-path screenshots as the visual oracle, re-validated
 *      after the shots.
 * Every measured value lands in result.json; any failed assertion exits
 * non-zero, so this file IS the gate. Navigation errors ride INTO the
 * result (MOBILE-UX-001 rule). CAPTURE_TAG=<red|green> labels the run.
 *
 *   usage: SERVE_BIN=<path> SERVE_DIST=<dist dir> \
 *          node scripts/path-lock-order-capture.mjs
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
const OUT = join(REPO, "state/evidence/PATH-LOCK-ORDER-001");
mkdirSync(OUT, { recursive: true });
const PACK_ID = "org.openlanguage.ru-ru.reference";
const PROFILE = "Lock Order";
const VW = 390;
const VH = 844;
const PORT = 17960 + (process.pid % 60);
const BASE = `http://127.0.0.1:${PORT}`;

const result = { viewport: `${VW}x${VH}`, tag: TAG, checks: [], failures: 0, error: null };
const check = (name, pass, measured) => {
  result.checks.push({ name, pass, measured });
  if (!pass) result.failures++;
  console.log(`${pass ? "PASS" : "FAIL"} ${name} — ${JSON.stringify(measured)}`);
};

const dataDir = mkdtempSync(join(tmpdir(), "lts-lockorder-data-"));
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
  const profileDir = mkdtempSync(join(tmpdir(), "lts-lockorder-chrome-"));
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
  await send("Page.navigate", { url: `${BASE}/?v=lockorder` }, sessionId);
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

  // ---- THE lock-order audit over every RENDERED node row (document order,
  // which is the visual order: rows stack top->bottom). Only the opened
  // section's nodes are in the DOM — exactly what the learner sees. ----
  const audit = await evaluate(`(() => {
    const rows = [...document.querySelectorAll('li[data-unit]')].map((li, index) => {
      const r = li.getBoundingClientRect();
      return {
        unit: li.getAttribute('data-unit'),
        state: li.getAttribute('data-state'),
        top: Math.round(r.top),
        bottom: Math.round(r.bottom),
        pinned: Boolean(li.querySelector('[data-testid="path-pin"]')),
        hint: (li.querySelector('.path-node-hint')?.textContent ?? '').trim(),
      };
    });
    const pinIdx = rows.findIndex((r) => r.pinned);
    const lockedAboveFrontier = pinIdx < 0
      ? rows.filter((r) => r.state === 'locked').length
      : rows.slice(0, pinIdx).filter((r) => r.state === 'locked').length;
    // No locked row above any open (unlocked, not-done) row.
    let lockedAboveOpen = 0;
    for (let i = 0; i < rows.length; i++) {
      if (rows[i].state !== 'locked') continue;
      for (let j = i + 1; j < rows.length; j++) {
        if (rows[j].state !== 'locked' && rows[j].state !== 'done' && rows[j].state !== 'review-due') lockedAboveOpen++;
      }
    }
    // No done row below an open row (done -> current -> locked, whole section).
    let doneBelowOpen = 0;
    for (let i = 0; i < rows.length; i++) {
      const s = rows[i].state;
      if (s !== 'done' && s !== 'review-due') continue;
      for (let j = 0; j < i; j++) {
        const o = rows[j].state;
        if (o !== 'locked' && o !== 'done' && o !== 'review-due') doneBelowOpen++;
      }
    }
    const hints = rows.map((r) => r.hint).filter((h) => h.length > 0);
    const dupHints = hints.length - new Set(hints).size;
    return {
      rendered: rows.length,
      pinIndex: pinIdx,
      pinUnit: pinIdx >= 0 ? rows[pinIdx].unit : null,
      lockedAboveFrontier,
      lockedAboveOpen,
      doneBelowOpen,
      hintCount: hints.length,
      distinctHints: new Set(hints).size,
      dupHints,
      lockedRows: rows.filter((r) => r.state === 'locked').slice(0, 12).map((r) => r.unit),
      states: rows.map((r) => r.state),
    };
  })()`);
  result.audit = audit;
  check(
    "locked-above-frontier == 0 (no locked node renders above the pinned node)",
    audit.pinIndex >= 0 && audit.lockedAboveFrontier === 0,
    {
      pinUnit: audit.pinUnit,
      lockedAboveFrontier: audit.lockedAboveFrontier,
      lockedRows: audit.lockedRows,
    },
  );
  check(
    "no locked row renders above any open row (done -> current -> locked)",
    audit.lockedAboveOpen === 0 && audit.doneBelowOpen === 0,
    { lockedAboveOpen: audit.lockedAboveOpen, doneBelowOpen: audit.doneBelowOpen },
  );
  check(
    "each distinct unlock sentence renders exactly once (no sibling duplication)",
    audit.dupHints === 0,
    { hintCount: audit.hintCount, distinctHints: audit.distinctHints },
  );
  // The fresh reference pack MUST have locked nodes on screen — an empty
  // lock set would make the checks above vacuously true (gate-integrity).
  check(
    "the audited screen really contains locked nodes (non-vacuous gate)",
    audit.lockedRows.length > 0,
    { lockedRows: audit.lockedRows },
  );

  // ---- visual oracles. ----
  await shot("lockorder-fold0", true);
  await shot("lockorder-fullpath", false);
  if (!(await homeHealthy())) {
    let streak2 = 0;
    for (let i = 0; i < 40 && streak2 < 3; i++) {
      await sleep(300);
      streak2 = (await homeHealthy()) ? streak2 + 1 : 0;
    }
    if (streak2 < 3) throw new Error("navigation error: home dropped pack state after the shots");
    await shot("lockorder-fold0", true);
    await shot("lockorder-fullpath", false);
  }
  check("screenshots re-validated: home still pack-loaded and pinned on the path", true, {});

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
