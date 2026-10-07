# Participant consent — speech calibration study (SPEECH-007)

Purpose: recruit a small consented learner panel to record the taught
long-vowel minimal-pair phrases (and controls) so `ja.phon.vowel-length` can be
calibrated. This instrument operationalizes docs/05 §223, docs/08 §39–41, and
docs/12 §39. It is a template the owner adapts before any collection; no
collection has occurred.

## Core rule: consent purposes are separate and independently revocable

Microphone permission for in-app practice is NOT consent to any of the below.
Each purpose is a distinct, opt-in grant recorded per participant. Declining
one must not block the others or app use (docs/08 §41, docs/11 §33–35).

| #   | Purpose                                                              | Default | Grant recorded as               |
| --- | -------------------------------------------------------------------- | ------- | ------------------------------- |
| P1  | Research participation (join the study)                              | off     | explicit opt-in                 |
| P2  | Retain the recorded audio for evaluation/calibration                 | off     | explicit opt-in                 |
| P3  | Use recordings for model training                                    | off     | explicit opt-in (never implied) |
| P4  | Publish/redistribute audio or transcripts                            | off     | explicit opt-in                 |
| P5  | Share de-identified metadata (proficiency, L1, accent group, device) | off     | explicit opt-in                 |

A participant may grant P1+P2 and decline P3/P4/P5. P2 without P4 means audio
stays in access-controlled evaluation storage and never ships (docs/17 §125).

## Plain-language consent text (adapt, then have a human review before use)

> We are studying how well our app's pronunciation feedback handles Japanese
> long-vowel contrasts (like おばさん vs おばあさん). If you join, you will
> record a short list of phrases on your own device.
>
> - Joining is optional and separate from using the app. Declining changes
>   nothing about your app experience.
> - You choose what we may keep: the recordings, whether they may train a
>   model, whether they may be published, and whether we may share anonymous
>   details like your study level.
> - You can withdraw at any time and ask us to delete your recordings and
>   data; we will confirm deletion.
> - We do not collect your name. We may keep a study ID, your approximate
>   level, first language, and device type only if you allow it.
> - Recordings are stored in access-controlled study storage, not in the app's
>   public files, and are never included in the shipped app.

## Withdrawal and deletion

- Withdrawal revokes P2–P5 prospectively; on request, delete audio, derived
  features/waveforms, and metadata links (docs/08 §139–141).
- Deletion removes the file, its metadata link, disposable waveform/features,
  and app-owned temporary copies. A tombstone preserves only the event ID,
  never the erased content (docs/08 §141).
- Already-published or user-held exported copies are outside our deletion
  reach; disclose this limit (docs/08 §141).
- If a withdrawn recording already entered a frozen calibration result, mark
  the affected result for re-computation; do not silently keep it.

## Eligibility and metadata minimization

Collect the minimum needed for the protocol's subgroup/coverage claims
(docs/17 §25), and only with P5. See `data-handling.md` for the exact allowed
fields. Do not collect names, contact details, or precise geolocation.

## Attribution

Do not name participants publicly. Reviewer/participant public attribution
requires separate explicit consent (docs/09 §135, docs/16 §112).
