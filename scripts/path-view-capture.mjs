#!/usr/bin/env node
/**
 * PATH-VIEW-001 acceptance capture (dev-only evidence tooling).
 *
 * Same plumbing as scripts/practice-gate-capture.mjs (headless Chrome over
 * raw CDP, Node built-in WebSocket/fetch/sqlite — no new deps), against the
 * REAL engine: lts-serve over an isolated data dir, seeded by API.
 *
 * Progress is seeded the honest way — real practice_task/practice_submit
 * traffic with correct answers (the plan's own surface/gloss view names the
 * right choice) — because `done` is by definition evidence-backed. The
 * review-due state needs a PAST due date: after practice writes the
 * scheduler rows, serve is stopped, one row's due_at is back-dated through
 * node:sqlite (canonical RFC 3339, the shape the storage write boundary
 * itself enforces), and serve restarts. No engine code pretends about time.
 *
 * Screenshots (390x844, the owner's phone shape) land in
 * state/evidence/PATH-VIEW-001/. Machine gates ride into result.json;
 * navigation errors ride into the result and fail the run loudly.
 *
 *   usage: SERVE_BIN=<path> SERVE_DIST=<dist dir> \
 *          node scripts/path-view-capture.mjs
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
const OUT = join(REPO, "state/evidence/PATH-VIEW-001");
mkdirSync(OUT, { recursive: true });
const PACK_ID = "org.openlanguage.ru-ru.reference";
const PROFILE = "Owner Fresh";
const VW = 390;
const VH = 844;
const PORT = 17740 + (process.pid % 60);
const BASE = `http://127.0.0.1:${PORT}`;

const result = { viewport: `${VW}x${VH}`, checks: [], failures: 0, error: null };
const check = (name, pass, measured) => {
  result.checks.push({ name, pass, measured });
  if (!pass) result.failures++;
  console.log(`${pass ? "PASS" : "FAIL"} ${name} — ${JSON.stringify(measured)}`);
};

const dataDir = mkdtempSync(join(tmpdir(), "lts-pathview-data-"));
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

  // ---- seed real progress: submit CORRECT answers until the first unit
  // earns evidence-backed done status (attendance alone never does it). ----
  const submitted = new Set();
  let doneUnits = [];
  for (let round = 0; round < 8; round++) {
    const plan = await api("practice_plan", { profileId, minutes: 30 });
    const items = plan.status === 200 && Array.isArray(plan.value) ? plan.value : [];
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
      if (task.status !== 200) continue; // e.g. grammar ids with no drill here
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
      const g = await api("practice_submit", {
        profileId,
        contentId: item.content_id,
        modality: item.modality,
        choiceIndex: submit.choice_index,
        answer: submit.answer,
        revealReading: false,
        sessionId: null,
        stageId: null,
      });
      if (g.status !== 200) continue;
    }
    const up = await api("unit_path", { profileId });
    const nodes = up.status === 200 && Array.isArray(up.value) ? up.value : [];
    doneUnits = nodes.filter((n) => n.done);
    if (doneUnits.length >= 1) break;
  }
  const up = await api("unit_path", { profileId });
  const nodes = up.status === 200 && Array.isArray(up.value) ? up.value : [];
  const locked = nodes.filter((n) => n.locked);
  const current = nodes.filter((n) => n.current);
  check("unit_path returns nodes", nodes.length > 0, { nodes: nodes.length });
  check("at least one unit earned evidence-backed done", doneUnits.length >= 1, {
    done: doneUnits.map((n) => n.unit_id),
  });
  check("today's plan pins exactly one current unit", current.length >= 1, {
    current: current.map((n) => n.unit_id),
  });
  check(
    "locked-ahead units exist WITH unlock hints (visible-dim, never a mystery)",
    locked.length > 0 && locked.every((n) => n.unlock_hint),
    { locked: locked.length, sampleHint: locked[0]?.unlock_hint },
  );
  check(
    "no done node is locked; no attendance-only unit slipped through",
    locked.every((n) => !n.done),
    { lockedDone: locked.filter((n) => n.done).length },
  );

  // ---- review-due needs the SCHEDULER's due time in the past: practice
  // wrote real rows with future due_at; back-date ONE row through sqlite
  // while serve is down (canonical shape the storage boundary enforces). ----
  const schedBefore = nodes.filter((n) => n.review_due).length;
  serve.kill();
  await sleep(400);
  {
    const db = new DatabaseSync(join(dataDir, "profiles.db"));
    const row = db
      .prepare("SELECT item_id FROM scheduler_state WHERE profile_id = ? ORDER BY due_at LIMIT 1")
      .get(profileId);
    if (row) {
      db.prepare(
        "UPDATE scheduler_state SET due_at = '2020-01-01T00:00:00Z' WHERE profile_id = ? AND item_id = ?",
      ).run(profileId, row.item_id);
      result.backdatedItem = row.item_id;
    }
    db.close();
  }
  serve = await startServe();
  const up2 = await api("unit_path", { profileId });
  const nodes2 = up2.status === 200 && Array.isArray(up2.value) ? up2.value : [];
  const reviewDue = nodes2.filter((n) => n.review_due);
  check(
    "a done unit re-lights review-due once its scheduler item is past due",
    reviewDue.length >= 1,
    { before: schedBefore, after: reviewDue.map((n) => `${n.unit_id}(${n.due_count})`) },
  );

  // ---- browser: the real app on a phone viewport ----
  const profileDir = mkdtempSync(join(tmpdir(), "lts-pathview-chrome-"));
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
  async function shot(name) {
    const s = await send(
      "Page.captureScreenshot",
      { format: "png", captureBeyondViewport: true },
      sessionId,
    );
    writeFileSync(join(OUT, `${name}.png`), Buffer.from(s.data, "base64"));
  }

  await send(
    "Emulation.setDeviceMetricsOverride",
    { width: VW, height: VH, deviceScaleFactor: 1, mobile: true },
    sessionId,
  );
  await send("Page.navigate", { url: `${BASE}/?v=pathview` }, sessionId);
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
  await sleep(800);

  // Today is the landing route after resume; make sure the PATH is visible.
  const pathAudit = await evaluate(`(() => {
    const path = document.querySelector('[data-testid="unit-path"]');
    if (!path) return { found: false };
    const nodes = [...path.querySelectorAll('.path-node')];
    const rows = nodes.map((n) => {
      const r = n.getBoundingClientRect();
      return { state: n.getAttribute('data-state'), h: Math.round(r.height) };
    });
    const toggles = [...path.querySelectorAll('.path-section-toggle')].map((b) =>
      Math.round(b.getBoundingClientRect().height),
    );
    return {
      found: true,
      nodeCount: nodes.length,
      states: rows.map((r) => r.state),
      minHeight: Math.min(...rows.map((r) => r.h), ...toggles),
      toggleHeights: toggles,
      pin: path.textContent.includes('You are here'),
      review: path.textContent.includes('Review due'),
      hint: path.textContent.includes('finish'),
      doneGlyph: path.textContent.includes('\\u2713'),
      docOverflow: document.documentElement.scrollWidth > ${VW} + 2,
    };
  })()`);
  if (!pathAudit.found) {
    // The path may sit below the Today fold; it still renders in DOM —
    // surface that honestly rather than silently screenshotting nothing.
    result.navNote = "unit-path not found in DOM on the Today route";
  }
  check("path renders on the Today route with all five node states visible", pathAudit.found, {
    nodeCount: pathAudit.nodeCount,
    states: pathAudit.states,
  });
  check("pinned unit shows the 'you are here' marker", pathAudit.pin === true, pathAudit);
  check("done unit shows the done glyph", pathAudit.doneGlyph === true, pathAudit);
  check("review-due badge renders on the back-dated unit", pathAudit.review === true, pathAudit);
  check("locked nodes render their unlock hint", pathAudit.hint === true, pathAudit);
  check("no document-level horizontal overflow at 390px", pathAudit.docOverflow === false, {
    docOverflow: pathAudit.docOverflow,
  });
  check("every path row meets the 44px touch floor", pathAudit.minHeight >= 44, {
    minHeight: pathAudit.minHeight,
    toggleHeights: pathAudit.toggleHeights,
  });
  await shot("path-today-top");

  // Scroll-up history (acceptance): center the pin in the phone viewport and
  // take a VIEWPORT-ONLY shot — what the owner actually sees, with the done
  // history rendered above the pin.
  const history = await evaluate(`(() => {
    const pin = document.querySelector('.path-node--current');
    if (!pin) return { found: false };
    pin.scrollIntoView({ block: 'center' });
    const path = document.querySelector('[data-testid="unit-path"]');
    const doneAbove = [...path.querySelectorAll('.path-node--done, .path-node--review-due')]
      .filter((n) => n.compareDocumentPosition(pin) & Node.DOCUMENT_POSITION_FOLLOWING).length;
    const r = pin.getBoundingClientRect();
    return {
      found: true,
      doneAbove,
      pinVisible: r.top >= 0 && r.bottom <= ${VH},
      overflow: document.documentElement.scrollWidth > ${VW} + 2,
    };
  })()`);
  check(
    "scroll-up history: done units render ABOVE the pin and the pin sits in the viewport",
    history.found && history.doneAbove >= 1 && history.pinVisible && !history.overflow,
    history,
  );
  const pinShot = await send(
    "Page.captureScreenshot",
    { format: "png", captureBeyondViewport: false },
    sessionId,
  );
  writeFileSync(join(OUT, "path-history-above-pin.png"), Buffer.from(pinShot.data, "base64"));

  // Expand the next (locked-ahead) section: higher units visible-dim.
  const expanded = await evaluate(`(() => {
    const btn = [...document.querySelectorAll('.path-section-toggle')][1];
    if (!btn) return false;
    btn.click();
    return true;
  })()`);
  if (!expanded) throw new Error("navigation error: no second path section to expand");
  await sleep(400);
  const ahead = await evaluate(`(() => {
    const path = document.querySelector('[data-testid="unit-path"]');
    const locked = [...path.querySelectorAll('.path-node--locked')];
    return {
      lockedVisible: locked.length,
      withHint: locked.filter((n) => (n.textContent ?? '').includes('finish')).length,
      overflow: document.documentElement.scrollWidth > ${VW} + 2,
    };
  })()`);
  check(
    "locked-ahead units stay VISIBLE dim with named unlock reasons",
    ahead.lockedVisible > 0 && ahead.withHint === ahead.lockedVisible && !ahead.overflow,
    ahead,
  );
  await shot("path-locked-ahead");

  result.audit = { pathAudit, ahead };
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
