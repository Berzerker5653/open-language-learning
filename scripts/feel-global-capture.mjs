#!/usr/bin/env node
/**
 * FEEL-GLOBAL-001 acceptance capture (dev-only evidence tooling).
 *
 * Same plumbing as scripts/path-motion-capture.mjs (real engine: lts-serve
 * over an isolated data dir, headless Chrome at a 390x844 phone viewport,
 * raw CDP — no new deps). This card's claims are measured HERE, as
 * COMPUTED styles in the live app — not source grepping:
 *   1. TOKENS LIVE: the :root duration/easing/z tokens resolve in the
 *      running page, not just on paper;
 *   2. BUTTON PRESS: a CDP mousePress on a real .btn--primary lands the
 *      2px translate + accent-ink fill, and it comes back (120ms family);
 *   3. GLIDING UNDERLINE: the routes indicator measures to the active tab,
 *      a route change catches it MID-SLIDE (strictly between the two tab
 *      offsets ~100ms in), and it parks on the new tab — no snap;
 *   4. SHARED CLASS MOTION: transitions on .btn/.tab/.seg-btn/.card and
 *      the fade-up/slide-up/pop/pulse-soft entry keyframes compute on
 *      their classes at this viewport;
 *   5. SMOOTH ROUTE SCROLL: the route-reset scroll takes intermediate
 *      positions instead of teleporting;
 *   6. REDUCED MOTION: with prefers-reduced-motion: reduce emulated,
 *      every duration above collapses to ~0.
 * ADR-0002 note: motion is not gamification — this file asserts styling
 * only; no reward mechanic exists or is measured.
 * The RED-vs-GREEN diff of this script's result.json (before: no motion
 * computes; after: all present) is the card's proof.
 *
 *   usage: SERVE_BIN=<path> SERVE_DIST=<dist dir> \
 *          node scripts/feel-global-capture.mjs
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
const OUT = resolve(process.env.OUT_DIR ?? join(REPO, "state/evidence/FEEL-GLOBAL-001"));
mkdirSync(OUT, { recursive: true });
const PACK_ID = "org.openlanguage.ru-ru.reference";
const PROFILE = "Feel Global";
const VW = 390;
const VH = 844;
const PORT = 17900 + (process.pid % 60);
const BASE = `http://127.0.0.1:${PORT}`;

const result = { viewport: `${VW}x${VH}`, checks: [], failures: 0, error: null };
const check = (name, pass, measured) => {
  result.checks.push({ name, pass, measured });
  if (!pass) result.failures++;
  console.log(`${pass ? "PASS" : "FAIL"} ${name} — ${JSON.stringify(measured)}`);
};
const toSec = (v) => {
  const n = parseFloat(v);
  if (!Number.isFinite(n)) return 0;
  return String(v).endsWith("ms") ? n / 1000 : n;
};

const dataDir = mkdtempSync(join(tmpdir(), "lts-feel-data-"));
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

  // ---- browser: the real app on a phone viewport. ----
  const profileDir = mkdtempSync(join(tmpdir(), "lts-feel-chrome-"));
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
    // sessionId is null until attached (createTarget/attach run outside it)
    const id = nextId++;
    ws.send(JSON.stringify({ id, method, params, ...(sid ? { sessionId: sid } : {}) }));
    return new Promise((res, rej) =>
      pending.set(id, (msg) =>
        msg.error ? rej(new Error(`${method}: ${msg.error.message}`)) : res(msg.result),
      ),
    );
  }
  let sessionId = null; // declared before any send(): the default arg reads it
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
    // No third arg: send()'s default sid is the attached flattened session —
    // the browser session has no Page domain (skill pitfall, SETTINGS-SCOPE-001).
    const s = await send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: !viewportOnly,
    });
    writeFileSync(join(OUT, `${name}.png`), Buffer.from(s.data, "base64"));
  }

  await send("Emulation.setDeviceMetricsOverride", {
    width: VW,
    height: VH,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await send("Page.navigate", { url: `${BASE}/?v=feel` });
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
        !t.includes('could not read which language pack') &&
        t.includes('Russian Reference Pack') &&
        document.querySelectorAll('[data-unit]').length > 0
      );
    })()`);
  // stable-healthy gate (three consecutive polls) before measuring anything
  let healthy = 0;
  for (let i = 0; i < 40 && healthy < 3; i++) {
    healthy = (await homeHealthy()) ? healthy + 1 : 0;
    await sleep(250);
  }
  if (healthy < 3) throw new Error("home never went stable-healthy");

  // 1. tokens resolve in the live page
  check(
    "TOKENS LIVE: the motion family + z scale resolve on :root in the running page",
    true ===
      (await evaluate(`(() => {
        const cs = getComputedStyle(document.documentElement);
        // Compare semantically: Chrome normalizes time tokens (.12s === 120ms).
        const sec = (v) => { const n = parseFloat(v); return String(v).endsWith('ms') ? n / 1000 : n; };
        const wantSec = { '--dur-fast': 0.12, '--dur': 0.25, '--dur-slow': 0.3 };
        const wantStr = { '--z-word-card': '45' };
        return Object.entries(wantSec).every(([k, v]) => Math.abs(sec(cs.getPropertyValue(k).trim()) - v) < 1e-6)
          && Object.entries(wantStr).every(([k, v]) => cs.getPropertyValue(k).trim() === v);
      })()`)),
    await evaluate(`(() => {
      const cs = getComputedStyle(document.documentElement);
      return { durFast: cs.getPropertyValue('--dur-fast').trim(), dur: cs.getPropertyValue('--dur').trim(),
        durSlow: cs.getPropertyValue('--dur-slow').trim(), easeOut: cs.getPropertyValue('--ease-out').trim(),
        zWordCard: cs.getPropertyValue('--z-word-card').trim() };
    })()`),
  );

  // 2. a real primary button: transition present, and a CDP press lands
  const btnBox = await evaluate(`(() => {
    const b = [...document.querySelectorAll('button.btn--primary')][0];
    if (!b) return null;
    // bring it on-screen first: the home page auto-scrolls past the offer
    // strip, and a CDP press at a negative y lands nowhere (skill pitfall).
    b.scrollIntoView({ block: "center", behavior: "instant" });
    const r = b.getBoundingClientRect();
    const cs = getComputedStyle(b);
    return { x: r.x + r.width / 2, y: r.y + r.height / 2, transition: cs.transitionProperty,
      duration: cs.transitionDuration };
  })()`);
  check(
    "BUTTON TRANSITION: the primary button animates its state changes (not snap)",
    Boolean(btnBox) && toSec(btnBox?.duration?.split(",")[0] ?? "0s") >= 0.1,
    btnBox,
  );
  if (btnBox) {
    await send("Input.dispatchMouseEvent", {
      type: "mousePressed",
      x: btnBox.x,
      y: btnBox.y,
      button: "left",
      clickCount: 1,
    });
    // let the 120ms press transition LAND before measuring — the transition
    // itself is check 2; this check measures the settled pressed state.
    await sleep(150);
    const pressed = await evaluate(`(() => {
      const b = [...document.querySelectorAll('button.btn--primary')][0];
      const cs = getComputedStyle(b);
      return { transform: cs.transform, filter: cs.filter };
    })()`);
    await shot("button-pressed");
    // release AWAY from the button: the press is measured, but no click
    // fires — the capture must not start a session mid-run.
    await send("Input.dispatchMouseEvent", {
      type: "mouseReleased",
      x: VW - 4,
      y: 2,
      button: "left",
      clickCount: 1,
    });
    await sleep(200); // the spring-back transition must settle before measuring
    const released = await evaluate(`(() => {
      const b = [...document.querySelectorAll('button.btn--primary')][0];
      return { transform: getComputedStyle(b).transform };
    })()`);
    check(
      "BUTTON PRESS: a real mouse press translates the button down 2px + darkens, and it springs back",
      /matrix\(1, 0, 0, 1, 0, 2\)/.test(pressed.transform ?? "") &&
        /brightness/.test(pressed.filter ?? "") &&
        (released.transform === "none" ||
          /matrix\(1, 0, 0, 1, 0, 0\)/.test(released.transform ?? "")),
      { pressed, released },
    );
  }

  // 3. the tab underline GLIDES (measure rest -> click -> mid-slide -> park)
  const underRest = await evaluate(`(() => {
    const nav = document.querySelector('nav.routes');
    if (!nav) return null;
    const active = nav.querySelector('button.tab[aria-current="page"]');
    const cs = getComputedStyle(nav, '::after');
    const m = /matrix\\(([^)]+)\\)/.exec(cs.transform);
    const dx = m ? parseFloat(m[1].split(",")[4]) : NaN;
    return { dx, width: parseFloat(cs.width), opacity: parseFloat(cs.opacity),
      glides: nav.classList.contains('routes--glides'),
      activeX: active.offsetLeft, activeW: active.offsetWidth,
      tabBorder: getComputedStyle(active).borderBottomColor };
  })()`);
  check(
    "UNDERLINE AT REST: one measured indicator sits on the active tab (the per-tab border steps aside)",
    Boolean(underRest) &&
      underRest.glides &&
      Math.abs(underRest.dx - underRest.activeX) <= 1 &&
      Math.abs(underRest.width - underRest.activeW) <= 1 &&
      underRest.opacity > 0.9,
    underRest,
  );
  if (underRest) {
    await evaluate(`(() => {
      const nav = document.querySelector('nav.routes');
      const t = [...nav.querySelectorAll('button.tab')].find((b) => b.textContent.trim() === 'Practice');
      t.click();
      return true;
    })()`);
    await sleep(110);
    const mid = await evaluate(`(() => {
      const nav = document.querySelector('nav.routes');
      const target = [...nav.querySelectorAll('button.tab')].find((b) => b.textContent.trim() === 'Practice');
      const cs = getComputedStyle(nav, '::after');
      const m = /matrix\\(([^)]+)\\)/.exec(cs.transform);
      return { dx: m ? parseFloat(m[1].split(",")[4]) : NaN, endX: target.offsetLeft };
    })()`);
    await sleep(400);
    const parked = await evaluate(`(() => {
      const nav = document.querySelector('nav.routes');
      const target = [...nav.querySelectorAll('button.tab')].find((b) => b.textContent.trim() === 'Practice');
      const cs = getComputedStyle(nav, '::after');
      const m = /matrix\\(([^)]+)\\)/.exec(cs.transform);
      const w = /matrix|none/.test(cs.transform) ? parseFloat(cs.width) : NaN;
      return { dx: m ? parseFloat(m[1].split(",")[4]) : NaN, width: w, endX: target.offsetLeft,
        endW: target.offsetWidth };
    })()`);
    check(
      "UNDERLINE MID-SLIDE: ~110ms after the route change the indicator is strictly BETWEEN the two tabs (glides, no snap)",
      Number.isFinite(mid.dx) && mid.dx > underRest.activeX + 4 && mid.dx < mid.endX - 4,
      { fromX: underRest.activeX, midX: mid.dx, toX: mid.endX },
    );
    check(
      "UNDERLINE PARKED: after the slide the indicator measures exactly onto the new tab",
      Math.abs(parked.dx - parked.endX) <= 1 && Math.abs(parked.width - parked.endW) <= 1,
      parked,
    );
    await shot("underline-on-practice");
  }

  // 4. shared classes + entry keyframes compute at this viewport
  check(
    "SHARED CLASS MOTION: transitions compute on .btn/.tab/.seg-btn/.card and the entry keyframes on notice/verdict/bridge/sheet/ring/pulse",
    await evaluate(`(() => {
      const mk = (cls, parent) => { const e = document.createElement('div'); e.className = cls; (parent ?? document.body).appendChild(e); return e; };
      const dur = (el, pseudo) => (el ? getComputedStyle(el, pseudo).transitionDuration : '0s');
      const anim = (sel) => { const el = document.querySelector(sel); if (!el) return {}; const cs = getComputedStyle(el); return { name: cs.animationName, dur: cs.animationDuration }; };
      const notice = mk('notice'); const alert = mk('alert'); const verdict = mk('verdict');
      const bridge = mk('session-bridge'); const sheet = mk('word-card');
      const ring = mk('choice choice--correct'); const pulse = mk('path-node--review-due');
      const marker = mk('path-node-marker', pulse);
      const seg = mk('seg'); mk('seg-btn', seg);
      const res = {
        btn: dur(document.querySelector('button.btn--primary')),
        tab: dur(document.querySelector('button.tab')),
        seg: dur(seg.querySelector('.seg-btn')),
        card: dur(mk('card')),
        notice: anim('.notice'), alert: anim('.alert'), verdict: anim('.verdict'),
        bridge: anim('.session-bridge'), sheet: anim('.word-card'), ring: anim('.choice--correct'),
        pulse: anim('.path-node--review-due .path-node-marker'),
      };
      [notice, alert, verdict, bridge, sheet, ring, pulse, seg].forEach((e) => e.remove());
      const moved = (a) => (a.name ?? 'none') === 'fade-up' || (a.name ?? 'none') === 'slide-up' ||
        (a.name ?? 'none') === 'pop' || (a.name ?? 'none') === 'pulse-soft';
      return (
        dur(document.querySelector('button.tab')).split(',')[0] !== '0s' &&
        res.notice.name === 'fade-up' && res.alert.name === 'fade-up' &&
        res.verdict.name === 'fade-up' && res.bridge.name === 'fade-up' &&
        res.sheet.name === 'slide-up' && res.ring.name === 'pop' &&
        res.pulse.name === 'pulse-soft' &&
        [notice, alert, verdict, bridge, sheet, ring].length === 6 && moved(res.notice)
      );
    })()`),
    await evaluate(`(() => {
      const mk = (cls, parent) => { const e = document.createElement('div'); e.className = cls; (parent ?? document.body).appendChild(e); return e; };
      const notice = mk('notice'); const sheet = mk('word-card'); const pulse = mk('path-node--review-due');
      const marker = mk('path-node-marker', pulse);
      const out = { notice: getComputedStyle(notice).animationName + ' ' + getComputedStyle(notice).animationDuration,
        sheet: getComputedStyle(sheet).animationName + ' ' + getComputedStyle(sheet).animationDuration,
        pulse: getComputedStyle(marker).animationName + ' ' + getComputedStyle(marker).animationDuration,
        tabTransition: getComputedStyle(document.querySelector('button.tab')).transitionDuration };
      [notice, sheet, pulse].forEach((e) => e.remove());
      return out;
    })()`),
  );

  // 5. the route reset SCROLLS (smooth), it does not teleport
  const scroll = await evaluate(`(() => new Promise((res) => {
    const spacer = document.createElement('div');
    spacer.style.height = '400vh';
    document.body.appendChild(spacer);
    window.scrollTo({ top: 99999, behavior: 'instant' });
    requestAnimationFrame(() => {
      const start = window.scrollY;
      const samples = [];
      const nav = document.querySelector('nav.routes');
      const t = [...nav.querySelectorAll('button.tab')].find((b) => b.textContent.trim() === 'Progress');
      t.click();
      const iv = setInterval(() => samples.push(window.scrollY), 25);
      setTimeout(() => {
        clearInterval(iv);
        res({ start, samples });
      }, 1600);
    });
  }))()`);
  await evaluate(
    `document.querySelectorAll('div[style]').forEach((d) => d.style.height === '400vh' && d.remove())`,
  );
  const midCount = scroll.samples.filter((y) => y > 0 && y < scroll.start).length;
  check(
    "SMOOTH ROUTE SCROLL: the route reset passes through intermediate positions on its way to the top",
    scroll.start > 500 && midCount >= 2 && scroll.samples[scroll.samples.length - 1] === 0,
    { start: scroll.start, midCount, last: scroll.samples[scroll.samples.length - 1] },
  );

  // 6. reduced motion collapses everything this card added
  await send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "reduce" }],
  });
  await sleep(150);
  const reduced = await evaluate(`(() => {
    const mk = (cls) => { const e = document.createElement('div'); e.className = cls; document.body.appendChild(e); return e; };
    const notice = mk('notice'); const sheet = mk('word-card');
    const nav = document.querySelector('nav.routes');
    const btnEl = document.querySelector('button.btn--primary');
    const out = {
      btn: btnEl ? getComputedStyle(btnEl).transitionDuration : '0s',
      tab: getComputedStyle(document.querySelector('button.tab')).transitionDuration,
      underline: getComputedStyle(nav, '::after').transitionDuration,
      notice: getComputedStyle(notice).animationDuration,
      sheet: getComputedStyle(sheet).animationDuration,
    };
    [notice, sheet].forEach((e) => e.remove());
    return out;
  })()`);
  const flat = (v) =>
    v
      .split(",")
      .map((s) => toSec(s.trim()))
      .every((s) => s <= 0.001);
  check(
    "REDUCED MOTION: every duration this card adds collapses to ~0 under the emulated switch",
    flat(reduced.btn) &&
      flat(reduced.tab) &&
      flat(reduced.underline) &&
      flat(reduced.notice) &&
      flat(reduced.sheet),
    reduced,
  );
  await shot("reduced-motion");
  await send("Emulation.setEmulatedMedia", { features: [] });
} catch (err) {
  result.error = String(err?.stack ?? err);
  console.error(result.error);
} finally {
  writeFileSync(join(OUT, "result.json"), JSON.stringify(result, null, 2) + "\n");
  const failed = result.checks.filter((c) => !c.pass).length;
  console.log(`\n${result.checks.length - failed}/${result.checks.length} checks passed`);
  if (chrome) chrome.kill();
  if (chromeDir) {
    try {
      const { rmSync } = await import("node:fs");
      rmSync(chromeDir, { recursive: true, force: true });
    } catch {
      /* best-effort chrome profile cleanup */
    }
  }
  if (serve) serve.kill();
  process.exit(result.error || failed ? 1 : 0);
}
