#!/usr/bin/env node
/**
 * SESSION-FLOW-COPY-001 acceptance harness (dev-only evidence tooling).
 *
 * Machine gate + screenshots for the one-click session flow (owner phone
 * dogfood 2026-11-21: every activity inside one session demanded a fresh
 * "Start practicing" click). Drives headless Chrome over raw CDP at a phone
 * viewport (same plumbing as scripts/reading-clutter-capture.mjs), loading
 * the self-driving mobile harness at its `#session` screen — the session
 * journey's exact shape (one JA profile, two planned activities). The walk
 * starts the session, answers activity one, clicks "Continue to next
 * activity" — and this script then measures the transition itself:
 *   1. a bridge appears, naming what comes next ("Next: <what>");
 *   2. after the bridge the next runner is open, the lesson encounter card
 *      never re-rendered, and NO Start control exists anywhere — the
 *      session advanced without a click wall;
 *   3. the bridge carries its own pause control (the explicit accessibility
 *      escape of the auto-advance);
 *   4. the harness's own navigation error (MOBILE-UX-001 rule) rides into
 *      the result and fails the gate loudly.
 * Every measured value lands in <out>/result.json; any failed assertion
 * exits non-zero, so this file IS the gate.
 *
 *   usage: node scripts/session-flow-capture.mjs <out-dir>
 *          (serves apps/desktop/dist-mobile relative to this repo copy;
 *           set LTS_MOBILE_DIST to point at another dist)
 */
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, resolve } from "node:path";

const OUT = resolve(process.argv[2] ?? "state/evidence/SESSION-FLOW-COPY-001");
const VW = 390;
const VH = 844;
const REPO = resolve(import.meta.dirname, "..");
const DIST = resolve(process.env.LTS_MOBILE_DIST ?? join(REPO, "apps/desktop", "dist-mobile"));
mkdirSync(OUT, { recursive: true });

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

const profileDir = `/tmp/lts-session-flow-capture-profile-${process.pid}`;
const chrome = spawn(
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
for (let i = 0; !wsUrl && i < 100; i++) await new Promise((r) => setTimeout(r, 100));
if (!wsUrl) {
  console.error("chrome did not report a DevTools WebSocket URL");
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

async function screenshot(name) {
  const shot = await send("Page.captureScreenshot", { format: "png" }, sessionId);
  writeFileSync(join(OUT, name), Buffer.from(shot.data, "base64"));
}

const result = { viewport: `${VW}x${VH}`, mode: "phone" };
const checks = [];
const check = (name, pass, measured) => {
  checks.push({ name, pass, measured });
  console.log(`${pass ? "PASS" : "FAIL"} ${name} — ${JSON.stringify(measured)}`);
};

try {
  await send(
    "Emulation.setDeviceMetricsOverride",
    { width: VW, height: VH, deviceScaleFactor: 1, mobile: true },
    sessionId,
  );
  await send(
    "Page.navigate",
    { url: `http://127.0.0.1:${port}/mobile-harness.html#session` },
    sessionId,
  );

  // 1. Catch the bridge as it appears (the walk drives up to the
  //    "Continue to next activity" click; the transition is the
  //    measurement). Fast polling: the bridge lives ~1.2s.
  let bridge = null;
  for (let i = 0; i < 160 && !bridge; i++) {
    await sleep(100);
    bridge = await evaluate(`(() => {
      const b = document.querySelector('[data-testid="session-bridge"]');
      if (!b) return null;
      const label = b.querySelector(".session-bridge-label");
      const pause = b.querySelector("[data-session-pause]");
      return {
        label: (label?.textContent ?? "").trim(),
        announced: label?.getAttribute("role") === "status",
        pauseControl: Boolean(pause),
      };
    })()`);
  }
  if (!bridge) throw new Error("the session advanced without ever rendering a bridge");
  result.bridge = bridge;
  check("bridge appears", true, bridge);
  check(
    "bridge names the next activity (en-US 'Next: <what>')",
    /^Next: [A-Za-z]/.test(bridge.label) && !/recognis|practis/i.test(bridge.label),
    bridge.label,
  );
  check("bridge is announced (role=status)", bridge.announced, bridge.announced);
  check("bridge carries its own pause control", bridge.pauseControl, bridge.pauseControl);
  await screenshot("session-bridge.png");

  // 2. The runner opens on its own: no lesson card, no Start control,
  //    Practice section live.
  let runner = null;
  for (let i = 0; i < 100 && !runner; i++) {
    await sleep(100);
    runner = await evaluate(`(() => {
      const practice = document.querySelector('[aria-label="Practice"]');
      if (!practice) return null;
      const startButtons = [...document.querySelectorAll("button")].filter((b) =>
        (b.textContent ?? "").includes("Start practicing"));
      return {
        practiceOpen: true,
        lessonCard: Boolean(document.querySelector('[aria-label="Lesson"]')),
        startButtons: startButtons.map((b) => (b.textContent ?? "").trim()),
        bridgeGone: !document.querySelector('[data-testid="session-bridge"]'),
      };
    })()`);
  }
  if (!runner) throw new Error("the next activity never opened on its own after the bridge");
  result.afterBridge = runner;
  check("runner auto-opened after the bridge", runner.practiceOpen && runner.bridgeGone, runner);
  check(
    "no lesson card re-gate, no Start control",
    !runner.lessonCard && !runner.startButtons.length,
    runner,
  );
  await screenshot("session-after-bridge.png");

  // 3. The walk's own audit/banner (navigation error rides in — MOBILE-UX-001).
  let audit = null;
  for (let i = 0; i < 160 && !audit; i++) {
    await sleep(250);
    audit = await evaluate(
      '(() => { const p = document.querySelector("#audit-json"); return p ? p.textContent : null; })()',
    );
  }
  if (audit) {
    const nav = JSON.parse(audit);
    result.harness_audit = { screen: nav.screen, error: nav.error, fails: nav.fails };
    check("harness navigation clean", !nav.error, nav.error ?? null);
    if (nav.error) throw new Error(`mobile harness navigation failed: ${nav.error}`);
  } else {
    check("harness navigation clean", false, "audit never published (page stalled)");
    throw new Error("mobile harness never published its audit (page stalled)");
  }
} catch (e) {
  check("gate", false, String(e));
}

result.checks = checks;
result.pass = checks.every((c) => c.pass);
writeFileSync(join(OUT, "result.json"), JSON.stringify(result, null, 2) + "\n");
console.log(result.pass ? "SESSION FLOW GATE: PASS" : "SESSION FLOW GATE: FAIL");
chrome.kill();
server.close();
process.exit(result.pass ? 0 : 1);
