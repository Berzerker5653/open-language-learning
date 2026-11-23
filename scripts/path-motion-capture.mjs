#!/usr/bin/env node
/**
 * PATH-FEEL-MOTION-001 acceptance capture (dev-only evidence tooling).
 *
 * Same plumbing as scripts/path-pin-consistency-capture.mjs (real engine:
 * lts-serve over an isolated data dir, headless Chrome at a 390x844 phone
 * viewport, raw CDP — no new deps). This card's claims are measured HERE,
 * as COMPUTED styles in the live app — not source grepping:
 *   1. RING FILL: the arc transitions stroke-dasharray, so the honest
 *      proven-ref fraction EASES to its new value (Duolingo ring parity;
 *      the FEEL-TARGETS legend says fills ease ~300ms ease-out);
 *   2. NODE TAP: pressing a node row springs the ring in (a CDP
 *      mousePressed lands on the row and the ring's computed transform
 *      scales below 1, then back on release);
 *   3. SECTION EXPAND/COLLAPSE: opening a band cascades its nodes in
 *      (keyframed rise+fade, staggered by --path-i, capped); collapsing
 *      plays an exit animation on the still-mounted list BEFORE it
 *      unmounts — the collapse is seen, not just done;
 *   4. CURRENT-NODE PULSE: the current ring wears a breathing halo
 *      (::after keyframe, infinite); the done check pops in;
 *   5. REDUCED MOTION: with prefers-reduced-motion: reduce emulated,
 *      every animation/transition duration collapses to ~0 and the
 *      infinite pulse stops iterating.
 * ADR-0002 note: motion is not gamification — this file asserts styling
 * only; no reward mechanic exists or is measured.
 * The RED-vs-GREEN diff of this script's result.json (before: no
 * animation styles computed; after: all present) is the card's proof.
 *
 *   usage: SERVE_BIN=<path> SERVE_DIST=<dist dir> \
 *          node scripts/path-motion-capture.mjs
 */
import { spawn } from "node:child_process";
import {
  mkdirSync,
  writeFileSync,
  readFileSync,
  mkdtempSync,
  existsSync,
  rmSync,
  readdirSync,
} from "node:fs";
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
const OUT = resolve(process.env.OUT_DIR ?? join(REPO, "state/evidence/PATH-FEEL-MOTION-001"));
mkdirSync(OUT, { recursive: true });
const PACK_ID = "org.openlanguage.ru-ru.reference";
const PROFILE = "Motion Feel";
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

// "0.3s"/"300ms" -> seconds, >=0
const toSec = (v) => {
  const n = parseFloat(v);
  if (!Number.isFinite(n)) return 0;
  return String(v).endsWith("ms") ? n / 1000 : n;
};
const firstSec = (v) =>
  Math.max(
    ...String(v)
      .split(",")
      .map((s) => toSec(s.trim())),
  );
const totalSec = (v) =>
  String(v)
    .split(",")
    .reduce((a, s) => a + toSec(s.trim()), 0);

const dataDir = mkdtempSync(join(tmpdir(), "lts-motion-data-"));
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
      // capabilities not up yet: retry next tick
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

  // ---- seed the FEEL scene (same proven drill pattern as the pin
  // capture): one DONE unit (check pops), one IN-PROGRESS unit at an
  // honest fraction (ring fill eases), and the engine's current unit
  // (halo pulses) — all inside the opened pin band. ----
  const orthById = new Map();
  {
    const orthDir = join(REPO, "languages/ru-RU/orthography");
    for (const f of readdirSync(orthDir).filter((x) => x.endsWith(".jsonl"))) {
      for (const line of readFileSync(join(orthDir, f), "utf8").split("\n")) {
        if (!line.trim()) continue;
        try {
          const e = JSON.parse(line);
          if (e?.id) orthById.set(e.id, { symbol: e.symbol, reading: e.reading });
        } catch {
          // skip malformed lines
        }
      }
    }
  }
  const packsRoot = join(dataDir, "packs", PACK_ID);
  const version = readdirSync(packsRoot)[0];
  const unitsDirOf = join(packsRoot, version, "curriculum", "units");
  const unitRefs = new Map();
  for (const f of readdirSync(unitsDirOf).filter((x) => x.endsWith(".yaml"))) {
    const text = readFileSync(join(unitsDirOf, f), "utf8");
    const idm = /^id: "([^"]+)"/m.exec(text);
    const actStart = text.indexOf("activities:");
    const actEnd = text.indexOf("generation_contract:");
    if (idm && actStart >= 0 && actEnd > actStart) {
      const act = text.slice(actStart, actEnd);
      const refs = [...act.matchAll(/content_refs:\s*\[([\s\S]*?)\]/g)].flatMap((m) =>
        [...m[1].matchAll(/"(ru\.[a-z0-9._-]+)"/g)].map((x) => x[1]),
      );
      unitRefs.set(idm[1], refs);
    }
  }
  const drill = async (ref) => {
    for (let attempt = 0; attempt < 4; attempt++) {
      const task = await api("practice_task", {
        profileId,
        contentId: ref,
        modality: "orthography-recognition",
        revealReading: false,
      });
      if (task.status !== 200) continue;
      const t = task.value?.task ?? task.value ?? {};
      if (!Array.isArray(t.choices)) continue;
      const meta = orthById.get(ref);
      const idx = [meta.reading, meta.symbol]
        .map((want) => t.choices.findIndex((c) => c === want))
        .find((i) => i >= 0);
      if (idx < 0) continue;
      const g = await api("practice_submit", {
        profileId,
        contentId: ref,
        modality: "orthography-recognition",
        choiceIndex: idx,
        answer: null,
        revealReading: false,
        sessionId: null,
        stageId: null,
      });
      if (g.status === 200 && g.value?.correct) return true;
    }
    return false;
  };
  const targets = ((await api("unit_path", { profileId })).value ?? [])
    .filter((n) => !n.locked && !n.done)
    .map((n) => n.unit_id)
    .filter((u) => {
      const refs = unitRefs.get(u) ?? [];
      return refs.length >= 2 && refs.every((r) => orthById.has(r));
    })
    .slice(0, 2);
  if (targets.length < 2) throw new Error(`seeding needs two drillable units, got ${targets}`);
  const fully = unitRefs.get(targets[0]);
  const partial = unitRefs.get(targets[1]).slice(0, -1);
  const drilledFully = [];
  for (const r of fully) if (await drill(r)) drilledFully.push(r);
  const drilledPartial = [];
  for (const r of partial) if (await drill(r)) drilledPartial.push(r);
  result.seed = { unitFully: targets[0], unitPartial: targets[1] };
  check(
    "the scene seeded: one DONE unit and one honest IN PROGRESS unit",
    drilledFully.length > 0 && drilledPartial.length > 0,
    { drilledFully: drilledFully.length, drilledPartial: drilledPartial.length },
  );

  // ---- browser: the real app on a phone viewport. ----
  const profileDir = mkdtempSync(join(tmpdir(), "lts-motion-chrome-"));
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
  function send(method, params = {}, sessionId) {
    const id = nextId++;
    ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    return new Promise((res, rej) =>
      pending.set(id, (msg) =>
        msg.error ? rej(new Error(`${method}: ${msg.error.message}`)) : res(msg.result),
      ),
    );
  }
  const { targetId } = await send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
  await send("Page.enable", {}, sessionId);
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
  async function shot(name, viewportOnly = true) {
    const s = await send(
      "Page.captureScreenshot",
      { format: "png", captureBeyondViewport: !viewportOnly },
      sessionId,
    );
    writeFileSync(join(OUT, `${name}.png`), Buffer.from(s.data, "base64"));
  }
  async function touch(type, x, y) {
    await send(
      "Input.dispatchTouchEvent",
      {
        type,
        touchPoints: type === "touchEnd" ? [] : [{ x, y, radiusX: 12, radiusY: 12, force: 1 }],
      },
      sessionId,
    );
  }

  await send(
    "Emulation.setDeviceMetricsOverride",
    { width: VW, height: VH, deviceScaleFactor: 1, mobile: true },
    sessionId,
  );
  await send("Page.navigate", { url: `${BASE}/?v=motion` }, sessionId);
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
  let healthyStreak = 0;
  for (let i = 0; i < 40 && healthyStreak < 3; i++) {
    await sleep(300);
    healthyStreak = (await homeHealthy()) ? healthyStreak + 1 : 0;
  }
  if (healthyStreak < 3)
    throw new Error("navigation error: home never settled into a pack-loaded state");

  // Wait past the load cascade so the idle measurements below describe
  // the settled track (animation NAMES persist in computed styles after
  // a keyframe run finishes — fill-mode none falls back to base, but the
  // shorthand stays visible; the pulse is infinite anyway).
  await sleep(900);

  // ---- 1+2+3+4: computed motion styles on the settled path. ----
  const motion = await evaluate(`(() => {
    const arc = document.querySelector('.path-node--in-progress .path-node-arc')
      ?? document.querySelector('.path-node-arc');
    const arcCs = arc ? getComputedStyle(arc) : null;
    const currentRing = document.querySelector('[data-state=\"current\"] .path-node-ring');
    const halo = currentRing ? getComputedStyle(currentRing, '::after') : null;
    const ring = currentRing ?? document.querySelector('.path-node-ring');
    const ringCs = ring ? getComputedStyle(ring) : null;
    const doneMarker = document.querySelector('.path-node--done .path-node-marker');
    const markerCs = doneMarker ? getComputedStyle(doneMarker) : null;
    const nodes = [...document.querySelectorAll('.path-node')].slice(0, 5);
    const nodeAnim = nodes.map((li) => {
      const cs = getComputedStyle(li);
      return {
        name: cs.animationName,
        delay: cs.animationDelay,
        duration: cs.animationDuration,
      };
    });
    const toggle = document.querySelector('.path-section-toggle');
    const toggleCs = toggle ? getComputedStyle(toggle) : null;
    return {
      arcTransition: arcCs?.transitionProperty ?? null,
      arcDuration: arcCs?.transitionDuration ?? null,
      currentPresent: Boolean(currentRing),
      haloName: halo?.animationName ?? null,
      haloDuration: halo?.animationDuration ?? null,
      haloIterations: halo?.animationIterationCount ?? null,
      ringTransition: ringCs?.transitionProperty ?? null,
      markerName: markerCs?.animationName ?? null,
      markerDuration: markerCs?.animationDuration ?? null,
      nodeAnim,
      toggleTransition: toggleCs?.transitionProperty ?? null,
    };
  })()`);
  result.motion = motion;

  check(
    "RING FILL: the arc eases to a new proven fraction (stroke-dasharray transition, ~300ms)",
    /stroke-dasharray/.test(motion.arcTransition ?? "") &&
      firstSec(motion.arcDuration ?? "0") >= 0.15,
    { arcTransition: motion.arcTransition, arcDuration: motion.arcDuration },
  );
  check("a current node exists in the opened band (pulse host present)", motion.currentPresent, {
    currentPresent: motion.currentPresent,
  });
  check(
    "CURRENT-NODE PULSE: the current ring wears a breathing halo that iterates forever",
    motion.haloName &&
      motion.haloName !== "none" &&
      firstSec(motion.haloDuration ?? "0") >= 1 &&
      motion.haloIterations === "infinite",
    {
      haloName: motion.haloName,
      haloDuration: motion.haloDuration,
      haloIterations: motion.haloIterations,
    },
  );
  check(
    "NODE TAP: the ring has a transform transition so the press springs (not snaps)",
    /transform/.test(motion.ringTransition ?? ""),
    { ringTransition: motion.ringTransition },
  );
  check(
    "SECTION EXPAND: nodes carry a keyframe entrance (rise + fade)",
    (motion.nodeAnim ?? []).length > 0 &&
      motion.nodeAnim.every((n) => n.name && n.name !== "none") &&
      motion.nodeAnim.every((n) => firstSec(n.duration) >= 0.1),
    motion.nodeAnim,
  );
  const delays = (motion.nodeAnim ?? []).map((n) => toSec(n.delay));
  check(
    "SECTION EXPAND: the entrance cascades (delay grows along the track)",
    delays.length >= 3 && delays[0] === 0 && delays[2] > 0,
    { delays },
  );
  check(
    "the done check pops in (marker keyframe present)",
    motion.markerName &&
      motion.markerName !== "none" &&
      firstSec(motion.markerDuration ?? "0") >= 0.1,
    { markerName: motion.markerName, markerDuration: motion.markerDuration },
  );
  check(
    "section toggles have a press transition (tap affordance, 120ms family)",
    /transform/.test(motion.toggleTransition ?? ""),
    { toggleTransition: motion.toggleTransition },
  );

  // ---- node press, measured with a real CDP TOUCH (the phone viewport
  // emulates touch; a learner's tap is a touch, and touch drives both the
  // pointer-event press class and the browser's own :active). The ring
  // must scale under 1 while the finger is down, then spring back. The
  // target must be a node INSIDE the viewport — off-viewport touch points
  // hit nothing — tagged so press and release measure the SAME node. ----
  const target = await evaluate(`(() => {
    const inVp = (r) => r.top >= 8 && r.bottom <= window.innerHeight - 8 && r.width > 0;
    const vis = [...document.querySelectorAll('.path-node')].filter((li) => inVp(li.getBoundingClientRect()));
    const li = vis.find((n) => n.getAttribute('data-state') === 'in-progress')
      ?? vis.find((n) => n.getAttribute('data-state') === 'current')
      ?? vis[0];
    if (!li) return null;
    li.dataset.pressProbe = '1';
    const r = li.getBoundingClientRect();
    return {
      x: Math.round(r.left + r.width / 2),
      y: Math.round(r.top + r.height / 2),
      state: li.getAttribute('data-state'),
      visibleNodes: vis.length,
    };
  })()`);
  if (!target) throw new Error("navigation error: no in-viewport path node to press");
  await touch("touchStart", target.x, target.y);
  await sleep(240); // past the press-in transition
  const pressed = await evaluate(`(() => {
    const li = document.querySelector('[data-press-probe="1"]');
    const ring = li?.querySelector('.path-node-ring');
    const m = ring ? getComputedStyle(ring).transform : null;
    const scale = m && m !== "none" ? parseFloat(m.slice(m.indexOf("(") + 1)) : 1;
    const pressedCls = li?.classList.contains("path-node--pressed") ?? false;
    return { pressedClass: pressedCls, transform: m, scale };
  })()`);
  await touch("touchEnd", target.x, target.y);
  await sleep(300);
  const released = await evaluate(`(() => {
    const ring = document.querySelector('[data-press-probe="1"] .path-node-ring');
    const m = ring ? getComputedStyle(ring).transform : null;
    const scale = m && m !== "none" ? parseFloat(m.slice(m.indexOf("(") + 1)) : 1;
    return { transform: m, scale };
  })()`);
  result.press = { target, pressed, released };
  check(
    "NODE TAP: pressing the row scales the ring down (press state lands under a real CDP touch tap)",
    pressed.pressedClass && pressed.scale > 0 && pressed.scale < 1,
    {
      pressedClass: pressed.pressedClass,
      pressedScale: pressed.scale,
      transform: pressed.transform,
      targetState: target.state,
    },
  );
  check(
    "NODE TAP: release springs the ring back to full size",
    Math.abs(released.scale - 1) < 0.02,
    { releasedScale: released.scale, transform: released.transform },
  );

  await shot("path-motion-idle", true);

  // ---- section expand/collapse behavior + the SEEEN collapse exit. ----
  const collapsePlan = await evaluate(`(() => {
    const toggles = [...document.querySelectorAll('.path-section-toggle')];
    const closed = toggles.find((b) => b.getAttribute('aria-expanded') !== 'true');
    if (!closed) return null;
    const band = closed.closest('.path-section')?.getAttribute('data-band') ?? null;
    closed.click();
    return band;
  })()`);
  if (collapsePlan === null) throw new Error("navigation error: no collapsed section to expand");
  await sleep(60);
  // Keep the frame honest: bring the just-opened band's header to the top
  // so the mid-cascade shot sees the nodes entering (an off-viewport
  // expansion would photograph a blank void, which proves nothing).
  await evaluate(`(() => {
    const sec = [...document.querySelectorAll('.path-section')].find(
      (s) => (s.getAttribute('data-band') ?? '') === ${JSON.stringify(collapsePlan)},
    );
    sec?.querySelector('.path-section-toggle')?.scrollIntoView({ block: "start" });
    return true;
  })()`);
  await shot("path-motion-mid-expand", true);
  const opening = await evaluate(`(() => {
    const sec = [...document.querySelectorAll('.path-section')].find(
      (s) => (s.getAttribute('data-band') ?? '') === ${JSON.stringify(collapsePlan)},
    );
    const list = sec?.querySelector('.path-nodes');
    if (!list) return null;
    const first = list.querySelector('.path-node');
    const cs = first ? getComputedStyle(first) : null;
    return {
      mounted: true,
      firstNodeAnim: cs?.animationName ?? null,
      firstNodeOpacityMid: cs?.opacity ?? null,
    };
  })()`);
  check(
    "SECTION EXPAND: the opened band's nodes are mid-entrance right after the tap",
    opening?.mounted === true && opening.firstNodeAnim !== "none",
    opening,
  );
  await sleep(700);
  await evaluate(`(() => {
    const sec = [...document.querySelectorAll('.path-section')].find(
      (s) => (s.getAttribute('data-band') ?? '') === ${JSON.stringify(collapsePlan)},
    );
    sec?.querySelector('.path-section-toggle')?.click();
    return true;
  })()`);
  await sleep(60);
  const closing = await evaluate(`(() => {
    const sec = [...document.querySelectorAll('.path-section')].find(
      (s) => (s.getAttribute('data-band') ?? '') === ${JSON.stringify(collapsePlan)},
    );
    const list = sec?.querySelector('.path-nodes');
    if (!list) return { mounted: false };
    const cs = getComputedStyle(list);
    return {
      mounted: true,
      cls: list.className,
      anim: cs.animationName,
      dur: cs.animationDuration,
    };
  })()`);
  check(
    "SECTION COLLAPSE: the list animates out (exit keyframe plays while still mounted)",
    closing.mounted === true && closing.anim && closing.anim !== "none",
    closing,
  );
  await sleep(700);
  const closedAway = await evaluate(`(() => {
    const sec = [...document.querySelectorAll('.path-section')].find(
      (s) => (s.getAttribute('data-band') ?? '') === ${JSON.stringify(collapsePlan)},
    );
    return { stillMounted: Boolean(sec?.querySelector('.path-nodes')) };
  })()`);
  check(
    "SECTION COLLAPSE: the list unmounts after the exit plays (no stuck ghosts)",
    closedAway.stillMounted === false,
    closedAway,
  );

  // ---- 5: reduced motion, by real media emulation. (setEmulatedMedia is
  // the CDP spelling this Chrome builds answer; newer builds also expose
  // setEmulationMediaFeatures.) ----
  await send(
    "Emulation.setEmulatedMedia",
    { features: [{ name: "prefers-reduced-motion", value: "reduce" }] },
    sessionId,
  );
  await send("Page.navigate", { url: `${BASE}/?v=motion-rm` }, sessionId);
  let resumedRm = false;
  for (let i = 0; i < 60 && !resumedRm; i++) {
    await sleep(250);
    resumedRm = await evaluate(`(() => {
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
  if (!resumedRm) throw new Error("navigation error: reduced-motion pass never reached home");
  let rmStreak = 0;
  for (let i = 0; i < 40 && rmStreak < 2; i++) {
    await sleep(300);
    rmStreak = (await homeHealthy()) ? rmStreak + 1 : 0;
  }
  if (rmStreak < 2) throw new Error("navigation error: reduced-motion home never settled");
  await sleep(400);
  const rm = await evaluate(`(() => {
    const arc = document.querySelector('.path-node--in-progress .path-node-arc')
      ?? document.querySelector('.path-node-arc');
    const arcCs = arc ? getComputedStyle(arc) : null;
    const currentRing = document.querySelector('[data-state=\"current\"] .path-node-ring');
    const halo = currentRing ? getComputedStyle(currentRing, '::after') : null;
    const node = document.querySelector('.path-node');
    const nodeCs = node ? getComputedStyle(node) : null;
    return {
      arcDur: arcCs?.transitionDuration ?? null,
      haloDur: halo?.animationDuration ?? null,
      haloIter: halo?.animationIterationCount ?? null,
      nodeDur: nodeCs?.animationDuration ?? null,
    };
  })()`);
  result.reducedMotion = rm;
  check(
    "REDUCED MOTION: arc fill transition collapses to ~0",
    rm.arcDur !== null && firstSec(rm.arcDur) <= 0.011,
    { arcDur: rm.arcDur },
  );
  check(
    "REDUCED MOTION: the pulse stops breathing (one iteration, ~0 duration)",
    rm.haloDur !== null && toSec(rm.haloDur) <= 0.011 && rm.haloIter === "1",
    { haloDur: rm.haloDur, haloIter: rm.haloIter },
  );
  check(
    "REDUCED MOTION: the entrance cascade collapses to ~0 (content simply appears)",
    rm.nodeDur !== null && firstSec(rm.nodeDur) <= 0.011,
    { nodeDur: rm.nodeDur },
  );
  await shot("path-motion-reduced", true);
  await shot("path-motion-full", false);
} catch (err) {
  result.error = String(err?.message ?? err);
  result.failures++;
  console.error(`capture failed: ${result.error}`);
} finally {
  result.serveLogTail = (serve?.getLog?.() ?? "").slice(-2000);
  writeFileSync(join(OUT, "result.json"), JSON.stringify(result, null, 2) + "\n");
  chrome?.kill();
  serve?.kill();
  if (chromeDir) {
    await sleep(500);
    rmSync(chromeDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 });
  }
}
process.exit(result.failures > 0 ? 1 : 0);
