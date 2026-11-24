#!/usr/bin/env node
/**
 * COPY-POLISH-001 acceptance capture (dev-only evidence tooling).
 * Red-at-HEAD: same script reds then greens. Oracle: state/notes/
 * UI-VERIFY-2026-11-23.md defect 5 (learner-copy bugs on the live phone app).
 *
 * Same plumbing as scripts/drill-hierarchy-capture.mjs (real engine:
 * lts-serve over an isolated data dir + freshly created profile, headless
 * Chrome at 390x844 mobile:true via CDP — no new deps). All copy claims
 * are measured on INTERACTIVE/LABEL elements, never document.body.innerText
 * (WEB-HISTORY-001 banner-pollution rule).
 *
 *   C1 FIRST-RUN-JOIN: the first-run rows on home must never glue a Latin
 *      label to a Cyrillic word ("Meet something newа" at HEAD). No row
 *      text may match /[A-Za-z][\u0400-\u04FF]/, and the group label must
 *      still be present.
 *   C2 PROMPT-CASE: the home plan prompt label is sentence-cased —
 *      p.prompt text is exactly "What to practice now" (HEAD: "what to
 *      practice now").
 *   C3 BADGE-CASE: the installed-pack badge text is exactly
 *      "Learning this language" (HEAD: "learning this language").
 *   C4 POSTURE-ROWS: the Settings "Review posture" rows are a label +
 *      value layout: every row carries a .posture-label and a
 *      .posture-value element and no row renders run-on "kind: count"
 *      prose (HEAD renders "lexicon: 3918 AI-generated, unreviewed").
 *   C5 KANJI-QUIET: the RU pack's claims list shows no kanji row (its
 *      kanji count is a known zero). Unknown counts stay visible in code
 *      (!== 0 check); this measures the RU zero case.
 *   C6 FACTS-LINES: the Progress gentle-facts line renders each fact as
 *      one unbroken clause — two .gentle-fact spans, each occupying a
 *      single text line (Range rect count 1) at 390px (HEAD: raw prose
 *      that can wrap mid-phrase, e.g. "0 units / completed").
 *
 * Navigation errors ride INTO the audit (MOBILE-UX-001 rule); any failed
 * assertion exits non-zero, so this file IS the gate.
 *
 *   usage: SERVE_BIN=<path> SERVE_DIST=<dist dir> [CAPTURE_TAG=red|green] \
 *          node scripts/copy-polish-capture.mjs
 */
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync, mkdtempSync, existsSync, rmSync } from "node:fs";
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
const TAG = process.env.CAPTURE_TAG ?? "green";
const OUT = join(REPO, "state/evidence/COPY-POLISH-001");
mkdirSync(OUT, { recursive: true });
const PACK_ID = "org.openlanguage.ru-ru.reference";
const PROFILE = "Copy Polish";
const VW = 390;
const VH = 844;
// Fresh port band — sibling capture lanes keep the 176xx/177xx/178xx ports busy.
const PORT = 17920 + (process.pid % 60);
const BASE = `http://127.0.0.1:${PORT}`;

const result = { viewport: `${VW}x${VH}`, mobile: true, tag: TAG, checks: [], failures: 0, error: null };
const check = (name, pass, measured) => {
  result.checks.push({ name, pass, measured });
  if (!pass) result.failures++;
  console.log(`${pass ? "PASS" : "FAIL"} ${name} — ${JSON.stringify(measured)}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const dataDir = mkdtempSync(join(tmpdir(), "lts-copypolish-data-"));

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
  throw new Error(`serve did not answer capabilities:\n${serve.getLog().slice(-1200)}`);
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

  const profileDir = mkdtempSync(join(tmpdir(), "lts-copypolish-chrome-"));
  chromeDir = profileDir;
  chrome = spawn(
    process.env.CHROME ?? "google-chrome-stable",
    [
      "--headless=new",
      "--no-sandbox",
      "--disable-gpu",
      "--remote-debugging-port=0",
      `--user-data-dir=${profileDir}`,
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
  let sessionId = null;
  function send(method, params = {}, sid = sessionId) {
    const id = nextId++;
    ws.send(JSON.stringify({ id, method, params, ...(sid ? { sessionId: sid } : {}) }));
    return new Promise((res, rej) =>
      pending.set(id, (msg) =>
        msg.error ? rej(new Error(`${method}: ${msg.error.message}`)) : res(msg.result),
      ),
    );
  }
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
  async function shot(name) {
    const s = await send("Page.captureScreenshot", { format: "png" });
    writeFileSync(join(OUT, `${name}.png`), Buffer.from(s.data, "base64"));
  }

  await send("Emulation.setDeviceMetricsOverride", {
    width: VW,
    height: VH,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await send("Page.navigate", { url: `${BASE}/?v=cp-home` });
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

  // Home must be stable-healthy before any copy is measured (PRACTICE-GATE
  // rule: the pack line flickers 'No language is set' for ~1s after resume).
  const homeHealthy = () =>
    evaluate(`(() => {
      const t = document.body.innerText;
      return (
        !t.includes('No language is set') &&
        t.includes('Russian Reference Pack') &&
        document.querySelectorAll('[data-unit]').length > 0
      );
    })()`);
  let healthy = 0;
  for (let i = 0; i < 40 && healthy < 3; i++) {
    healthy = (await homeHealthy()) ? healthy + 1 : 0;
    await sleep(250);
  }
  if (healthy < 3) throw new Error("navigation error: home never went stable-healthy");

  // ---- home: first-run join + plan prompt casing ----
  const homeMeasures = await evaluate(`(() => {
    const rows = [...document.querySelectorAll('.first-run-list li')].map((li) => ({
      text: li.innerText,
      glued: /[A-Za-z][\\u0400-\\u04FF]/.test(li.innerText),
    }));
    const prompts = [...document.querySelectorAll('p.prompt')].map((p) => p.innerText.trim());
    return { rows, prompts };
  })()`);
  await shot(`home-${TAG}`);
  const joinOk =
    homeMeasures.rows.length > 0 &&
    homeMeasures.rows.every((r) => !r.glued) &&
    homeMeasures.rows.some((r) => r.text.includes("Meet something new"));
  check("C1 first-run rows never glue label to pack word", joinOk, homeMeasures.rows);
  check(
    "C2 home plan prompt is sentence-cased",
    homeMeasures.prompts.includes("What to practice now"),
    homeMeasures.prompts,
  );

  // ---- settings: badge casing, posture layout, kanji quiet ----
  const clickTab = async (label) => {
    return evaluate(`(() => {
      const el = [...document.querySelectorAll('button, a')]
        .find((b) => (b.textContent ?? '').trim() === ${JSON.stringify(label)});
      if (!el) return false;
      el.click();
      return true;
    })()`);
  };
  if (!(await clickTab("Settings"))) throw new Error("nav: Settings tab never appeared");
  let onSettings = false;
  for (let i = 0; i < 40 && !onSettings; i++) {
    await sleep(250);
    onSettings = await evaluate(
      `(() => document.body.innerText.includes('Installed packs'))()`,
    );
  }
  if (!onSettings) throw new Error("navigation error: settings language panel never rendered");
  await shot(`settings-${TAG}`);
  const settingsMeasures = await evaluate(`(() => {
    const badges = [...document.querySelectorAll('.badge--active')].map((b) => b.innerText.trim());
    const heads = [...document.querySelectorAll('h4')].filter((h) =>
      (h.textContent ?? '').includes('Review posture'));
    const postureRows = heads.flatMap((h) => {
      const ul = h.nextElementSibling;
      if (!ul || ul.tagName !== 'UL') return [];
      return [...ul.querySelectorAll('li')].map((li) => ({
        text: li.innerText,
        label: !!li.querySelector('.posture-label'),
        value: !!li.querySelector('.posture-value'),
        runon: /^[a-z-]+:/.test(li.innerText.trim()),
      }));
    });
    const claimLis = [...document.querySelectorAll('.claims')].flatMap((c) => {
      const ul = c.querySelector('ul.meta-list');
      return ul ? [...ul.querySelectorAll('li')].map((li) => li.innerText.trim()) : [];
    });
    return { badges, postureRows, claimLis };
  })()`);
  check(
    "C3 active-pack badge is sentence-cased",
    settingsMeasures.badges.includes("Learning this language"),
    settingsMeasures.badges,
  );
  const postureOk =
    settingsMeasures.postureRows.length > 0 &&
    settingsMeasures.postureRows.every((r) => r.label && r.value && !r.runon);
  check("C4 review-posture rows are label + value, never run-on prose", postureOk, settingsMeasures.postureRows);
  check(
    "C5 RU pack claims show no kanji row (known zero)",
    settingsMeasures.claimLis.length > 0 && !settingsMeasures.claimLis.some((t) => /kanji/i.test(t)),
    settingsMeasures.claimLis,
  );

  // ---- progress: gentle-facts clauses stay unbroken at 390px ----
  if (!(await clickTab("Progress"))) throw new Error("nav: Progress tab never appeared");
  let onProgress = false;
  for (let i = 0; i < 40 && !onProgress; i++) {
    await sleep(250);
    onProgress = await evaluate(
      `(() => !!document.querySelector('[data-testid="gentle-facts"]'))()`,
    );
  }
  if (!onProgress) throw new Error("navigation error: progress gentle-facts never rendered");
  await shot(`progress-${TAG}`);
  const factsMeasures = await evaluate(`(() => {
    const p = document.querySelector('[data-testid="gentle-facts"] p');
    const spans = [...document.querySelectorAll('[data-testid="gentle-facts"] .gentle-fact')];
    const clauseRects = (text) => {
      if (!p) return -1;
      const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        const idx = node.textContent.indexOf(text);
        if (idx >= 0) {
          const range = document.createRange();
          range.setStart(node, idx);
          range.setEnd(node, idx + text.length);
          return range.getClientRects().length;
        }
      }
      return 0; // clause text not found in one node
    };
    return {
      text: p ? p.innerText.trim() : null,
      spanTexts: spans.map((s) => s.innerText.trim()),
      spanLines: spans.map((s) => {
        const range = document.createRange();
        range.selectNodeContents(s);
        return range.getClientRects().length;
      }),
      unitsClauseLines: clauseRects("units completed"),
    };
  })()`);
  const factsOk =
    factsMeasures.spanTexts.length === 2 &&
    factsMeasures.spanLines.every((n) => n === 1) &&
    factsMeasures.unitsClauseLines === 1;
  check("C6 gentle-facts clauses each hold one line at 390px", factsOk, factsMeasures);

  writeFileSync(join(OUT, `audit-${TAG}.json`), JSON.stringify(result, null, 2) + "\n");
  console.log(
    result.failures === 0
      ? `COPY-POLISH-001 capture ${TAG}: 6/6 green`
      : `COPY-POLISH-001 capture ${TAG}: ${result.failures} failed`,
  );
  process.exitCode = result.failures === 0 ? 0 : 1;
} catch (err) {
  result.error = String(err?.message ?? err);
  writeFileSync(join(OUT, `audit-${TAG}.json`), JSON.stringify(result, null, 2) + "\n");
  console.error(`COPY-POLISH-001 capture ${TAG}: ERROR ${result.error}`);
  process.exitCode = 2;
} finally {
  if (chrome) chrome.kill();
  if (serve) serve.kill();
  try {
    if (chromeDir) rmSync(chromeDir, { recursive: true, force: true, maxRetries: 5 });
    rmSync(dataDir, { recursive: true, force: true, maxRetries: 5 });
  } catch {
    // a chrome profile dir racing teardown is not a measurement failure
  }
}
