# FIX-WIN-RESERVED-NAME-001 — aux/lexicon/LICENSE-AUX renamed for Windows checkout

CI run 44924654098 (and every run since f816f5c): platform-compile
(windows-latest) died AT actions/checkout with
`error: invalid path 'aux/lexicon/LICENSE-AUX'` — AUX is a Windows
reserved device name, so no Windows runner could check the repo out.

Rename: `aux/lexicon/LICENSE-AUX` -> `aux/lexicon/LICENSE-kaikki.txt`
(via `git mv`; no prior naming convention existed in aux/lexicon —
kaikki names the data source). License text bytes unchanged (it never
contained its own filename).

Card premise "nothing parses the filename programmatically" was WRONG —
updated live references:
- scripts/build-aux-lexicon.py (LICENSE_AUX constant + anti-regression
  comment, docstring x2, provenance license_file field written by
  --write, two --check FAIL messages)
- scripts/test_build_aux_lexicon.py (tmp-dir copy name x2, failure
  message, provenance assertion)
- aux/lexicon/ru.provenance.json (license_file field; slice_sha256
  unchanged — provenance content itself is not hashed by the gate)
- aux/lexicon/README.md (ships-here bullet + reserved-name note)

NOT touched (historical records, deliberately):
- state/evidence/REVIEW-READER-FLOW-001b/* and state/evidence/FIX-READER-FLOW-001b-2/*
  (review prose describing the pre-rename state)
- git history (checkout failure comes from the HEAD tree only)

No Rust/TS consumer: apps read only aux/lexicon/<lang>.jsonl; grep
confirmed no LICENSE-AUX strings in apps/crates/tools or ci.yml/ci.sh
(ci.sh runs the unittest battery + build-aux-lexicon.py --check, which
IS the aux license gate).
