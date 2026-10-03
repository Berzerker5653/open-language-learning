# Project Status

Generated handoff state: 2026-10-02

## Overall

Implementation started 2026-10-02. Monorepo bootstrapped; domain core work in progress.

## Current milestone

M0 — Bootstrap and technical proof

## Completed tasks

- `BOOT-001` — monorepo, toolchains, CI, ADR-0004 (evidence: `state/evidence/BOOT-001/`).
- `ARCH-001` — domain IDs/versions/evidence/mastery/curriculum/pack model + speech provider
  contracts (evidence: `state/evidence/ARCH-001/`).

## Next task

`BOOT-002` — Tauri desktop shell and shared UI skeleton.

## Owner decisions already resolved

- OMP-only autonomous development workflow.
- No streaks.
- Local-first/offline-capable core.
- Japanese is the first reference language.
- Language packs must be AI-authorable and declarative.
- Speech recognition and pronunciation analysis are separate.
- Privacy defaults to local microphone processing.

## Do not ask the owner again for these unless they explicitly change them.

## Environment blocker (affects BOOT-002 only)

`webkit2gtk-4.1` is not installed on the Linux reference machine and `sudo` needs a password.
Owner action when convenient: `sudo pacman -S webkit2gtk-4.1`. Native Tauri builds are blocked
until then; all other work continues.

## Handoff audit status

Proposed corrections prepared 2026-10-02; original archive preserved. Handoff validation passes
(44 validator tests); strict pack preflight fails as expected (11 blockers) and those requirements
are preserved. Implementation began 2026-10-02.

Default goal: desktop Japanese B2-like release candidate (`REL-001`). Optional AI/mobile/web/advanced work and public publication require separate scope. Before public release, source-code and original-content licenses remain owner decisions (`LIC-001`); qualified review capacity, source rights and speech calibration are still future gates. See `REVIEW_REPORT.md` for findings and validation limits.
