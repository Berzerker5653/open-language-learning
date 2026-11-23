#!/usr/bin/env node
/**
 * PATH-FEEL-SCROLL-001 acceptance capture (dev-only evidence tooling).
 *
 * Same plumbing as scripts/path-pin-consistency-capture.mjs (real engine:
 * lts-serve over an isolated data dir, headless Chrome at a 390x844 phone
 * viewport, raw CDP — no new deps). The card's viewport claims, measured
 * HERE (Duolingo parity: the journey OPENS centered on the pin, and a
 * floating "jump to my spot" arrow appears only once the pin is scrolled
 * away, pointing back toward it):
 *   1. seed a realistic scene: FOUR fully-drilled units (DONE) and the
 *      FIFTH started 3/4 (IN PROGRESS) — the pin sits deep enough that
 *      the document can scroll it out of view in BOTH directions;
 *   2. on load (this script never scrolls first — the app's own
 *      auto-scroll is under test): the pin node is CENTERED in the
 *      viewport (|center - VH/2| within tolerance), and the jump control
 *      exists in the DOM but is HIDDEN (computed visibility/opacity);
 *   3. scroll the pin out of view ABOVE (a node far below it rides to the
 *      top): the control flips VISIBLE (opacity ~1, inside the viewport),
 *      with its arrow pointing UP (data-dir="above" — the pin is above
 *      the view), proven as computed style, not just markup;
 *   4. TAP the control: the pin returns to center and the control hides
 *      again — the journey and my-spot are one answer;
 *   5. scroll to the very top: the pin leaves view BELOW the viewport;
 *      the control is visible with data-dir="below" (arrow points down).
 * Screenshots: path-scroll-load / path-scroll-away / path-scroll-jumped /
 * path-scroll-below (region shots — the arrow is a viewport-fixed
 * control). Every measured value lands in result.json; navigation errors
 * ride INTO the result (MOBILE-UX-001 rule); any failed check exits
 * non-zero, so this file IS the gate.
 *
 *   usage: SERVE_BIN=<path> SERVE_DIST=<dist dir> \
 *          node scripts/path-scroll-capture.mjs
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
const OUT = resolve(process.env.OUT_DIR ?? join(REPO, "state/evidence/PATH-FEEL-SCROLL-001"));
mkdirSync(OUT, { recursive: true });
const PACK_ID = "org.openlanguage.ru-ru.reference";
const PROFILE = "Scroll Centering";
const VW = 390;
const VH = 844;
const PORT = 17640 + (process.pid % 60);
const BASE = `http://127.0.0.1:${PORT}`;
// The card's "opens centered on the pin" tolerance: the pin's center must
// land within this many px of the viewport's vertical center.
const CENTER_TOL = 80;

const result = { viewport: `${VW}x${VH}`, checks: [], failures: 0, error: null };
const check = (name, pass, measured) => {
  result.checks.push({ name, pass, measured });
  if (!pass) result.failures++;
  console.log(`${pass ? "PASS" : "FAIL"} ${name} — ${JSON.stringify(measured)}`);
};

const dataDir = mkdtempSync(join(tmpdir(), "lts-pathscroll-data-"));
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

  // ---- targeted seeding (the PATH-WHATSNEXT-001 / PATH-PIN-CONSISTENCY
  // proven pattern, widened): drill the FIRST FOUR unlocked units fully
  // (every ref proven → DONE) and the FIFTH all-but-its-last ref (3/4 →
  // IN PROGRESS). The pin lands on the fifth node, so ~5 rows of context
  // sit ABOVE it — the document can then scroll the pin out of view
  // below as well as above, exercising both arrow directions. ----
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
    .slice(0, 5);
  if (targets.length < 5) throw new Error(`seeding needs five drillable units, got ${targets}`);
  const drilledFully = [];
  for (const u of targets.slice(0, 4)) {
    for (const r of unitRefs.get(u)) if (await drill(r)) drilledFully.push(r);
  }
  const partial = unitRefs.get(targets[4]).slice(0, -1); // last ref stays unproven
  const drilledPartial = [];
  for (const r of partial) if (await drill(r)) drilledPartial.push(r);
  result.seed = {
    doneUnits: targets.slice(0, 4),
    drilledFully: drilledFully.length,
    pinUnit: targets[4],
    drilledPartial,
    partialTotal: unitRefs.get(targets[4]).length,
  };
  check(
    "the scene seeded: four DONE units and one honest IN PROGRESS unit",
    drilledFully.length > 0 && drilledPartial.length > 0,
    { drilledFully: drilledFully.length, drilledPartial: drilledPartial.length },
  );

  // ---- browser: the real app on a phone viewport. NO scrolling until
  // the load-centering check — the app's own load behavior is measured
  // first. ----
  const profileDir = mkdtempSync(join(tmpdir(), "lts-pathscroll-chrome-"));
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

  await send(
    "Emulation.setDeviceMetricsOverride",
    { width: VW, height: VH, deviceScaleFactor: 1, mobile: true },
    sessionId,
  );
  await send("Page.navigate", { url: `${BASE}/?v=pathscroll` }, sessionId);
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
  check(
    "home reached a stable pack-loaded state before measurement (no load flicker)",
    healthyStreak >= 3,
    { healthyStreak },
  );
  if (healthyStreak < 3)
    throw new Error("navigation error: home never settled into a pack-loaded state");

  // Shared page probes (no scrolling — geometry + control state only).
  const pinGeom = () =>
    evaluate(`(() => {
      const pin = document.querySelector('.path-node-pin');
      const node = pin?.closest('[data-unit]') ?? null;
      const r = node?.getBoundingClientRect() ?? null;
      return r ? { top: Math.round(r.top), bottom: Math.round(r.bottom), center: Math.round((r.top + r.bottom) / 2) } : null;
    })()`);
  const controlState = () =>
    evaluate(`(() => {
      const b = document.querySelector('[data-testid="path-jump-to-pin"]');
      if (!b) return { present: false };
      const cs = getComputedStyle(b);
      const r = b.getBoundingClientRect();
      return {
        present: true,
        dataVisible: b.getAttribute('data-visible'),
        dir: b.getAttribute('data-dir'),
        opacity: cs.opacity,
        visibility: cs.visibility,
        inViewport: r.bottom > 0 && r.top < ${VH} && r.right > 0 && r.left < ${VW},
        rect: { top: Math.round(r.top), left: Math.round(r.left), w: Math.round(r.width) },
      };
    })()`);
  const hidden = (c) =>
    c.present &&
    (c.dataVisible === "false" || c.visibility === "hidden" || parseFloat(c.opacity) < 0.5);
  const shown = (c) =>
    c.present &&
    c.dataVisible === "true" &&
    c.visibility === "visible" &&
    parseFloat(c.opacity) >= 0.9 &&
    c.inViewport;
  async function waitForControl(predicate, budgetMs) {
    const deadline = Date.now() + budgetMs;
    let last = await controlState();
    while (!predicate(last) && Date.now() < deadline) {
      await sleep(120);
      last = await controlState();
    }
    return last;
  }
  async function waitForPinCentered(budgetMs) {
    const deadline = Date.now() + budgetMs;
    let g = await pinGeom();
    while (g && Math.abs(g.center - VH / 2) > CENTER_TOL && Date.now() < deadline) {
      await sleep(150);
      g = await pinGeom();
    }
    return g;
  }

  // ---- CHECK GROUP A: the load moment (the app scrolled itself). ----
  await sleep(400);
  const loadPin = await pinGeom();
  const loadCtl = await controlState();
  check(
    "the journey OPENS centered on the pin on load (|center - VH/2| <= tol)",
    loadPin !== null && Math.abs(loadPin.center - VH / 2) <= CENTER_TOL,
    { pinCenter: loadPin?.center ?? null, viewportCenter: VH / 2, tol: CENTER_TOL },
  );
  check(
    "the jump control ships in the DOM but is HIDDEN while my-spot is on screen",
    loadCtl.present && hidden(loadCtl),
    loadCtl,
  );
  await shot("path-scroll-load");

  // Shared scroll helper: scroll the pin's nearest scrollable ancestor (the
  // app may scroll the document or a container); 'end' pushes the pin out
  // ABOVE the viewport, 0 pushes it BELOW.
  const scrollPin = (where) =>
    evaluate(`(() => {
      const pin = document.querySelector('.path-node-pin');
      let el = pin ? pin.parentElement : null;
      while (el && el.scrollHeight <= el.clientHeight + 4) el = el.parentElement;
      const top = ${where === "end" ? "Math.max(el ? el.scrollHeight : 0, document.documentElement.scrollHeight)" : "0"};
      if (el && el !== document.documentElement && el !== document.body) {
        el.scrollTo({ top, behavior: 'instant' });
        return 'container';
      }
      window.scrollTo({ top, behavior: 'instant' });
      return 'window';
    })()`);

  // ---- CHECK GROUP B: scroll away (pin exits ABOVE) -> control shows,
  // arrow points up toward my-spot. A full-page scroll to the bottom is
  // used, not a per-node one: the pin's band can end just below the pin,
  // but the collapsed band headers below it give ample scroll range. The
  // pin-off-screen fact is itself an honest measured check below. ----
  result.scrollMode = await scrollPin("end");
  const awayCtl = await waitForControl(shown, 1500);
  const awayPin = await pinGeom();
  check(
    "scrolling my-spot away ABOVE makes the floating control VISIBLE (computed opacity ~1, in the viewport)",
    shown(awayCtl),
    awayCtl,
  );
  check(
    "the pin is truly off-screen above before the arrow-claim is measured",
    awayPin !== null && awayPin.bottom < 0,
    awayPin,
  );
  check(
    "the arrow points TOWARD my-spot: data-dir='above' while the pin is above the view",
    awayCtl.dir === "above",
    { dir: awayCtl.dir },
  );
  await shot("path-scroll-away");

  // ---- CHECK GROUP C: tap the control -> back centered, control hides. ----
  const tapped = await evaluate(`(() => {
    const b = document.querySelector('[data-testid="path-jump-to-pin"]');
    if (!b) return false;
    b.click();
    return true;
  })()`);
  if (!tapped) throw new Error("navigation error: jump control vanished before the tap");
  const backPin = await waitForPinCentered(3000);
  const backCtl = await waitForControl(hidden, 3000);
  check(
    "tapping the control returns the pin CENTERED in the viewport",
    backPin !== null && Math.abs(backPin.center - VH / 2) <= CENTER_TOL,
    { pinCenter: backPin?.center ?? null, viewportCenter: VH / 2, tol: CENTER_TOL },
  );
  check("with my-spot back on screen, the control is HIDDEN again", hidden(backCtl), backCtl);
  await shot("path-scroll-jumped");

  // ---- CHECK GROUP D: scroll to the very top -> pin exits BELOW, arrow
  // flips to point down toward my-spot. ----
  await scrollPin("start");
  const belowPin = await pinGeom();
  const belowCtl = await waitForControl((c) => shown(c) && c.dir === "below", 1500);
  check(
    "scrolling to the very top puts my-spot BELOW the viewport",
    belowPin !== null && belowPin.top > VH,
    belowPin,
  );
  check(
    "the control is visible with the arrow flipped DOWN (data-dir='below')",
    shown(belowCtl) && belowCtl.dir === "below",
    belowCtl,
  );
  await shot("path-scroll-below");

  if (!(await homeHealthy())) {
    let streak2 = 0;
    for (let i = 0; i < 40 && streak2 < 3; i++) {
      await sleep(300);
      streak2 = (await homeHealthy()) ? streak2 + 1 : 0;
    }
    if (streak2 < 3) throw new Error("navigation error: home dropped pack state before the end");
  }
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
