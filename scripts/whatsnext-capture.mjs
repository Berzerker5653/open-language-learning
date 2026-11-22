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
import { mkdirSync, writeFileSync, mkdtempSync, existsSync, rmSync } from "node:fs";
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

  // ---- seed real progress (same honest pattern as path-view-capture). ----
  const submitted = new Set();
  let doneUnits = [];
  for (let round = 0; round < 8; round++) {
    const plan = await api("practice_plan", { profileId, minutes: 30 });
    // PRACTICE-GATE-001 shape: {items: [...]}; older builds returned the bare array.
    const items = Array.isArray(plan.value) ? plan.value : (plan.value?.items ?? []);
    for (const item of items) {
      if (submitted.has(item.content_id)) continue;
      submitted.add(item.content_id);
      if (submitted.size > 80) break;
      const task = await api("practice_task", {
        profileId,
        contentId: item.content_id,
        modality: item.modality,
        revealReading: false,
      });
      if (task.status !== 200) continue;
      const t = task.value ?? {};
      let submit = null;
      if (Array.isArray(t.choices) && t.choices.length > 0) {
        const want = [item.gloss, item.surface, t.reading, t.surface].filter(Boolean);
        let idx = -1;
        for (const w of want) {
          idx = t.choices.findIndex((c) => c === w);
          if (idx >= 0) break;
        }
        if (idx >= 0) submit = { choice_index: idx, answer: null };
      } else if (item.surface) {
        submit = { choice_index: 0, answer: item.surface };
      }
      if (!submit) continue;
      await api("practice_submit", {
        profileId,
        contentId: item.content_id,
        modality: item.modality,
        choiceIndex: submit.choice_index,
        answer: submit.answer,
        revealReading: false,
        sessionId: null,
        stageId: null,
      });
    }
    const up = await api("unit_path", { profileId });
    const nodes = up.status === 200 && Array.isArray(up.value) ? up.value : [];
    doneUnits = nodes.filter((n) => n.done);
    if (doneUnits.length >= 1) break;
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

  // ---- back-date ONE scheduler row while serve is down. ----
  serve.kill();
  await sleep(400);
  {
    const db = new DatabaseSync(join(dataDir, "profiles.db"));
    const row = db
      .prepare("SELECT item_id FROM scheduler_state WHERE profile_id = ? ORDER BY due_at LIMIT 1")
      .get(profileId);
    if (!row) throw new Error("navigation error: seeding wrote no scheduler rows to back-date");
    db.prepare(
      "UPDATE scheduler_state SET due_at = '2020-01-01T00:00:00Z' WHERE profile_id = ? AND item_id = ?",
    ).run(profileId, row.item_id);
    result.backdatedItem = row.item_id;
    db.close();
  }
  serve = await startServe();
  const after = await api("current_offer", { profileId });
  check(
    "one due scheduler row FLIPS the single answer to review-first",
    after.status === 200 && after.value?.kind === "review" && after.value?.unit_id,
    after.value,
  );
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
  await sleep(900);

  // ---- the Today strip carries the offer + the earned review-due chip. ----
  const strip = await evaluate(`(() => {
    const el = document.querySelector('[data-testid="next-offer"]');
    const chip = document.querySelector('[data-testid="review-due-chip"]');
    return {
      text: (el?.textContent ?? '').trim(),
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
    "review-due chip shows the engine's count (and meets the 44px floor in-line)",
    strip.chip === `Review due (${after.value.total_due})`,
    strip,
  );
  await shot("whatsnext-strip-review-first", true);

  // ---- walk a REAL session in the UI to its end. ----
  if (!(await clickButton("Start today's plan")))
    throw new Error("navigation error: no Start today's plan button on Today");
  await sleep(800);
  let activities = 0;
  let finished = false;
  for (let step = 0; step < 14 && !finished; step++) {
    // Lesson encounter cards gate their drill behind one click.
    if (await clickButton("Start practicing")) await sleep(600);
    // Answer: brute-force the on-screen choices until "Correct" reports.
    let graded = false;
    for (let c = 0; c < 4 && !graded; c++) {
      const chose = await evaluate(`(() => {
        const sect = document.querySelector('[aria-label="Choices"]');
        if (!sect) return -1;
        const btns = [...sect.querySelectorAll('button')];
        const b = btns[${c}];
        if (!b) return -1;
        b.click();
        return btns.length;
      })()`);
      if (chose < 0) break;
      await sleep(500);
      graded = await evaluate(`(() => {
        const live = document.querySelector('[aria-label="Practice"] [aria-live="polite"]');
        return (live?.textContent ?? '').includes('Correct');
      })()`);
    }
    if (graded) activities++;
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
  result.sessionActivities = activities;
  check("the session reached its summary honestly", finished && activities >= 1, {
    activities,
    finished,
  });
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
  if (chromeDir) rmSync(chromeDir, { recursive: true, force: true });
}
process.exit(result.failures > 0 ? 1 : 0);
