# ADR 0032: Track pack media bytes that outrun the pinned published archive

Status: Proposed — agent-authored; acceptance is an owner decision, and the
exception is deleted the moment the owner republishes the reference packs.
Date: 2026-10-14

## Context

ADR-0016 as amended by ADR-0024 sets the media rule: the committed artifact is
`languages/<loc>/media/manifest.jsonl` (one row per asset with sha256, byte
length, sample rate, provenance and synthesizer identity), the `.wav` bytes
themselves never enter history, and a checkout restores them with
`scripts/fetch-pack-audio.sh`. That script resolves `pack_id` + version from
the pack manifest, finds the pinned entry in `catalog/packs.json`, downloads
the published `.lpk`, unpacks it through the install gate, and **fails if any
manifest row cannot be satisfied** — that is the guard that stopped CI from
silently testing a pack with no listening audio.

Measured on 2026-10-14, the tree and the published archives disagree:

| pack | rows the 0.4.0 archive supplies | rows the tree declares | delta |
| --- | --- | --- | --- |
| `org.openlanguage.ja-jp.reference` | 4,894 | 4,902 | +8 |
| `org.openlanguage.ru-ru.reference` | 4,846 | 4,856 | +10 |

The delta is the R12 journey content: eight Japanese and ten Russian sentences
in `sentences/journeys-2026-10-14.jsonl`, consumed by `curriculum/units/810…818`
(ru) and `820…825` plus two scenario conversations (ja). Those assets were
generated locally and are labelled `model-output` with synthesizer identity and
an explicit "AI output, not human-reviewed" note.

CI proved the consequence rather than predicting it: run `38615154690` failed
`rust` and `desktop-smoke` at the restore step, naming exactly those rows
(`the archive carries no ja.sent.office-notice-time.wav matching the manifest
row`). The pack cannot be assembled in a checkout, so install-mode `langpack
test` and the desktop tests that install a reference pack cannot run either.

## Decision

For manifest rows the pinned published archive predates, **track the generated
media bytes**, enumerated by asset id in `.gitignore`, until the packs are
republished. Nothing else changes: the media-coverage audit still requires an
asset for every addressable item (ADR-0024), `fetch-pack-audio.sh` still
verifies every row and never overwrites a file that already matches its row,
and install-mode validation stays strict. When the owner republishes at 0.4.1
(the pending O-01b decision, which also has to correct the licence metadata on
both catalog entries), the archive covers those rows, the tracked files are
deleted and the `.gitignore` negations are removed, returning to ADR-0024's
rule.

## Consequences

- The repository carries 18 files / 3.9 MB of pack audio it would not normally
  carry. The set is bounded and enumerable, not a general reopening of the
  media rule.
- Coverage stays strict in every direction: a row cannot be satisfied by an
  absent file, a tracked file whose bytes drift from its manifest row turns
  `fetch-pack-audio.sh --verify-only` and CI red, and no activity can address
  an unbaked item.
- The exception is visible where reviewers look: `git ls-files` lists the wavs,
  and `.gitignore` names them with the reason and the exit condition.
- Provenance does not change: the rows still say `model-output`, name the
  synthesizer and model hash, and mark the content draft pending qualified
  human review.

Executed 2026-10-16 (queue item D4): the end step ran with owner
authorization. Both reference packs were republished at 0.4.1
(`org.openlanguage.ja-jp.reference-0.4.1`,
`org.openlanguage.ru-ru.reference-0.4.1`, release commit
`20f994df05478f92b9d2399bbf655066e21ffda6`), and all 18 journey asset
basenames were matched against the published archives' member listings before
any deletion. The 18 tracked `.wav` files were removed from git and this
ADR's `.gitignore` exception block was deleted, returning to ADR-0024's
blanket rule (`languages/*/media/*.wav`). `scripts/fetch-pack-audio.sh` now
restores both packs' audio from the published 0.4.1 archives: 4,902 ja-JP
rows and 4,856 ru-RU rows checked, 0 rows failing.

## Alternatives

- **Republish both packs now at 0.4.1.** Cleanest, and it is already the owner's
  pending decision. Not available to an agent: publication, tags and release
  assets require owner authorization (AGENTS scope rule, `docs/15`).
- **Drop the audio-dependent content from this batch.** Shrinks the R12
  remediation the review asked for — the Russian pack's only B1/B2 listening and
  speaking activities are exactly those units.
- **Teach `fetch-pack-audio.sh` to tolerate rows the archive lacks.** Reopens
  the exact hole ADR-0024 closed: CI would then test a checkout where listening
  items have no audio, and install-mode `test` would fail anyway.
- **Bump the tree to 0.4.1 without publishing.** The restore step resolves the
  version through the catalog entry, finds none, and refuses; the desktop
  install tests fail for the same reason.
