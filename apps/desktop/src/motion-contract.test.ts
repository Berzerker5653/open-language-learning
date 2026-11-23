import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * FEEL-GLOBAL-001 contract: the whole-app motion foundation.
 *
 * The audit (docs/design/PROGRESSION-UX-AUDIT-2026-11-22.md) found the app
 * outside the journey carrying zero motion language; this test pins the
 * GLOBAL layer that closes that gap: duration/easing/spacing/z-index tokens,
 * the four-keyframe library, :active pressed states, transitions on the
 * shared classes, the gliding tab underline, and smooth route scroll.
 *
 * Like button-affordance.test.ts this pins RULE BODIES in the single sheet
 * (packages/ui/src/styles.css) — the live-computed proof is the real-engine
 * capture (scripts/feel-global-capture.mjs); this file makes regressions
 * cheap and blameless. The motion budget pin keeps every duration inside
 * the calm-but-warm family (120-300ms; only named *pulse* loops run longer)
 * and motion stays motion — no reward mechanics (ADR-0002).
 */

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
const css = readFileSync(repoRoot + "packages/ui/src/styles.css", "utf8");
const appTsx = readFileSync(repoRoot + "apps/desktop/src/App.tsx", "utf8");

function ruleBody(selector: string): string {
  // match a rule for exactly this selector, at top level OR inside @media
  // (media-query bodies are indented, so the anchor tolerates leading spaces)
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = new RegExp(`^\\s*${esc}\\s*\\{([^}]*)\\}`, "m").exec(css);
  expect(m, `styles.css must define a "${selector}" rule`).not.toBeNull();
  // whitespace-normalized: prettier may wrap long declarations, and CI
  // fmt:check owns that formatting — the assertion is about the declaration.
  return (m![1] ?? "").replace(/\s+/g, " ").trim();
}

describe("FEEL-GLOBAL-001 token layer", () => {
  it(":root carries the duration + easing scale (motion legend family)", () => {
    const root = ruleBody(":root");
    expect(root).toContain("--dur-fast: 120ms");
    expect(root).toContain("--dur: 250ms");
    expect(root).toContain("--dur-slow: 300ms");
    expect(root).toMatch(/--ease-out:\s*cubic-bezier/);
    expect(root).toMatch(/--ease-spring:\s*cubic-bezier/);
  });

  it(":root carries a spacing scale and a named z-index scale", () => {
    const root = ruleBody(":root");
    for (const step of [1, 2, 3, 4, 5, 6]) {
      expect(root, `--space-${step} missing`).toMatch(new RegExp(`--space-${step}:\\s*[\\d.]+rem`));
    }
    expect(root).toContain("--z-header: 10");
    expect(root).toContain("--z-skip: 20");
    expect(root).toContain("--z-bubble: 40");
    expect(root).toContain("--z-word-card: 45");
  });

  it("global stacking layers ride the z tokens, not literals", () => {
    expect(css).toContain("z-index: var(--z-skip)");
    expect(css).toContain("z-index: var(--z-header)");
    expect(css).toContain("z-index: var(--z-bubble)");
    expect(css).toContain("z-index: var(--z-word-card)");
    // the global literals are gone from the sheet (a local path z-index: 1
    // is relative stacking inside the path, not a global layer)
    for (const dead of [/z-index:\s*10;/, /z-index:\s*20;/, /z-index:\s*40;/, /z-index:\s*45;/]) {
      expect(css, `z-index literal must ride a token: ${dead}`).not.toMatch(dead);
    }
  });
});

describe("FEEL-GLOBAL-001 keyframe library", () => {
  for (const name of ["fade-up", "slide-up", "pop", "pulse-soft"]) {
    it(`@keyframes ${name} exists`, () => {
      expect(css, `@keyframes ${name} missing`).toMatch(new RegExp(`@keyframes\\s+${name}\\s*\\{`));
    });
  }

  it("entering feedback surfaces ride fade-up (notices, verdict, bridge)", () => {
    for (const sel of [".notice", ".alert", ".verdict", ".session-bridge"]) {
      expect(ruleBody(sel), `${sel} must enter via fade-up`).toContain(
        "animation: fade-up var(--dur) var(--ease-out)",
      );
    }
  });

  it("the choice ring arrives with pop, the mobile word-card sheet slides up", () => {
    expect(ruleBody(".choice--correct")).toContain("animation: pop var(--dur) var(--ease-out)");
    expect(ruleBody(".word-card")).toContain("animation: slide-up var(--dur-slow) var(--ease-out)");
  });

  it("the review-due marker breathes pulse-soft (calm attention, never a nag)", () => {
    expect(ruleBody(".path-node--review-due .path-node-marker")).toContain(
      "animation: pulse-soft 2.4s var(--ease-in-out) infinite",
    );
  });

  it("the fade-up rise is the 12px the motion legend specifies", () => {
    const m = /@keyframes\s+fade-up\s*\{[^}]*?from\s*\{([^}]*)\}/.exec(css);
    expect(m).not.toBeNull();
    expect(m![1]).toContain("translateY(0.75rem)"); // 12px
  });
});

describe("FEEL-GLOBAL-001 pressed states", () => {
  it("every shared control class has a :active press", () => {
    const presses: [string, string][] = [
      [".btn:not(:disabled):active", "transform: translateY(2px)"],
      [".btn--primary:not(:disabled):active", "background: var(--accent-ink)"],
      [".tab:active", "transform: translateY(1px)"],
      [".seg-btn:active", "transform: translateY(1px)"],
      [".card:active", "transform: translateY(1px)"],
      [".profile-card:active", "transform: translateY(1px)"],
    ];
    for (const [sel, body] of presses) {
      expect(ruleBody(sel), `${sel} must press with ${body}`).toContain(body);
    }
  });

  it("press darkening stays one-accent via filter, never a new color token", () => {
    expect(ruleBody(".btn--primary:not(:disabled):active")).toContain("filter: brightness");
    expect(css).not.toMatch(/--[a-z-]*(press|shadow-accent)[a-z-]*:\s*#/);
  });

  it("shared classes carry transitions so states move, not snap", () => {
    for (const sel of [".btn", ".tab", ".seg-btn", ".card", ".profile-card", ".word"]) {
      expect(ruleBody(sel), `${sel} needs a transition`).toMatch(/transition:/);
    }
  });
});

describe("FEEL-GLOBAL-001 gliding tab underline", () => {
  it(".routes wears a sliding ::after indicator driven by measured vars", () => {
    expect(ruleBody(".routes")).toContain("position: relative");
    const after = ruleBody(".routes::after");
    expect(after).toContain("width: var(--tab-w, 0px)");
    expect(after).toContain("transform: translateX(var(--tab-x, 0px))");
    expect(after).toContain("opacity: var(--tab-live, 0)");
    expect(after).toContain(
      "transition: transform var(--dur) var(--ease-out), width var(--dur) var(--ease-out)",
    );
  });

  it("while the indicator is live the per-tab border steps aside", () => {
    const glide = ruleBody('.routes--glides .tab[aria-current="page"]');
    expect(glide).toContain("border-bottom-color: transparent");
  });

  it("App.tsx measures the active tab and smooth-scrolls route resets", () => {
    expect(appTsx).toContain('"--tab-x"');
    expect(appTsx).toContain('"--tab-live"');
    expect(appTsx).toContain("routes--glides");
    expect(appTsx).toContain('window.scrollTo({ top: 0, behavior: "smooth" })');
  });
});

describe("FEEL-GLOBAL-001 motion budget + safety", () => {
  it("no animation/transition exceeds 300ms except named *pulse* loops", () => {
    const decls = css.match(/(?:^|[\s;])(?:animation|transition):[^;]*;/gm) ?? [];
    expect(decls.length).toBeGreaterThan(10); // sanity: the sheet really moves
    for (const d of decls) {
      for (const s of d.match(/(\d+(?:\.\d+)?)s\b/g) ?? []) {
        const secs = parseFloat(s);
        if (secs <= 0.31) continue;
        expect(d, `over budget: ${d.trim()}`).toMatch(/pulse/);
      }
    }
  });

  it("the reduced-motion kill-switch still flattens everything", () => {
    expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
    expect(css).toContain("transition-duration: 0.01ms !important");
    expect(css).toContain("animation-duration: 0.01ms !important");
    expect(css).toContain("scroll-behavior: auto !important");
  });
});
