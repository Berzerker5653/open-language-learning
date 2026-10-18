# Owner-only residue — 2026-10-18

HEAD `9ca19fd feat(packs): declare runnable task sequences for one goal per band`;
`main` is **ahead 19** of `origin/main` — nothing in this list was pushed.
Supersedes nothing in `OWNER-QUEUE-2026-10-15.md` / `OWNER-CHECKLIST-2026-10-16.md`;
it re-measures their blockers against today's tree and names the one command that
is actually missing.

Every item here is owner-only for the reason AGENTS.md gives: a qualified human
decision, a device or spend decision, a rights decision, or an external
publication. An agent can measure and prepare all of it, and cannot clear any of
it.

## 1. ACC-001 — the Linux/Orca row: one command, then a human run

Measured on all three lab hosts today (`at-posture-2026-10-18.txt`): the
assistive-technology stack is **absent everywhere**.

| host | session | orca | ibus | ja engine | espeak-ng | speech-dispatcher |
| --- | --- | --- | --- | --- | --- | --- |
| GamingPC (gamingpc) | KDE Plasma, Wayland | MISSING | MISSING | MISSING | MISSING | MISSING |
| Omarchy (aih) | `tty`, no desktop | MISSING | MISSING | MISSING | MISSING | MISSING |
| Hermes worker (cachyos-x8664) | `tty`, no desktop | MISSING | MISSING | MISSING | MISSING | MISSING |

`at-spi2-core 2.62.1-1.1` **is** present on GamingPC, and it is the only lab host
with a graphical session — so the pinned environment in
`docs/21_HUMAN_REVIEW_RUNBOOKS.md` A.1 ("GNOME + Orca, `ibus` + Mozc/Anthy,
WebKitGTK app") can only be met there.

The single request (repo availability verified with `pacman -Si`, not run — I did
not use sudo):

```sh
sudo pacman -S --needed orca ibus ibus-anthy espeak-ng speech-dispatcher gnome-session
```

- `ibus-mozc` is **not** in the enabled repos on this host; `ibus-anthy`
  (`ibus 1.5.18-1`) and `fcitx5-mozc` are. The runbook accepts Mozc **or** Anthy
  and requires recording which engine, because composition behaviour differs.
- `orca` pulls `speech-dispatcher`, `liblouis`, `libwnck3` and the AT-SPI bridge
  itself, so the explicit extras above are for the pinned Japanese voice path and
  the IBus engine, not redundant.
- `gnome-session` is included because the runbook pins GNOME; the host runs KDE
  Plasma on Wayland today. If you would rather run Orca under the existing KDE
  session, drop that package and say so in the A.1 environment row — that is your
  call to record, not mine to make.

What the install still does **not** do: the 14 journey rows in
`docs/assessment/ACCESSIBILITY_AUDIT.md` are `HUMAN-ONLY` — what Orca actually
said is the observation. `ACC-001` stays `blocked` until a person fills those
rows with the pinned-environment line (`docs/21` A.1–A.3). D7 already has you
scheduling that pass.

Also unresolved for that pass: the app links WebKitGTK **2.52.6** from the
user-local sysroot (`scripts/tauri-env.sh`) while the system pkg-config reports
**2.54.1** (`docs/21`:85-89), and this session never launched the app because
your vite dev server holds `127.0.0.1:1420`, which `scripts/smoke-desktop.sh`
needs free.

## 2. PLAT-001 — Windows/macOS parity needs devices or spend, plus human reports

Current posture, read from the tree today (no change since the 2026-10-15
record):

- `platform-compile` in `.github/workflows/ci.yml` runs `pnpm build` plus
  `cargo check -p lts-desktop --all-targets` on `windows-latest` and
  `macos-latest`: **compile only**, and the workflow says so.
- `platform-bundles` is `workflow_dispatch` only and uploads **unsigned** bundles
  named `-UNTESTED-<sha>`; nothing is auto-published (ADR-0015).
- Every runtime check (`desktop-smoke`, the walkthrough) runs on `ubuntu-24.04`.
- `docs/platform/PLATFORM_REPORTS.yaml` holds **no** Windows or macOS record, and
  `langpack catalog --platform-reports` derives `community_confirmed_platforms`
  from human records only; it refuses to write `tested_platforms`, which stays
  maintainer/owner evidence and is Linux-only today.

Needed from you: either Windows and macOS devices (a human runs the pinned build
and files a report bound to `app_version`+`app_commit` and
`pack_version`+`pack_sha256`) or paid runner capacity — an unopened spend
decision. A green compile job is not parity evidence and no agent can sign a
runtime report.

## 3. PERF-002 — the tier set is the blocker, and one old line is now wrong

- `docs/performance/BUDGETS.yaml` is still `status: provisional`,
  `frozen: false`; the freeze condition is SPEECH-001 baseline spikes on the
  named tiers **plus an ADR** recording the real provider/model per tier. D9
  confirmed provisional stands. Budgets are not mine to freeze.
- Declared tiers: `ref-dev` (not a support target), `low`, `typical`, `high`.
  Evidence on disk is one tier: `state/evidence/PERF-001/tier-omarchy-2026-10-08.md`
  (`typical`), plus ASR/TTS summaries and CI timings. `low` needs a physical
  4c/8t, 8 GB, integrated-graphics machine nobody in the lab has.
- **Correction to the record** (`KANBAN` row `K-55`, 2026-10-08: "high/GPU is
  unmeasurable on the current lab machines (no CUDA device)"): GamingPC today has
  `GPU 0: NVIDIA GeForce RTX 5090` and a CUDA toolkit (`/opt/cuda/bin/nvcc`,
  `cuda-gdb`). So the hardware excuse is gone for the `high` tier.
- What actually blocks it instead: the pinned aligner sidecar is a **CPU-only**
  build. `apps/desktop/sidecar/linux-x64/SIDECAR.yaml` pins whisper.cpp
  `1.9.4` @ `60c0be6a` with
  `build_flags: -DGGML_NATIVE=OFF -DGGML_SSE42=ON -DGGML_F16C=ON -DGGML_FMA=ON
  -DGGML_BMI2=ON -DGGML_AVX=ON -DGGML_AVX2=ON -DGGML_AVX512=OFF` — no
  `-DGGML_CUDA=ON` — and ships `libggml-cpu.so.0` with
  `requires_cpu: x86-64-v3`. Staging a GPU build changes the pinned sha256s and
  the platform dir, so it is a packaging decision for you (and it changes what
  `high` means), not something to slip into a feature commit.

## 4. Publishing — blocked on your authorization, not on work

- `main` is **ahead 19** of `origin/main`. I did not push.
- Evidence comments on `issue://1` for **R12, R13, I04, I05, I08** are queued and
  unposted: posting is external publication (AGENTS: needs direct owner
  authorization), and it should follow the push so the comments can name shipped
  SHAs. R12 and R13 are both now closed in-tree (`9ca19fd`, `f4b9336`) with
  acceptance evidence in `state/evidence/UPPERBAND-TASK-JOURNEYS-001/` and
  `state/evidence/RU-MODALITY-PRACTICE-001/`; the checkbox in `issue://1` still
  reads unchecked.
- Reference-pack republish (O-01b) and any app release (D6) stay yours; the
  0.4.1 archives and member-level accounting are already on record under
  `state/evidence/RC-0.4.1-2026-10-15/`.

## 5. Rights decisions still open

- `zalizniak-2010` is **CC-BY-NC-4.0** (`languages/ru-RU/sources.jsonl:2`),
  `mode: reference-only`: the dataset is not bundled or mirrored and no dictionary
  text is reproduced. It is accepted by `audit-licenses` and blocks nothing today,
  but it is the reason a commercial-distribution claim for the RU pack needs your
  decision. ru-RU declares 3 sources: that one plus two CC0.
- Pack media: 4,856 ru-RU rows, all `model-output` (qwen3-tts) — no third-party
  performance rights involved, but the AI-output licence position is an owner
  policy choice for a commercial release.

## 6. Human review capacity — the only real content blocker

- `languages/ru-RU/review/WORKLIST-2026-10-12.md`: **5 open items, 0 closed**;
  `BLK-REVIEW-CAPACITY` (line 151) — "Until then all 120 stay draft and every
  band stays 'partial (review pending)'."
- `JA-A2-002`, `JA-B1-002`, `JA-B2-002` stay `blocked`. ADR-0017 §2 stands: the
  product ships at this posture, promotion still needs a human record.
- Content this card added is **also** unreviewed, and reviewers should see it as
  part of the same batch: new unit `826-admin-bill-payment-revision.yaml`, three
  retargeted transfer stages (`ja.activity.b1-work-notice-call-scenario`,
  `ja.activity.b2-film-friends-scenario`, `ja.activity.admin-bill-payment-scenario`
  — `scenario`/`interaction` → `retrieval`/`speaking`, so the app now drives them
  through guided speaking), one new independent stage
  (`ja.activity.admin-bill-payment-write`), and six `task_sequence` declarations.
  The machine check proves those five roles exist, run and carry the right
  support shape; it cannot say they are the right five roles. `docs/21` now says
  that explicitly in C.1.

## 7. Engineering residue deliberately left alone (not yours, not this card's)

- `cargo run -p lts-langpack-cli -- test tools/pack-templates/example-pack` still
  exits with `error[media_manifest_absent] … declares 4 audio-addressable
  item(s)` — a template pack with no media manifest. Reproducible, unfixed.
- `npx prettier --check .` at the repo root is red on exactly six files
  (`App.tsx`, `home.tsx`, `hub.tsx`, `journeys/harness.tsx`,
  `journeys/kanji-decomp.journey.tsx`, `kanji-decomposition.ts`). All six are red
  at HEAD too; reformatting them would bury a task-scoped diff.
- ja-JP control pack: **793 units, 3,034 of 4,591 activities runnable, 1,557
  declared with no engine runner, 118 blocked on missing media rows**. The runner
  table (ADR-0036) counts them honestly; closing them is engine or pack work on
  its own card.

## Evidence

- `state/evidence/OWNER-RESIDUE-2026-10-18/at-posture-2026-10-18.txt` — the
  package/session probe for all three hosts, repo availability, the GPU/CUDA
  probe and the tier-evidence listing.
- `state/evidence/UPPERBAND-TASK-JOURNEYS-001/` (ACCEPTANCE.md, audit, coverage
  cross-check, pack/web/cargo/handoff gate logs) and
  `state/evidence/RU-MODALITY-PRACTICE-001/` (ACCEPTANCE.md, coverage, cargo log).
- `docs/assessment/RELEASE_COVERAGE_RU.yaml` — five separate counts, cross-checked
  `checked 35 claims; MISSING: none`.
