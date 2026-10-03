# Language Pack Template

Scaffolded by `langpack init` and validating clean. Copy this directory,
then:

1. Edit `manifest.yaml`: set a real reverse-domain `pack_id`
   (`community.<you>.<language>`), `display_name`, `target_locale`,
   `version`, and the `license` block.
2. Fill `sources.jsonl` and `licenses.jsonl` FIRST: every content item
   must trace to a source record, and every source needs a license or an
   explicit reference-only status. Reference-only sources (frameworks,
   corpora you may not redistribute) may inform your work but their text
   may not be copied into the pack.
3. Add content: `curriculum/goals.yaml` (goals/units),
   `lexicon/vocabulary.jsonl` + `lexicon/expressions.jsonl`,
   `grammar/concepts.jsonl`, optional `activities/scenarios/*.yaml`,
   `language/phonology.yaml`, `media/*.wav` (only audio you have rights
   to distribute; label synthesized audio as `model-output`).
4. Validate continuously and before publishing:

   ```sh
   cargo run -p lts-langpack-cli -- validate <your-pack>   # fast structural check
   cargo run -p lts-langpack-cli -- lint <your-pack>       # quality: fails on warnings
   cargo run -p lts-langpack-cli -- test <your-pack>       # full conformance gate
   cargo run -p lts-langpack-cli -- audit-licenses <your-pack> --attribution-report
   ```

5. Build a deterministic archive and publish it as a **GitHub release
   asset** (one release per version):

   ```sh
   cargo run -p lts-langpack-cli -- build <your-pack> --out my-language-1.0.0.lpk
   sha256sum my-language-1.0.0.lpk
   ```

6. Open a pull request adding an entry to `catalog/packs.json` with the
   release URL, SHA-256, exact size, your author name, license, and
   `review_status` ("community" unless a qualified human review actually
   happened — claiming "reviewed" without one is dishonest and the app
   displays it as your claim only).

Packs are declarative data: no scripts, no executables. The installer
enforces path safety, size limits, per-file checksums, and schema
conformance; packs that fail are rejected. See
`docs/packs/CONTRIBUTING.md` for the full guide.
