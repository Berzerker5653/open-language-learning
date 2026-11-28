#!/usr/bin/env node
/**
 * EMPTY-STATES-001 evidence capture (dev-only tooling).
 *
 * Builds the harness (apps/desktop/dist-empty-states), serves it, and drives
 * headless Chrome over raw CDP (Node 26 WebSocket — no new deps): opens each
 * empty-state surface at 390x844, waits for the in-page audit banner
 * (#audit-json), saves a screenshot and the audit JSON to
 * state/evidence/EMPTY-STATES-001/.
 *
 * Screens: hub-empty | mywords-empty | progress-zero | today-no-plan | path-empty
 *
 *   usage: node scripts/empty-states-capture.mjs
 */
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, resolve } from "node:path";

const REPO = resolve(import.meta.dirname, "..");
const DIST = join(REPO, "apps/desktop", "dist-empty-states");
const OUT = join(REPO, "state/evidence/EMPTY-STATES-001");
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
    "--user-data-dir=/tmp/lts-empty-states-capture-profile",
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

async function capture(screen) {
  await send(
    "Emulation.setDeviceMetricsOverride",
    { width: 390, height: 844, deviceScaleFactor: 1, mobile: true },
    sessionId,
  );
  await send("Page.navigate", { url: "about:blank" }, sessionId);
  await sleep(200);
  await send(
    "Page.navigate",
    { url: `http://127.0.0.1:${port}/empty-states-capture.html#${screen}` },
    sessionId,
  );
  let audit = null;
  for (let i = 0; i < 60 && !audit; i++) {
    await sleep(500);
    audit = await evaluate(
      "(() => { const p = document.querySelector('#audit-json'); return p ? p.textContent : null; })()",
    );
  }
  if (!audit) throw new Error(`no audit JSON for ${screen} (page stalled)`);
  const parsed = JSON.parse(audit);
  const shot = await send("Page.captureScreenshot", { format: "png" }, sessionId);
  writeFileSync(join(OUT, `${screen}.png`), Buffer.from(shot.data, "base64"));
  writeFileSync(join(OUT, `${screen}.audit.json`), JSON.stringify(parsed, null, 1));
  const noScroll = parsed.overflow.scrollWidth <= parsed.overflow.clientWidth;
  console.log(
    `${screen}: empty=${parsed.emptyState} glyph=${parsed.glyph} title="${parsed.title}" action=${JSON.stringify(parsed.action)} tap=${parsed.tapTarget}px scroll=${noScroll ? "ok" : "H-SCROLL!"}`,
  );
  return { screen, parsed, noScroll };
}

const results = [];
for (const screen of [
  "hub-empty",
  "mywords-empty",
  "progress-zero",
  "today-no-plan",
  "path-empty",
]) {
  results.push(await capture(screen));
}

const allPass = results.every(
  (r) => r.parsed.emptyState && r.parsed.glyph && r.parsed.title && r.noScroll,
);
console.log(
  allPass ? "ALL SCREENS: contract visible at 390px" : "SOME SCREENS FAILED THE CONTRACT",
);
ws.close();
chrome.kill();
server.close();
process.exit(allPass ? 0 : 1);
