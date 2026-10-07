# Labeling rubric — ja.phon.vowel-length calibration (SPEECH-007)

Two independent qualified labelers annotate the critical subset before any
model output is revealed (docs/17 §27). This defines qualification, the rubric,
blinding, the agreement statistic behind `min_label_agreement`, and
adjudication. No labels exist yet; this is the procedure to run once recordings
are sourced.

## Reviewer qualification (record before labeling)

Native/near-native Japanese alone does NOT qualify a reviewer (docs/09 §147,
docs/16 §114). Each labeler must have, and have recorded:

- Japanese phonetics/phonology competence sufficient to hear and label moraic
  **vowel-length** contrasts (short vs long; おばさん/おばあさん-type), and to
  distinguish length from adjacent contrasts (gemination, moraic nasal,
  vowel devoicing) so a length label is not confounded;
- awareness of **script/length conventions** (native vs loanword long-vowel
  spelling) so an orthographically unusual but acceptable production is not
  mislabeled (docs/assessment/JA_PHONOLOGY.yaml `ja.phon.vowel-length`);
- annotation/assessment discipline: apply the rubric consistently, abstain when
  unsure, and never infer from the transcript alone.

Record each reviewer's qualification category and evidence. Missing reviewer
availability is a declared blocker, not permission to invent labels
(docs/16 §114). Do not publish reviewer identities without their consent
(docs/16 §112, docs/09 §135).

## Blinding

- Labelers receive audio + opaque `study_id` only — no participant identity,
  no model output, no other labeler's decision (docs/17 §27; access per
  `consent/data-handling.md`).
- Both labelers finish and freeze their labels **before** any automatic
  feature output is generated or revealed. Model outputs must not be visible
  during labeling.

## Per-item rubric

For each target-phrase attempt, label these dimensions **separately**
(docs/17 §27). A natural accepted variant is NOT a negative merely because it
differs from the chosen reference.

1. **Intelligibility** (ordinal): `clear` / `understandable-with-effort` /
   `not-understood`.
2. **Task success**: did the learner produce the intended phrase (vs a wrong
   utterance / omission)? `yes` / `no-wrong-phrase` / `no-incomplete`.
3. **Vowel-length contrast** (the decision the feature acts on):
   - `correct` — intended length produced (or an acceptable variant);
   - `shortened` — a long vowel produced short (e.g. おばさん for おばあさん);
   - `lengthened` — a short vowel produced long;
   - `ambiguous` — borderline / not reliably determinable.
4. **Stylistic preference** (optional, never a correctness signal): naturalness
   note only.

### The binary decision that drives the gates

`acceptable` = contrast `correct` **and** task success `yes` (includes
acceptable variants).
`needs-correction` = contrast `shortened` or `lengthened` **and** task success
`yes`.
`excluded` = task success `no-*`, or contrast `ambiguous`, or technical failure
(silence/noise/clipping that prevents judgment). Excluded items are reported
but never counted as automatic-feature successes or failures (docs/17 §27).

- **False correction** (feature error) = feature issues a correction on an item
  both labelers (post-adjudication) marked `acceptable`.
- **Missed meaningful error** = feature stays silent/praises an item marked
  `needs-correction`.

## Agreement statistic (feeds `min_label_agreement`)

- **Primary:** Cohen's kappa (κ) on the binary `acceptable` vs
  `needs-correction` decision across the doubly-labeled critical subset.
  Threshold: κ ≥ 0.70 (substantial; Landis & Koch 1977). Below threshold ⇒
  label reliability insufficient ⇒ feature cannot qualify (docs/17 §27).
- **Secondary (reported, not gating):** Krippendorff's α on the ordinal
  intelligibility scale; report per-category confusion.
- Report agreement on the 4-way contrast category as a confusion matrix.

## Adjudication

- Disagreements on the binary decision are adjudicated by a third qualified
  reviewer or by consensus re-listen; record the resolution and rationale.
- Cases that cannot be resolved become `excluded` — removed from automatic
  judgments but still reported (docs/17 §27).
- Keep the full audit trail: item id, both labels, adjudication, final label.

## Output

Produce a per-item label table (item_id, study_id, labeler A/B, adjudicated
final, dimensions) stored in study storage; publish only aggregate agreement
and counts in the results summary (docs/17 §125). These feed `FeatureMetrics`
(`label_agreement`, `n_speakers`, `n_attempts`) in the eventual
`CalibrationRecord`.
