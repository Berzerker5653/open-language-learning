# JA-B2-001 — B2 band metrics before/after the 2026-11-20 register increment

Measured over `languages/ja-JP/curriculum/units/*.yaml` with `goal_id: ja.goal.b2.*`.

## Before (start of lane, 2026-11-20)
- B2 units: 395 — only **1** unit (`ja.unit.b2-film-opinion`, R12 journey) carried a full `task_sequence` (ADR-0037 input→scaffolded→independent→transfer→reuse).
- B2 activity `support_level` distribution (2340 activities): `{2: 1553, 3: 388, 5: 390, 1: 6, 0: 3}` — 390 fully translation-scaffolded activities; independent production nearly absent at this band.
- B2 goal map (11 goals declared in `curriculum/goals.yaml`) had curriculum only under `ja.goal.b2.film-analysis` (3 draft units + 1 scenario); no goal covered register/pragmatics shifting (single `ja.grammar.politeness.register` concept existed with no B2 teaching units over it).
- Zero B2 band assessments expressing register fit or delayed retention.

## Increment (this card)
- New goal `ja.goal.b2.register-shift` (prereq `ja.goal.b1.repair-clarification`, mirrored in `grammar/dependencies.yaml`), with 2 assessment definitions:
  - `ja.assess.b2-register-shift` (kind `transfer`: one message re-produced in two registers without propositional drift; hedging/honorific fit to context);
  - `ja.assess.b2-register-shift-retention` (kind `production`: register-marked chunk produced fresh **at the scheduled SRS interval without translation support**; scheduling engine is FSRS in `crates/scheduler`).
- 4 new units (827–830), each claiming its task sequence end to end:
  - 827 `ja.unit.b2-register-polite-phone` (polite/hedged phone register: ございます, あのう hedge, いかがでしょうか);
  - 828 `ja.unit.b2-register-formal-writing` (formal written genre: により, ば notice form, だけでは, というもの);
  - 829 `ja.unit.b2-register-casual-opinions` (plain-register tones: ものだ, わけだ, ものか);
  - 830 `ja.unit.b2-register-honorific-office` (尊敬語 awareness + client-call scenario transfer).
- New scenario `ja.scenario.b2.register.client-call` (situation `ja.situation.phone-call`, polite-neutral; 3 nodes + recovery, support ladder, authored-intent transfer variants).
- 12 new sentence records (`sentences/b2-register-2026-11-20.jsonl`) across **four text genres** (public notice, editorial commentary, business phone dialogue, casual debate), all baked with the pack-standard narrator (qwen3-tts/ono_anna) and whisper round-trip content-checked (1 real defect caught and re-taken: whispered topic は dropped in one take).

## After
- B2 units: 399 — **5** with full task_sequence (film-opinion + 827–830).
- New-increment activity distribution (24 activities): `{0: 8, 1: 10, 2: 6}` — zero level-3 or level-5 activities; 8 independent (no-translation) production stages.
- Band totals now `{0: 11, 1: 16, 2: 1559, 3: 388, 5: 390}` over 2364 activity rows across 399 units — the reduction claim is scoped to the increment (acceptance wording "substantially expanded"); the band's legacy scaffolded shape stays flagged for JA-B2-002 review rather than silently rewritten.

## Acceptance mapping
1. **Declared B2-like capability map has curriculum, scenarios, assessments, transfer evidence**: `ja.goal.b2.register-shift` joins the 11-goal B2 map with 4 task-sequence units, 1 scenario, 2 assessments, `transfer_required: true`, and a hard prereq edge — the map now has authored end-to-end curriculum under a second B2 goal.
2. **Broader natural-speed listening and varied text genres**: 12 audio-backed listening clips at normal pacing (s/mora mean 0.204 vs shipped corpus ~0.206) spanning notice / editorial / business-phone / casual-debate genres — the ja pack's first genre-labeled B2 listening set.
3. **Pragmatics/register coverage substantially expanded**: previously one orphaned register concept; now 8 activities directly teach register choice (polite-neutral, plain-casual, formal written, honorific) across 4 units + 1 scenario + 2 rubric assessments, with sentences explicitly genre/register-tagged in `notes`.
