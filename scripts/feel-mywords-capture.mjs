#!/usr/bin/env node
/**
 * FEEL-MYWORDS-001 acceptance capture (dev-only evidence tooling).
 *
 * Same plumbing as scripts/feel-loading-capture.mjs (real engine: lts-serve
 * over an isolated data dir, headless Chrome at a 390x844 phone viewport,
 * raw CDP — no new deps). The serve bridge runs the SAME command wiring as
 * the desktop, but the capture needs due dates in the future that the
 * engine only ever schedules by review, so the harness fakes ONLY the
 * mine_list / mine_add / mine_remove legs inside the page's own fetch layer
 * (a tiny canned store; every other command rides the real engine). The
 * engine semantics of those commands are pinned by the Rust tests; what is
 * measured here is the live UI: card treatment, the friendly due pill, the
 * deferred-delete timing (zero /api/mine_remove calls until the UNDO chip's
 * 4 s life expires — counted in the page's own fetch layer), the add-word
 * pulse, and the review motion. The RED-vs-GREEN diff of this script's
 * result.json is the card's proof.
 *
 *   usage: SERVE_BIN=<path> SERVE_DIST=<dist dir> \
 *          node scripts/feel-mywords-capture.mjs
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
const OUT = resolve(process.env.OUT_DIR ?? join(REPO, "state/evidence/FEEL-MYWORDS-001"));
mkdirSync(OUT, { recursive: true });
const PACK_ID = "org.openlanguage.ru-ru.reference";
const PROFILE = "Feel MyWords";
const VW = 390;
const VH = 844;
const PORT = 17900 + (process.pid % 60);
const BASE = `http://127.0.0.1:${PORT}`;

const result = { viewport: `${VW}x${VH}`, checks: [], failures: 0 };
const check = (name, pass, measured) => {
  result.checks.push({ name, pass, measured });
  if (!pass) result.failures++;
  console.log(`${pass ? "PASS" : "FAIL"} ${name} — ${JSON.stringify(measured)}`);
};

const dataDir = mkdtempSync(join(tmpdir(), "lts-feel-mywords-data-"));
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
let chromeDir = null;
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

  const profileDir = mkdtempSync(join(tmpdir(), "lts-feel-mywords-chrome-"));
  chromeDir = profileDir;
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
  // The mine-trio fake: a canned store inside the page's own fetch layer.
  // dom+3 days, god+1 day, bit' unscheduled; every remove call is stamped
  // with performance.now() so the UNDO window's timing is MEASURED, and
  // every other command still rides the real engine.
  await send("Page.addScriptToEvaluateOnNewDocument", {
    source: `(() => {
      const DAY = 86400000;
      const now = Date.now();
      const iso = (t) => new Date(t).toISOString();
      let seq = 0;
      const mk = (id, surface, gloss, due) => ({
        id, surface, reading: null, gloss,
        source_citation: 'ru.lesson.capsules',
        created_at: iso(now - 12 * DAY),
        due_at: due === null ? null : iso(due),
        context_sentence_id: null,
        context_sentence: null,
      });
      const store = [
        mk('mine-cap-a', '\\u0434\\u043e\\u043c', 'house; home', now + 3 * DAY),
        mk('mine-cap-b', '\\u0433\\u043e\\u0434', 'year', now + 1 * DAY),
        mk('mine-cap-c', '\\u0431\\u0438\\u0442\\u044c', 'to hit', null),
      ];
      window.__mineCalls = { remove: [], add: 0 };
      const realFetch = window.fetch;
      window.fetch = async (input, init) => {
        const url = typeof input === 'string' ? input : (input && input.url) || '';
        const cmd = (url.match(/\\/api\\/([a-z_]+)\\/?$/) || [])[1];
        if (cmd === 'mine_list') {
          return new Response(JSON.stringify(store), {
            status: 200, headers: { 'content-type': 'application/json' },
          });
        }
        if (cmd === 'mine_add') {
          const args = JSON.parse((init && init.body) || '{}');
          window.__mineCalls.add += 1;
          const id = 'mine-cap-new-' + (++seq);
          store.push(mk(id, String(args.surface || ''), args.gloss || null, null));
          return new Response(JSON.stringify({ id, was_new: true }), {
            status: 200, headers: { 'content-type': 'application/json' },
          });
        }
        if (cmd === 'mine_remove') {
          const args = JSON.parse((init && init.body) || '{}');
          window.__mineCalls.remove.push({
            id: String(args.itemId ?? args.item_id ?? ''),
            t: Math.round(performance.now()),
          });
          const i = store.findIndex((s) => s.id === (args.itemId ?? args.item_id));
          if (i >= 0) store.splice(i, 1);
          return new Response(JSON.stringify(true), {
            status: 200, headers: { 'content-type': 'application/json' },
          });
        }
        return realFetch(input, init);
      };
    })()`,
  });
  await send("Page.navigate", { url: `${BASE}/?v=feel-mywords` });
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

  // ---- enter My Words and wait for the canned store to land ----
  await clickByText("Words"); // the tab reads "My Words"
  let landed = false;
  for (let i = 0; i < 60 && !landed; i++) {
    landed = (await evaluate("document.querySelectorAll('.mine-card').length")) >= 3;
    if (!landed) await sleep(150);
  }

  // ---- 1. rows are cards: radius + surface fill + hairline border ----
  const cards = await evaluate(`(() => {
    const els = [...document.querySelectorAll('.mine-card')];
    if (!els.length) return { n: 0 };
    const s = getComputedStyle(els[0]);
    return {
      n: els.length,
      radius: s.borderTopLeftRadius,
      bg: s.backgroundColor,
      border: s.borderTopWidth + ' ' + s.borderTopColor,
    };
  })()`);
  // Full-page capture renders a position:sticky header at whatever scroll
  // offset the SPA session left behind (residue of clickByText's
  // scrollIntoView), which pins the header band mid-page in the shot.
  // Park at the top first so the at-rest oracle shows the real document.
  await evaluate("window.scrollTo(0, 0)");
  await sleep(150);
  await shot("my-words-at-rest", false); // full page: cards + pills
  check(
    "CARDS: word rows render as rounded surface cards with a hairline border",
    cards.n === 3 &&
      cards.radius === "8px" &&
      cards.bg === "rgb(255, 253, 249)" &&
      /^1px /.test(cards.border ?? ""),
    cards,
  );

  // ---- 2. friendly due pills, clock glyph, quiet new pill ----
  const pills = await evaluate(`(() => {
    const els = [...document.querySelectorAll('.due')];
    return {
      texts: els.map((e) => e.textContent.trim()),
      newPills: els.filter((e) => e.classList.contains('due--new')).map((e) => e.textContent.trim()),
      glyph: els.length ? getComputedStyle(els[0], '::before').content : null,
    };
  })()`);
  check(
    "PILLS: friendly relative dates with a clock glyph; no raw ISO slice",
    pills.texts.includes("in 3 days") &&
      pills.texts.includes("tomorrow") &&
      pills.newPills.join(",") === "new" &&
      String(pills.glyph).includes(String.fromCharCode(0x25f7)),
    pills,
  );

  // ---- 3+4. remove defers the engine delete behind the 4s UNDO chip ----
  const clickedAt = await evaluate(`(() => {
    const b = [...document.querySelectorAll('.mine-card button')]
      .find((x) => (x.textContent ?? '').includes('Remove'));
    if (!b) return -1;
    b.scrollIntoView({ block: 'center' });
    b.click();
    return Math.round(performance.now());
  })()`);
  await sleep(150); // well inside the chip's 4 s life
  const midUndo = await evaluate(`(() => ({
    chip: !!document.querySelector('.undo-chip'),
    chipText: (document.querySelector('.undo-chip')?.textContent ?? '').trim(),
    removeCalls: window.__mineCalls.remove,
    cards: document.querySelectorAll('.mine-card').length,
  }))()`);
  await shot("mid-undo-chip");
  check(
    "UNDO: the row leaves, the chip lives, and ZERO engine deletes have fired",
    clickedAt >= 0 && midUndo.chip && midUndo.removeCalls.length === 0 && midUndo.cards === 2,
    { clickedAt, ...midUndo },
  );
  await sleep(4300); // the chip's life has expired
  const afterLife = await evaluate(`(() => ({
    removeCalls: window.__mineCalls.remove,
    chip: !!document.querySelector('.undo-chip'),
  }))()`);
  check(
    "UNDO: the delete lands only after the chip's 4 s life (measured call time)",
    afterLife.removeCalls.length === 1 &&
      afterLife.removeCalls[0].id === "mine-cap-a" &&
      afterLife.removeCalls[0].t - clickedAt >= 3900 &&
      !afterLife.chip,
    afterLife,
  );

  // ---- 5. UNDO inside the window cancels outright ----
  const cancelClicked = await evaluate(`(() => {
    const b = [...document.querySelectorAll('.mine-card button')]
      .find((x) => (x.textContent ?? '').includes('Remove'));
    if (!b) return false;
    b.scrollIntoView({ block: 'center' });
    b.click();
    return true;
  })()`);
  await sleep(150);
  const undone = await evaluate(`(() => {
    const chip = document.querySelector('.undo-chip');
    if (!chip) return false;
    chip.click();
    return true;
  })()`);
  await sleep(4300); // a full life passes with the delete cancelled
  const afterCancel = await evaluate("window.__mineCalls.remove.length");
  check("UNDO: tapping the chip cancels the delete for good", cancelClicked && undone && afterCancel === 1, {
    cancelClicked,
    undone,
    afterCancel,
  });

  // ---- 6. the add-word success pulse ----
  await evaluate(`(() => {
    const el = document.querySelector('#mine-surface');
    if (!el) return false;
    el.scrollIntoView({ block: 'center' });
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(el, '\\u0441\\u043e\\u043b\\u044c');
    el.dispatchEvent(new Event('input', { bubbles: true }));
  })()`);
  await clickByText("Add to my words");
  let pulse = null;
  for (let i = 0; i < 20 && !pulse; i++) {
    await sleep(60);
    pulse = await evaluate(`(() => {
      const el = document.querySelector('.mine-card--flash');
      if (!el) return null;
      const s = getComputedStyle(el);
      return { anim: s.animationName, n: document.querySelectorAll('.mine-card').length };
    })()`);
    if (pulse) await shot("add-word-pulse");
  }
  check(
    "FLASH: the landed add pulses once (fade-up + mine-arrive running live)",
    !!pulse && String(pulse.anim).includes("mine-arrive") && pulse.n === 3,
    pulse,
  );

  // ---- 7. review enters with card-in, the reveal rises with fade-up ----
  await evaluate(`(() => {
    const b = [...document.querySelectorAll('button')].find((x) =>
      (x.textContent ?? '').trim() === 'Review now');
    if (b) { b.scrollIntoView({ block: 'center' }); b.click(); return true; }
    return false;
  })()`);
  await sleep(120); // mid-entry: the card-in animation is 300 ms
  const reviewOpen = await evaluate(`(() => {
    const el = document.querySelector('.review-card');
    return el ? { anim: getComputedStyle(el).animationName } : null;
  })()`);
  await clickByText("Reveal");
  await sleep(120);
  const revealed = await evaluate(`(() => {
    const el = document.querySelector('.review-reveal');
    return el ? { anim: getComputedStyle(el).animationName, text: el.textContent.slice(0, 60) } : null;
  })()`);
  await shot("review-reveal");
  check(
    "MOTION: the review card enters with card-in and the reveal rises with fade-up",
    !!reviewOpen &&
      String(reviewOpen.anim).includes("card-in") &&
      !!revealed &&
      String(revealed.anim).includes("fade-up"),
    { reviewOpen, revealed },
  );

  writeFileSync(join(OUT, "result.json"), JSON.stringify(result, null, 2));
  console.log(`\n${result.checks.length - result.failures}/${result.checks.length} checks green`);
  process.exitCode = result.failures === 0 ? 0 : 1;
} catch (e) {
  result.error = String(e && e.message ? e.message : e);
  try {
    writeFileSync(join(OUT, "result.json"), JSON.stringify(result, null, 2));
  } catch {
    // evidence already unwritable — the exit below carries the failure
  }
  console.error(`CAPTURE ERROR: ${result.error}`);
  process.exitCode = 2;
} finally {
  if (serve) serve.kill();
  if (chrome) chrome.kill();
  if (chromeDir) {
    try {
      const { rmSync } = await import("node:fs");
      rmSync(chromeDir, { recursive: true, force: true });
    } catch {
      // leaked chrome dirs are swept by the next capture run
    }
  }
}
