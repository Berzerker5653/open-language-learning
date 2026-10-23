# Resume check — audio campaign on Omarchy (rewritten 2026-10-23 17:10, after the box reboot)

Campaign compute runs entirely on Omarchy under `nohup` (survives this chat
being shut down; it does **not** survive a reboot). GamingPC hosts the git
repo + manifests; nothing heavy runs there.

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
  see "checkpointing" below.

## Live now (measured 17:03–17:10)

* ru best-of-K restarted on Omarchy: pid `18573`,
  `--ids bestof-ids-ru2.txt` (417 ids), K=8, jobs=4,
  `--out ~/LTS/bestof-ru.jsonl`, log `~/LTS/bestof-ru.log`, crashed log
  preserved as `~/LTS/bestof-ru.log.crashed-espeak`. Exact restart command
  is stored in **`~/LTS/bestof-ru.command`**.
* espeak-ng **1.52.0** rebuilt from source into `~/.local` (no root); its
  `espeak-ng -v ru --ipa -q` output is byte-identical to GamingPC's
  `/usr/bin/espeak-ng` 1.52.0 on the six probe words (`шум`,
  `аплодисменты`, `брать`, `лук`, `мука`, `Это шум.`).
* Progress (measured 16:54:45 launch → 17:06:08, 11.4 min): 3 assets
  settled — 2 `pass@3`, 1 `exhausted@8` — → **≈16 assets/h, ~26 h** for
  the 417 at jobs=4. Each asset pays ~90 s of qwen3-tts model load (a
  fresh worker per asset) plus up to K bake+grade cycles; memory holds at
  ~49 GB of 62 GB with 4 workers, so jobs=8 is not available. Re-check:

  ```
  ssh omarchy 'wc -l ~/LTS/bestof-ru.jsonl; grep -ac "assets settled" ~/LTS/bestof-ru.log; ps -o etimes=,pid= -C python | head'
  ```

* checkpointing (the fix, `scripts/bake-bestof.py`): each settled asset is
  appended to `--out` and fsynced, and each winner's manifest row is
  persisted immediately (sibling tmp + `os.replace`). `--skip-done`
  resumes a run: ids with a `pass@` record in an existing `--out` are
  skipped, their media + manifest row are already in place. So after any
  future reboot: `cat ~/LTS/bestof-ru.command`, add `--skip-done`, relaunch.
* ru drift check on Omarchy: all **4,856** ru wavs match their manifest
  `sha256` (0 mismatch, 0 missing). The Omarchy ru manifest is now *ahead*
  of GamingPC (winners land there first) — harvest it back, never overwrite
  it from GamingPC.

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
2. ja: run `scripts/bake-bestof.py` on Omarchy over
   `bestof-ids-ja2.txt` (1,066 ids) — media/manifest parity is already
   established above:
   `--pack languages/ja-JP --k 4-6 --language japanese --lang ja
   --asr-model ~/models/ggml-large-v3-turbo.bin
   --whisper ~/whisper.cpp/build/bin/whisper-cli --jobs 4
   --ids bestof-ids-ja2.txt --out ~/LTS/bestof-ja.jsonl`, with
   `PATH=$HOME/.local/bin:$PATH` (espeak-ng for the gate's G2P fold).
   Run it **after** the ru run exits — 8 concurrent 1.7 B fp32 TTS
   processes want ~66 GB and the box has 62. Harvest winners + manifest
   rows back after it fully exits.
3. Exhausted ids → RU-RUNDOWN section D (id, text, K attempts, per-take
   heard) for owner disposition.
4. `langpack test` both packs 0/0 → rebuild 0.4.3 lpks → re-stage
   `~/staging/0.4.3/{ru-RU,ja-JP}/media/` + store → packet §3 table →
   AUDIT doc → kanban row 15 → commit all + push.
5. Owner listening session; §5 republish only on explicit owner go.
