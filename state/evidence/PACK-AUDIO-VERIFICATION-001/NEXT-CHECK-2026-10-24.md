# Resume check — audio campaign on Omarchy (rewritten 2026-10-23 18:15, after the box reboot)

All campaign compute runs on Omarchy (owner needs GamingPC free). Since
2026-10-23 18:09 the work is driven by `~/LTS/campaign-chain.sh` under the
**systemd user unit `lts-campaign.service`** — it survives logout *and* a
reboot (`Linger=yes` is set on that account), and resumes from the
checkpoint instead of starting over. GamingPC hosts the git repo +
manifests; nothing heavy runs there.

## What the 2026-10-23 reboot cost

* The ru best-of-K run had already died at **09:35** before the reboot:
  `espeak-ng` FileNotFoundError inside the gate (`qa-asr.py` folds Russian
  words through espeak G2P). The `~/.local/bin/espeak-ng` built during
  provisioning was gone — `~/espeak-ng-src` kept no build artifacts, and
  pacman never owned an espeak package, so nothing on disk was left to
  rebuild itself. `bestof-ru.log` also shows `sox: command not found`
  noise: **sox is not part of this pipeline** (normalisation is pure
  Python, `generate-pack-audio.py::normalize_wav`) and GamingPC has never
  had it either. Ignore that line.
* Zero harvest from that run: `bake-bestof.py` wrote `--out` and the
  manifest rows only after *all* 417 ids settled. Fixed the same day —
  every phase now checkpoints per settled asset and starts with
  `--skip-done`, which is what makes the chain resumable.

## Live now (state verified 18:09–20:20; ru 89/417 distinct settled)

* `campaign-chain.sh` runs the whole remaining campaign in order, each
  phase resuming from its checkpoint jsonl with `--skip-done`:
  1. **ru** best-of-K: `bestof-ids-ru2.txt` (417 ids), K=8, jobs=4 →
     `bestof-ru.jsonl` / `bestof-ru.log`;
  2. writes `bestof-ru-exhausted.txt` (the ids that used all K takes —
     input for RU-RUNDOWN section D);
  3. **ja** best-of-K: `bestof-ids-ja2.txt` (1,066 ids, verified on the
     box: 0 ids missing from the ja manifest), K=6, jobs=4 →
     `bestof-ja.jsonl` / `bestof-ja.log`.
  A `flock` on `~/LTS/campaign.lock` keeps it single-instance (proved: a
  manual second invocation logged "another campaign-chain instance holds
  the lock; exiting"). Phases are gated on *distinct settled ids*, never
  on the exit code — `bake-bestof.py` exits 1 when ids end exhausted,
  which is the expected outcome, and a phase that makes no progress at
  all stops rather than looping.
* Resume proved on the real data: the old `nohup` ru run was stopped at
  26 settled assets, the unit started, and the log printed
  `bestof: carrying 12 pass@ records from bestof-ru.jsonl` — the 12
  banked winners were not re-baked. Everything now runs inside the unit's
  cgroup (`systemctl --user stop lts-campaign.service` kills the whole
  TTS/whisper tree; `disable --now` also stops it surviving boot).
* espeak-ng **1.52.0** rebuilt from source into `~/.local` (no root); its
  `espeak-ng -v ru --ipa -q` output is byte-identical to GamingPC's
  1.52.0 on the six probe words (`шум`, `аплодисменты`, `брать`, `лук`,
  `мука`, `Это шум.`). pykakasi 2.3.0 is present in the qwen venv, so the
  ja gate's kana folding runs under the same interpreter.
* Sustained rate (unit start 18:09:10 → 20:20, 131 min): 77 settled
  records ≈ **35 assets/h**, mean 4.6 takes. So ru ≈ **10 h more**
  (finish ~06:30 on 10-24) and ja (1,066 ids) ≈ **30 h** — **~1.7 days**
  of compute, not the 3 days the first 11-minute sample suggested (that
  window was model-load ramp-up plus unlucky draws). jobs=8 is still out:
  4 workers peak at ~31-49 GB of the 62 GB box.
* Exhausted share, corrected on 89 distinct ru ids: **24 exhausted@8
  (27%)** and **65 passed** (29 of them at take 1). That projects ~110 of
  the 417 needing owner disposition (remove = remove the content item),
  not the ~220 the first 26 implied. Checkpoint line count runs ahead of
  distinct ids (103 lines / 89 ids) because a resume re-bakes ids that
  ended exhausted — fresh K samples can still pass, that is what
  `--skip-done` deliberately does *not* carry over.
* ru drift check on Omarchy: all **4,856** ru wavs match their manifest
  `sha256` (0 mismatch, 0 missing) after the incremental writes. The
  Omarchy ru manifest is *ahead* of GamingPC (winners land there first) —
  harvest it back, never overwrite it from GamingPC.
* Inspect:

  ```
  ssh omarchy 'systemctl --user status lts-campaign.service --no-pager | head -6; tail -5 ~/LTS/campaign-chain.log'
  ssh omarchy 'cd ~/LTS; grep -aoE "\"result\": \"[a-z@0-9]+\"" bestof-ru.jsonl | sort | uniq -c'
  ```

  Deployed from copies kept in this directory (sha-identical to the box:
  `campaign-chain.sh` → `~/LTS/`, `lts-campaign.service` →
  `~/.config/systemd/user/`):
  `systemctl --user daemon-reload && systemctl --user enable --now lts-campaign.service`.
  Stop = `systemctl --user disable --now lts-campaign.service`. Rerun by
  hand = `sh ~/LTS/campaign-chain.sh` (the flock refuses a second
  instance). No cron/cronie on that box, so the user unit plus
  `Linger=yes` (already set) is the only no-root boot path — which turns
  the next reboot from "campaign over" into "resumed inside a minute".

## Harvested and folded (done 2026-10-23)

* ja turbo audit of the 3,275 never-audited clips finished before the
  reboot and is now on GamingPC:
  `asr5b-ja-JP.jsonl` (3,275 rows) + `asr5b-ja-JP.log`.
  **2,915 ok / 360 MISMATCH / 0 TIMEOUT / 0 WAV-MISSING**; ids are exactly
  disjoint from the 1,627-row `asr5-ja-JP.jsonl` set. Combined ja certified:
  **3,910 / 4,902 (79.8%)**. Tallies + failure signature (qwen3-tts
  giggling tails: `うふふ`, `ふふふふ`, `えへ`) in
  `asr5b-ja-JP-2026-10-23.md`.
* ja best-of-K queue: `bestof-ids-ja2.txt` = **1,066 ids**
  (360 asr5b MISMATCH + 632 repair-set MISMATCH + 147 structure FLAG,
  −73 overlap). Every id joins the ja manifest.
* ja pack parity on Omarchy was **stale** — 1,627 of its 4,902 media rows
  still pointed at the 2026-10-12 generation (pre-repair). Synced
  GamingPC→Omarchy (manifest + those 1,627 wavs); Omarchy ja manifest is
  now `0b19d897…` = GamingPC, and all 4,902 ja wavs verify against it
  (0 sha mismatch). The asr5b audit itself is unaffected: those clips are
  disjoint from the 1,627.

## Then (in order)

1. When the ru run exits: harvest `bestof-ru.jsonl` + the winner wavs +
   manifest rows BACK Omarchy→GamingPC, then byte-resync the drifted
   manifest rows here (sha-scan snippet in commit `6d22be4` message
   context). Manifests are only ever edited on GamingPC.
2. ja best-of-K is **already queued as phase 3 of the chain** (K=6,
   `--skip-done`, media/manifest parity established above), so nothing to
   launch — just confirm `campaign-chain.log` shows the `ja:` line after
   ru finishes. Reference command, if it ever has to be run by hand:
   `PATH=$HOME/.local/bin:$PATH ~/.venvs/qwen-tts/bin/python
   scripts/bake-bestof.py --pack languages/ja-JP --ids bestof-ids-ja2.txt
   --k 6 --language japanese --lang ja
   --asr-model ~/models/ggml-large-v3-turbo.bin
   --whisper ~/whisper.cpp/build/bin/whisper-cli --jobs 4
   --out ~/LTS/bestof-ja.jsonl --skip-done`. Never run ru and ja at once:
   8 concurrent 1.7 B fp32 TTS workers want ~66 GB and the box has 62.
   Harvest winners + manifest rows back only after a phase fully exits.
3. Exhausted ids → RU-RUNDOWN section D (id, text, K attempts, per-take
   heard) for owner disposition. The chain already writes the id list to
   `~/LTS/bestof-ru-exhausted.txt`; the per-take detail is in
   `bestof-ru.jsonl`.
4. `langpack test` both packs 0/0 → rebuild 0.4.3 lpks → re-stage
   `~/staging/0.4.3/{ru-RU,ja-JP}/media/` + store → packet §3 table →
   AUDIT doc → kanban row 15 → commit all + push.
5. Owner listening session; §5 republish only on explicit owner go.
