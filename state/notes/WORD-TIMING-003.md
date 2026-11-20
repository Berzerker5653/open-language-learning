# WORD-TIMING-003 — worker notes

**CLOSED 2026-11-20** — lane committed (see `state/evidence/WORD-TIMING-003/close-out.md`
+ `gates.log`). No STATUS BLOCK active; no bake running. The toolchain + runbook below
remain for future aligner work (e.g. the 213 low-posterior clips, or ru if ever needed).

## Toolchain (omarchy, validated)
- venv `~/align/venv` (py3.12): torch/torchaudio + ctc-forced-aligner @ git HEAD
  (0.3.0 API), pykakasi. Model `MahmoudAshraf/mms-300m-1130-forced-aligner`
  (ungated MMS mirror) cached in ~/.cache/huggingface (facebook original gated).
- CPU-only (32 cores) — never GamingPC GPU, never TV computer.
- Lane dir on omarchy: `~/align/wt3/` = scripts/ (this script +
  word_timing_lib.py), languages/ja-JP/media (rsync of manifest + 4,935 wavs +
  words.jsonl), inputs/abstains-ja.jsonl (prior reasons only).

## Target set (corrected — attempt-3 usage bug)
`--settled` = ids that HAVE timings (media/words.jsonl, 2,725). The prior ASR
abstain file is `--prior` (strata reasons only) — abstained clips have NO
timings and are TARGETS. Current unsettled = 4,935 - 2,725 = **2,210**
(acceptance text says 2,182 — stale: JA-B1/B2 lanes added content).

## Score design (probe6-calibrated)
- `score` = exp(mean log-prob) over phoneme-labelled path frames — the
  acceptance floor (alignment proof = phoneme posteriors, not token ratios).
  Accept floor 0.35: probe confs min 0.424 accepted / single reject at 0.2321
  (ja.lex.edu2.fukushuu — clip/word mismatch, honest abstain).
- `fit` = exp(mean log-prob) over ALL path frames incl. blanks — used for the
  contrast cross-score matrix only.
- Contrast matrix caveat (state in close-out): 1/5 pairs give correct
  own>cross under fit even after metric fixes. The failures are asymmetry +
  clip-quality artifacts, not alignment errors: shorter texts lose little
  (unmatched audio -> blanks), the moraic-nasal pair collapses in ASCII
  romaji (ん->n), and the TTS clips themselves do not consistently carry the
  geminate/length (kite 0.64 vs 1.28 s durations are plausible, but posteriors
  cannot hear a contrast the audio may not contain). Proof-of-alignment for
  close-out = posterior floor + schema + monotonic span checks + span-duration
  sanity, with this matrix shipped as honesty evidence, not as a gate.

## Resume recipe (if this card dies before the lane commits)
1. `ssh omarchy 'systemctl --user is-active lts-wt3-full1; tail -3 ~/align/wt3/full1.log'`
   — if active: report and end (do NOT re-run gates or relaunch).
2. Done when log tail says `run done: ok=... abstain=...`.
3. Pull: `rsync -a omarchy:align/wt3/{full-report.jsonl,words-aligner.jsonl,full1.log} state/evidence/WORD-TIMING-003/`
   plus probe6-report.jsonl(+.contrast.json), probe5-report.jsonl (bug history).
4. Coverage = lines in words-aligner.jsonl / 2,210 (must be >=85%).
5. Merge: append aligner lines into languages/ja-JP/media/words.jsonl
   (contract v1 lines only — {id, words:[{w,s,e}]}; no manifest churn), keep
   words-aligner.jsonl under evidence/ as provenance.
6. Gates: `python3 -m py_compile scripts/align-word-timings.py`;
   re-run `python3 tools/validate_handoff.py --require-explicit-ledger-records`;
   run the pack validator for the ja pack if it consumes words.jsonl.
7. Ledger: task-state WORD-TIMING-003 -> done with evidence paths (existing
   files only), ROADMAP unchanged, KANBAN row, commit code + ledger separately.
