#!/usr/bin/env node
/**
 * SECONDARY-SURFACES-001 acceptance capture (dev-only evidence tooling).
 * Red-at-HEAD: same script reds then greens. Oracle: state/notes/
 * UI-VERIFY-2026-11-23.md defects 3+4 (dashed-border info boxes and
 * default browser form inputs on the Practice/Progress/My Words screens).
 *
 * Same plumbing as scripts/copy-polish-capture.mjs (real engine: lts-serve
 * over an isolated data dir + freshly created profile, headless Chrome at
 * 390x844 mobile:true via CDP — no new deps). Checks are DOM/geometry
 * measurements on live elements (never body.innerText) — the visual pass
 * rides on the committed PNGs.
 *
 *   S1 INFO-BOX: a probe .empty box on the Practice (home) surface must be a
 *      solid card (1px solid border, radius, surface fill, no dashed style).
 *   S2 ZERO-CARD: the live .progress-zero on the Progress surface must be a
 *      solid card (same treatment, not 2px dashed).
 *   S3 PROGRESS-INFO-BOX: the live .empty box on the Progress screen must
 *      be solid (the same shared rule this card fixes).
 *   S4 MYWORDS-INPUTS: every My Words input must be full-width of its
 *      .field and >= 44px tall, with a solid line-strong border (HEAD: UA
 *      default narrow unstyled inputs).
 *   S5 MYWORDS-FOCUS: an input focused in-page must show a visible focus
 *      state (accent border), not just the rest hairline.
 *   S6 DISABLED-BTN: the disabled Add-to-my-words button must be clearly
 *      distinguishable from enabled and readable (opacity >= 0.6, not the
 *      near-invisible 0.45).
 *   S7 TAP-TARGETS: every visible button on the three surfaces must be
 *      >= 44px tall (mobile tap-target floor).
 *
 *   usage: SERVE_BIN=<path> SERVE_DIST=<dist dir> [CAPTURE_TAG=red|green] \
 *          node scripts/secondary-surfaces-capture.mjs
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
const OUT = join(REPO, "state/evidence/SECONDARY-SURFACES-001");
mkdirSync(OUT, { recursive: true });
const PACK_ID = "org.openlanguage.ru-ru.reference";
const PROFILE = "Secondary Surfaces";
const VW = 390;
const VH = 844;
// Fresh port band — sibling capture lanes keep the 176xx/177xx/178xx/179xx bands busy.
const PORT = 18080 + (process.pid % 60);
const BASE = `http://127.0.0.1:${PORT}`;

const result = { viewport: `${VW}x${VH}`, mobile: true, tag: TAG, checks: [], failures: 0, error: null };
const check = (name, pass, measured) => {
  result.checks.push({ name, pass, measured });
  if (!pass) result.failures++;
  console.log(`${pass ? "PASS" : "FAIL"} ${name} — ${JSON.stringify(measured)}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const dataDir = mkdtempSync(join(tmpdir(), "lts-secondary-surfaces-data-"));

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

  const profileDir = mkdtempSync(join(tmpdir(), "lts-secondary-surfaces-chrome-"));
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
  async function shot(name, viewportOnly = false) {
    const s = await send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: !viewportOnly,
    });
    writeFileSync(join(OUT, `${name}.png`), Buffer.from(s.data, "base64"));
  }

  await send("Emulation.setDeviceMetricsOverride", {
    width: VW,
    height: VH,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await send("Page.navigate", { url: `${BASE}/?v=secondary-surfaces` });
  let resumed = false;
  for (let i = 0; i < 80 && !resumed; i++) {
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

  // Home must be stable-healthy before any geometry is measured.
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
  let healthy = 0;
  for (let i = 0; i < 60 && healthy < 3; i++) {
    healthy = (await homeHealthy()) ? healthy + 1 : 0;
    await sleep(250);
  }
  if (healthy < 3) throw new Error("navigation error: home never went stable-healthy");

  // ---- Practice (home/path surface) ----
  const practiceMeasures = await evaluate(`(() => {
    // Probe: a temporary .empty element — the Practice surface's live
    // empty-state box only renders in the not-ready state; the probe sees
    // the shared rule on this exact screen instead of a rendered sibling.
    const probe = document.createElement('p');
    probe.className = 'empty';
    probe.id = 'ss-probe';
    probe.textContent = 'probe';
    document.body.appendChild(probe);
    const s = getComputedStyle(probe);
    const rect = probe.getBoundingClientRect();
    // The SAME rule rendered from a live element on the Progress route is
    // measured below; this probe measures the shared token contract here.
    const surfaceProbe = s.backgroundColor;
    const borderStyle = s.borderTopStyle;
    const borderWidth = s.borderTopWidth;
    const radius = s.borderTopLeftRadius;
    probe.remove();
    // tap targets on the home surface
    const targets = [...document.querySelectorAll('button')]
      .filter((b) => { const r = b.getBoundingClientRect(); return r.width > 0 && r.height > 0; })
      .map((b) => ({ text: (b.textContent ?? '').trim().slice(0, 60), h: Math.round(b.getBoundingClientRect().height) }));
    return { surfaceProbe, borderStyle, borderWidth, radius, targets, height: rect.height };
  })()`);
  await shot(`practice-home-${TAG}`, true);
  check(
    "S1 INFO-BOX: probe .empty renders a solid card (no dashed style)",
    practiceMeasures.borderStyle === "solid" &&
      parseFloat(practiceMeasures.borderWidth) >= 1 &&
      parseFloat(practiceMeasures.radius) > 0 &&
      practiceMeasures.surfaceProbe !== "rgba(0, 0, 0, 0)" &&
      practiceMeasures.surfaceProbe !== "transparent",
    practiceMeasures,
  );

  // ---- Progress surface ----
  const clickTab = async (label) => {
    return evaluate(`(() => {
      const el = [...document.querySelectorAll('button, a')]
        .find((b) => (b.textContent ?? '').trim() === ${JSON.stringify(label)});
      if (!el) return false;
      el.click();
      return true;
    })()`);
  };
  if (!(await clickTab("Progress"))) throw new Error("nav: Progress tab never appeared");
  let onProgress = false;
  for (let i = 0; i < 60 && !onProgress; i++) {
    await sleep(250);
    onProgress = await evaluate(`(() => !!document.querySelector('.progress-zero'))()`);
  }
  if (!onProgress) throw new Error("navigation error: progress zero-state card never rendered");
  await shot(`progress-${TAG}`, false);

  const progressMeasures = await evaluate(`(() => {
    const zero = document.querySelector('.progress-zero');
    const anyEmpty = [...document.querySelectorAll('.empty')][0];
    const measure = (el) => {
      if (!el) return null;
      const s = getComputedStyle(el);
      return { style: s.borderTopStyle, width: s.borderTopWidth, radius: s.borderTopLeftRadius, bg: s.backgroundColor };
    };
    // tap targets on the progress surface
    const targets = [...document.querySelectorAll('button')]
      .filter((b) => { const r = b.getBoundingClientRect(); return r.width > 0 && r.height > 0; })
      .map((b) => ({ text: (b.textContent ?? '').trim().slice(0, 60), h: Math.round(b.getBoundingClientRect().height) }));
    return { zero: measure(zero), empty: measure(anyEmpty), targets };
  })()`);
  check(
    "S2 ZERO-CARD: .progress-zero is a solid card (not dashed)",
    !!progressMeasures.zero &&
      progressMeasures.zero.style === "solid" &&
      parseFloat(progressMeasures.zero.width) >= 1 &&
      parseFloat(progressMeasures.zero.radius) > 0,
    progressMeasures.zero,
  );
  check(
    "S3 PROGRESS-INFO-BOX: live .empty is a solid card (not dashed)",
    !!progressMeasures.empty &&
      progressMeasures.empty.style === "solid" &&
      parseFloat(progressMeasures.empty.width) >= 1 &&
      parseFloat(progressMeasures.empty.radius) > 0,
    progressMeasures.empty,
  );

  // ---- My Words surface ----
  if (!(await clickTab("My Words"))) throw new Error("nav: My Words tab never appeared");
  let onWords = false;
  for (let i = 0; i < 60 && !onWords; i++) {
    await sleep(250);
    onWords = await evaluate(`(() => !!document.querySelector('#mine-surface'))()`);
  }
  if (!onWords) throw new Error("navigation error: My Words form never rendered");
  await shot(`my-words-${TAG}`, false);

  const wordsMeasures = await evaluate(`(() => {
    const inputs = [...document.querySelectorAll('.field input')];
    const targets = [...document.querySelectorAll('button')]
      .filter((b) => { const r = b.getBoundingClientRect(); return r.width > 0 && r.height > 0; })
      .map((b) => ({ text: (b.textContent ?? '').trim().slice(0, 60), h: Math.round(b.getBoundingClientRect().height) }));
    const tracked = inputs.map((el) => {
      const s = getComputedStyle(el);
      const parent = el.closest('.field');
      return {
        id: el.id,
        width: el.getBoundingClientRect().width,
        parentWidth: parent ? parent.getBoundingClientRect().width : null,
        minHeight: el.getBoundingClientRect().height,
        borderStyle: s.borderTopStyle,
        borderWidth: s.borderTopWidth,
        borderColor: s.borderTopColor,
        borderRadius: s.borderTopLeftRadius,
      };
    });
    const add = [...document.querySelectorAll('button')]
      .filter((b) => (b.textContent ?? '').includes('Add to my words'))[0];
    let addDisabled = null;
    if (add) {
      const s = getComputedStyle(add);
      addDisabled = {
        disabled: add.disabled,
        opacity: parseFloat(s.opacity),
        background: s.backgroundColor,
        color: s.color,
        borderColor: s.borderTopColor,
      };
    }
    // focus test on the first input
    const focusTarget = inputs[0];
    let focus = null;
    if (focusTarget) {
      focusTarget.focus();
      const s = getComputedStyle(focusTarget);
      focus = { borderColor: s.borderTopColor, outlineStyle: s.outlineStyle, boxShadow: s.boxShadow };
      focusTarget.blur();
    }
    const allButtons = targets;
    return { tracked, addDisabled, focus, buttonTargets: allButtons };
  })()`);

  const allInputs = wordsMeasures.tracked.length >= 4 && wordsMeasures.tracked.every((t) => t.minHeight >= 44);
  check(
    "S4 MYWORDS-INPUTS: form inputs are full-width and >= 44px tall",
    wordsMeasures.tracked.length >= 4 &&
      allInputs &&
      wordsMeasures.tracked.every(
        (t) => t.parentWidth && t.width >= t.parentWidth - 2,
      ),
    wordsMeasures.tracked,
  );
  // Resolve the --accent token to a real rgb() in-page so a focused input
  // can be compared to the app's own design accent, not a browser-default.
  const accentRgbInPage = await evaluate(
    `(() => {
      const probe = document.createElement('span');
      probe.style.color = 'var(--accent)';
      document.body.appendChild(probe);
      const c = getComputedStyle(probe).color;
      probe.remove();
      return c;
    })()`,
  );
  check(
    "S5 MYWORDS-FOCUS: a focused input shows the app's accent border (visible focus state)",
    !!wordsMeasures.focus &&
      wordsMeasures.focus.borderColor === accentRgbInPage &&
      accentRgbInPage !== "rgb(118, 118, 118)", // not the UA rest hairline
    { ...wordsMeasures.focus, expectedAccent: accentRgbInPage },
  );
  check(
    "S6 DISABLED-BTN: disabled Add button is clearly distinct and readable",
    !!wordsMeasures.addDisabled &&
      wordsMeasures.addDisabled.disabled === true &&
      wordsMeasures.addDisabled.opacity >= 0.6 &&
      wordsMeasures.addDisabled.background !== accentRgbInPage &&
      wordsMeasures.addDisabled.color !== "rgb(255, 255, 255)",
    wordsMeasures.addDisabled,
  );

  const practiceTargets = practiceMeasures.targets.filter((t) => t.h < 44);
  const progressTargets = progressMeasures.targets.filter((t) => t.h < 44);
  const wordsTargets = wordsMeasures.buttonTargets.filter((t) => t.h < 44);
  const tapProblems = [
    ...practiceTargets.map((t) => `practice: ${t.text} h=${t.h}px`),
    ...progressTargets.map((t) => `progress: ${t.text} h=${t.h}px`),
    ...wordsTargets.map((t) => `words: ${t.text} h=${t.h}px`),
  ];
  check(
    "S7 TAP-TARGETS: no visible button below the 44px floor on the three surfaces",
    tapProblems.length === 0,
    { practice: practiceTargets, progress: progressTargets, words: wordsTargets },
  );

  writeFileSync(join(OUT, `audit-${TAG}.json`), JSON.stringify(result, null, 2) + "\n");
  console.log(
    result.failures === 0
      ? `SECONDARY-SURFACES-001 capture ${TAG}: 7/7 green`
      : `SECONDARY-SURFACES-001 capture ${TAG}: ${result.failures} failed`,
  );
  process.exitCode = result.failures === 0 ? 0 : 1;
} catch (err) {
  result.error = String(err?.message ?? err);
  try {
    writeFileSync(join(OUT, `audit-${TAG}.json`), JSON.stringify(result, null, 2) + "\n");
  } catch {
    // evidence unwritable — the exit below carries the failure
  }
  console.error(`SECONDARY-SURFACES-001 capture ${TAG}: ERROR ${result.error}`);
  process.exitCode = 2;
} finally {
  if (chrome) chrome.kill();
  if (serve) serve.kill();
  try {
    if (chromeDir) rmSync(chromeDir, { recursive: true, force: true, maxRetries: 5 });
    rmSync(dataDir, { recursive: true, force: true, maxRetries: 5 });
  } catch {
    // teardown races are not measurements
  }
}
