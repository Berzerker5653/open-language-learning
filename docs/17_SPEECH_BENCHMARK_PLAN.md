# 17 — Speech Provider Benchmark Plan

## Objective

Choose initial local providers using reproducible measurements rather than popularity.

## Candidates

At minimum investigate current maintained releases of:

- sherpa-onnx-compatible Japanese ASR models;
- whisper.cpp with suitable Whisper-family model sizes;
- Japanese G2P/text frontend options such as Open JTalk-compatible tooling;
- runtime alignment approaches compatible with desktop and future mobile deployment;
- local TTS providers/voices with acceptable Japanese quality and redistribution terms.

Re-check maintenance/license status when the task runs.

## Protocol and permission gates before measurement

Create a versioned evaluation protocol before selecting thresholds or measuring the final test set. It must declare supported features, utterance modes, target variety/variants, lesson contexts, provider/model configurations, user/device scope, human labels, error definitions, exclusion rules, sampling plan and release limits. Specify numeric false-correction limits, scoring/abstention coverage thresholds and evidence sufficiency appropriate to each feature before looking at held-out results. This handoff does not supply empirically justified numbers; unfilled limits or insufficient evidence keep automatic scoring disabled. Record who is qualified to review the protocol and how decisions/disagreements are resolved; do not invent approval evidence.

Separate development/threshold-selection data from the final evaluation set. Hold out speakers and, where claims cover generalization, relevant words/phrase families/contexts; group repeated attempts from one speaker together so they cannot leak across splits. Document reuse/overlap with candidate model training data where known, and disclose unknown training overlap. A phrase-specific feature must declare that limited scope rather than inherit broad Japanese claims.

Use both reference/acceptable speech and learner speech with meaningful errors, plus ambiguous, wrong-utterance and technical-failure cases. Cover supported microphones/devices, speaking rates, vocal ranges, proficiency and relevant learner/accent groups using consented metadata; justify sample sizes and the precision needed for release decisions. A native read-speech corpus is an ASR baseline, not a substitute for labeled learner errors. Synthetic fixtures may aid controlled testing but cannot alone demonstrate accuracy on real learners.

Two appropriately qualified reviewers should independently label the critical calibration subset before model outputs are revealed. Record agreement, disagreements, adjudication and ambiguous cases under a stated annotation rubric. The protocol must define acceptable label reliability and how cases that cannot be resolved are excluded from automatic judgments while still reported. Labels must distinguish intelligibility, task success, specific pronunciation contrasts and stylistic preference; a natural accepted variant is not a negative case merely because it differs from the chosen reference.

Record exact dataset license/access conditions and participant permissions before collection/use. Microphone permission does not authorize evaluation retention, training, publication or redistribution. Document separate purposes/consent, storage/access, retention and withdrawal/deletion handling. Keep raw private audio outside source control and distributed artifacts; shared manifests/results must avoid personal identifiers or reversible identity details. Use upstream fetching under the exact release conditions for datasets that forbid re-hosting. Permissioned project recordings may be distributed only within their expressly granted scope.

## Hardware tiers

Benchmark at least:

- low desktop/laptop CPU tier;
- typical modern desktop tier;
- accelerated GPU-capable tier if provider supports it;
- representative Android/iOS device during mobile milestone.

Pin machine/OS/backend, power settings, thread count and provider/model versions/checksums. Separate cold-load from warmed inference, record utterance-length buckets and repeated-trial counts, and define start/end timestamps for latency measurements. Include preprocessing/alignment/feedback time in the end-to-end user delay, responsiveness during inference, failures/cancellation and disk/memory limits. Benchmark under network-disabled conditions after explicit model installation. Set measured performance budgets for each supported configuration before promoting it, rather than extrapolating from a faster device.

## ASR metrics

- Japanese word/character error proxy on licensed test set;
- target-phrase intent accuracy;
- short-utterance latency p50/p95;
- real-time factor;
- cold model load time;
- RAM/VRAM;
- model disk size;
- timestamp/alignment usefulness;
- behavior on learner accents;
- offline operation;
- CPU/GPU backend availability;
- license and model-data provenance.

Do not optimize solely for WER; short educational utterances and pronunciation differences have different failure modes.

Pin Japanese transcript normalization, tokenizer and accepted orthographic variants so CER/WER proxies are reproducible. Preserve contrasts relevant to a task; do not mistake normalized text accuracy for acoustic length or pitch accuracy. Report task/intent validity separately from transcript metrics. Test silence, noise, wrong phrases, omissions/additions and expected-target decoder bias with the same prompts/options used by the app; forced alignment is not independent verification that the target was spoken.

## VAD/quality metrics

- false start/end cuts;
- silence rejection;
- noise behavior;
- latency;
- CPU cost.

## Alignment metrics

For constrained Japanese phrases:

- boundary error against permissioned/manual reference;
- abstention on wrong phrase;
- stability under slower learner speech;
- useful mora/phone mapping coverage;
- runtime latency.

Define boundary units and manual-label tolerance in the protocol. Report the distribution of boundary errors and mapping coverage on accepted matches, alongside rejection/false-match rates on wrong or unsuitable utterances. Provider word/token timestamps cannot be assumed to be calibrated phone/mora alignment.

## Pronunciation feature calibration

For each automated feature, create positive/negative/ambiguous examples and measure false positives/false negatives. If calibration is poor, keep the feature in guided comparison mode.

For each feature and relevant supported group/context report:

- false corrections on human-acceptable attempts, with explicit attempt/feature-opportunity denominators;
- incorrect actionable corrections among all issued corrections;
- missed meaningful errors, both conditional on scored attempts and overall including abstentions;
- false acceptance/praise where it would produce misleading mastery evidence;
- abstention/retry rate, eligible-attempt scoring coverage and quality-rejection reasons;
- confusion by error/variant type, with sample/speaker counts and uncertainty intervals that account for clustered attempts where needed;
- confidence reliability at the actual decision bands/thresholds used, rather than treating a raw provider score as a probability.

Report both aggregate and relevant subgroup results; insufficiently sampled conditions remain unsupported. Apply the declared limits to held-out results with their uncertainty, including the minimum coverage threshold. Passing a false-correction gate by abstaining on almost all attempts is not a useful supported automatic feature. Failure or insufficient precision retains guided/reference mode and produces no numeric pronunciation grade or mastery updates from unvalidated acoustics.

Bind each passing calibration record to provider ID/version, model ID/version/checksum, feature/interpreter version, preprocessing/configuration, pack/target versions, reference variety and protocol/dataset/result hashes. Before inference, verify that the installed combination matches the evidence and scope. Updates or target/variant corrections invalidate affected eligibility until appropriate regression/recalibration passes. Never carry trust forward merely because a new model has the same capability name.

## TTS evaluation

- Japanese intelligibility;
- naturalness;
- accent/prosody reliability for target lessons;
- controllability;
- latency;
- model size;
- offline operation;
- code/model/voice license compatibility.

Use a declared human listening rubric with reviewer qualifications, reviewed target scope, disagreements and evidence. Check actual lesson audio/readings/accent in context, not only G2P metadata; document failures and target-specific human-recording overrides. Distinguish isolated-word accent from phrase prosody and review generated error fixtures perceptually. Slowed learner playback must preserve pitch where the control is offered; it is support use rather than independent natural-speed listening evidence.

## Decision output

The task produces an ADR with:

- selected default provider(s);
- model tiers;
- why alternatives lost;
- known failure modes;
- fallback behavior;
- benchmark scripts and raw summarized results.

## Evidence artifact contract

Use repository paths such as `benchmarks/speech/protocols/ja-JP/<feature>-<protocol-version>.yaml`, `benchmarks/speech/datasets/<dataset-id>/manifest.yaml`, and `benchmarks/speech/results/<run-id>/summary.json` for versioned protocols, non-identifying manifests and permitted aggregate results. Store any distributable feature evidence summary at `languages/ja-JP/speech/calibration/<feature>-<revision>.yaml`, referenced by a pack-relative `speech/calibration/...` path and immutable protocol/result hashes. These are future task outputs, not present proof. Private recordings must remain in access-controlled evaluation storage outside the distribution, with only permitted metadata/checksums retained in public artifacts.

The provider ADR, human annotation protocol, feature-specific passing evidence, supported scope, known failure modes, and downgrade/revalidation behavior together authorize automatic feature promotion. Without them, the draft profile stays guided/reference. Model availability, an experimental pack label, and AI-only review cannot satisfy this gate.

## Stable release minimum

SPEECH-007 must qualify at least one high-value Japanese pronunciation contrast for automatic
feedback within a useful declared coverage envelope **before any release ships automatic
pronunciation scoring** — not before desktop 1.0. `docs/00_MASTER_SPEC.md:265` leaves automatic
speech scoring out of the desktop 1.0 feature set, accepted ADR-0017 keeps desktop 1.0 free of
speech-accuracy work, and the ROADMAP edges that had made SPEECH-007 a `REL-001` predecessor
were removed on 2026-10-17 (recorded in ADR-0034). Desktop 1.0 therefore ships pronunciation
feedback in guided/reference mode: the learner hears the model output and their own recording,
with no automatic correctness verdict and no confidence claim. Unsupported or unreliable
features remain guided/reference. If no feature qualifies, the automatic-feedback release stays
blocked and its builds remain labeled guided; record the feasibility evidence for an explicit
owner scope decision rather than passing an empty automatic-feature gate.
