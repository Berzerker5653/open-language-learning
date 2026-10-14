# Architecture Decision Records

Conventions (AGENTS.md requires an ADR for significant architecture decisions and public
schema/persistence/provider-interface changes):

- Files: `NNNN-short-title.md`, monotonically increasing number, never reused.
- Sections: `Status`, `Date`, `Context`, `Decision`, `Consequences`, `Alternatives considered`.
- Status lifecycle: `Proposed` → `Accepted` (agent may accept routine stack/module decisions
  within spec bounds) → optionally `Superseded by NNNN`. An ADR is never silently edited after
  acceptance; corrections append an amendment section or a superseding ADR.
- Record the exact tool/library versions and the verification performed when the decision pins
  them (see 0004).
- Decisions that touch non-negotiables, licensing, or public claims are owner decisions and must
  say so explicitly.

Existing:

- 0001 language packs declarative
- 0002 no streaks
- 0003 speech provider abstraction
- 0004 initial stack and pinned versions
- 0005 sqlite baseline schema
- 0006 scenario recovery branches
- 0007 initial speech provider selection
- 0008 constrained alignment via embedded runtime
- 0009 tts distribution variants (payload-scoped GPL obligations)
- 0010 code license Apache-2.0 (owner delegation)
- 0011 user-selectable speech models
- 0012 dictation via free ASR
- 0013 pack-declared production targets (language-neutral pronunciation scoring)
- 0014 ai-generated content posture (one pack-level disclosure, not per-item draft badges)
- 0015 publishing other-OS builds with a community-confirmed platform ladder
- 0016 pack-shipped model-output audio for the listening modality
- 0017 unfunded posture: exclusively AI-created content, guided-only pronunciation feedback for desktop 1.0
- 0018 environments are pack data (`world/environments.jsonl`; the engine ships none) — **Accepted 2026-10-08**
- 0019 bundling the whisper.cpp aligner as a staged sidecar payload (owner decision)
- 0020 derived guidance instead of an authored "start here" — **Accepted 2026-10-08**
- 0021 script instruction is offered only where a pack declares it (unit `capabilities`; no hardcoded script names in app code) — **Accepted 2026-10-08**
- 0022 unit-level phase gates and the learned-kana word filter — **Accepted 2026-10-08**
- 0023 Qwen3-TTS CustomVoice replaces Kokoro as the pack-audio BAKE engine (ADR-0016 mechanism unchanged; its "runtime fallback" clause later retired by 0024) — **Accepted 2026-10-10**
- 0024 no runtime TTS — language packs are the only speech audio; supersedes ADR-0009's variant axis and the runtime-fallback role in ADR-0016/0023 (K-90/TTS-004) — **Accepted 2026-10-10**
- 0025 CEFR-band coverage is the pack level model; tier-scoped packs are first-class — **Accepted by the owner 2026-10-12**
- 0026 a profile may exist without an active language pack; the wizard offers every pack the device already has — **Proposed (owner-directed, 2026-10-12)**
- 0027 default catalog URL for released builds (`LTS_PACK_CATALOG_URL` still overrides; empty value disables) — **Accepted 2026-10-13**
- 0028 licence-permissiveness detection in the pack audit (`license_less_permissive_than_source`, reported at info; ids outside the CC table unjudged) — **Proposed (agent-authored, 2026-10-13)**
- 0029 direction model for right-to-left packs (per-container `dir` from manifest `capabilities.rtl`; shell and romanization stay LTR) — **Proposed (agent-authored, 2026-10-13)**
- 0030 attempt identity and disqualifying support (identity is an input, never a guess; policy 0.2.0 `support.disqualifying_for`) — **Proposed (agent-authored, 2026-10-14)**
- 0031 goal prerequisites aggregate over declared concepts (`required_concepts` decides a goal-level gate; no goal-id evidence rows) — **Proposed (agent-authored, 2026-10-14)**

Template: `template.md`.
