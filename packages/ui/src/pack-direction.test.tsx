// ADR-0029 helper behaviour. The direction rules every pack surface depends on,
// asserted once at the primitive instead of once per screen.
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";
import { LatinText, PackText, PackDirectionProvider, usePackTextAttrs } from "./pack-direction.js";

function under(rtl: boolean, locale: string | undefined, children: ReactNode): string {
  return renderToStaticMarkup(
    <PackDirectionProvider rtl={rtl} locale={locale}>
      {children}
    </PackDirectionProvider>,
  );
}

describe("pack direction primitives", () => {
  it("flips pack text and tags its language when the pack is RTL", () => {
    const html = under(
      true,
      "ar-MA",
      <PackText tag="strong" className="plan-surface">
        سلام
      </PackText>,
    );
    expect(html).toBe('<strong dir="rtl" lang="ar-MA" class="plan-surface">سلام</strong>');
  });

  it("tags the language without a direction flip for an LTR pack", () => {
    expect(under(false, "ja-JP", <PackText>私</PackText>)).toBe('<span lang="ja-JP">私</span>');
  });

  it("adds no element when there is nothing to declare", () => {
    expect(under(false, undefined, <PackText>x</PackText>)).toBe("x");
  });

  it("defaults to LTR with no provider above it", () => {
    // Surfaces rendered outside the shell (tests, new routes) keep the
    // behaviour they had before the direction model existed, and a caller that
    // asked for a specific element still gets that element.
    expect(renderToStaticMarkup(<PackText tag="p">x</PackText>)).toBe("<p>x</p>");
  });

  it("lets a per-element override beat the context", () => {
    // The wizard lists packs of several directions at once; each row decides
    // from its own pack.
    const html = under(
      false,
      "ja-JP",
      <PackText rtl locale="ar-MA">
        سلام
      </PackText>,
    );
    expect(html).toBe('<span dir="rtl" lang="ar-MA">سلام</span>');
  });

  it("keeps a Latin run left-to-right inside an RTL subtree", () => {
    const html = under(true, "ar-MA", <LatinText>as-salamu alaykum</LatinText>);
    expect(html).toBe('<span dir="ltr" lang="en">as-salamu alaykum</span>');
  });

  it("gives attributes to an element that is itself the container", () => {
    function Prompt() {
      return <p className="prompt" {...usePackTextAttrs()} />;
    }
    expect(under(true, "ar-MA", <Prompt />)).toBe('<p class="prompt" dir="rtl" lang="ar-MA"></p>');
    expect(under(false, "ja-JP", <Prompt />)).toBe('<p class="prompt" lang="ja-JP"></p>');
  });
});
