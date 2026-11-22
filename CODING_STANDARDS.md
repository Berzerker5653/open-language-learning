# Coding Standards — reviewer checklist

For reviewing any diff (agent or human). Machine-enforced gates are named, not
re-explained — a red gate blocks; never weaken a gate to pass it (rule J8).
The reviewer's real work is section B. Gate tiers: lane commits run the scoped
gates for touched packages; full workspace sweeps run at release candidates
only (owner directive 2026-11-19).

## A. Enforced by machine — name the gate, do not re-litigate it

- [ ] `cargo fmt --all --check` — rust-static job
- [ ] `cargo clippy --workspace --all-targets -- -D warnings` — rust-static
- [ ] Rust tests: `cargo test --workspace` / nextest shards — rust-test
- [ ] Web: `pnpm fmt:check`, `pnpm lint`, `pnpm typecheck` (tsc strict),
      `pnpm test` (vitest), `pnpm build` — web job
- [ ] Pack conformance: `langpack validate|lint|test` (plus `audit-curriculum
    |audit-lexicon|audit-licenses|audit-sources` for pack changes) —
      rust-conformance job, `scripts/ci.sh`
- [ ] Id charsets `^[a-z0-9]+(?:[._-][a-z0-9]+)*$`, pack ids
      `^[a-z][a-z0-9.-]+$` — `crates/domain/src/ids.rs` via the langpack CLI
- [ ] Ledger: `python tools/validate_handoff.py --require-explicit-ledger-records`
      — schemas job
- [ ] Review promotion: no `validated`/`verified` status flip without a
      qualifying record in `reviews.jsonl` — `crates/langpack/src/pack.rs`
- [ ] Pack audio never committed; archives restored from `catalog/packs.json`
      sha pins — `scripts/fetch-pack-audio.sh` in CI
- [ ] Secrets/advisories: gitleaks, `pnpm audit --audit-level=high`,
      `cargo audit` — security job
- [ ] Built app launches headless — desktop-smoke (`scripts/smoke-desktop.sh`)
- [ ] Ticket/ADR ids stay out of learner-facing copy —
      `tools/audit_learner_copy.py` — schemas job

## B. Judgement calls — flag on the diff if violated

- [ ] Tests assert behavior, not implementation trivia (AGENTS.md).
- [ ] Deterministic core logic; no language-specific data baked into the engine.
- [ ] Persisted learner data or pack-schema changes ship versioning and a
      migration path; a major architecture change ships with an ADR
      (`docs/adr/`).
- [ ] Confidence is kept separate from correctness: speech/content analysis may
      abstain; no fabricated linguistic verdict, no linguistic penalty for a
      technical failure or abstention (docs/09).
- [ ] Privacy minimized: no new collection, no upload path without an obvious
      notice before first use, no private recordings or secrets in the repo.
- [ ] Offline paths stay first-class — a new online feature degrades offline,
      it does not replace the offline path.
- [ ] Accessibility semantics land with the component (labels, keyboard,
      contrast, text scale) — not deferred to a later audit.
- [ ] Third-party packs stay untrusted data: declarative capabilities only, no
      script execution; archive bounds and schema versions checked (AGENTS.md).
- [ ] Review records are honest evidence: `approved` needs real scope and
      notes; agent band reviews promote nothing (content stays `draft`).
- [ ] Language claims carry provenance (source, license, access date) in pack
      metadata; contested linguistics is marked for human review, not asserted.
- [ ] Commits are task-scoped; a commit message asserts only verifications
      that actually ran, with deferred evidence noted in the card's gates.log.
- [ ] No public-history rewrites; no "cleanup" rewrites of immutable evidence
      docs (`docs/13`, `docs/21` sample runs).
- [ ] Out-of-scope additions: the diff does exactly what the card asked —
      flag extras, drive them to their own card.
- [ ] New docs claims are measured from artifacts (manifests, counts, CI),
      never copied from older prose.
