#!/usr/bin/env node
/**
 * PATH-PIN-CONSISTENCY-001 acceptance capture (dev-only evidence tooling).
 *
 * Same plumbing as scripts/path-visual-capture.mjs (real engine: lts-serve
 * over an isolated data dir, headless Chrome at a 390x844 phone viewport,
 * raw CDP — no new deps). The card's claims, measured HERE — notably this
 * script never scrolls the page itself: the app's own auto-scroll on load
 * is what gets measured.
 *   1. seed the owner's exact scene (complaint 10): ONE fully-drilled unit
 *      (DONE) and ONE three-of-four unit (IN PROGRESS 3/4);
 *   2. exactly ONE 'You are here' caption exists in the DOM, and it rides
 *      the unit the frontend pin rule picks — the first in-progress unit
 *      in ladder order, else the first not-done unit — NOT the plan's
 *      offered unit when those differ;
 *   3. the next-up affordance: when current_offer names a unit OTHER than
 *      the pinned one it renders as a header chip (.path-next-up) above
 *      the track; when it names the pinned unit itself the chip is absent
 *      (no duplicate affordance). Both branches are asserted honestly;
 *   4. the auto-scroll on load lands a little BEFORE the pin: the pin sits
 *      inside the viewport, not glued to the top edge, AND the proven-done
 *      unit above it is inside the viewport (context above stays visible);
 *   5. screenshots: after = path-pin-region (the viewport as the learner
 *      arrives) + path-pin-full (whole page). The BEFORE oracle is the
 *      owner's banked complaint shot (complaint-10-path-branch-order.jpg).
 * Every measured value lands in result.json; any failed assertion exits
 * non-zero, so this file IS the gate. Navigation errors ride INTO the
 * result (MOBILE-UX-001 rule).
 *
 *   usage: SERVE_BIN=<path> SERVE_DIST=<dist dir> \
 *          node scripts/path-pin-consistency-capture.mjs
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
const OUT = resolve(process.env.OUT_DIR ?? join(REPO, "state/evidence/PATH-PIN-CONSISTENCY-001"));
mkdirSync(OUT, { recursive: true });
const PACK_ID = "org.openlanguage.ru-ru.reference";
const PROFILE = "Pin Consistency";
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

const dataDir = mkdtempSync(join(tmpdir(), "lts-pathpin-data-"));
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

// The frontend pin rule (PATH-PIN-CONSISTENCY-001) recomputed from the
// engine's own unit_path output: group nodes into sections by band with
// the canonical ladder order (on-ramp, a1..c2, then custom bands in
// first-occurrence order), flatten, keep unlocked & not-done units, and
// take the first in-progress one — else the first not-done one.
const BAND_LADDER = ["on-ramp", "a1", "a2", "b1", "b2", "c1", "c2"];
function expectedPinUnit(nodes) {
  const byKey = new Map();
  for (const n of nodes) {
    const raw = n.band && String(n.band).trim() ? n.band : "other";
    const key = raw.trim().toLowerCase();
    if (!byKey.has(key)) byKey.set(key, { rank: BAND_LADDER.indexOf(key), nodes: [] });
    const s = byKey.get(key);
    if (s.rank < 0) s.rank = BAND_LADDER.size + byKey.size;
    s.nodes.push(n);
  }
  const flat = [...byKey.values()].sort((a, b) => a.rank - b.rank).flatMap((s) => s.nodes);
  const open = flat.filter((n) => !n.locked && !n.done);
  return open.find((n) => n.in_progress)?.unit_id ?? open[0]?.unit_id ?? null;
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

  // ---- targeted seeding (the PATH-WHATSNEXT-001 proven pattern): drill
  // the FIRST unlocked unit fully (every ref proven → DONE) and the
  // SECOND all-but-its-last ref (started but unproven → IN PROGRESS).
  // This is the owner's scene: real progress exists, and the pin must
  // land on that progress, not drift past it. ----
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
  const partial = unitRefs.get(targets[1]).slice(0, -1); // last ref stays unproven
  const drilledFully = [];
  for (const r of fully) if (await drill(r)) drilledFully.push(r);
  const drilledPartial = [];
  for (const r of partial) if (await drill(r)) drilledPartial.push(r);
  result.seed = {
    unitFully: targets[0],
    drilledFully,
    unitPartial: targets[1],
    drilledPartial,
    partialTotal: unitRefs.get(targets[1]).length,
  };

  // ---- API: the engine's picture + the rule the frontend must honor. ----
  const nodes = (await api("unit_path", { profileId })).value ?? [];
  const offer = (await api("current_offer", { profileId })).value ?? null;
  const pinnedApi = nodes.filter((n) => n.current).map((n) => n.unit_id);
  const wantPin = expectedPinUnit(nodes);
  result.api = {
    done: nodes.filter((n) => n.done).map((n) => n.unit_id),
    inProgress: nodes
      .filter((n) => n.in_progress && n.refs_done > 0 && n.refs_done < n.refs_total)
      .map((n) => ({ unit: n.unit_id, refs_done: n.refs_done, refs_total: n.refs_total })),
    engineCurrent: pinnedApi,
    expectedPinUnit: wantPin,
    offer,
  };
  check(
    "the scene seeded: one DONE unit and one honest IN PROGRESS unit",
    drilledFully.length > 0 && drilledPartial.length > 0,
    {
      drilledFully: drilledFully.length,
      drilledPartial: drilledPartial.length,
    },
  );
  check("the pin rule has an answer for this scene", wantPin !== null, { wantPin });

  // ---- browser: the real app on a phone viewport. NO manual scrolling
  // anywhere — the app's own load behavior is the thing under test. ----
  const profileDir = mkdtempSync(join(tmpdir(), "lts-pathpin-chrome-"));
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
  await send("Page.navigate", { url: `${BASE}/?v=pathpin` }, sessionId);
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

  // ---- the pin + chip + scroll measurement, exactly as the learner
  // arrives (the app auto-scrolled itself; this script touched nothing). ----
  await sleep(400);
  const dom = await evaluate(`(() => {
    const unitOf = (el) => el.closest('[data-unit]')?.getAttribute('data-unit') ?? '?';
    const inVp = (b) => b.bottom > 0 && b.top < ${VH};
    const pins = [...document.querySelectorAll('.path-node-pin')];
    const pinNode = pins[0]?.closest('[data-unit]') ?? null;
    const pinRect = pinNode?.getBoundingClientRect() ?? null;
    const nodes = [...document.querySelectorAll('.path-node')];
    const pinIndex = nodes.findIndex((li) => li === pinNode);
    const above = pinIndex > 0 ? nodes.slice(0, pinIndex) : [];
    const visibleAbove = above.filter((li) => inVp(li.getBoundingClientRect())).length;
    const aboveDone = above.filter((li) => li.getAttribute('data-state') === 'done').length;
    const chip = document.querySelector('[data-testid="path-next-up"]');
    const ol = document.querySelector('.path-nodes');
    const currentNodes = [...document.querySelectorAll('[data-state="current"]')].map(unitOf);
    return {
      pinCount: pins.length,
      pinUnit: pins[0] ? unitOf(pins[0]) : null,
      pinTop: pinRect ? Math.round(pinRect.top) : null,
      pinInView: pinRect ? inVp(pinRect) : false,
      nodesAbovePin: above.length,
      visibleAbove,
      aboveDone,
      chipPresent: Boolean(chip),
      chipText: chip?.textContent?.trim() ?? null,
      chipAboveTrack:
        chip && ol
          ? chip.getBoundingClientRect().bottom <= ol.getBoundingClientRect().top + 1
          : null,
      currentNodes,
      trackPinOnCurrentOnly: pins.every((p) => p.closest('[data-state="current"]') !== null),
    };
  })()`);
  result.dom = dom;

  check("exactly ONE 'You are here' pin exists on the track", dom.pinCount === 1, {
    pinCount: dom.pinCount,
    pinUnit: dom.pinUnit,
    engineCurrent: result.api.engineCurrent,
  });
  check(
    "the pin marks WHERE THE LEARNER IS — the rule's unit, not the plan's suggestion",
    dom.pinUnit === wantPin,
    { domPin: dom.pinUnit, ruleExpected: wantPin, engineCurrent: result.api.engineCurrent },
  );
  const chipExpected = offer ? offer.unit_id !== wantPin : false;
  check(
    "the next-up affordance matches the rule: chip iff the offer names ANOTHER unit than the pin",
    dom.chipPresent === chipExpected,
    {
      chipPresent: dom.chipPresent,
      chipExpected,
      offerUnit: offer?.unit_id ?? null,
      pinUnit: wantPin,
      chipText: dom.chipText,
    },
  );
  if (dom.chipPresent) {
    check(
      "the next-up chip lives in the header strip, ABOVE the track",
      dom.chipAboveTrack === true,
      {
        chipAboveTrack: dom.chipAboveTrack,
      },
    );
    check("the chip never doubles as a track pin", dom.pinUnit !== offer?.unit_id, {
      pinUnit: dom.pinUnit,
      offerUnit: offer?.unit_id,
    });
  }
  check(
    "the load scroll lands a little BEFORE the pin: pin in view, not glued to the top",
    dom.pinInView && dom.pinTop !== null && dom.pinTop >= 40,
    { pinTop: dom.pinTop, pinInView: dom.pinInView },
  );
  check(
    "context above the pin stays visible after the load scroll",
    dom.nodesAbovePin > 0 && dom.visibleAbove >= 1 && dom.aboveDone >= 1,
    { nodesAbovePin: dom.nodesAbovePin, visibleAbove: dom.visibleAbove, aboveDone: dom.aboveDone },
  );

  await shot("path-pin-region", true);
  if (!(await homeHealthy())) {
    let streak2 = 0;
    for (let i = 0; i < 40 && streak2 < 3; i++) {
      await sleep(300);
      streak2 = (await homeHealthy()) ? streak2 + 1 : 0;
    }
    if (streak2 < 3)
      throw new Error("navigation error: home dropped pack state after the pin-region shot");
    await shot("path-pin-region", true);
  }
  await shot("path-pin-full", false);
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
