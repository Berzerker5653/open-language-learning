// SERVE-PAIR-ONBOARD-001 contract: the serve mode's first-contact form.
// An unpaired device opens the served page and can reach neither the
// profile chooser (every /api call is gated) nor Settings — so the pairing
// form lives on the static onboarding screen. It must render before any
// session exists, be visibly distinct from the dead welcome step, and not
// offer a dead control: the Pair button starts disabled until the PIN is
// in. The live pair flow itself is verified against a real serve, not in
// this suite (the suite has no DOM for this component by design).
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ServePairingCard } from "./onboarding";

describe("ServePairingCard (SERVE-PAIR-ONBOARD-001)", () => {
  it("renders the pairing form with the PIN input and a disabled Pair control", () => {
    const html = renderToStaticMarkup(<ServePairingCard />);
    expect(html).toContain('data-testid="serve-pairing-card"');
    expect(html).toContain('id="serve-pair-pin"');
    expect(html).toContain('inputMode="numeric"');
    expect(html).toContain('maxLength="6"');
    expect(html).toContain('data-testid="serve-pair-submit"');
    // No PIN entered yet: the pair control must be visibly disabled, never a dead live one.
    expect(html).toMatch(/serve-pair-submit[^>]*disabled/);
  });

  it("tells the operator where the PIN comes from and never claims an unsupported capability", () => {
    const html = renderToStaticMarkup(<ServePairingCard />);
    expect(html).toContain("Local network access");
    expect(html).toContain("pairing PIN");
    expect(html).not.toContain("cloud");
    expect(html).not.toContain("internet");
  });
});
