#!/usr/bin/env node
/**
 * FEEL-LOADING-001 acceptance capture (dev-only evidence tooling).
 *
 * Same plumbing as scripts/feel-global-capture.mjs (real engine: lts-serve
 * over an isolated data dir, headless Chrome at a 390x844 phone viewport,
 * raw CDP — no new deps). This card is about states that only exist WHILE
 * an IPC read is in flight, so the capture injects a 900 ms latency on the
 * page's own fetch bridge (a page.addScriptToEvaluateOnNewDocument wrapper
 * that defers every /api/, /lan/ and /pair response) and measures the live
 * DOM inside that window:
 *   1. MY WORDS: mid-prime, breathing skeleton rows stand in and neither
 *      the stale list nor a false empty state renders;
 *   2. SETTINGS: mid-prime, the skeleton strip announces the six silent
 *      reads;
 *   3. PROGRESS: the reserved shell holds every section's place — the
 *      document height barely moves when the staggered reads land (the base
 *      page reflows hard as each arrival paints);
 *   4. SAVED TICK: a mic toggle writes silently at base; here a live-role
 *      .save-tick appears after the write lands;
 *   5. INSTALL: the speech-model button reads "Installing…" with aria-busy
 *      and sibling model buttons disable while the transfer is in flight;
 *   6. PAIR: a double-click fires EXACTLY ONE /pair POST (counted in the
 *      page's own fetch layer) and the answer rides .alert/.notice with a
 *      polite live region;
 *   7. PLACEMENT: the first fetch disables the Start button and labels it
 *      "Starting…" — a double tap cannot double-submit.
 * The RED-vs-GREEN diff of this script's result.json is the card's proof.
 *
 *   usage: SERVE_BIN=<path> SERVE_DIST=<dist dir> \
 *          node scripts/feel-loading-capture.mjs
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
const OUT = resolve(process.env.OUT_DIR ?? join(REPO, "state/evidence/FEEL-LOADING-001"));
mkdirSync(OUT, { recursive: true });
const PACK_ID = "org.openlanguage.ru-ru.reference";
const PROFILE = "Feel Loading";
const VW = 390;
const VH = 844;
const LATENCY = 900; // injected IPC latency the loading states must cover
const PORT = 17900 + (process.pid % 60);
const BASE = `http://127.0.0.1:${PORT}`;

const result = { viewport: `${VW}x${VH}`, latency_ms: LATENCY, checks: [], failures: 0 };
const check = (name, pass, measured) => {
  result.checks.push({ name, pass, measured });
  if (!pass) result.failures++;
  console.log(`${pass ? "PASS" : "FAIL"} ${name} — ${JSON.stringify(measured)}`);
};

const dataDir = mkdtempSync(join(tmpdir(), "lts-feel-loading-data-"));
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

  const profileDir = mkdtempSync(join(tmpdir(), "lts-feel-loading-chrome-"));
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
  function send(method, params = {}, sid = sessionId) {
    const id = nextId++;
    ws.send(JSON.stringify({ id, method, params, ...(sid ? { sessionId: sid } : {}) }));
    return new Promise((res, rej) =>
      pending.set(id, (msg) =>
        msg.error ? rej(new Error(`${method}: ${msg.error.message}`)) : res(msg.result),
      ),
    );
  }
  let sessionId = null;
  const { targetId } = await send("Target.createTarget", { url: "about:blank" });
  ({ sessionId } = await send("Target.attachToTarget", { targetId, flatten: true }));
  await send("Page.enable", {});
  async function evaluate(expression) {
    const r = await send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (r.exceptionDetails)
      throw new Error(`page eval: ${r.exceptionDetails.exception?.description ?? "error"}`);
    return r.result.value;
  }
  async function shot(name, viewportOnly = true) {
    const s = await send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: !viewportOnly,
    });
    writeFileSync(join(OUT, `${name}.png`), Buffer.from(s.data, "base64"));
  }
  async function clickAt(selector) {
    const rect = await evaluate(`(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) return null;
      el.scrollIntoView({ block: 'center' });
      const r = el.getBoundingClientRect();
      return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) };
    })()`);
    if (rect === null) throw new Error(`clickAt: ${selector} not found`);
    await sleep(60);
    for (const type of ["mousePressed", "mouseReleased"]) {
      await send("Input.dispatchMouseEvent", {
        type,
        x: rect.x,
        y: rect.y,
        button: "left",
        clickCount: 1,
      });
    }
    return rect;
  }
  const clickByText = (text) =>
    evaluate(`(() => {
      const el = [...document.querySelectorAll('button')].find((b) =>
        (b.textContent ?? '').includes(${JSON.stringify(text)}));
      if (!el) return false;
      el.scrollIntoView({ block: 'center' });
      el.click();
      return true;
    })()`);

  await send("Emulation.setDeviceMetricsOverride", {
    width: VW,
    height: VH,
    deviceScaleFactor: 1,
    mobile: true,
  });
  // The latency injector: every bridge response the app awaits is deferred
  // LATENCY ms. Requests still leave the page immediately, so the /pair
  // POST count below is a true request count, and the app sees a slow-but-
  // honest network — exactly the condition the card's states must survive.
  await send("Page.addScriptToEvaluateOnNewDocument", {
    source: `(() => {
      const realFetch = window.fetch;
      const SLOW = (${LATENCY});
      window.__bridgePosts = { pair: 0 };
      window.fetch = async (input, init) => {
        const url = typeof input === 'string' ? input : (input && input.url) || '';
        const isBridge = /\\/(api|lan)\\//.test(url) || url.endsWith('/pair');
        if (url.endsWith('/pair')) window.__bridgePosts.pair += 1;
        const p = realFetch(input, init);
        if (!isBridge) return p;
        const res = await p;
        await new Promise((r) => setTimeout(r, SLOW));
        return res;
      };
    })()`,
  });
  await send("Page.navigate", { url: `${BASE}/?v=feel-loading` });
  let resumed = false;
  for (let i = 0; i < 80 && !resumed; i++) {
    await sleep(250);
    resumed = await evaluate(`(() => {
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
  if (!resumed) throw new Error(`navigation error: profile chooser never offered ${PROFILE}`);

  const homeHealthy = () =>
    evaluate(`(() => {
      const t = document.body.innerText;
      return (
        !t.includes('No language is set') &&
        !t.includes('could not read which language pack') &&
        t.includes('Russian Reference Pack') &&
        document.querySelectorAll('[data-unit]').length > 0
      );
    })()`);
  let healthy = 0;
  for (let i = 0; i < 80 && healthy < 3; i++) {
    healthy = (await homeHealthy()) ? healthy + 1 : 0;
    await sleep(250);
  }
  if (healthy < 3) throw new Error("home never went stable-healthy");

  // ---- 1. MY WORDS: skeleton rows stand in while mine_list is in flight ----
  await clickByText("Words"); // the tab reads "My Words" — match the label
  await sleep(400); // mid-prime: every read is still LATENCY ms from landing
  const wordsMid = await evaluate(`(() => ({
    rows: document.querySelectorAll('.skeleton-row').length,
    live: !!document.querySelector('[aria-label="Loading saved words"]'),
    stale: document.body.innerText.includes('Nothing mined yet'),
  }))()`);
  await shot("mid-words-skeleton", false); // full page: the rows sit under the fold
  check(
    "MY WORDS: skeleton rows mid-prime, no false empty state",
    wordsMid.rows >= 3 && wordsMid.live && !wordsMid.stale,
    wordsMid,
  );
  await sleep(LATENCY + 600); // let the prime land

  // ---- 2. SETTINGS: skeleton strip announces the six-read prime ----
  await clickByText("Settings");
  await sleep(400);
  const settingsMid = await evaluate(`(() => ({
    strip: !!document.querySelector('[data-testid="settings-loading-skeleton"]'),
    rows: document.querySelectorAll('.skeleton-row').length,
  }))()`);
  await shot("mid-settings-skeleton");
  check(
    "SETTINGS: loading strip mid-prime",
    settingsMid.strip && settingsMid.rows >= 3,
    settingsMid,
  );
  await sleep(LATENCY + 800);

  // ---- 3. PROGRESS: reserved shell, no reflow when staggered reads land ----
  await clickByText("Progress");
  await sleep(300);
  const shellMid = await evaluate(`(() => ({
    shells: document.querySelectorAll('.skeleton-block').length,
    live: !!document.querySelector('[aria-label="Loading progress"]'),
    height: document.documentElement.scrollHeight,
  }))()`);
  await shot("mid-progress-shell");
  // The audit complaint is the JUMP: at base each staggered read repaints
  // the page at its own moment (height changes 3-4 times mid-load). The
  // reserved shell holds ONE stable height while loading, so the document
  // changes layout at most twice more (content arrival, late images).
  const heights = [shellMid.height];
  for (let i = 0; i < 80; i++) {
    const busy = await evaluate("!!document.querySelector('.skeleton-block')");
    const h = await evaluate("document.documentElement.scrollHeight");
    if (h !== heights[heights.length - 1]) heights.push(h);
    if (!busy && i > 4) break;
    await sleep(150);
  }
  const reflowSteps = heights.length - 1;
  check(
    "PROGRESS: reserved shell holds one stable height; settle adds at most two reflows",
    shellMid.shells >= 5 && shellMid.live && reflowSteps <= 2,
    { ...shellMid, reflow_steps: reflowSteps, heights },
  );

  // ---- 4. SAVED TICK: the mic toggle writes, the tick answers ----
  await clickByText("Settings");
  await sleep(LATENCY + 800); // let the prime settle before toggling
  await clickAt("#mic-enabled");
  await sleep(500); // write in flight: no tick yet is fine, measured for honesty
  const tickMid = await evaluate("!!document.querySelector('.save-tick')");
  await sleep(LATENCY + 400); // write landed
  const tickAfter = await evaluate(`(() => {
    const el = document.querySelector('.save-tick');
    if (!el) return null;
    return { role: el.getAttribute('role'), text: (el.textContent ?? '').trim() };
  })()`);
  await shot("saved-tick");
  check(
    "SAVED TICK: quiet live confirmation appears only after the write lands",
    !tickMid && tickAfter !== null && tickAfter.role === "status" && /Saved/.test(tickAfter.text),
    { mid_flight: tickMid, after: tickAfter },
  );

  // ---- 5. INSTALL: pending state during a speech-model transfer ----
  const models = await evaluate(
    "[...document.querySelectorAll('button[aria-label^=\"Download\"]')].map((b) => b.getAttribute('aria-label'))",
  );
  if (models.length === 0) {
    check("INSTALL: pending state during speech-model transfer", false, {
      error: "no installable speech model offered by serve",
    });
  } else {
    await evaluate(`(() => {
      document.querySelector('button[aria-label^="Download"]').scrollIntoView({ block: 'center' });
    })()`);
    await sleep(120);
    const dlRect = await evaluate(`(() => {
      const el = document.querySelector('button[aria-label^="Download"]');
      const r = el.getBoundingClientRect();
      return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) };
    })()`);
    for (const type of ["mousePressed", "mouseReleased"]) {
      await send("Input.dispatchMouseEvent", {
        type,
        x: dlRect.x,
        y: dlRect.y,
        button: "left",
        clickCount: 1,
      });
    }
    await sleep(500); // mid-transfer: install_model is still LATENCY from answering
    const installing = await evaluate(`(() => {
      const speechCard = document.querySelector('#speech-model').closest('.card');
      const btn = [...speechCard.querySelectorAll('button')].find((b) =>
        (b.textContent ?? '').includes('Installing…'));
      const all = [...speechCard.querySelectorAll('.pack-list button')];
      return {
        text: btn ? (btn.textContent ?? '').trim() : null,
        busy: btn ? btn.getAttribute('aria-busy') === 'true' : false,
        liveSiblings: all.filter((b) => !b.disabled).length,
      };
    })()`);
    await shot("speech-installing");
    check(
      "INSTALL: model button reads Installing (aria-busy) with siblings disabled",
      installing.text === "Installing…" && installing.busy && installing.liveSiblings === 0,
      installing,
    );
  }

  // ---- 6. PAIR: double-click = exactly one request; answer styled+live ----
  // turn local-network access on through the card's own toggle
  await clickAt("#lan-enabled");
  await sleep(LATENCY + 600);
  const pin = await evaluate(
    "(document.querySelector('[data-testid=\"lan-pin\"]')?.textContent ?? '').trim()",
  );
  const wrongPin = pin === "000000" ? "111111" : "000000";
  await evaluate(`(() => {
    const el = document.querySelector('#lan-pair-pin');
    const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    set.call(el, ${JSON.stringify(wrongPin)});
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.scrollIntoView({ block: 'center' });
  })()`);
  await evaluate("window.__bridgePosts.pair = 0");
  const pairRect = await clickAt("#lan-pair");
  await sleep(150); // deliberate double-tap: the old card took BOTH
  for (const type of ["mousePressed", "mouseReleased"]) {
    await send("Input.dispatchMouseEvent", {
      type,
      x: pairRect.x,
      y: pairRect.y,
      button: "left",
      clickCount: 1,
    });
  }
  for (let i = 0; i < 40; i++) {
    const msg = await evaluate(
      "(() => { const el = document.querySelector('[data-testid=\"lan-pair-message\"]'); return el ? { cls: el.className, role: el.getAttribute('role'), live: el.getAttribute('aria-live') } : null; })()",
    );
    if (msg) {
      result.pairMessage = msg;
      break;
    }
    await sleep(250);
  }
  const pairPosts = await evaluate("window.__bridgePosts.pair");
  await shot("pair-result");
  const msg = result.pairMessage ?? null;
  check(
    "PAIR: one POST for a double-click, answer styled .alert with live semantics",
    pairPosts === 1 && msg !== null && msg.cls.includes("alert") && msg.live === "polite",
    { posts: pairPosts, message: msg },
  );

  // ---- 7. PLACEMENT: first fetch is pending and single-flight ----
  await clickByText("Practice");
  await sleep(500);
  const openedPlacement = await clickByText("Placement");
  if (!openedPlacement) {
    check("PLACEMENT: first fetch shows Starting… disabled", false, {
      error: 'no "Placement" entry on the Practice hub',
    });
  } else {
    await sleep(500); // plan + first task are in flight
    const starting = await evaluate(`(() => {
      const btn = [...document.querySelectorAll('button')].find((b) =>
        (b.textContent ?? '').includes('Starting…') ||
        (b.textContent ?? '').includes('Start placement'));
      return btn ? { text: (btn.textContent ?? '').trim(), disabled: btn.disabled } : null;
    })()`);
    await shot("placement-starting");
    check(
      "PLACEMENT: first fetch shows Starting… disabled",
      starting !== null && starting.text === "Starting…" && starting.disabled,
      starting,
    );
  }

  writeFileSync(join(OUT, "result.json"), JSON.stringify(result, null, 2));
  console.log(
    result.failures === 0
      ? "\nCAPTURE GREEN (0 failures)"
      : `\nCAPTURE RED (${result.failures} failures)`,
  );
  process.exitCode = result.failures === 0 ? 0 : 1;
} catch (err) {
  result.error = String(err && err.stack ? err.stack : err);
  try {
    writeFileSync(join(OUT, "result.json"), JSON.stringify(result, null, 2));
  } catch {
    /* best effort */
  }
  console.error("CAPTURE ERROR:", err);
  if (serve) console.error("serve log tail:", serve.getLog().slice(-800));
  process.exitCode = 2;
} finally {
  if (chrome) chrome.kill();
  if (serve) serve.kill();
}
