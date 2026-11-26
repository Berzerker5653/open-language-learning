#!/usr/bin/env node
/**
 * DRILL-HIERARCHY-001 — the drill screen must have a visual hierarchy.
 * Red-at-HEAD acceptance harness (same script reds then greens; the
 * before-image oracle is state/notes/UI-VERIFY-2026-11-23.md defect 2:
 * Pause/Stop styled identically to answer tiles, tiles 44px, Play w=313
 * vs the 374 content grid).
 *
 * Same plumbing as scripts/drill-feel-capture.mjs (real engine: lts-serve
 * over an isolated data dir + freshly created profile, headless Chrome at
 * 390x844 mobile:true via CDP Emulation.setDeviceMetricsOverride — no new
 * deps). Measures the UNGRADED drill board geometry (before any choice is
 * clicked, so no FEEL-DRILL reveal state is involved):
 *   G1 TILE-HEIGHT: every answer tile is comfortably taller than the
 *      44px floor (>= 50px; red at HEAD measures exactly 44).
 *   G2 TILE-GRID: the tiles are the dominant tappable objects — each
 *      spans the content grid (>= 330px wide at 390px viewport).
 *   G3 CONTROL-SECONDARY: the Pause/Stop session controls read quiet:
 *      strictly shorter than a tile (>= 8px), strictly smaller type, and
 *      a transparent (non-tile) fill — red at HEAD measures them
 *      IDENTICAL to the tiles on all three axes.
 *   G4 SEPARATION: the controls sit under a declared divider (border-top
 *      on their row) with clearance below the tiles (>= 12px).
 *   G5 AUDIO-GRID: on a listening card the Play button's right edge
 *      aligns to the same content grid as the tiles (within 2px) — red
 *      at HEAD measures w=313 vs the tiles' 374 right edge.
 *   G6 TAP-FLOOR (regression guard): every tile and every session
 *      control keeps a >= 44px tap height (WCAG 2.2 AA).
 *   G7 TILE-EMPHASIS: the tiles carry a heavier border than the controls
 *      (tiles >= 2px, controls <= 1px) — hierarchy by weight, not size.
 * Navigation errors ride INTO the audit (MOBILE-UX-001 rule); any failed
 * assertion exits non-zero, so this file IS the gate.
 *
 *   usage: SERVE_BIN=<path> SERVE_DIST=<dist dir> [CAPTURE_TAG=red|green] \
 *          node scripts/drill-hierarchy-capture.mjs
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
const OUT = join(REPO, "state/evidence/DRILL-HIERARCHY-001");
mkdirSync(OUT, { recursive: true });
const PACK_ID = "org.openlanguage.ru-ru.reference";
const PROFILE = "Drill Hierarchy";
const VW = 390;
const VH = 844;
// Fresh port band — sibling capture lanes keep the 176xx/177xx ports busy.
const PORT = 17830 + (process.pid % 90);
const BASE = `http://127.0.0.1:${PORT}`;

const result = {
  viewport: `${VW}x${VH}`,
  mobile: true,
  tag: TAG,
  checks: [],
  failures: 0,
  error: null,
};
const check = (name, pass, measured) => {
  result.checks.push({ name, pass, measured });
  if (!pass) result.failures++;
  console.log(`${pass ? "PASS" : "FAIL"} ${name} — ${JSON.stringify(measured)}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const dataDir = mkdtempSync(join(tmpdir(), "lts-drillh-data-"));

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

  const profileDir = mkdtempSync(join(tmpdir(), "lts-drillh-chrome-"));
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
  await send("Page.navigate", { url: `${BASE}/?v=drillh` });
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

  // ---- start a real session; walk to an UNGRADED choices board. ----
  let started = false;
  for (let i = 0; i < 20 && !started; i++) {
    started = await evaluate(`(() => {
      const pill = document.querySelector('[data-testid="path-start-pill"]');
      if (pill) { pill.click(); return true; }
      const b = [...document.querySelectorAll('button')].find((x) =>
        (x.textContent ?? '').includes('Start today'));
      if (!b) return false;
      b.click();
      return true;
    })()`);
    if (!started) await sleep(250);
  }
  if (!started) {
    const dump = await evaluate(`(() => ({
      buttons: [...document.querySelectorAll('button')].map((b) => (b.textContent ?? '').trim()).filter(Boolean).slice(0, 40),
      pill: !!document.querySelector('[data-testid="path-start-pill"]'),
      units: document.querySelectorAll('[data-unit]').length,
      text: (document.body.innerText || '').slice(0, 400),
    }))()`);
    console.error("home dump:", JSON.stringify(dump, null, 1));
    throw new Error("navigation error: no 'Start today' plan button on a healthy home");
  }

  const clickStartPracticing = () =>
    evaluate(`(() => {
      const b = [...document.querySelectorAll('button')].find((x) =>
        (x.textContent ?? '').trim() === 'Start practicing');
      if (b) { b.click(); return true; }
      return false;
    })()`);
  const runnerKind = () =>
    evaluate(`(() => {
      if (document.querySelector('[aria-label="Choices"] button:not([disabled])')) return 'choices';
      if (document.querySelector('#practice-answer:not([disabled])')) return 'typed';
      if (document.querySelector('.verdict')) return 'graded';
      return null;
    })()`);
  const typeAndCheck = () =>
    evaluate(`(() => {
      const el = document.querySelector('#practice-answer');
      if (!el) return false;
      const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      set.call(el, '\\u0430');
      el.dispatchEvent(new Event('input', { bubbles: true }));
      const b = [...document.querySelectorAll('button')].find((x) => (x.textContent ?? '').trim() === 'Check');
      if (b && !b.disabled) b.click();
      return true;
    })()`);
  const clickContinue = () =>
    evaluate(`(() => {
      const b = [...document.querySelectorAll('button')].find((x) =>
        (x.textContent ?? '').trim().startsWith('Continue') ||
        (x.textContent ?? '').trim() === 'Back to plan');
      if (!b || b.disabled) return false;
      b.click();
      return true;
    })()`);

  // Geometry probe over the UNGRADED board: tiles, session controls,
  // their row chrome, and the listening Play button when present.
  const probe = () =>
    evaluate(`(() => {
      const rb = (el) => {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        return {
          w: Math.round(r.width * 10) / 10,
          h: Math.round(r.height * 10) / 10,
          top: Math.round(r.top * 10) / 10,
          bottom: Math.round(r.bottom * 10) / 10,
          left: Math.round(r.left * 10) / 10,
          right: Math.round(r.right * 10) / 10,
          fontSize: cs.fontSize,
          borderTopWidth: cs.borderTopWidth,
          background: cs.backgroundColor,
          color: cs.color,
          text: (el.textContent ?? '').trim().slice(0, 24),
        };
      };
      const group = document.querySelector('[aria-label="Choices"]');
      if (!group) return null;
      if (![...group.querySelectorAll('button')].some((b) => !b.disabled)) return null;
      const groupRect = group.getBoundingClientRect();
      const tiles = [...group.querySelectorAll('button')].map(rb);
      const pause = document.querySelector('[data-session-pause]');
      const stop = document.querySelector('[data-session-stop]');
      if (!pause || !stop) return null;
      const controls = [pause, stop].map(rb);
      const row = stop.parentElement;
      const rowCs = getComputedStyle(row);
      const rowRect = row.getBoundingClientRect();
      const play = document.querySelector('button[aria-label="Play the audio"]');
      return {
        tiles,
        controls,
        row: {
          borderTopWidth: rowCs.borderTopWidth,
          gapTop: Math.round((rowRect.top - groupRect.bottom) * 10) / 10,
        },
        play: play ? rb(play) : null,
      };
    })()`);

  let board = null; // first ungraded choices board (tiles/controls checks)
  let audio = null; // first choices board that also carries the Play row
  for (let item = 0; item < 8 && !audio; item++) {
    await clickStartPracticing();
    let kind = null;
    for (let i = 0; i < 40 && !kind; i++) {
      kind = await runnerKind();
      if (!kind) await sleep(150);
    }
    console.log(`walk ${item}: kind=${kind}`);
    if (kind === "choices") {
      // Scroll so the board + session controls share the viewport shot.
      await evaluate(`(() => {
        const s = document.querySelector('[data-session-stop]');
        if (s) s.closest('.btn-row')?.scrollIntoView({ block: 'center' });
      })()`);
      const m = await probe();
      if (m) {
        if (!board) {
          board = m;
          await shot(`drill-choices-${TAG}`);
        }
        if (m.play) {
          audio = m;
          await shot(`drill-audio-${TAG}`);
          break;
        }
        // not a listening card: grade it and advance to the next activity.
        await evaluate(
          `document.querySelector('[aria-label="Choices"] button:not([disabled])').click()`,
        );
        for (let i = 0; i < 20; i++) {
          if (await clickContinue()) break;
          await sleep(150);
        }
      }
      continue;
    }
    if (kind === "typed") {
      await typeAndCheck();
      for (let i = 0; i < 20; i++) {
        if ((await evaluate(`!!document.querySelector('.verdict')`)) || (await clickContinue()))
          break;
        await sleep(150);
      }
    } else if (kind === "graded") {
      await clickContinue();
    }
  }
  if (!board) {
    const dump = await evaluate(`(() => ({
      buttons: [...document.querySelectorAll('button')].map((b) => (b.textContent ?? '').trim()).filter(Boolean).slice(0, 30),
      practice: !!document.querySelector('[aria-label="Practice"]'),
      verdict: !!document.querySelector('.verdict'),
      text: (document.body.innerText || '').slice(0, 500),
    }))()`);
    console.error("runner dump:", JSON.stringify(dump, null, 1));
    throw new Error("navigation error: no ungraded choices board appeared in the walk");
  }
  const m = audio ?? board;

  // ---- G1 tile height comfortably above the 44px floor. ----
  const tileHeights = m.tiles.map((t) => t.h);
  check(
    "G1 TILE-HEIGHT: every answer tile is taller than the 44px floor (>= 50px)",
    tileHeights.every((h) => h >= 50),
    { tileHeights },
  );

  // ---- G2 tiles span the content grid (dominant tappable objects). ----
  const tileWidths = m.tiles.map((t) => t.w);
  check(
    "G2 TILE-GRID: each answer tile spans the content grid (width >= 330 at 390vw)",
    tileWidths.every((w) => w >= 330),
    { tileWidths },
  );

  // ---- G3 session controls read quiet vs the tiles. ----
  const minTileH = Math.min(...tileHeights);
  const tileFs = Math.min(...m.tiles.map((t) => parseFloat(t.fontSize)));
  const controlFs = Math.max(...m.controls.map((c) => parseFloat(c.fontSize)));
  const controlsQuiet =
    m.controls.every((c) => minTileH - c.h >= 8) &&
    controlFs < tileFs &&
    m.controls.every((c) => c.background === "rgba(0, 0, 0, 0)");
  check(
    "G3 CONTROL-SECONDARY: controls are shorter (>=8px), smaller type, transparent fill vs tiles",
    controlsQuiet,
    {
      tileHeights,
      controlHeights: m.controls.map((c) => c.h),
      tileFontSize: m.tiles[0].fontSize,
      controlFontSize: m.controls[0].fontSize,
      controlBackgrounds: m.controls.map((c) => c.background),
    },
  );

  // ---- G4 the controls sit under a divider, separated from the tiles. ----
  check(
    "G4 SEPARATION: controls row carries a divider (border-top >= 1px) with >= 12px clearance",
    parseFloat(m.row.borderTopWidth) >= 1 && m.row.gapTop >= 12,
    m.row,
  );

  // ---- G5 the audio row aligns to the tiles' content grid. ----
  if (!audio) {
    check(
      "G5 AUDIO-GRID: the Play button's right edge aligns to the tiles' grid (within 2px)",
      false,
      { measured: "no listening Play button observed in the walk" },
    );
  } else {
    const tileRight = Math.max(...audio.tiles.map((t) => t.right));
    check(
      "G5 AUDIO-GRID: the Play button's right edge aligns to the tiles' grid (within 2px)",
      Math.abs(audio.play.right - tileRight) <= 2 &&
        Math.abs(audio.play.left - Math.min(...audio.tiles.map((t) => t.left))) <= 2,
      { play: audio.play, tileRight, tileLeft: Math.min(...audio.tiles.map((t) => t.left)) },
    );
  }

  // ---- G6 tap floor: demotion never breaks the 44px WCAG target. ----
  const floors = [
    ...m.tiles.map((t) => ({ what: t.text, h: t.h })),
    ...m.controls.map((c) => ({ what: c.text, h: c.h })),
  ];
  check(
    "G6 TAP-FLOOR: every tile and session control keeps >= 44px tap height",
    floors.every((f) => f.h >= 44),
    floors,
  );

  // ---- G7 hierarchy by border weight, not just size. ----
  const tileBorder = Math.min(...m.tiles.map((t) => parseFloat(t.borderTopWidth)));
  const controlBorder = Math.max(...m.controls.map((c) => parseFloat(c.borderTopWidth)));
  check(
    "G7 TILE-EMPHASIS: tiles carry a heavier border than the controls (tiles >= 2px, controls <= 1px)",
    tileBorder >= 2 && controlBorder <= 1,
    { tileBorder, controlBorder },
  );

  result.measured = m;
} catch (err) {
  result.error = String(err && err.message ? err.message : err);
  console.error("CAPTURE ERROR:", result.error);
  result.failures++;
} finally {
  writeFileSync(join(OUT, `audit-${TAG}.json`), JSON.stringify(result, null, 2) + "\n");
  if (chrome) chrome.kill();
  if (chromeDir) {
    try {
      rmSync(chromeDir, { recursive: true, force: true });
    } catch {
      // leaked profile dir — another lane may own a live one; leave it
    }
  }
  if (serve) serve.kill();
  console.log(
    `\n${result.checks.length - result.failures}/${result.checks.length} checks green -> ${join(OUT, `audit-${TAG}.json`)}`,
  );
  process.exit(result.failures ? 1 : 0);
}
