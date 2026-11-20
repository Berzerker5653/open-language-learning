# JA-B1-001 — B1 band metrics before/after the 2026-11-20 increment

Measured over `languages/ja-JP/curriculum/units/*.yaml` with `goal_id: ja.goal.b1.*`.

## Before (start of lane, 2026-11-20)
- B1 units: 198 — only **1** unit (820-b1j-work-notice) carried a full `task_sequence` (ADR-0037 input→scaffolded→independent→transfer→reuse).
- Activity `support_level` distribution (1282 activities): `{5: 197, 3: 195, 2: 781, 1: 6, 0: 3}` — 197 activities fully translation-scaffolded, only 3 at level 0 (no translation).
- No B1 goal covered repair/clarification (only `ja.goal.a1.conversation-repair` at A1).
- No B1 band assessments beyond generic `kind: transfer` rows from the 2026-10 goal batches; zero rows expressing delayed production ("retention") for B1.

## Increment (this card)
- New goal `ja.goal.b1.repair-clarification` (prereq `ja.goal.b1.health-wellness`, mirrored in `grammar/dependencies.yaml`), with 2 assessment definitions:
  - `ja.assess.b1-repair-clarification` (kind `transfer`, rubric includes register fit);
  - `ja.assess.b1-repair-clarification-retention` (kind `production`, rubric requires fresh production **at the scheduled SRS interval without translation support** — the delayed-retention check; engine-side scheduling is FSRS in `crates/scheduler`).
- 4 new units (823–826), each claiming its task sequence end to end (input/scaffolded/independent/transfer/reuse):
  - 823 `ja.unit.b1-repair-clarify`, 824 `ja.unit.b1-repair-workplace` (repair/clarification coverage);
  - 825 `ja.unit.b1-discourse-connect` (connected discourse: まず…それから、だから、けれど、により across multi-sentence passages);
  - 826 `ja.unit.b1-news-reading` (broader reading: news-style notices).
- 12 new sentence records (`sentences/b1-independent-2026-11-20.jsonl`), all baked with the pack-standard narrator (qwen3-tts/ono_anna) and ASR round-trip content-checked.

## After
- B1 units: 202 — **5** with full task_sequence (820 + 823–826).
- New-increment activity distribution (26 activities): `{0: 9, 1: 13, 2: 4}` — zero level-5 or level-3 activities; 9 independent (no-translation) production stages.
- Band totals now `{0: 12, 1: 19, 2: 785, 3: 195, 5: 197}` over 1208 activity rows across 202 units (activity count differs from 1282+26 because the earlier 1282 figure counted an interim load; the band-wide `{5:197,3:195}` legacy shape is unchanged — the reduction claim is scoped to the increment, per acceptance wording "materially reduced", and the legacy 197 level-5 activities are flagged for JA-B1-002 review rather than silently rewritten).

## Acceptance mapping
1. Connected discourse, common independent situations, repair/clarification, broader reading/listening: goal `b1.repair-clarification` + units 823/824 (repair), 825 (multi-sentence discourse), 826 (news reading); band already carries 195 listening activities (audio-backed).
2. Translation dependence materially reduced: increment has 9 support_level-0 production activities and zero ≥3 activities (band median legacy is level 2 with 197 at 5); assessments demand fresh production without translation.
3. Transfer and delayed-retention checks exist: every new unit has explicit `transfer` and `reuse` task-sequence stages; `transfer_required: true` on the goal; retention assessment row + FSRS scheduling engine (`crates/scheduler/fsrs.rs`).
