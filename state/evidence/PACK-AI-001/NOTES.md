# PACK-AI-001 — AI pack-authoring kit, notes

Head: `17dbfb2` plus the working tree described below. Captured 2026-10-13.

## What the kit is now

| piece | file |
| --- | --- |
| the route an author (or a human directing an AI) follows | `docs/QUICKSTART_PACK_AUTHORING.md` |
| the normative rules | `docs/PACK_AUTHORING_CONTRACT.md` |
| the copy-paste brief for an AI author | `tools/AI_LANGUAGE_PACK_AUTHOR_PROMPT.md` |
| the machine scaffold | `scripts/new-pack.py` |
| the scaffold's own invariants | `scripts/test_new_pack.py` |
| the two conformance proofs | `examples/eo-community/`, `examples/ar-ma/` |
| the enforcement | `.github/workflows/ci.yml` (rust job, schemas job), `scripts/ci.sh` |

`docs/PACK_AUTHORING_KIT.md` was created during this task and then folded into
the quickstart: two documents claiming to be the entry point is worse than one,
and the quickstart already owned the workflow.

## Acceptance walk (`tasks/ROADMAP.yaml:1403-1428`)

1. **"self-contained prompt/template … does not depend on chat history"** —
   `tools/AI_LANGUAGE_PACK_AUTHOR_PROMPT.md` lists the files to read, the seven
   gate commands, the audio rule and the finish list. It no longer claims the
   toolchain does not exist (`PACK-001`…`PACK-005` are `done`) and no longer
   sends authors to `examples/minimal-language-pack/`, which fails `validate`
   and `test` (measured, and stated in the prompt itself).
2. **"forces a source/licence matrix and an unresolved-question output"** — the
   prompt's first process step is the matrix; `new-pack.py` writes
   `review/UNRESOLVED.md` (12 items for the Arabic scaffold: Darija variants,
   segment inventory, phonotactics, prosody, source locator, register) and the
   kit states that only a named human may clear it.
3. **"a second toy/community language can be generated as a conformance proof
   without engine edits"** — `examples/eo-community/` (Esperanto, Latin,
   on-ramp). All seven gates 0/0 including install-mode `test`.
   `git status --porcelain crates/ apps/ schemas/` empty during authoring: no
   engine edit was needed, so the acceptance condition is met literally.
4. **"at least one non-Japanese RTL/multi-script fixture to check direction,
   segmentation, and language-independent assumptions"** —
   `examples/ar-ma/` declares two scripts (`arabic`, `latin`) in
   `language/orthography.yaml`, lists both in `manifest.scripts`, ships shards
   for both, sets `capabilities.rtl: true`, and carries Arabic-script forms with
   a real minimal pair (كتاب / كباب). All seven gates 0/0. The check found one
   language-independence gap, recorded below.

## Engine gap this task found (not fixed here — reporting is the fix boundary)

`capabilities.rtl` is defined and validated in
`schemas/language-pack-manifest.schema.json` and is stored/round-tripped, but
**nothing in `apps/desktop` reads it**: there is no `dir` attribute, no
direction-aware style, no per-route RTL layout. An RTL pack therefore installs,
validates and renders — left-to-right. Consequences worth stating to a reader:

- an author declaring `rtl: true` is making an honest claim about the *content*
  and an inaccurate implied claim about the *renderer*;
- the kit and `new-pack.py` record this in `review/UNRESOLVED.md` whenever
  `--rtl` is used, so the gap travels with the pack instead of being discovered
  by a learner;
- a fix needs a decision (mirror the whole shell vs per-container direction vs
  bilingual layout), so it is engine work with an ADR, not a pack-side patch.
- Tracked as `RTL-001` in `tasks/ROADMAP.yaml` (`required_for_desktop_1_0:
  false`, dependency `PACK-AI-001`): ADR first, then a direction-aware desktop
  renderer, then a fixture assertion over a non-Japanese RTL pack.

## Honest limits of the proofs

- **Audio is placeholder silence**: every row in both packs records
  `synthesizer.runtime = "fixture"`, `model = "fixture-silence"`, and a `notes`
  field saying it is a placeholder. That is why install mode passes on a fresh
  checkout with no download and no TTS, and it is also why neither pack may ship
  to a learner. `.wav` bytes are committed here deliberately — `.gitignore`
  ignores `languages/*/media/*.wav` only — and total 304 KB for both packs.
- **Esperanto content is real, Moroccan Arabic content is not verified.** The
  `ar` scaffold's forms are standard/MSA-flavoured written in correct Arabic
  script; Darija forms, vowel quality and register judgements need a native
  speaker and are listed in `examples/ar-ma/review/UNRESOLVED.md`. A language
  with no built-in content gets `<unverified>` placeholders rather than invented
  words — pinned by a test.
- Conformance ≠ curriculum. Both packs are `maturity: experimental` — the same
  tier the reference packs hold, and the tier `tools/validate_handoff.py`
  insists on because it cannot authorize trust promotion itself. Every row is
  `draft`/`review-needed` and no band is claimed complete.

## Process honesty

The inventory scout (`PackKitInventory`) hit the 30-minute runtime cap with
**zero output**, as two earlier audit slices had. The implementation itself was
produced in the main session and verified by the gate runs above. The cap is
worth remembering for delegation: a bounded slice finishes, a whole-kit slice
does not. `PackGenerator` did finish inside the cap — and overwrote the main
session's generator on the way out, which supersedes the first draft of this
paragraph; the next section is the accurate record.

## Second process record: a sub-agent overwrote the generator, and what it cost

The earlier paragraph in this file said neither sub-agent wrote anything to the
tree. That was wrong when written and is wrong now: `PackGenerator` finished at
26m57s — inside the cap — and its queued write landed **after** my stop message,
replacing `scripts/new-pack.py` with a 426-line version of its own design. It
ran no gates, so nothing it wrote was ever measured.

Recovery, and why the outcome is trustworthy rather than merely restored:

1. `scripts/test_new_pack.py` (written against the real generator's interface)
   failed 11/11 against the intruder and 11/11 **passed** against the restored
   version — the test suite is what caught a silent overwrite.
2. Regenerating both packs from the restored generator produces trees
   **byte-identical** to the committed `examples/eo-community/` and
   `examples/ar-ma/` when the same `--source-url` values are used, so the
   committed packs demonstrably came from the committed generator.
3. All fourteen gate invocations were re-run after the restore: 0 errors /
   0 warnings, and `crates/`, `apps/`, `schemas/` stayed clean.

The intruder's findings were still worth reading, and two changed this landing:

- **`maturity: community` was a false tier claim** in the generated manifests.
  It is now `experimental`. Unmeasured code review of
  `tools/validate_handoff.py` pointed at the rule; the validator then failed
  the packs with `this scaffold checker cannot authorize trust promotion`,
  which confirmed it.
- The validator's `examples/` branch assumed every example is a manifest-only
  stub and exempted it from the full record checks. It is now content-aware:
  stubs still short-circuit (and still fail a release check), complete packs
  under `examples/` fall through to the schema path. Consequence stated
  plainly: `--release-readiness` went from 3 failures to 5, the two additions
  being `examples/{eo-community,ar-ma}: pack is experimental/unreviewed` — the
  same honest class as the reference-pack failures, not a new defect.

Delegation lesson, revised: the cap is not the only failure mode. A sub-agent
writing into the same tree as the main session can produce **late, unmeasured
damage**; give it a scratch directory or a file it owns, never the file you are
editing.

## Third process record: the same agent class recreated the entry point I deleted

`PackKitDocs` (19m19s, still inside the cap) landed **after** the landing commit:
it created `docs/PACK_AUTHORING_KIT.md` (194 lines, self-described as "the entry
point") and added cross-links in `docs/04_LANGUAGE_PACK_SPEC.md`,
`docs/16_CONTENT_AUTHORING_AND_REVIEW.md` and `docs/PACK_AUTHORING_CONTRACT.md`.
That decision had already been taken and reversed once in this task: the
contract now said "start at `docs/QUICKSTART_PACK_AUTHORING.md`" on one line and
"the entry point … is `docs/PACK_AUTHORING_KIT.md`" on the next. Two documents
both claiming to be the door is the failure mode, so the file was deleted and the
links retargeted to the single route. Its damage was contained (one new file,
three one-line additions) because it was given docs only, never the generator or
the packs — the lesson from the previous section applied.

Its findings were checked rather than trusted, and two were real and are now
fixed in the docs. Measurements at this head, run in the main session:

| target | `validate` | `lint` | install-mode `test` |
| --- | --- | --- | --- |
| `tools/pack-templates/example-pack/` | 0 / 0 | 0 / 0 | **1 error** — `media_manifest_absent`, 4 audio-addressable items, no manifest |
| `examples/minimal-language-pack/` | **1 error** — `script_unknown` | (not run) | **4 errors** |

Consequently: `docs/PACK_AUTHORING_CONTRACT.md` §Worked example no longer calls
the template "a complete, minimal, lint-clean pack" (it is a reading example and
a `lint` starting point; CI runs only `lint` there), and
`docs/04_LANGUAGE_PACK_SPEC.md` §Purpose no longer tells an author to start from
the manifest stub — it names the scaffold, the one route and the two conformance
packs, and states the stub's measured failures.
