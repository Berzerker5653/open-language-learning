#!/usr/bin/env node
/**
 * WORDCARD-OFFSCREEN-001 acceptance harness (dev-only evidence tooling).
 *
 * RED-FIRST gate for the phone word-card: drives headless Chrome over raw
 * CDP (Node built-in WebSocket — no new dependencies, same plumbing as
 * scripts/mobile-capture.mjs) at an exact phone viewport. It loads the
 * self-driving journeys harness at its `#reader` screen (mobile-screens.tsx
 * walks the real App to the graded-reading story over the fake engine),
 * then taps the FIRST button.word and asserts:
 *   1. the card's bounding box INTERSECTS the viewport (0..viewport height);
 *   2. focus landed inside the card (bottom-sheet focus management);
 *   3. the Close button itself is inside the viewport;
 *   4. clicking Close removes the card AND returns focus to the tapped word;
 *   5. no horizontal document overflow was introduced.
 * Every measured number rides into <out>/result.json and the process exits
 * non-zero on any failed assertion, so this file IS the machine gate. The
 * harness's own navigation error rides in too (a stalled journey must never
 * masquerade as a passing measurement — MOBILE-UX-001 lesson).
 * `--desktop` re-runs at a wide viewport asserting the inline card is
 * UNCHANGED: position static and present in flow.
 *
 *   usage: node scripts/wordcard-capture.mjs <out-dir> [--desktop]
 *          (serves apps/desktop/dist-mobile relative to this repo copy)
 */
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, resolve } from "node:path";

const OUT = resolve(process.argv[2] ?? "state/evidence/WORDCARD-OFFSCREEN-001");
const DESKTOP = process.argv.includes("--desktop");
const [VW, VH] = DESKTOP ? [1280, 900] : [390, 844];
const REPO = resolve(import.meta.dirname, "..");
const DIST = join(REPO, "apps/desktop", "dist-mobile");
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

const profileDir = `/tmp/lts-wordcard-capture-profile-${process.pid}`;
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

const result = { viewport: `${VW}x${VH}`, mode: DESKTOP ? "desktop" : "phone" };
const checks = [];
const check = (name, pass, measured) => {
  checks.push({ name, pass, measured });
  console.log(`${pass ? "PASS" : "FAIL"} ${name} — ${JSON.stringify(measured)}`);
};

try {
  await send(
    "Emulation.setDeviceMetricsOverride",
    { width: VW, height: VH, deviceScaleFactor: 1, mobile: !DESKTOP },
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

  await evaluate("window.scrollTo(0, 0); true");
  await sleep(400);
  await screenshot(DESKTOP ? "wide-0-before-tap.png" : "phone-0-before-tap.png");

  const wordCount = await evaluate('document.querySelectorAll("button.word").length');
  if (!wordCount) throw new Error("no button.word on the reading screen");
  await evaluate('(() => { document.querySelectorAll("button.word")[0].click(); return true; })()');

  // Poll until the card exists, then let React settle (the fake-engine
  // lookup answers in a microtask; the card re-renders with the answer).
  for (let i = 0; i < 60; i++) {
    if (await evaluate('!!document.querySelector(".word-card")')) break;
    await sleep(250);
  }
  await sleep(800);

  const m = await evaluate(`(() => {
    const card = document.querySelector(".word-card");
    if (!card) return null;
    const r = card.getBoundingClientRect();
    const cs = getComputedStyle(card);
    const close = [...card.querySelectorAll("button")].find(
      (b) => (b.textContent ?? "").trim() === "Close");
    const cr = close?.getBoundingClientRect() ?? null;
    const ae = document.activeElement;
    return {
      cardTop: Math.round(r.top), cardBottom: Math.round(r.bottom),
      position: cs.position,
      focusInside: ae !== null && (ae === card || card.contains(ae)),
      focusedTag: ae ? ae.tagName.toLowerCase() + (ae.className ? "." + String(ae.className).split(" ")[0] : "") : null,
      closeTop: cr ? Math.round(cr.top) : null,
      closeBottom: cr ? Math.round(cr.bottom) : null,
      docScrollW: document.documentElement.scrollWidth,
      docClientW: document.documentElement.clientWidth,
    };
  })()`);
  if (!m) throw new Error("word card never rendered after tapping button.word");
  result.measured = m;
  await screenshot(DESKTOP ? "wide-1-card-open.png" : "phone-1-card-open.png");

  if (DESKTOP) {
    // The inline card stays exactly as it was: an in-flow static element.
    check("wide card keeps inline (static) position", m.position === "static", {
      position: m.position,
    });
  } else {
    // ---- the card's acceptance (red on inline-flow, green on bottom sheet)
    // FULL containment, not mere intersection: a sheet whose tail or Close
    // row hangs below the fold is the same dead-tap bug in a shorter story
    // (the fixture's two sentences put the inline card at 629..904 on an
    // 844 viewport — 'intersecting' but unusable; the owner's real story
    // put it at y=1486, fully off-screen, DOGFOOD-2026-11-21 complaint-08).
    check("card fully inside the viewport", m.cardTop >= 0 && m.cardBottom <= VH, {
      cardTop: m.cardTop,
      cardBottom: m.cardBottom,
      viewportH: VH,
    });
    check("focus moved into the card on open", m.focusInside === true, {
      focusedTag: m.focusedTag,
    });
    check(
      "Close button is inside the viewport",
      m.closeTop !== null && m.closeTop >= 0 && m.closeBottom <= VH,
      { closeTop: m.closeTop, closeBottom: m.closeBottom },
    );
    check("no horizontal overflow", m.docScrollW <= m.docClientW, {
      scrollW: m.docScrollW,
      clientW: m.docClientW,
    });

    // ---- close: card gone, focus back on the tapped word ---------------
    await evaluate(`(() => {
      const card = document.querySelector(".word-card");
      const close = [...card.querySelectorAll("button")].find(
        (b) => (b.textContent ?? "").trim() === "Close");
      close.click();
      return true;
    })()`);
    await sleep(600);
    const after = await evaluate(`(() => {
      const ae = document.activeElement;
      return {
        cardGone: !document.querySelector(".word-card"),
        focusedIsWord: ae !== null && ae.classList.contains("word"),
        focusedTag: ae ? ae.tagName.toLowerCase() + (ae.className ? "." + String(ae.className).split(" ")[0] : "") : null,
      };
    })()`);
    result.afterClose = after;
    check("Close removes the card", after.cardGone === true, after);
    check("Close returns focus to the tapped word", after.focusedIsWord === true, after);
    await screenshot("phone-2-after-close.png");
  }
} catch (e) {
  result.error = String(e);
  console.error(`ERROR ${e}`);
}

result.checks = checks;
result.ok = checks.length > 0 && checks.every((c) => c.pass) && !result.error;
writeFileSync(
  join(OUT, `result-${DESKTOP ? "desktop" : "phone"}.json`),
  JSON.stringify(result, null, 1),
);
ws.close();
chrome.kill();
server.close();
try {
  spawn("rm", ["-rf", profileDir], { stdio: "ignore" });
} catch {
  // best-effort cleanup
}
console.log(result.ok ? "WORDCARD GATE PASS" : "WORDCARD GATE FAIL");
process.exit(result.ok ? 0 : 1);
