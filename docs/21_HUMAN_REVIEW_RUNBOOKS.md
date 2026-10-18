# Human review runbooks (O-03, O-06, qualified language review)

Three gates in this project cannot be closed by an agent, because the thing
being measured is human perception: an assistive-technology pass (O-03 →
ACC-001), the owner's hands-on pass (O-06), and qualified human review of
AI-drafted language content (`tasks/KANBAN.md`, open-question rows O-02, O-03 and
CANDO-PROGRESS-001's review remainder). Each runbook
below is a complete procedure: what to prepare, what to do in order, what to
record, and what the machine has already proven so the human does not repeat
it.

These runbooks do not promote anything. `languages/ja-JP/review/REVIEW_POLICY.yaml:115-116`
limits AI promotion to `screened`; `docs/15_AUTONOMOUS_DEVELOPMENT.md:92`
requires acceptance evidence before a task is `done`, and `:98` reserves
publishing, spending and licensing decisions for the owner. A runbook that is
executed by an agent is not evidence for these three gates.

## 0. Host vocabulary and evidence labels

Hosts, named exactly in every step:

| name | what it is |
| --- | --- |
| any Linux desktop with a display | the AT test host: GNOME + Orca, `ibus` + Mozc/Anthy, WebKitGTK app |
| GamingPC | build machine: cargo, the ~9.7k gitignored pack audio, `.venv`, root `node_modules` |
| Windows | NVDA + WebView2 + Microsoft IME (bundles produced, never tested — ADR-0015) |
| macOS | VoiceOver + WKWebView + Japanese input (same untested status) |
| Omarchy | a lab clone used for remote jobs: `python3`, `git` and `node`/`npm`, no `cargo`, no `pnpm`, and no root `node_modules`/`.venv`/bulk pack media (all gitignored, so absent from job snapshots) |

Every command line carries exactly one label plus its host:

- `VERIFIED-HERE` — run on **GamingPC** on 2026-10-15 by the agent that wrote this
  document; the quoted output block is that run. GamingPC is the build host, so
  these are the numbers a build machine produces — they are never an AT result.
- `VERIFIED-ELSEWHERE-YYYY-MM-DD` — not run on the build host by this document; an
  existing `state/evidence/` file records it, cited inline with its own date.
- `RUNS-ON-<host>-UNVERIFIED-HERE` — required command whose toolchain is absent on
  the labelled host, or which has no evidence file at the time of writing.
- `HUMAN-ONLY` — a perception/judgement step, not a command.
- `VERIFIED-IN-SNAPSHOT` — run inside a remote-job snapshot clone, which is a bare
  checkout: gitignored bulk media, root `node_modules/` and `.venv/` are all
  absent there. Numbers that depend on that bareness carry this label and are
  **not** what the build host reports.

---

# Runbook A — Screen-reader and IME pass (O-03 → ACC-001)

Owner gate: `tasks/KANBAN.md`, open-question row **O-03**. Worksheet:
`docs/assessment/ACCESSIBILITY_AUDIT.md`.
Who runs it: a person who uses the screen reader routinely (the worksheet's
sign-off table at `:107-113` asks for AT expertise level). Host: **any Linux
desktop with a display**. Only the Linux/Orca row blocks the desktop release
candidate — Windows/macOS bundles are produced but untested
(`docs/assessment/ACCESSIBILITY_AUDIT.md:23-25`).

## A.1 Pin the environment, one row per run

Capture exact values, never "latest" (`:19-21`, `:27`):

```sh
git rev-parse HEAD                                     # VERIFIED-HERE (GamingPC)
pkg-config --modversion webkit2gtk-4.1                 # VERIFIED-HERE (GamingPC)
PKG_CONFIG_PATH="$HOME/.local/opt/tauri-sysroot/usr/lib/pkgconfig" pkg-config --modversion webkit2gtk-4.1   # VERIFIED-HERE (GamingPC)
orca --version                                         # VERIFIED-HERE (GamingPC)
espeak-ng --voices=ja | head -3                        # VERIFIED-HERE (GamingPC)
ibus version 2>/dev/null || busctl --user get-property org.freedesktop.IBus /org/freedesktop/IBus org.freedesktop.IBus.Version   # VERIFIED-HERE (GamingPC)
ls /usr/share/ibus/component/ | grep -i "mozc\|anthy"  # VERIFIED-HERE (GamingPC)
```

Evidence (build host GamingPC, 2026-10-15, at HEAD `5a84d20`; this host is **not**
an AT host):

```
5a84d20b82176195ed3f20c7709ea9512290f81f
2.54.1
2.52.6
error: command not found: orca
error: command not found: espeak-ng
error: command not found: ibus
(grep: no match, exit=1)
```

Read that as a shopping list: the AT host must install Orca, `espeak-ng` (or
another ja voice) and `ibus` + Mozc/Anthy before the run. Note the two WebKitGTK
values: the system pkg-config sees **2.54.1**, while the app is linked against
**2.52.6** from the user-local sysroot that `scripts/tauri-env.sh` puts on
`PKG_CONFIG_PATH`. Record the AT host's own two values, and record which one the
bundle was built against.

## A.2 Setup and log capture

Per `docs/assessment/ACCESSIBILITY_AUDIT.md:44-55`: Orca running with a
Japanese-capable voice; `ibus-daemon -drx`, add Mozc (or Anthy), switch with
`Super+Space` (record which engine — composition behaviour differs); start the
app, then test each condition separately: screen-reader only · keyboard-only ·
200% zoom · `prefers-reduced-motion: reduce`.

```sh
source scripts/tauri-env.sh                            # VERIFIED-HERE (GamingPC) — file exists, 13 lines, sourced by scripts/launch-preview.sh:6
pnpm tauri dev                                         # RUNS-ON-Hermes-worker-UNVERIFIED-HERE (pnpm exists only there; GamingPC has node v26.11.1 and npm but no pnpm)
RUST_LOG=info pnpm tauri dev 2> state/evidence/ACC-001/run-L1.log   # RUNS-ON-Hermes-worker-UNVERIFIED-HERE (log-capture form required by :39)
```

GamingPC has no pnpm, so use the repo's own pnpm-free path there:
`scripts/launch-preview.sh` and `scripts/smoke-desktop.sh` fall back to
`cargo build -p lts-desktop` plus bare vite (`scripts/launch-preview.sh:14-22`,
`scripts/smoke-desktop.sh:16-30`) — `RUNS-ON-GamingPC-UNVERIFIED-HERE`: this
session never launched the app, because the owner's vite holds `127.0.0.1:1420`
and the smoke script needs that port free.

Built bundles land in `apps/desktop/src-tauri/target/release/bundle/` if the
runner prefers a packaged build over `tauri dev`.

A packaged **deb** needs one step before it installs on a current LTS target:
`./scripts/finalize-deb.sh <the.deb>` rewrites the generated `Depends: … libgtk-3-0`
entry into `libgtk-3-0t64 | libgtk-3-0`, because `libgtk-3-0` no longer exists as a
package name on Ubuntu 24.04 or Debian 13 — without it `apt install ./the.deb` fails by
metadata there, while Ubuntu 22.04 and bookworm are fine. The script reports the before
and after `Depends:` lines and proves nothing else changed (the data member's sha256 and
every other control field); `scripts/test-finalize-deb.sh` pins that behaviour. Record in
A.1 which build you finalized, since finalizing changes the package digest.

## A.3 The 14 journeys, in order

Work the matrix at `docs/assessment/ACCESSIBILITY_AUDIT.md:63-78`. Each row:
focus lands sensibly, state is announced (not colour-only), Japanese is
announced as Japanese. `HUMAN-ONLY` for all 14 rows — what Orca actually said
is the observation.

For the surfaces that changed since the worksheet was written, the reader must
hear exactly this (labels are in the tree; the hearing is the human half):

| surface | what must be announced |
| --- | --- |
| Today · one-session action, `apps/desktop/src/home.tsx:284,287` | the single `data-session-begin` button: "Start today's plan — {N} activities, about …" |
| session panel, `apps/desktop/src/home.tsx:260` | section `Today's session` |
| pause/stop summary, `apps/desktop/src/home.tsx:237` + `:240` | section `Session summary` (`role="status"`), copy "Session stopped after {done} of {total} activities." |
| capabilities header, `apps/desktop/src/home.tsx:437-438` | section `What you can do now` |
| goal map, `apps/desktop/src/home.tsx:618-619` | section `Goal map`, heading "Capabilities you are building" |

Journeys 4 (Dictation) and 5 (Writing) are the IME-critical ones
(`:68-69`, risk §4 at `:87-93`): candidate window placement, `Escape`
cancelling composition versus clearing the field, `Enter` committing a
conversion instead of submitting the form. If they fail, file the defect with
the exact engine version — a webview composition bug is not fixable in this
app, and the kana-only + romaji fallback is a product decision (`:91-93`).

## A.4 Furigana announcement test (the markup claim is stale)

`docs/assessment/ACCESSIBILITY_AUDIT.md:95-103` describes the reading as a
sibling `<small>` line at `apps/desktop/src/practice.tsx:67-69` and
`apps/desktop/src/App.tsx:1772-1774`. That is no longer true: K-54 (the K-54 row of
`tasks/KANBAN.md`)
replaced it with real ruby markup — `apps/desktop/src/ruby.tsx` renders
one `<ruby>` per word with `<rp>` fallback and `<rt>` annotation, never shows
ruby for an all-kana headword, and never makes a romanisation an `<rt>`
(contract-tested in `apps/desktop/src/ruby.test.tsx`). Call sites are
`apps/desktop/src/practice.tsx:80` and `apps/desktop/src/reading.tsx:113`;
`grep -n Ruby apps/desktop/src/App.tsx` → no match
(`VERIFIED-HERE`, GamingPC).

The test itself is unchanged and still `HUMAN-ONLY`: for a kanji word with a
reading shown, record which of these Orca says — headword then reading
(acceptable) · reading twice (defect) · nothing for the reading (defect).

## A.5 Record and sign off

Per failure: route, component/file, what Orca actually said, what it should
have said, condition (`:80-83`). No audit-only workarounds; nothing may be
marked "as designed" that an AT user cannot perceive. Then fill the human-only
sign-off table `:107-113`. An incomplete matrix does not block development,
but no release may claim accessibility conformance beyond the signed rows
(`:115-116`).

## A.6 Windows and macOS rows

Not runnable on Linux. To fill W1/M1 you need the actual machines: NVDA +
WebView2 + Microsoft IME Japanese; VoiceOver + WKWebView + macOS Japanese
input. Missing here: the hardware, the AT, and the built bundles
(`RUNS-ON-GamingPC-UNVERIFIED-HERE` for the bundle build). Until someone runs
them those rows stay empty (`docs/assessment/ACCESSIBILITY_AUDIT.md:23-25`).

---

# Runbook B — Owner hands-on pass (O-06)

Owner gate: `tasks/KANBAN.md`, open-question row **O-06** — "AI cannot perform or
sign it", the repo went public 2026-10-13 but the pass is still open. Run it against
the published 0.4.0 artifact; the owner authorized O-01b on 2026-10-16, so run
it against the published 0.4.1 release instead — that is the state in which the
18 journey clips sit in an installed pack (Runbook C.2).
`state/evidence/O-06-2026-10-10/owner-report.md`. Host: the owner's machine;
build leg on **GamingPC**.

## B.0 State to know before clicking

- Catalog pins both reference packs at `0.4.1` (`catalog/packs.json:19,35`,
  republished 2026-10-16; live-fetch proof of the pin mechanism, taken at `0.4.0`: `cargo test -p lts-desktop --lib -- --ignored both_pinned` →
  1 passed in 76.16 s,
  `VERIFIED-ELSEWHERE-2026-10-14`,
  `state/evidence/PACK-DL-ALLOWLIST-001/live-install-2026-10-14.txt`).
- The owner's installed store still holds `0.2.0` (open-question row O-06);
  switching the active pack happens in Settings ▸ Language packs.
- The two reasons 0.4.1 was owed, and they were not the same: the **ja-JP** catalogue
  entry's licence label was wrong (`catalog/packs.json:8` said `CC-BY-4.0` while the
  pack declares `content_license: "CC-BY-SA-4.0"`, `languages/ja-JP/manifest.yaml:33`
  — owner gate O-01a; the 0.4.1 entry now reads `CC-BY-SA-4.0`), and **both**
  published 0.4.0 archives predated the 18 journey assets (the `.gitignore`
  exception block, ADR-0032). The ru entry already read
  `CC0-1.0` (`catalog/packs.json:24`, matching `languages/ru-RU/manifest.yaml:30`), so
  the earlier "wrong on both entries" was inaccurate for ru and has been retracted.
  0.4.1 is now published (the pre-publication build record is
  `state/evidence/O-01B-2026-10-15/NOTES.md`); the 0.4.1 archives carry all 18
  clips, and the git exception plus the 18 tracked wavs were deleted on
  2026-10-16 (queue item D4), so a 0.4.1 install is complete (Runbook C.2).
- A fresh-profile install pulls one reference pack: **~319 MB of archive** at 0.4.1
  (318,722,747 B ja / 318,489,935 B ru), which unpacked to ~336 MiB on the 0.4.0 archive
  (`scripts/smoke-desktop.sh:50-51`); ~637 MB if both packs are installed. Time it
  rather than assuming a budget — no install-duration measurement exists in the
  repository, and the 900 s figure in CI is the walkthrough window
  (`LTS_SMOKE_TIMEOUT`), not an install.

## B.1 Build and launch

```sh
cargo build -p lts-desktop                             # VERIFIED-ELSEWHERE-2026-10-15 — the workspace compiled and tested clean on GamingPC: state/evidence/GATE-2026-10-15/cargo-test-rerun.txt, 59 test binaries ok, exit 0
scripts/launch-preview.sh                              # RUNS-ON-GamingPC-UNVERIFIED-HERE — builds if needed, serves build.devUrl itself and takes the vite down on exit
```

`scripts/launch-preview.sh` starts its own vite for `build.devUrl` when
nothing is serving it (`VERIFIED-HERE`, GamingPC — script read, 44 lines; it
also honours an operator's `WEBKIT_DISABLE_DMABUF_RENDERER`). Do **not** start
the headless smoke while the owner's vite holds `127.0.0.1:1420`
(`tasks/KANBAN.md`, open-question row O-06).

## B.2 Machine leg first, then the human sweep

```sh
LTS_SMOKE_TIMEOUT=900 scripts/smoke-desktop.sh         # RUNS-ON-GamingPC-UNVERIFIED-HERE — 182 s observed on GamingPC and 207 s pinned to 2 CPUs (the `tts-004-close` row of tasks/KANBAN.md; also scripts/smoke-desktop.sh:55-56)
```

Success line: `SMOKE OK (13 routes walked)`
(`scripts/smoke-desktop.sh:164`; floor is 12 route acks at `:84-90`). The
harness launches under `xvfb-run` with a throwaway `LTS_DATA_DIR`
(`:61`) and fails unless the marker file shows: a scenario started or locked
(`:130`), the mic picker present (`:138`), a non-empty fresh plan / first-run
plan (`:146,150`), and the pack-install progress stages (`:159`).

Previous GamingPC run recorded findings 7 and 8 as working live
(`state/evidence/O-06-2026-10-10/owner-report.md:47-48`:
`scenario-support:ja.scenario.first-meeting.greeting:consumed`,
`scenario-transfer:…:done`, `shadow-buttons:4:1`) — `HUMAN-ONLY` re-check in
the rebuilt app, because the owner's observation predates every rebuild.

## B.3 The human sweep

Run the checklist at `state/evidence/O-06-2026-10-10/owner-report.md:76` — all
`HUMAN-ONLY`:

1. five-tab nav + hub drill (findings 1-2: single-instance relaunch, tab
   latency);
2. Settings ▸ Profile data → Switch profile (finding 9);
3. Speech cards split + Playback output section — picker or the honest
   "system sound settings decide" sentence; either is a correct outcome,
   report which you see (finding 10, K-88);
4. Settings ▸ Language packs → switch active pack, listen for the
   loudness-normalised audio, then tap-lookup なまえ in
   「私の名まえは何ですか」 (findings 5/6/11);
5. re-test Shadowing controls and the scenario ladder/transfer variants
   (findings 7/8);
6. K-81 nav sign-off.

Also re-probe the two open content/model items: the "echoey, metallic, tinny"
character of reference audio (finding 11 — level fixed at generation; the
Qwen3-TTS engine switch and the full re-bake are **done and recorded**, ADR-0023,
`state/evidence/O-06-2026-10-10/owner-report.md:90-92` and the
`audio-bake closure` row of `tasks/KANBAN.md`, which reports ru-RU fully baked at
4,775 items — so what remains is whether the character survives in the shipped
clips, finding 12 at `:78-96`), and the `Start with speech` gate (finding 3: it now
requires an installed *recognition* component, not all four —
`apps/desktop/src/onboarding.test.tsx:255`).

## B.4 What the machine already pins (do not re-verify these by hand; the human half follows)

Desktop journey snapshots pin the new session semantics
(`VERIFIED-ELSEWHERE-2026-10-15` for the vitest count: desktop vitest 26 files
/ 239 tests, the `guided-session` row of `tasks/KANBAN.md`; in a bare checkout the
suite is not runnable because root `node_modules/` is gitignored, and it did run on
GamingPC on 2026-10-15 — `state/evidence/GATE-2026-10-15/web-vitest.txt`):

- `apps/desktop/src/journeys/session.journey.tsx` — `[data-session-pause]` /
  `[data-session-stop]` (`:26-27`), "Today's session" with "Session paused — 1
  left to do." (`:81-83`), "Session summary" with "Session finished — 2 of 2
  activities." (`:96-97`), summary disappears (`:106`), honest stop copy
  "Session stopped after 0 of 2 activities." + "What you finished is saved.
  The rest is still on your plan." (`:118-121`).
- `apps/desktop/src/journeys/progress.journey.tsx:30-52` — h1 "What you can do
  now", `Talk about family`, "used in practice: Recall", "What changed", "1
  skill is getting old", "What to do next", "Next up: Greet someone and say
  who you are", then the `Progress` section with `Recorded detail` +
  `ja.lex.demo.obaasan`, and document-order proof that `Goal map` follows.

The human half is what Orca/eyes hear, whether the copy reads honestly in
context, and the things no snapshot can see: audio routing, IME, latency feel.

---

# Runbook C — Qualified language review (AI-drafted content + 18 media assets)

Owner gate: `tasks/KANBAN.md`, open-question row **O-02** (delegated to GitHub contributors;
`community-reviewer` → `validated`, `qualified-human-*` → `verified`). Kits:
`languages/ja-JP/review/REVIEWER_KIT.md`, `languages/ru-RU/review/REVIEWER_KIT.md`.
Host: any machine with the checkout; the reviewer's judgement is `HUMAN-ONLY`.

## C.1 What is under review

The R12 batches: `languages/ja-JP/review/WORKLIST-2026-10-14.md` (goals
`ja.goal.b1.work-professional`, `ja.goal.b2.film-analysis`) and
`languages/ru-RU/review/WORKLIST-2026-10-14.md` (goals
`ru.goal.a2.past-events`, `ru.goal.b1.practical-problems`,
`ru.goal.b2.style-register`). Both are entirely AI-drafted and every id still
carries `status`/`review_status: draft`.

Each of those goals is now represented by a pack-declared `task_sequence`
(ADR-0037): one unit per upper band names the encounter, scaffolded and
independent stages of its own, plus a changed-context stage and a gated reuse
stage in a later unit of the same goal. The audit machine-checks that the five
named activities exist, have an engine runner, and carry the right support and
gate shape; it cannot check whether they are the *right* five. The declaration
is authored data like the sentences beside it — reviewing the goal means
reviewing those role choices too.

Machine-side queue (rerun these; they never promote anything):

```sh
python3 tools/audit_content_templates.py languages/ja-JP languages/ru-RU   # VERIFIED-HERE (GamingPC)
python3 tools/audit_learner_copy.py      # VERIFIED-HERE (GamingPC)
python3 -m unittest discover -s tools -p 'test_audit_content_templates.py' # VERIFIED-HERE (GamingPC)
python3 -m unittest scripts/test_renormalize_pack_audio.py                 # VERIFIED-HERE (GamingPC)
```

```
pack languages/ja-JP: 831 sentences in 4 file(s), 792 units; 92 finding(s)
  [leading-token] sentences/journeys-2026-10-14.jsonl: prefix 'ともたち' in 2/8 sentences (share 25.00%)
  [skeleton] band a1: skeleton '_ _' repeated 53x
pack languages/ru-RU: 825 sentences in 3 file(s), 818 units; 35 finding(s)
```
(exit=0. The audit header states it measures structural repetition only and
makes no claim about CEFR level, linguistic quality, or pedagogical validity.)

```
LEARNER COPY AUDIT v1.0.0: 33 source files scanned, 22 test files skipped
findings: 0
```
(exit=0; `Ran 11 tests … OK` and `Ran 8 tests in 0.374s … OK` for the two test
runs.)

All four are CI-enforced as well: the `schemas` job runs the content-template
audit and its tests (`ci.yml:271-272`), the learner-copy audit and its tests
(`:275-276`) and the re-normalize test (`:264`); they were all green in today's
local batch (`state/evidence/GATE-2026-10-15/SUMMARY.txt`).

Lexicon-level queues sit in `docs/review/worklists/`
(`VERIFIED-HERE`, GamingPC: `wc -l` = 964 ja / 534 ru rows; kinds:
ja `gloss-divergence` 684 + `not-in-jmdict` 280; ru `stress-unverified` 316,
`pos-low-confidence` 85, `feature-undetermined` 81, `plural-only-noun` 43,
`gender-conflict` 9 — the ru kit's "9 gender conflicts / 85 low-confidence
notes", `languages/ru-RU/review/REVIEWER_KIT.md:32-40`). Start there; Zalizniak
6th ed. auto-verifies 3,684/4,000 ru readings, and inherent `ё` without a
combining mark is correct, not a defect.

## C.2 Playing the 18 new clips from a plain checkout

No journey asset is tracked any more: the ADR-0032 exception was deleted on
2026-10-16, so all 18 sit behind the same blanket gitignore rule as the
~9.7k bulk rows, and are restored from the published 0.4.1 archives:

```sh
git ls-files 'languages/*/media/*.wav' | wc -l          # VERIFIED-HERE 2026-10-16 → 0
ls languages/ja-JP/media/ja.sent.office-notice-time.wav # restored + gitignored — 8 ja: office-notice-time, office-question-email, office-room-reserve, office-thanks-notice, film-long-interesting, film-friend-recommended, film-teacher-points, film-recommend-friend
ls languages/ru-RU/media/ru.sent.a2.j1.wav             # restored + gitignored — 10 ru: {a2,b1}.j{1,2,3} plus b2.j{1,2,3,4}
```

The manifest rows for all 18 exist. Both 2026-10-14 worklists now carry a corrected
"Audio bake obligation — discharged by 0.4.1; the listening check is still open" section
(`ja:66-82`, `ru:74-89`); the bake question is closed there, the listening question is not.

```sh
grep -c 'ja.sent.office-notice-time\|ja.sent.film-friend-recommended' languages/ja-JP/media/manifest.jsonl   # VERIFIED-HERE (GamingPC) → 2
grep -c 'ru.sent.a2.j1' languages/ru-RU/media/manifest.jsonl                                                 # VERIFIED-HERE (GamingPC) → 1
```

```sh
./scripts/fetch-pack-audio.sh --help                            # VERIFIED-HERE (GamingPC) → usage: scripts/fetch-pack-audio.sh [options]; --pack-dir DIR (default languages/ja-JP), --catalog FILE, --work-dir DIR, --verify-only (offline, no network, no cargo)
./scripts/fetch-pack-audio.sh --pack-dir languages/ja-JP --work-dir tmp/pack-audio
./scripts/fetch-pack-audio.sh --pack-dir languages/ru-RU --work-dir tmp/pack-audio
./scripts/fetch-pack-audio.sh --verify-only --pack-dir languages/ja-JP
./scripts/fetch-pack-audio.sh --verify-only --pack-dir languages/ru-RU
```

```
restore ja: summary languages/ja-JP: rows checked=4902 files valid=4902 files restored=8 files already valid=4894 rows failing=0   (exit=0)
restore ru: summary languages/ru-RU: rows checked=4856 files valid=4856 files restored=10 files already valid=4846 rows failing=0  (exit=0)
verify  ja: summary languages/ja-JP: rows checked=4902 files valid=4902 files restored=0 files already valid=4902 rows failing=0   (exit=0)
verify  ru: summary languages/ru-RU: rows checked=4856 files valid=4856 files restored=0 files already valid=4856 rows failing=0   (exit=0)
```

All four VERIFIED-HERE 2026-10-16.

Read this correctly: the 18 journey assets no longer ride in the checkout —
they come from the published 0.4.1 archives like the ~9.7k bulk rows. A bare
checkout before any restore reports every row missing and exits 1; that is the
gate working, not a broken pack. On GamingPC and in CI, where the bulk audio
is already present (or is restored first), the same command reports
`rows failing=0`
(`state/evidence/AUDIO-NORMALIZATION-2026-10-15/NOTES.md:80-82`,
`VERIFIED-ELSEWHERE-2026-10-15`). The 18 files are no longer tracked by name
and carry no `.gitignore` exception (ADR-0032's end step ran 2026-10-16,
queue item D4); they are in the published 0.4.1 archives, so an in-app fresh
install hears them too.

## C.3 Listening questions the audio now raises

- Loudness needs no review: all 18 re-normalise byte-identically at
  `gain 1.00x` under the pure-Python target (`TARGET_ACTIVE_RMS = 0.15`,
  `PEAK_CEILING = 0.70`, peaks ≤ 22937;
  `state/evidence/AUDIO-NORMALIZATION-2026-10-15/NOTES.md:14-23`). GamingPC
  rows: ja `rows updated=0 … failing=0`, ru `rows updated=0 … failing=0`
  (`:48-54`, `VERIFIED-ELSEWHERE-2026-10-15`). What the reviewer judges is the
  *character* and whether each clip matches the reading the learner is shown.
- ru modality is now an open question: `languages/ru-RU/review/WORKLIST-2026-10-14.md:66-72`
  kept the three new environments at `recall-meaning` instead of `comprehension-listening`, on the
  ground that no audio existed (the worksheet now records the bake as discharged). Audio exists now;
  say whether those three environments should become listening.
- ja per-sentence questions are listed per id in
  `languages/ja-JP/review/WORKLIST-2026-10-14.md:22-29` (e.g. `開始します` vs
  `始まります`; `ありがとうございます` vs `ありがとうございました`; i-adjective
  modification of `映画`); ru per-sentence checks at
  `languages/ru-RU/review/WORKLIST-2026-10-14.md:24-33` (e.g. `гулял` gender,
  the `неполадку` four-case cloze chain, `опечаток` genitive plural). Check
  kana/okuri, reading + romaji, gloss faithfulness, register, and that cloze
  targets appear verbatim.

## C.4 Recording the review honestly

A real review PR does two things in **one** PR: adds `reviews.jsonl` record
line(s) and flips the reviewed items' `status`
(`languages/ja-JP/review/REVIEW_POLICY.yaml:90-97`; ru mirror
`languages/ru-RU/review/REVIEW_POLICY.yaml:87-92`). A bare status flip fails
the validator (`review_promotion_unsupported`).

Only a named human reviewer may author a record whose `reviewer_category` is
`community-reviewer` or `qualified-human-*`. An agent preparing the PR writes down
what that human actually said, verbatim, or records `ai-assisted` — which never
promotes (`languages/ja-JP/review/REVIEW_POLICY.yaml:84-89`). Drafting the PR is
agent work; the judgement inside the record is not.

Neither real pack has a review file yet — `wc -l languages/*/reviews.jsonl` →
"No such file or directory" (`VERIFIED-HERE`, GamingPC; the only
`reviews.jsonl` in the tree are `tests/fixtures/packs/*`). The first review PR
must **create** `languages/<pack>/reviews.jsonl`. Line shape, from
`tests/fixtures/packs/valid-reviewed-item/reviews.jsonl`:

```
{"id":"test-review-community","target_id":"es.lex.greet.hola","reviewer":"Community Reviewer","reviewer_category":"community-reviewer","scope":"wording and gloss","date":"2026-10-04","outcome":"approved"}
```

Categories and ceilings (`languages/ja-JP/review/REVIEW_POLICY.yaml:84-89,115-119`;
the ru file mirrors the same rules at different offsets — records `:87-92`,
corrections `:103-104`):
`community-reviewer` → at most `validated`; `qualified-human-expert` /
`qualified-human-native-speaker` → `verified`; `ai-assisted` and
`automated-check` never promote; AI may promote only to `screened`; the owner
may not substitute self-review for qualified review. `changes-requested` and
`rejected` are valuable records; use the P0-P3 severity scale
(`languages/ru-RU/review/REVIEWER_KIT.md:68-74`); any unresolved P0/P1 blocks
promotion (`languages/ja-JP/review/REVIEW_POLICY.yaml:101`). Corrections follow docs/16 §Corrections
(stable IDs, version bump, regression test, evidence re-evaluation —
`languages/ja-JP/review/REVIEW_POLICY.yaml:102-103`).

A reviewer who is not a qualified human must say so in `reviewer_category`;
overstating it is the one failure mode this schema exists to catch.

---

## What stays blocked after these runbooks

Self-work does not close them: owner time for O-06 (and O-01/O-05's 0.4.1
decision), a Windows and a macOS machine, one AT user with a Linux desktop,
and `BLK-REVIEW-CAPACITY` — no qualified reviewer engaged since 2026-10-04
(ja: `languages/ja-JP/review/REVIEWER_KIT.md:73-75`; ru:
`languages/ru-RU/review/REVIEWER_KIT.md:87-89`). Everything
above is preparation: the environment probe, the machine legs with their real
outputs, the stale-doc corrections, and a queue a person can actually work.
