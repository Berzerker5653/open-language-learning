# LEARNER-REVIEW-M1-001 — residual-uncertainty manifest

Things the audit's mechanical + agent passes CANNOT settle. Per the honesty
contract, anything here must stay labeled unverified wherever the app states
content confidence (learner-facing posture copy in `home.tsx`, docs/18
honesty claims, release notes). The owner cannot personally confirm
language accuracy (owner statement 2026-11-26), so the app may never claim
more than this evidence supports.

| # | Residual | Why mechanical/agent checks can't settle it | What would settle it |
|---|----------|---------------------------------------------|----------------------|
| R-1 | Native-speaker naturalness verdicts on generated RU/JA prose | Reviewers here were fresh-context AGENT lanes (author != reviewer, but still agents; no qualified human native review exists for these packs — reviews.jsonl rows are `hermes-default agent` and promote nothing) | Qualified human linguistic review (REL-001 posture unchanged) |
| R-2 | Register & tone (politeness levels in JA, colloquial vs bookish in RU) at story scale | Agents can flag obvious register breaks, not cultural judgment on sustained narration | Human review; user feedback after dogfooding |
| R-3 | TTS narrator timbre/prosody acceptability | ASR gate verifies content match (what was said), not delivery quality | Human listening sample; owner dogfood |
| R-4 | Level-appropriateness of ACTIVE content vs curriculum coverage | A1 fit is relative to what the learner has already met; agent lanes had the Month-1 inventory but not a per-item teach-order ledger | Sidecar teach-set audit (later card); owner daily-use complaints |
| R-5 | Whether mixed English/Russian unit titles are intended design | This is curriculum intent, not verifiable correctness | Curriculum owner decision (D-007) |
| R-6 | JA dialect/variant spellings flagged as known-limit (こんさーと hiragana vs katakana etc.) | Pack-wide orthography convention not pinned in a written style rule | Pin a written orthography convention doc, then gate it mechanically |
| R-7 | Stress marks that pymorphy/lexicon checks accept but natives would dispute (variant-stress words) | Mechanical membership checks dictionary stress, not contested variants | Human review of the ~72 lexwarn words list (in review/verdicts/ru-lexwarn.md) |

Statuses: ASR subset (audio<->transcript) — see gates.log (P-1).
Lexical warnings disposition — see review/verdicts/{ru,ja}-lexwarn.md.
Agent flags with `known-limit` severity are NOT resolved; they are this
manifest's backing detail.
