# Owner acceptance session — 2026-10-20 (everything staged)

One sitting clears the last human gates standing between now and the 1.0 RC.
Everything below was prepared and measured today; the boxes are yours.

## Artifacts (staged, not published)

| artifact | where | size | sha256 |
| --- | --- | --- | --- |
| app `lts-desktop` **0.4.3-alpha.1** deb, finalized (t64-safe `Depends` + new hard `gstreamer1.0-plugins-good`) — rebuilt 2026-10-21 at `7cd1fe4` incl. the **CSP `media-src 'self' blob:` fix** (packaged-build audio defect, found by this sweep — see §2 item 4) on top of the PERF-002 responsiveness fix, security-bumped locks (webpki RUSTSEC-2026-0381/-82/-83 + vite 8.3.3 GHSA trio), `derive_pairs` plan-latency fix and perf probes. **Earlier-recorded debs (`9c374399…`, `b54d4c55…`, `a6d3953f…`, `7042d750…`) lack the CSP audio fix — do not ship them.** | `target/release/bundle/deb/open-language-learning-platform_0.4.3-alpha.1_amd64.deb` | 12,603,298 B | `78946e5d09662758678857c3f6f013b3ffbc6d7486d31edd134a79dc57e2e7ed` |
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

CI run `39650735423` (success, all jobs) at `7cd1fe4` — the SHA the
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

- [x] 1. Five-tab nav + hub drill — relaunch is single-instance, tab latency normal (findings 1–2) — ☑ owner 2026-10-21: "flipped through the tabs and they loaded and worked just fine"
- [x] 2. Settings ▸ Profile data → Switch profile works (finding 9) — ☑ owner 2026-10-21
- [x] 3. Speech cards split + Playback output section — ☑ owner 2026-10-21: the microphone side **lists named input devices** (multiple mics shown, picker works); the playback side shows the honest sentence — "This runtime cannot direct playback to a chosen device, so there is no picker here — the system sound settings decide where audio plays" (`data-playback-route="system"`, `settings.tsx:558-563`). That is the designed posture, not a defect: WebKitGTK 2.54.1's GTK3 build does not expose `setSinkId`, and the app branches on its absence (K-88). Finding 10 closes; output routing returns whenever a webkit build ships the Audio Output Devices API — no 1.0 work.
- [x] 4. Settings ▸ Language packs → switch active pack; audio plays loudness-normalised; tap-lookup なまえ in 「私の名まえは何ですか」 (findings 5/6/11) — ☑ owner 2026-10-21 ("OK the audio is working now", ru then ja). **This click exposed a release-blocking defect**: the shipped CSP had no `media-src`, and WebKitGTK 2.54.1 refuses `blob:`-URL media under `default-src 'self'` — pack audio was silent in EVERY packaged build (dev runs skipped CSP injection, so it had never been seen). Fixed at `7cd1fe4` (`media-src 'self' blob:` + deb hard-depends `gstreamer1.0-plugins-good`); rebuilt deb below. Machine side also repaired: the 2026-10-19 orca-cascade removal had silently dropped `gst-plugins-good` (owner reinstalled; `sudo pacman -S orca speech-dispatcher` still owed to restore the a11y stack for item 6). Note: in-app catalog download installs 0.4.2 (live catalog pins), while this packet's artifacts are 0.4.3 — step 5 republish closes that gap. Tap-lookup leg: ☑ owner 2026-10-21 on Reading story "A first day" (わたしの なまえは タナカです。): **なまえ (namae, "name") listed and まえ ("front") absent** — finding 6 verified fixed on the real surface. **New finding S-3**: the same panel offered **"は — tooth"** for the topic particle — the pack lexicon has no particle entries at all (`は`/tooth in `lexicon/health4.jsonl` is the only match; `に` resolves to `ja.lex.numbers.ni` "two"; の/を/も/か/と have no entry), so span matching hands the learner the wrong sense of a homograph. Registered as `JA-FUNCTION-WORD-LOOKUP-001` (P2 backlog).
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
