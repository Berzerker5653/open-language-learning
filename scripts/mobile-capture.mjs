#!/usr/bin/env node
/**
 * MOBILE-UX-001 evidence capture (dev-only tooling).
 *
 * Drives headless Chrome over raw CDP (Node 26's built-in WebSocket — no new
 * dependencies): serves the built harness (apps/desktop/dist-mobile), opens
 * each screen at an exact phone viewport via Emulation.setDeviceMetricsOverride,
 * waits for the in-page audit banner (#audit-json), then saves a screenshot
 * and the tap-target/overflow audit JSON.
 *
 *   usage: node scripts/mobile-capture.mjs <before|after>
 */
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, resolve } from "node:path";

const TAG = process.argv[2];
if (!["before", "after"].includes(TAG ?? "")) {
  console.error("usage: node scripts/mobile-capture.mjs <before|after>");
  process.exit(2);
}
const REPO = resolve(import.meta.dirname, "..");
const DIST = join(REPO, "apps/desktop", "dist-mobile");
const OUT = join(REPO, "state/evidence/MOBILE-UX-001", TAG);
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

const chrome = spawn(
  process.env.CHROME ?? "google-chrome-stable",
  [
    "--headless=new",
    "--no-sandbox",
    "--disable-gpu",
    `--remote-debugging-port=0`,
    "--user-data-dir=/tmp/lts-mobile-capture-profile",
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

async function capture(screen, width, height) {
  await send(
    "Emulation.setDeviceMetricsOverride",
    { width, height, deviceScaleFactor: 1, mobile: true },
    sessionId,
  );
  // full reload: a hash-only navigate would reuse the mounted page
  await send("Page.navigate", { url: "about:blank" }, sessionId);
  await sleep(200);
  await send(
    "Page.navigate",
    { url: `http://127.0.0.1:${port}/mobile-harness.html#${screen}` },
    sessionId,
  );
  let audit = null;
  for (let i = 0; i < 120 && !audit; i++) {
    await sleep(500);
    audit = await evaluate(
      "(() => { const p = document.querySelector('#audit-json'); return p ? p.textContent : null; })()",
    );
  }
  if (!audit) throw new Error(`no audit JSON for ${screen} @ ${width} (page stalled)`);
  const parsed = JSON.parse(audit);
  const shot = await send("Page.captureScreenshot", { format: "png" }, sessionId);
  writeFileSync(join(OUT, `${screen}-${width}.png`), Buffer.from(shot.data, "base64"));
  writeFileSync(join(OUT, `${screen}-${width}.audit.json`), JSON.stringify(parsed, null, 1));
  const fails = parsed.boxes.filter((b) => !b.inline && (b.w < 44 || b.h < 44));
  const hs =
    parsed.overflow.scrollWidth > parsed.overflow.clientWidth ? "H-SCROLL!" : "no-h-scroll";
  console.log(
    `captured ${screen} @ ${width}x${height}: ${hs}, ${parsed.boxes.length} boxes, tap<44px=${fails.length}`,
    fails.map((b) => `${b.tag}[${b.w}x${b.h}]`).join(" ") || "",
  );
}

for (const screen of ["onboarding", "today", "drill", "reader", "settings"]) {
  for (const [w, h] of [
    [390, 844],
    [412, 915],
  ]) {
    await capture(screen, w, h);
  }
}

ws.close();
chrome.kill();
server.close();
