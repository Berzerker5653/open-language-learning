#!/usr/bin/env node
/**
 * ORTHO-LETTER-UNITS-001 acceptance capture (dev-only evidence tooling).
 *
 * Complaint 04 (state/evidence/DOGFOOD-2026-11-21/complaint-04-case-quiz.png):
 * the on-ramp showed 8 rows for 4 letters because the pack carried one
 * entity per case form. The lane merged the pack to one entity per letter
 * with a `forms` attribute (867654e). This capture proves the FIXED screen:
 * the on-ramp letter lesson ("Printed Cyrillic: А а, О о, М м, Т т")
 * renders FOUR rows, each leading with both printed forms ("А а").
 *
 * Same plumbing as scripts/practice-gate-capture.mjs: REAL engine over an
 * isolated data dir, seeded via serve's own install_pack (in-process from
 * the tree this binary was compiled in — no base64 over HTTP, no 2MB body
 * limit), headless Chrome over raw CDP at a 390x844 phone viewport.
 *
 * Machine gates ride into result.json; navigation errors ride into the
 * result and fail the run loudly (MOBILE-UX-001 lesson). Screenshots land
 * in state/evidence/ORTHO-LETTER-UNITS-001/after/.
 *
 *   usage: SERVE_BIN=<path> SERVE_DIST=<dist DIRECTORY> \
 *          node scripts/ortho-letters-capture.mjs
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
  // existsSync, not readFileSync: SERVE_DIST is a DIRECTORY.
  if (!existsSync(p)) {
    console.error(`${name} not found: ${p}`);
    process.exit(2);
  }
}
const REPO = resolve(import.meta.dirname, "..");
const OUT = join(REPO, "state/evidence/ORTHO-LETTER-UNITS-001", "after");
mkdirSync(OUT, { recursive: true });
const PACK_ID = "org.openlanguage.ru-ru.reference";
const VW = 390;
const VH = 844;
const PORT = 17900 + (process.pid % 90);
const BASE = `http://127.0.0.1:${PORT}`;

const result = { viewport: `${VW}x${VH}`, checks: [], failures: 0, error: null };
const check = (name, pass, measured) => {
  result.checks.push({ name, pass, measured });
  if (!pass) result.failures++;
  console.log(`${pass ? "PASS" : "FAIL"} ${name} — ${JSON.stringify(measured)}`);
};

const dataDir = mkdtempSync(join(tmpdir(), "lts-ortho-letters-data-"));
const serve = spawn(SERVE_BIN, [`127.0.0.1:${PORT}`], {
  env: { ...process.env, LTS_DATA_DIR: dataDir, LTS_SERVE_DIST: SERVE_DIST },
  stdio: ["ignore", "pipe", "pipe"],
});
let serveLog = "";
serve.stdout.on("data", (c) => (serveLog += c));
serve.stderr.on("data", (c) => (serveLog += c));

async function api(command, body) {
  const r = await fetch(`${BASE}/api/${command}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  return { status: r.status, value: await r.json().catch(() => null) };
}

async function seed() {
  const imp = await api("install_pack", { packId: PACK_ID });
  if (imp.status !== 200) throw new Error(`install_pack failed: ${JSON.stringify(imp)}`);
  const prof = await api("create_profile", { displayName: "Ortho Tester" });
  if (prof.status !== 200) throw new Error(`create_profile failed: ${JSON.stringify(prof)}`);
  const profileId = prof.value?.id;
  if (!profileId) throw new Error(`create_profile returned no id: ${JSON.stringify(prof)}`);
  const sw = await api("switch_pack", { profileId, packId: PACK_ID });
  if (sw.status !== 200) throw new Error(`switch_pack failed: ${JSON.stringify(sw)}`);
  return profileId;
}

let chrome = null;
let exitCode = 0;
try {
  for (let i = 0; i < 80; i++) {
    try {
      const r = await fetch(`${BASE}/api/capabilities`);
      if (r.ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }

  const profileId = await seed();
  result.profileId = profileId;

  // ---- engine-level machine gate (deterministic, no browser) ----
  const lp = await api("lesson_plan", { profileId, contentId: "ru.orth.cyrillic.a" });
  const stages = lp.status === 200 && lp.value ? (lp.value.stages ?? []) : [];
  const allContent = stages.flatMap((s) => s.content ?? []);
  const orthRows = allContent.filter((c) => c.kind === "orthography");
  const encounterStages = stages.filter((s) => s.stage_kind === "encounter");
  const encIds = [
    ...new Set(encounterStages.flatMap((s) => (s.content ?? []).map((c) => c.content_id))),
  ];
  check(
    "lesson_plan resolves one orthography entity set {a,o,m,t} for the letter unit",
    lp.status === 200 &&
      encIds.length === 4 &&
      ["a", "o", "m", "t"].every((l) => encIds.includes(`ru.orth.cyrillic.${l}`)),
    { status: lp.status, encIds },
  );
  check(
    "every orthography wire row carries BOTH case forms",
    orthRows.length > 0 && orthRows.every((c) => Array.isArray(c.forms) && c.forms.length === 2),
    orthRows.map((c) => ({ id: c.content_id, forms: c.forms })),
  );
  check(
    "zero per-case -upper/-lower ids anywhere on the lesson wire",
    allContent.length > 0 && !allContent.some((c) => /-(upper|lower)$/.test(c.content_id)),
    { contentIds: allContent.map((c) => c.content_id) },
  );

  // ---- browser: real app on a phone viewport ----
  const profileDir = mkdtempSync(join(tmpdir(), "lts-ortho-letters-profile-"));
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
  for (let i = 0; !wsUrl && i < 100; i++) await new Promise((r) => setTimeout(r, 100));
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
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
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
  async function clickByText(label, scope = "button") {
    const clicked = await evaluate(`(() => {
      const el = [...document.querySelectorAll('${scope}')].find(
        (e) => (e.textContent ?? '').includes(${JSON.stringify(label)}),
      );
      if (!el) return false;
      el.click();
      return true;
    })()`);
    if (!clicked)
      throw new Error(`navigation error: no ${scope} containing ${JSON.stringify(label)}`);
    await sleep(500);
  }

  await send(
    "Emulation.setDeviceMetricsOverride",
    { width: VW, height: VH, deviceScaleFactor: 1, mobile: true },
    sessionId,
  );
  await send("Page.navigate", { url: `${BASE}/?v=ortho-after` }, sessionId);

  // Resume the seeded profile (chooser card button reads 'Continue'; the
  // profile NAME lives in the card wrapper — MOBILE-UX-001 lesson).
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
            if (n && (n.textContent ?? '').includes('Ortho Tester')) return true;
          }
          return false;
        });
      if (!el) return false;
      el.click();
      return true;
    })()`);
  }
  if (!resumed) throw new Error("navigation error: profile chooser never offered 'Ortho Tester'");
  await sleep(700);

  // Today -> start the plan; the first on-ramp activity is the letter unit
  // (ru.goal.on-ramp.cyrillic is the first goal and greetings gate on it).
  await clickByText("Today");
  await sleep(500);
  await clickByText("Start today's plan");

  // Wait for the lesson encounter card.
  let card = null;
  for (let i = 0; i < 40 && !card; i++) {
    await sleep(300);
    card = await evaluate(`(() => {
      const sec = document.querySelector('[data-testid="lesson-encounter"]');
      if (!sec) return null;
      const row = (li) => ({
        content_id: li.getAttribute('data-content') ?? '',
        kind: li.getAttribute('data-kind') ?? '',
        surface: (li.querySelector('.lesson__surface')?.textContent ?? '').trim(),
      });
      // The engine's lesson plan shows the SAME merged entities once per
      // progressive stage section (read -> recognize -> name). The letter
      // lesson proper is the FIRST stage section; per-stage row counts are
      // the acceptance target, card-wide id uniqueness is the merge proof.
      const firstStage = sec.querySelector('section.lesson__stage');
      if (!firstStage) return null;
      const stageLabel = (firstStage.querySelector('h2')?.textContent ?? '').trim();
      return {
        title: (sec.querySelector('h1')?.textContent ?? '').trim(),
        stageLabel,
        rows: [...firstStage.querySelectorAll('li.lesson__item')].map(row),
        allRows: [...sec.querySelectorAll('li.lesson__item')].map(row),
      };
    })()`);
  }
  if (!card)
    throw new Error(
      'navigation error: no [data-testid="lesson-encounter"] card after starting the plan',
    );

  const orthRowsDom = card.rows.filter((r) => r.kind === "orthography");
  check("lesson card is the merged letter unit", card.title.includes("Printed Cyrillic"), {
    title: card.title,
    stageLabel: card.stageLabel,
  });
  check(
    "letter lesson section shows FOUR rows (not eight per-case rows)",
    orthRowsDom.length === 4,
    { rows: orthRowsDom },
  );
  const pairs = ["А а", "О о", "М м", "Т т"];
  check(
    'each row leads with BOTH printed forms ("А а")',
    orthRowsDom.length === 4 &&
      orthRowsDom.every((r) => pairs.some((p) => r.surface.replace(/\s+/g, " ").startsWith(p))),
    { surfaces: orthRowsDom.map((r) => r.surface) },
  );
  const uniqueIds = [...new Set(card.allRows.map((r) => r.content_id))];
  check(
    "card-wide entity set is the FOUR merged letters — none per-case",
    uniqueIds.length === 4 &&
      ["a", "o", "m", "t"].every((l) => uniqueIds.includes(`ru.orth.cyrillic.${l}`)) &&
      !uniqueIds.some((id) => /-(upper|lower)$/.test(id)),
    { uniqueIds, rowCount: card.allRows.length },
  );
  await send(
    "Page.captureScreenshot",
    { format: "png", captureBeyondViewport: true },
    sessionId,
  ).then((shot) =>
    writeFileSync(join(OUT, "letter-rows-after.png"), Buffer.from(shot.data, "base64")),
  );

  // ---- the complaint-04 screen itself (best-effort drill capture) ----
  // The old quiz showed the same two labels twice (ghost per-case rows).
  // Post-lane, the drill's option set must have NO duplicate labels.
  try {
    await clickByText("Start practicing");
    let drill = null;
    for (let i = 0; i < 30 && !drill; i++) {
      await sleep(300);
      drill = await evaluate(`(() => {
        if (![...document.querySelectorAll('h1,h2,p')].some((e) => (e.textContent ?? '').includes('Which one matches'))) return null;
        const labels = [...document.querySelectorAll('button')].map((b) => (b.textContent ?? '').trim()).filter((t) => t.length > 0);
        return labels;
      })()`);
    }
    if (drill) {
      const uniq = new Set(drill);
      check(
        "complaint-04 drill screen offers NO duplicate option labels (ghost rows gone)",
        uniq.size === drill.length,
        { labels: drill },
      );
      await send(
        "Page.captureScreenshot",
        { format: "png", captureBeyondViewport: true },
        sessionId,
      ).then((shot) =>
        writeFileSync(join(OUT, "letter-drill-after.png"), Buffer.from(shot.data, "base64")),
      );
    } else {
      result.drillNote =
        "drill screen ('Which one matches?') did not appear within 9s of Start practicing — skipped, primary gates stand";
    }
  } catch (err) {
    result.drillNote = `drill capture skipped: ${String(err?.message ?? err)}`;
  }
} catch (err) {
  result.error = String(err?.message ?? err);
  result.failures++;
  console.error(`capture failed: ${result.error}`);
} finally {
  result.serveLogTail = serveLog.slice(-2000);
  writeFileSync(join(OUT, "result.json"), JSON.stringify(result, null, 2) + "\n");
  chrome?.kill();
  serve.kill();
  exitCode = result.failures > 0 ? 1 : 0;
}
process.exit(exitCode);
