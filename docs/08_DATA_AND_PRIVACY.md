# 08 — Data, Privacy, Security, and Persistence

## Local-first profile

The learner can create a profile without email/account. Store data under the platform's app-data directory.

## Data classes

### Durable learner data

- profile/preferences;
- installed pack selections;
- evidence history;
- derived mastery snapshots/version;
- goals;
- accessibility settings;
- model/provider preferences;
- content reports/bookmarks.

### Regenerable data

- pack indexes;
- caches;
- session-plan cache;
- waveform previews;
- temporary model outputs.

### Sensitive data

- raw microphone recordings;
- transcripts of open speech;
- optional voice embeddings (avoid unless a concrete feature requires them);
- account/sync tokens if sync is added.

## Recording retention

Default behavior should minimize retention. For ordinary pronunciation scoring, raw audio may be deleted after analysis unless the learner enables a local "keep my attempts" feature. Clearly show and allow deletion/export of retained recordings.

## No training consent by implication

Using the app does not grant permission to train models on learner recordings or interactions. Any future data-donation program must be a separate explicit consent flow.

## Telemetry

Default: off.

If optional diagnostics are added:

- disclose exact fields;
- avoid raw speech/content where possible;
- use coarse hardware/performance data;
- provide local log inspection;
- support full opt-out;
- never make telemetry necessary for learning.

## Database

Preferred desktop baseline: SQLite.

Key tables/entities:

- schema_migrations;
- profiles;
- pack_installations;
- content_versions;
- evidence_events;
- mastery_snapshots;
- scheduler_state;
- sessions;
- learner_goals;
- settings;
- retained_recordings (metadata only + local path);
- mined_items (learner-owned words with source citations, K-14;
  device-local, deletable together with their SRS rows);
- reports.

## Evidence immutability

Evidence may be tombstoned/redacted for privacy but should otherwise be append-oriented. Corrections are new events referencing old ones so algorithm behavior can be audited.

## Export/import

Provide a documented portable export before cloud sync. Export supports:

- learner data;
- settings;
- optional recordings (user chooses);
- installed-pack references/versions, not necessarily redistributing large packs/models.

Import validates version/migrations and never overwrites a profile silently.

### Implemented in the desktop app (2026-10-08 settings slice)

Settings → "Your data" carries the two controls the privacy notice promises:

- **Export** writes one JSON document to `<data>/exports/<profile-id>-<timestamp>.json`
  (`profile_export` → `crates/storage::Store::export_profile`, `ExportOptions::default()`).
  **Recordings are not included in that default bundle**; the format version is
  `storage::EXPORT_FORMAT_VERSION`, and a test pins the version, the on-disk file,
  and the exclusion of recordings.
- **Delete profile** (`profile_delete` → `Store::delete_profile`) is one-shot: the
  second call for the same profile errors. The UI requires an explicit second
  confirmation and states that deletion cannot be undone.

**Import is not implemented.** The export document is a portability and backup
artifact today, not a round-trip path; `Import validates version/migrations …`
above remains a requirement, not a current capability. Exported copies leave app
control at the moment they are written (see *Deletion and recovery contract*).

The microphone permission toggle (`microphone-enabled`, default on) is enforced at
capture: `recordAttempt` refuses `getUserMedia` and says why when the setting is
off. A stored preference is not the only gate.

The in-app kana keyboard (`kana-keyboard`, values `off` | `romaji-kana`, default
`off`, `get_kana_keyboard`/`set_kana_keyboard`) is a per-profile preference: it
selects the app's own romaji→kana typing layer for the answer fields and changes
nothing about the system layout or OS IMEs. While it is off — or while an OS IME
is composing — the app intercepts no keys (issue #2 phase 1).

## Pack threat model

Assume third-party packs may be malicious.

Defenses:

- no executable pack scripts;
- archive traversal prevention;
- decompression-bomb limits;
- max files/size;
- strict schema validation;
- sanitized rich text;
- whitelisted media formats;
- local content IDs namespaced to pack;
- no arbitrary filesystem/network access from pack data;
- signature/trust metadata for official/reference distribution.

## Model threat model

Model files can be very large and may exploit runtimes. Download only from configured registries, verify checksums/signatures where supported, pin metadata, and isolate provider processes when reasonable.

## Secrets

Cloud provider API keys are optional and stored using OS secure storage where available. Never put keys into pack files or repository config.

## Network policy

Core application makes no network call merely to launch/study installed content. Network features (download/update/cloud AI/sync) are explicit service actions and should be observable in settings.

## Privacy acceptance

Release blockers:

- microphone works with network disconnected after models installed;
- no hidden upload during local speech tests;
- delete-recordings flow actually removes files;
- export/import round-trip succeeds;
- pack rendering cannot execute scripts;
- path traversal archives are rejected;
- logs do not contain raw audio or secrets by default.

## Consent boundaries

Capture requires OS permission plus a visible app recording action. Installing or enabling a cloud provider is not consent to send previous recordings, historical transcripts, or unrelated profile data. Before the first upload, show provider identity, fields sent, retention/training terms, and expected purpose; record the user's explicit choice. Revoking a provider disables subsequent sends immediately. Data donation, reports with recordings, diagnostics upload, and optional sync each require their own choice. An unavailable local provider must never silently activate a cloud provider.

## Deletion and recovery contract

Raw audio defaults to memory-only processing and is released when feedback/comparison ends. If a runtime needs temporary files, use private app-local storage and delete them on success, cancellation, errors, and startup recovery. Retained recordings are explicitly opt-in. Transcripts may be sensitive even after audio deletion; durable evidence stores content IDs/outcomes rather than free-form speech unless a feature explicitly needs it and retention is disclosed.

Deleting a recording removes its file, metadata link, disposable waveform/features, and app-owned temporary copies. Deleting a profile removes its app-owned learner data, caches and audio. Exported copies or external backups already controlled by the user are outside app deletion; disclose this limit. A tombstone preserves event identity, never erased personal content. Document SQLite/WAL, crash-dump and backup behavior; do not promise forensic erasure beyond tested storage guarantees. Logs must exclude transcripts, API keys and identifying reviewer/participant information by default.

## Untrusted imports and archive details

Profile import and pack install share bounded extraction/parsing defenses. Reject symlinks/hardlinks, absolute/drive/UNC paths, traversal after normalization, duplicate destination names, case or normalized-Unicode collisions on supported filesystems, reserved Windows device names and alternate data streams, archive special files, links to files outside the install root, unsafe asset types, and oversized compressed/uncompressed payloads. Limits include per-file and total expanded bytes, nesting, file count and parser resource budgets. Validate JSON/YAML duplicate keys as errors and handle truncated/invalid encodings gracefully.

Stage imports in a private directory, reject path/link replacement races during extraction, verify references/version/schema, then commit storage changes transactionally. Do not check a path once and later follow a substituted filesystem link. Disk-full, interruption, invalid migration, corrupt DB, and duplicate evidence IDs must preserve the existing profile and have tested recovery. Retry/idempotency cannot double-count learner evidence. Pack updates preserve old content versions or stable mappings needed by existing evidence; quarantined/retracted content excludes invalid evidence and rebuilds affected derived state without losing unrelated progress.

## Privacy test matrix

Exercise first launch, study, local speech, updates disabled, provider error/retry/cancel, reporting, deletion, export/import, and app crash recovery under network observation. Local-only mode must send neither DNS/HTTP requests nor remote media/font fetches merely to render a pack. Test secret/profile isolation across multiple local profiles. Optional diagnostics must disclose exact fields and be inspectable before transmission.
