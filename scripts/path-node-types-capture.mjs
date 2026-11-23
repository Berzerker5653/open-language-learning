#!/usr/bin/env node
/**
 * PATH-NODE-TYPES-001 acceptance capture (dev-only evidence tooling).
 *
 * Same plumbing as scripts/path-scroll-capture.mjs (real engine: lts-serve
 * over an isolated data dir, headless Chrome at a 390x844 phone viewport,
 * raw CDP, node:sqlite back-dating from path-view-capture — no new deps).
 * What the card claims, measured HERE:
 *   1. wire: EVERY unit_path node carries a kind in
 *      {letters, listening, speaking, words}; the Cyrillic ramp units
 *      arrive as letters, the vocabulary ramp units as words;
 *   2. seed: one Cyrillic unit drilled fully (DONE) plus one of its
 *      scheduler rows back-dated through sqlite while serve is down
 *      (review-due) — the grammar then runs on REAL states;
 *   3. DOM: every rendered node exposes data-kind; each ring center
 *      holds exactly ONE drawn mark (an aria-hidden SVG pictogram, or
 *      the ✓ completion check); NO •/○/◉/⟳ text dots survive anywhere
 *      on the track;
 *   4. the glyph never stands alone: every node body carries the
 *      matching screen-reader kind word, the drilled node also names
 *      "Completed", and the review-due node wears the refresh
 *      pictogram BESIDE its "Review due" caption.
 * Screenshots: path-node-types-home + path-node-types-review (the
 * review-due node scrolled into view). Navigation errors ride INTO
 * result.json (MOBILE-UX-001 rule); any failed check exits non-zero, so
 * this file IS the gate.
 *
 *   usage: SERVE_BIN=<path> SERVE_DIST=<dist dir> \
 *          node scripts/path-node-types-capture.mjs
 */
import { spawn } from "node:child_process";
import {
  mkdirSync,
  writeFileSync,
  readFileSync,
  mkdtempSync,
  existsSync,
  readdirSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

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
const OUT = resolve(process.env.OUT_DIR ?? join(REPO, "state/evidence/PATH-NODE-TYPES-001"));
mkdirSync(OUT, { recursive: true });
const PACK_ID = "org.openlanguage.ru-ru.reference";
const PROFILE = "Glyph Grammar";
const VW = 390;
const VH = 844;
const PORT = 17700 + (process.pid % 60);
const BASE = `http://127.0.0.1:${PORT}`;
const KINDS = new Set(["letters", "listening", "speaking", "words"]);
const KIND_WORDS = { letters: "Letters", listening: "Listening", speaking: "Speaking", words: "Words" };

const result = { viewport: `${VW}x${VH}`, checks: [], failures: 0, error: null };
const check = (name, pass, measured) => {
  result.checks.push({ name, pass, measured });
  if (!pass) result.failures++;
  console.log(`${pass ? "PASS" : "FAIL"} ${name} — ${JSON.stringify(measured)}`);
};

const dataDir = mkdtempSync(join(tmpdir(), "lts-nodekinds-data-"));
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

  // ---- CHECK GROUP A: the WIRE (engine-derived kinds, before any UI). ----
  const nodes = ((await api("unit_path", { profileId })).value ?? []).filter(
    (n) => n && typeof n === "object",
  );
  const kindCounts = {};
  for (const n of nodes) kindCounts[n.kind] = (kindCounts[n.kind] ?? 0) + 1;
  check(
    "every unit_path node carries a kind in {letters, listening, speaking, words}",
    nodes.length > 0 && nodes.every((n) => KINDS.has(n.kind)),
    { nodes: nodes.length, kinds: kindCounts },
  );
  const cyr = nodes.filter((n) => n.unit_id.includes("cyrillic"));
  check(
    "the printed-Cyrillic ramp units arrive as letters nodes",
    cyr.length > 0 && cyr.every((n) => n.kind === "letters"),
    { cyrillic: cyr.length, sample: cyr.slice(0, 3).map((n) => `${n.unit_id}:${n.kind}`) },
  );
  const greet = nodes.find((n) => n.unit_id === "ru.unit.on-ramp.greetings-01");
  check(
    "the reading/writing vocabulary ramp unit arrives as a words node",
    greet?.kind === "words",
    { kind: greet?.kind ?? null },
  );

  // ---- seed: drill ONE Cyrillic unit fully (every ref proven → DONE). ----
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
  const seedUnit = cyr.find((n) => !n.locked && (unitRefs.get(n.unit_id) ?? []).length >= 2);
  if (!seedUnit) throw new Error("seeding needs one drillable Cyrillic unit");
  const seededRefs = new Set(unitRefs.get(seedUnit.unit_id));
  let drilledCount = 0;
  for (const r of seededRefs) if (await drill(r)) drilledCount++;
  result.seed = { unit: seedUnit.unit_id, refs: seededRefs.size, drilled: drilledCount };
  check(
    "the scene seeded: one letters unit drilled fully toward DONE (real ✓ + review states follow)",
    drilledCount >= 2,
    { drilled: drilledCount, refs: seededRefs.size },
  );

  // review-due: back-date ONE scheduler row of the drilled unit while
  // serve is down (canonical RFC 3339, the shape the storage boundary enforces).
  serve.kill();
  await sleep(400);
  {
    const db = new DatabaseSync(join(dataDir, "profiles.db"));
    const rows = db
      .prepare("SELECT item_id FROM scheduler_state WHERE profile_id = ? ORDER BY due_at")
      .all(profileId);
    const row = rows.find((r) => seededRefs.has(String(r.item_id).split("#")[0])) ?? rows[0];
    if (row) {
      db.prepare(
        "UPDATE scheduler_state SET due_at = '2020-01-01T00:00:00Z' WHERE profile_id = ? AND item_id = ?",
      ).run(profileId, row.item_id);
      result.backdatedItem = row.item_id;
    }
    db.close();
  }
  serve = await startServe();
  const nodes2 = ((await api("unit_path", { profileId })).value ?? []).filter(
    (n) => n && typeof n === "object",
  );
  const seededNode = nodes2.find((n) => n.unit_id === seedUnit.unit_id);
  check(
    "the drilled letters unit is DONE and review-DUE on the wire (states for the DOM checks)",
    seededNode?.done === true && seededNode?.review_due === true && seededNode?.kind === "letters",
    { done: seededNode?.done, review_due: seededNode?.review_due, kind: seededNode?.kind },
  );

  // ---- browser: the real app on a phone viewport. ----
  const profileDir = mkdtempSync(join(tmpdir(), "lts-nodekinds-chrome-"));
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
  await send("Page.navigate", { url: `${BASE}/?v=nodekinds` }, sessionId);
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
  await sleep(400);

  // ---- CHECK GROUP B: the DOM grammar (computed over EVERY rendered node). ----
  const dom = await evaluate(`(() => {
    const KIND_WORDS = ${JSON.stringify(KIND_WORDS)};
    const nodes = [...document.querySelectorAll('.path-node')];
    const bad = { noKind: 0, wrongKindWord: 0, centerMarks: 0, dotSurvivors: 0 };
    for (const li of nodes) {
      const kind = li.dataset.kind ?? "";
      if (!KIND_WORDS[kind]) bad.noKind++;
      const srWords = [...li.querySelectorAll('.sr-only')].map((s) => s.textContent.trim());
      if (!srWords.includes(KIND_WORDS[kind] ?? "\\u0000")) bad.wrongKindWord++;
      const marker = li.querySelector('.path-node-marker');
      const svgs = marker ? [...marker.querySelectorAll('svg')] : [];
      const glyph = marker?.querySelector('svg[data-glyph]') ?? null;
      const text = (marker?.textContent ?? "").trim();
      const state = li.dataset.state;
      // exactly ONE drawn center mark: a pictogram svg, the lock, or the check
      const oneMark =
        (svgs.length === 1 && (glyph !== null || svgs[0].classList.contains('path-node-lock'))) ||
        (svgs.length === 0 && text === "✓");
      if (!oneMark) bad.centerMarks++;
      if (glyph && glyph.getAttribute("aria-hidden") !== "true") bad.centerMarks++;
      // state-layer cross-check: the kind pictogram shows on open nodes only
      if (state === "ready" || state === "current" || state === "in-progress") {
        if (!glyph || glyph.getAttribute("data-glyph") !== kind) bad.centerMarks++;
      }
    }
    // no •/○/◉/⟳ text dots survive on the track
    const markers = [...document.querySelectorAll('.path-node-marker')];
    bad.dotSurvivors = markers.filter((m) => /[\\u2022\\u25CB\\u25C9\\u27F3]/.test(m.textContent ?? "")).length;
    return { count: nodes.length, bad };
  })()`);
  check(
    "every rendered node exposes data-kind, one drawn center mark, and its screen-reader kind word",
    dom.count > 0 && dom.bad.noKind === 0 && dom.bad.centerMarks === 0 && dom.bad.wrongKindWord === 0,
    dom,
  );
  check(
    "no identical text-dot circles (•/○/◉/⟳) survive on the track",
    dom.bad.dotSurvivors === 0,
    { markers: dom.count, dotSurvivors: dom.bad.dotSurvivors },
  );

  // ---- the drilled letters node: check + Completed word + review state. ----
  const seeded = await evaluate(`(() => {
    const li = document.querySelector('[data-unit=${JSON.stringify(seedUnit.unit_id)}]');
    if (!li) return { present: false };
    const marker = li.querySelector('.path-node-marker');
    const body = li.querySelector('.path-node-body');
    const srWords = [...li.querySelectorAll('.sr-only')].map((s) => s.textContent.trim());
    const reviewGlyph = marker?.querySelector('svg[data-glyph="review"]') ?? null;
    return {
      present: true,
      state: li.dataset.state,
      kind: li.dataset.kind,
      reviewGlyph: reviewGlyph !== null,
      reviewCaption: (body?.textContent ?? "").includes("Review due"),
      completedWord: srWords.includes("Completed"),
      letterWord: srWords.includes("Letters"),
    };
  })()`);
  check(
    "the review-due letters node wears the refresh pictogram BESIDE its Review due caption",
    seeded.present && seeded.state === "review-due" && seeded.reviewGlyph && seeded.reviewCaption,
    seeded,
  );
  check(
    "the review-due node still names its kind (Letters) to the screen reader",
    seeded.present && seeded.letterWord,
    seeded,
  );

  await shot("path-node-types-home");
  // region shot of the review-due node (scrollIntoView first or the
  // measured element is absent from its own evidence png).
  await evaluate(`(() => {
    const li = document.querySelector('[data-unit=${JSON.stringify(seedUnit.unit_id)}]');
    li?.scrollIntoView({ block: "center" });
    return true;
  })()`);
  await sleep(500);
  await shot("path-node-types-review");

  // done-node proof (✓ + Completed): find ANY state=done node on screen.
  const doneNode = await evaluate(`(() => {
    const li = [...document.querySelectorAll('.path-node')].find((n) => n.dataset.state === "done");
    if (!li) return { present: false };
    const marker = li.querySelector('.path-node-marker');
    const srWords = [...li.querySelectorAll('.sr-only')].map((s) => s.textContent.trim());
    return { present: true, check: (marker?.textContent ?? "").trim() === "✓", completedWord: srWords.includes("Completed") };
  })()`);
  // The seeded node is review-due (the state layer's choice over done); a
  // plain done node only exists elsewhere on the ladder — collapse to the
  // done check ONLY if one is rendered; otherwise verify the check rule on
  // the review node's body instead (the ✓ yields to review per PATH-VISUAL
  // precedent, documented in the notes).
  check(
    doneNode.present
      ? "a plain done node wears the ✓ check and names Completed to the screen reader"
      : "the review-due node (done + due) wears the review layer; Completed word present",
    doneNode.present ? doneNode.check && doneNode.completedWord : seeded.completedWord,
    { doneNode, seededCompleted: seeded.completedWord },
  );
} catch (err) {
  result.error = String(err?.stack ?? err);
  console.error("CAPTURE ABORTED:", err);
} finally {
  try {
    serve?.kill();
  } catch {
    // already dead
  }
  try {
    chrome?.kill();
  } catch {
    // already dead
  }
  writeFileSync(join(OUT, "result.json"), JSON.stringify(result, null, 2) + "\n");
}
process.exit(result.failures > 0 || result.error ? 1 : 0);
