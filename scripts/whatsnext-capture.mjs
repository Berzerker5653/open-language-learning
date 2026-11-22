#!/usr/bin/env node
/**
 * PATH-WHATSNEXT-001 acceptance capture (dev-only evidence tooling).
 *
 * Same plumbing as scripts/path-view-capture.mjs (real engine: lts-serve
 * over an isolated data dir, headless Chrome at a 390x844 phone viewport,
 * raw CDP — no new deps). Sequence per the card:
 *   1. seed REAL practice traffic (correct answers) so units become
 *      evidence-backed done and the scheduler writes real rows;
 *   2. API: the current offer on a learner with nothing due answers
 *      "introduction" — exactly one answer;
 *   3. stop serve, back-date ONE scheduler row (canonical RFC 3339, the
 *      shape the storage boundary enforces), restart — the offer must FLIP
 *      to review-first naming the unit the path renders;
 *   4. browser: the Today strip names that offer with a review-due chip;
 *   5. walk a real session in the UI to its end (answer activities via the
 *      on-screen choices) — the after-session card names the SAME offer and
 *      the path has scrolled/pinned to the offered node (measured rect).
 * Every measured value lands in result.json; any failed assertion exits
 * non-zero, so this file IS the gate. Navigation errors ride INTO the
 * result (MOBILE-UX-001 rule).
 *
 *   usage: SERVE_BIN=<path> SERVE_DIST=<dist dir> \
 *          node scripts/whatsnext-capture.mjs
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
const OUT = join(REPO, "state/evidence/PATH-WHATSNEXT-001");
mkdirSync(OUT, { recursive: true });
const PACK_ID = "org.openlanguage.ru-ru.reference";
const PROFILE = "Offer Walker";
const VW = 390;
const VH = 844;
const PORT = 17820 + (process.pid % 60);
const BASE = `http://127.0.0.1:${PORT}`;

const result = { viewport: `${VW}x${VH}`, checks: [], failures: 0, error: null };
const check = (name, pass, measured) => {
  result.checks.push({ name, pass, measured });
  if (!pass) result.failures++;
  console.log(`${pass ? "PASS" : "FAIL"} ${name} — ${JSON.stringify(measured)}`);
};

const dataDir = mkdtempSync(join(tmpdir(), "lts-whatsnext-data-"));
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

  // ---- targeted seeding (exact pattern proven green by PATH-VIEW-001's
  // capture at a69cde0). Plan-round traffic alone starves a unit's last
  // ref and wrote ZERO scheduler rows in the dead run (result.json
  // 2026-11-22 10:11). The targeted pass submits correct practice for
  // exactly the refs the installed pack declares per unit, using the
  // pack's own symbol/reading strings — the same strings the server
  // grades by exact match — so units earn evidence-backed done AND the
  // practice traffic writes real scheduler rows for those refs. ----
  let doneUnits = [];
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
  const unitsDirOf = (() => {
    const packsRoot = join(dataDir, "packs", PACK_ID);
    const version = readdirSync(packsRoot)[0];
    return join(packsRoot, version, "curriculum", "units");
  })();
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
  const seededRefs = new Set();
  const targetUnits = ((await api("unit_path", { profileId })).value ?? [])
    .filter((n) => !n.locked && !n.done)
    .map((n) => n.unit_id)
    .filter((u) => {
      const refs = unitRefs.get(u) ?? [];
      return refs.length > 0 && refs.every((r) => orthById.has(r));
    })
    .slice(0, 2);
  for (const unitId of targetUnits) {
    for (const ref of unitRefs.get(unitId)) {
      if (seededRefs.has(ref)) continue;
      // Four honest repetitions: one lands the Introduced floor (done), the
      // rest lift the item out of the plan's introduction pool the way real
      // returned practice does, so the offer stays on fresh material.
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
        if (g.status === 200 && g.value?.correct) seededRefs.add(ref);
      }
    }
  }
  {
    const up = await api("unit_path", { profileId });
    const nodes = up.status === 200 && Array.isArray(up.value) ? up.value : [];
    doneUnits = nodes.filter((n) => n.done);
  }
  check("seeding produced at least one evidence-backed done unit", doneUnits.length >= 1, {
    done: doneUnits.map((n) => n.unit_id),
  });

  // ---- offer BEFORE any due row: exactly one answer, introduction side. ----
  const before = await api("current_offer", { profileId });
  check(
    "nothing due: the single offer answers with the next new-material unit",
    before.status === 200 && before.value?.kind === "introduction" && before.value?.unit_id,
    before.value,
  );
  result.offerBefore = before.value;

  // ---- back-date ONE scheduler row; review_due = done && due>0
  // (unit_path_at), so the row's content must belong to a DONE unit.
  // Iterate: back-date the earliest candidate, restart serve, call
  // current_offer; if kind is not "review", restore that row and try the
  // next (bounded ~6 attempts). Every attempt is logged (flipAttempts). ----
  serve.kill();
  await sleep(400);
  const rows = (() => {
    const db = new DatabaseSync(join(dataDir, "profiles.db"));
    const r = db
      .prepare("SELECT item_id, due_at FROM scheduler_state WHERE profile_id = ? ORDER BY due_at")
      .all(profileId);
    db.close();
    return r;
  })();
  if (rows.length === 0)
    throw new Error("navigation error: seeding wrote no scheduler rows to back-date");
  result.flipAttempts = [];
  let flipped = null;
  for (let attempt = 0; attempt < Math.min(6, rows.length) && !flipped; attempt++) {
    const row = rows[attempt];
    {
      const db = new DatabaseSync(join(dataDir, "profiles.db"));
      db.prepare(
        "UPDATE scheduler_state SET due_at = '2020-01-01T00:00:00Z' WHERE profile_id = ? AND item_id = ?",
      ).run(profileId, row.item_id);
      db.close();
    }
    serve = await startServe();
    const probe = await api("current_offer", { profileId });
    result.flipAttempts.push({ itemId: row.item_id, kind: probe.value?.kind ?? null });
    if (probe.status === 200 && probe.value?.kind === "review" && probe.value?.unit_id) {
      flipped = probe;
      result.backdatedItem = row.item_id;
      break;
    }
    // Restore this row with serve down and re-serve for the next candidate.
    serve.kill();
    await sleep(400);
    {
      const db = new DatabaseSync(join(dataDir, "profiles.db"));
      db.prepare("UPDATE scheduler_state SET due_at = ? WHERE profile_id = ? AND item_id = ?").run(
        row.due_at,
        profileId,
        row.item_id,
      );
      db.close();
    }
    serve = await startServe();
  }
  const after = flipped;
  check(
    "one due scheduler row FLIPS the single answer to review-first",
    Boolean(after) &&
      after.status === 200 &&
      after.value?.kind === "review" &&
      after.value?.unit_id,
    after ? after.value : { flipAttempts: result.flipAttempts },
  );
  if (!after) throw new Error("navigation error: no back-date attempt flipped the offer to review");
  const pathNodesAfter = (await api("unit_path", { profileId })).value ?? [];
  check(
    "the review offer names a unit the path renders (scroll target exists)",
    Boolean(after.value?.unit_id) && pathNodesAfter.some((n) => n.unit_id === after.value.unit_id),
    { offerUnit: after.value?.unit_id },
  );
  check("the offer carries the review-due count for the chip", (after.value?.total_due ?? 0) >= 1, {
    total_due: after.value?.total_due,
  });
  result.offerAfter = after.value;

  // ---- browser: the real app on a phone viewport. ----
  const profileDir = mkdtempSync(join(tmpdir(), "lts-whatsnext-chrome-"));
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
  const clickButton = (label) =>
    evaluate(`(() => {
      const b = [...document.querySelectorAll('button')].find((x) =>
        (x.textContent ?? '').includes(${JSON.stringify(label)}));
      if (!b) return false;
      b.click();
      return true;
    })()`);

  await send(
    "Emulation.setDeviceMetricsOverride",
    { width: VW, height: VH, deviceScaleFactor: 1, mobile: true },
    sessionId,
  );
  await send("Page.navigate", { url: `${BASE}/?v=whatsnext` }, sessionId);
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

  // ---- wait for home to reach a STABLE pack-loaded state before any
  // measurement or screenshot. Observed (probe5, 2026-11-22): the pack
  // absence banner flickers for ~1s after entering a profile — the offer
  // line and path can paint before the pack record's claims resolve, and
  // a screenshot taken in that window shows a bogus empty-pack home. ----
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

  // ---- the Today strip carries the offer + the earned review-due chip. ----
  // The chip is a child of the strip <p>; the offer LABEL is the strip text
  // with the chip subtree removed (the after-session card renders exactly
  // that label, per home.tsx offerLabel).
  const strip = await evaluate(`(() => {
    const el = document.querySelector('[data-testid="next-offer"]');
    const chip = document.querySelector('[data-testid="review-due-chip"]');
    let label = '';
    if (el) {
      const clone = el.cloneNode(true);
      clone.querySelectorAll('[data-testid="review-due-chip"]').forEach((n) => n.remove());
      label = (clone.textContent ?? '').trim();
    }
    return {
      text: label,
      chip: (chip?.textContent ?? '').trim(),
      chipRect: chip ? Math.round(chip.getBoundingClientRect().height) : 0,
    };
  })()`);
  check(
    "Today top strip names the review-first offer",
    strip.text.startsWith("Next: review"),
    strip.text,
  );
  check(
    "review-due chip names the engine's due count (informational badge, not a tap target)",
    strip.chip === `Review due (${after.value.total_due})`,
    strip,
  );
  // The strip sits mid-page on Today; a viewport-only shot must scroll it
  // into view or the evidence shows a page without the measured element.
  await evaluate(`(() => {
    const el = document.querySelector('[data-testid="next-offer"]');
    if (el) el.scrollIntoView({ block: "center" });
    return Boolean(el);
  })()`);
  await sleep(400);
  await shot("whatsnext-strip-review-first", true);
  // Re-validate AFTER the shot: a screenshot of a page that flipped state
  // mid-capture is not evidence. Re-settle and retake if needed.
  if (!(await homeHealthy())) {
    let streak2 = 0;
    for (let i = 0; i < 40 && streak2 < 3; i++) {
      await sleep(300);
      streak2 = (await homeHealthy()) ? streak2 + 1 : 0;
    }
    if (streak2 < 3)
      throw new Error("navigation error: home dropped pack state after the strip shot");
    await shot("whatsnext-strip-review-first", true);
  }

  // ---- walk a REAL session in the UI to its end. The engine never ships
  // the correct answer to the client and practice.tsx locks an activity
  // after one graded pick ("Not quite — the highlighted choice is the
  // right one."), so on-screen blind picks cannot guarantee Correct.
  // The harness therefore answers EVERY activity with the first on-screen
  // choice and measures answered-graded activities + reaching the summary;
  // correct-answer grading itself is covered by the vitest journeys.
  if (!(await clickButton("Start today's plan")))
    throw new Error("navigation error: no Start today's plan button on Today");
  await sleep(800);
  let answered = 0;
  let correctCount = 0;
  let finished = false;
  const trace = [];
  for (let step = 0; step < 20 && !finished; step++) {
    // Lesson encounter cards gate their drill behind one click.
    if (await clickButton("Start practicing")) await sleep(400);
    // Wait for the drill's choices to render.
    let hasChoices = false;
    for (let w = 0; w < 12 && !hasChoices; w++) {
      hasChoices = await evaluate(
        `Boolean(document.querySelector('[aria-label="Choices"] button'))`,
      );
      if (!hasChoices) await sleep(400);
    }
    let verdict = null;
    if (hasChoices) {
      const picked = await evaluate(`(() => {
        const b = document.querySelector('[aria-label="Choices"] button');
        if (!b) return false;
        b.click();
        return true;
      })()`);
      if (picked) {
        for (let p = 0; p < 8 && !verdict; p++) {
          await sleep(400);
          verdict = await evaluate(`(() => {
            const live = document.querySelector('[aria-label="Practice"] [aria-live="polite"]');
            const t = (live?.textContent ?? '');
            return t.includes('Correct') ? 'correct' : t.includes('Not quite') ? 'wrong' : null;
          })()`);
        }
      }
    }
    if (verdict) {
      answered++;
      if (verdict === "correct") correctCount++;
    }
    trace.push({ step, hasChoices, verdict });
    // End-of-activity controls: continue, or the session's own finish.
    if (await clickButton("Finish session")) {
      finished = true;
      break;
    }
    if (await clickButton("Continue to next activity")) {
      await sleep(1700); // the auto-advance bridge lives ~1.2s
      continue;
    }
    await sleep(600);
    if (await evaluate(`Boolean(document.querySelector('[aria-label="Session summary"]'))`)) {
      finished = true;
    }
  }
  result.sessionTrace = trace;
  result.sessionAnswered = answered;
  result.sessionCorrect = correctCount;
  check(
    "the session walked to its summary with every activity answered on-screen",
    finished && answered >= 1,
    {
      answered,
      correct: correctCount,
      steps: trace.length,
    },
  );
  if (!finished) {
    // Honest fallback: stopping mid-session still ends it with a truthful
    // outcome card; the offer contract below is measured the same way.
    if (!(await clickButton("Stop session")) && !(await clickButton("Stop")))
      throw new Error("navigation error: session never ended and no stop control existed");
    await sleep(900);
  }
  await sleep(400);

  // ---- the after-session card names the SAME single offer. ----
  const outcome = await evaluate(`(() => {
    const summary = document.querySelector('[aria-label="Session summary"]');
    const card = summary?.querySelector('[data-testid="next-offer-card"]');
    return {
      summary: Boolean(summary),
      text: (card?.textContent ?? '').trim(),
    };
  })()`);
  check(
    "after-session card names the offer (Next: review <unit> · about N minutes)",
    outcome.summary &&
      outcome.text.startsWith("Next: review") &&
      outcome.text.includes(after.value.title) &&
      /about \d+ minutes/.test(outcome.text),
    outcome.text,
  );
  check(
    "one answer, never two: the card and the strip show the SAME offer",
    outcome.text === strip.text,
    { card: outcome.text, strip: strip.text },
  );

  // ---- the path pinned to the offered node (measured, not asserted). ----
  const pin = await evaluate(`(() => {
    const el = document.querySelector('[data-unit=${JSON.stringify(after.value.unit_id)}]');
    if (!el) return { found: false };
    const r = el.getBoundingClientRect();
    return {
      found: true,
      top: Math.round(r.top),
      bottom: Math.round(r.bottom),
      inViewport: r.top >= -8 && r.bottom <= ${VH} + 8,
      overflow: document.documentElement.scrollWidth > ${VW} + 2,
    };
  })()`);
  check(
    "the path scrolled to the offered node (it sits in the phone viewport)",
    pin.found && pin.inViewport && !pin.overflow,
    pin,
  );
  await shot("whatsnext-after-session-card", true);
  await shot("whatsnext-full-page", false);
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
    // Chrome still flushes its profile on exit; retry so rmSync never races ENOTEMPTY.
    await sleep(500);
    rmSync(chromeDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 });
  }
}
process.exit(result.failures > 0 ? 1 : 0);
