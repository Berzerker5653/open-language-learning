# SPEC verdict — 867654e (PRACTICE-GATE-001 + ORTHO-LETTER-UNITS-001)

Reviewed: full diff of 867654e (4020 diff lines, 45 files) against both card
contracts (tasks/ROADMAP.yaml L3178-3190 PRACTICE-GATE-001, L3230-3243
ORTHO-LETTER-UNITS-001) + state/notes/PRACTICE-GATE-001.md and
state/notes/LETTER-TEACHING-DESIGN-001.md. Reviewer re-verified greps/paths
against the committed tree; production code untouched.

**Verdict: SPEC PASS — both lanes ship exactly what their cards asked; no
out-of-scope additions; all deferred items were contract-permitted.**

## PRACTICE-GATE-001 acceptance, clause by clause

1. "level-0 profile with zero encounters gets zero sentence-level practice
   items while the letter-level drills that ARE eligible remain" — PASS.
   `practice_queue_is_generated_from_encounter_state_never_a_pack_buffet`
   (lib.rs, new test) asserts day-one queue is non-empty, ALL kind
   orthography, ⊆ on-ramp letter refs; pack ships sentences yet none enter
   day one; after letter encounters still letters-only; B2 id
   `ru.lex.argue.utverzhdenie` never present. Capture after/: queue = 34
   entries all orthography (state/evidence/PRACTICE-GATE-001/after/result.json).
2. "gated dictation shadowing and writing refuse honestly with no fallback
   to unfiltered pack content and learner free-typed sentences stay
   ungated" — PASS engine-side. `dictation_target_at` filters its pool to
   `practice_eligible` BEFORE any candidate collection (lib.rs:6096+) and an
   empty pool returns the named refusal string (lib.rs:6160) — no path
   reintroduces unfiltered pack content. `shadowing_items_at` filters lexicon
   pool + rides the K-70 `word_kana_eligible` gate; `writing_task` filters by
   `practice_eligible` over the profile-pack union. `practice_build` and the
   typed free-ASR path untouched (verified in diff). NOTE: the honest refusal
   TEXT never reaches the learner UI (engine Err is swallowed by the
   frontend catch) — UX half-wire, defect FIX-2.
3. "mobile-viewport before/after screenshots with machine-gated result.json"
   — PASS. before/ 3/3 PASS (complaint reproduced: «Я учу́ ру́сский язы́к.»
   served to zero-encounter profile), after/ 3/3 PASS (422 refusal,
   orthography-only queue); pngs + result.json exist on disk in both dirs;
   scripts/practice-gate-capture.mjs measures and exits nonzero on any FAIL
   (lines 71, 310) — the machine gate at capture time.

Deferred, permitted: 'Preview what's ahead' (card marks optional — absent
from acceptance clauses), practice_queue frontend rendering (no acceptance
clause demands it; IPC shipped via SERVE_COMMAND_NAMES). Both named in
gates.log DEFERRED list — contract-consistent.

## ORTHO-LETTER-UNITS-001 acceptance, clause by clause

1. "RU pack carries one entity per letter (34 rows including the stress
   mark) with a forms array and zero per-case -upper/-lower ids in any pack
   source" — PASS. cyrillic.jsonl: 67 rows removed, 34 added (33 letters +
   stress-mark), bicameral rows carry `forms: [{symbol,case}]`, lowercase
   canonical `symbol`, teaching_order renumbered 0-33. Reviewer grep
   `cyrillic\.[a-z-]*-(upper|lower)` over HEAD languages/ → zero hits
   (units 010-019 + goals.yaml refs all swept); the only remaining mentions
   repo-wide are guard code, tests and comments.
2. "the bake validator the scaffold generator and audit_learner_copy v1.5.0
   refuse per-case row splits with red-first tests" — PASS.
   pack.rs:521-531 `per_case_orthography_entity` Error diagnostic at bake;
   scripts/new-pack.py:112-127 `reject_per_case_orthography` called at
   emission (L282); tools/audit_learner_copy.py:334-348 `pack-case-split`.
   Tests: crates/langpack/tests/validate.rs:1242
   `per_case_orthography_entity_is_refused_at_bake` (dirty + clean
   directions), scripts/test_new_pack.py:260-268,
   tools/test_audit_learner_copy.py:165-172 (asserts exactly the 2 split
   findings). Red-first is prose-evidenced (run 128 notes; gates.log line
   42: verified the practice test cannot pass against HEAD's 67-row pack)
   — not independently re-derivable from the squashed entangled commit,
   accepted per the entangled-takeover rule.
3. "learner rows render one row per letter with both printed forms visible"
   — PASS. Wire: OrthEntry.forms (lib.rs:1173+), LessonContent.forms
   (lib.rs:9774+), lesson.tsx surface = forms.join(" ") (L130-140).
   Assertions: lesson.test.tsx new describe — 4 `lesson__item` rows,
   "А а"/"О о"/"М м"/"Т т", no `-upper`/`-lower` ghosts; RU on-ramp walk
   asserts 4 orthography contents and forms == ["А","а"] (lib.rs ~14874+).
   Screenshots after/letter-rows-after.png + letter-drill-after.png +
   result.json on disk.

## Entanglement justification — sound

The practice test's day-one base assertion
`letter_refs.contains("ru.orth.cyrillic.a")` is unsatisfiable until the
ORTO pack rename lands, so the two lanes literally cannot be split without
committing a red lane — matches the sanctioned entangled-takeover rule
(2026-11-21) and the ledger commit 80cba43 carries records for BOTH cards.

## Out-of-scope additions — none functional

Justified extras: Debug derives (test unwrap_err), journeys/harness.tsx
fixture id (rename fallout), capture harnesses (acceptance #3 evidence),
docs/04 section (AGENTS.md requires doc update with a pack-schema change).
Incidental: audit_learner_copy.py file mode 644→755 (see standards note).
