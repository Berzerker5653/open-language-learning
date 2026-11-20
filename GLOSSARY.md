# Domain language

Project vocabulary defined exactly as used across `docs/`, `tasks/ROADMAP.yaml`,
`tasks/KANBAN.md` and `state/notes/` — a reference to existing wording, not new terms.

- **band** — CEFR level (A1, A2, B1, B2…) used identically in packs, coverage maps and public claims; a partial band must say partial, never a completion claim.
- **pack** — a versioned, schema-validated language bundle under `languages/<locale>/`: content JSONL, media manifest plus baked audio, declarative YAML, provenance/licensing; published as archives pinned in `catalog/packs.json`.
- **card** — a unit of board work: an id in `tasks/ROADMAP.yaml` with acceptance, a `state/task-state.json` record and a `tasks/KANBAN.md` row; exactly one may be `in_progress`.
- **board** — the kanban engine: one card per roadmap task, a fresh worker per card; `tasks/KANBAN.md` columns (now/next/later/owner) mirror it as the planning view.
- **lane** — a work stream over a disjoint file set (engine lane, app lane) so concurrent agents never share a dirty file; each lane commits separately.
- **burst** — one worker run on one card (~45-minute budget); on early exit, a resume recipe in `state/notes/<CARD>.md` steers the next burst.
- **takeover-commit** — the controller commits a dead worker's complete-but-uncommitted lane under its card id after re-running the gates personally; never re-runs the same battery twice.
- **resume recipe (takeover note)** — a numbered continuation block in `state/notes/<CARD>.md` telling the next burst what is done, what remains, and what not to re-derive.
- **ledger** — the explicit task record: ROADMAP card + `state/task-state.json` record + KANBAN.md row; `validate_handoff.py` enforces records and evidence paths for release-path tasks (ADR-0033).
- **evidence** — objective artifacts under `state/evidence/<TASK>/`: gate logs, QA reports, machine counts; a task-state evidence entry must name an existing file, not prose.
- **notes** — `state/notes/<TASK>.md`: research and implementation contracts, frozen interface contracts, resume recipes; every worker reads them at card start.
- **gate** — a required check: lane tier = fmt plus package-scoped tests/clippy/tsc at every commit; release tier = workspace-wide sweeps, at RCs or owner-ordered majors only.
- **sidecar** — an optional pack data file beside a primary artifact (`media/words.jsonl`, `labels.jsonl`, `lemmas.jsonl`); additive — packs without it load unchanged.
- **bake** — generating a pack audio asset (`scripts/generate-pack-audio.py`, declared TTS engine) recorded as a sha-bearing manifest row; re-bake = regenerate after content corrections.
- **certified clean** — an audio clip that passed the ASR round-trip verification gate; counts are measured and reported, never asserted for a content status (never self-certified).
- **republish** — rebuilding and publishing pack archives so pinned archives match the tree's manifest rows; an owner-gated action (O-05).
- **honest** — stating the real state instead of a silent no-op, guess or invented number: honest refusal, honest abstention, honest "not in your pack yet" card.
- **owner gate** — a decision reserved to the owner, named O-01…O-09 (O-05 = pack republish); agents surface gates and never self-sign them.
- **posture** — content stance is AI-created: all authored content carries `status: draft`; only qualified human review promotes it to verified/validated, no AI self-certification (ADR-0017).
- **word card** — the learner's tap card in the reader: printed form, stress, lemma, gloss, grammar line; PLAY slices the exact inflected form from the sentence clip.
- **parked** — a card deferred to the `later` column with its resume information preserved; parked is not closed — it resumes by explicit promotion.

## Not defined here

**frontier** appears only in the agent model-routing policy outside this repo
(`docs/`, `tasks/`, `state/notes/` never use it); it is deliberately absent above.
