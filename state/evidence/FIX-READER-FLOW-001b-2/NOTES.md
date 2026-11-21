# FIX-READER-FLOW-001b-2 — aux/lexicon/LICENSE-AUX shipped for the CC-BY-SA/GFDL slice

## What landed
- f816f5c fix: `aux/lexicon/LICENSE-AUX` (dual CC BY-SA 4.0 / GFDL 1.3 notice,
  no Invariant Sections / Front- or Back-Cover Texts, explicit "NOT the repo's
  Apache-2.0" clause, frozen attribution string, ShareAlike consequence with
  deed/legalcode/FDL links); `license_file` key added to committed provenance
  AND emitted by `--write`; README references the file; `--check` (already
  wired in scripts/ci.sh) fails if the file is missing or stops naming both
  licenses; docstring line 18 promise is now true.
- ru.jsonl untouched: slice sha re-verified against the pin (44287c8a…269a,
  405,825 rows). No regeneration.

## Gates (lane tier — Python-only lane, no cargo/TS surface touched)
- `.venv/bin/python -m unittest discover -s scripts -p test_build_aux_lexicon.py`:
  Ran 17, OK (3 new tests + extended round-trip incl. license-removal FAIL path).
- `.venv/bin/python scripts/build-aux-lexicon.py --check`: OK (405,825 rows).
- `python3 tools/validate_handoff.py --require-explicit-ledger-records`: PASSED.
Full outputs: gates.log.

## Ledger note
No task-state/ROADMAP record for FIX-READER-FLOW-001b-2 — FIX cards follow the
001b-1 precedent (evidence dir + card-id-tagged commits, validator does not
require records for non-ROADMAP ids). Planner reconciles board vs this commit.
Sibling-lane dirty tree (reader/audit WIP + lib.rs.rej) was left untouched;
this commit stages exactly the five lane files.
