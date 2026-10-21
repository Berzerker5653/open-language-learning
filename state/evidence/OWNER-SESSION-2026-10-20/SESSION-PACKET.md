# Owner acceptance session — 2026-10-20 (everything staged)

One sitting clears the last human gates standing between now and the 1.0 RC.
Everything below was prepared and measured today; the boxes are yours.

## Artifacts (staged, not published)

| artifact | where | size | sha256 |
| --- | --- | --- | --- |
| app `lts-desktop` **0.4.3-alpha.1** deb, finalized (t64-safe `Depends`) — rebuilt 2026-10-21 at `1348612` incl. the **PERF-002 responsiveness fix** (`pronunciation_check` off the main thread + sidecar `nice +10`) on top of the security-bumped locks (webpki RUSTSEC-2026-0381/-82/-83 + vite 8.3.3 GHSA trio, `state/evidence/SEC-001/`), the `derive_pairs` plan-latency fix and the perf probe. **Earlier-recorded debs (`9c374399…`, `b54d4c55…`, `a6d3953f…`) lack the responsiveness fix — do not ship them.** | `target/release/bundle/deb/open-language-learning-platform_0.4.3-alpha.1_amd64.deb` | 12,603,248 B | `7042d750ed77308bc031194b333e479cdab40e95b6f2d75aca7197123dcf7591` |
| ja-JP pack **0.4.3** `.lpk` (tracked tree incl. `capabilities.scenario_help`; `test` 0/0) | `~/staging/0.4.3/ja-JP-0.4.3.lpk` | 318,736,116 B | `9b17b23294df30f4…352719d6` |
| ru-RU pack **0.4.3** `.lpk` (`test` 0/0) | `~/staging/0.4.3/ru-RU-0.4.3.lpk` | 318,493,155 B | `374d79e13db020fc…a2b96bc5` |

Both archives pass the real installation gate: `langpack install --store`
accepts both at 0 errors (store under `~/staging/0.4.3/store`).

Install: `sudo apt install ./open-language-learning-platform_0.4.3-alpha.1_amd64.deb` (or run the
release binary directly), and stage the two `.lpk` files into the store with
`langpack install --store <file>` before launching, or import them through
Settings ▸ Language packs. Catalogue/republish stays owner-only and happens
only after this session (see step 5).

## 1. Machine leg — already re-run today

CI run `39612780641` (success, all 13 jobs) at `1348612` — the SHA the
shipping deb+binary are built from — covers the scripted half:
`desktop-smoke` (13-route walk), full rust suite (4 parallel partitions),
pack conformance, security scans; wall ~18 min, every gate intact
(`state/evidence/CI-TIME/ci-profile-2026-10-20.md`). Optionally re-run live:
`LTS_SMOKE_TIMEOUT=900 scripts/smoke-desktop.sh`
→ expect `SMOKE OK (13 routes walked)`. Do not re-verify those by hand.

## 2. The human sweep (Runbook B, `docs/21_HUMAN_REVIEW_RUNBOOKS.md` §B.3)

Walk in the installed app and tick:

Already machine-proved per item (with a fresh `SMOKE OK (13 routes walked)`
run from today): `SWEEP-PRECHECK.md` in this folder — read it to know what
you are *not* re-verifying.

- [ ] 1. Five-tab nav + hub drill — relaunch is single-instance, tab latency normal (findings 1–2)
- [ ] 2. Settings ▸ Profile data → Switch profile works (finding 9)
- [ ] 3. Speech cards split + Playback output section — device picker **or** the honest "system sound settings decide" sentence; report which you see (finding 10)
- [ ] 4. Settings ▸ Language packs → switch active pack; audio plays loudness-normalised; tap-lookup なまえ in 「私の名まえは何ですか」 (findings 5/6/11)
- [ ] 5. Shadowing controls + scenario ladder/transfer variants (findings 7/8)
- [ ] 6. K-81 nav sign-off
- [ ] 7. **New: kana keyboard (issue #2)** — Settings ▸ "Kana keyboard (in-app)" → **On**; open My Words and type `k-o-n-n-i-c-h-i-w-a` → `こんにちわ` appears live; Escape mid-word cancels the syllable; Enter completes the word without adding it; switch **Off** and typing is untouched — your IBus/Anthy still behaves exactly as before. Verdict: ☐ works ☐ issues: ____

## 3. TTS-003 listening pass (the last open item on that card)

Re-baked audio (Qwen3-TTS, ADR-0023) — the question is whether finding 11's
"echoey, metallic, tinny" character survives in shipped clips. Play these ten
(live in-app via a lesson/word card, or the files directly):

All ten verified on disk today: sha256 + bytes match the pack media
manifests 10/10; acoustic metrics (peaks/RMS/crest) tabulated in
`TTS-CLIPS.md`. Fastest listen: `./TTS-PLAY.sh` (plays them in this
order, 1 s gaps).

| clip | text | verdict |
| --- | --- | --- |
| ja `media/ja.sent.drink-coffee.wav` | コーヒーを のみます | ☐ ok ☐ artifact |
| ja `media/ja.contrast.vowel-length.obasan-0.wav` | おばさん | ☐ ☐ |
| ja `media/ja.contrast.vowel-length.obasan-1.wav` | おばあさん | ☐ ☐ |
| ja `media/ja.contrast.palatalization.hyaku-0.wav` | ひゃく | ☐ ☐ |
| ja `media/ja.lex.numbers.go.wav` | ご | ☐ ☐ |
| ja `media/ja.sent.scenario-reasoning.wav` | ようけん を かえて こうこ を かんがえました。 | ☐ ☐ |
| ru `media/ru.contrast.palatalization.brat-0.wav` | брат | ☐ ☐ |
| ru `media/ru.contrast.palatalization.brat-1.wav` | брать | ☐ ☐ |
| ru `media/ru.lex.numbers-time.chetyre.wav` | четы́ре | ☐ ☐ |
| ru `media/ru.lex.shopping.perchatki.wav` | перча́тки | ☐ ☐ |

Overall: ☐ re-bake accepted (TTS-003 done) ☐ issues listed: ____

## 4. SEC-001 sign-off

Fresh scans on the shipping SHA `1348612` (`state/evidence/SEC-001/fresh-2026-10-20.md`
— four re-runs, latest at `1348612` 2026-10-21): cargo-audit 564 crates
**0 vulnerabilities, no warnings**; **gitleaks over all 614 commits: no
leaks**; `pnpm audit`: none (vite 8.3.3 — three same-day GHSA patched same
day, CI-caught); CI security job green on run `39612780641` at the same
SHA; the two 2026-10-09 warnings are gone from the graph. Malicious-pack /
no-upload / retention suites green in the same CI run.

- [ ] I accept the security findings disposition (zero open findings) and give privacy sign-off — signature/date: ____

## 4b. Second perf tier (Omarchy) — ☑ DONE 2026-10-21

**Complete.** Your xvfb install + first `./run.sh` was what surfaced the
staging bug (bundled-pack resolution needs the cargo `.cargo-lock` marker
beside a scp'd binary, and the staged pack tree was stale); fixed
(`ee22703` + fresh re-stage incl. `<exe_dir>/packs/` bundle), and the full
harness then ran green on the box. Results in
`state/evidence/PERF-002/omarchy-*`: startup **p50 663 / p95 669 ms**
(PASS both lines), 13-route walk `SMOKE OK`, plan10k **p50 60 / p95 61 ms**,
and the responsiveness probe **passes on this tier**: worst input→paint
30 ms / worst main-thread block 17 ms during real ggml-tiny inference,
0 long tasks (`omarchy-2026-10-20.md`). Your subsequent decision — **fix,
not recalibrate** — shipped the same day: the stall was a synchronous
Tauri command running whisper on the main thread, now offloaded
(`1348612`); post-fix probes read **17/28 ms (Gaming PC)** and **18/30 ms
(Omarchy)** during inference (`gamingpc-2026-10-21.md`,
`omarchy-2026-10-21.md`), and ADR-0041 froze the budgets. No further
owner action on this row.



## 5. Pack republish (only after ☑ above)

Staged `.lpk` archives above are built from the tracked tree at **0.4.3**.
On your go: commit the manifest bumps + `scripts/build-catalog.sh` regen, you
authorize publishing the GitHub release assets (publishing is owner-only), and
CI re-pins. Nothing is committed or published before that.

## What each ☑ clears

| ☑ here | card released |
| --- | --- |
| sweep §2 | O-06 · `DOC-CONTRACT-RECONCILE-001` · U-findings acceptance |
| listening §3 | `TTS-003` |
| sign-off §4 | `SEC-001` |
| app artifact + CI-green evidence on file | `RELEASE-EVIDENCE-001` (its scripted half is `state/evidence/RELEASE-EVIDENCE-001/ARTIFACT-PASS-2026-10-19.md`) |
| everything above recorded | `REL-001`'s remaining dependency gaps are ONLY these four ☑: `PERF-002` closed 2026-10-21 (both Linux tiers measured, two defects fixed, `docs/performance/BUDGETS.yaml` frozen by ADR-0041 — plan line p50 100, responsiveness 100/50 met at ≤30 ms on both tiers) |
