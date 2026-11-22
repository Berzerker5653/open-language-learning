#!/usr/bin/env node
/**
 * READING-CLUTTER-001 acceptance harness (dev-only evidence tooling).
 *
 * RED-FIRST machine gate for the clean learner reading view (controller
 * browser audit 2026-11-21 + owner ruling on this card): drives headless
 * Chrome over raw CDP (Node built-in WebSocket — same plumbing as
 * scripts/wordcard-capture.mjs) at an exact phone viewport. It loads the
 * self-driving journeys harness at its `#reader` screen (mobile-screens.tsx
 * walks the real App to the graded-reading story over the fake engine),
 * then measures the STORY FLOW itself:
 *   1. NO confirm button anywhere inside .reader-paragraph (before the
 *      fix every sentence carried an inline "This looks right" — the
 *      button wall the owner struck out);
 *   2. no raw morphology tag (`nom.sg` style) anywhere in the paragraph
 *      text (the ja fixture story ships no label sidecar, so this check is
 *      a tripwire, not the primary pin — the chip removal itself is pinned
 *      by reading.test.tsx's RU label fixtures);
 *   3. exactly ONE story-level content-confirm control under the
 *      paragraph, carrying the quiet question copy;
 *   4. that control is REACHABLE: after scrolling it into view its box
 *      sits fully inside the phone viewport (the mechanic exited the prose
 *      but stays usable);
 *   5. no horizontal document overflow.
 * Every measured number rides into <out>/result.json and the process exits
 * non-zero on any failed assertion, so this file IS the gate. The
 * harness's own navigation error rides in too (MOBILE-UX-001 lesson: a
 * stalled journey must never masquerade as a passing measurement).
 *
 *   usage: node scripts/reading-clutter-capture.mjs <out-dir>
 *          (serves apps/desktop/dist-mobile relative to this repo copy;
 *           set LTS_MOBILE_DIST to point at another dist — e.g. a HEAD
 *           worktree build for the RED before-run)
 */
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, resolve } from "node:path";

const OUT = resolve(process.argv[2] ?? "state/evidence/READING-CLUTTER-001");
const [VW, VH] = [390, 844];
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

const profileDir = `/tmp/lts-reading-clutter-capture-profile-${process.pid}`;
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

const result = { viewport: `${VW}xVH`.replace("VH", String(VH)), mode: "phone" };
const checks = [];
const check = (name, pass, measured) => {
  checks.push({ name, pass, measured });
  console.log(`${pass ? "PASS" : "FAIL"} ${name} — ${JSON.stringify(measured)}`);
};

let exitCode = 0;
try {
  await send(
    "Emulation.setDeviceMetricsOverride",
    { width: VW, height: VH, deviceScaleFactor: 1, mobile: true },
    sessionId,
  );
  await send(
    "Page.navigate",
    { url: `http://127.0.0.1:${port}/mobile-harness.html#reader` },
    sessionId,
  );

  // The self-driving journey ends by publishing its audit JSON; its `error`
  // field carries any navigation stall, which must fail this gate loudly.
  let audit = null;
  for (let i = 0; i < 160 && !audit; i++) {
    await sleep(250);
    audit = await evaluate(
      '(() => { const p = document.querySelector("#audit-json"); return p ? p.textContent : null; })()',
    );
  }
  if (!audit) throw new Error("mobile harness never published its audit (page stalled)");
  const nav = JSON.parse(audit);
  if (nav.error) throw new Error(`mobile harness navigation failed: ${nav.error}`);
  result.harness_audit = { screen: nav.screen, error: nav.error, fails: nav.fails };
  if ((nav.fails ?? []).length)
    throw new Error(`mobile-screens audit reported fails: ${JSON.stringify(nav.fails)}`);

  await evaluate("window.scrollTo(0, 0); true");
  await sleep(400);

  const m = await evaluate(`(() => {
    const para = document.querySelector(".reader-paragraph");
    if (!para) return null;
    const words = [...para.querySelectorAll("button")];
    const inProse = words.filter((b) =>
      (b.textContent ?? "").includes("looks right") ||
      (b.textContent ?? "").trim() === "Undo" ||
      b.classList.contains("sentence-confirm"));
    const paraText = para.textContent ?? "";
    const rawTag = /\\b(?:nom|gen|dat|acc|ins|voc|prep)\\.(?:sg|pl)\\b|\\b(?:impf|perf)\\.(?:pres|past|fut)\\b/.exec(paraText);
    const controls = [...document.querySelectorAll("button.story-confirm-toggle")];
    return {
      buttonsInProse: words.length,
      confirmButtonsInProse: inProse.length,
      rawTag: rawTag ? rawTag[0] : null,
      storyControls: controls.length,
      questionVisible: [...document.querySelectorAll(".story-confirm-question")]
        .map((e) => (e.textContent ?? "").trim()),
      docScrollW: document.documentElement.scrollWidth,
      docClientW: document.documentElement.clientWidth,
    };
  })()`);
  if (!m) throw new Error("no .reader-paragraph on the reading screen");
  result.measured = m;
  await screenshot("phone-0-story-flow.png");

  // ---- the card's acceptance (red at HEAD: inline sentence-confirm wall,
  // no story-level control)
  check("no confirm control inside the story prose", m.confirmButtonsInProse === 0, {
    confirmButtonsInProse: m.confirmButtonsInProse,
    buttonsInProse: m.buttonsInProse,
  });
  check("no raw morphology tag in the story text", m.rawTag === null, { rawTag: m.rawTag });
  check("exactly one story-level confirm control", m.storyControls === 1, {
    storyControls: m.storyControls,
    questionVisible: m.questionVisible,
  });

  // ---- reachability: scroll the control into view and measure its box
  const box = await evaluate(`(() => {
    const c = document.querySelector("button.story-confirm-toggle");
    if (!c) return null;
    c.scrollIntoView({ block: "center" });
    const r = c.getBoundingClientRect();
    return { top: Math.round(r.top), bottom: Math.round(r.bottom), height: Math.round(r.height) };
  })()`);
  result.confirmBox = box;
  check(
    "story confirm control is reachable in the viewport",
    box !== null && box.top >= 0 && box.bottom <= VH,
    { box, viewportH: VH },
  );
  if (box) await screenshot("phone-1-story-confirm.png");

  check("no horizontal overflow", m.docScrollW <= m.docClientW, {
    scrollW: m.docScrollW,
    clientW: m.docClientW,
  });
} catch (err) {
  checks.push({ name: "harness", pass: false, measured: String(err) });
  console.error(`READING-CLUTTER HARNESS ERROR: ${err}`);
}

result.checks = checks;
writeFileSync(join(OUT, "result-phone.json"), JSON.stringify(result, null, 2) + "\n");
chrome.kill();
server.close();
const failed = checks.filter((c) => !c.pass);
console.log(
  failed.length === 0
    ? "READING-CLUTTER GATE PASS"
    : `READING-CLUTTER GATE FAIL (${failed.length}/${checks.length} checks failed)`,
);
if (failed.length) exitCode = 1;
process.exit(exitCode);
