import React, { createContext, useContext } from "react";

// ADR-0029 direction model. The application shell — banner, route navigation,
// settings, app-authored prompts — stays left-to-right whatever the active
// language pack declares. Only containers that render text coming *from the
// pack* flip direction, driven by that pack's manifest `capabilities.rtl`,
// which the desktop host reads (`apps/desktop/src-tauri/src/lib.rs`) and carries
// to the renderer on the installed-pack listing. Romanization and Latin glosses
// keep an explicit LTR direction so they stay readable inside an RTL block,
// which is what keeps a mixed-script pack legible.

interface PackDirection {
  /** `capabilities.rtl` of the pack whose text fills this subtree. */
  rtl: boolean;
  /** The pack's manifest locale, applied as `lang` on pack-text elements. */
  locale?: string;
}

const DEFAULT_DIRECTION: PackDirection = { rtl: false };

const PackDirectionContext = createContext<PackDirection>(DEFAULT_DIRECTION);

/**
 * Declares the direction of a subtree of pack text. The shell renders exactly
 * one, around the content region for the active pack. Surfaces that list
 * several packs at once (the setup wizard, the language panel) are app chrome
 * rather than pack content, so they pass `rtl` per element instead.
 */
export function PackDirectionProvider(p: {
  rtl: boolean;
  locale?: string;
  children?: React.ReactNode;
}): React.ReactElement {
  return (
    <PackDirectionContext.Provider value={{ rtl: p.rtl, locale: p.locale }}>
      {p.children}
    </PackDirectionContext.Provider>
  );
}

/**
 * Direction attributes for an element that is itself the pack-text container
 * (`<p className="prompt" {...usePackTextAttrs()}>`), where wrapping it in
 * `PackText` would add a pointless element. `lang` is emitted whenever the pack
 * locale is known — including for LTR packs, which is what replaced the
 * `lang="ja"` those surfaces used to hardcode.
 */
export function usePackTextAttrs(override?: { rtl?: boolean; locale?: string }): {
  dir?: "rtl";
  lang?: string;
} {
  const ctx = useContext(PackDirectionContext);
  const rtl = override?.rtl ?? ctx.rtl;
  const locale = override?.locale ?? ctx.locale;
  const attrs: { dir?: "rtl"; lang?: string } = {};
  if (rtl) attrs.dir = "rtl";
  if (locale) attrs.lang = locale;
  return attrs;
}

/** The elements a pack-text run may render as. */
type PackTextTag = "span" | "p" | "strong" | "em" | "blockquote";

/** A run of text that comes from the active language pack. */
export function PackText(p: {
  tag?: PackTextTag;
  className?: string;
  /** Overrides the context, for listings that mix packs. */
  rtl?: boolean;
  locale?: string;
  children?: React.ReactNode;
}): React.ReactElement {
  const attrs = usePackTextAttrs({ rtl: p.rtl, locale: p.locale });
  // Nothing to declare on the default element: render the run itself instead
  // of a bare span, so an LTR pack keeps exactly the markup it had before this
  // model existed. A caller that asked for a specific tag or class still gets
  // that element.
  if (!p.tag && Object.keys(attrs).length === 0 && !p.className) {
    return <React.Fragment>{p.children}</React.Fragment>;
  }
  return React.createElement(p.tag ?? "span", { ...attrs, className: p.className }, p.children);
}

/**
 * A run known to be Latin transliteration or a Latin/English gloss: explicit
 * `dir="ltr"` so it stays readable when an ancestor pack container is RTL.
 */
export function LatinText(p: { locale?: string; children?: React.ReactNode }): React.ReactElement {
  return (
    <span dir="ltr" lang={p.locale ?? "en"}>
      {p.children}
    </span>
  );
}
