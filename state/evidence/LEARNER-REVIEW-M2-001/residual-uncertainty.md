# LEARNER-REVIEW-M2-001 — residual-uncertainty manifest

Things this audit's mechanical + fresh-agent passes CANNOT settle. Per the
honesty contract these stay labeled unverified wherever the app states
content confidence (learner-facing copy, docs/18 honesty claims, release
notes). The owner cannot personally confirm language accuracy (owner
statement 2026-11-26) — the app may never claim more than this evidence
supports. Carries the M1 manifest (state/evidence/LEARNER-REVIEW-M1-001/
residual-uncertainty.md) forward; nothing here is ever promoted silently.

| # | Residual | M2 state | What would settle it |
|---|----------|----------|----------------------|
| R-1 | Native-speaker naturalness verdicts on RU/JA prose | Unchanged: all M2 verdicts came from a fresh-context AGENT lane; still no qualified human review (reviews.jsonl agent rows promote nothing) | Qualified human linguistic review (REL-001 posture) |
| R-2 | Register & tone at story scale | Unchanged | Human review; owner daily-use complaints |
| R-3 | TTS narrator timbre/prosody acceptability | Unchanged; ASR re-verified month-2 subset content-match only | Human listening sample |
| R-4 | Level-appropriateness of ACTIVE content vs teach order | Unchanged; M2 added one concrete instance: IPA terminology ('palatalized', [lʲ]) in A0 lesson copy (verdicts ru-001 items 2-3, ru-011 item 257) — defensible for adults, unverifiable without curriculum intent or learner data | Teach-set sidecar audit; curriculum owner |
| R-5 | Mixed English/RU unit titles as intended design (M1 D-007) | STILL OPEN: month-2 unit_path serves Russian titles (Вчера и в прошлом году) next to English ones | Curriculum owner decision |
| R-6 | JA orthography convention (katakana-for-loanwords) not pinned in a written style rule (M1 R-6, D-009) | STILL OPEN and now recurring: こんさーと served through month 2 (M2 verdict ja-009 item 211); the katakana block ja-015 proves the convention is the norm elsewhere | Written convention doc + mechanical gate |
| R-7 | Contested stress variants accepted by dictionary membership | Unchanged (M1 lexwarn list); M2 found no new mechanical-suspect stress | Human review of lexwarn list |
| R-8 | Marked/unmarked RU duplicate pairs (M1 D-013) | STILL SERVED on month-2 practice surfaces (35 enumerated flags in review/tally.json) | Owner intent, then a dedupe gate |
| R-9 | Whether the far-future catalog titles should be visible at all (M1 D-003) | STILL VISIBLE: 823 RU units / 803 locked in day-60 payload; FIX-M1-PATH-VIS-001 ready/never-shipped | Ship decision + owner visual pass |
| R-10 | JA mixed-script surfaces (M2-new, M2-D-005: 上に vs うえ for the SAME sentence) | New: whether kana-first is a hard rule or furigana-optional | Pin surface policy; then gate |
| R-11 | JA audio acceptability flags (M1 D-011: 82 duration-suspect + 18 short-word ASR flags) | Posture unchanged (ja-JP human audio QA retired by owner 2026-11-06); M2 subset flags reported as advisory only | Reopen JA audio QA (owner) |

ASR subset results (audio<->transcript) — defect-ledger.md M2-D-013 +
gates.log. Known-limit severities in review/verdicts/ are this manifest's
backing detail, NOT resolutions.
