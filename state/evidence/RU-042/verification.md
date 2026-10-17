# RU-042 — verification log (2026-10-17, hermes-worker snapshot)

Environment note: no `.venv` existed in this snapshot and system `python3`
(3.14) lacks `referencing`/`jsonschema`/`yaml`. Created the project venv
the CI expects (`uv venv .venv && uv pip install -r tools/requirements.txt`
— pinned `referencing==0.37.0`); `.venv/` is gitignored and not part of the
diff. Snapshot git has a single squashed commit, so `git log` over
`70ec683..20f994d` was impossible (see provenance-batch.md); the captured
numstat artifact was used instead.

## cargo run -q -p lts-langpack-cli -- validate languages/ru-RU

exit 0. Final line:

```
validate(scaffold): 0 error(s), 0 warning(s)
```

(preceded by two standing `info` lines: `media_item_without_reading`,
`media_unbuilt` — same as the pre-change baseline.)

## cargo run -q -p lts-langpack-cli -- lint languages/ru-RU

exit 0. Final line:

```
lint: 0 error(s), 0 warning(s)
```

(standing `info` lines: media_item_without_reading, media_unbuilt,
unused_source for the new ledger row — info only.)

## cargo run -q -p lts-langpack-cli -- test languages/ru-RU

**exit 1 — pre-existing environment failure, not introduced by this batch.**
Final line:

```
test: 1 error(s), 0 warning(s)
```

The single error is
`error[media_unbuilt] media/manifest.jsonl: the media manifest declares
4856 asset(s) and none of them are present; install and build must not
proceed on audio this pack never built (run scripts/generate-pack-audio.py
first, ADR-0016)` — the .wav bytes are gitignored and absent from this
snapshot. Proof it is pre-existing: the same command run on a baseline copy
of the pack with all four changed files restored from HEAD
(`/tmp/ru-042-baseline`, since deleted) also exits 1 with exactly that one
error. `scripts/generate-pack-audio.py` was not run (media bake is out of
scope for a data batch; running it would rewrite pack bytes).

## cargo test -p lts-langpack

exit 0. Final block:

```
running 0 tests
test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s
```

(all 16 suites ok; 125 tests passed, 0 failed, incl. the two ru-referencing
tests in `tests/validate.rs`/`tests/audit.rs`.)

## .venv/bin/python tools/audit_content_templates.py languages/ja-JP languages/ru-RU

exit 0. Final line:

```
  [identical-grammar-sets] band on-ramp: 2 units share the same 1-element grammar-concept set: ru.unit.on-ramp.numbers-01, ru.unit.on-ramp.numbers-02
```

(standing template findings identical to the pre-change pack; exit 0 is the
CI gate.)

## .venv/bin/python tools/audit_learner_copy.py

exit 0 (run exactly as ci.sh:121 runs it, repo-wide — it has no per-pack
argument). Final lines:

```
LEARNER COPY AUDIT v1.0.0: 36 source files scanned, 22 test files skipped
findings: 0
```

## .venv/bin/python tools/validate_handoff.py --require-explicit-ledger-records

exit 0. Final line:

```
HANDOFF VALIDATION PASSED (1960 data files checked)
```

(with two standing WARNs for optional tasks ADV-001/WEB-001, unrelated to
ru-RU.)

## Addendum — GamingPC re-run with the media bytes present (2026-10-17)

GamingPC holds the gitignored clips: `languages/ru-RU/media` = 4,856 `.wav`
files, matching the manifest row for row (verified with `find … -name
'*.wav' | wc -l` = 4856). The same three commands were re-run there after
the batch landed in the working tree, and the audio-dependent step that
failed above passes:

```
cargo run -q -p lts-langpack-cli -- validate languages/ru-RU
  validate(scaffold): 0 error(s), 0 warning(s)          exit 0
cargo run -q -p lts-langpack-cli -- lint languages/ru-RU
  lint: 0 error(s), 0 warning(s)                        exit 0
cargo run -q -p lts-langpack-cli -- test languages/ru-RU
  test: 0 error(s), 0 warning(s)                        exit 0
```

So the `test` exit 1 recorded above is confirmed to be the absent-bytes
environment, not the batch. With the bytes present the full media audit
runs and finds nothing: 0 errors, and notably 0 warnings, i.e. the
corrected reading and the media row satisfy the reading/text alignment that
`crates/langpack/src/audit.rs` enforces in every audit mode
(`media_text_not_declared_reading`).

The stale clip was then re-baked here — see `stress-correction.md` item 2
for the command, the new sha256 (`b4b4e490…`), and the reuse-flag trap —
and the pack was re-validated afterwards:

```
cargo run -q -p lts-langpack-cli -- test languages/ru-RU
  test: 0 error(s), 0 warning(s)                        exit 0
```

`git diff --stat languages/ru-RU/media/manifest.jsonl` shows 1 insertion and
1 deletion: exactly the one asset row, no collateral rewrites (the generator
touches only `--only` rows).

## Consequence for the audio restore path

`scripts/fetch-pack-audio.sh` resolves a pack by `pack_id` + `version` from
`manifest.yaml` (`:198-199`) and requires exactly one matching entry in
`catalog/packs.json` (`:201-205`), failing with
`pack … must be published (owner gate O-05) before its audio can be restored
into a checkout`. It then copies only rows the tracked manifest demands
(`:262-293`). `scripts/ci.sh:21-34` therefore tries `--verify-only` first and
downloads the published archive on machines that do not carry the clips.

Two independent consequences of this batch:

1. **Version.** `manifest.yaml` now says `0.4.2` and no 0.4.2 entry exists in
   the generated catalogue, so a fresh checkout cannot restore ru-RU audio at
   all until the owner regenerates `catalog/packs.json`
   (`scripts/build-catalog.sh`, agent-forbidden) and publishes the 0.4.2 pack
   assets.
2. **Byte identity.** Even at the old version the published 0.4.1 archive
   carries the pre-correction clip (`abefb681…`), while the tracked row now
   demands `b4b4e490…`. A version bump is therefore the honest record: the
   published 0.4.1 archive can no longer satisfy this manifest either way, so
   silently keeping 0.4.1 would have hidden an asset-identity mismatch behind
   a version that claims to match.

Local machines that already hold the clips (GamingPC, and anything with a
populated `tmp/pack-audio` cache) are unaffected: `--verify-only` succeeds
before any download is attempted. CI on a clean runner will fail the ru-RU
audio restore step until the 0.4.2 publish lands; `tasks/KANBAN.md` carries a
queue item for it.
