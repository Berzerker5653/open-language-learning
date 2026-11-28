#!/usr/bin/env node
/**
 * PACK-UPDATE-REPIN-001 acceptance capture (dev-only evidence tooling).
 *
 * Reproduces the owner dogfood incident (2026-11-22) exactly on the real
 * engine: serve mode over an isolated data dir, the dev-tree RU pack
 * installed (store row + `current` at 0.4.9), then the device is wound back
 * to the measured broken state — an extra 0.4.8 store row, a pack directory
 * at 0.4.8, and the profile's selection stranded at 0.4.8 while the
 * published catalogue pins 0.4.9. The Settings card must therefore show
 * "Update to v0.4.9" and NOT "installed (v0.4.9)".
 *
 * The click is a real browser click on the real card: it runs the shipped
 * install_catalog_pack path (early return: the store already holds the pin),
 * and the flow must FINISH the job itself — move the selection and re-render
 * the card to "installed (v0.4.9)" with the Update button gone. No manual
 * sqlite repair anywhere in the run.
 *
 * Machine-checked, not eyeballed: before/after of profile_pack_selections is
 * read back from sqlite, the catalogue join (the fact every surface reads)
 * is read via the API, and the DOM is queried for the badge/button.
 * Screenshots land next to result.json. Navigation errors ride into
 * result.json and fail the run (MOBILE-UX-001 lesson).
 *
 *   env: SERVE_BIN=<path> SERVE_DIST=<dist dir> [CHROME=<browser>]
 *   usage: node scripts/pack-update-repin-capture.mjs
 */
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const REPO = resolve(import.meta.dirname, "..");
const SERVE_BIN = resolve(process.env.SERVE_BIN ?? "");
const SERVE_DIST = resolve(process.env.SERVE_DIST ?? "");
for (const [name, p] of [
  ["SERVE_BIN", SERVE_BIN],
  ["SERVE_DIST", SERVE_DIST],
]) {
  if (!p || !resolve(p)) {
    console.error(`${name} is required`);
    process.exit(2);
  }
}
const OUT = join(REPO, "state/evidence/PACK-UPDATE-REPIN-001/capture");
mkdirSync(OUT, { recursive: true });

const PACK_ID = "org.openlanguage.ru-ru.reference";
const OLD = "0.4.8";
const NEW = "0.4.9"; // the published catalog pin at incident time
const PROFILE_NAME = "Rep Update";
const VW = 390;
const VH = 844;
const PORT = 17800 + (process.pid % 90);
const BASE = `http://127.0.0.1:${PORT}`;

const result = { checks: [], failures: 0, error: null };
const check = (name, pass, measured) => {
  result.checks.push({ name, pass, measured });
  if (!pass) result.failures++;
  console.log(`${pass ? "PASS" : "FAIL"} ${name} — ${JSON.stringify(measured)}`);
};

const dataDir = mkdtempSync(join(tmpdir(), "lts-repin-data-"));
const db = join(dataDir, "profiles.db");
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

const sql = (stmt) => {
  const r = spawnSync("sqlite3", [db, `PRAGMA busy_timeout=5000; ${stmt}`], {
    encoding: "utf8",
  });
  if (r.status !== 0) throw new Error(`sqlite: ${r.stderr.trim()}`);
  // The PRAGMA echoes its value as a row — strip it, the query's rows follow.
  const lines = r.stdout.split("\n").filter((l) => l.trim() !== "" && l.trim() !== "5000");
  return lines.join("\n").trim();
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const selection = (pid) =>
  sql(
    `SELECT version FROM profile_pack_selections WHERE profile_id='${pid}' AND pack_id='${PACK_ID}';`,
  );

let chrome = null;
let exitCode;
try {
  for (let i = 0; i < 120; i++) {
    try {
      const r = await fetch(`${BASE}/api/capabilities`);
      if (r.ok) break;
    } catch {
      /* keep polling until the serve responds */
    }
    await sleep(250);
  }

  // The pack lands engine-side at the dev-tree version (0.4.9): the same
  // install_pack command the browser itself uses, no bytes over HTTP.
  const imp = await api("install_pack", { packId: PACK_ID });
  if (imp.status !== 200) throw new Error(`install_pack failed: ${JSON.stringify(imp)}`);
  const prof = await api("create_profile", { displayName: PROFILE_NAME });
  if (prof.status !== 200) throw new Error(`create_profile failed: ${JSON.stringify(prof)}`);
  const profileId = prof.value?.id;
  if (!profileId) throw new Error(`create_profile returned no id: ${JSON.stringify(prof)}`);

  // Wind the device back to the measured broken state: a 0.4.8 store row,
  // hardlink the version directory, rewrite its manifest, strand the
  // selection at 0.4.8. This is seeding BEFORE the fix's flow runs — the
  // fix is exercised only by the browser click below.
  const packs = join(dataDir, "packs", PACK_ID);
  const cp = spawnSync("cp", ["-al", join(packs, NEW), join(packs, OLD)]);
  if (cp.status !== 0) throw new Error(`cp -al failed: ${cp.stderr}`);
  const mf = join(packs, OLD, "manifest.yaml");
  const text = readFileSync(mf, "utf8");
  const rewritten = text.replace(/\nversion: "0\.4\.9"/, '\nversion: "0.4.8"');
  if (rewritten === text) throw new Error("manifest version line not found — seed aborted");
  rmSync(mf); // break the hardlink before writing
  writeFileSync(mf, rewritten);
  const ts = new Date().toISOString();
  sql(
    `INSERT INTO pack_installations(pack_id, version, installed_at, trust_state)
     VALUES ('${PACK_ID}','${OLD}','${ts}','community');`,
  );
  sql(
    `INSERT INTO profile_pack_selections(profile_id, pack_id, version)
     VALUES ('${profileId}','${PACK_ID}','${OLD}');`,
  );

  // BEFORE facts (engine-level, no browser): the join Settings renders.
  result.beforeSelection = selection(profileId);
  check("seeded: profile selection is 0.4.8", result.beforeSelection === OLD, {
    selection: result.beforeSelection,
  });
  const catBefore = await api("catalog_packs", { profileId });
  const rowBefore = (catBefore.value?.entries ?? catBefore.value?.packs ?? []).find(
    (e) => e.pack_id === PACK_ID,
  );
  check(
    "seeded: catalogue join claims installed 0.4.8 against pin 0.4.9 (the incident fact)",
    rowBefore?.installed_version === OLD && rowBefore?.version === NEW,
    {
      installed: rowBefore?.installed_version,
      pin: rowBefore?.version,
      status: catBefore.value?.status,
    },
  );

  // ---- real app, real click ----
  const profileDir = mkdtempSync(join(tmpdir(), "lts-repin-chrome-"));
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
    await sleep(600);
  }
  const cardFacts = () =>
    evaluate(`(() => {
      // Two .pack-list sections live on Settings: 'Installed packs' first
      // (its RU row carries 'learning this language'), 'Community catalog'
      // second — the only one with the Update button / installed (vX) badge.
      const h2 = [...document.querySelectorAll('h2')].find((h) =>
        (h.textContent ?? '').includes('Community catalog'),
      );
      if (!h2) return { rowFound: false, buttons: [], badges: [], navError: 'no Community catalog heading' };
      let ul = h2.nextElementSibling;
      while (ul && !(ul.tagName === 'UL' && ul.classList.contains('pack-list')))
        ul = ul.nextElementSibling;
      if (!ul) return { rowFound: false, buttons: [], badges: [], navError: 'catalog list not rendered' };
      const rows = [...ul.querySelectorAll('li')];
      const row = rows.find((li) => (li.textContent ?? '').includes(${JSON.stringify(PACK_ID.replace("org.openlanguage.", ""))}) ||
        (li.textContent ?? '').includes('ussian'));
      const buttons = row ? [...row.querySelectorAll('button')].map((b) => (b.textContent ?? '').trim()) : [];
      const badges = row ? [...row.querySelectorAll('span.badge')].map((b) => (b.textContent ?? '').trim()) : [];
      return { rowFound: Boolean(row), buttons, badges };
    })()`);

  await send(
    "Emulation.setDeviceMetricsOverride",
    { width: VW, height: VH, deviceScaleFactor: 1, mobile: true },
    sessionId,
  );
  await send("Page.navigate", { url: `${BASE}/?v=repin` }, sessionId);

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
            if (n && (n.textContent ?? '').includes(${JSON.stringify(PROFILE_NAME)})) return true;
          }
          return false;
        });
      if (!el) return false;
      el.click();
      return true;
    })()`);
  }
  if (!resumed) throw new Error("navigation error: profile chooser never offered " + PROFILE_NAME);
  await sleep(700);
  // A stable healthy home before measuring (pack-claims flicker lesson).
  let healthy = 0;
  for (let i = 0; i < 40 && healthy < 3; i++) {
    await sleep(300);
    const okHome = await evaluate(
      `(() => document.body.innerText.includes('ussian') &&
        !document.body.innerText.includes('No language is set'))()`,
    );
    healthy = okHome ? healthy + 1 : 0;
  }
  if (healthy < 3) throw new Error("navigation error: home never settled with the RU pack");

  await clickByText("Settings");
  await sleep(800);
  const before = await cardFacts();
  check(
    "BEFORE card: 'Update to v0.4.9' button stands, no 'installed (v0.4.9)' badge",
    before.rowFound &&
      before.buttons.some((b) => b.includes("Update to v0.4.9")) &&
      !before.badges.some((b) => b.includes("v0.4.9")),
    before,
  );
  await send(
    "Page.captureScreenshot",
    { format: "png", captureBeyondViewport: true },
    sessionId,
  ).then((shot) =>
    writeFileSync(join(OUT, "settings-before.png"), Buffer.from(shot.data, "base64")),
  );

  // The owner's exact action: click Update. The engine sees the pin already
  // installed and must REPAIR the stranded selection itself, then the card
  // re-renders from the re-read.
  await clickByText("Update to v0.4.9");
  let after = null;
  for (let i = 0; i < 60; i++) {
    await sleep(500);
    after = await cardFacts();
    if (after.badges.some((b) => b.includes("installed (v0.4.9)"))) break;
  }
  check(
    "AFTER card: 'installed (v0.4.9)' badge rendered by the flow itself",
    after.badges.some((b) => b.includes("installed (v0.4.9)")),
    after,
  );
  check(
    "AFTER card: no Update button remains (no silent second click ahead)",
    !after.buttons.some((b) => b.includes("Update to v")),
    after,
  );
  await send(
    "Page.captureScreenshot",
    { format: "png", captureBeyondViewport: true },
    sessionId,
  ).then((shot) =>
    writeFileSync(join(OUT, "settings-after.png"), Buffer.from(shot.data, "base64")),
  );

  result.afterSelection = selection(profileId);
  check(
    "profile_pack_selections before/after: 0.4.8 -> 0.4.9 with NO manual repair",
    result.beforeSelection === OLD && result.afterSelection === NEW,
    { before: result.beforeSelection, after: result.afterSelection },
  );
  const catAfter = await api("catalog_packs", { profileId });
  const rowAfter = (catAfter.value?.entries ?? catAfter.value?.packs ?? []).find(
    (e) => e.pack_id === PACK_ID,
  );
  check(
    "AFTER catalogue join: installed_version reads 0.4.9",
    rowAfter?.installed_version === NEW,
    {
      installed: rowAfter?.installed_version,
    },
  );
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
