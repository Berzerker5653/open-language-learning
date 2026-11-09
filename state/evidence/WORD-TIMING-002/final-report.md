WORD-TIMING-002 final controller evidence (2026-11-09 ~01:45)

RUN: primary large-v3 (2,729 banked incl. earlier passes) + retry + chain2.
FINAL: media=4,911 banked=2,729 coverage=55.6% (floor was 90%).
Abstain ledger: state/evidence/WORD-TIMING-002/abstains-ja.jsonl (2,729 uniq;
align-failed@large-v3 1,684 / align-failed@turbo 1,035 / expected-kanji 7 /
empty-transcript 3).

FLOOR-REACHABILITY PROBE (diag_lenaware.py, 75 stratified unsettled clips,
large-v3, kana-folded): strict 0.75 align = 0/75; length-aware relaxation
(>=6:0.65, >=4:0.7) supports only 4/75. The failures are NOT threshold-tight:
  1) unreliable long-vowel/geminate hearing (ひろば->こうば, ほしゅ->ほっしゅ,
     せいぎ->せーぎ) — the very kana distinctions this pack drills;
  2) whisper degenerate repeat loops on short clips (かかく->「こ、こ、こ…」);
  3) silence->filler prefixes (「あ、」).
Conclusion: the 90% floor is STRUCTURALLY UNREACHABLE with ASR+token-alignment
on this pack's isolated short TTS clips. Recovery would need phoneme-level
forced alignment (e.g. MFA-class tooling) — new heavyweight stack component,
owner decision. Follow-up card: WORD-TIMING-003 (blocked).

SAFETY OF SHIPPED OVERLAY: every banked line passed verified token alignment
(0.6..1.0) + schema; abstained clips render as plain (no highlight) by
contract — wrong-highlight risk is bounded, zero correctness risk to audio.
ru remains 99.2%.

## Owner decision (2026-11-09)
Owner reviewed the convergence report and chose to HOLD: 55.6% ja coverage stands as shipped; WORD-TIMING-003 forced-alignment stays owner-gated/blocked, no heavyweight dependency installed. Explicit stopping point.
