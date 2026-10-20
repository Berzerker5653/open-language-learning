# Owner acceptance session — 2026-10-20 (everything staged)

One sitting clears the last human gates standing between now and the 1.0 RC.
Everything below was prepared and measured today; the boxes are yours.

## Artifacts (staged, not published)

| artifact | where | size | sha256 |
| --- | --- | --- | --- |
| app `lts-desktop` **0.4.3-alpha.1** deb, finalized (t64-safe `Depends`) — rebuilt 2026-10-20 with the `derive_pairs` 8× plan-latency fix (`state/evidence/PERF-002/plan10k-*`) | `target/release/bundle/deb/open-language-learning-platform_0.4.3-alpha.1_amd64.deb` | 12,588,776 B | `633c3307fe810e78…310a88c27` |
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

CI run `39431801837` (success) covers the scripted half on this exact tree:
`desktop-smoke` (13-route walk), full rust suite, pack conformance, security
scans. Optionally re-run live: `LTS_SMOKE_TIMEOUT=900 scripts/smoke-desktop.sh`
→ expect `SMOKE OK (13 routes walked)`. Do not re-verify those by hand.

## 2. The human sweep (Runbook B, `docs/21_HUMAN_REVIEW_RUNBOOKS.md` §B.3)

Walk in the installed app and tick:

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

Fresh scans on `3a4e16d` (`state/evidence/SEC-001/fresh-2026-10-20.md`):
cargo-audit 564 crates **0 vulnerabilities, no warnings**; **gitleaks over all
587 commits: no leaks**; `pnpm audit`: none; CI security job green; the two
2026-10-09 warnings are gone from the graph. Malicious-pack / no-upload /
retention suites green in the same CI run.

- [ ] I accept the security findings disposition (zero open findings) and give privacy sign-off — signature/date: ____

## 4b. Second perf tier (Omarchy) — one command that needs your password

Gaming PC tier is measured (`state/evidence/PERF-002/gamingpc-2026-10-20.md`).
The Omarchy leg needs `sudo`, which an agent cannot use there. Restaged today
(2026-10-20) with the **fixed** 0.4.3 binary (`sha256 91a1dd6b…4c86e7de`), the
finalized deb and both harnesses under `~/perf-0.4.3`. Close any running app
instance there, then:

```sh
sudo pacman -S --noconfirm --needed xorg-server-xvfb
cd ~/perf-0.4.3 && LTS_PERF_LABEL=omarchy scripts/perf-app.sh
cd ~/perf-0.4.3 && LTS_PERF_LABEL=omarchy scripts/perf-plan10k.sh   # ~3 min
```

It writes `state/evidence/PERF-002/` on that machine — leave it there and
point me at it, and I fold the tier into the freeze ADR.

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
| everything above recorded | the remaining `REL-001` dependency gap is just `PERF-002` (agent-measurable now on the Linux tiers, ADR-0039) |
