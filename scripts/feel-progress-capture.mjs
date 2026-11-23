#!/usr/bin/env node
/**
 * FEEL-PROGRESS-001 acceptance capture (dev-only evidence tooling).
 *
 * Same plumbing as scripts/feel-mywords-capture.mjs (real engine: lts-serve
 * over an isolated data dir, headless Chrome at a 390x844 viewport, raw CDP
 * — no new deps). Phase A uses a TRULY fresh profile so the designed
 * zero-state is measured against the engine's OWN learning_facts (both
 * counters zero — nothing faked). Phase B fakes ONLY the memory_stats and
 * learning_facts legs inside the page's own fetch layer (a canned activity
 * store; both legs' engine semantics are Rust-pinned) so the instrument
 * strip renders with due dates and a populated 12-week grid. What is
 * measured live: the zero-state card (copy + fade-up + the strip absent),
 * the dim-bar glide (animation name/duration, --fill-from starting at 0,
 * landing at the target width), 84 labeled tabbable cells with a capped
 * stagger, a REAL CDP mouse hover scaling the cell 1.15x and opening the
 * dark tip chip (date · summary), and keyboard focus opening the same tip.
 * The RED-vs-GREEN diff of this script's result.json is the card's proof.
 *
 *   usage: SERVE_BIN=<path> SERVE_DIST=<dist dir> \
 *          node scripts/feel-progress-capture.mjs
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
const OUT = resolve(process.env.OUT_DIR ?? join(REPO, "state/evidence/FEEL-PROGRESS-001"));
mkdirSync(OUT, { recursive: true });
const PACK_ID = "org.openlanguage.ru-ru.reference";
const PROFILE = "Feel Progress";
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

const dataDir = mkdtempSync(join(tmpdir(), "lts-feel-progress-data-"));
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

  const profileDir = mkdtempSync(join(tmpdir(), "lts-feel-progress-chrome-"));
  chromeDir = profileDir;
  chrome = spawn(
    process.env.CHROME ?? "google-chrome-stable",
    [
      "--headless=new",
      "--no-sandbox",
      "--disable-gpu",
      "--remote-debugging-port=0",
      `--user-data-dir=${profileDir}`,
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
    mobile: false,
  });

  // The phase-B fake: a canned activity store inside the page's own fetch
  // layer, armed only when the URL carries ?phase=b. learning_facts AND
  // memory_stats are the only faked legs (their engine semantics are
  // Rust-pinned); every other command rides the real engine. The dates are
  // fixed offsets from now, so the tip text is derived the same way the
  // component derives it (Intl en-US short month + day, UTC).
  await send("Page.addScriptToEvaluateOnNewDocument", {
    source: `(() => {
      // Captured at document start: the SPA's history nav may rewrite the
      // query after boot (history-screens.tsx pushState), so arming must
      // read the URL we navigated with, not the URL at fetch time.
      const ARMED = location.search.includes('phase=b');
      window.__fpArmed = ARMED;
      const armed = () => ARMED;
      const DAY = 86400000;
      const iso = (off) => new Date(Date.now() + off * DAY).toISOString().slice(0, 10);
      const stats = {
        due_today: 5,
        est_minutes: 8,
        band_retention: [
          { band: 'a1', retention_pct: 62, scheduled_items: 40 },
          { band: 'a2', retention_pct: null, scheduled_items: 0 },
        ],
        activity_days: [
          { date: iso(-3), events: 1 },
          { date: iso(-15), events: 2 },
          { date: iso(-40), events: 4 },
        ],
      };
      const realFetch = window.fetch;
      window.fetch = async (input, init) => {
        const url = typeof input === 'string' ? input : (input && input.url) || '';
        const cmd = (url.match(/\\/api\\/([a-z_]+)\\/?$/) || [])[1];
        if (armed() && cmd === 'memory_stats') {
          return new Response(JSON.stringify(stats), {
            status: 200, headers: { 'content-type': 'application/json' },
          });
        }
        if (armed() && cmd === 'learning_facts') {
          return new Response(JSON.stringify({ days_active: 9, units_done: 1 }), {
            status: 200, headers: { 'content-type': 'application/json' },
          });
        }
        return realFetch(input, init);
      };
    })()`,
  });

  const enterApp = async (url) => {
    await send("Page.navigate", { url });
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
  };

  // ---------------------------------------------------------------- phase A
  // A truly fresh profile: the engine's own learning_facts read is real and
  // reports zeros, so the designed zero-state must replace the strip.
  await enterApp(`${BASE}/?v=fp-a`);
  await clickByText("Progress");
  let zeroSeen = false;
  for (let i = 0; i < 40 && !zeroSeen; i++) {
    zeroSeen = await evaluate("!!document.querySelector('.progress-zero')");
    if (!zeroSeen) await sleep(150);
  }
  const zero = await evaluate(`(() => {
    const el = document.querySelector('.progress-zero');
    if (!el) return { present: false, strip: !!document.querySelector('[data-memory-stats]') };
    const s = getComputedStyle(el);
    const t = el.innerText;
    return {
      present: true,
      strip: !!document.querySelector('[data-memory-stats]'),
      copy: t.replace(/\\s+/g, ' ').trim(),
      animName: s.animationName,
      animDur: s.animationDuration,
      border: s.borderTopStyle + ' ' + s.borderTopWidth,
      hasToday: /Today/.test(t),
      numbers: /\\d/.test(t),
    };
  })()`);
  // Put the asserted card IN the evidence frame: on a 390x844 viewport the
  // zero-state card (and the base's strip it replaces) sit below the fold,
  // so a top-of-page shot proves nothing (SETTINGS-SCOPE-001 pitfall).
  await evaluate(`(() => {
    const el =
      document.querySelector(".progress-zero") || document.querySelector("[data-memory-stats]");
    if (el) el.scrollIntoView({ block: "center" });
    else window.scrollTo(0, 0);
  })()`);
  await sleep(150);
  await shot("zero-state", true);
  check(
    "ZERO: fresh profile gets the designed honest zero-state (strip absent, fades up)",
    zero.present &&
      !zero.strip &&
      /Nothing studied yet/.test(zero.copy ?? "") &&
      zero.hasToday &&
      zero.animName === "fade-up" &&
      zero.border === "dashed 2px" &&
      !zero.numbers,
    zero,
  );

  // ---------------------------------------------------------------- phase B
  // The instrument phase: canned activity lands the strip, then the live
  // UI is measured — glide, staggered cells, real hover, keyboard focus.
  await enterApp(`${BASE}/?v=fp-b&phase=b`);
  await clickByText("Progress");
  let strip = false;
  for (let i = 0; i < 60 && !strip; i++) {
    strip = await evaluate("!!document.querySelector('.memory-retention .dim-progress-fill')");
    if (!strip) await sleep(120);
  }
  result.phaseB = await evaluate("({ armed: window.__fpArmed, href: location.href })");
  // Measure the glide ASAP after the strip lands (mid-flight sampling).
  const glideEarly = await evaluate(`(() => {
    const f = document.querySelector('.memory-retention .dim-progress-fill');
    if (!f) return { present: false };
    const s = getComputedStyle(f);
    return {
      present: true,
      name: s.animationName,
      dur: s.animationDuration,
      fillFrom: f.style.getPropertyValue('--fill-from'),
      widthNow: s.width,
    };
  })()`);
  // Mid-glide frame: the contract promises a screenshot of bars growing, so
  // capture WHILE the 400ms glide is in flight (the round-trip itself eats
  // most of the animation window), centered on the strip.
  await evaluate(`(() => {
    const el = document.querySelector(".memory-retention");
    if (el) el.scrollIntoView({ block: "center" });
  })()`);
  await shot("bars-mid-glide", true);
  await sleep(700); // let the 400ms glide and the 250ms cell fade settle
  const glideFinal = await evaluate(`(() => {
    const f = document.querySelector('.memory-retention .dim-progress-fill');
    if (!f) return { present: false };
    return { present: true, widthFinal: getComputedStyle(f).width, attr: f.getAttribute('width') };
  })()`);
  check(
    "GLIDE: dim bars grow from the last shown width over the 400ms data-fill token",
    glideEarly.name === "dim-glide" &&
      glideEarly.dur === "0.4s" &&
      glideEarly.fillFrom === "0px" &&
      glideFinal.widthFinal === glideFinal.attr + "px",
    { glideEarly, glideFinal },
  );
  await shot("bars-and-calendar", true);

  const cal = await evaluate(`(() => {
    const cells = [...document.querySelectorAll('.memory-cal-cell')];
    const first = cells[0] ? getComputedStyle(cells[0]) : null;
    const stagger = cells.map((c) => parseInt(c.style.getPropertyValue('--cell-i') || '-1', 10));
    return {
      n: cells.length,
      labeled: cells.every((c) => (c.getAttribute('aria-label') || '').includes('·')),
      tabbable: cells.every((c) => c.getAttribute('tabindex') === '0'),
      animName: first ? first.animationName : null,
      animDur: first ? first.animationDuration : null,
      maxStagger: stagger.length ? Math.max(...stagger) : -1,
      svgHidden: !!document.querySelector('.memory-calendar svg[aria-hidden]'),
    };
  })()`);
  check(
    "CAL: every in-window cell is labeled, tab-reachable, and fills in staggered",
    cal.n === 84 &&
      cal.labeled &&
      cal.tabbable &&
      cal.animName === "cal-in" &&
      cal.animDur === "0.25s" &&
      cal.maxStagger === 40 &&
      !cal.svgHidden,
    cal,
  );

  // Real mouse hover over the 2-exercise day: :hover scales the cell, and
  // the tip chip (state-driven) fades in with the date + summary text.
  const target = await evaluate(`(() => {
    const c = document.querySelector('.memory-cal-cell[data-events="2"]');
    if (!c) return null;
    c.scrollIntoView({ block: 'center' });
    const r = c.getBoundingClientRect();
    return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2), label: c.getAttribute('aria-label'), date: c.getAttribute('data-date') };
  })()`);
  let hover = { present: false };
  if (target) {
    await sleep(400); // settle the scroll so the viewport coords are true
    const r2 = await evaluate(`(() => {
      const c = document.querySelector('.memory-cal-cell[data-events="2"]');
      const r = c.getBoundingClientRect();
      return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) };
    })()`);
    await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: r2.x, y: r2.y });
    await sleep(250);
    hover = await evaluate(`(() => {
      const c = document.querySelector('.memory-cal-cell[data-events="2"]');
      const s = getComputedStyle(c);
      const tip = document.querySelector('.memory-cal-tip');
      const ts = tip ? getComputedStyle(tip) : null;
      return {
        present: true,
        transform: s.transform,
        tipText: tip ? tip.innerText.replace(/\\s+/g, ' ').trim() : null,
        tipAnim: ts ? ts.animationName : null,
        tipOpacity: ts ? ts.opacity : null,
        tipBg: ts ? ts.backgroundColor : null,
      };
    })()`);
    await shot("hover-tip", true);
  }
  const scale = /matrix\(([\d.]+)/.exec(hover.transform ?? "");
  check(
    "HOVER: a real CDP hover scales the day 1.15x and opens the dark tip with date + summary",
    hover.present &&
      scale &&
      Math.abs(parseFloat(scale[1]) - 1.15) < 0.02 &&
      (hover.tipText ?? "").includes("· 2 exercises") &&
      hover.tipAnim === "tip-in" &&
      hover.tipBg === "rgb(36, 31, 24)",
    { target: target?.label, hover },
  );

  // Keyboard path: focus must open the same tip (and the ring rule is
  // pinned by the contract test).
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 5, y: 5 });
  await sleep(150);
  const kbdPre = await evaluate(`(() => {
    const c = document.querySelector('.memory-cal-cell[data-events="4"]');
    if (!c) return { found: false, armed: window.__fpArmed, href: location.href };
    c.focus();
    return { found: true, label: c.getAttribute('aria-label') };
  })()`);
  await sleep(200); // let React re-render before the tip is read
  const kbd = await evaluate(`(() => {
    const c = document.querySelector('.memory-cal-cell[data-events="4"]');
    if (!c) return { focused: false, label: null, tipText: null };
    const tip = document.querySelector('.memory-cal-tip');
    return {
      focused: document.activeElement === c,
      label: c.getAttribute('aria-label'),
      // textContent (not layout-aware innerText): the chip's pointer square
      // can make innerText drop a glyph at some anchor positions.
      tipText: tip ? tip.textContent.replace(/\\s+/g, ' ').trim() : null,
      tipHtml: tip ? tip.outerHTML.slice(0, 300) : null,
      codepoints: tip ? [...tip.textContent].map((ch) => ch.codePointAt(0)).join(',') : null,
    };
  })()`);
  kbd.armed = kbdPre.found ? undefined : window.__fpArmed;
  check(
    "KEYS: keyboard focus on a cell opens the same date+summary tip",
    kbd.focused && (kbd.tipText ?? "").includes("· 4 exercises") && kbd.label === kbd.tipText,
    kbd,
  );

  writeFileSync(join(OUT, "result.json"), JSON.stringify(result, null, 2) + "\n");
  console.log(
    result.failures === 0 ? "CAPTURE GREEN" : `CAPTURE RED (${result.failures} failing checks)`,
  );
  process.exitCode = result.failures === 0 ? 0 : 1;
} catch (err) {
  result.error = String(err?.message ?? err);
  writeFileSync(join(OUT, "result.json"), JSON.stringify(result, null, 2) + "\n");
  console.error("harness error:", err);
  if (result.checks.length) console.log("CAPTURE RED (harness error after some checks ran)");
  process.exitCode = 1;
} finally {
  if (chrome) chrome.kill();
  if (serve) serve.kill();
  if (chromeDir) {
    try {
      const { rmSync } = await import("node:fs");
      rmSync(chromeDir, { recursive: true, force: true });
    } catch {
      // leaked chrome dir cleanup is best-effort
    }
  }
}
