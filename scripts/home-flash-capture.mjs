#!/usr/bin/env node
/**
 * HOME-FLASH-001 acceptance capture (dev-only evidence tooling).
 *
 * Same plumbing as scripts/serve-banner-capture.mjs / copy-polish-capture.mjs
 * (real engine: lts-serve over an isolated data dir, headless Chrome at a
 * 390x844 phone viewport via CDP Emulation.setDeviceMetricsOverride — no new
 * deps), but the oracle is the load-flicker rule from the 2026-11-23 audit
 * (state/notes/UI-VERIFY-2026-11-23.md defect 7): opening a profile with an
 * installed+pinned pack must NOT render the pack-absent warning.
 *
 * Sequence:
 *   1. fresh profile (install + create + switch, NO seeded traffic);
 *   2. navigate, click Continue (resume);
 *   3. poll the rendered home text every ~200ms for the first 5s and record
 *      EVERY occurrence of the pack-absent label AND of the pack-read-failure
 *      notice (red = >=1 occurrence of either);
 *   4. wait for a stable pack-loaded home, then capture it.
 * CAPTURE_TAG=<red-at-HEAD|green> labels the run. No Rust changes.
 *
 *   usage: SERVE_BIN=<path> SERVE_DIST=<dist dir> \
 *          node scripts/home-flash-capture.mjs
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
const OUT = join(REPO, "state/evidence/HOME-FLASH-001");
mkdirSync(OUT, { recursive: true });
const PACK_ID = "org.openlanguage.ru-ru.reference";
const PROFILE = "Home Flash";
const VW = 390;
const VH = 844;
const PORT = 18000 + (process.pid % 60);
const BASE = `http://127.0.0.1:${PORT}`;

const result = {
  viewport: `${VW}x${VH}`,
  tag: TAG,
  checks: [],
  failures: 0,
  error: null,
  pollLog: [],
};
const check = (name, pass, measured) => {
  result.checks.push({ name, pass, measured });
  if (!pass) result.failures++;
  console.log(`${pass ? "PASS" : "FAIL"} ${name} — ${JSON.stringify(measured)}`);
};

const dataDir = mkdtempSync(join(tmpdir(), "lts-homeflash-data-"));
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
      // not up yet
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

  const profileDir = mkdtempSync(join(tmpdir(), "lts-homeflash-chrome-"));
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
  async function shot(name) {
    const s = await send(
      "Page.captureScreenshot",
      { format: "png", captureBeyondViewport: false },
      sessionId,
    );
    writeFileSync(join(OUT, `${name}-${TAG}.png`), Buffer.from(s.data, "base64"));
  }

  await send(
    "Emulation.setDeviceMetricsOverride",
    { width: VW, height: VH, deviceScaleFactor: 1, mobile: true },
    sessionId,
  );
  await send("Page.navigate", { url: `${BASE}/?v=homeflash` }, sessionId);
  // Find the Continue button for the profile and click it; record time.
  let clicked = false;
  for (let i = 0; i < 80 && !clicked; i++) {
    await sleep(250);
    clicked = await evaluate(`(() => {
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
  if (!clicked) throw new Error(`navigation error: profile chooser never offered ${PROFILE}`);

  // ---- THE poll: every ~200ms for the first 5s after resume. ----
  const t0 = Date.now();
  const pollLog = [];
  for (let i = 0; i < 25; i++) {
    await sleep(200);
    const hit = await evaluate(`(() => {
      const t = document.body.innerText;
      return {
        noLanguage: t.includes('No language is set'),
        packUnread: t.includes('could not read which language pack'),
        text: t.slice(0, 300),
      };
    })()`);
    const occurrences = [];
    if (hit.noLanguage) occurrences.push("No language is set");
    if (hit.packUnread) occurrences.push("could not read which language pack");
    const entry = { t: Date.now() - t0, occurrences, text: hit.text };
    pollLog.push(entry);
    if (occurrences.length) console.log(`poll t=${entry.t}ms: ${JSON.stringify(occurrences)}`);
  }
  result.pollLog = pollLog;
  const occurrenceCount = pollLog.filter((e) => e.occurrences.length > 0).length;
  check(
    "load-flicker contract: zero pack-absent/pack-unread occurrences in the first 5s after resume",
    occurrenceCount === 0,
    {
      occurrenceCount,
      occurrences: pollLog
        .filter((e) => e.occurrences.length)
        .map((e) => ({ t: e.t, occurrences: e.occurrences })),
    },
  );

  // ---- stable pack-loaded home before the healthy-home capture ----
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
  for (let i = 0; i < 60 && healthyStreak < 3; i++) {
    await sleep(300);
    healthyStreak = (await homeHealthy()) ? healthyStreak + 1 : 0;
  }
  check(
    "home reached a stable pack-loaded state with exactly one pin before capture",
    healthyStreak >= 3,
    { healthyStreak },
  );
  await shot("home");

  writeFileSync(join(OUT, `result-${TAG}.json`), JSON.stringify(result, null, 2));
} catch (e) {
  result.error = String(e?.message ?? e);
  console.error(`FATAL: ${result.error}`);
  writeFileSync(join(OUT, `result-${TAG}.json`), JSON.stringify(result, null, 2));
  process.exit(1);
} finally {
  try {
    chrome?.kill("SIGTERM");
  } catch {
    /* already dead */
  }
  try {
    serve?.kill("SIGTERM");
  } catch {
    /* already dead */
  }
}

console.log(
  `\n${result.failures ? result.failures + " CHECK(S) FAILED" : "ALL CHECKS PASSED"} (tag=${TAG}, occurrences=${result.pollLog.filter((e) => e.occurrences.length).length})`,
);
process.exit(result.failures ? 1 : 0);
