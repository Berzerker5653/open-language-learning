import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { stressEnabled, stressRuns, StressText, type DisplaySettingsView } from "./stress";

describe("stress visibility (K-41)", () => {
  it("splits readings at U+0301 with the mark attached to its base vowel", () => {
    const runs = stressRuns("сего́дня");
    expect(runs).not.toBeNull();
    const stressed = runs!.filter((r) => r.stressed);
    expect(stressed).toHaveLength(1);
    expect(stressed[0]!.text).toBe("о\u0301");
    expect(runs!.map((r) => r.text).join("")).toBe("сего́дня");
  });

  it("returns null for text without stress marks", () => {
    expect(stressRuns("こんにちは")).toBeNull();
  });

  it("renders a highlight span only around the stressed vowel", () => {
    const html = renderToStaticMarkup(<StressText text="сего́дня" />);
    expect(html).toContain('<span class="stress"');
    expect(html).toContain("о\u0301");
    // Only one highlighted run; the rest renders plainly.
    expect((html.match(/class="stress"/g) ?? []).length).toBe(1);
    expect(renderToStaticMarkup(<StressText text="こんにちは" />)).toBe("こんにちは");
  });

  it("auto follows pack data; explicit on/off override it", () => {
    const s = (stress_mode: DisplaySettingsView["stress_mode"], pack_has_stress: boolean) =>
      ({ stress_mode, pack_has_stress }) satisfies DisplaySettingsView;
    expect(stressEnabled(s("auto", true))).toBe(true);
    expect(stressEnabled(s("auto", false))).toBe(false);
    expect(stressEnabled(s("on", false))).toBe(true);
    expect(stressEnabled(s("off", true))).toBe(false);
    expect(stressEnabled(null)).toBe(false);
  });
});
