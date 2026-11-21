# FIX-WIN-RESERVED-NAME-001 — aux/lexicon/LICENSE-AUX renamed for Windows checkout

CI run 44924654098 (and every run since f816f5c): platform-compile
(windows-latest) died AT actions/checkout with
`error: invalid path 'aux/lexicon/LICENSE-AUX'` — AUX is a Windows
reserved device name, so no Windows runner could check the repo out.

PHASE 1 (commit 74001ed): renamed the FILE
`aux/lexicon/LICENSE-AUX` -> `aux/lexicon/LICENSE-kaikki.txt`
(via `git mv`; license bytes unchanged). CI run 44932615472 windows job
still failed checkout: `invalid path 'aux/lexicon/LICENSE-kaikki.txt'` —
because the DIRECTORY component `aux` is itself a Windows reserved
device name (reserved names apply to directories too).

PHASE 2 (this commit): renamed the DIRECTORY `aux/` -> `auxdata/` and
updated every live consumer:
- lib.rs aux_slice_path(): candidates now data/auxdata/lexicon (new
  primary), legacy data/aux/lexicon kept as final fallback for existing
  non-Windows installs, repo-tree dev candidate + bundle resource
  candidate moved to auxdata; 1 of 3 aux tests switched to the new
  spelling, 2 kept on legacy to cover the fallback.
- scripts/stage-pack-bundle.sh: bundle overlay maps auxdata/lexicon.
- scripts/build-aux-lexicon.py: AUX_DIR, docstring, provenance
  license_file, FAIL messages.
- auxdata/lexicon/ru.provenance.json + README + LICENSE-kaikki.txt
  header.
- state/notes/READER-FLOW-001.md: AMENDMENT block recording the dir
  move (old contract prose left intact as the record it is).

Tree-wide reserved-name scan (all path components, incl. trailing
dot/space rules): `aux` was the ONLY reserved component in git ls-files.

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
