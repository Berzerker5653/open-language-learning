#!/usr/bin/env node
/**
 * SETTINGS-SCOPE-001 acceptance capture (dev-only evidence tooling).
 *
 * Same plumbing as scripts/mobile-capture.mjs / wordcard-capture.mjs:
 * headless Chrome over raw CDP (Node built-in WebSocket — no new deps),
 * serving the built journeys harness (apps/desktop/dist-mobile) at an exact
 * phone viewport. Three Settings scenarios ride the seeded journeys engine
 * (mobile-screens.tsx): #settings-ru (RU-only install), #settings-ja (the
 * store's ja-demo pack installed), #settings-both (both packs, RU active).
 *
 * The gate is machine-checked, not eyeballed: the script counts the romaji
 * radio group per scenario and asserts the expectation for the tag —
 *   before: romaji visible in RU-only (the bug);
 *   after:  hidden in RU-only, visible with ja installed (both shapes).
 * Harness navigation errors ride into result.json and fail the run
 * (MOBILE-UX-001 lesson). Screenshots land next to result.json.
 *
 *   usage: node scripts/settings-scope-capture.mjs <before|after>
 */
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, resolve } from "node:path";

const TAG = process.argv[2];
if (!["before", "after"].includes(TAG ?? "")) {
  console.error("usage: node scripts/settings-scope-capture.mjs <before|after>");
  process.exit(2);
}
const REPO = resolve(import.meta.dirname, "..");
const DIST = join(REPO, "apps/desktop", "dist-mobile");
const OUT = join(REPO, "state/evidence/SETTINGS-SCOPE-001", TAG);
mkdirSync(OUT, { recursive: true });

// Expected romaji-card visibility per install shape, per tag.
const EXPECT = {
  before: { "settings-ru": true, "settings-ja": true, "settings-both": true },
  after: { "settings-ru": false, "settings-ja": true, "settings-both": true },
}[TAG];
const SCREENS = ["settings-ru", "settings-ja", "settings-both"];
const VW = 390;
const VH = 844;

const MIME = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
};
const server = createServer((req, res) => {
  const path = join(DIST, req.url.split("?")[0].replace(/^\/+/, "") || "index.html");
  try {
    const body = readFileSync(path);
    res.writeHead(200, { "content-type": MIME[extname(path)] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const port = server.address().port;

const profileDir = `/tmp/lts-settings-scope-profile-${process.pid}`;
const chrome = spawn(
  process.env.CHROME ?? "google-chrome-stable",
  [
    "--headless=new",
    "--no-sandbox",
    "--disable-gpu",
    `--remote-debugging-port=0`,
    `--user-data-dir=${profileDir}`,
  ],
  { stdio: ["ignore", "pipe", "pipe"] },
);
let wsUrl = null;
chrome.stderr.on("data", (chunk) => {
  const m = /DevTools listening on (ws:\/\/\S+)/.exec(chunk.toString());
  if (m) wsUrl = m[1];
});
for (let i = 0; !wsUrl && i < 100; i++) await new Promise((r) => setTimeout(r, 100));
if (!wsUrl) {
  console.error("chrome did not report a DevTools WebSocket URL");
  server.close();
  chrome.kill();
  process.exit(1);
}

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

const result = { tag: TAG, viewport: `${VW}x${VH}`, scenarios: [], failures: 0 };
const checks = [];
const check = (name, pass, measured) => {
  checks.push({ name, pass, measured });
  if (!pass) result.failures++;
  console.log(`${pass ? "PASS" : "FAIL"} ${name} — ${JSON.stringify(measured)}`);
};

try {
  await send(
    "Emulation.setDeviceMetricsOverride",
    { width: VW, height: VH, deviceScaleFactor: 1, mobile: true },
    sessionId,
  );
  for (const screen of SCREENS) {
    // A hash-only URL change does NOT reload the document — without the
    // ?v= bust the second and third screens measure the first screen's
    // stale engine (controller probe 2026-11-21 caught 0-radio false fails
    // on #settings-ja from a lingering RU page). Each screen = fresh load.
    await send(
      "Page.navigate",
      { url: `http://127.0.0.1:${port}/mobile-harness.html?v=${screen}#${screen}` },
      sessionId,
    );
    // The self-driving journey publishes its audit; its error field carries
    // any navigation stall, which must fail this gate loudly.
    let audit = null;
    for (let i = 0; i < 160 && !audit; i++) {
      await sleep(250);
      audit = await evaluate(
        '(() => { const p = document.querySelector("#audit-json"); return p ? p.textContent : null; })()',
      );
    }
    if (!audit) throw new Error(`mobile harness never published its audit for #${screen}`);
    const nav = JSON.parse(audit);
    if (nav.error) throw new Error(`mobile harness navigation failed on #${screen}: ${nav.error}`);

    // Count INTERACTIVE romaji controls (never body text — the banner
    // pollution lesson from WEB-HISTORY-001).
    const m = await evaluate(`(() => {
      const radios = [...document.querySelectorAll('input[name="romaji-mode"]')];
      const labels = [...document.querySelectorAll('button, a, input, select')];
      return {
        romajiRadios: radios.length,
        romajiHeading: [...document.querySelectorAll('h3')].some(
          (h) => (h.textContent ?? '').includes('Romaji (romanisation) display')),
        settingsAlive: !!document.querySelector('section[aria-label="Settings"]'),
        profileDataAlive: labels.length > 0 && [...document.querySelectorAll('.card')].some(
          (c) => (c.textContent ?? '').includes('Profile data')),
      };
    })()`);
    const row = { screen, measured: m, expectRomaji: EXPECT[screen] };
    result.scenarios.push(row);
    await send(
      "Page.captureScreenshot",
      // Full-page: the romaji card sits below the Settings fold, and a
      // viewport-only shot cannot show its presence/absence (vision check
      // caught this). The tall PNG proves the claim to a human reader.
      { format: "png", captureBeyondViewport: true },
      sessionId,
    ).then((shot) => writeFileSync(join(OUT, `settings-${TAG}-${screen}.png`), Buffer.from(shot.data, "base64")));
    check(`${screen}: Settings renders`, m.settingsAlive && m.profileDataAlive, {
      settingsAlive: m.settingsAlive,
      profileDataAlive: m.profileDataAlive,
    });
    check(
      `${screen}: romaji card ${EXPECT[screen] ? "present" : "absent"} as declared`,
      m.romajiRadios > 0 === EXPECT[screen] && m.romajiHeading === EXPECT[screen],
      { romajiRadios: m.romajiRadios, romajiHeading: m.romajiHeading, expected: EXPECT[screen] },
    );
  }
} finally {
  result.checks = checks;
  writeFileSync(join(OUT, "result.json"), JSON.stringify(result, null, 2) + "\n");
  server.close();
  chrome.kill();
}
console.log(`wrote ${OUT}/result.json (${checks.filter((c) => c.pass).length}/${checks.length} pass)`);
process.exit(result.failures === 0 ? 0 : 1);
