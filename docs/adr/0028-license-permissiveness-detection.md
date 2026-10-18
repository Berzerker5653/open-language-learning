# ADR 0028: Licence-permissiveness detection in the pack audit

Status: Accepted (2026-10-17) — agent-authored; the owner signed the ADR on
2026-10-17. Severity is unchanged by that signature: the detection still ships
at `Info` in `crates/langpack/src/audit.rs` (the permissiveness classification)
and is pinned by `crates/langpack/tests/audit.rs:28` and `:66`. Any promotion
past `Info` remains a separate owner decision (O-01(a)).

Date: 2026-10-13

## Context

`LIC-002` asks the toolchain to compare licences. Before this change it compared
nothing, in either direction. Measured against `crates/langpack/src/audit.rs` at
the time of writing, the licence audit only ever:

- flagged unresolvable ids (`unknown_license`, which rejects `""`, `unknown`,
  `tbd` and a missing `spdx`);
- cross-checked the `redistribution_allowed` booleans between a source entry and
  the inventory records that cite it;
- reported `license_reference_only`, a missing inventory record for a cited
  source, and a missing attribution string when the source requires it.

`manifest.license.content_license` was read by nothing except the CLI's JSON
echo (`crates/langpack-cli/src/main.rs`), and `docs/10_LICENSING_AND_PROVENANCE.md`
promised a "blocking" incompatibility check that has never existed. The gap is
not hypothetical: `LIC-001` recorded that `languages/ja-JP/manifest.yaml`
declares `content_license: "CC-BY-4.0"` while every dictionary source it cites
(`edrdg-jmdict`) is `CC-BY-SA-4.0` — a BY declaration over a ShareAlike source,
which is exactly the "one direction only" defect that task was written about.
Nothing in CI said so.

Three ways to close it: block the build on any suspected mismatch; report the
mismatch and let a human decide; or keep a per-pack exception list so known
mismatches stay quiet.

## Decision

Add a deliberately small obligation model to the licence audit
(`crates/langpack/src/audit.rs`):

- Three obligations — `ShareAlike`, `NonCommercial`, `NoDerivatives` — read from
  the suffix of a Creative-Commons id (`CC0`/`CC0-1.0` impose none; `CC-BY*`
  variants impose whichever of `-SA`, `-NC`, `-ND` appear).
- Anything outside that table is **never judged**: proprietary ids,
  `LicenseRef-*`, `All rights reserved`, malformed ids and the ids
  `unknown_license` already rejects all produce no finding. The audit states no
  opinion it cannot ground in the two ids it was given.
- Two levels are compared, because a pack declares licences at two levels: each
  `license-inventory` record whose scope is `derived-from-source` against the
  `spdx` of the `source-entry` it cites, and the manifest's
  `license/content_license` against every cited source. The manifest level is
  where the real ja-JP defect lives; the record level catches drift before it
  reaches a manifest.
- Sources with `access.mode: "reference-only"` are excluded from the manifest
  comparison. They contribute no distributed material — the audit already
  rejects an inventory record that bundles from one — so `languages/ru-RU`'s
  `CC0-1.0` content licence over its CC-BY-NC verification pointer
  (`zalizniak-2010`) is honest, and reporting it would be a false positive.
  Measured: ru-RU emits no finding; ja-JP emits exactly one, against
  `edrdg-jmdict` (CC-BY-SA-4.0), the source its lexicon is built from.
- Findings use the new named code `license_less_permissive_than_source` at
  `Severity::Info`. The message names the material, both ids and the specific
  obligation that was dropped.

`Info` rather than `Warning` or `Error` is the load-bearing choice. `lint` fails
on warnings and `test` on errors, so any severity that gates would turn the
ja-JP pack red — and `main` red — over a terms question only the owner can
settle (O-01(a) is still open: relicense the pack text to BY-SA, or document why
BY is defensible). `Info` makes the finding visible in every audit output and in
CI logs without letting an unresolved legal question decide whether the tree
builds. No allowlist or waiver mechanism was added; a finding is a fact about
the pack, and suppressing it is a licensing decision, not a build decision.

## Consequences

- The audit now answers the question the licence docs already claimed it
  answered, so `docs/10_LICENSING_AND_PROVENANCE.md` and the pack-authoring
  contract were corrected in the same change to describe what actually runs.

- Packs carrying the defect reported it. `languages/ja-JP` emitted the
  manifest-level `Info` from `audit-licenses` on every gate run while still
  clearing all seven pack gates with exit 0 — measured, not assumed. The owner
  then resolved O-01(a) on 2026-10-13 by declaring the pack `CC-BY-SA-4.0`,
  which is what its dictionary layer obliges, so the finding no longer fires
  there; `valid-license-bysa-dropped` and `valid-audit` keep a deliberately
  wrong declaration on purpose, so the check stays covered.

- Promotion stays a deliberate ladder, each step owner-gated: `Info` (now) →
  `Warning` once no *released* pack trips the check — a condition now met: O-01(a) was
  settled 2026-10-13, O-01(b) shipped at 0.4.1 on 2026-10-16, and the live published
  pair is 0.4.2 (2026-10-18), so no released pack carries the old declaration and the
  promotion is purely an owner decision →
  `Error` only with a migration path for third-party packs. This ADR must be
  amended, not silently bypassed, at each step.
- The obligation table is CC-only, so a future pack under, say, an ODbL source
  produces no finding today. That is a known hole with a named shape: extend the
  table (and its tests) rather than adding a heuristic.

## Alternatives considered

- **`Severity::Error` now.** Correct end state for shipped packs, but it would
  have failed `test languages/ja-JP` on the day the repo went public, on a
  question the owner has not answered, with no waiver mechanism to fall back on.
  Rejected: a gate that blocks on an open owner decision teaches people to disable
  the gate.
- **A per-pack allowlist or waiver field.** Cheap to implement and immediately
  tempting, but it is a way to make the toolchain lie about a licence mismatch,
  and every waiver would itself need human review. Rejected: with `Info` severity
  there is nothing to waive.
- **Parse licence text or consult SPDX exception data.** Broad coverage, but
  licence-text interpretation is not a build step we can do reliably offline, and
  SPDX's own relationship data does not encode "derived work must carry the same
  licence" for non-CC terms. Rejected for now in favour of an explicitly
  conservative id table plus silence where the toolchain cannot judge.

## Verification

- `crates/langpack/tests/audit.rs`:
  `by_over_a_by_sa_source_names_the_dropped_obligation` (fixture
  `valid-license-bysa-dropped`) asserts exactly two findings — record and
  manifest — all at `Info`, naming `ShareAlike` and the cited source, and that
  no `Error` carries the code;
  `matching_and_unjudgeable_licences_produce_no_finding` (fixture
  `valid-license-bysa-kept`) asserts a BY-SA declaration over a BY-SA source,
  and a BY declaration over a `LicenseRef-Internal-1.0` source, produce no
  finding and no error — the same test's third source (`src-reference`, CC-BY-NC,
  `access.mode: reference-only`) is what pins the reference-only exclusion, so a
  ru-RU-shaped pack cannot be pushed into reporting a NonCommercial claim it does
  not make.
- The seven pack gates (`validate`, `lint`, `audit-curriculum`, `audit-lexicon`,
  `audit-licenses`, `audit-sources`, `test`) run over `languages/ja-JP`,
  `languages/ru-RU`, `examples/eo-community` and `examples/ar-ma` all exit 0.
  Measured twice: before the declaration fix `languages/ja-JP` printed one
  `Info` naming `edrdg-jmdict` (28/28 invocations still exit 0), and after the
  fix no shipped pack prints that line at all.
