/**
 * PHONE-NAV-WRAP-001 — the phone chrome is ONE app-like row.
 *
 * The live red-at-HEAD proof lives in state/evidence/PHONE-NAV-WRAP-001/
 * (scripts/phone-nav-wrap-capture.mjs over the real serve). This file is
 * the cheap regression pin on the CSS contract that fixed it, so a future
 * edit cannot silently restore the wrapped, orphaned top strip:
 *  - at phone width (max-width: 44rem) the route nav is a FIXED bottom
 *    tab bar: one row (nowrap), flush with the bottom edge, opaque;
 *  - tabs are five equal slots with a 56px floor (over the 44px WCAG
 *    target size) and a legible font floor;
 *  - the gliding underline rides the safe area so it stays on the row;
 *  - page content reserves clearance under the fixed bar;
 *  - the floating-chrome lift is declared AFTER its base rules
 *    (equal specificity — source order decides the cascade).
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
const css = readFileSync(repoRoot + "packages/ui/src/styles.css", "utf8");

function phoneTier(): string {
  const start = css.indexOf("@media (max-width: 44rem)");
  expect(start, "styles.css must keep the phone tier").toBeGreaterThan(-1);
  // brace-balanced slice of the block
  let depth = 0;
  let end = start;
  for (let i = css.indexOf("{", start); i < css.length; i++) {
    if (css[i] === "{") depth++;
    if (css[i] === "}") depth--;
    if (depth === 0) {
      end = i;
      break;
    }
  }
  return css.slice(start, end + 1);
}

function ruleIn(scope: string, selector: string): string {
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = new RegExp(`^\\s*${esc}\\s*\\{([^}]*)\\}`, "m").exec(scope);
  expect(m, `phone tier must define "${selector}"`).not.toBeNull();
  return (m![1] ?? "").replace(/\s+/g, " ").trim();
}

describe("phone tab bar (PHONE-NAV-WRAP-001)", () => {
  const tier = phoneTier();

  it("the nav is a fixed bottom bar in the phone tier", () => {
    const routes = ruleIn(tier, ".routes");
    expect(routes).toContain("position: fixed");
    expect(routes).toContain("bottom: 0");
    expect(routes).toContain("flex-wrap: nowrap"); // one row, never an orphan row
    expect(routes).toContain("background: var(--surface)"); // opaque, app-like
    expect(routes).toContain("border-top: 1px solid var(--line)");
  });

  it("tabs stay five equal slots with the 56px touch floor and legible font", () => {
    const tab = ruleIn(tier, ".tab");
    expect(tab).toContain("flex: 1 1 0");
    expect(tab).toContain("min-height: 3.5rem"); // 56px > 44px WCAG floor
    expect(tab).toContain("font-size: 0.8125rem"); // 13px legible floor
  });

  it("the gliding indicator rides the sill + safe area and centers under the label", () => {
    const after = ruleIn(tier, ".routes::after");
    expect(after).toMatch(/bottom: calc\(\d+(\.\d+)?rem \+ env\(safe-area-inset-bottom, 0px\)\)/);
    // inset toward the centered label: narrower than the slot, offset so
    // it stays centered inside the active tab (never a detached full-slot rule)
    expect(after).toContain("width: calc(var(--tab-w, 0px) * 0.6)");
    expect(after).toContain(
      "transform: translateX(calc(var(--tab-x, 0px) + var(--tab-w, 0px) * 0.2))",
    );
  });

  it("page content reserves clearance under the fixed bar", () => {
    expect(ruleIn(tier, ".page")).toContain("env(safe-area-inset-bottom, 0px)");
    expect(ruleIn(tier, ".page")).toMatch(/calc\(\d+(\.\d+)?rem \+ env/);
  });

  it("the floating-chrome lift comes after its base rules (cascade order)", () => {
    const lifts = css.lastIndexOf("@media (max-width: 44rem)");
    expect(lifts, "a dedicated lift block must exist after the base chrome").toBeGreaterThan(
      css.indexOf(".input-mode-bubble {\n  position: fixed"),
    );
    expect(lifts).toBeGreaterThan(css.indexOf(".path-jump-to-pin {"));
    const block = css.slice(lifts, css.indexOf("}", css.indexOf(".path-jump-to-pin", lifts)) + 1);
    expect(block).toContain("bottom: calc(4.75rem + env(safe-area-inset-bottom, 0px))");
  });
});
