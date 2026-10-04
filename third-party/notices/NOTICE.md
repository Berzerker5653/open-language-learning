# TTS payload notices (TTS-bundled variant, ADR-0009)

The TTS-bundled download variant ships an offline speech synthesis
payload. These obligations attach to that payload, not to the
application as a whole. The bare variant contains none of these
components.

## Components

| Component | License | Role |
| --- | --- | --- |
| espeak-ng (data + linked library) | GPL-3.0 | grapheme-to-phoneme data for Japanese synthesis |
| sherpa-onnx | Apache-2.0 | speech runtime |
| ONNX Runtime | MIT | model inference engine |
| Kokoro (kokoro-multi-lang-v1_0) | Apache-2.0 | Japanese voice model |

License texts: `GPL-3.0.txt`, `Apache-2.0.txt`, `ONNX-Runtime-MIT.txt`
(next to this file; staged into the payload at build time).

## Source offer for GPL-3.0 components (espeak-ng)

The espeak-ng components in this payload are upstream releases from
<https://github.com/espeak-ng/espeak-ng>. The exact corresponding source
for the shipped build is available:

1. directly from the upstream release tagged in
   `docs/provenance/tts-candidates.md` (version recorded there and in the
   payload manifest), and
2. for at least three years from this distribution, by written request
   to the project maintainer at the contact listed in the release notes
   of the distributed app version, at no charge beyond the cost of
   physical distribution.

The complete corresponding source for any modifications we ship (none at
the time of writing; the payload is unmodified upstream output) is
included in the same offer.

## Attribution

The application's Languages page lists these components whenever a TTS
payload is active (bundled, downloaded model, or user-provided).
