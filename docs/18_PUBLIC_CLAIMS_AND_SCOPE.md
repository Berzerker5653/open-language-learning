# 18 — Public Claims, Scope, and Honesty Rules

## Proficiency claims

Do not say "fluent" as a simple binary. Prefer demonstrated capabilities and clearly described framework alignment.

Do not claim official JF/CEFR/ACTFL certification unless the project actually has authorization/evidence for that claim. "Aligned with" or "informed by" must be supported by a documented mapping.

Distinguish curriculum coverage, performance on practiced course tasks, transfer under stated conditions, and independently demonstrated proficiency. A checkpoint or one novel variation cannot establish an entire learner proficiency band. Framework version/descriptor references, modality/support conditions and mapping rationale must be visible in the coverage evidence; no unsupported direct equivalence between different frameworks is implied.

## Speech claims

Do not market pronunciation scoring as accent elimination or perfect native-equivalence detection. State which features are evaluated and allow uncertainty.

State model/provider/feature versions, supported speech varieties and tested populations/devices, feature qualification limits and abstention behavior. Guided reference comparison is useful practice, but must not be labeled calibrated automatic scoring. Technical/quality failures and abstention produce no linguistic penalties.

Speech-runtime availability is stated per platform and per CPU, never as a blanket availability claim in either direction: shipped Linux x86-64 desktop builds carry the pinned whisper.cpp alignment sidecar and its `ggml-tiny` weights (ADR-0019), so pronunciation feedback and dictation run there only when the host CPU meets the payload's compiled instruction floor, while payload-free bare/dev builds and today's Windows and macOS builds carry no runtime and abstain with the reason that is true (`speech-model-off`, `aligner-cpu-unsupported`, or `aligner-unavailable`).

ADR-0039 (2026-10-20) makes that a support statement, not just a runtime one: desktop 1.0 is a Linux x86-64 release. Windows/macOS builds remain compile-checked trials labeled untested (ADR-0015 still forbids read-builds-as-parity); parity itself (`PLAT-001`) is off the 1.0 path.

The instruction floor and the speedup are measured facts, quoted with their sample: the payload is compiled for x86-64-v3 (SSE4.2, F16C, FMA, BMI2, AVX, AVX2; no AVX-512) because at the pinned commit the same 2.2 s pack sample (`languages/ja-JP/media/ja.sent.drink-coffee.wav`, 2.2175 s of audio) took 3.6 s per utterance on a portable baseline build versus 370-397 ms on the x86-64-v3 build, roughly nine times faster (ADR-0019). Quote it as one sample on one machine class, not a performance guarantee, and state the 82,016,429-byte payload it buys (staging-machine figure) as part of the availability statement.

None of that is a capability claim: pronunciation feedback stays guided and no pronunciation-accuracy claim is permitted (ADR-0017); the alignment number stays a text-match ratio, not pronunciation evidence (ADR-0008); a staged linux-x64 payload licenses no claim that Windows or macOS work, and platform status comes only from human runtime reports, never from a build script (ADR-0015).

## Privacy claims

"Local/offline" means tested network-independent execution for that capability. If a cloud provider is enabled, the UI must make the changed privacy boundary clear.

## Open-source claims

Do not imply every downloaded model/voice/community pack has the same license as the application. Display component licenses.

## Course completeness

Do not label the Japanese pack A1/A2/B1/B2 complete until mapped coverage, assessments, curriculum audit, and required review gate are satisfied. If a band is partial, say partial.

Stable desktop 1.0 targets reliable A1–A2 coverage in both shipped languages (ja-JP and ru-RU). This is the owner's explicit 2026-10-19 decision ("reliable A1–A2 in both languages is the 1.0 bar"), replacing the earlier through-B2-like-Japanese-coverage target. The approved finite coverage artifact and review policy in `docs/09_TESTING_AND_ACCEPTANCE.md` define the denominator and evidence requirements for those bands. Under ADR-0017 the content posture is AI-created: qualified human review remains how content is promoted to `verified`/`validated` (O-02 community review) and no public text may imply review that did not happen, but no 1.0 release gate depends on that review being complete. Sampled lower-risk unscored practice must disclose its remaining risk and cannot carry decisive coverage/mastery claims. Further scope changes require another explicit owner decision, while partial previews can be labeled alpha/beta.

Do not claim learning efficacy, calibrated mastery confidence, accessibility conformance, or human verification merely because requirements and future tasks exist. Strong efficacy claims need the prespecified evaluation and actual results in `docs/12_OBSERVABILITY_AND_RESEARCH.md`. Accessibility claims must identify the tested version, criterion scope, platform/assistive-technology matrix, and limitations; support for a reading/writing route does not prove speaking/listening outcomes for a deferred modality.

A reviewable release candidate is a development deliverable. Public publication/distribution is a separate action within the owner's authorized release scope; bundled development instructions do not themselves grant publication permission.

## Settings prose (canonical full text — SETTINGS-TEXT-COLLAPSE-001)

The Settings route keeps only a one-line summary visible for each prose block,
behind a native `details`/`summary` disclosure (`ProseNote` in
`apps/desktop/src/settings.tsx`). The full prose is never cut: it always
renders inside the expander, and this section is the docs bundle it mirrors.
If either side changes, change the other in the same commit — the expander text
and these lines are the same text, and the copy rules above (docs/18) apply to
both. Summaries are faithful lead-ins, never new claims: a summary may shorten,
it may not say anything the full text does not support.

- **Microphone enforcement.** Summary: "The setting is enforced: while it is
  off, the app never asks the system for microphone access." Full: "The setting
  is enforced: while it is off, the app never asks the system for microphone
  access — pressing Record shows a note pointing here instead. Speaking
  activities abstain; reading, writing, listening, and every other activity
  work without a microphone, and turning this off never blocks progress."
- **Microphone picker.** Summary (names not yet revealed): "Microphone names
  appear once you allow access; recording from the system default works until
  then." Full: "There is nothing to list yet: the browser only reveals
  microphone names after you allow microphone access once. Recording from the
  system default works until then." Summary (names revealed): "The chosen
  microphone is stored for this profile, with an honest fallback to the system
  default." Full: "The choice is stored for this profile. If the chosen
  microphone is unplugged, the app says so and records from the system default
  for that one recording instead of switching silently."
- **Romaji display.** Summary: "Romaji is a temporary scaffold: Auto fades it
  as reading grows, and the choice never blocks progression." Full: "Romaji is
  a temporary scaffold: content is stored in Japanese script, and Auto fades
  romanisation as reading grows. Your choice is honored everywhere and never
  blocks progression."
- **Kana keyboard.** Summary: "Romaji is converted to kana inside the app's own
  answer fields — nothing is installed and your system layout stays exactly as
  it is." Full: "Romaji is converted to kana inside the app's own answer fields
  — nothing is installed and your system layout stays exactly as it is. A
  platform IME still works when you prefer it: the app steps back while an IME
  is composing, and turns no key when this is off. Kanji candidates follow the
  pack's own vocabulary in a later pass; free text outside it stays kana."
- **Profile data.** Summary: "Export, restore, and switching all live here; an
  export is a readable JSON file, and no audio is ever part of one." Full:
  "The privacy notice promises you can export or delete your local profile data
  at any time — both are here, and switching profiles starts here too.
  Switching only leaves the current profile; it deletes nothing. An export is a
  readable JSON file holding your profile, settings, learning evidence, saved
  words, and review schedule. Recording metadata is not included, and no audio
  is ever part of an export."
- **Restore result.** Summary: "A restore reads a backup you exported and
  always creates a new profile — never a replacement." Full: "A restore reads a
  backup you exported. Nothing changed until you confirmed, the restore always
  creates a new profile instead of replacing the one you use, and a backup this
  version cannot read is refused rather than guessed at."
- **Switch profile.** Summary: "Switching deletes nothing: each profile keeps
  its own data and waits for you in the picker." Full: "Switching deletes
  nothing: each profile keeps its own progress, saved words, and settings, and
  waits for you in the picker."
- **Delete profile.** Summary: "Deleting is final: one explicit confirmation,
  then all of the profile's local data on this device is gone." Full: "Deleting
  removes this profile and all of its learning data on this device, and cannot
  be undone. The app asks for one explicit confirmation before anything is
  deleted."
- **Speech-model preference.** Summary: "This is the app's one speech-model
  preference; the models themselves are listed below with sizes, licenses, and
  downloads." Full: "This is the app's one speech-model preference; the models
  themselves are listed below with their sizes, licenses, and downloads."
- **Speech recognition & pronunciation.** Summary: "Optional, fully on-device
  models: nothing is uploaded, feedback is guided only, and model size never
  changes pronunciation accuracy." Full: "Optional. These local models feed the
  speech-based checks — pronunciation alignment and dictation recognition — or
  you can turn them off above. They run entirely on this device; nothing is
  uploaded. Pronunciation feedback is guided only (no automatic scoring or
  mastery) until it has been calibrated. For pronunciation feedback the model
  sizes give the same result — pick one your device can comfortably run. Larger
  models mainly help future listening/recognition features, not pronunciation
  accuracy." — then the detected device-tier sentence from docs/18's speech
  availability rules, or the honest "tier could not be detected" fallback.
- **Playback output (routable runtime).** Summary (no names yet): "No output
  names revealed yet: playback follows the system sound settings until it
  does." Full: "There is nothing to list yet: the system has not revealed any
  output names. Playback follows the system sound settings until it does."
  Summary (names present): "The output choice is stored for this profile, with
  a system-default fallback for any single clip." Full: "The choice is stored
  for this profile: model audio and your own recordings play on it. If the
  device disappears, that one clip plays on the system default instead of
  failing."
- **Playback output (non-routable runtime).** Summary: "This runtime follows
  the system sound settings for playback." Full: "This runtime cannot direct
  playback to a chosen device, so there is no picker here — the system sound
  settings decide where audio plays."
- **Speech runtimes.** Summary: "The engines this build ships and can load —
  honest status, not a choice." Full: "The engines this build ships and can
  load — honest status, not a choice. Pronunciation feedback and dictation
  recognition also need a recognition runtime: where it is absent, those
  checks abstain, and choosing or downloading a model does not change that."
- **About this build.** The version and commit stay visible (they are the data
  a platform report must quote, docs/13/ADR-0015); only the instruction folds.
  Summary: "When you report a platform problem, quote both lines above." Full:
  "Please quote both lines when you report a platform problem — a report that
  names only 'the latest version' cannot be matched to a build."
