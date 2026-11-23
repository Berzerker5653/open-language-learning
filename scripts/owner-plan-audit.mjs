#!/usr/bin/env node
/**
 * ENCOUNTER-BEFORE-TEST-001 item 5: owner-profile plan audit (API read, no UI).
 *
 * Runs the lane's serve binary against the owner's LIVE data dir and reads
 * home_state for every non-hidden profile. For every letter (ru.orth.*) that
 * surfaces with a TEST reason (due-review / weak-skill), it confirms the
 * content is legitimately testable: its unit's lesson journey shows a scored
 * stage the learner has ACTED on (the U06 grandfather inference, read from
 * stage.done) — i.e. zero un-encountered tested letters. Read-only: this
 * script invokes no write command.
 */
import { spawn } from "node:child_process";
import { resolve } from "node:path";

const SERVE_BIN = resolve(process.env.SERVE_BIN ?? "");
const SERVE_DIST = resolve(process.env.SERVE_DIST ?? "");
const DATA_DIR = resolve(process.env.LTS_DATA ?? "");
if (!SERVE_BIN || !SERVE_DIST || !DATA_DIR) {
  console.error("SERVE_BIN, SERVE_DIST, LTS_DATA are required");
  process.exit(2);
}
const PORT = 17900 + (process.pid % 90);
const BASE = `http://127.0.0.1:${PORT}`;

const serve = spawn(SERVE_BIN, [`127.0.0.1:${PORT}`], {
  env: { ...process.env, LTS_DATA_DIR: DATA_DIR, LTS_SERVE_DIST: SERVE_DIST },
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

let code;
try {
  for (let i = 0; i < 80; i++) {
    try {
      const r = await fetch(`${BASE}/api/capabilities`);
      if (r.ok) break;
    } catch {
      // capabilities not up yet: retry next tick
    }
    await new Promise((r) => setTimeout(r, 250));
  }

  const profiles = await api("list_profiles", {});
  const list = Array.isArray(profiles.value) ? profiles.value : [];
  console.log(
    JSON.stringify(
      {
        probe: "list_profiles",
        status: profiles.status,
        profiles: list.map((p) => ({ id: p.id, name: p.display_name, hidden: p.hidden ?? false })),
      },
      null,
      2,
    ),
  );

  const report = [];
  for (const p of list) {
    if (p.hidden) continue;
    const home = await api("home_state", { profileId: p.id });
    if (home.status !== 200) {
      report.push({
        profile: p.id,
        name: p.display_name,
        error: `home_state ${home.status}`,
        value: home.value,
      });
      continue;
    }
    const items = home.value?.plan?.items ?? [];
    const testLetters = items.filter(
      (i) => i.content_id.startsWith("ru.orth.") && i.reason !== "progression",
    );
    const audited = [];
    for (const i of testLetters) {
      const lp = await api("lesson_plan", { profileId: p.id, contentId: i.content_id });
      const stages = lp.value?.stages ?? [];
      const acted = stages.some((s) => s.done && s.stage_kind !== "encounter");
      audited.push({
        content_id: i.content_id,
        reason: i.reason,
        unit: lp.value?.unit_id ?? null,
        scored_stage_acted: acted,
      });
    }
    const unencountered = audited.filter((a) => !a.scored_stage_acted);
    report.push({
      profile: p.id,
      name: p.display_name,
      plan_items: items.length,
      letter_test_rows: audited.length,
      unencountered_tested_letters: unencountered.length,
      detail: audited,
    });
  }
  console.log(JSON.stringify({ audit: report }, null, 2));
  const totalBad = report.reduce((n, r) => n + (r.unencountered_tested_letters ?? 0), 0);
  code = totalBad === 0 ? 0 : 1;
  console.log(`AUDIT verdict: unencountered tested letters = ${totalBad}`);
} catch (err) {
  console.error("audit failed:", String(err?.message ?? err));
  console.error("serve log tail:", serveLog.slice(-1500));
  code = 1;
} finally {
  serve.kill();
}
process.exit(code);
