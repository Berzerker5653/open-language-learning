# 20 — Contributor Review Packet

Five items for a first-time contributor fixing one thing. Each is usable
without reading anything else first. Every command below exists in this
tree; `file:line` cites where it is defined or run.

## 1. The one check for a pack-content fix

The most common contribution is a correction inside a reference pack
(`languages/ja-JP` or `languages/ru-RU`). The check is the pack
conformance gate — the same trio CI runs ("Pack conformance",
`.github/workflows/ci.yml:58-65`; local mirror `scripts/ci.sh:17-19`)
and the same trio `CONTRIBUTING.md:47` requires before a PR. Run from
the repo root (Rust comes from rustup; `rust-toolchain.toml` pins the
version):

```sh
cargo run -q -p lts-langpack-cli -- validate languages/ja-JP
cargo run -q -p lts-langpack-cli -- lint languages/ja-JP
cargo run -q -p lts-langpack-cli -- test languages/ja-JP
```

Use `languages/ru-RU` for that pack. `lint` folds in the curriculum,
sources, and lexicon audits (`crates/langpack-cli/src/main.rs:987-990`).

One prerequisite: reference-pack `.wav` bytes are gitignored (ADR-0016)
and the gate fails without them — a bare checkout prints ~4.9k
`error[media_missing]` lines and exits 1. That includes the 18 journey
assets: their tracked-by-name exception (ADR-0032) was deleted on
2026-10-16 once both packs were republished at 0.4.1. Restore the published,
catalog-pinned archive for **each** pack — the script's own default is
`languages/ja-JP`, so a call with no `--pack-dir` leaves `ru-RU`
unpopulated and its tests failing on missing media:

```sh
./scripts/fetch-pack-audio.sh --pack-dir languages/ja-JP --work-dir tmp/pack-audio
./scripts/fetch-pack-audio.sh --pack-dir languages/ru-RU --work-dir tmp/pack-audio
```

(`scripts/fetch-pack-audio.sh`, options in the usage block at lines
50-60; needs network, `--verify-only` checks an existing tree offline.)
`scripts/ci.sh` now performs both restores: it verifies each pack's media
first, downloads only what is missing, and stops with a named failure
instead of testing a half-populated tree — set `SKIP_PACK_AUDIO=1` to
refuse the download and see that failure.

A passing run prints one summary line per gate, verified on this
snapshot on 2026-10-14:

```
validate(scaffold): 0 error(s), 0 warning(s)
lint: 0 error(s), 0 warning(s)
test: 0 error(s), 0 warning(s)
```

Each gate then exits 0. `lint` fails on warnings as well as errors
(`main.rs:992`); `test` fails on errors only
(`main.rs:1019-1026`).

## 2. Reading a finding

The CLI prints one line per finding —
`{severity}[{code}] {file}{pointer}: {message}`
(`crates/langpack-cli/src/main.rs:232`). Fields: `file`, `path`, `code`,
`message`, `severity` (`crates/langpack/src/diagnose.rs:16-22`);
severity is `info`, `warning`, or `error` (`diagnose.rs:7-11`). A real
line from `lint languages/ja-JP` on this snapshot:

```
info[unused_source] sources.jsonl/2: source "pyopenjtalk" is not referenced by any content record
```

- `info` — severity. Printed but not counted; errors and warnings drive
  the summary and the exit code.
- `unused_source` — the stable finding code, emitted at
  `crates/langpack/src/audit.rs:149`. Grep the code under
  `crates/langpack/src` to see the exact rule that fired.
- `sources.jsonl/2` — location: pack-root-relative file plus a JSON
  pointer into it; JSONL documents address rows by line index
  (`diagnose.rs:13-14`, `crates/langpack/src/pack.rs:211`), and `/2` is
  the third line of `sources.jsonl`.
- The message states what is wrong and usually what to do about it.

What this means for you: an `error` blocks the gate; a `warning` also
fails `lint`; an `info` is a signal, not a blocker. The verdict is the
trailing `{label}: {N} error(s), {M} warning(s)` line
(`main.rs:289`) plus the exit code.

## 3. The bounded correction

You may change directly, leaving each item's `status` untouched:

- text corrections in content files: lexicon `forms`, `readings`,
  `glosses` (JSONL rows), sentence text, unit titles and summaries;
- a reference to the wrong existing id (a typo in `content_refs`,
  prerequisites, `allowed_vocab`);
- script-purity slips an audit already flags, e.g.
  `romaji_contains_kana` (`audit.rs:782`).

Send to a human instead — file it through
`.github/ISSUE_TEMPLATE/content-review.yml` (`CONTRIBUTING.md:74`):

- level judgement: CEFR band, difficulty, prerequisite chains, what
  vocabulary a unit is allowed to use;
- provenance and licence metadata: `sources.jsonl` entries,
  `licenses.jsonl`, the manifest licence block; pending licence
  selections are owner decisions (LIC-001);
- anything that would make an unreviewed claim look reviewed. Concretely:
  never flip a `status` to `validated`/`verified` without adding your
  own approved review-record line to `languages/<pack>/reviews.jsonl`
  in the same PR — the validator refuses the bare flip
  (`review_promotion_unsupported`, `crates/langpack/src/pack.rs:1002`) —
  and never claim a `reviewer_category` you do not meet: `verified`
  belongs to `qualified-human-expert`/`qualified-human-native-speaker`
  only (`schemas/v0.2/review-record.schema.json`,
  `languages/ja-JP/review/REVIEW_POLICY.yaml:86-89`).

The legitimate promotion path is human: an honest community reviewer
moves a `draft` item to `validated` by pairing the flip with their own
approved record (`CONTRIBUTING.md` §Reviewing language-pack content).
The constraint is on who judges, not on who edits.

## 4. What reviewers examine

Checks, not virtues. CI runs six jobs; reviewers read job output:

- `rust` (`ci.yml:20`): `cargo fmt --all --check` (55), clippy with
  `-D warnings` (56), `cargo test --workspace` (57), the pack
  conformance trio plus `audit-curriculum`/`audit-lexicon`/
  `audit-licenses` on both reference packs (58-74), and the generated
  example packs (81-91).
- `web` (93): `pnpm fmt:check`, `pnpm lint`, `pnpm typecheck`,
  `pnpm test`, `pnpm build` (103-107).
- `desktop-smoke` (109): restores pack audio (133-136), then launches
  the built app via `./scripts/smoke-desktop.sh` (141).
- `platform-compile` (149): Windows/macOS compile only; runtime
  behavior on those platforms is untested by CI (145-148).
- `security` (210): gitleaks secret scan (219), `pnpm audit
  --audit-level=high` (228), `cargo audit --deny warnings` (239) — that
  scan fails closed against the allow-list in `.cargo/audit.toml`, so a
  new advisory breaks the build instead of printing a warning that
  `cargo audit` alone exits 0 on — and SBOM via `tools/sbom.py` (243).
- `schemas` (250): `python tools/validate_handoff.py
  --require-explicit-ledger-records` (259) and its own test suite (260),
  the pack-audio and new-pack script tests (261, 265, 270, 273),
  `python tools/audit_content_templates.py languages/ja-JP
  languages/ru-RU` (277) — repetition counts and the pack-declared
  `task_sequence` claims of ADR-0037 are review inputs, not quality claims
  (274-276) — and `python tools/audit_learner_copy.py` (281): project ids must
  not appear in learner-facing copy.

On a content PR specifically they check: every status flip carries a
qualifying approved record (`pack.rs:1002`); `reviewer_category` is
honest (`languages/ja-JP/review/REVIEWER_KIT.md:48-51`); corrections
come with source or review evidence (`CONTRIBUTING.md:43`); no
copyrighted textbook content and no private learner recordings
(`CONTRIBUTING.md:43`); docs move with any schema/model/gate change
(`AGENTS.md`).

## 5. Telling the change is done

Evidence that counts:

- the gate summary lines with `0 error(s), 0 warning(s)` and exit 0 on
  a restored checkout (§1), pasted into the PR description;
- `HANDOFF VALIDATION PASSED (N data files checked)` from
  `python tools/validate_handoff.py` (`tools/validate_handoff.py:400`;
  CI runs it at `ci.yml:253`);
- `findings: 0` with exit 0 from `tools/audit_learner_copy.py` when you
  touched app copy (exit rule: `tools/audit_learner_copy.py:241`);
- green CI on the PR (§4); for a review batch, the merged PR — merging
  is what switches content to "reviewed by <pseudonym>"
  (`REVIEWER_KIT.md:53-56`);
- `./scripts/ci.sh` printing `CI OK` (`scripts/ci.sh:84`) on a clean
  full local run.

Evidence that never counts:

- an AI or agent declaring a review passed or content "natural":
  `ai-assisted` and `automated-check` records never promote
  (`REVIEW_POLICY.yaml:86-89`, `REVIEWER_KIT.md:51`); no required human
  gate may be satisfied by AI, including multi-model AI consensus
  (`REVIEW_POLICY.yaml:7-11`); AI may promote only to `screened`
  (`REVIEW_POLICY.yaml:115-116`);
- `HANDOFF VALIDATION PASSED` alone — the tool itself warns it checked
  structure only and leaves "linguistic correctness, source rights,
  calibration quality ... remain unverified"
  (`tools/validate_handoff.py:381`);
- content-template audit counts alone (review input, `ci.yml:263-265`);
- green `cargo test` or `pnpm test` — code tests, not language truth;
- a bundle that merely built — a Windows/macOS bundle proves linking
  only (`ci.yml:169-175`).
