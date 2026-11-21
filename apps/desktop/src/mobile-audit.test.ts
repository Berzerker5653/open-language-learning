/**
 * MOBILE-UX-001 acceptance assertion: the phone-layout audits captured at
 * card close must hold the two hard rules — no document-level horizontal
 * scroll at 390x844 / 412x915, and no non-inline tap target under 44px.
 *
 * The audits themselves are produced by scripts/mobile-capture.mjs against
 * the dev-only harness (apps/desktop/src/mobile-screens.tsx); this test is
 * the cheap machine gate over its evidence, not a live layout engine (no
 * layout engine exists in the vitest DOM). If the captures are regenerated,
 * a regression re-appears here as a failing row naming the screen.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const AUDIT_DIR = join(__dirname, "..", "..", "..", "state", "evidence", "MOBILE-UX-001", "after");

type Audit = {
  screen: string;
  overflow: { scrollWidth: number; clientWidth: number };
  boxes: { tag: string; label: string; w: number; h: number; inline: boolean }[];
  fails: number;
  error: string | null;
};

const files = readdirSync(AUDIT_DIR).filter((f) => f.endsWith(".audit.json"));

describe("phone layout audits (MOBILE-UX-001)", () => {
  it("covers all five screens at both card viewports", () => {
    const wanted = ["onboarding", "today", "drill", "reader", "settings"].flatMap((s) => [
      `${s}-390.audit.json`,
      `${s}-412.audit.json`,
    ]);
    for (const w of wanted) expect(files, `missing audit ${w}`).toContain(w);
  });

  for (const file of files) {
    const audit = JSON.parse(readFileSync(join(AUDIT_DIR, file), "utf8")) as Audit;
    it(`${audit.screen}: no horizontal scroll and no sub-44px tap targets`, () => {
      expect(audit.error, `harness navigation error: ${audit.error}`).toBeNull();
      expect(
        audit.overflow.scrollWidth,
        `${file}: document scrollWidth exceeds clientWidth`,
      ).toBeLessThanOrEqual(audit.overflow.clientWidth);
      const small = audit.boxes.filter((b) => !b.inline && (b.w < 44 || b.h < 44));
      expect(
        small,
        `${file}: sub-44px targets: ${small.map((b) => `${b.tag} ${b.w}x${b.h}`).join(", ")}`,
      ).toHaveLength(0);
    });
  }
});
