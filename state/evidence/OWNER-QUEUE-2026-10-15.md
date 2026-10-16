# Owner decision queue — 2026-10-15

One consolidated list. Everything in **§1** was done by agents and is **not** asking for
a decision; §2 is the queue; §3 is the list of checks only a human can perform.

Two version numbers stay separate throughout:

| thing | version | where |
| --- | --- | --- |
| reference packs (content) | **published `0.4.1` (2026-10-16)**; `0.4.0` stays downloadable for rollback | `languages/{ja-JP,ru-RU}/manifest.yaml:4`, `catalog/packs.json` |
| application shell | `0.4.0-alpha.1` (pre-release) | `apps/desktop/package.json:3`, `apps/desktop/src-tauri/tauri.conf.json:4`, tag `open-language-learning-platform-0.4.0-alpha.1` |

---

## 1. Agent work already complete (no approval requested, no gate flipped)

| item | state |
| --- | --- |
| 0.4.1 version bump on the tracked tree | 2 lines; every gate still 0/0; CI green at the pre-bump `fd76786` (`38757754128`: rust, web, desktop-smoke, schemas, security, platform-compile win+mac all success) |
| Candidate archives built locally from the tracked tree | after the O-07 rebuild: ja `318,722,747 B` sha256 `e697ee92…4690`; ru `318,489,935 B` sha256 `9eb074fa…1d7a` (the pre-D1 ja value `7d9c7045…b460` is superseded); byte-reproducible across two independent builds; published 0.4.0 archives re-downloaded and match their catalogue pins by size **and** sha256 |
| 18 journey audio assets in the candidate | 18/18 present in the archive listings, and re-confirmed 18/18 inside the **published** 0.4.1 archives — ADR-0032's stated end condition is met |
| Licence propagation | the CLI emits `license: "CC-BY-SA-4.0"` for ja (was `CC-BY-4.0`), ru unchanged at `CC0-1.0`; proof: published ja `manifest.yaml` 769 B vs candidate 772 B, the inserted `-SA` |
| Cached-media safety | pinned by `crates/langpack/tests/media_upgrade.rs` (3 tests, 3 passed) |
| Clean-environment install | fresh worktree, no `node_modules`: `pnpm install --frozen-lockfile` exit 0 (151 packages), `fmt:check`/`lint`/`typecheck`/`test`/`build` green. **Not** a cold-network proof (`downloaded 0`, warm store) |
| Desktop bundles built locally | **finalized** AppImage `72,837,624 B` sha256 `8c3b5913…` (the raw `tauri build` output is `119,142,904 B` and ships the build host's WebKit — not distributable, `scripts/finalize-appimage.sh` closes that), deb `12,493,856 B` with `Depends: libwebkit2gtk-4.1-0, libgtk-3-0` — needs `scripts/finalize-deb.sh` before it installs on Ubuntu 24.04 or Debian 13 (D12, now written), binary `37,728,352 B`; headless start proven before the owner's own `lts-desktop` instance was running; **rendered UI not proven** |
| Ledger completeness | all 66 `required_for_desktop_1_0` ROADMAP tasks now carry a ledger record; the four new ones are `blocked` with named blockers |
| Ledger validator | `tools/validate_handoff.py --require-explicit-ledger-records` implemented and **enabled in CI** at both call sites (`scripts/ci.sh:112`, `.github/workflows/ci.yml:253`); the plain invocation still reproduces the old baseline |
| O-07 | **applied 2026-10-16** under D1 option A; four follow-up cards opened, one `blocked` on a human author (§2 D1) |
| Repository protection | **applied 2026-10-16** under D3: immutable releases enabled, tag ruleset `release-tags` (`25246378`) active on all tags (§2 D3) |
| Reference packs published at 0.4.1 | **done 2026-10-16** under D2 (the tag-and-upload act delegated to the agent on request): both tags → `20f994df05478f92b9d2399bbf655066e21ffda6`, both `isImmutable: true`, re-downloaded from the public URLs and matched against the catalogue pins and member-by-member against the uploaded candidate (`state/evidence/RC-0.4.1-2026-10-15/publication-2026-10-16.md`) |
| ADR acceptance briefs | written per ADR; statuses unchanged (§2 D5) |

---

## 2. The queue

### D1 — Do we act on O-07 before freezing 0.4.1? **Blocking; decide first.**

> **RESOLVED 2026-10-16 — the owner chose A, and it is applied.** Verified on the applied
> tree rather than on the patch text: 57 of 84 lists changed content, 20 were already
> byte-identical, 7 reorder-only, 0 characters missing, 0 empty or duplicated lists, and no
> kanji record now claims `jf-standard` as its only provenance. 29 pack-gate invocations and
> `cargo test --workspace` exit 0. The licence duties A triggers and the costs it exposes are
> cards, not loose ends: `JA-KANJI-ATTRIBUTION-001` (app-surface acknowledgement),
> `JA-KANJI-REFRESH-001` (currency procedure), `JA-KANJI-DECOMP-UI-001` (display rule),
> `JA-KANJI-MNEMONICS-001` (17 mnemonics — `blocked` on a human author, not `ready`).
> Decision record: `state/evidence/O-07/decision-2026-10-16.md`. D2 and D3 stay open as
> questions, but **the numbers under D2 changed** — see the note there.

**Decision.** The 84 shipped kanji records misdescribe their own provenance, and the
`radicals` field is wrong in a measurable fraction of records: 21/84 sets are disjoint
from the KANJIDIC2/KRADFILE-derived lists and the indexing radical is absent from 24
lists. Those radicals are displayed to learners (`App.tsx:3070`). All 84 records declare
`sources: ["jf-standard"]`, a dataset the repo records as reference-only, `UNLICENSED`,
`redistribution_allowed: false` — while the pack's own licence record
(`lic-kanji-dictionary`) declares the kanji layer JMdict-derived.

**Exact approval requested.** Pick one of the three options below, in this order of
preference. Any choice except "defer" changes `languages/ja-JP/kanji/*.jsonl`, which
changes the 0.4.1 archive sha, so this must land before the freeze.

| option | what it means | consequence |
| --- | --- | --- |
| **A (recommended; now verified to the same standard as B).** Re-source `radicals` from **KRADFILE** (the jmdict-simplified 3.6.2 `kradfile` conversion), add pack records `sources.jsonl:kradfile` + `licenses.jsonl:lic-kanji-radicals` at CC BY-SA 4.0 with EDRDG attribution and pinned hashes, and append `kradfile` to each record's `sources` span. Naming the source `edrdg-kanjidic2` would be wrong: KANJIDIC2 itself is used by nothing in the pack, which would repeat this ticket's failure mode | honest, attributed, licence-declared data; the decomposition line survives; ShareAlike already matches the 2026-10-13 pack-level ja decision | measured: **57/84** lists change (20 already byte-identical, 7 reorder, 0 characters missing from KRADFILE), no schema or frontend change; 7 pack gates 0/0, `lts-langpack` 7+38+8 ok, `lts-desktop --lib` **144/0/1**, both validator modes and the learner-copy audit unchanged. Costs: **22/84** cards would show the character as its own only element, **62/84** list nested elements, **23/84** contain stroke stand-ins `ノ ハ ヨ ｜`, and **17/84** authored mnemonics name an element the new list drops |
| **B.** Apply the prepared patch: drop `radicals` from all 84 records, relax `required` in `schemas/v0.2/kanji.schema.json`, guard the UI | removes the unverified claim, ships nothing unsourced | visible feature loss in the Kanji drill (the 84 cards stop showing stroke components); needs a schema-version note; verified: 7 gates 0/0, `lts-langpack` suite ok incl. 38/38 `validate`, kanji tests ok, typecheck/prettier/vitest ok, `examples/eo-community`/`ar-ma` unaffected (`state/evidence/O-07/verification-2026-10-15.txt`) |
| **C.** Defer to 0.4.2 | 0.4.1 publishes as measured | the 0.4.1 archive keeps showing 21+ wrong radical sets to learners and keeps `sources: ["jf-standard"]` on data the repo says may not be redistributed from that source |

Rejected option, stated so it is not proposed again: re-word the licence notes only. The
21/84 disjoint measurement makes this a correctness problem, not a labelling problem.

**Evidence.** `state/evidence/O-07/decision-2026-10-15.md` (§5 option B, §5b option A),
`…/jmdict-simplified-compare-2026-10-15.md`, `…/kanjidic-compare-2026-10-13.md`,
`…/patch-drop-unverified-radicals.patch` (228 lines, option B) and
`…/patch-resource-radicals-kradfile.patch` (243 lines, 6 files, +107/−88, option A) — both
`git apply --check` clean at the current tree, both **unapplied**; verification transcripts
`…/verification-2026-10-15.txt` and `…/verification-optionA-2026-10-15.txt`.

**Next action once you answer.** A or B: I land the verified patch on the tracked tree,
re-run the pack gates plus `cargo test --workspace`, rebuild both archives (the digests
change either way), re-issue the numbers, then D2. A also opens two follow-up cards —
the EDRDG §3 app-surface attribution (the app renders no pack attribution at all today) and
the §4 data-refresh procedure — plus 17 mnemonics that need human re-authoring. C: I record
the deferral in the ledger (`O-07` note) and proceed to D2.

### D2 — Publish the 0.4.1 reference packs (O-01b)

> **AUTHORIZED 2026-10-16 — publish both, ja display name without `(Draft)`.** The
> preparation half is on the tracked tree as one commit (`20f994d`): manifest bump plus both
> catalogue entries hand-edited to the current pins, verified against the archives by size and
> SHA-256. **DONE 2026-10-16.** The tag-and-upload act was delegated to the agent on request
> ("Yes — you publish both now") and executed; the commands, the round trip and the reason one
> `main` run went red in between are in `RC-0.4.1-2026-10-15/publish-runbook.md` and
> `RC-0.4.1-2026-10-15/publication-2026-10-16.md`. D3 landed first, as recommended, so both
> releases came back `isImmutable: true`.
>
> First attempt returned `HTTP 422 Release.target_commitish is invalid` twice because
> `--target` carried the abbreviated SHA; `gh` needs the full 40 characters, so the runbook now
> uses `20f994df05478f92b9d2399bbf655066e21ffda6`. Nothing half-created: the tag query still
> answers 404. Run `38924884357` (head `6bf9cef`) then failed on exactly the predicted 404 for
> the ja 0.4.1 asset in `rust` and `desktop-smoke` only; `web`, `schemas`, `security`, both
> `platform-compile` legs and `platform-bundles` were green, which covers the new strict ledger
> validator and the audit gate.
>
> Published pair: `org.openlanguage.ja-jp.reference-0.4.1` (318,722,747 B,
> `e697ee92…4690`) and `org.openlanguage.ru-ru.reference-0.4.1` (318,489,935 B,
> `9eb074fa…1d7a`), both tags → `20f994df05478f92b9d2399bbf655066e21ffda6`. Re-downloaded from
> the public URLs: bytes, sha256 and the catalogue pin all match, and every member matches the
> uploaded candidate (ja 5,864/5,864, ru 5,788/5,788). The 0.4.1 catalogue entries the
> desktop app reads are therefore live, and the 0.4.0 archives stay downloadable for rollback.

**Exact approval requested.** "Publish `org.openlanguage.ja-jp.reference-0.4.1` and
`org.openlanguage.ru-ru.reference-0.4.1` as GitHub release assets, and let the two
`catalog/packs.json` entries be replaced by hand."

**Recommendation.** Publish, but only after D1 and D3, and let the **owner** perform the
tag and asset upload (publication is an owner act in this project; agents have built
everything up to the boundary).

**Current numbers (2026-10-16).** The O-07 change rebuilt both candidates. ja is now
**318,722,747 B, sha256 `e697ee92f6602c3373ebe5910f0dfbee8e50edcb3e9a25b2890efba5a5964690`**
(+1,414 B, same 5,864 members); ru is byte-identical at 318,489,935 B `9eb074fa…1d7a`. The
ja digest quoted elsewhere in this queue and in `RC-0.4.1-2026-10-15/NOTES.md`
(`7d9c7045…b460`) is stale. `dist/rc-0.4.1/` on this machine already holds the current
files; an archive copied before 2026-10-16 is the wrong one.

**What publishing changes for users.** ja gains 18 sentence/phrase audio assets and the
`CC-BY-SA-4.0` licence string; both packs gain grammar/goal/environment content recorded
since 0.4.0. **No pre-existing media file changes bytes**, so installed 0.4.0 media stays
valid — the only client action is the store upgrade, which keeps the old version for
rollback (test-pinned).

**Alternatives.** (a) Ship ru only (ja is the pack carrying the licence question);
(b) hold both until a human content review exists — costs the audio fix for everyone and
does not change the content posture, since both packs already ship labelled
`experimental`/`draft`.

**Cost note.** ~637 MB of release assets on a personal account whose Actions minutes were
previously exhausted; releases are not Actions minutes, but storage/bandwidth billing is
an account fact you own.

**The release action is atomic — measured cost of splitting it.** With the manifests at
`0.4.1` and the catalogue still pinning `0.4.0`, CI's audio-restore step refuses and `rust`
+ `desktop-smoke` go red (run `38772271396` at `b5bafc8`; verbatim message and per-job
conclusions in `state/evidence/GATE-2026-10-15/NOTES.md`, § "the batch head went red"). The
tracked bump has therefore been reverted; `fetch-pack-audio.sh --verify-only` again reports
4902 / 4856 rows with 0 failing. Landing this release means one change that does all of:
`git apply state/evidence/RC-0.4.1-2026-10-15/version-bump.patch` → rebuild (or reuse the
`dist/rc-0.4.1/*.lpk` on disk — gitignored, so they exist only on this machine) → enable
immutable releases (D3) → tag + upload both assets → hand-edit both `catalog/packs.json`
entries. Any subset leaves CI red; that is the gate working, not a flake to fix.


**Evidence.** `state/evidence/RC-0.4.1-2026-10-15/{NOTES.md,SUMMARY.txt,diff-*.txt,rc-inspect-*.txt,published-*.txt,catalogue-proposal-diff.txt}`.

**Next action after approval.** Owner: tag + upload two assets (order per D3), hand-edit
the two catalogue entries, run `./tmp/account-040-041.sh` against the new `latest` to
close the accounting. Agents: docs/13 provenance table entries + the `audit_catalog`
digest cross-check idea in D3.

One field in that hand-edit is a decision, not a build fact: the CLI proposal also changes ja
`display_name` from `Japanese Reference Pack (Draft)` to `Japanese Reference Pack`, because
`languages/ja-JP/manifest.yaml:3` dropped the suffix at 0.2.1 while `catalog/packs.json:7`
kept it. Copying the proposal renames the pack in the desktop catalogue; keeping `(Draft)`
keeps a name the pack no longer declares. Field-by-field diff:
`state/evidence/RC-0.4.1-2026-10-15/catalogue-proposal-diff.txt`.

### D3 — Repository protection: enable immutable releases **before** publishing

> **RESOLVED 2026-10-16 — applied.** Immutable releases read **`enabled: true`**, and tag
> ruleset `release-tags` (id `25246378`) is active with `deletion` + `update` rules. Two
> corrections to this entry: the proposed pattern-scoped ruleset is **not accepted here**
> (exact tag names, `*`, and `org.openlanguage.*` all 422; only `~ALL` works for a `tag`
> target), so the applied ruleset covers all tags; and it has no `creation` rule, so 0.4.1 tag
> creation stays open. Immutability now covers releases made from today, not the seven that
> exist. Read-backs and probes: `state/evidence/O-08-2026-10-16/applied.md`.

**Exact approval requested.** "Enable immutable releases on this repository"
(`gh api -X PUT repos/Berzerker5653/open-language-learning/immutable-releases`), and
optionally "create the proposed tag ruleset for `org.openlanguage.**` and
`open-language-learning-platform-**`".

**Recommendation.** Do it **first**: immutability applies only to **future** releases, so
enabling before D2 locks 0.4.1 itself. Today the repo has **zero rulesets**, 7 releases
all `immutable: false`, and `main` is "protected" by an effectively empty branch rule. The
catalog pins sha256 and the engine verifies it at install (`archive.rs:287`), so a swapped
asset fails closed — but nothing today stops a force-pushed tag, a delete+recreate, an
asset DELETE + same-name re-upload (new asset id and digest), or a release `PATCH
tag_name` re-point. A tag ruleset covers the seven tags that already exist, which
enabling immutability does not retroactively protect.

**Alternatives.** Publish with no protection (accepted risk: the pins detect a swap, they
do not prevent one); or ruleset only (locks tags, not assets).

**Do not bother with**: push rulesets (Team-plan, private/internal-only, content-scoped —
the earlier claim that one would protect tags was wrong), legacy tag-protection rules
(GHES-only, deprecated), branch protection (branch-scoped).

**Evidence.** `state/evidence/O-08-2026-10-15/mechanisms-2026-10-15.md` (mechanism →
prevents → availability table, docs quotes, proposed ruleset JSON, the four open tamper
vectors, the explicitly unapplied command list).

### D4 — ADR-0032 end step: retire the 18-file git exception

**Exact approval requested.** "After 0.4.1 is published, remove the 18 exception lines
and the exception comment from `.gitignore`."

**Recommendation.** Yes, immediately after D2 — the ADR's own end condition is
demonstrably met (18/18 assets in the candidate listings), and leaving the exception in
place keeps a tracked-asset habit the ADR exists to end.

> **EXECUTED 2026-10-16.** The 18 tracked copies are gone —
> `git ls-files 'languages/*/media/*.wav'` goes **18 → 0** and total tracked `.wav`
> **65 → 47** — and the `.gitignore` exception block with its 18 negations is deleted, leaving
> the blanket `languages/*/media/*.wav` rule (0 remaining `!…wav` lines; `git check-ignore -v`
> confirms the rule now matches). Coverage was proved before deleting: every one of the 18
> basenames appears in the matching published archive, and those archives' sha256 equals the
> catalogue pins (D2 above; member accounting in `RC-0.4.1-2026-10-15/diff-041-*.txt`).
> `scripts/fetch-pack-audio.sh --verify-only` then reports **ja 4,902 rows / 0 failing** and
> **ru 4,856 rows / 0 failing**, so the restore step is now the only path that materialises
> those bytes — the way the other ~9,700 pack assets already worked. ADR-0032 carries an
> "Executed 2026-10-16" note; its `Status:` line is untouched and still yours.

**Consequence.** Those 18 `.wav` files stop being in git (they already are today); CI's
audio restore step becomes the only path that materialises them, which is how the other
~4,900 assets work.

### D5 — ADR acceptance

**Exact approval requested.** Set `Status: Accepted` on 0026 (skip pack install during
onboarding), 0028 (deferred lesson review scheduling), 0029 (learner-facing maturity
labels), 0030 (scenario play clock), 0031 (pack trust state) — and decide 0033 (explicit
ledger records) separately.

**Recommendation.** Accept 0026–0031 as-is (all shipped and test-pinned; per-ADR
prerequisites and evidence in `state/evidence/ADR-ACCEPTANCE-2026-10-15/NOTES.md`);
keep **0032 Proposed** until its end step (D4) runs; **0033** — see below. Two notes:
0029's "revisit after human validation" has no data to revisit *with* while content stays
AI-only, and 0030's 10 s default is a UX judgement.

**Alternatives.** Leave them Proposed (they were owner-directed, and the code ships
regardless; the status line only records who agreed).

### D5b — ADR-0033: adopt the ledger-completeness policy?

> **ADOPTED 2026-10-16 — enabled in CI.** The flag is now the CI invocation in both
> places (`scripts/ci.sh:112`, `.github/workflows/ci.yml:253`). Re-measured today: plain and
> strict both print `HANDOFF VALIDATION PASSED (1960 data files checked)`; strict adds four
> WARNs for optional tasks with no explicit record (`AI-001`, `PLAT-002`, `ADV-001`,
> `WEB-001`) — warnings, not failures, so CI stays green. The plain invocation is untouched
> for anyone quoting an older baseline. **What is still yours:** `Status: Accepted` on line 3
> of ADR-0026–0031 **and 0033** — an agent cannot sign the status line.

**Exact approval requested.** "Adopt ADR-0033 and enable
`--require-explicit-ledger-records` in `scripts/ci.sh`."

**Recommendation.** Adopt, but the implementation deliberately keeps the check **opt-in**
so the historical baseline stays quotable; enabling it in CI is a one-line change I can
make the moment you accept the ADR. It cannot make the ledger look more complete — it can
only fail a build for a missing record, and it records blockers honestly (all four new
entries are `blocked`).

**Evidence.** `docs/adr/0033-…md`; measured before/after: 4 FAILs + 4 optional WARNs →
0 FAILs; default run byte-identical to `PASSED (1959 data files checked)`.

### D6 — Application release (distinct from D2 — nothing to approve yet)

No app release should happen now, and no agent should be asked to approve one. The local
bundle is built (D2-adjacent evidence above), but `RELEASE-EVIDENCE-001` stays `blocked`
because its own definition requires install smoke on a clean boot and a human
hands-on check, both of which are in §3. When you do want a release, the approval becomes
"publish `open-language-learning-platform-0.4.1-alpha.1` with these four assets, from the
tree at commit X", after §3's first four rows are closed.

### D7 — Accessibility: AT host and scheduling

> **ANSWERED 2026-10-16 — the owner will schedule the Linux/Orca pass.** ACC-001 therefore
> stays a hard blocker for the desktop RC and no ADR-0015 scope note is written. Nothing
> agent-side moves this row: the worksheet (`docs/assessment/ACCESSIBILITY_AUDIT.md`) is
> ready, and the pass needs a human AT user on a machine with Orca plus a Japanese voice.
> `REL-001` stays `blocked` behind it, honestly.

**Exact approval requested.** Two separate things: (i) "an AT pass will be performed on
<host + screen reader>" — NVDA/VoiceOver/Orca matrix per `docs/assessment/ACCESSIBILITY_AUDIT.md`;
(ii) whether ACC-001 remains a hard blocker for the desktop RC given nothing else can move
until it does.

**Recommendation.** Schedule the Linux/Orca row first: it is the only row blocking the RC
(win/mac bundles are produced but untested), the worksheet is ready, and it is one person,
one machine, one sitting. If you would rather ship the alpha without it, that is an
explicit scope change worth recording in ADR-0015's shape rather than silence.

**Consequence of not scheduling:** REL-001 stays `blocked` behind
ACC-001 → PERF-002 → PLAT-001 → SEC-001 → REL-001, and no amount of agent work changes
that.

### D8 — SEC-001 disposition

> **PARTLY RESOLVED 2026-10-16 — the three you saw are accepted; there is a fourth.** Live
> `cargo audit` at `e18c9df`: 562 crate dependencies, **4 allowed warnings**, exit 0. The
> three advisories (glib 0.18.5 unsound, proc-macro-error 1.0.4, unsafe-libyaml 0.2.11) are
> dispositioned and accepted; the 2026-10-16 section of
> `state/notes/SEC-001-dependency-disposition.md` now carries the reachability evidence,
> including the correction that unsafe-libyaml **is** reachable from pack YAML while glib is
> not. The fourth — a yanked direct pin — was never in front of you: see **D8b** below.
> SEC-001 itself stays `blocked`: accepting residual risk is a human act.

**Exact approval requested.** "Accept the three allowed `cargo audit` warnings
(glib, proc-macro-error, unsafe-libyaml) as dispositioned, with dispositions recorded in
`state/notes/SEC-001-dependency-disposition.md`", or name replacements/upgrades you want
first. `RUSTSEC-2026-0346` (rustls `Debug` leaking secrets) is already fixed by the lock
bump; `cargo audit` exits 0 with only the allowed set.

### D8b — the fourth audit warning: the yanked `zip 8.6.0` pin (found 2026-10-16)

> **DISPOSITIONED 2026-10-16 — bump after 0.4.1 publishes.** The owner chose option (b): the
> release toolchain stays frozen through the publication window, and `zip 8.6.0` → `9.0.4`
> becomes a small standalone commit immediately afterwards, carrying the three one-line
> `name()` changes. Until it lands the audit warning stays visible and the pin stays
> unselectable for any regenerated lock; that trade is now owned rather than unnoticed.
> Logged as owner gate **O-09** on the board.

> **EXECUTED 2026-10-16, after publication.** `Cargo.toml:33` is now
> `zip = { version = "9.0.4", … }` and `cargo update -p zip` relocked with the only deltas
> being the zip entry (pulling its own new `nix 0.31.3` + `cfg_aliases 0.2.2`) and tempfile's
> getrandom edge moving to `0.4.3`, a version already in the lock. The three `name()` sites
> are the whole code change: `crates/langpack/src/archive.rs:269` (`?`),
> `crates/langpack/tests/archive.rs:207` and `:280` (`.unwrap()`). `cargo check --workspace
> --all-targets` exit 0, `cargo test --workspace` green, and the example pack `.lpk` is
> byte-identical across the bump — 3,976 B, sha256
> `7938e5fba60e3ceffdf7e796c229b29f3ec57493a959dc35ac53a92ad9434bcc` — which is what keeps the
> published 0.4.1 digests valid. `cargo audit` now reports **3 allowed warnings**, exit 0: the
> yanked-zip line is gone, leaving exactly the three the owner accepted above.

**What it is.** Not a vulnerability. `cargo audit` prints `Crate: zip, Version: 8.6.0,
Warning: yanked`. The maintainer withdrew the entire 8.x line (`8.3.0`…`8.6.0`) plus
`9.0.0`–`9.0.3`; only **9.0.4**, published today, is installable, and the upstream changelog
gives no reason. It is a **direct** dependency (`Cargo.toml:33`,
`features = ["deflate"]`) used for every `.lpk` read and write.

**Why it is not urgent.** The committed `Cargo.lock` keeps building — a yanked version still
installs when it is pinned — and our install guards are ours, not the crate's `extract()`
(`safe_rel`, the manifest allow-list, symlink rejection via `unix_mode`, `take(size+1)` plus
sha256, staging directory then rename), so the extraction hardening 9.x added closes no gap
in this code.

**What staying costs.** No lock regeneration can ever select 8.6.0 again — `cargo update -p
zip` refuses with "version 8.6.0 is yanked" — and 8.x receives no further fixes.

**Measured cost of moving** (probed in the working tree, then reverted; nothing is applied):
with `zip = "9.0.4"` the workspace compiles after **three one-line changes**, because
`name()` returns `Result<Cow<str>, ZipError>` now (`crates/langpack/src/archive.rs:269`,
`crates/langpack/tests/archive.rs:207`, `crates/langpack/tests/archive.rs:280`);
`cargo check --workspace --all-targets` exit 0; `cargo test -p lts-langpack` green; audit
then reports 3 allowed warnings. The rebuilt pack archive is **byte-identical** to the 8.6.0
build (example pack, 3976 B, sha256 `7938e5fb…4bcc` either way), so the 0.4.1 digests
survive the move.

**Options.** (a) bump before the 0.4.1 tag, so one toolchain builds the release; (b) bump
immediately after publication as a normal dependency change; (c) leave the pin and re-check
at the next release gate. **Recommendation: (b)** — the packs are data and their digests are
already computed, and swapping the app toolchain mid-publication buys nothing except a new
variable in the release window.

### D9 — PERF-002: performance budget freeze

> **CONFIRMED 2026-10-16 — not frozen.** The provisional state stands and no budget ADR is
> written: `typical` is measured, `high`/GPU and the `low`-tier rows are not.

**Exact approval requested.** "Freeze the tier budgets" — which per PERF-001 requires a
separate ADR (budgets are currently `status: provisional, frozen: false`).

**Recommendation.** Do not freeze yet: `high`/GPU and `small`/`large` tiers are unmeasured
on this lab (no CUDA device, no real `low`-tier device), so a freeze would pin
provisional numbers to a contract. `typical` is measured.

### D10 — Qualified-review posture (confirm, don't re-decide)

> **CONFIRMED 2026-10-16 — ADR-0017 §2 stands.** Qualified-human review is not a
> desktop-1.0 release blocker, and promotion past `draft` still needs a human record the
> validator enforces. `JA-A1-003`, `JA-A2-002`, `JA-B1-002`, `JA-B2-002` stay `blocked` on a
> reviewer, not on code.

**Exact approval requested.** Confirm ADR-0017 §2 still stands: qualified-human review is
not a desktop-1.0 release blocker, while promotion of content past `draft` still requires a
human record the validator enforces.

**State now.** `REVIEW-001` (the gate-definition card) is `done`; the band review cards
`JA-A1-003`, `JA-A2-002`, `JA-B1-002`, `JA-B2-002` are `blocked` — no `reviews.jsonl`
exists in either reference pack. Those four cards are the honest place where a qualified
reviewer's work would land. If you want them unblocked, what is needed is a human
reviewer and `REVIEWER_KIT.md`, not code.

### D11 — Speech calibration (confirm only)

> **CONFIRMED 2026-10-16 — no change.** Guided-only pronunciation feedback ships;
> `SPEECH-007` stays out of the required set and `blocked`. Consent-panel collection remains
> the only route to an accuracy claim and is not being opened.

O-04 is decided (ADR-0017): guided-only pronunciation feedback ships; `SPEECH-007` is out
of the required set and stays `blocked` rather than `done`. No new decision unless you
want consented-panel data collected at some point, which is the only thing that could ever
turn the accuracy claim on (docs/18, ADR-0013).


### D12 — Which Linux distros must the deb install on? (found by the bundle check)

> **RESOLVED 2026-10-16 — option (b), written and tested.** `scripts/finalize-deb.sh`
> rewrites only the bare `libgtk-3-0` entry into `libgtk-3-0t64 | libgtk-3-0` (alternative
> first, so pre-t64 systems still resolve) and repacks the `ar` archive with the compressor
> the bundle already used — there is no dpkg on this host. It proves its own invariants:
> every other control field identical, the data member's sha256 unchanged, member names
> preserved. `scripts/test-finalize-deb.sh` pins gzip and zstd fixtures, an unrelated
> `Depends` left alone, a non-`ar` path rejected, and a re-run that is byte-stable rather
> than a failure. Proven on the real local bundle: `libgtk-3-0` →
> `libgtk-3-0t64 | libgtk-3-0`, 12,493,922 B → 12,493,970 B, data member `19288d37…`
> identical. Documented in docs/13 beside the AppImage finalize step. Option (a) is off the
> table if the clean-boot evidence machine is 24.04, as this item assumed.

**Exact approval requested.** Pick the installability target for the deb: (a) **pin the
tested distro** to Ubuntu 22.04 / Debian bookworm for the alpha and state it in docs/13 +
docs/21, (b) let me add a `scripts/finalize-deb.sh` that rewrites the control `Depends`
after bundling (the AppImage already has that precedent in `scripts/finalize-appimage.sh`),
or (c) carry it as an upstream tauri-cli issue and leave the deb as generated.

**Why it is a decision and not a bug I should fix silently:** the generated control says
`Depends: libwebkit2gtk-4.1-0, libgtk-3-0`, and `libgtk-3-0` no longer exists as a package
name in Debian 13 (trixie) or Ubuntu 24.04 (noble) — the runtime there is `libgtk-3-0t64`.
So the deb is uninstallable-by-metadata on current LTS distros and fine on 22.04/bookworm.
`bundle.linux.deb.depends` cannot fix it: measured append-only, the auto-detected
`libgtk-3-0` stays in the list. Which answer is right depends on what you intend to clean-boot
for `RELEASE-EVIDENCE-001` — if that machine is 24.04, option (a) is not available.

**Recommendation.** (b) if the clean-boot target is 24.04/Debian 13, (a) if it is 22.04.
Either way the check output is in `state/evidence/BUNDLE-LOCAL-2026-10-15/NOTES.md`
("deb installability check").

---

## 3. Open human-only checks (no agent can close these)

| check | why it is human-only | status |
| --- | --- | --- |
| O-06 hands-on app pass | owner-declared gate; `scripts/smoke-desktop.sh` also needs port 127.0.0.1:1420, held by the owner's dev server | open |
| AppImage clean-boot install + smoke | needs a machine without this build environment | open — AppImage builds and starts headless here, but rendered UI was **not** proven (black captures under Xvfb) |
| Windows + macOS runtime | binaries cross-compile; never executed | open |
| ACC-001 screen-reader matrix + IME audit | requires a human AT user | open — **D7 answered 2026-10-16: the owner will schedule the Linux/Orca pass**, so ACC-001 stays a hard desktop-RC blocker (no ADR-0015 carve-out written) |
| SEC-001 disposition | owner gate on residual advisories | the three advisories are accepted (D8); **D8b** still needs your disposition |
| Qualified band review (4 cards) | cannot be self-certified | posture confirmed (D10); the four cards wait on a reviewer, not on code |
| Clean cold-network dependency install | this host's pnpm store is warm (`downloaded 0`); CI covers it | unverified locally |
| `--release-readiness` validation | honest **5 FAILs**: ja-JP, ru-RU, ar-ma, eo-community experimental/unreviewed; minimal pack not releasable | not a bug to fix |
