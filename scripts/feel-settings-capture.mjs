#!/usr/bin/env node
/**
 * FEEL-SETTINGS-001 acceptance capture (dev-only evidence tooling).
 *
 * Same plumbing as scripts/feel-progress-capture.mjs (real engine: lts-serve
 * over an isolated data dir, headless Chrome, raw CDP — no new deps). The
 * audit hole is DESKTOP (UA-default selects inside designed cards), so the
 * primary pass runs at a desktop viewport, 1280x900 — the first FEEL capture
 * to deliberately NOT use the phone frame. A short second pass at 390x844
 * re-proves the phone-width select rule survives (no document h-scroll,
 * selects ride the column).
 *
 * What is measured live (no fakes at all — Settings reads are six real
 * engine calls): contents chips per visible card (RU pack renders no
 * Romaji/Kana cards, serve mode renders the LAN card), the restyled select
 * computed styles, a REAL keyboard Tab walk onto a select (the honest way to
 * reach :focus-visible) measuring the accent border + accent-soft halo, a
 * disclosure opened by a real click (open attribute, chevron transform on
 * the pseudo, body animation name/duration), and a chip click that moves
 * the scroll to the About-this-build card landing BELOW the sticky header
 * without touching location.hash (the screen router stays intact).
 *
 * The RED-vs-GREEN diff of this script's result.json is the card's proof.
 *
 *   usage: SERVE_BIN=<path> SERVE_DIST=<dist dir> \
 *          node scripts/feel-settings-capture.mjs
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
  if (!existsSync(p)) {
    console.error(`${name} not found: ${p}`);
    process.exit(2);
  }
}
const REPO = resolve(import.meta.dirname, "..");
const OUT = resolve(process.env.OUT_DIR ?? join(REPO, "state/evidence/FEEL-SETTINGS-001"));
mkdirSync(OUT, { recursive: true });
const PACK_ID = "org.openlanguage.ru-ru.reference";
const PROFILE = "Feel Settings";
const PORT = 17900 + (process.pid % 60);
const BASE = `http://127.0.0.1:${PORT}`;

const result = { checks: [], failures: 0 };
const check = (name, pass, measured) => {
  result.checks.push({ name, pass, measured });
  if (!pass) result.failures++;
  console.log(`${pass ? "PASS" : "FAIL"} ${name} — ${JSON.stringify(measured)}`);
};

const dataDir = mkdtempSync(join(tmpdir(), "lts-feel-settings-data-"));
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
      // not up yet
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

  const profileDir = mkdtempSync(join(tmpdir(), "lts-feel-settings-chrome-"));
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
  async function shot(name, viewportOnly = true) {
    const s = await send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: !viewportOnly,
    });
    writeFileSync(join(OUT, `${name}.png`), Buffer.from(s.data, "base64"));
  }
  const clickByLabel = (label) =>
    evaluate(`(() => {
      const el = [...document.querySelectorAll('button, a')].find((b) =>
        (b.textContent ?? '').trim() === ${JSON.stringify(label)});
      if (!el) return false;
      el.scrollIntoView({ block: 'center' });
      el.click();
      return true;
    })()`);

  async function enterApp(url) {
    await send("Page.navigate", { url });
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
    for (let i = 0; i < 80 && healthy < 3; i++) {
      healthy = (await homeHealthy()) ? healthy + 1 : 0;
      await sleep(250);
    }
    if (healthy < 3) throw new Error("home never went stable-healthy");
  }

  // ------------------------------------------------------------- desktop pass
  await send("Emulation.setDeviceMetricsOverride", {
    width: 1280,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });

  await enterApp(`${BASE}/?v=st-d`);
  if (!(await clickByLabel("Settings"))) throw new Error("nav: Settings tab never appeared");
  let onSettings = false;
  for (let i = 0; i < 60 && !onSettings; i++) {
    onSettings = await evaluate("!!document.querySelector('section[aria-label=\"Settings\"]')");
    if (!onSettings) await sleep(250);
  }
  if (!onSettings) throw new Error("navigation error: settings screen never rendered");
  // FEEL-LOADING-001 prime reads: settle before measuring (stable home rule).
  await sleep(900);
  await shot("settings-desk-before", true);

  // 1) contents row
  const contents = await evaluate(`(() => {
    const nav = document.querySelector('nav[aria-label="Settings sections"]');
    if (!nav) return { present: false };
    const chips = [...nav.querySelectorAll('button.contents-chip')];
    const labels = chips.map((b) => (b.textContent ?? '').trim());
    const anchors = [...document.querySelectorAll('[data-settings-anchor]')].map((e) =>
      e.getAttribute('data-settings-anchor'));
    const small = chips.filter((b) => b.getBoundingClientRect().height < 44).length;
    return {
      present: true, labels, anchors, shortChips: small,
      romajiChip: labels.includes('Romaji'), kanaChip: labels.includes('Kana keyboard'),
      lanChip: labels.includes('Local network'),
    };
  })()`);
  check(
    "CONTENTS: one chip per visible card (RU pack hides romaji/kana; serve shows LAN) and anchors match",
    contents.present &&
      contents.shortChips === 0 &&
      !contents.romajiChip &&
      !contents.kanaChip &&
      contents.lanChip &&
      [
        "Microphone",
        "Profile data",
        "Speech",
        "Speech runtimes",
        "Local network",
        "About this build",
      ].every((l) => contents.labels.includes(l)) &&
      [
        "settings-mic",
        "settings-profile",
        "settings-speech",
        "settings-runtimes",
        "settings-lan",
        "settings-build",
      ].every((a) => contents.anchors.includes(a)) &&
      !contents.anchors.includes("settings-romaji"),
    contents,
  );

  // 2) the audit hole: selects are styled on the DESKTOP, chevron drawn
  const selects = await evaluate(`(() => {
    const out = [];
    for (const id of ['mic-device', 'speech-model']) {
      const el = document.getElementById(id);
      if (!el) { out.push({ id, missing: true }); continue; }
      const s = getComputedStyle(el);
      out.push({
        id,
        appearance: s.appearance,
        chevron: (s.backgroundImage ?? '').includes('data:image/svg'),
        border: s.borderTopWidth + ' ' + s.borderTopStyle + ' ' + s.borderTopColor,
        radius: s.borderTopLeftRadius,
        padRight: s.paddingRight,
        bg: s.backgroundColor,
      });
    }
    return out;
  })()`);
  check(
    "SELECTS: desktop selects lose UA chrome - appearance none, drawn chevron, surface fill, line-strong border, radius token, chevron padding",
    selects.length === 2 &&
      selects.every(
        (s) =>
          !s.missing &&
          s.appearance === "none" &&
          s.chevron &&
          s.border === "1px solid rgb(201, 190, 171)" &&
          s.radius === "6px" &&
          s.bg === "rgb(255, 253, 249)",
      ) &&
      selects.every((s) => parseFloat(s.padRight) >= 24),
    selects,
  );

  // 3) keyboard focus frame: a REAL Tab walk (the honest route to
  //    :focus-visible) until a select is focused, then the halo measured.
  let focusedId = null;
  for (let i = 0; i < 80 && !focusedId; i++) {
    await send("Input.dispatchKeyEvent", {
      type: "keyDown",
      key: "Tab",
      code: "Tab",
      windowsVirtualKeyCode: 9,
    });
    await send("Input.dispatchKeyEvent", {
      type: "keyUp",
      key: "Tab",
      code: "Tab",
      windowsVirtualKeyCode: 9,
    });
    focusedId = await evaluate(`(() => {
      const a = document.activeElement;
      return a && a.tagName === 'SELECT' ? a.id : null;
    })()`);
  }
  // the halo TRANSITIONS in over --dur-fast — measure once it has landed,
  // not mid-glide (the computed value interpolates).
  await sleep(350);
  const halo = focusedId
    ? await evaluate(`(() => {
        const s = getComputedStyle(document.activeElement);
        return {
          id: document.activeElement.id,
          border: s.borderTopColor,
          shadow: s.boxShadow,
          outline: s.outlineWidth + ' ' + s.outlineStyle,
          transition: s.transitionProperty,
        };
      })()`)
    : { id: null };
  check(
    "FOCUS: Tab-focus on a select puts the accent border + 3px accent-soft halo (plus the global outline) on it",
    halo.id != null &&
      halo.border === "rgb(20, 97, 94)" &&
      /rgb\(226, 238, 235\)\s+0px 0px 0px 3px/.test(halo.shadow ?? "") &&
      halo.outline.startsWith("2px solid"),
    { focusedId, ...halo },
  );

  // 4) disclosure motion: a real click opens it; chevron turns, body reveals
  const closed = await evaluate(`(() => {
    const d = document.querySelector('details.prose-note');
    if (!d) return { present: false };
    const sm = getComputedStyle(d.querySelector('summary'));
    const before = getComputedStyle(d.querySelector('summary'), '::before');
    return {
      present: true, open: d.open, marker: sm.listStyleType,
      chevron: (before.backgroundImage ?? '').includes('data:image/svg'),
      beforeTransform: before.transform,
    };
  })()`);
  const clicked = await evaluate(`(() => {
    const d = document.querySelector('details.prose-note');
    if (!d) return false;
    d.querySelector('summary').click();
    return true;
  })()`);
  // chevron rotation glides over --dur (250ms) — measure after it lands
  await sleep(450);
  const opened = await evaluate(`(() => {
    const d = document.querySelector('details.prose-note');
    if (!d) return { open: false };
    const before = getComputedStyle(d.querySelector('summary'), '::before');
    const p = d.querySelector('p');
    const ps = p ? getComputedStyle(p) : {};
    return {
      open: d.open,
      beforeTransform: before.transform,
      animName: ps.animationName ?? null,
      animDur: ps.animationDuration ?? null,
      animEase: ps.animationTimingFunction ?? null,
    };
  })()`);
  check(
    "DISCLOSURE: real click opens - UA marker hidden, drawn chevron rotates 180deg, body reveals via disclosure-reveal over 0.25s ease-out",
    clicked &&
      closed.present &&
      !closed.open &&
      closed.marker === "none" &&
      closed.chevron &&
      (closed.beforeTransform === "none" ||
        closed.beforeTransform === "matrix(1, 0, 0, 1, 0, 0)") &&
      opened.open &&
      opened.beforeTransform === "matrix(-1, 0, 0, -1, 0, 0)" &&
      opened.animName === "disclosure-reveal" &&
      opened.animDur === "0.25s" &&
      opened.animEase.startsWith("cubic-bezier"),
    { closed, opened },
  );

  // 5) chip jump: real click moves the scroll; lands below the sticky header;
  //    location.hash untouched (the screen router is not routed).
  const hashBefore = await evaluate("location.hash");
  const jumped = await evaluate(`(() => {
    // a MID-page target: the last card cannot reach its scroll offset
    // because the document bottom stops the scroll — measuring it would
    // measure page length, not the jump.
    const chip = [...document.querySelectorAll('button.contents-chip')]
      .find((b) => (b.textContent ?? '').trim() === 'Speech');
    if (!chip) return { found: false };
    chip.scrollIntoView({ block: 'center' });
    chip.click();
    return { found: true };
  })()`);
  let land = null;
  for (let i = 0; i < 40 && !land; i++) {
    await sleep(150);
    land = await evaluate(`(() => {
      const card = document.getElementById('settings-speech');
      if (!card) return null;
      const r = card.getBoundingClientRect();
      const header = document.querySelector('header');
      const hb = header ? header.getBoundingClientRect().bottom : 0;
      // settle: within 60px of its scroll-margin landing and below the header
      if (r.top < hb - 2 || r.top > hb + 200) return { settling: true, top: r.top, hb };
      return { settled: true, top: Math.round(r.top), hb: Math.round(hb), scrollY: Math.round(window.scrollY) };
    })()`);
    if (land && land.settling) land = null;
  }
  const hashAfter = await evaluate("location.hash");
  const stillSettings = await evaluate(
    "!!document.querySelector('section[aria-label=\"Settings\"]')",
  );
  check(
    "JUMP: the Speech chip scrolls the page below the sticky header without touching location.hash",
    jumped.found &&
      land &&
      land.settled &&
      land.scrollY > 0 &&
      hashAfter === hashBefore &&
      stillSettings,
    { hashBefore, hashAfter, land },
  );

  await shot("settings-desk-after", false);

  // ------------------------------------------------------------- phone pass
  // The phone-width select rule must SURVIVE the new top-level rule: no
  // document h-scroll at 390px and the select rides the column.
  await send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await send("Page.navigate", { url: `${BASE}/?v=st-m` });
  for (let i = 0; i < 80; i++) {
    await sleep(250);
    const resumed = await evaluate(`(() => {
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
    if (resumed) break;
  }
  await sleep(1200);
  await clickByLabel("Settings");
  await sleep(900);
  const phone = await evaluate(`(() => {
    const de = document.documentElement;
    const sel = document.getElementById('speech-model');
    const r = sel ? sel.getBoundingClientRect() : null;
    return {
      scrollW: de.scrollWidth,
      clientW: de.clientWidth,
      selWidth: r ? Math.round(r.width) : null,
      selHeight: r ? Math.round(r.height) : null,
    };
  })()`);
  check(
    "PHONE: selects still ride the column at 390px - no document h-scroll, full-width select, 44px floor",
    phone.scrollW <= phone.clientW + 1 &&
      phone.selWidth !== null &&
      phone.selWidth <= 390 &&
      phone.selHeight >= 44,
    phone,
  );
  await shot("settings-phone-after", false);

  result.summary = `${result.checks.length - result.failures}/${result.checks.length} checks passed`;
  writeFileSync(join(OUT, "result.json"), JSON.stringify(result, null, 2) + "\n");
  console.log(`\nRESULT: ${result.summary}`);
  if (result.failures > 0) process.exitCode = 1;
} finally {
  if (chrome) chrome.kill();
  if (serve) serve.kill();
  for (const dir of [dataDir, chromeDir]) {
    if (!dir) continue;
    try {
      const { rmSync } = await import("node:fs");
      rmSync(dir, { recursive: true, force: true });
    } catch {
      // best-effort
    }
  }
}
