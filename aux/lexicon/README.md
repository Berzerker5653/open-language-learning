# Offline auxiliary lexicon slices

These files back the reader's off-pack word card (READER-FLOW-001): when
the pack lexicon misses a tapped word, the card may show a row from the
matching `<lang>.jsonl` slice — always under its own
"offline auxiliary dictionary (Wiktionary via kaikki.org, CC BY-SA /
GFDL)" label, never as pack data. The pack lexicon stays separate and
trusted.

- Built by `scripts/build-aux-lexicon.py` from kaikki.org's
  machine-readable dictionary. kaikki.org publishes its Wiktionary
  extraction "under the same licenses as Wiktionary — both CC-BY-SA and
  GFDL" (https://kaikki.org/dictionary/, "Copyright and license",
  accessed 2026-11-20).
- Attribution (required by ShareAlike): "Definitions from Wiktionary via
  kaikki.org (CC BY-SA / GFDL)". Every aux card displays it; the slice
  itself is a derivative work licensed CC-BY-SA/GFDL, which is exactly
  why it is never merged into the MIT-licensed pack lexicon.
- Provenance: `ru.provenance.json` pins the source URL, source sha256,
  slice sha256 and the slicer rules; `--check` (wired into
  `scripts/ci.sh`) proves the committed file still matches.
- The raw kaikki input is not committed (size). Slice drift is fixed by
  re-running `--write --input <pinned file>` — never by editing rows.
