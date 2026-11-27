# LEARNER-REVIEW-M2-001 — audit the Month-2 learner experience (days 31-60, RU + JA)

Same frozen contract as LEARNER-REVIEW-M1-001 (see
state/notes/LEARNER-REVIEW-M1-001.md — read it first; it is the contract).

Method recap (M1-validated): `scripts/sim_month1.py --from-day` walk
(sim harness supports resuming from M1's final state; extend with
--start-day 31 --days 30 from a fresh profile seeded through day 30) →
worklist → mechanical 100% pass → fresh-context review lanes (ja and ru
separate, per-chunk verdicts) → experience review → defect ledger →
residual-uncertainty manifest → chains to LEARNER-REVIEW-M3-001.

## M1-informed focus (defect distribution carried forward)

- Story/pool content at days 31-60: A2-band sentences/stories enter — the
  stress/orthography defect class (M1 D-008/D-009) scales with word count;
  run the mech pass BEFORE reviewer lanes so lanes see fewer mechanical
  errors.
- Verify FIX-M1-CONTENT-RU-001 pool density actually lifted RU inflow.
- Verify FIX-M1-PATH-VIS-001: the path view no longer shows the far-future
  wall at month 2 (the frontier has moved).
- M1 ASR posture unchanged (large-v3-turbo judge; CPU fallback when GPU
  full — export CUDA_VISIBLE_DEVICES='' — this pitfall cost a run).
- Known-limit flags from M1 carry into the M2 residual manifest until human
  review exists; never promote to "verified" silently.

## Acceptance

Same six bullets as M1 (sim logs 31-60 both packs; mech pass 100%;
per-chunk fresh-context verdicts; defects ledger with dispositions;
residual manifest + M3 card created; gates.log under
state/evidence/LEARNER-REVIEW-M2-001/).
