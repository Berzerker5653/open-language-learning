# REVIEW-G4-EXPLAIN-001 — SPEC verdict

**VERDICT: PASS-WITH-NOTES** — reviewed diff `63f139a8` (ledger `a5cabf22`) against
the frozen contract `state/notes/G4-EXPLAIN-001.md`. No FIX card required; the notes
are forward guidance for the next G4 slice, not defects in this one.

## Scope items, each checked against the diff

1. **Provider interface** — `explain.rs`: OpenAI-compatible
   `POST {base_url}/chat/completions` behind `ai-enabled` (bool, default false),
   `ai-base-url` (empty default, user-typed only — no lab port, no vendor name;
   an empty model string is sent as `default`, never a coined vendor),
   `ai-model`. No key handling, no upload path beyond the typed base URL. MET.
2. **Consent gate** — first press without consent returns `kind:"consent"` before
   any socket; the notice names exactly the card text (`<q>{cardText}</q>`) and the
   direction (`l1 → l2`); stored via `set_explain_consent` into the settings store;
   revocable in Settings (`explain-consent-revoke`). The consent check is also a
   hard backstop inside `explain_card` itself — no caller can skip the notice. MET.
3. **UI** — Explain affordance only on the activity/exercise runner
   (`practice.tsx` optional `explain?: ReactNode` slot; the placement and kanji
   runner instances are untouched = byte-identical). L1-only panel
   (system prompt demands the explanation in l1), information framing, and the
   honest "explanation unavailable" state for disabled / empty URL / failure /
   empty-content. MET.
4. **Hard invariant (zero writes)** — module is structurally read-only
   (`get_setting` + HTTP only; the `explain_card` command never writes, not even
   the AI settings keys). Pinned twice: Rust
   `explain_path_performs_zero_store_writes` (scheduler/mastery/error-ledger/
   mined/lookups snapshot-compare around a real mock-server round trip) and the
   frontend `EXPLAIN_ALLOWED_COMMANDS` whitelist contract test. Re-ran both at
   HEAD: green (see reviewer-gates.log). MET.

## Acceptance items — all present

Red-first unavailable pin, consent stored+revocable pins, mock HTTP server with
zero external network, no-mastery-path contract test, all five gates in
gates.log, ledger commit with task-state + KANBAN.md row + evidence dir.

## Out-of-scope check — clean

No reader/lesson/path surfaces, no G1 loop, no voice, no scoring semantics.
The docs/18 privacy mirror is mandated by AGENTS.md ("update docs in the same
change when you alter privacy behavior"); the `settings-wiring.tsx` prime and the
three SettingsProps fixture updates are the minimum wiring for the new card.

## Notes (not defects)

- **N1 — consent-pin layering:** acceptance words the consent storage as "a
  vitest pin against the settings store"; the vitest pin runs against the fake
  `inv`, while the real store round trip is pinned Rust-side
  (`settings_roundtrip_stores_user_typed_values`, `first_explain_requires_
  consent_and_sends_nothing`). Both layers exist and exercise production logic;
  the layering is arguably stronger than the wording.
- **N2 — L1 is hardcoded `en` in App.tsx** with an inline justification (the app
  UI is English; L2 comes from the active pack's declared `locale`, never a
  guessed constant). Reasonable reading of "L1-only" for an English-UI build;
  when a localized UI ships, L1 must become a fact about the build, same as L2.
- **N3 — zero-write snapshot does not cover encounters/capstone stores**
  (`record_encounter`, `record_capstone_attempt` exist in lts_storage; the
  journal appeared after this card). The invariant is structurally trivial here
  (no write call-site exists in the module), so this is future hardening for the
  next slice, not a hole in this one.
- **N4 — ExplainPanel has no status reset on `cardText` change.** Safe today:
  every card transition runs through `runFinishPractice`, which nulls
  `practiceTarget`/`practiceTask` in one batch and the runner branch is gated on
  `practiceTarget && practiceTask`, so the panel remounts fresh per card
  (verified in App.tsx:4222 + practice-wiring.ts:216-217). If a later slice
  mounts the panel on a surface that changes content in place (a reader/lesson
  surface), it must reset status on content change (the `tapped`/`item_id`
  effect in practice.tsx is the precedent) or the answer will go stale.
