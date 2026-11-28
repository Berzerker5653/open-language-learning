# Russian reference pack 0.5.2

Supersedes 0.4.9. Content-only release built from tag `org.openlanguage.ru-ru.reference-0.5.2` (HEAD a3ed01e7). Progress data is untouched — installing updates content in place.

## What's new since 0.4.9

### Letter drill fix
- Every Cyrillic letter drill row now declares its playback sound explicitly — fixes letters whose audio clip name didn't match the letter key (silent/wrong audio in the drill).

### Month-1 content review fixes
- Stress-mark defects corrected across month-1 vocabulary entries.
- Early-supply densify: more usable vocabulary in the first weeks.
- New lexicon slices (neg4, soc2, numbers-time) and new drill audio clips.

### Practice quality
- Writing practice now teaches real word forms (inflection paradigms) instead of only dictionary forms.
- Goal-ladder supply fixed so lesson ladders match actual pack content (RU and JA data).

## Verification
All 12 release gates green: manifest validate, lint, test, curriculum/lexicon/license/source audits, archive build, inspect, media validation, and a clean-clone install round-trip into an empty store. Evidence: `state/evidence/RC-0.5.2-2026-11-28/`.

Archive SHA-256: `a3fd4de204bd1825cb6d8736f429d76d45c150a6500204fe8da149d817a0e113`
