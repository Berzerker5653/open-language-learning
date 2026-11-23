#!/usr/bin/env node
/**
 * FEEL-DRILL-001 acceptance capture (dev-only evidence tooling).
 *
 * Same plumbing as scripts/feel-global-capture.mjs (real engine: lts-serve
 * over an isolated data dir, headless Chrome at 390x844, raw CDP — no new
 * deps). Claims measured HERE are COMPUTED in the live app, mid-motion:
 *   1. BAR MID-GLIDE: the .session-bar-fill width passes through
 *      intermediate values after a card lands (300ms ease-out), instead
 *      of snapping (the red-at-base behavior);
 *   2. REVEAL: after a graded pick, .choice--correct computes
 *      choice-reveal + the ok-soft fill + the ring box-shadow, the check
 *      badge (::after) is drawn, and the other choices sit at the dim
 *      opacity; a tapped wrong pick carries shake-x;
 *   3. BRIDGE REGRESSION: the inter-activity bridge still enters via
 *      fade-up (FEEL-GLOBAL-001) after this lane;
 *   4. SESSION CARDS: the end-of-session .session-summary computes the
 *      calm warm card rules (surface fill, line outline, padding,
 *      card-in) — red at base, where the class had no rules at all;
 *   5. REDUCED MOTION: under emulated prefers-reduced-motion the
 *      durations this card adds collapse to ~0 (probe elements with the
 *      card's classes).
 * ADR-0002 note: everything measured is motion/styling; no reward
 * mechanic exists or is asserted.
 *
 *   usage: SERVE_BIN=<path> SERVE_DIST=<dist dir> \
 *          [OUT_DIR=<dir>] node scripts/drill-feel-capture.mjs
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
const OUT = resolve(process.env.OUT_DIR ?? join(REPO, "state/evidence/FEEL-DRILL-001/capture"));
mkdirSync(OUT, { recursive: true });
const PACK_ID = "org.openlanguage.ru-ru.reference";
const PROFILE = "Feel Drill";
const VW = 390;
const VH = 844;
const PORT = 17700 + (process.pid % 180);
const BASE = `http://127.0.0.1:${PORT}`;

const result = { viewport: `${VW}x${VH}`, checks: [], failures: 0, error: null };
const check = (name, pass, measured) => {
  result.checks.push({ name, pass, measured });
  if (!pass) result.failures++;
  console.log(`${pass ? "PASS" : "FAIL"} ${name} — ${JSON.stringify(measured)}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const toSec = (v) => {
  const n = parseFloat(v);
  if (!Number.isFinite(n)) return 0;
  return String(v).endsWith("ms") ? n / 1000 : n;
};

const dataDir = mkdtempSync(join(tmpdir(), "lts-drill-data-"));

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
  throw new Error(`serve did not answer capabilities:\n${serve.getLog().slice(-1200)}`);
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

  const profileDir = mkdtempSync(join(tmpdir(), "lts-drill-chrome-"));
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
  async function shot(name) {
    const s = await send("Page.captureScreenshot", { format: "png" });
    writeFileSync(join(OUT, `${name}.png`), Buffer.from(s.data, "base64"));
  }

  await send("Emulation.setDeviceMetricsOverride", {
    width: VW,
    height: VH,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await send("Page.navigate", { url: `${BASE}/?v=drill` });
  let resumed = false;
  for (let i = 0; i < 60 && !resumed; i++) {
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
        t.includes('Russian Reference Pack') &&
        document.querySelectorAll('[data-unit]').length > 0
      );
    })()`);
  let healthy = 0;
  for (let i = 0; i < 40 && healthy < 3; i++) {
    healthy = (await homeHealthy()) ? healthy + 1 : 0;
    await sleep(250);
  }
  if (healthy < 3) throw new Error("navigation error: home never went stable-healthy");

  // ---- start a real session; the runner opens with in-session chrome. ----
  let started = false;
  for (let i = 0; i < 20 && !started; i++) {
    started = await evaluate(`(() => {
      const b = [...document.querySelectorAll('button')].find((x) =>
        (x.textContent ?? '').includes('Start today'));
      if (!b) return false;
      b.click();
      return true;
    })()`);
    if (!started) await sleep(250);
  }
  if (!started) throw new Error("navigation error: no 'Start today' plan button on a healthy home");

  let chrome0 = null;
  for (let i = 0; i < 60 && !chrome0; i++) {
    await sleep(150);
    chrome0 = await evaluate(`(() => {
      const el = document.querySelector('[data-session-chrome] .session-bar-fill');
      if (!el) return null;
      const cs = getComputedStyle(el);
      return {
        transitionProperty: cs.transitionProperty,
        transitionDuration: cs.transitionDuration,
        transitionTiming: cs.transitionTimingFunction,
      };
    })()`);
  }
  if (!chrome0)
    throw new Error("navigation error: session chrome never appeared after Start today");
  check(
    "BAR TRANSITION: .session-bar-fill carries the width ease in the slow family",
    /width/.test(chrome0.transitionProperty) &&
      Math.abs(toSec(chrome0.transitionDuration.split(",")[0]) - 0.3) < 0.05 &&
      /cubic-bezier/.test(chrome0.transitionTiming),
    chrome0,
  );

  // ---- 1. advance to a graded multiple-choice card, sampling the bar. ----
  // Day-0 plans can lead with a typed card, so the walk tolerates both
  // runner kinds: typed cards get typed (never guessed-correct — the bar
  // check only needs the advance), and the first choices card gets the
  // graded pick whose Continue lands the done-increment.
  const runnerKind = () =>
    evaluate(`(() => {
      if (document.querySelector('[aria-label="Choices"] button:not([disabled])')) return 'choices';
      if (document.querySelector('#practice-answer:not([disabled])')) return 'typed';
      if (document.querySelector('.verdict')) return 'graded';
      return null;
    })()`);
  const clickContinue = () =>
    evaluate(`(() => {
      const b = [...document.querySelectorAll('button')].find((x) =>
        (x.textContent ?? '').trim().startsWith('Continue') ||
        (x.textContent ?? '').trim() === 'Back to plan');
      if (!b || b.disabled) return false;
      b.click();
      return true;
    })()`);
  const clickStartPracticing = () =>
    evaluate(`(() => {
      const b = [...document.querySelectorAll('button')].find((x) =>
        (x.textContent ?? '').trim() === 'Start practicing');
      if (b) { b.click(); return true; }
      return false;
    })()`);
  const typeAndCheck = () =>
    evaluate(`(() => {
      const el = document.querySelector('#practice-answer');
      if (!el) return false;
      const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      set.call(el, '\\u0430');
      el.dispatchEvent(new Event('input', { bubbles: true }));
      const b = [...document.querySelectorAll('button')].find((x) => (x.textContent ?? '').trim() === 'Check');
      if (b && !b.disabled) b.click();
      return true;
    })()`);
  let bridgeStash = null;
  async function sampleBarThroughAdvance() {
    // Run 204 pitfall: the Continue click can be a no-op (button not yet
    // rendered / already advanced), leaving the bar flat or the chrome gone.
    // Retry the click every poll until it lands, keep the window wide
    // (bridge gap tolerated via nulls), and report whether a click landed.
    // The inter-activity bridge rides INSIDE this window (it opens at the
    // Continue click) — probe for it in the same evaluate and bank it.
    const widths = [];
    let clicked = false;
    let settled = 0;
    for (let i = 0; i < 60; i++) {
      const sample = await evaluate(`(() => {
        const e = document.querySelector('[data-session-chrome] .session-bar-fill');
        const b = document.querySelector('[data-testid="session-bridge"]');
        let bridge = null;
        if (b) {
          const cs = getComputedStyle(b);
          bridge = { name: cs.animationName, duration: cs.animationDuration };
        }
        return {
          w: e ? Math.round(e.getBoundingClientRect().width * 100) / 100 : null,
          bridge,
        };
      })()`);
      if (sample.w !== null) widths.push(sample.w);
      if (!bridgeStash && sample.bridge) {
        bridgeStash = sample.bridge;
        await shot("bridge");
      }
      if (!clicked) clicked = await clickContinue();
      if (clicked && widths.length >= 8) {
        const tail = widths.slice(-8);
        if (tail.every((w) => Math.abs(w - tail[tail.length - 1]) < 0.01)) settled++;
        if (settled >= 2) break; // bar glided and settled; window done
      }
      await sleep(40);
    }
    return { widths, clicked };
  }
  const sampleSets = [];
  let gradedOnChoices = false;
  for (let item = 0; item < 6 && !gradedOnChoices; item++) {
    // A lesson card may gate the first card of the session: start it.
    await clickStartPracticing();
    let kind = null;
    for (let i = 0; i < 40 && !kind; i++) {
      kind = await runnerKind();
      if (!kind) await sleep(150);
    }
    if (kind === "choices") {
      await evaluate(
        `document.querySelector('[aria-label="Choices"] button:not([disabled])').click()`,
      );
      gradedOnChoices = true;
      sampleSets.push(await sampleBarThroughAdvance());
      break;
    }
    if (kind === "typed") {
      await typeAndCheck();
      for (let i = 0; i < 20; i++) {
        if ((await evaluate(`!!document.querySelector('.verdict')`)) || (await clickContinue()))
          break;
        await sleep(150);
      }
    }
    sampleSets.push(await sampleBarThroughAdvance());
  }
  if (!gradedOnChoices) {
    const dump = await evaluate(`(() => ({
      buttons: [...document.querySelectorAll('button')].map((b) => (b.textContent ?? '').trim()).filter(Boolean).slice(0, 30),
      inputs: [...document.querySelectorAll('input, textarea')].map((i) => i.id || i.type),
      bridge: !!document.querySelector('[data-testid="session-bridge"]'),
      practice: !!document.querySelector('[aria-label="Practice"]'),
      verdict: !!document.querySelector('.verdict'),
      text: (document.body.innerText || '').slice(0, 500),
    }))()`);
    console.error("runner dump:", JSON.stringify(dump, null, 1));
    throw new Error("navigation error: no choices card appeared in the walk");
  }
  let best = { base: 0, final: 0, samples: [], mids: -1 };
  for (const set of sampleSets) {
    const widths = set.widths;
    if (!set.clicked || widths.length < 4) continue;
    const b0 = widths[0];
    const f0 = widths[widths.length - 1];
    const mids = widths.filter((w) => w > b0 + 0.5 && w < f0 - 0.5).length;
    if (f0 - b0 > 0.5 && mids > best.mids) best = { base: b0, final: f0, samples: widths, mids };
  }
  check(
    "BAR MID-GLIDE: the fill width passes through intermediate values when a card lands",
    best.mids >= 2,
    { base: best.base, final: best.final, samples: best.samples, intermediate: best.mids },
  );
  await shot("bar-mid-fill");

  // ---- 2. REVEAL on the next graded pick: ring + badge + fill + dim. ----
  // The bridge lives ~1.2s, then the next runner opens; grade it again.
  let choices2 = 0;
  let bridgeChecked = false;
  if (bridgeStash) {
    check(
      "BRIDGE REGRESSION: the inter-activity bridge still enters via fade-up",
      bridgeStash.name === "fade-up" && toSec(bridgeStash.duration) > 0.1,
      bridgeStash,
    );
    bridgeChecked = true;
  }
  for (let i = 0; i < 90 && choices2 === 0; i++) {
    if (!bridgeChecked) {
      const bridgeAnim = await evaluate(`(() => {
        const b = document.querySelector('[data-testid="session-bridge"]');
        if (!b) return null;
        const cs = getComputedStyle(b);
        return { name: cs.animationName, duration: cs.animationDuration };
      })()`);
      if (bridgeAnim) {
        check(
          "BRIDGE REGRESSION: the inter-activity bridge still enters via fade-up",
          bridgeAnim.name === "fade-up" && toSec(bridgeAnim.duration) > 0.1,
          bridgeAnim,
        );
        await shot("bridge");
        bridgeChecked = true;
      }
    }
    // Run 204 pitfall: the next runner can ride a lesson card or open as
    // a typed/graded runner — walk past those instead of spinning.
    await clickStartPracticing();
    choices2 = await evaluate(
      `document.querySelectorAll('[aria-label="Choices"] button:not([disabled])').length`,
    );
    if (choices2 === 0) {
      const kind = await runnerKind();
      if (kind === "typed") await typeAndCheck();
      else if (kind === "graded") await clickContinue();
      await sleep(150);
    }
  }
  if (!bridgeChecked)
    check("BRIDGE REGRESSION: the inter-activity bridge still enters via fade-up", false, {
      measured: "bridge screen never observed in the walk",
    });
  if (choices2 === 0) throw new Error("navigation error: the second activity never opened choices");
  await evaluate(`document.querySelector('[aria-label="Choices"] button:not([disabled])').click()`);
  let seenRight = false;
  for (let i = 0; i < 30 && !seenRight; i++) {
    await sleep(100);
    seenRight = await evaluate(`!!document.querySelector('.choice--correct')`);
  }
  if (!seenRight) throw new Error("no .choice--correct reveal computed after grading");
  // Harness fix (run 205): the reveal ring scales in and the dim fades over
  // the token durations — measure the SETTLED values; the arrival itself is
  // asserted via animationName + duration (both persist on the computed
  // style after the animation finishes).
  await sleep(600);
  const reveal = await evaluate(`(() => {
    const right = document.querySelector('.choice--correct');
    if (!right) return null;
    const cs = getComputedStyle(right);
    const badge = getComputedStyle(right, '::after');
    const dim = [...document.querySelectorAll('.choice--dim')].map((el) =>
      parseFloat(getComputedStyle(el).opacity));
    const wrong = document.querySelector('.choice--wrong');
    return {
      animationName: cs.animationName,
      animationDuration: cs.animationDuration,
      background: cs.backgroundColor,
      boxShadow: cs.boxShadow,
      badgeContent: badge.content,
      badgeBackground: badge.backgroundColor,
      dimOpacities: dim,
      tappedWrong: wrong
        ? {
            animationName: getComputedStyle(wrong).animationName,
            hasTapped: wrong.className.includes('choice--tapped'),
          }
        : null,
      verdictAnim: (() => {
        const v = document.querySelector('.verdict');
        return v ? getComputedStyle(v).animationName : null;
      })(),
    };
  })()`);
  if (!reveal) throw new Error("no .choice--correct reveal computed after grading");
  const okSoft = reveal.background === "rgb(232, 240, 230)"; // --ok-soft #e8f0e6
  check(
    "REVEAL: the right pick computes the choice-reveal arrival + ring box-shadow",
    reveal.animationName === "choice-reveal" &&
      toSec(reveal.animationDuration) <= 0.15 &&
      /rgba?\(/.test(reveal.boxShadow) &&
      reveal.boxShadow.includes("2px"),
    reveal,
  );
  check(
    "REVEAL FILL + CHECK BADGE: soft ok-soft fill and the drawn check (ring + check, not color alone)",
    okSoft && /2713|✓/.test(reveal.badgeContent),
    { background: reveal.background, badgeContent: reveal.badgeContent },
  );
  check(
    "DIM: the non-chosen choices sit at the locked-board opacity",
    reveal.dimOpacities.length >= 1 && reveal.dimOpacities.every((o) => Math.abs(o - 0.55) < 0.05),
    reveal.dimOpacities,
  );
  check(
    "VERDICT enters via fade-up (FEEL-GLOBAL-001 regression)",
    reveal.verdictAnim === "fade-up",
    reveal.verdictAnim,
  );
  await shot("graded-reveal");

  // ---- 3. stop the session -> the styled end-of-session card. ----
  const stopped = await evaluate(`(() => {
    const b = [...document.querySelectorAll('button')].filter((x) =>
      (x.textContent ?? '').includes('Stop session'));
    if (!b.length) return false;
    b[b.length - 1].click();
    return true;
  })()`);
  if (!stopped) throw new Error("navigation error: no Stop session control appeared");
  // A confirm may follow the stop; walk any confirm control, then read the card.
  for (let i = 0; i < 20; i++) {
    const conf = await evaluate(`(() => {
      const b = [...document.querySelectorAll('button')].find((x) =>
        ['Stop the session', 'Yes, stop', 'Stop'].includes((x.textContent ?? '').trim()));
      if (!b) return null;
      b.click();
      return (b.textContent ?? '').trim();
    })()`);
    if (conf) break;
    await sleep(200);
  }
  let summary = null;
  for (let i = 0; i < 40 && !summary; i++) {
    await sleep(200);
    summary = await evaluate(`(() => {
      const el = document.querySelector('.session-summary');
      if (!el) return null;
      const cs = getComputedStyle(el);
      return {
        animationName: cs.animationName,
        animationDuration: cs.animationDuration,
        background: cs.backgroundColor,
        borderStyle: cs.borderStyle,
        borderColor: cs.borderColor,
        paddingTop: cs.paddingTop,
        borderRadius: cs.borderRadius,
      };
    })()`);
  }
  if (!summary) throw new Error("navigation error: .session-summary never rendered after stopping");
  check(
    "SESSION CARD: .session-summary computes the calm warm rules (surface fill, line outline, padding, radius)",
    summary.background === "rgb(255, 253, 249)" && // --surface #fffdf9
      summary.borderStyle === "solid" &&
      parseFloat(summary.paddingTop) >= 8 &&
      parseFloat(summary.borderRadius) >= 4,
    summary,
  );
  check(
    "SESSION CARD enters via card-in (fade + 0.98->1 scale)",
    summary.animationName === "card-in" && Math.abs(toSec(summary.animationDuration) - 0.25) < 0.05,
    { animationName: summary.animationName, duration: summary.animationDuration },
  );
  await shot("session-summary");

  // ---- 4. reduced motion: every duration this card adds collapses. ----
  await send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "reduce" }],
  });
  const reduced = await evaluate(`(() => {
    const probe = document.createElement('div');
    probe.innerHTML =
      '<div class="session-summary"><span class="session-bar-fill" style="width:50%"></span>' +
      '<span class="step-dot"></span><button class="choice--correct"><span class="choice--dim">x</span>' +
      '<span class="choice--wrong">y</span></button></div>';
    document.body.appendChild(probe);
    const g = (sel, prop) => getComputedStyle(probe.querySelector(sel))[prop];
    const out = {
      summaryAnim: g('.session-summary', 'animationDuration'),
      barTransition: g('.session-bar-fill', 'transitionDuration'),
      dotTransition: g('.step-dot', 'transitionDuration'),
      correctAnim: g('.choice--correct', 'animationDuration'),
      wrongAnim: g('.choice--wrong', 'animationDuration'),
    };
    probe.remove();
    return out;
  })()`);
  const flat = (v) => toSec(v) <= 0.011;
  check(
    "REDUCED MOTION: every duration FEEL-DRILL-001 adds collapses to ~0",
    flat(reduced.summaryAnim) &&
      flat(reduced.barTransition) &&
      flat(reduced.dotTransition) &&
      flat(reduced.correctAnim) &&
      flat(reduced.wrongAnim),
    reduced,
  );
} catch (err) {
  result.error = String(err && err.message ? err.message : err);
  console.error("CAPTURE ERROR:", result.error);
  result.failures++;
} finally {
  writeFileSync(join(OUT, "result.json"), JSON.stringify(result, null, 2) + "\n");
  if (chrome) chrome.kill();
  if (chromeDir) {
    try {
      const { rmSync } = await import("node:fs");
      rmSync(chromeDir, { recursive: true, force: true });
    } catch {
      // leaked profile dir — another lane may own a live one; leave it
    }
  }
  if (serve) serve.kill();
  console.log(
    `\n${result.checks.length - result.failures}/${result.checks.length} checks green -> ${join(OUT, "result.json")}`,
  );
  process.exit(result.failures ? 1 : 0);
}
