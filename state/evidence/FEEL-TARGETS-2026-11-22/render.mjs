#!/usr/bin/env node
/**
 * FEEL-TARGETS-2026-11-22 render: screenshot each TARGET mockup at a
 * 390x844 phone viewport, fullPage. Tiny by design — same plumbing idea
 * as scripts/path-visual-capture.mjs but static local HTML, via the
 * npx-cached Playwright 1.65.1 (chromium-1228 already installed).
 *
 *   usage: node state/evidence/FEEL-TARGETS-2026-11-22/render.mjs
 */
import { chromium } from "/home/hunter/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs";
import { readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const DIR = resolve(import.meta.dirname);
const names = ["global-states", "drill", "my-words", "progress", "onboard", "settings"];
const browser = await chromium.launch({
  // banked browser build (revision 1228) predates this playwright's
  // default expectation (1255); an explicit path avoids a re-download.
  executablePath:
    "/home/hunter/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome",
  args: ["--no-sandbox"],
});
try {
  for (const name of names) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto(`file://${join(DIR, `${name}.html`)}`, { waitUntil: "networkidle" });
    await page.screenshot({ path: join(DIR, `${name}.png`), fullPage: true });
    await page.close();
  }
} finally {
  await browser.close();
}
for (const name of names) {
  const p = join(DIR, `${name}.png`);
  const s = statSync(p);
  console.log(`${name}.png ${s.size} bytes`);
}
