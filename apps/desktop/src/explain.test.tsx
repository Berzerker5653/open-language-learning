/**
 * G4-EXPLAIN-001: static pins of the Explain view — every status renders the
 * copy the contract freezes (exact consent notice contents, information-only
 * framing, honest unavailable state; never verdict language).
 */
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ExplainView, type ExplainViewProps } from "./explain";

const base: ExplainViewProps = {
  status: { kind: "idle" },
  cardText: "привет",
  l1: "en",
  l2: "ru",
  onPress: () => {},
  onConsentAccept: () => {},
  onConsentDecline: () => {},
};

function render(overrides: Partial<ExplainViewProps>) {
  return renderToStaticMarkup(<ExplainView {...base} {...overrides} />);
}

describe("G4-EXPLAIN-001 explain view", () => {
  it("idle shows only the Explain affordance", () => {
    const html = render({});
    expect(html).toContain("Explain");
    expect(html).not.toContain("привет");
    expect(html).not.toContain("unavailable");
  });

  it("the consent notice names exactly what is sent: the card text and the direction", () => {
    const html = render({ status: { kind: "consent" } });
    expect(html).toContain("привет");
    expect(html).toContain("en → ru");
    expect(html).toContain("Nothing about this exchange is stored");
    expect(html).toContain("revoke this permission");
    expect(html).toContain("explain-consent-accept");
    expect(html).toContain("explain-consent-decline");
  });

  it("the explanation panel is framed as information and disclaims grading", () => {
    const html = render({
      status: { kind: "ready", text: "“привет” means hello — it is the informal greeting." },
    });
    expect(html).toContain("informal greeting");
    expect(html).toContain("information only");
    expect(html).toContain("never a grade");
    expect(html).not.toContain("Correct");
    expect(html).not.toContain("verdict");
  });

  it("unavailable is honest and says the card is unchanged", () => {
    const html = render({
      status: { kind: "unavailable", reason: "AI explanations are off" },
    });
    expect(html).toContain("Explanation unavailable");
    expect(html).toContain("AI explanations are off");
    expect(html).toContain("nothing was stored");
    expect(html).not.toContain("explain-answer");
  });

  it("loading states itself without pretending an answer exists", () => {
    const html = render({ status: { kind: "loading" } });
    expect(html).toContain("Explaining");
    expect(html).not.toContain("explain-answer");
  });
});
