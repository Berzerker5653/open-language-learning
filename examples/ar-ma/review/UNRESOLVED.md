# Unresolved questions — Arabic (Morocco) Starter

Written by `scripts/new-pack.py`. Every item below is a claim the scaffold could not ground; none of it may be resolved by the author model.

- `capabilities.rtl: true` is declared, but nothing in apps/desktop reads it today: the pack installs and validates while the UI still lays out left-to-right. Renderer direction is an engine gap to report, not something a pack can fix.
- The only registered source is this pack's own scaffold content, which has no locator. docs/10 expects a URL/DOI per source: replace it with the real reference sources (grammar, dictionary, frequency list) and their licences before release.
- language/phonology.yaml is a scaffold: the segment inventory, phonotactics and prosody model are unresearched and the example strings are not evidence of a phoneme.
