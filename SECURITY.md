# Security Policy

This is an offline-first learning platform that reads untrusted third-party data
(language packs), records audio behind a permission gate, and installs binaries it
downloads from GitHub releases. Treat those three boundaries as the attack surface.

## Reporting a vulnerability

Use the **Report a vulnerability** form on the
[Security tab](https://github.com/Berzerker5653/open-language-learning/security/advisories/new).
It creates a private report; other users cannot see it.

Please do **not** open a public issue, discussion or pull request for a vulnerability,
and do not include a working exploit in a public comment. If the private form is
unavailable to you, open a blank issue with the single word `security` in the title and
no details; the maintainer will reply with a private channel.

Reports are read by a single unfunded maintainer. There is no contractual SLA and no
bounty. You get an acknowledgement, a decision on whether the report is in scope, and a
fix forwarded into `main` and shipped with the next build. Nothing is disclosed publicly
without your consent.

## What is in scope

- Anything reachable from a malicious or malformed language pack: archive path
  traversal, extraction outside the store directory, decompression or size
  amplification, schema-version confusion, or a pack that makes the engine execute
  content it treats as data. Third-party packs are untrusted data by design and may
  never run code inside the application process.
- The update and install path: `catalog/packs.json` pins, release-asset `sha256` and
  size checks, the install gate, and the same checks for desktop artifacts. A way to get
  the app to install an archive that fails those checks is a security bug.
- Desktop sandboxing and permissions: microphone access, file access outside the app
  data directory, and the Tauri capability surface.
- Privacy guarantees: recordings and learner data staying local unless the user
  explicitly enables a provider that uploads; any upload-capable provider must show a
  privacy notice before first use. A silent or unnoticeable upload path is a security
  bug.
- Injection into the app UI from pack content (story text, glosses, dictionary strings).

## What is not in scope

- Linguistic correctness, pedagogy, or offensive content in a pack. Those go to the
  content-review issue template or `languages/*/review/REVIEW_POLICY.yaml`; they are
  editorial problems, not vulnerabilities.
- Attacks that require the user to already run arbitrary code on their machine, or to
  edit the local app data directory, pack store, or configuration.
- Vulnerabilities in the upstream toolchain (Rust, Tauri, whisper.cpp) that are not
  reachable through this product. Report those upstream as well.
- Models the user downloads themselves from third-party sources.

## Supported versions

| version                                  | supported |
| ---------------------------------------- | --------- |
| `main`                                   | yes       |
| latest published alpha (`0.4.0-alpha.1`) | yes       |
| older alphas, superseded pack releases   | no        |

Fixes land on `main` first. This project does not maintain backport branches.
