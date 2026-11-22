SESSION-SEQUENCE-001 takeover — :17641 live acceptance, run 122 (2026-11-22 01:36 MST)
lts-serve (feature serve) built from this worktree, 127.0.0.1:17641, DEFAULT data dir
~/.local/share/openlang. POST /api/home_state {"profileId":"prof-e1799551-fc43-494b-ae07-6426bc530ca8"}.
Raw response: takeover-acceptance-home_state.json.

Measured (audit derived from pack data: allow-set = activities content_refs of units whose goal band
is on-ramp in goals.yaml):
- plan items: 6; content_ids: ru.orth.cyrillic.a-lower/a-upper/o-upper (weak-skill) +
  ru.contrast.voicing.dt/gk/bp (progression).
- ZERO argue/argue2*/critical*/soc* ids, ZERO ru.lex.argue.kontrargument (run 120 RED showed
  2 weak-skill argue rows + kontrargument progression).
- ZERO above-on-ramp UNIT-BANDED activities (incident class: no B2 content on the level-0 plan).
- Known limitation, same class as the recorded unclaimed-sentences limitation: the 3
  ru.contrast.voicing.* rows are UNCLAIMED phonology content (no unit references any contrast id;
  beginner-appropriate minimal pairs дом/том, год/кот, бить/пить). The frozen takeover contract
  scoped the fail-CLOSED orphan gate to the LEXICON stream; phonology/sentence orphan gating is an
  orphan-content follow-up card, not this lane.

Scheduler/evidence rows UNCHANGED after the read (rows withheld, never deleted):
BEFORE == AFTER: 5 scheduler_state rows (2 argue rows fsrs-spike-0.1.0 due 2026-11-25 intact),
6 evidence_events, max rowid 6.
