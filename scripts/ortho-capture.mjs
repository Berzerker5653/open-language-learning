#!/usr/bin/env node
/**
 * ORTHO-LETTER-UNITS-001 evidence capture (dev-only tooling).
 *
 * Proves the on-ramp letter list renders ONE row per letter with both
 * printed forms visible ("А а"), end-to-end: the real app frontend against
 * lts-serve backed by the real engine installing the RU pack from the repo
 * tree (fresh LTS_DATA_DIR, nothing of the owner's profiles touched).
 *
 * Walks onboarding (create profile -> install RU -> continue), opens the
 * "Printed Cyrillic" lesson, then MEASURES the encounter rows: row count
 * and per-row text ride into an audit JSON next to the screenshot; the
 * script fails (exit 1) if any section still carries per-case rows or the
 * words "uppercase"/"lowercase" leak into a row.
 *
 *   LTS_DATA_DIR=/tmp/x cargo run -p lts-desktop --bin lts-serve 127.0.0.1:<port>
 *   LTS_SERVE_DIST=... node scripts/ortho-capture.mjs <out-dir> [url]
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const OUT = resolve(process.argv[2] ?? "state/evidence/ORTHO-LETTER-UNITS-001");
const URL0 = process.argv[3] ?? "http://127.0.0.1:17626/";
mkdirSync(OUT, { recursive: true });

const { spawn } = await import("node:child_process");
const chrome = spawn(
  process.env.CHROME ?? "google-chrome-stable",
  [
    "--headless=new",
    "--no-sandbox",
    "--disable-gpu",
    "--remote-debugging-port=0",
    "--user-data-dir=/tmp/lts-ortho-capture-profile",
  ],
  { stdio: ["ignore", "pipe", "pipe"] },
);
let wsUrl = null;
chrome.stderr.on("data", (c) => {
  const m = /DevTools listening on (ws:\/\/\S+)/.exec(c.toString());
  if (m) wsUrl = m[1];
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (let i = 0; !wsUrl && i < 100; i++) await sleep(100);
if (!wsUrl) {
  console.error("chrome: no DevTools URL");
  chrome.kill();
  process.exit(2);
}

const ws = new WebSocket(wsUrl);
await new Promise((res, rej) => {
  ws.onopen = res;
  ws.onerror = rej;
});
let nextId = 1;
const pending = new Map();
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    const { res, rej } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) rej(new Error(JSON.stringify(msg.error)));
    else res(msg.result);
  }
};
const send = (method, params = {}, sessionId) =>
  new Promise((res, rej) => {
    const id = nextId++;
    pending.set(id, { res, rej });
    ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
  });

const page = await send("Target.createTarget", { url: URL0 });
const session = await send("Target.attachToTarget", { targetId: page.targetId, flatten: true });
const sid = session.sessionId;
const call = (m, p) => send(m, p, sid);
await call("Page.enable");
await call("Runtime.enable");
await call("Emulation.setDeviceMetricsOverride", {
  width: 1600,
  height: 1000,
  deviceScaleFactor: 1,
  mobile: false,
});

const js = async (expr) => {
  const r = await call("Runtime.evaluate", {
    expression: expr,
    returnByValue: true,
    awaitPromise: true,
  });
  if (r.exceptionDetails)
    throw new Error(r.exceptionDetails.exception?.description ?? "page eval error");
  return r.result.value;
};
const has = (sel) => js(`!!document.querySelector(${JSON.stringify(sel)})`);
const text = () => js("document.body.innerText");
async function clickText(label, { timeoutMs = 30000 } = {}) {
  const t0 = Date.now();
  for (;;) {
    const ok = await js(`(() => {
      const els = [...document.querySelectorAll("button, a")];
      const hit = els.find((e) => ((e.textContent ?? "") + " " + (e.getAttribute("aria-label") ?? "")).includes(${JSON.stringify(label)}));
      if (!hit) return false;
      hit.click();
      return true;
    })()`);
    if (ok) {
      await sleep(600);
      return;
    }
    if (Date.now() - t0 > timeoutMs) {
      const seen = await js(
        '(() => [...document.querySelectorAll("button, a")].map((e)=>(e.textContent??"").trim()).filter(Boolean).join(" | "))',
      );
      throw new Error(`no control carrying "${label}" (saw: ${seen})`);
    }
    await sleep(300);
  }
}

// 1. Onboarding: profile -> install the bundled RU pack -> continue.
await sleep(1200);
const already = await js(`(() => {
  const row = [...document.querySelectorAll("button")].find((e) => (e.textContent ?? "").trim() === "Continue");
  if (!row) return false;
  row.click();
  return true;
})()`);
if (!already) {
  for (let i = 0; !(await has("#profile-name")) && i < 20; i++) await sleep(500);
  await js(`(() => {
  const el = document.querySelector("#profile-name");
  const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
  set.call(el, "Katya");
  el.dispatchEvent(new Event("input", { bubbles: true }));
})()`);
  await clickText("Create local profile");
  await js(`(() => {
  const radios = [...document.querySelectorAll("input[name=pack], input[type=radio]")];
  const hit = radios.find((r) => ((r.closest("label")?.textContent) ?? "").match(/Russian|русск/i));
  if (!hit) throw new Error("RU pack not offered in onboarding");
  hit.click();
  if (!hit.checked) throw new Error("RU radio did not take the click");
})()`);
  await clickText("Install");
  // Wait for the install to actually land before continuing (the archive is
  // built from the repo tree; the button only settles once it has).
  {
    const t0 = Date.now();
    for (;;) {
      const stillInstall = await js(
        `(() => [...document.querySelectorAll("button")].some((e) => (e.textContent ?? "").trim() === "Install"))()`,
      );
      if (!stillInstall) break;
      if (Date.now() - t0 > 120000)
        throw new Error("install never finished: " + (await text()).slice(0, 400));
      await sleep(1000);
    }
  }
  await clickText("Continue", { timeoutMs: 30000 });
  if (await has("button")) {
    const t = await text();
    if (t.includes("Skip for now")) await clickText("Skip for now");
  }
}

// 2. Today: open the printed-Cyrillic on-ramp lesson (resume chip first if shown).
const resume = await js(`(() => {
  const hit = [...document.querySelectorAll("button")].find((e) => (e.textContent ?? "").trim() === "Continue");
  if (!hit) return false;
  hit.click();
  return true;
})()`);
if (resume) await sleep(900);
let opened = await has('[aria-label="Meet something new"]');
if (!opened) {
  for (let i = 0; i < 40 && !opened; i++) {
    opened = await js(`(() => {
      const hit = [...document.querySelectorAll("button, a")].find((e) => (e.textContent ?? "").includes("Printed Cyrillic"));
      if (!hit) return false;
      hit.click();
      return true;
    })()`);
    if (opened) break;
    await sleep(500);
  }
}
if (!opened) {
  const seen = await js(
    'JSON.stringify([...document.querySelectorAll("button, a")].map((e)=>(e.textContent??"").trim()).filter(Boolean))',
  );
  const body = await js("document.body.innerText.slice(0, 3000)");
  throw new Error(`no lesson entry found on Today (buttons: ${seen}) (body: ${body})`);
}

// 3. The lesson view: wait for the encounter section, then MEASURE rows.
for (let i = 0; !(await has('[aria-label="Meet something new"]')) && i < 30; i++) await sleep(500);
const audit = await js(`(() => {
  const sections = [...document.querySelectorAll('section[aria-label], div[aria-label]')]
    .map((s) => ({ label: s.getAttribute("aria-label"), items: [...s.querySelectorAll("li, [data-content]")] }))
    .filter((s) => s.items.length && s.label);
  return {
    title: document.querySelector("h1,h2")?.textContent?.trim() ?? null,
    sections,
    rowTexts: sections.map((s) => ({ label: s.label, rows: s.items.map((li) => (li.textContent ?? "").trim().replace(/\\s+/g, " ")) })),
    caseWords: /uppercase|lowercase/i.test(document.body.innerText),
  };
})()`);
const encounter = audit.rowTexts.find((s) => s.label === "Meet something new");
const problems = [];
if (!encounter) problems.push("no encounter section rows measured");
else {
  if (encounter.rows.length !== 4)
    problems.push(`encounter shows ${encounter.rows.length} rows, expected 4`);
  if (!encounter.rows.some((r) => r.includes("А а")))
    problems.push(`no row shows both forms "А а": ${JSON.stringify(encounter.rows)}`);
}
if (audit.caseWords)
  problems.push("the words uppercase/lowercase still appear on screen (per-case rows)");

const shot = await call("Page.captureScreenshot", { format: "png" });
writeFileSync(`${OUT}/after-encounter-four-rows.png`, Buffer.from(shot.data, "base64"));
writeFileSync(`${OUT}/capture-audit.json`, JSON.stringify({ url: URL0, audit, problems }, null, 2));
console.log(
  JSON.stringify(
    {
      sections: audit.rowTexts.map((s) => ({ label: s.label, n: s.rows.length })),
      firstRows: encounter?.rows?.slice(0, 2),
      problems,
    },
    null,
    2,
  ),
);
chrome.kill();
ws.close();
if (problems.length) {
  console.error("CAPTURE GATE FAILED:", problems.join("; "));
  process.exit(1);
}
console.log("ORTHO-CAPTURE OK");
