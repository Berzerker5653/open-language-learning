# STANDARDS verdict — REVIEW-FIX-M1-PATH-VIS-001

Target: code d9a9ff48 / evidence cbbd8141 / ledger 40a5016d. Reviewer 2026-11-28 (t_34c98345).

## Verdict: PASS — 0 blocker, 0 major, 1 minor. Clean on hygiene.

## Commit / ledger hygiene (all verified by direct inspection)

- **Separation**: d9a9ff48 = product code + audit tool + harness only (10 files, no
  state/ paths). cbbd8141 = evidence only (6 PNG + 2 JSON + gates.log, all under
  state/evidence/FIX-M1-PATH-VIS-001/). 40a5016d = state/task-state.json + tasks/KANBAN.md
  only. Correct order (code 20:57:53 -> evidence 20:57:56 -> ledger 20:58:38).
- **Evidence paths exist by exact name**: all four task-state `evidence` entries
  (gates.log, result-green.json, farfuture-fold0-green.png, farfuture-fullpath-green.png)
  are on disk with those exact names. The ledger line names code+evidence shas; both are
  ancestors of HEAD (`git merge-base --is-ancestor` semantics, confirmed via git log lineage).
- **validate_handoff**: reviewer re-ran
  `python3 tools/validate_handoff.py --require-explicit-ledger-records` at current HEAD
  c97ba7c6 -> HANDOFF VALIDATION PASSED (2500 data files; the 3 WARNs — ADV-001, WEB-001,
  STORY-LISTEN-001 optional tasks lacking explicit ledger records — are pre-existing backlog
  entries unrelated to this lane).
- **task-state entry quality**: status done, attempts 2, `updated` is an ISO date, notes carry
  the full honest story (run-1 cap death, reason->notice rename, the vision-substitution
  disclosure with its reason). The disclosure of what was NOT verified (pixel claims) is
  exactly what the standards bar demands.
- **KANBAN.md row** matches the evidence and cites the same artifacts.

## Gates — reviewer re-verification at current HEAD (c97ba7c6, 2026-11-28)

Lane tier only, as required; no full workspace sweep; no test or gate script touched:
- `npx vitest run` (apps/desktop) -> **733 passed / 0 failed** (same count the lane claimed at
  its tree — holds at HEAD after 6 lanes landed on top).
- `npx tsc --noEmit` (apps/desktop) -> **clean**.
- `python3 tools/test_audit_learner_copy.py` -> **25/25 OK**.
- `git status --short` -> only a sibling lane's WIP (`apps/desktop/src-tauri/src/lib.rs`) —
  left untouched; nothing from this review's tree was swept into the lane commits.
Rust untouched by the lane (diff is TS/py/mjs/CSS) — no cargo gates owed.

## Test-tree sweep for superseded pins (AGENTS.md / lane-commits rule)

- Full FE suite green at HEAD => no orphaned red pins from the PathView change.
- The re-pinned PATH-LOCK-ORDER-001 test: verified STRENGTHENED, not weakened (removed a
  below-the-pin check only for a node that now must not render at all, and added the -1
  assertion plus the counted-row positive pin).
- Grepped the whole test/journeys tree for the touched surfaces (`path-later-units`,
  `later units`, `numbers-02`, far-future fixture titles, catalog counts): only
  path-view.test.tsx pins the new surface; journeys/harness/lesson matches are other
  alternates of the grep, none superseded.
- The lane committed its capture harness (scripts/path-far-future-capture.mjs) — correct:
  gates.log cites it as the acceptance instrument, so it is evidence-adjacent tooling to KEEP,
  not scratch junk.

## Repo conventions (AGENTS.md, CODING_STANDARDS.md)

- Docs obligation check (AGENTS.md "update docs in the same change when you alter…"): the
  change touches none of the listed categories (pack schema, persisted data model, provider
  interfaces, mastery/scheduling semantics, privacy, platforms, release gates). No docs commit
  was owed; none is missing. No architectural decision -> no ADR owed.
- Audit tool versioned in-place (v1.7.0 header + tests) per the tool's own convention.
- Commit message: completed-tense claims all trace to gates.log rows that ran
  (tsc/vitest/audit/prettier/build + both capture legs) — no unverified claims in the message.
- Privacy/security boundaries: no mic/collection/third-party-data surface touched.

## Findings

- **ST-M1 (MINOR)** — ~5 lines of prettier-format-only hunks (metersVisible line-collapse,
  accumulation-strip JSX wrap) ride inside the feature commit. Content-neutral and trivially
  revertable, but a formatting sweep inside a feature diff adds reviewer noise. Behavior: the
  repo-wide prettier lane (a28435f2) later normalized the tree anyway, so the drift was
  plausible pre-emptive formatting — worth a one-line note next time, not a card.

## Reviewer's own disclosure

- Reviewer ran ONE new probe test (scratch, deleted after the run; full output in
  reviewer-probe.log next to this verdict) to reproduce the S-D1 defect against the shipped
  component at current HEAD. No lane file, test, or gate was modified by this review.
