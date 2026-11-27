### Alpha 0.5.0-alpha.1 — published build evidence (2026-11-26)

Built from release commit `47ad3036` (tag `open-language-learning-platform-0.5.0-alpha.1`),
which stamps desktop version `0.5.0-alpha.1`. Toolchain as before. Builds were run
**strictly serially** — a first attempt that overlapped base and aligner builds raced on the
shared `target/release` bundle dir and was discarded wholesale; both shipped variants were
then rebuilt clean from the release commit in one serial job (`tauri build` →
`scripts/finalize-appimage.sh` → copy to `dist/artifacts/alpha.13-0.5.0/`).

| artifact | bytes | sha256 |
| --- | --- | --- |
| base deb | 13,070,488 | `47c9ef024026fef76d75d2141a376ab08910e0feb57677010468d6096d5b7646` |
| base AppImage | 74,058,232 | `ca5e7a93a4865431389a07ebaf9ef994f0a81b7e21fae84cd8fbff8ee974e3b2` |
| aligner deb | 84,542,662 | `c1958b4ec92cd9b762f582bd61b456d0e8c0f9fe9ca8f62d245280ecaddbad3b` |
| aligner AppImage | 146,176,504 | `c366cbabaa2b3b78a68e7d818158ff5c0614916f740a482d50d8f74e07a6bbf1` |

Both AppImages finalized (WebKit dropped; system webkit2gtk-4.1 required, matching the deb
control deps `gstreamer1.0-plugins-good, libwebkit2gtk-4.1-0, libgtk-3-0`).

Payload-verified from the unpacked debs, not the build tree: the aligner deb unpacks
`usr/lib/open-language-learning-platform/aligner/linux-x64/` (whisper-cli, whisper/ggml/gomp
libraries, `model/ggml-tiny.bin`, `SIDECAR.yaml`) plus `aligner/LICENSE.whisper-cpp.txt`;
the base deb contains no aligner path. Deb control `Version: 0.5.0-alpha.1`; the shipped
base binary carries the commit string `47ad3036` and the `0.5.0-al…` version fragments.

Gates on the exact built tree (`state/evidence/RELEASE-0.5.0-alpha.1/gates.log`): workspace
tests: the full parallel workspace pass showed the single documented pre-existing
`dictation_check_matches_spoken_target` engine-error failure (140/1 in lts-desktop); the test
is green standalone 2/2 under identical conditions, so the documented re-run rule was applied
(distinguish flake from failure by re-running, not by suppression). All other 35 suites green., web suite
398/0, fmt/clippy/`-D warnings` clean, learner-copy audit 0 findings, handoff validation
PASSED (2,081 files).

GitHub re-hashed every uploaded asset to the same digests (API `digest` field,
`sha256:` prefixes `47c9ef02` / `ca5e7a93` / `c1958b4e` / `c366cbab`). The release is
pre-release `open-language-learning-platform-0.5.0-alpha.1` with the four artifacts attached
(provenance of the `gh release create` run kept in the session record). The aligner sidecar
is the same pinned payload as 0.4.x (whisper.cpp 1.9.4, ggml-tiny.bin `1d53a4e0…`, staged at
`apps/desktop/sidecar/linux-x64`).
