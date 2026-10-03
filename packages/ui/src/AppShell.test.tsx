import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AppShell } from "./AppShell.js";

/**
 * The shell must provide landmarks and a skip link so keyboard/screen-reader
 * navigation works without a pointer, and must contain no baked-in language
 * content (BOOT-002 acceptance).
 */
describe("AppShell", () => {
  const html = renderToStaticMarkup(
    <AppShell
      productName="Test Product"
      nav={[
        { id: "practice", label: "Practice" },
        { id: "progress", label: "Progress" },
      ]}
    >
      <h1>Welcome</h1>
    </AppShell>,
  );

  it("renders navigation landmarks", () => {
    expect(html).toContain("<header>");
    expect(html).toContain('<nav aria-label="Primary">');
    expect(html).toContain('<main id="main">');
    expect(html).toContain('<a href="#main">Skip to main content</a>');
  });

  it("renders caller-supplied labels only", () => {
    expect(html).toContain(">Practice<");
    expect(html).toContain(">Progress<");
    expect(html).toContain("Test Product");
  });

  it("contains no Japanese script (core components are language-neutral)", () => {
    // eslint-disable-next-line no-misleading-character-class
    const japanese = /[\u3040-\u30ff\u4e00-\u9fff]/;
    expect(japanese.test(html)).toBe(false);
  });
});
