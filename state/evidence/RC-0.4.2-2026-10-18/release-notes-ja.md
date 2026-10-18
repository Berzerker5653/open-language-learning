Reference pack `org.openlanguage.ja-jp.reference`, version **0.4.2**, built from the
tree whose catalogue entry pins it (`fb6858d`).

What a fresh install gets that the 0.4.1 archive did not carry:

- **unit 826** — the admin-bill-payment *revision* unit: the delayed-reuse stage of
  the A2 daily-administration goal, gated by the ADR-0022 `requires_unit` rule, so
  it is only planned after the base unit is supported.
- **five upper-band units changed**: three transfer stages retargeted to a task the
  engine can actually run (`retrieval` + `speaking`, replacing `scenario` /
  `interaction` labels with no runner) in 821, 823 and 824; 812 gained the
  independent `recall`/`writing` stage it never had; 820 now declares its sequence.
- **three pack-declared `task_sequence` blocks** (ADR-0037) — one complete
  input → scaffolded → independent → transfer → reuse sequence per A2/B1/B2 goal
  (`ja.goal.a2.daily-admin`, `ja.goal.b1.work-professional`,
  `ja.goal.b2.film-analysis`).

Archive: **318,724,406 bytes**, sha256
`b03cf88671d86de2c4ef481c07b16fcb2725f0dcd61a71df0e2182a63d764a81`. 5,865 members,
of which 4,902 are the media clips the pack manifest declares — every manifest row
is present, and `langpack install` round-trips to `current -> 0.4.2`.

Content posture is unchanged and honest: all content is AI-authored, ships at
`draft`, carries `review_status: community`, and no qualified-human review has
promoted any of it (ADR-0017 §2). Speaking stages are guided-only — they never
score, never record a verdict and never write mastery (ADR-0017).

Licence: pack content **CC-BY-SA-4.0**; attribution records live in
`languages/ja-JP/sources.jsonl` and `third-party/notices/NOTICE.md`.
