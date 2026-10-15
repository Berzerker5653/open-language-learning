# Owner decision queue — 2026-10-15

One consolidated list. Everything in **§1** was done by agents and is **not** asking for
a decision; §2 is the queue; §3 is the list of checks only a human can perform.

Two version numbers stay separate throughout:

| thing | version | where |
| --- | --- | --- |
| reference packs (content) | published `0.4.0` → candidate `0.4.1` | `languages/{ja-JP,ru-RU}/manifest.yaml:4`, `catalog/packs.json` |
| application shell | `0.4.0-alpha.1` (pre-release) | `apps/desktop/package.json:3`, `apps/desktop/src-tauri/tauri.conf.json:4`, tag `open-language-learning-platform-0.4.0-alpha.1` |

---

## 1. Agent work already complete (no approval requested, no gate flipped)

| item | state |
| --- | --- |
| 0.4.1 version bump on the tracked tree | 2 lines; every gate still 0/0; CI green at the pre-bump `fd76786` (`38757754128`: rust, web, desktop-smoke, schemas, security, platform-compile win+mac all success) |
| Candidate archives built locally from the tracked tree | ja `318,721,333 B` sha256 `7d9c7045…b460`; ru `318,489,935 B` sha256 `9eb074fa…1d7a`; byte-reproducible across two independent builds; published 0.4.0 archives re-downloaded and match their catalogue pins by size **and** sha256 |
| 18 journey audio assets in the candidate | 18/18 present in the archive listings — ADR-0032's stated end condition is met |
| Licence propagation | the CLI emits `license: "CC-BY-SA-4.0"` for ja (was `CC-BY-4.0`), ru unchanged at `CC0-1.0`; proof: published ja `manifest.yaml` 769 B vs candidate 772 B, the inserted `-SA` |
| Cached-media safety | pinned by `crates/langpack/tests/media_upgrade.rs` (3 tests, 3 passed) |
| Clean-environment install | fresh worktree, no `node_modules`: `pnpm install --frozen-lockfile` exit 0 (151 packages), `fmt:check`/`lint`/`typecheck`/`test`/`build` green. **Not** a cold-network proof (`downloaded 0`, warm store) |
| Desktop bundles built locally | **finalized** AppImage `72,837,624 B` sha256 `8c3b5913…` (the raw `tauri build` output is `119,142,904 B` and ships the build host's WebKit — not distributable, `scripts/finalize-appimage.sh` closes that), deb `12,493,856 B` with `Depends: libwebkit2gtk-4.1-0, libgtk-3-0`, binary `37,728,352 B`; headless start proven before the owner's own `lts-desktop` instance was running; **rendered UI not proven** |
| Ledger completeness | all 66 `required_for_desktop_1_0` ROADMAP tasks now carry a ledger record; the four new ones are `blocked` with named blockers |
| Ledger validator | `tools/validate_handoff.py --require-explicit-ledger-records` implemented; **opt-in**, default output byte-identical to the old baseline |
| O-07 | mapped, a fix verified, **not applied**; decision needed (§2 D1) |
| Repository protection | measured read-only; nothing applied (§2 D3) |
| ADR acceptance briefs | written per ADR; statuses unchanged (§2 D5) |

---

## 2. The queue

### D1 — Do we act on O-07 before freezing 0.4.1? **Blocking; decide first.**

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
| **A (recommended).** Re-source `radicals` from KANJIDIC2/KRADFILE (or the jmdict-simplified `kanjidic2-en`/`kradfile` conversions), add a `derived-from-source` record with the CC BY-SA 4.0 licence + attribution, and change the 84 records' `sources` to `edrdg-jmdict` (+ the kanji dictionary source) | honest data, correct licence chain, ShareAlike obligation widens to the kanji layer | needs the attribution text and one more source record; biggest diff; I can prepare it, you verify |
| **B.** Apply the prepared patch: drop `radicals` from all 84 records, relax `required` in `schemas/v0.2/kanji.schema.json`, guard the UI | removes the unverified claim, ships nothing unsourced | visible feature loss in the Kanji drill (the 84 cards stop showing stroke components); needs a schema-version note; verified: 7 gates 0/0, `lts-langpack` suite ok incl. 38/38 `validate`, kanji tests ok, typecheck/prettier/vitest ok, `examples/eo-community`/`ar-ma` unaffected (`state/evidence/O-07/verification-2026-10-15.txt`) |
| **C.** Defer to 0.4.2 | 0.4.1 publishes as measured | the 0.4.1 archive keeps showing 21+ wrong radical sets to learners and keeps `sources: ["jf-standard"]` on data the repo says may not be redistributed from that source |

Rejected option, stated so it is not proposed again: re-word the licence notes only. The
21/84 disjoint measurement makes this a correctness problem, not a labelling problem.

**Evidence.** `state/evidence/O-07/decision-2026-10-15.md`,
`…/jmdict-simplified-compare-2026-10-15.md`, `…/kanjidic-compare-2026-10-13.md`,
`…/patch-drop-unverified-radicals.patch` (228 lines, applies at HEAD, unapplied).

**Next action once you answer.** A or B: I implement on the tracked tree, re-run the
pack gates plus `cargo test --workspace`, rebuild the archives, re-issue the numbers.
C: I record the deferral in the ledger (`O-07` note) and proceed to D2.

### D2 — Publish the 0.4.1 reference packs (O-01b)

**Exact approval requested.** "Publish `org.openlanguage.ja-jp.reference-0.4.1` and
`org.openlanguage.ru-ru.reference-0.4.1` as GitHub release assets, and let the two
`catalog/packs.json` entries be replaced by hand."

**Recommendation.** Publish, but only after D1 and D3, and let the **owner** perform the
tag and asset upload (publication is an owner act in this project; agents have built
everything up to the boundary).

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

**Exact approval requested.** "Accept the three allowed `cargo audit` warnings
(glib, proc-macro-error, unsafe-libyaml) as dispositioned, with dispositions recorded in
`state/notes/SEC-001-dependency-disposition.md`", or name replacements/upgrades you want
first. `RUSTSEC-2026-0346` (rustls `Debug` leaking secrets) is already fixed by the lock
bump; `cargo audit` exits 0 with only the allowed set.

### D9 — PERF-002: performance budget freeze

**Exact approval requested.** "Freeze the tier budgets" — which per PERF-001 requires a
separate ADR (budgets are currently `status: provisional, frozen: false`).

**Recommendation.** Do not freeze yet: `high`/GPU and `small`/`large` tiers are unmeasured
on this lab (no CUDA device, no real `low`-tier device), so a freeze would pin
provisional numbers to a contract. `typical` is measured.

### D10 — Qualified-review posture (confirm, don't re-decide)

**Exact approval requested.** Confirm ADR-0017 §2 still stands: qualified-human review is
not a desktop-1.0 release blocker, while promotion of content past `draft` still requires a
human record the validator enforces.

**State now.** `REVIEW-001` (the gate-definition card) is `done`; the band review cards
`JA-A1-003`, `JA-A2-002`, `JA-B1-002`, `JA-B2-002` are `blocked` — no `reviews.jsonl`
exists in either reference pack. Those four cards are the honest place where a qualified
reviewer's work would land. If you want them unblocked, what is needed is a human
reviewer and `REVIEWER_KIT.md`, not code.

### D11 — Speech calibration (confirm only)

O-04 is decided (ADR-0017): guided-only pronunciation feedback ships; `SPEECH-007` is out
of the required set and stays `blocked` rather than `done`. No new decision unless you
want consented-panel data collected at some point, which is the only thing that could ever
turn the accuracy claim on (docs/18, ADR-0013).

---

## 3. Open human-only checks (no agent can close these)

| check | why it is human-only | status |
| --- | --- | --- |
| O-06 hands-on app pass | owner-declared gate; `scripts/smoke-desktop.sh` also needs port 127.0.0.1:1420, held by the owner's dev server | open |
| AppImage clean-boot install + smoke | needs a machine without this build environment | open — AppImage builds and starts headless here, but rendered UI was **not** proven (black captures under Xvfb) |
| Windows + macOS runtime | binaries cross-compile; never executed | open |
| ACC-001 screen-reader matrix + IME audit | requires a human AT user | open |
| SEC-001 disposition | owner gate on residual advisories | open (D8) |
| Qualified band review (4 cards) | cannot be self-certified | open (D10) |
| Clean cold-network dependency install | this host's pnpm store is warm (`downloaded 0`); CI covers it | unverified locally |
| `--release-readiness` validation | honest **5 FAILs**: ja-JP, ru-RU, ar-ma, eo-community experimental/unreviewed; minimal pack not releasable | not a bug to fix |
