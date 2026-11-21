# IN-APP-IME-001 — in-app kana keyboard (issue #2)

Phase 1 (romaji→kana converter, `apps/desktop/src/ime.ts` + `kana-ime.tsx`) and
IME-TOGGLE-UX-001 (bubble + Ctrl+Shift+K toggle) are on main. This card is
PHASE 2 only.

## Phase 2 frozen contract (decided by the card worker, 2026-11-21)

### 1. Pack-declared input methods — `capabilities.input_methods`

Manifest shape (0.2 schema only — the scenario_help precedent: new
capability fields extend v0.2; the legacy 0.1 schema stays frozen and its
packs simply never declare the field = current behavior):

```yaml
capabilities:
  input_methods:
    romaji-kana: true        # key = engine converter id (ime.ts registry)
    lexicon-candidates: true # lexicon-backed conversion candidates
```

- Object map method-id → bool. Keys match `^[a-z0-9][a-z0-9._-]*$`; values
  MUST be booleans (schema-enforced; bool-safe reads also skip non-bools).
- ABSENT = current behavior (script-based gating from `scripts:` unchanged).
- PRESENT = explicit allowlist: an engine feature with a method id is offered
  only when its id is declared true. An explicit `false` (or a missing key in
  a present map) turns that feature off even if scripts would grant it.
- Unknown ids are schema-legal and ignored by today's engine (declarative
  only — packs declare, the engine interprets; packs never execute code).
- Engine-known ids: `romaji-kana` (equals the registry converter id) and
  `lexicon-candidates` (pack-lexicon-backed conversion candidates).

### 2. Loader + validate honoring it

- `schemas/v0.2/language-pack-manifest.schema.json`: `input_methods` property
  (object, propertyNames pattern, additionalProperties: boolean). The 0.1
  schema stays frozen (scenario_help precedent).
- `crates/langpack/src/pack.rs`: `declared_input_methods()` reader on the
  parsed pack (absent → None; non-bool entries skipped, never panics).
- `apps/desktop/src-tauri/src/packs.rs`: `InstalledPack` gains
  `input_methods: Vec<String>` (ids declared TRUE, sorted) +
  `input_methods_declared: bool` (manifest carries the map). Tri-state
  crosses IPC; interpretation stays in the renderer.

### 3. Renderer gating (ime.ts)

`inAppKeyboardForScripts(scripts, gate?)` where
`gate = { declared: boolean; methods: string[] }`:
- gate absent / `declared:false` → today's script resolution exactly.
- `declared:true` → a converter serves only if its id is in `methods`.

### 4. Lexicon-backed candidates with provenance

- New Tauri command `ime_candidates(kana, profile_id)` in lts-desktop:
  reads the ACTIVE pack's cached lexicon (`lexicon_entries`), matches rows
  whose declared kana reading equals the committed kana run, and returns the
  entry's non-primary forms (kanji forms etc.) plus the primary when it
  differs from the query. Each candidate carries provenance:
  `{ text, reading, gloss, source: "pack", entry_id }`.
  Miss in the pack lexicon → the offline aux slice (`auxdata/lexicon/<lang>.jsonl`)
  exact-word hit, separately labeled `{ source: "aux", entry_id: null,
  attribution: AUX_SOURCE }` — same never-masquerading posture as
  WordCardView. Cap 8, deterministic (lexicon file order).
- `LexEntry` gains `alt_forms: Vec<String>` (every non-primary form text).
- TS: `apps/desktop/src/ime-candidates.ts` — pure helpers + `ImeCandidate`
  type; conversion offered only when `lexicon-candidates` is not ruled out
  by the declared gate.
- `useKanaIME` (`kana-ime.tsx`): optional `candidates?: (kana) => Promise<ImeCandidate[]>`.
  Enter commits the buffer (phase-1 semantics unchanged) and arms conversion
  for the kana run just written; SPACE while conversion is armed (and the
  field still ends with that run) cycles: kana → candidate 1 → … → kana.
  Any other key / external edit / Escape disarms. Provenance readable via
  `ime.conversionLabel()` for the caller/UI.

### 5. No baked-in word list (structural pin)

`ime.test.ts` reads engine sources (`ime.ts`, `kana-ime.tsx`,
`ime-candidates.ts`) and asserts NO CJK-UNIFIED-IDEOGRAPH code points appear
(the romaji→kana table is kana-only universal transliteration data; any
Japanese WORD list would carry kanji). Provenance is asserted in
`ime-candidates.test.ts` and Rust tests.

## OUT OF SCOPE / phase 3 (NOT attempted)

WebKitInputMethodContext native path + Orca-session verification: needs a
real AT session. Not attempted in this card; acceptance bullet stays open
honestly. A future card must verify preedit semantics visible to Orca and
zero system-layout change on the native path.
