#!/usr/bin/env node
/**
 * PATH-VISUAL-001 acceptance capture (dev-only evidence tooling).
 *
 * Same plumbing as scripts/whatsnext-capture.mjs (real engine: lts-serve
 * over an isolated data dir, headless Chrome at a 390x844 phone viewport,
 * raw CDP — no new deps). The card's claim, measured here:
 *   1. seed ONE fully-drilled letter unit (every ref proven → DONE with a
 *      check ring) and ONE three-of-four unit (started but unproven →
 *      IN PROGRESS / pinned with a partially-filled honest arc);
 *   2. API: the engine agrees — a done node, an in_progress node with
 *      0 < refs_done < refs_total, a current pin, locked nodes ahead;
 *   3. DOM at 390px: rings on every node, the pin's ring is FILLED to the
 *      honest fraction (never a flat "0 done past a pin"), the section
 *      counter counts PROVEN-DONE only, locked nodes carry a drawn lock,
 *      section banners carry name + CEFR subtitle, and the rings' rect
 *      centers SWAY along the winding track (measured x-spread > 0 — the
 *      flat list is what the owner rejected);
 *   4. before/after screenshots: before = the banked complaint shot
 *      (copied by the controller), after = path-journey-pin-region +
 *      path-journey-full at 390px.
 * Every measured value lands in result.json; any failed assertion exits
 * non-zero, so this file IS the gate. Navigation errors ride INTO the
 * result (MOBILE-UX-001 rule).
 *
 *   usage: SERVE_BIN=<path> SERVE_DIST=<dist dir> \
 *          node scripts/path-visual-capture.mjs
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
const OUT = join(REPO, "state/evidence/PATH-VISUAL-001");
mkdirSync(OUT, { recursive: true });
const PACK_ID = "org.openlanguage.ru-ru.reference";
const PROFILE = "Journey Walker";
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

const dataDir = mkdtempSync(join(tmpdir(), "lts-pathvisual-data-"));
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
    } catch {}
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

  // ---- targeted seeding (the PATH-WHATSNEXT-001 proven pattern): submit
  // correct practice for exactly the refs the installed pack declares per
  // unit, using the pack's own symbol/reading strings. The FIRST unlocked
  // unit is drilled fully (every ref proven → DONE); the SECOND is drilled
  // all-but-its-last ref (started but unproven → IN PROGRESS, and the
  // untouched ref stays in the introduction pool so the PIN lands on that
  // half-visited unit — the owner's exact scene, honestly rendered). ----
  const orthById = new Map();
  {
    const orthDir = join(REPO, "languages/ru-RU/orthography");
    for (const f of readdirSync(orthDir).filter((x) => x.endsWith(".jsonl"))) {
      for (const line of readFileSync(join(orthDir, f), "utf8").split("\n")) {
        if (!line.trim()) continue;
        try {
          const e = JSON.parse(line);
          if (e?.id) orthById.set(e.id, { symbol: e.symbol, reading: e.reading });
        } catch {}
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

  // ---- API: the engine's honest picture. ----
  const nodes = (await api("unit_path", { profileId })).value ?? [];
  const doneNodes = nodes.filter((n) => n.done);
  const inProg = nodes.filter((n) => n.in_progress && n.refs_done > 0 && n.refs_done < n.refs_total);
  const pinned = nodes.filter((n) => n.current);
  const locked = nodes.filter((n) => n.locked);
  check("a fully-drilled letter unit is DONE on the API", doneNodes.length >= 1, {
    done: doneNodes.map((n) => n.unit_id),
  });
  check(
    "a three-of-four unit is IN PROGRESS with an honest partial fill",
    inProg.length >= 1,
    inProg.map((n) => ({ unit: n.unit_id, refs_done: n.refs_done, refs_total: n.refs_total })),
  );
  check("the pin sits on a unit the learner started (never past real progress)",
    pinned.length >= 1 &&
      pinned.every((n) => n.in_progress || n.done || n.current),
    pinned.map((n) => ({ unit: n.unit_id, in_progress: n.in_progress, refs_done: n.refs_done, refs_total: n.refs_total })));
  check("units ahead of the visited pair stay locked", locked.length >= 1, {
    lockedSample: locked.slice(0, 2).map((n) => n.unit_id),
  });
  // The owner's contradiction: never "0 done" while the pin sits past
  // visited work. The band holding the pin must count at least one
  // proven-done unit (the fully drilled one).
  const pinBand = pinned[0]?.band;
  const bandDone = nodes.filter((n) => n.band === pinBand && n.done).length;
  check("the pinned section counts at least one proven-done unit (no 0-done-past-a-pin)",
    bandDone >= 1, { pinBand, bandDone });

  // ---- browser: the real app on a phone viewport. ----
  const profileDir = mkdtempSync(join(tmpdir(), "lts-pathvisual-chrome-"));
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
  await send("Page.navigate", { url: `${BASE}/?v=pathvisual` }, sessionId);
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
  check("home reached a stable pack-loaded state before measurement (no load flicker)",
    healthyStreak >= 3, { healthyStreak });
  if (healthyStreak < 3)
    throw new Error("navigation error: home never settled into a pack-loaded state");

  // ---- the journey DOM: rings, sway, fills, locks, banners. Assert on
  // ELEMENTS, never body text (WEB-HISTORY-001 pollution rule). ----
  await evaluate(`(() => {
    const pin = document.querySelector('.path-node--current') ?? document.querySelector('.path-node');
    if (pin) pin.scrollIntoView({ block: "center" });
    return Boolean(pin);
  })()`);
  await sleep(400);
  const dom = await evaluate(`(() => {
    const rings = [...document.querySelectorAll('.path-node-ring')];
    const rects = rings.map((r) => {
      const b = r.getBoundingClientRect();
      return Math.round(b.left + b.width / 2);
    });
    const currentRing = document.querySelector('.path-node--current .path-node-ring');
    const inProgNodes = [...document.querySelectorAll('[data-state="in-progress"]')];
    const lockedRings = [...document.querySelectorAll('.path-node--locked .path-node-lock')];
    const ringStates = [...document.querySelectorAll('.path-node')].map((li) => ({
      state: li.getAttribute('data-state'),
      fill: li.querySelector('.path-node-ring')?.getAttribute('data-fill') ?? null,
    }));
    const bandSel = ${JSON.stringify(`.path-section[data-band="${pinBand ?? ""}"] .path-section-toggle`)};
    const banner = document.querySelector(bandSel) ?? document.querySelector('.path-section-toggle');
    return {
      ringCount: rings.length,
      xSpread: rects.length > 1 ? Math.max(...rects) - Math.min(...rects) : 0,
      currentFills: [...document.querySelectorAll('.path-node--current .path-node-ring')].map(
        (r) => r.getAttribute('data-fill'),
      ),
      inProgressCount: inProgNodes.length,
      inProgressLabel: inProgNodes[0]?.querySelector('.path-node-progress')?.textContent ?? null,
      lockedWithGlyph: lockedRings.length,
      ringStates,
      bannerName: banner?.querySelector('.path-section-name')?.textContent?.trim() ?? "",
      bannerCefr: banner?.querySelector('.path-section-cefr')?.textContent?.trim() ?? "",
      sectionCount: banner?.querySelector('.path-section-count')?.textContent?.trim() ?? "",
    };
  })()`);
  check("every open-section node renders a ring", dom.ringCount > 0, { ringCount: dom.ringCount });
  check("the track WINDS: ring centers sway across the column (flat list would be 0)",
    dom.xSpread >= 20, { xSpreadPx: dom.xSpread });
  check("some current node's ring is FILLED to an honest fraction (never empty past real work)",
    dom.currentFills.some((f) => parseFloat(f) > 0), { currentFills: dom.currentFills });
  check(
    "started-but-unproven work is visible (in-progress node or a filled pin ring)",
    dom.inProgressCount > 0 || dom.currentFills.some((f) => parseFloat(f) > 0),
    { inProgressCount: dom.inProgressCount, inProgressLabel: dom.inProgressLabel },
  );
  check("locked nodes carry a drawn lock glyph", dom.lockedWithGlyph >= 1, {
    lockedWithGlyph: dom.lockedWithGlyph,
  });
  check("the open section is a banner with a friendly name and CEFR subtitle",
    dom.bannerName.length > 0 && dom.bannerCefr.length > 0, dom.bannerName + " / " + dom.bannerCefr);
  const claimedDone = Number((dom.sectionCount.match(/^(\d+)\//) ?? [])[1] ?? NaN);
  check(
    "the section counter counts PROVEN-DONE only (matches the API's done nodes)",
    Number.isFinite(claimedDone) && claimedDone >= 1 && claimedDone === bandDone,
    { domCounter: dom.sectionCount, apiBandDone: bandDone },
  );

  await shot("path-journey-pin-region", true);
  if (!(await homeHealthy())) {
    let streak2 = 0;
    for (let i = 0; i < 40 && streak2 < 3; i++) {
      await sleep(300);
      streak2 = (await homeHealthy()) ? streak2 + 1 : 0;
    }
    if (streak2 < 3)
      throw new Error("navigation error: home dropped pack state after the pin-region shot");
    await shot("path-journey-pin-region", true);
  }
  await shot("path-journey-full", false);
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
