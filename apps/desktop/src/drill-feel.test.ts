import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * FEEL-DRILL-001 contract: the session/drill feel layer.
 *
 * FEEL-GLOBAL-001 shipped the tokens and the keyframe library; this card
 * spends them on the drill surfaces the owner's audit named (board card
 * body, oracle = state/evidence/FEEL-TARGETS-2026-11-22/drill.png): the
 * session bar easing to its new fraction, the correct pick revealing a
 * ring + check with a soft fill fade, the tapped/wrong/dimmed choice
 * states, real styling for the previously-unstyled .session-summary and
 * .session-panel cards, and per-question step dots in the embedded
 * runners. Same idiom as motion-contract.test.ts: pin RULE BODIES in the
 * single sheet plus the wiring that uses them; the live proof is
 * scripts/drill-feel-capture.mjs. Motion stays motion — no reward
 * mechanics anywhere (ADR-0002).
 */

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
const css = readFileSync(repoRoot + "packages/ui/src/styles.css", "utf8");
const appTsx = readFileSync(repoRoot + "apps/desktop/src/App.tsx", "utf8");
const chrome = readFileSync(repoRoot + "apps/desktop/src/session-chrome.tsx", "utf8");
const practice = readFileSync(repoRoot + "apps/desktop/src/practice.tsx", "utf8");

function ruleBody(selector: string): string {
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = new RegExp(`^\\s*${esc}\\s*\\{([^}]*)\\}`, "m").exec(css);
  expect(m, `styles.css must define a "${selector}" rule`).not.toBeNull();
  return (m![1] ?? "").replace(/\s+/g, " ").trim();
}

describe("FEEL-DRILL-001 session bar", () => {
  it("the bar fill eases its width over the slow token (mid-glide, not a snap)", () => {
    const body = ruleBody(".session-bar-fill");
    expect(body).toMatch(/transition:[^;]*width[^;]*var\(--dur-slow\)/);
    expect(body).toContain("var(--ease-out)");
  });
});

describe("FEEL-DRILL-001 graded-choice reveal", () => {
  it("the correct pick reveals a scaling ring + soft ok-soft fill at the fast token", () => {
    const body = ruleBody(".choice--correct");
    expect(body).toContain("var(--ok-soft)");
    expect(body).toMatch(/animation:[^;]*choice-reveal[^;]*var\(--dur-fast\)/);
    expect(css).toContain("@keyframes choice-reveal");
  });

  it("the reveal carries a check badge — state is ring + check, not color alone", () => {
    const badge = ruleBody(".choice--correct::after");
    expect(badge).toMatch(/content:[^;]*\\2713/);
    expect(badge).toContain("border-radius");
    expect(badge).toContain("var(--ok)");
  });

  it("a wrong tap shakes once; the tapped pick presses; the rest dim", () => {
    expect(css).toContain("@keyframes shake-x");
    const wrong = ruleBody(".choice--wrong");
    expect(wrong).toMatch(/animation:[^;]*shake-x[^;]*var\(--dur\)/);
    const tapped = ruleBody(".choice--tapped");
    expect(tapped).toMatch(/(transform|box-shadow|filter)/);
    const dim = ruleBody(".choice--dim");
    expect(dim).toMatch(/opacity:\s*0?\.\d+/);
  });

  it("practice.tsx marks reveal/tapped/wrong/dim and reveals on a correct pick too", () => {
    // The reveal no longer waits for a miss: graded + the right choice.
    expect(practice).toMatch(/p\.graded && choice === p\.correctChoice/);
    expect(practice).toContain("choice--tapped");
    expect(practice).toContain("choice--wrong");
    expect(practice).toContain("choice--dim");
  });
});

describe("FEEL-DRILL-001 end-of-session cards", () => {
  for (const sel of [".session-summary", ".session-panel"]) {
    it(`${sel} gains the calm warm card rules (they had none)`, () => {
      const body = ruleBody(sel);
      expect(body).toContain("background: var(--surface)");
      expect(body).toContain("border: 1px solid var(--line)");
      expect(body).toContain("border-radius: var(--radius)");
      expect(body).toMatch(/padding:\s*[\d.]+rem/);
      expect(body).toMatch(/animation:\s*card-in\s+var\(--dur\)/);
    });
  }
  it("the card-in keyframe is the fade + 0.98 to 1 scale from the mock legend", () => {
    const m = /@keyframes card-in\s*\{([\s\S]*?)\n\}/.exec(css);
    expect(m, "styles.css must define @keyframes card-in").not.toBeNull();
    const body = (m![1] ?? "").replace(/\s+/g, " ");
    expect(body).toContain("scale(0.98)");
    expect(body).toMatch(/opacity:\s*0/);
  });
});

describe("FEEL-DRILL-001 step dots in the embedded runners", () => {
  it("session-chrome.tsx exports the StepDots component (progress semantics, no reward words)", () => {
    expect(chrome).toContain("export function StepDots");
    expect(chrome).toContain("data-step-dots");
    // ADR-0002: dots mark position, they never score — scan the component
    // body itself (the file's header comment names the banned words to
    // say it abstains from them).
    const m = /export function StepDots[\s\S]*?\n\}/.exec(chrome);
    expect(m, "StepDots component body not found").not.toBeNull();
    expect((m![0] ?? "").toLowerCase()).not.toMatch(/\bxp\b|streak|points|badge|reward/);
  });
  it("both embedded runners render their dots — placement by question, kanji by stage", () => {
    expect(appTsx).toMatch(/<StepDots[^>]*placementItems\.length/);
    expect(appTsx).toMatch(/<StepDots[^>]*placementIdx/);
    expect(appTsx).toMatch(/<StepDots[^>]*kanjiStage/);
  });
});
