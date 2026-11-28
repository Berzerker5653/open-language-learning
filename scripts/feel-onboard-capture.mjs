#!/usr/bin/env node
/**
 * FEEL-ONBOARD-001 acceptance capture (dev-only evidence tooling).
 *
 * Same plumbing as scripts/feel-progress-capture.mjs (real engine: lts-serve
 * over an isolated data dir, headless Chrome at a 390x844 viewport, raw CDP
 * — no new deps). NOTHING about the wizard is faked except the install
 * progress frames: the reference pack is pre-installed over the real API,
 * the profile is created by a REAL typed input + click, steps advance by
 * real clicks, and the resume chooser drives real engine writes (hide /
 * resume). Only the SSE `progress/events` leg is replayed from canned
 * install-pack stage frames (its semantics are Rust-pinned) so the bar can
 * be measured deterministically — one phase determinate (percent 45), one
 * phase percent-null (honest indeterminate). What is measured live: the
 * active-dot ring (ring-in on ::before), the step-card glide (step-in on
 * the card after a real step click), the completed-step state (stepper-done
 * class, drawn check with check-draw on the path, ok-filled dot, link-fill
 * connector), the install bar (progressbar aria, settled 45% width, width
 * easing) and its null-percent variant (pulse-sweep, NO value), the app
 * entry glide (app-in on the content page after Continue/Skip),
 * deterministic avatar variant classes on four REAL profiles, a real CDP
 * mouse hover lifting a profile card 1px, and the warm designed empty
 * state after hiding every profile.
 *
 * The RED-vs-GREEN diff of this script's result.json is the card's proof.
 *
 *   usage: SERVE_BIN=<path> SERVE_DIST=<dist dir> \
 *          node scripts/feel-onboard-capture.mjs
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
const OUT = resolve(process.env.OUT_DIR ?? join(REPO, "state/evidence/FEEL-ONBOARD-001"));
mkdirSync(OUT, { recursive: true });
const PACK_ID = "org.openlanguage.ru-ru.reference";
const NAMES = ["Onboard Feel", "Aiko Tanaka", "Mika Virtanen", "Jordan James"];
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

const dataDir = mkdtempSync(join(tmpdir(), "lts-feel-onboard-data-"));
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

// The ONLY faked leg: the SSE progress stream (its stage semantics are
// Rust-pinned). Armed only when the URL carries ?progress=known|unknown.
// known: prepare(null) → fetch(12) → fetch(45); the 12→45 hop rides the
// real CSS width easing. unknown: a single percent-null frame.
const SSE_FAKE = `(() => {
  const q = new URLSearchParams(location.search).get('progress');
  if (!q) return;
  const frames = q === 'known'
    ? [
        { operation: 'install-pack', subject: '${PACK_ID}', stage: 'prepare', percent: null },
        { operation: 'install-pack', subject: '${PACK_ID}', stage: 'fetch', percent: 12 },
        { operation: 'install-pack', subject: '${PACK_ID}', stage: 'fetch', percent: 45 },
      ]
    : [{ operation: 'install-pack', subject: '${PACK_ID}', stage: 'prepare', percent: null }];
  const Real = window.EventSource;
  window.EventSource = class FakeEventSource {
    constructor() {
      this.listeners = {};
      frames.forEach((f, i) =>
        setTimeout(() => {
          const ev = { data: JSON.stringify(f) };
          if (typeof this.onmessage === 'function') this.onmessage(ev);
          (this.listeners.message ?? []).forEach((h) => h(ev));
        }, 300 + i * 450),
      );
    }
    addEventListener(type, fn) { (this.listeners[type] ??= []).push(fn); }
    close() {}
  };
  void Real;
})()`;

let serve = null;
let chrome = null;
try {
  serve = await startServe();
  // Real engine: the reference pack is really installed (the wizard's packs
  // step must then carry a selectable installed row, no fabricated state).
  const imp = await api("install_pack", { packId: PACK_ID });
  if (imp.status !== 200) throw new Error(`install_pack failed: ${JSON.stringify(imp)}`);

  const chromeDir = mkdtempSync(join(tmpdir(), "lts-feel-onboard-chrome-"));
  chrome = spawn(
    process.env.CHROME ?? "google-chrome-stable",
    [
      "--headless=new",
      "--no-sandbox",
      "--disable-gpu",
      "--remote-debugging-port=0",
      `--user-data-dir=${chromeDir}`,
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
  let sessionId = null;
  function send(method, params = {}, sid = sessionId) {
    const id = nextId++;
    ws.send(JSON.stringify({ id, method, params, ...(sid ? { sessionId: sid } : {}) }));
    return new Promise((res, rej) =>
      pending.set(id, (msg) =>
        msg.error ? rej(new Error(`${method}: ${msg.error.message}`)) : res(msg.result),
      ),
    );
  }
  const { targetId } = await send("Target.createTarget", { url: "about:blank" });
  ({ sessionId } = await send("Target.attachToTarget", { targetId, flatten: true }));
  await send("Page.enable", {});
  await send("Runtime.enable", {});
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
  async function goto(url) {
    await send("Page.navigate", { url });
    for (let i = 0; i < 60; i++) {
      const ready = await evaluate("document.readyState === 'complete'").catch(() => false);
      if (ready) break;
      await sleep(100);
    }
    await sleep(350);
  }

  await send("Emulation.setDeviceMetricsOverride", {
    width: VW,
    height: VH,
    deviceScaleFactor: 1,
    mobile: false,
  });

  // ------------------------------------------------------------- phase A
  // The wizard, on a truly fresh profile store: typed input, real clicks.
  await goto(`${BASE}/?v=a#${"a"}`);

  // 1. active-dot ring fades in (ring-in on the active dot's ::before)
  const ring = await evaluate(`(() => {
    const li = document.querySelector('.stepper li[aria-current="step"]');
    if (!li) return null;
    const cs = getComputedStyle(li, '::before');
    return { animationName: cs.animationName, boxShadow: cs.boxShadow, step: li.textContent };
  })()`);
  check(
    "active-dot ring fades in (ring-in, soft accent ring)",
    !!ring && ring.animationName === "ring-in" && /rgba?\(/.test(ring.boxShadow),
    ring,
  );

  // 2. step-card glide: type a name with real key events + click Create
  await evaluate(`(() => {
    const el = document.querySelector('#profile-name');
    if (!el) return false;
    el.focus();
    return true;
  })()`);
  for (const ch of NAMES[0]) {
    await send("Input.dispatchKeyEvent", { type: "keyDown", text: ch });
    await send("Input.dispatchKeyEvent", { type: "keyUp", text: ch });
  }
  await sleep(150);
  const created = await clickByText("Create local profile");
  await sleep(120); // mid-glide of the freshly mounted step card
  const glide = await evaluate(`(() => {
    const card = document.querySelector('.card--step');
    if (!card) return null;
    const cs = getComputedStyle(card);
    return { animationName: cs.animationName, animationDuration: cs.animationDuration };
  })()`);
  check(
    "step cards glide on step changes (step-in on the fresh card)",
    created && !!glide && glide.animationName === "step-in",
    { clickedCreate: created, glide },
  );

  // 3. completed-step state on the packs step: welcome is done
  const doneState = await evaluate(`(() => {
    const lis = [...document.querySelectorAll('.stepper li')];
    const done = lis.find((li) => li.className.includes('stepper-done'));
    if (!done) return null;
    const before = getComputedStyle(done, '::before');
    const after = getComputedStyle(done, '::after');
    const path = done.querySelector('.step-check path');
    return {
      label: done.textContent,
      beforeBackground: before.backgroundColor,
      connectorAnimation: after.animationName,
      connectorBackground: after.backgroundColor,
      checkAnimation: path ? getComputedStyle(path).animationName : null,
      checkDasharray: path ? getComputedStyle(path).strokeDasharray : null,
    };
  })()`);
  await shot("wizard-packs-step");
  check(
    "completed step reads done (ok dot, drawn check, filled connector)",
    !!doneState &&
      doneState.label.startsWith("Welcome") &&
      doneState.checkAnimation === "check-draw" &&
      doneState.connectorAnimation === "link-fill" &&
      doneState.beforeBackground === "rgb(46, 125, 70)",
    doneState,
  );

  // select + the installed Russian row must be selectable (real engine state)
  const selected = await evaluate(`(() => {
    const row = [...document.querySelectorAll('.radio-row')].find((r) =>
      (r.textContent ?? '').includes('Russian'));
    if (!row) return null;
    const input = row.querySelector('input[type="radio"]');
    if (!input) return null;
    input.click();
    return { installedRow: (row.textContent ?? '').includes('Installed') };
  })()`);
  await sleep(250);
  const cont = await clickByText("Continue");
  await sleep(120);
  const micStep = await evaluate(
    `!!document.querySelector('.card--step') && [...document.querySelectorAll('button')].some((b) => (b.textContent ?? '').includes('Enable microphone'))`,
  );
  check(
    "packs→microphone advances by real click with installed row selectable",
    !!selected?.installedRow && cont && micStep,
    { selected, cont, micStep },
  );

  // 6. app entry glide: Skip for now → finishOnboarding → the app arrives
  await clickByText("Skip for now");
  let entry = null;
  for (let i = 0; i < 25; i++) {
    await sleep(100);
    entry = await evaluate(`(() => {
      const page = document.querySelector('main .page');
      if (!page) return null;
      const cs = getComputedStyle(page);
      return {
        hasClass: page.className.includes('app-enter'),
        animationName: cs.animationName,
        inWizard: !!document.querySelector('.stepper'),
      };
    })()`);
    if (entry && entry.hasClass && entry.animationName === "app-in") break;
  }
  check(
    "entering the app glides (app-in on the content page, wizard gone)",
    !!entry && entry.hasClass && entry.animationName === "app-in" && !entry.inWizard,
    entry,
  );
  await shot("wizard-done-home");

  // ------------------------------------------------- phase A2: install bar
  await send("Page.addScriptToEvaluateOnNewDocument", { source: SSE_FAKE });
  await goto(`${BASE}/?v=bar&progress=known#bar`);
  await sleep(1300); // frames land at 300/750/1200ms; settle past the last
  const bar = await evaluate(`(() => {
    const track = document.querySelector('[data-testid="install-progress-bar"]');
    if (!track) return null;
    const fill = track.querySelector('.install-bar-fill');
    const cs = fill ? getComputedStyle(fill) : null;
    const tw = track.getBoundingClientRect().width;
    const fw = fill ? fill.getBoundingClientRect().width : 0;
    return {
      role: track.getAttribute('role'),
      valuenow: track.getAttribute('aria-valuenow'),
      valuetext: track.getAttribute('aria-valuetext'),
      transition: cs?.transitionProperty,
      widthRatio: tw > 0 ? Math.round((fw / tw) * 100) : 0,
    };
  })()`);
  check(
    "install bar is a real determinate bar (aria 45, eased width)",
    !!bar &&
      bar.role === "progressbar" &&
      bar.valuenow === "45" &&
      Math.abs(bar.widthRatio - 45) <= 2 &&
      (bar.transition ?? "").includes("width"),
    bar,
  );
  await shot("install-bar");
  await goto(`${BASE}/?v=bar2&progress=unknown#bar`);
  await sleep(700);
  const barUnknown = await evaluate(`(() => {
    const track = document.querySelector('[data-testid="install-progress-bar"]');
    if (!track) return null;
    const fill = track.querySelector('.install-bar-fill');
    return {
      unknownClass: track.className.includes('install-bar--unknown'),
      valuenow: track.getAttribute('aria-valuenow'),
      sweepAnimation: fill ? getComputedStyle(fill).animationName : null,
    };
  })()`);
  check(
    "percent-less stage: honest indeterminate sweep, no claimed value",
    !!barUnknown &&
      barUnknown.unknownClass &&
      barUnknown.valuenow === null &&
      barUnknown.sweepAnimation === "pulse-sweep",
    barUnknown,
  );

  // ------------------------------------------------------------ phase B
  // Reload: real profiles exist now, so the chooser is the landing screen.
  // Three more real profiles via the engine so avatar variation is measured
  // on real ids.
  for (const name of NAMES.slice(1)) {
    const p = await api("create_profile", { displayName: name });
    if (p.status !== 200) throw new Error(`create_profile(${name}) failed`);
  }
  await goto(`${BASE}/?v=resume#resume`);
  const avatars = await evaluate(`(() => {
    const cards = [...document.querySelectorAll('.profile-card')];
    const rows = cards.map((c) => {
      const av = c.querySelector('.profile-avatar');
      const cls = av ? av.className : '';
      const m = /profile-avatar--v(\\d)/.exec(cls);
      const nameEl = c.querySelector('.profile-name');
      return {
        name: nameEl ? nameEl.textContent : null,
        initials: av ? av.textContent : null,
        rendered: m ? Number(m[1]) : null,
      };
    });
    return { count: cards.length, rows };
  })()`);
  const profiles = await api("list_profiles", {});
  const idByName = new Map((profiles.value ?? []).map((p) => [p.display_name, p.id]));
  const expected = (name) => {
    const id = idByName.get(name);
    if (!id) return null;
    let h = 0x811c9dc5;
    for (let i = 0; i < id.length; i++) {
      h ^= id.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h % 4;
  };
  const avatarPass =
    !!avatars &&
    avatars.count === 4 &&
    avatars.rows.length === 4 &&
    avatars.rows.every((r) => r.rendered !== null && r.rendered === expected(r.name)) &&
    new Set(avatars.rows.map((r) => r.rendered)).size >= 2;
  check("initials avatars vary deterministically per profile id", avatarPass, {
    rendered: avatars?.rows.map((r) => [r.name, r.initials, r.rendered]),
    expected: NAMES.map((n) => [n, expected(n)]),
  });

  // 8. hover lift with a REAL CDP mouse move over the first card
  const box = await evaluate(`(() => {
    const c = document.querySelector('.profile-card');
    if (!c) return null;
    c.scrollIntoView({ block: 'center' });
    const r = c.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + 12 };
  })()`);
  if (box) {
    await send("Input.dispatchMouseEvent", {
      type: "mouseMoved",
      x: box.x,
      y: box.y,
    });
  }
  await sleep(250);
  const hover = await evaluate(`(() => {
    const c = document.querySelector('.profile-card');
    if (!c) return null;
    return { transform: getComputedStyle(c).transform, border: getComputedStyle(c).borderTopColor };
  })()`);
  check(
    "profile cards lift on hover (real mouse, 1px up)",
    !!hover && /matrix\(1, 0, 0, 1, 0, -1\)/.test(hover.transform),
    hover,
  );
  await shot("resume-cards");

  // 9. warm empty state: hide every profile with real clicks, then measure
  for (let i = 0; i < 4; i++) {
    const hid = await evaluate(`(() => {
      const btn = [...document.querySelectorAll('.profile-card button')].find((b) =>
        (b.textContent ?? '').trim() === 'Hide');
      if (!btn) return false;
      btn.click();
      return true;
    })()`);
    if (!hid) break;
    await sleep(150);
  }
  const warm = await evaluate(`(() => {
    const box = document.querySelector('.empty--warm');
    if (!box) return null;
    const glyph = box.querySelector('.empty-glyph');
    return {
      sentence: (box.textContent ?? '').includes('No profiles on this device yet.'),
      hasGlyph: !!glyph,
      animationName: getComputedStyle(box).animationName,
      glyphColor: glyph ? getComputedStyle(glyph).color : null,
    };
  })()`);
  check(
    "first-run empty state is warm and designed (ring glyph, fade-up, sentence intact)",
    !!warm &&
      warm.sentence &&
      warm.hasGlyph &&
      warm.animationName === "fade-up" &&
      warm.glyphColor === "rgb(20, 97, 94)",
    warm,
  );
  await shot("warm-empty");

  // unhide everything and resume a real profile → app entry glide again
  await evaluate(`(() => {
    const b = [...document.querySelectorAll('button')].find((x) =>
      (x.textContent ?? '').includes('Show archived profiles'));
    if (b) b.click();
    return true;
  })()`);
  await sleep(200);
  for (let i = 0; i < 4; i++) {
    const un = await evaluate(`(() => {
      const btn = [...document.querySelectorAll('.profile-card button')].find((b) =>
        (b.textContent ?? '').trim() === 'Unhide');
      if (!btn) return false;
      btn.click();
      return true;
    })()`);
    if (!un) break;
    await sleep(150);
  }
  const resumed = await evaluate(`(() => {
    const b = document.querySelector('[aria-label^="Continue "]');
    if (!b) return false;
    b.click();
    return true;
  })()`);
  await sleep(150);
  const entry2 = await evaluate(`(() => {
    const page = document.querySelector('main .page');
    if (!page) return null;
    return {
      hasClass: page.className.includes('app-enter'),
      animationName: getComputedStyle(page).animationName,
      chooserGone: !document.querySelector('.profile-grid'),
    };
  })()`);
  check(
    "resume Continue glides into the app (app-in, chooser gone)",
    resumed &&
      !!entry2 &&
      entry2.hasClass &&
      entry2.animationName === "app-in" &&
      entry2.chooserGone,
    { resumed, entry2 },
  );
  await sleep(400);
  await shot("after-resume-home");

  writeFileSync(join(OUT, "result.json"), JSON.stringify(result, null, 2));
  console.log(
    result.failures === 0
      ? `DONE: all ${result.checks.length} checks green`
      : `DONE: ${result.failures}/${result.checks.length} checks failing`,
  );
  process.exitCode = result.failures === 0 ? 0 : 1;
} catch (err) {
  result.error = String(err);
  result.checks.push({ name: "harness", pass: false, measured: String(err) });
  writeFileSync(join(OUT, "result.json"), JSON.stringify(result, null, 2));
  if (serve) console.error(`serve log:\n${serve.getLog?.().slice(-2000) ?? ""}`);
  console.error(`HARNESS ERROR: ${err}`);
  process.exitCode = 2;
} finally {
  if (chrome) chrome.kill();
  if (serve) serve.kill();
}
