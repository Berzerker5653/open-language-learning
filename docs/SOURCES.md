# Research and Source Registry

Source registry originally assembled on 2026-10-02 and audited on that date. Entries are research references/candidates, not blanket proof that all content or binaries have been verified. The review report identifies primary sources rechecked during this audit. Re-check changing software/model/license facts and artifact-specific terms before depending on them.

## Standards / proficiency

### JF Standard for Japanese-Language Education
Organization: The Japan Foundation Japanese-Language Institute
URL: https://www.jfstandard.jpf.go.jp/summaryen/ja/render.do
Role: Primary Japanese functional/Can-do framework reference.
Notes: Describes proficiency through Can-do statements and CEFR-aligned A1–C2 levels; emphasizes tasks accomplished in Japanese rather than counts of grammar/words/kanji.
Redistribution: Framework reference; do not assume all site/course content may be copied into pack.

### JF Standard Guidebook for Users — New Edition
URL: https://www.jfstandard.jpf.go.jp/pdf/web_whole_en.pdf
Role: Curriculum/assessment design reference.
Notes: JF Can-dos provide practical Japanese activities; JF activity Can-dos cover A1–B2 in the guidebook description.

### ACTFL Proficiency Guidelines 2024
Organization: ACTFL
URL: https://www.actfl.org/proficiency-guidelines-overview
Role: Secondary functional proficiency cross-check.
Notes: Describes speaking, writing, listening, and reading ability in real-world spontaneous/non-rehearsed contexts.
Licensing/copyright: Reference only unless terms specifically permit reuse. Do not reproduce restricted descriptors wholesale.

## Learning science

### Li & Sun (2024), Effects of different forms of explicit instruction on L2 development: A meta-analysis
DOI: https://doi.org/10.1111/flan.12726
Role: Evidence that explicit instruction can materially support L2 development; use alongside contextual practice rather than a false child-vs-adult dichotomy.

### Spada & Tomita (2010), Interactions Between Type of Instruction and Type of Language Feature: A Meta-Analysis
DOI: https://doi.org/10.1111/j.1467-9922.2010.00562.x
Role: Additional evidence around explicit/implicit instruction and grammar learning.

### Open Spaced Repetition / FSRS
URL: https://github.com/open-spaced-repetition
Algorithm overview: https://github.com/open-spaced-repetition/awesome-fsrs/wiki/The-Algorithm
Role: Candidate memory scheduler for discrete retrievable items; current implementations include Rust/TypeScript and model difficulty/stability/retrievability.
License: Verify selected implementation; current projects vary (e.g. MIT/BSD-3-Clause).

## Speech / local inference

### sherpa-onnx
URL: https://github.com/k2-fsa/sherpa-onnx
Role: Candidate local ASR/TTS/VAD runtime.
Observed capabilities: local speech recognition/synthesis/VAD and multiple platforms including Linux/macOS/Windows/Android/iOS/WebAssembly.
License: Apache-2.0 for repository at time of verification; verify individual models separately.

### whisper.cpp
Canonical project family: ggml-org/whisper.cpp
URL: https://github.com/ggml-org/whisper.cpp
Role: Candidate local multilingual ASR provider.
Notes: Widely used C/C++ on-device implementation; verify current canonical repository, license, model distribution, Japanese accuracy and timestamps during provider spike.

### Montreal Forced Aligner
URL: https://montreal-forced-aligner.readthedocs.io/
Role: Reference/corpus alignment and possible offline preparation tool; evaluate runtime suitability separately.

### pyopenjtalk / Open JTalk
URL: https://github.com/r9y9/pyopenjtalk
Role: Candidate Japanese G2P/full-context frontend/accent prediction support for tooling/reference generation.
Notes: pyopenjtalk documents MIT wrapper, Modified BSD Open JTalk, Apache-2.0 marine option, and separate voice terms. Audit bundled dictionary notices.

### OJAD — Online Japanese Accent Dictionary
URL: https://www.gavo.t.u-tokyo.ac.jp/ojad/eng/
Terms: https://gavo.t.u-tokyo.ac.jp/ojad/eng/pages/notes
Role: Valuable educational/research reference for Japanese accent.
Distribution warning: Published terms restrict use to academic/educational purposes and ask users to refrain from for-profit ventures. Treat as reference-only unless explicit compatible permission is obtained.

## Japanese lexical/data candidates

### JMdict / EDRDG
License: https://www.edrdg.org/edrdg/licence.html
Project: https://www.edrdg.org/wiki/JMdict-EDICT_Dictionary_Project.html
Role: Candidate Japanese lexical dictionary data.
License note: EDRDG states dictionary files are available under CC BY-SA 4.0 and require attribution; derived data/share-alike implications must be isolated and documented.

### Mozilla Common Voice — Japanese
Exact release page: https://mozilladatacollective.com/datasets/cmu5xbhnf00fmnq07z9p3aa70
Role: Candidate speech research/evaluation/training dataset.
Metadata checked 2026-10-02: Common Voice Scripted Speech 27.0 Japanese, CC0-1.0, 14.36 GB.
Separate access conditions on the release page prohibit attempting speaker identification and re-hosting/re-sharing the dataset. A CC0 label does not waive those service conditions. Do not bundle/re-host raw benchmark audio; fetch from upstream under the applicable terms and retain dataset/version/hash/consent records.
Warning: exact releases, sizes, access process and conditions change; verify at acquisition.

## Application framework

### Tauri 2
URL: https://tauri.app/
Role: Recommended native shell.
Observed current official description: web frontend + Rust/native integration; targets Linux, macOS, Windows, Android, and iOS from one codebase.
License/site: verify current framework dependency licenses during bootstrap.

## TTS candidate notes

Piper historically provides local low-latency TTS but the original `rhasspy/piper` repository was archived in 2025. Treat forks/successors and individual voice licenses as research candidates, not an automatic production dependency.

Kokoro-family open-weight TTS implementations may be worth benchmarking, but repository and model/voice license provenance must be verified before selection.

## Desktop security and test references checked during audit

- Tauri security model: https://v2.tauri.app/security/ and https://v2.tauri.app/security/capabilities/ — native command privileges and frontend capability boundaries require explicit least-privilege configuration.
- Tauri WebDriver tests: https://v2.tauri.app/develop/tests/webdriver/ — the documented embedded WebdriverIO service supports Windows/Linux/macOS; direct `tauri-driver` has different platform limits. Select and verify an actual packaged-app strategy rather than assuming browser mocks prove native parity.
- Tauri updater: https://v2.tauri.app/plugin/updater/ — validate signed application updates if the updater is adopted; manage keys outside packs/source and reject tampered updates.

These are implementation references, not evidence that this specification has passed native-platform tests.
