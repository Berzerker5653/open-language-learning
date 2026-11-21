# REVIEW-READER-FLOW-001b — two-axis review of the kaikki off-pack lexicon slice

Reviewed commits: `d4b3fe5` (feat, the actual code slice) + `b3b61fc` (ledger close) + `9d57f25` (evidence chore).
Contract sources: `state/notes/READER-FLOW-001.md` (incl. the OFF-PACK SLICE addendum committed with the slice) and `state/notes/WORD-CARD-AUDIO-001.md` ((c): off-pack word → offline aux-lexicon card, clearly labeled, no audio promised).
Reviewer: hermes-default, ai-assisted. Date: 2026-11-21.

## Outcome: CHANGES-REQUESTED

The slice is substantially spec-complete with exemplary ledger hygiene. Three substantive defects get FIX cards; none invalidate the slice.

## Independent verification performed by this review

- `sha256 aux/lexicon/ru.jsonl` == `provenance.slice_sha256` (`44287c8a…269a`) — verified locally, file 72 MB, git-tracked.
- `.venv/bin/python scripts/build-aux-lexicon.py --check` → OK (405,825 rows).
- `.venv/bin/python -m unittest discover -s scripts -p test_build_aux_lexicon.py` → Ran 14, OK.
- `python3 tools/validate_handoff.py --require-explicit-ledger-records` → PASSED (pre-existing optional WARNs only).
- Timing probe (Python proxy for the Rust path): reading + JSON-parsing the committed slice takes ~1.5 s (0.28 s read + 1.25 s parse, 405,825 rows) — cold, per call.
- gates.log re-checked: controller re-ran every gate personally on the final tree; a malformed systemd-unit clippy invocation was caught and re-run clean — honest, high-quality gate log. CI red (44810466838) correctly traced to published-archive drift, schemas job (incl. the new aux lines) PASSED.

## Axis (a) — SPEC

Acceptance items, each checked against the diff:

| acceptance | verdict |
|---|---|
| kaikki.org aux lexicon, license-checked | PASS — license posture researched and recorded (kaikki.org "Copyright and license", accessed 2026-11-20) in notes + provenance + README; ShareAlike rationale for the separate file is correct |
| sha-pinned provenance | PASS — source sha256 + size + URL + slice sha256 pinned in `ru.provenance.json`; sha pin independently re-verified by this review |
| import built into pack pipeline with CI `--check` | PASS — `scripts/ci.sh` runs the 14 unit tests + `--check`; CI schemas job passed on push b3b61fc per gates.log |
| WordCardView aux fields + labeled offline card in reading.tsx | PASS — `aux_word/aux_gloss/aux_pos/aux_source` set only on pack-miss + slice-hit; pack fields never carry aux answers; card renders under "offline auxiliary dictionary" label, attribution inline, Mine stays offered, no play button promised (WORD-CARD-AUDIO-001 (c) satisfied) |
| bundle overlay mapping | PASS (code) — `stage-pack-bundle.sh` maps `aux/lexicon` into bundle resources with honest degrade when absent; the bundle-build + device smoke of that mapping is explicitly deferred to release tier in gates.log — honestly logged, acceptable deferral, verify at RC |

Omissions: none found — every deferred item is explicitly recorded. Contract extension (sidecar lemma stays on the off-pack card) is an in-scope amendment: documented in the notes addendum, justified ("pack's own lemmatizer truth"), and the old rust test was updated to assert the new contract in the same commit. Good discipline.

Out-of-scope ADDITIONS: none. `harness.tsx`, `reading.test.tsx`, `rtl-direction.test.tsx` hunks are required type/fixture updates for the new required `WordCardView` members.

SPEC defects:

- **S1 (defect, performance/hot path):** `aux_rows()` (as committed: `apps/desktop/src-tauri/src/lib.rs:6893`) re-reads the whole 72 MB slice and deserializes all 405,825 rows **on every `word_card` call** (`word_card_at` → `aux_rows` at :6994), then does a linear `iter().find()` scan. Off-pack taps are the common case for learners reading stories; every tap pays a multi-hundred-ms-to-second read+parse+scan. The `lemma_rows` precedent this copies was built for a 1,423-row sidecar, not a 406k-row file. → FIX-READER-FLOW-001b-1.
- **S2 (defect, frozen-contract fidelity):** the contract pins the attribution text "Definitions from Wiktionary via kaikki.org (CC BY-SA / GFDL)" and requires it "displayed on every aux card". The card instead displays `AUX_SOURCE = "Wiktionary via kaikki.org (CC BY-SA / GFDL)"` (`lib.rs:6876`, rendered as nested parens in reading.tsx). Source is still named (ShareAlike substance is met), but the card deviates from the frozen text. → FIX-READER-FLOW-001b-3.

## Axis (b) — STANDARDS

- **Commit/ledger hygiene: PASS.** Code (`d4b3fe5`) and ledger close (`b3b61fc`: task-state + KANBAN.md row + gates.log) are separate commits; the `9d57f25` evidence chore appends the CI conclusion. Commit messages assert only verifications that actually ran at commit time — matches the skill's rule exactly.
- **Evidence paths: PASS.** task-state `evidence: ["state/evidence/READER-FLOW-001/gates.log"]` exists; `validate_handoff --require-explicit-ledger-records` PASSED (re-run by this review).
- **No gitignored binaries: PASS.** `aux/lexicon/ru.jsonl` is text and `git ls-files` confirms it is tracked (72 MB data-file-in-git was an explicit, sized contract decision with a stated trim path — acceptable, though it does grow every clone).
- **Third-party data clause (AGENTS.md):** satisfied in substance — license checked against the primary source page, provenance recorded — with one hole:
  - **B1 (defect, license file):** `scripts/build-aux-lexicon.py:18` promises the derived slice is "re-hosted under CC-BY-SA/GFDL with attribution (`aux/lexicon/LICENSE-AUX`)" — **that file was never committed** (`aux/lexicon/` holds only README.md, ru.jsonl, ru.provenance.json). README asserts the slice "is a derivative work licensed CC-BY-SA/GFDL" but ships no license text. This matters more than prose honesty: the repo root LICENSE is **Apache-2.0**, so a downstream reuser has no on-disk signal that the slice carries a different, ShareAlike license and must not be treated as Apache. → FIX-READER-FLOW-001b-2.
- **Vocabulary (GLOSSARY.md):** slice/sidecar/provenance/ledger used consistently; "separate and trusted" contract language honored. No violations.
- Observation (not a defect of this slice): the notes and commit prose call the pack lexicon "MIT-licensed" while the repo root LICENSE is Apache-2.0. If the pack lexicon's MIT claim refers to a per-pack license it should be pointed to; if it is loose shorthand it predates this slice — flagged here for a future docs sweep, no FIX card from this review.

## Follow-up cards created

- FIX-READER-FLOW-001b-1 — unbounded per-tap reload/reparse of the 72 MB aux slice (S1).
- FIX-READER-FLOW-001b-2 — promised `aux/lexicon/LICENSE-AUX` missing under a CC-BY-SA/GFDL derivative in an Apache-2.0 repo (B1).
- FIX-READER-FLOW-001b-3 — aux card attribution string deviates from the contract-pinned text (S2).
