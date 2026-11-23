#!/usr/bin/env node
/**
 * UNIT-CAPSTONE-001 acceptance capture (dev-only evidence tooling).
 *
 * Same plumbing as scripts/path-node-types-capture.mjs (real engine:
 * lts-serve over an isolated data dir, headless Chrome at a 390x844 phone
 * viewport, raw CDP, no new deps). A FRESH learner is the honest scene:
 * no unit is done, so every section checkpoint must show LOCKED. What
 * the card claims, measured HERE:
 *   1. wire: the on-ramp section ends with a capstone node — engine-
 *      synthesized, id capstone.<pack>.<band-key>, kind capstone, LAST
 *      inside its section, locked with its unlock hint, done=false,
 *      ring showing an honest pool fraction (refs_total > 0);
 *   2. one capstone per rendered section with a pool (on-ramp/A1/A2 at
 *      minimum), never two for one band;
 *   3. DOM: exactly one capstone node renders (the open section), it is
 *      locked — no Start button — and its hint reads in words;
 *   4. the section counter counts the checkpoint too and says "done",
 *      never "units done" (the checkpoint is not a unit).
 * Screenshots: path-capstone-node (the locked checkpoint in view).
 * Navigation errors ride INTO result.json (MOBILE-UX-001 rule); any
 * failed check exits non-zero, so this file IS the gate. At pre-capstone
 * HEAD every capstone check goes RED — that pair is the red@HEAD proof.
 *
 *   usage: SERVE_BIN=<path> SERVE_DIST=<dist dir> \
 *          node scripts/capstone-capture.mjs
 */
import { spawn } from "node:child_process";
import {
  mkdirSync,
  writeFileSync,
  mkdtempSync,
  existsSync,
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
const OUT = resolve(process.env.OUT_DIR ?? join(REPO, "state/evidence/UNIT-CAPSTONE-001"));
mkdirSync(OUT, { recursive: true });
const PACK_ID = "org.openlanguage.ru-ru.reference";
const PROFILE = "Checkpoint Scene";
const VW = 390;
const VH = 844;
const PORT = 17700 + (process.pid % 60);
const BASE = `http://127.0.0.1:${PORT}`;
const ONRAMP_CAP = `capstone.${PACK_ID}.on-ramp`;

const result = { viewport: `${VW}x${VH}`, checks: [], failures: 0, error: null };
const check = (name, pass, measured) => {
  result.checks.push({ name, pass, measured });
  if (!pass) result.failures++;
  console.log(`${pass ? "PASS" : "FAIL"} ${name} — ${JSON.stringify(measured)}`);
};

const dataDir = mkdtempSync(join(tmpdir(), "lts-capstone-data-"));
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

  // ---- CHECK GROUP A: the WIRE. ----
  const nodes = ((await api("unit_path", { profileId })).value ?? []).filter(
    (n) => n && typeof n === "object",
  );
  const caps = nodes.filter((n) => n.kind === "capstone");
  check(
    "the path carries engine-synthesized capstone nodes (kind capstone)",
    caps.length >= 3,
    { nodes: nodes.length, capstones: caps.map((c) => c.unit_id) },
  );
  const bandsSeen = caps.map((c) => c.unit_id.split(".").pop());
  check(
    "at most ONE capstone per section band",
    new Set(bandsSeen).size === bandsSeen.length && bandsSeen.length >= 3,
    { bands: bandsSeen },
  );
  check(
    "capstone ids are the reserved capstone.<pack>.<band-key> shape",
    caps.every((c) => c.unit_id.startsWith(`capstone.${PACK_ID}.`)),
    { sample: caps.slice(0, 3).map((c) => c.unit_id) },
  );

  const cap = nodes.find((n) => n.unit_id === ONRAMP_CAP);
  check(
    "the on-ramp section ends with its checkpoint, LOCKED for a fresh learner",
    !!cap && cap.locked === true && cap.done === false && cap.in_progress === false,
    cap
      ? { locked: cap.locked, done: cap.done, in_progress: cap.in_progress }
      : { present: false },
  );
  check(
    "the locked checkpoint names its gate in words",
    cap?.unlock_hint === "finish this section's units first",
    { hint: cap?.unlock_hint ?? null },
  );
  check(
    "the checkpoint ring carries an honest pool fraction (letters+words pool)",
    !!cap && cap.refs_total > 0 && cap.refs_done === 0,
    { refs_done: cap?.refs_done ?? null, refs_total: cap?.refs_total ?? null },
  );
  // Market Checkpoint position: LAST inside its section (pathSections
  // groups by band key, insertion order inside a section).
  const capIdx = nodes.findIndex((n) => n.unit_id === ONRAMP_CAP);
  const bandKey = (b) => (b && b.trim() ? b.trim().toLowerCase() : "other");
  const afterUnits =
    capIdx >= 0 &&
    nodes.every(
      (n, i) => !(bandKey(n.band) === "on-ramp" && n.unit_id !== ONRAMP_CAP) || i < capIdx,
    );
  check("the checkpoint sits AFTER every unit of its section", afterUnits, { capIdx });

  // The review session itself: deterministic, capped, letters-first —
  // served by the engine for the locked section too (the UI only offers
  // it once unlocked; the wire check proves the shape).
  const plan = await api("capstone_plan", { profileId, packId: PACK_ID, band: "on-ramp" });
  const items = plan.value?.items ?? [];
  const interleaveOk = items
    .slice(0, 8)
    .every((it, i) =>
      it.modality === (i % 2 === 0 ? "orthography-recognition" : "recall-meaning"),
    );
  check(
    "capstone_plan serves a capped, letters-first interleaved mixed recall",
    plan.status === 200 && items.length === 16 && interleaveOk,
    {
      status: plan.status,
      items: items.length,
      first: items.slice(0, 4).map((it) => `${it.content_id}:${it.modality}`),
    },
  );
  const planAgain = await api("capstone_plan", { profileId, packId: PACK_ID, band: "on-ramp" });
  check(
    "the same section serves the SAME review every time (engine recounts later)",
    JSON.stringify(planAgain.value?.items ?? null) === JSON.stringify(items),
    { same: true },
  );

  // ---- browser: the real app on a phone viewport. ----
  const profileDir = mkdtempSync(join(tmpdir(), "lts-capstone-chrome-"));
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
    writeFileSync(join(OUT, `${name}.png`), Buffer.from(s.data, "base64"));
  }

  await send(
    "Emulation.setDeviceMetricsOverride",
    { width: VW, height: VH, deviceScaleFactor: 1, mobile: true },
    sessionId,
  );
  await send("Page.navigate", { url: `${BASE}/?v=capstone` }, sessionId);
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
        document.querySelectorAll('[data-unit]').length > 0
      );
    })()`);
  let healthyStreak = 0;
  for (let i = 0; i < 40 && healthyStreak < 3; i++) {
    await sleep(300);
    healthyStreak = (await homeHealthy()) ? healthyStreak + 1 : 0;
  }
  if (healthyStreak < 3)
    throw new Error("navigation error: home never settled into a pack-loaded state");
  await sleep(400);

  // ---- CHECK GROUP B: the DOM on the live journey. ----
  const dom = await evaluate(`(() => {
    const caps = [...document.querySelectorAll('.path-node[data-kind="capstone"]')];
    const cap = caps[0] ?? null;
    const section = document.querySelector('.path-section[data-band="on-ramp"]');
    const count = section?.querySelector('.path-section-count')?.textContent.trim() ?? "";
    const nodesInSection = section ? section.querySelectorAll('.path-node').length : 0;
    return {
      capCount: caps.length,
      state: cap?.dataset.state ?? null,
      hint: cap ? (cap.innerText.includes("finish this section's units first")) : false,
      startButton: cap ? !!cap.querySelector('.path-node-capstone-start') : false,
      lockGlyph: !!cap?.querySelector('svg.path-node-lock'),
      lastNodeInSection: section
        ? section.querySelectorAll('.path-node')[nodesInSection - 1]?.dataset.kind === "capstone"
        : false,
      count,
      nodesInSection,
      unitsDoneLabel: document.body.innerText.includes("units done"),
    };
  })()`);
  check(
    "exactly ONE capstone node renders (the open section) and it is LOCKED with no start control",
    dom.capCount === 1 && dom.state === "locked" && dom.hint && !dom.startButton,
    dom,
  );
  check(
    "the checkpoint is the LAST rendered node of its section and the lock mark wears it (the flag glyph shows once unlocked — vitest covers that state)",
    dom.lastNodeInSection && dom.lockGlyph,
    { lastNodeInSection: dom.lastNodeInSection, lockGlyph: dom.lockGlyph },
  );
  const countOk = /^\d+\/\d+ done$/.test(dom.count) && !dom.unitsDoneLabel;
  const totalMatchesNodes = Number((dom.count.match(/\/(\d+)/) ?? [])[1]) === dom.nodesInSection;
  check('the section counter counts the checkpoint and says "done", never "units done"', countOk && totalMatchesNodes, {
    count: dom.count,
    nodesInSection: dom.nodesInSection,
    unitsDoneLabel: dom.unitsDoneLabel,
  });

  // Evidence shot: the locked checkpoint itself in view (below the fold).
  const scrolled = await evaluate(`(() => {
    const cap = document.querySelector('.path-node[data-kind="capstone"]');
    if (!cap) return false;
    cap.scrollIntoView({ block: "center" });
    return true;
  })()`);
  await sleep(350);
  await shot("path-capstone-node");
  check("the locked checkpoint was scrolled into view and screenshotted", scrolled, { scrolled });
} catch (err) {
  result.error = String(err?.stack ?? err);
} finally {
  if (chrome) chrome.kill();
  if (serve) serve.kill();
  if (chromeDir) {
    try {
      spawn("rm", ["-rf", chromeDir], { stdio: "ignore" });
    } catch {
      // best-effort cleanup
    }
  }
  writeFileSync(join(OUT, "result.json"), JSON.stringify(result, null, 2) + "\n");
  console.log(
    result.error ? `HARNESS ERROR: ${result.error}` : `failures: ${result.failures}`,
  );
  process.exit(result.error || result.failures > 0 ? 1 : 0);
}
