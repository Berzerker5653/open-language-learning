# ADR 0029: Direction model for right-to-left packs

Status: Proposed — agent-authored; acceptance is an owner decision.
Date: 2026-10-13

## Context

A language pack manifest declares `capabilities.rtl`
(`schemas/language-pack-manifest.schema.json`), the schema validates it, and
`scripts/new-pack.py --rtl` writes it — but while satisfying PACK-AI-001's
multi-script acceptance item we measured that **nothing in `apps/desktop` read
it**. An RTL pack installed and rendered left-to-right: `examples/ar-ma` declares
`rtl: true`, and every surface that displays its text — the session plan, the
practice prompt and choices, the dictation target — inherited the LTR base
direction of the document. The flag was a validated lie.

The surfaces are mixed-script by design. A Moroccan Arabic pack shows Arabic
content next to a Latin gloss, romaji-style romanization, ruby annotations, and
English app chrome ("What does this mean?", "Show reading", the route buttons).
Direction therefore cannot be one global switch without breaking something:

- `<html dir="rtl">` or a mirrored shell would right-align the navigation, the
  settings form, the numbers in the budget control and the English scaffolding,
  which the app has not localized (the UI strings are English; see docs/11).
- Nothing at all keeps the defect.
- A bilingual two-column layout (target script in one column, Latin gloss in the
  other, each with its own direction) fixes readability but is a layout
  redesign of every learning surface, and it assumes the learner wants a
  parallel-text reading mode, which is a different product decision.

## Decision

Per-container direction, with the app chrome fixed LTR:

- The banner, route navigation, settings and every app-authored string keep the
  document direction. Nothing in the shell flips.
- The content region for the active pack carries a direction context
  (`packages/ui/src/pack-direction.tsx::PackDirectionProvider`), fed by
  `AppShell`'s `packDirection`/`packLocale` props, which `App.tsx` derives from
  the installed pack record. That record's `rtl` field comes from the pack's own
  `manifest.yaml` (`apps/desktop/src-tauri/src/lib.rs::manifest_rtl` and
  `packs.rs::display_for`), so the flag travels manifest → IPC → renderer with
  no app-side guess about which language "looks" RTL.
- A run of pack-sourced text renders through `PackText` (or an element spreading
  `usePackTextAttrs()`), which emits `dir="rtl"` when the active pack declares
  `rtl`, plus `lang` set to the pack's manifest locale.
- Romanization, transliteration and Latin/English glosses are explicitly
  `dir="ltr"` (`LatinText`, the ruby `romaji` run, the writing `Romaji hint`).
  They are the only elements with a hardcoded direction, because they are the
  only ones the app can be certain about.
- `lang` now comes from the pack locale rather than the `lang="ja"` those
  surfaces hardcoded. That hardcode was the same class of bug as the direction
  one: it asserted a language from app code. No pack-text element may hardcode a
  language tag; the manifest is the source.
- Listings that show several packs at once (the setup wizard, the installed-pack
  list in the language panel) are app chrome: they set direction per element
  from each pack's own `rtl` (`PackCandidate.rtl`, `InstalledPack.rtl`), never
  from the active pack — otherwise installing an RTL pack would right-align
  every other pack's name. A catalog entry carries no `rtl` today
  (`catalog/packs.json` publishes id, version, licence and size), so a
  download-catalog name renders in the document direction; if a published pack
  ever has an RTL display name, the catalog entry has to carry the flag before
  the renderer can honour it.

- The pack-text surfaces this covers: the session plan (`home`), practice and
  placement (both through `PracticeRunner`, including the phrase-slot display),
  dictation, pronunciation, shadowing, writing, scenarios, graded reading, "my
  words" — the review card, the mined-word list and the surface/reading inputs,
  whose content is pack-language — and the kanji card. Reading, shadowing and
  "my words" existed only as JSX inline in `App.tsx`, where no test could reach
  them (`App.test.tsx` records why `<App/>` cannot be mounted in this suite);
  they are now `reading.tsx`, `shadowing.tsx` and `words.tsx` panel modules,
  which is the convention every other route already follows, so the direction
  contract is testable at the surface it applies to. The first RTL-001 pass
  missed those three, which is how the extraction was found to be necessary
  rather than cosmetic.

## Consequences

- `capabilities.rtl` becomes a real, observed field. A pack that declares it
  wrong is a content defect with a visible effect, so the flag is now part of
  what pack authors are accountable for; the audit does not judge direction
  (there is nothing to compare a declaration against).
- Latin scaffolding inside RTL blocks stays readable instead of being
  right-aligned and re-ordered by the bidi algorithm. Mixed-script packs are the
  normal case, not an edge case.
- The engine (`crates/langpack`) still never consults the flag; it is purely a
  renderer concern, which is why the ADR lives with the UI package rather than
  the pack spec.
- Surfaces not reached by this change keep working: with no provider above them
  the context default is LTR, so a component rendered in a test or a new route
  behaves exactly as before.
- Known leftovers, deliberately out of scope: `writing.tsx` still says "Type the
  answer in Japanese (IME supported)" and several exercise labels assume a
  Japanese pack. Those are app-string localization defects (docs/11), not
  direction defects, and fixing them needs an l10n mechanism, not a `dir`
  attribute. Recorded as follow-up rather than silently widened here.

## Alternatives considered

- **Mirror the whole shell (`<html dir="rtl">` or `dir` on `<main>`).** One line,
  and it is what a fully localized RTL build would eventually want. Rejected now:
  the chrome is untranslated English, so a mirrored shell right-aligns English
  sentences, flips the order of "3 activities · about 2 minutes"-style
  composites and moves navigation, which reads as broken rather than localized.
- **Bilingual two-column layout.** Best readability for parallel text, largest
  implementation cost, and it commits the product to a specific reading mode.
  Rejected for RTL-001; revisit if a reader mode appears as its own task.
- **Decide direction from the locale string in the renderer** (e.g. `ar-*` ⇒
  RTL). Rejected: it puts language knowledge in app code, which ADR-0021 already
  forbids for script names, and it silently overrides what the pack declares.

## Verification

- `apps/desktop/src/rtl-direction.test.tsx` renders the real composition
  (`AppShell` → pack surfaces) for a fixture mirroring `examples/ar-ma`
  (`ar-MA`, `rtl: true`) and asserts: pack text carries `dir="rtl"` plus
  `lang="ar-MA"`; the Latin gloss and the romanization in the same block carry
  `dir="ltr"`; the banner contains no `dir`; and the ja-JP control render gains
  a language tag but no direction flip.

- The same file covers the three extracted panels: story titles, sentence text
  and looked-up words flip, while the sentence romaji, the English gloss and a
  romanization-only shadowing scaffold stay `dir="ltr"`; the shadowing surface
  and reading scaffold flip; the mined-word review card and the surface/reading
  inputs carry the pack's `dir`/`lang`, and the learner's own meaning and
  citation inputs carry neither.
- `packages/ui/src/pack-direction.test.tsx` pins the helper behaviour the
  surfaces depend on, including the no-provider default.

- `apps/desktop/src/language.test.tsx` pins the per-element rule for the
  installed-pack list: an `ar-MA` pack's display name renders
  `<span dir="rtl" lang="ar-MA">` while the `eo` pack listed next to it renders
  `<span lang="eo">` with no direction, proving the active pack does not decide
  another pack's name.
- Rust side: `apps/desktop/src-tauri/src/lib.rs` test
  `rtl_capability_reaches_the_renderer_through_pack_listing` proves
  `capabilities.rtl` crosses IPC through `installed_packs` and
  `available_packs_at`, and that an omitted key reports `false`.
