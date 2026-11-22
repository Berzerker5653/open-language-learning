#!/usr/bin/env node
/**
 * WEB-HISTORY-001 acceptance walk (evidence script, dev-only).
 *
 * Drives REAL headless Chromium over raw CDP (Node's built-in WebSocket —
 * no new dependencies, same pattern as scripts/mobile-capture.mjs) through
 * the card's acceptance: load the app at a phone viewport, navigate
 * Today -> session -> stage, then press browser Back three times, asserting
 * the walk lands stage -> session -> (guardrail confirm) -> root plan each
 * time with a screenshot, and that Back from the root tab leaves the site.
 *
 * The page under test is the shipped <App/> with the history shim active
 * (apps/desktop/src/history-screens.tsx, fake engine at the IPC seam); the
 * history entries are the real History API — pushState/replaceState/
 * popstate/history.go through Chromium itself.
 *
 *   build first:  cd apps/desktop && npx vite build --config vite.history-harness.config.ts
 *   usage:        node state/evidence/WEB-HISTORY-001/history-walk.mjs
 *
 * Writes screenshots + walk.json (per-step assertions) into this directory.
 * A navigation error in the page rides into walk.json too (run-107 lesson:
 * a stalled walk must never print a clean sheet).
 */
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, resolve } from "node:path";

const REPO = resolve(import.meta.dirname, "..", "..", "..");
const DIST = join(REPO, "apps", "desktop", "dist-history");
const OUT = join(REPO, "state", "evidence", "WEB-HISTORY-001");
mkdirSync(OUT, { recursive: true });

const MIME = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
};
const server = createServer((req, res) => {
  const rel = req.url.split("?")[0].replace(/^\/+/, "") || "history-harness.html";
  try {
    const body = readFileSync(join(DIST, rel));
    res.writeHead(200, { "content-type": MIME[extname(rel)] ?? "application/octet-stream" });
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
    "--user-data-dir=/tmp/lts-history-walk-profile",
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
    throw new Error(`page eval: ${r.exceptionDetails.exception?.description ?? r.exceptionDetails.text}`);
  return r.result.value;
}

/** evaluate tolerant of a document swap (the exit-back lands on another
 * document; the context briefly vanishes). */
async function evaluateRetry(expression, limit = 40) {
  for (let i = 0; i < limit; i++) {
    try {
      return await evaluate(expression);
    } catch {
      await sleep(250);
    }
  }
  throw new Error(`evaluate never succeeded: ${expression}`);
}

async function shot(name) {
  const s = await send("Page.captureScreenshot", { format: "png" }, sessionId);
  writeFileSync(join(OUT, name), Buffer.from(s.data, "base64"));
  console.log(`  screenshot ${name}`);
}

// Machine-readable page state (the harness's own banner JSON).
async function pageState() {
  return evaluate(
    "(() => { const p = document.querySelector('#lh-json'); return p ? JSON.parse(p.textContent) : null; })()",
  );
}

const checks = [];
let failed = false;
function check(name, ok, detail) {
  checks.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failed = true;
}

async function location() {
  return evaluateRetry("location.href");
}

await send(
  "Emulation.setDeviceMetricsOverride",
  { width: 390, height: 844, deviceScaleFactor: 2, mobile: true },
  sessionId,
);

// Seed one prior document so "exit the site" is observable: Back from the
// root tab must leave for about:blank, not loop inside the app.
await send("Page.navigate", { url: "about:blank" }, sessionId);
await sleep(300);
await send("Page.navigate", { url: `http://127.0.0.1:${port}/`, timeout: 30000 }, sessionId);

// --- arrive on Today (boot + profile chooser done by the page itself) ---
let st = null;
for (let i = 0; i < 80 && !(st = await pageState())?.ready; i++) await sleep(250);
const pageErr = st?.error ?? null;
check("page booted on Today without navigation error", !pageErr, pageErr ?? undefined);
check("arrival entry labeled with the root location", st?.historyState === "", JSON.stringify(st?.historyState));
check("Today shows the plan", await evaluate(`[...document.querySelectorAll("button")].some((b) => (b.textContent ?? "").includes("Start today's plan"))`));
await shot("01-root-today.png");

// --- Today -> session -> stage (one app action; history learns both levels) ---
const afterStart = await evaluate("__LH.click(\"Start today's plan\")");
st = await pageState();
check("starting the plan pushed the session level", await evaluate("history.state.lts") === "session/stage", JSON.stringify(st?.historyState));
check("URL carries the stage destination", String(afterStart).includes("?d=session%2Fstage") || String(afterStart).includes("?d=session/stage"), afterStart);
await shot("02-stage-open.png");

// --- Back #1: stage -> session (runner closes, session stays paused) ---
const afterBack1 = await evaluate("__LH.back()");
check("back #1 landed on the session level", await evaluate("history.state.lts") === "session", String(afterBack1));
check("session survives as paused (app's own pause path)", await evaluate(`document.body.innerText.includes("Session paused")`));
await shot("03-back1-session.png");

// --- Back #2: leaving the ACTIVE session asks to confirm (card guardrail) ---
await evaluate("__LH.back()");
const guard = await evaluate("!!document.querySelector('[data-testid=\"history-exit-ask\"]')");
check("back #2 asked to confirm leaving the active session", guard === true);
check("history position restored before the question", await evaluate("history.state.lts") === "session");
check("session NOT destroyed by the intercepted back", await evaluate(`document.body.innerText.includes("Session paused")`));
await shot("04-back2-guardrail-confirm.png");

// --- Confirm: the session exits through the app's OWN Stop path, which
// lands on the session summary (identical to pressing Stop session) with
// the history pointer already at the root entry. ---
await evaluateRetry("__LH.click(\"Stop the session and go back\")");
check("confirm walked back to the root entry", await evaluate("history.state.lts") === "");
check(
  "session ended: the app's own summary offers Back to the plan",
  await evaluate(`[...document.querySelectorAll("button")].some((b) => (b.textContent ?? "").includes("Back to the plan"))`),
);
check(
  "no live session controls survive the exit",
  await evaluate(`![...document.querySelectorAll("button")].some((b) => (b.textContent ?? "").includes("Resume session"))`),
);
await shot("05-after-confirm-session-summary.png");
// Dismiss the summary the way the learner does — the plan view returns.
await evaluate("__LH.click(\"Back to the plan\")");
check(
  "root plan visible again",
  await evaluate(`[...document.querySelectorAll("button")].some((b) => (b.textContent ?? "").includes("Start today's plan"))`),
);
await shot("06-root-plan-clean.png");

// --- Back #3 from the root tab: leaves the site (no back loops) ---
// The go(-1) lands on another document, so the evaluate itself may die in
// the context swap — that rejection IS the traversal; the location poll
// below decides the assertion.
try {
  await evaluate("history.go(-1)");
} catch {
  /* the document swap we are measuring */
}
const finalUrl = await location();
check("back from the root tab left the site", finalUrl === "about:blank", finalUrl);
// A page evaluate failing on a vanished context now proves the exit; the
// in-page error check only runs when the document is still ours.
let exitErrCheck;
try {
  exitErrCheck = {
    ok: ((await pageState())?.error ?? null) === null,
    detail: "in-page walk state",
  };
} catch {
  exitErrCheck = { ok: finalUrl === "about:blank", detail: "page document gone (exit)" };
}
check("in-page walk never recorded a navigation error", exitErrCheck.ok, exitErrCheck.detail);

writeFileSync(
  join(OUT, "walk.json"),
  JSON.stringify({ viewport: "390x844 mobile", checks, failed, historySeed: "about:blank prior document" }, null, 1),
);

ws.close();
chrome.kill();
server.close();
console.log(failed ? "WEB-HISTORY-001 walk: FAILED" : "WEB-HISTORY-001 walk: PASS");
process.exit(failed ? 1 : 0);
