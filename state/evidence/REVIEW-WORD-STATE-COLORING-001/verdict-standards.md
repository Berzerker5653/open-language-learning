# WORD-STATE-COLORING-001 / REVIEW-WORD-STATE-COLORING-001 — STANDARDS verdict

Axis: (b) STANDARDS — repo conventions (naming, commit discipline, evidence paths) + ledger hygiene (task-state evidence points at committed gates.log; KANBAN.md row honest).
Evidence reviewed: code 2a5e71af, ledger 68b9409a (state/task-state.json + tasks/KANBAN.md), state/evidence/WORD-STATE-COLORING-001/gates.log, learner-inspection.md, audit.json, reading.tsx/App.tsx/styles.css/reading.test.tsx, schemas/v0.2/review-record.schema.json.

## Verdict: FAIL (ledger/standards defects — do not approve as-is)

### Findings
- **S1 — Evidence path in task-state/KANBAN points at committed gates.log, but the committed gates.log is itself inconsistent with the committed PNG evidence.** state/task-state.json's WORD-STATE-COLORING-001 evidence is `["state/evidence/WORD-STATE-COLORING-001/gates.log"]` — the file is committed (in 2a5e71af) and its contents (tsc clean; vitest targeted 26/26; full desktop 680/680; 390px capture + learner-inspection note) are internally consistent with the learner-inspection.md. However the gates.log line "390px capture: ... audit.json (unseen 8 plain / learning 1 teal / confirmed 1 muted)" is backed by audit.json, but the visual captures (phone-0/1/2-*.png) do not show the confirmed state — see spec D1 (phone-2-confirmed.png byte-identical to phone-1-paragraph.png; shows a teal-outlined selected word, not muted ink-faint). Gates.log at face value is honest about the harness exit; the PNG evidence it points at is not.
- **S2 — Ledger commit + KANBAN row are honest in shape but slightly overstated.** Ledger 68b9409a ("ledger(WORD-STATE-COLORING-001): done + gates evidence", attempts 2) flips ready->done and adds the evidence array + summary; the KANBAN.md row (tasks/KANBAN.md:57) reads "done 2026-11-25" with the same claims as the feature commit and includes evidence path. Naming/commit discipline is otherwise clean: single feat commit (feat(desktop): in-text word-state coloring in the reader (U4)) + separate ledger commit, exactly the repo's convention. The overstated claim is only the evidence-capture fidelity noted in S1/spec D1 — the row's "390px capture" statement is true in form but the confirmed shot does not demonstrate it.
- **S3 — Minor hygiene:** packages/ui/src/styles.css adds a double blank line after the `.word--confirmed` block (`+` then a blank line before the reduced-motion comment at :1805/:1807) — trivial, not blocking. commit discipline otherwise clean (feat commit + ledger commit, task-scoped, no scope creep).
- **S4 — Naming/paths:** file/path conventions match repo (state/evidence/<TASK-ID>/{gates.log,audit.json,learner-inspection.md,phone-*.png}); commit messages use the repo's `feat(desktop): ...` / `ledger(<TASK>): done + gates evidence` style. review-record schema is satisfied in spirit (a markdown verdict with axis/verdict/findings, not a JSON review-record line — the repo's own precedents in state/evidence/REVIEW-*/ use the same markdown shape; noted for the record, no defect).

### Good (verified)
- task-state.json status done, attempts 2, evidence points at the committed gates.log — present in the feature commit tree (git show --stat 2a5e71af confirms).
- KANBAN.md row is honest in status/evidence shape and cites the code commit `2a5e71af`.
- No out-of-scope file changes (no source-lane files touched beyond reading.tsx/App.tsx/styles.css/reading.test.tsx; no pack/re-publish).
- gates.log path is committed (git show 2a5e71af confirms) and the claims inside match the learner-inspection.md.

## Verdict: FAIL — S1 (gates.log's capture line points at a confirmed-state PNG that is not faithful to the claim) + S3 (trivial blank line). S2/S4 otherwise clean. Spawn the FIX follow-up for the evidence re-capture (same as SPEC D1); do not mark this gate green as-is.
