# Data handling — speech calibration study (SPEECH-007)

Storage, access, retention, and metadata rules for consented learner
recordings. Enforces docs/05 §223, docs/08 §35–41/§137–141, docs/12 §39,
docs/17 §29/§125. No data exists yet; this is the contract for when it does.

## Storage location and isolation

- Raw learner audio + transcripts live in **access-controlled evaluation
  storage outside the repository and outside distributed packs** (docs/17 §125).
- Never commit raw audio or free-form transcripts to source control
  (docs/05 §221). Only the dataset `manifest.yaml`, permitted aggregate
  results, and content hashes ship.
- Study storage is separate from ordinary app diagnostics exports; identifiable
  recordings/transcripts must never be added to diagnostic exports
  (docs/12 §39).

## Access control

- Named, minimal reviewer/analyst list; access logged.
- Labelers see audio + the study ID only — no participant identity, no contact
  details (supports blinding in the labeling rubric).

## Retention

- Retain only for the calibration study window; set a retention deadline at
  collection. Default posture minimizes retention (docs/08 §35–37).
- Training use (P3) requires its own grant and its own retention terms; using
  the app never implies training consent (docs/08 §39–41).

## Deletion / withdrawal

- On withdrawal or retention expiry: delete audio, derived features/waveforms,
  and metadata links; tombstone keeps only the event ID (docs/08 §139–141).
- Document SQLite/WAL, crash-dump, and backup behavior; do not promise forensic
  erasure beyond tested storage guarantees (docs/08 §141).

## Metadata minimization schema (allowed consented fields, gated on P5)

Only these fields may be retained, and only with the P5 grant. Each is
optional; absence is allowed and reported (docs/17 §25).

```yaml
# per-participant record in study storage (NOT in the repo)
study_id: string # opaque, non-reversible; the only join key
consent: # explicit per-purpose grants (see participant-consent.md)
  p1_participation: bool
  p2_retain_audio: bool
  p3_training: bool
  p4_publish: bool
  p5_share_metadata: bool
learner: # minimization: coarse categories, never identifiers
  l1_group: string # coarse L1 grouping relevant to vowel-length errors
  proficiency_band: string # self-reported/assessed CEFR band
  accent_group: string # relevant learner/accent group, if consented
  vocal_range: string # coarse (e.g. high/low) if needed for coverage
capture:
  device_class: string # e.g. laptop-builtin-mic, headset, phone
  microphone: string # device model class, not serial
  sample_rate_hz: int
forbidden: # never collected/stored
  - name
  - contact_details
  - precise_geolocation
  - reversible_identity # docs/17 §29: avoid reversible identity details
```

## Re-identification caution

Voice, free-speech transcripts, precise timestamps, and small
demographic/device combinations can identify people (docs/12 §39). Keep the
public manifest free of any of these; publish only aggregate metrics and
content hashes (docs/17 §125).

## Upstream/licensed datasets (if not self-collected)

If a third-party dataset is used instead of self-collected recordings, record
its exact license AND access/use conditions in the dataset manifest before use;
a CC0 label does not waive a release page's no-re-host / no-speaker-identification
terms (SOURCES.md §82–84, docs/05 §223). Fetch from upstream under those terms;
do not re-host raw audio. See `datasets/SOURCING.md`.
