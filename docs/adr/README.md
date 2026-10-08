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
- 0018 environments are pack data (`world/environments.jsonl`; the engine ships none) — **Proposed**

Template: `template.md`.
