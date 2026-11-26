#!/usr/bin/env node
/**
 * ACCUMULATION-METERS-001 evidence capture (dev-only tooling).
 *
 * Builds the harness (apps/desktop/dist-accumulation), serves it, and drives
 * headless Chrome over raw CDP: opens the Today header with the meters
 * settled at 390x844, saves a screenshot + audit JSON to
 * state/evidence/ACCUMULATION-METERS-001/.
 *
 *   usage: node scripts/accumulation-capture.mjs
 */
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, resolve } from "node:path";

const REPO = resolve(import.meta.dirname, "..");
const DIST = join(REPO, "apps/desktop", "dist-accumulation");
const OUT = join(REPO, "state/evidence/ACCUMULATION-METERS-001");
mkdirSync(OUT, { recursive: true });

const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml" };
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
    "--remote-debugging-port=0",
    "--user-data-dir=/tmp/lts-accumulation-capture-profile",
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

await send(
  "Emulation.setDeviceMetricsOverride",
  { width: 390, height: 844, deviceScaleFactor: 1, mobile: true },
  sessionId,
);
await send("Page.navigate", { url: `http://127.0.0.1:${port}/accumulation-capture.html` }, sessionId);
let audit = null;
for (let i = 0; i < 60 && !audit; i++) {
  await sleep(500);
  audit = await evaluate(
    "(() => { const p = document.querySelector('#audit-json'); return p ? p.textContent : null; })()",
  );
}
if (!audit) throw new Error("no audit JSON (page stalled)");
const parsed = JSON.parse(audit);
const shot = await send("Page.captureScreenshot", { format: "png" }, sessionId);
writeFileSync(join(OUT, "today-meters.png"), Buffer.from(shot.data, "base64"));
writeFileSync(join(OUT, "today-meters.audit.json"), JSON.stringify(parsed, null, 1));

const oneLine = parsed.myWords && parsed.worlds && parsed.myWords.top === parsed.worlds.top;
const noScroll = parsed.overflow.scrollWidth <= parsed.overflow.clientWidth;
const stripOneLine = parsed.stripHeight != null && parsed.stripHeight <= 28 && parsed.stripScrollW <= parsed.stripClientW;

console.log(JSON.stringify(parsed, null, 1));
console.log(`strip=${parsed.stripRendered ? "rendered" : "MISSING"} oneLine=${oneLine ? "ok" : "WRAPPED"} noScroll=${noScroll ? "ok" : "H-SCROLL!"} stripOneLine=${stripOneLine ? "ok" : "FAIL"}`);
const pass = parsed.stripRendered && oneLine && noScroll && stripOneLine && parsed.myWords && parsed.worlds;
ws.close();
chrome.kill();
server.close();
process.exit(pass ? 0 : 1);
