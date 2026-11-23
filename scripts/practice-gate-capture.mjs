#!/usr/bin/env node
/**
 * PRACTICE-GATE-001 acceptance capture (dev-only evidence tooling).
 *
 * Same plumbing as scripts/settings-scope-capture.mjs (headless Chrome over
 * raw CDP, Node built-in WebSocket/fetch — no new deps), but against the
 * REAL engine: an lts-serve instance over an isolated data dir, seeded by
 * API (pack import, profile create, pack switch) so the browser session
 * starts at a zero-encounter profile without navigating onboarding
 * (MOBILE-UX-001 lesson: seed journeys, do not click install flows).
 *
 * What runs per tag:
 *   before: the HEAD serve binary — dictation_target({packId, offset})
 *           answers with a sentence (the phone-dogfood complaint), and the
 *           Practice > Speaking screen renders it.
 *   after:  the lane serve binary — dictation_target({profileId, packId,
 *           offset}) REFUSES for a zero-encounter profile, practice_queue
 *           for that profile lists ONLY letter-level (orthography) ids,
 *           and the Practice screen shows no sentence.
 *
 * Machine gates ride into result.json; navigation errors ride into the
 * result and fail the run loudly. Mobile viewport 390x844 like the owner's
 * phone. Screenshots land in state/evidence/PRACTICE-GATE-001/<tag>/.
 *
 *   usage: SERVE_BIN=<path> SERVE_DIST=<path> \
 *          (the pack itself is installed engine-side by serve's own
 *           install_pack command from the tree that binary was built in)
 *          node scripts/practice-gate-capture.mjs <before|after>
 */
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync, mkdtempSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const TAG = process.argv[2];
if (!["before", "after"].includes(TAG ?? "")) {
  console.error("usage: node scripts/practice-gate-capture.mjs <before|after>");
  process.exit(2);
}
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
  // dist/index.html itself); readFileSync would EISDIR and bait you into
  // passing the file path, which then fails serve's own join.
  if (!existsSync(p)) {
    console.error(`${name} not found: ${p}`);
    process.exit(2);
  }
}
const REPO = resolve(import.meta.dirname, "..");
const OUT = join(REPO, "state/evidence/PRACTICE-GATE-001", TAG);
mkdirSync(OUT, { recursive: true });
const PACK_ID = "org.openlanguage.ru-ru.reference";
const VW = 390;
const VH = 844;
const PORT = 17700 + (process.pid % 90);
const BASE = `http://127.0.0.1:${PORT}`;

const result = { tag: TAG, viewport: `${VW}x${VH}`, checks: [], failures: 0, error: null };
const check = (name, pass, measured) => {
  result.checks.push({ name, pass, measured });
  if (!pass) result.failures++;
  console.log(`${pass ? "PASS" : "FAIL"} ${name} — ${JSON.stringify(measured)}`);
};

const dataDir = mkdtempSync(join(tmpdir(), "lts-practice-gate-data-"));
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
  // Serve envelope: 200 + raw serialized return value, or 422 + {"error": …}.
  return { status: r.status, value: await r.json().catch(() => null) };
}

async function seed() {
  // Pack bytes ride NO HTTP path: serve's install_pack command builds the
  // archive in-process from its OWN compiled dev tree (CARGO_MANIFEST_DIR
  // is baked at build time), so the before binary installs the pre-lane
  // pack and the after binary installs the post-lane pack — exact tree
  // bytes, and axum's 2MB default body limit (which kills any 300MB
  // base64 import_pack) never enters the picture.
  const imp = await api("install_pack", { packId: PACK_ID });
  if (imp.status !== 200) throw new Error(`install_pack failed: ${JSON.stringify(imp)}`);
  const prof = await api("create_profile", { displayName: "Gate Tester" });
  if (prof.status !== 200) throw new Error(`create_profile failed: ${JSON.stringify(prof)}`);
  const profileId = prof.value?.id;
  if (!profileId) throw new Error(`create_profile returned no id: ${JSON.stringify(prof)}`);
  const sw = await api("switch_pack", { profileId, packId: PACK_ID });
  if (sw.status !== 200) throw new Error(`switch_pack failed: ${JSON.stringify(sw)}`);
  return profileId;
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

  const profileId = await seed();
  result.profileId = profileId;

  // ---- engine-level machine gate (deterministic, no browser) ----
  if (TAG === "before") {
    const d = await api("dictation_target", { packId: PACK_ID, offset: 0 });
    const served = d.status === 200 ? (d.value?.text ?? "") : "";
    check(
      "dictation_target serves a sentence to a zero-encounter profile (the complaint)",
      Boolean(served),
      { served: String(served).slice(0, 60) },
    );
  } else {
    const d = await api("dictation_target", { packId: PACK_ID, profileId, offset: 0 });
    const errText = String(d.value?.error ?? JSON.stringify(d.value));
    check(
      "dictation_target REFUSES a zero-encounter profile",
      d.status === 422 && errText.includes("no sentence practice is unlocked yet"),
      { status: d.status, error: errText.slice(0, 120) },
    );
    const q = await api("practice_queue", { profileId });
    const entries = q.status === 200 && Array.isArray(q.value) ? q.value : [];
    const kinds = entries.map((e) => e.kind);
    check(
      "practice_queue is non-empty and letter-level ONLY",
      entries.length > 0 && kinds.every((k) => k === "orthography"),
      { count: entries.length, kinds: [...new Set(kinds)] },
    );
    result.queueSample = entries.slice(0, 8);
  }

  // ---- browser: real app on a phone viewport ----
  const profileDir = mkdtempSync(join(tmpdir(), "lts-practice-gate-profile-"));
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
  await send("Page.enable", {}, sessionId); // Page.* fails 'wasn't found' without this
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
  await send("Page.navigate", { url: `${BASE}/?v=${TAG}` }, sessionId);
  // Resume picker first (a seeded profile exists — no onboarding navigation).
  let resumed = false;
  for (let i = 0; i < 60 && !resumed; i++) {
    await sleep(250);
    resumed = await evaluate(`(() => {
      // The chooser card's button reads 'Continue'; the profile NAME lives
      // in the card wrapper, not the button text (MOBILE-UX-001 lesson:
      // match interactive elements by their accessible container).
      const el = [...document.querySelectorAll('button')]
        .filter((b) => (b.textContent ?? '').includes('Continue'))
        .find((b) => {
          let n = b;
          for (let i = 0; i < 6 && n; i++) {
            n = n.parentElement;
            if (n && (n.textContent ?? '').includes('Gate Tester')) return true;
          }
          return false;
        });
      if (!el) return false;
      el.click();
      return true;
    })()`);
  }
  if (!resumed) throw new Error("navigation error: profile chooser never offered 'Gate Tester'");
  await sleep(700);

  // Practice tab (default route after resume; click anyway to be sure).
  await clickByText("Practice");
  await sleep(700);
  const hub = await evaluate(`(() => {
    const modes = [...document.querySelectorAll('[aria-label="Practice modes"] button, button')].filter(
      (b) => (b.textContent ?? '').includes('Speaking'),
    );
    return { speakingButtons: modes.length };
  })()`);
  await send(
    "Page.captureScreenshot",
    { format: "png", captureBeyondViewport: true },
    sessionId,
  ).then((shot) =>
    writeFileSync(join(OUT, `practice-hub-${TAG}.png`), Buffer.from(shot.data, "base64")),
  );
  if (TAG === "before") check("practice hub offers Speaking", hub.speakingButtons > 0, hub);

  await clickByText("Speaking");
  await sleep(900);
  const dict = await evaluate(`(() => {
    const s = document.querySelector('[data-testid="dict-sentence"]');
    return { sentence: s ? (s.textContent ?? '').trim() : null };
  })()`);
  await send(
    "Page.captureScreenshot",
    { format: "png", captureBeyondViewport: true },
    sessionId,
  ).then((shot) =>
    writeFileSync(join(OUT, `speaking-${TAG}.png`), Buffer.from(shot.data, "base64")),
  );
  if (TAG === "before")
    check(
      "speaking screen shows a full sentence (the complaint, reproduced)",
      Boolean(dict.sentence),
      dict,
    );
  else
    check(
      "speaking screen shows NO pack sentence for a zero-encounter profile",
      !dict.sentence,
      dict,
    );
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
