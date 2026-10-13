# org.openlanguage.ru-ru.reference 0.4.0 (draft)

Russian reference language pack. **Every item is AI-drafted and not
human-reviewed**: 5,073 rows at `status: draft`, nothing at `validated` or
`verified`. The "(Draft)" display name stays for that reason.

| | |
| --- | --- |
| pack id | `org.openlanguage.ru-ru.reference` |
| version | `0.4.0` |
| archive | `ru-ru-reference-0.4.0.lpk` |
| size | 316,616,342 bytes |
| sha256 | `899e0c67a71d165a706afd216817c53b9ee9a56d34a99f1197aeec29a8ea3e14` |
| content license | CC-BY-4.0 |
| built from | commit `70ec683` (`langpack build languages/ru-RU`) |
| gates | `validate`, `lint`, `test`, `audit-curriculum`, `audit-lexicon`, `audit-licenses`: 0 errors / 0 warnings |

## Why 0.4.0

The published 0.3.0 archive still installs fine, but it is three files behind the
source tree: `stories/at-the-market.yaml`, `stories/morning-of-anna.yaml` and
`stories/walk-in-the-forest.yaml` carry story dates in the pre-fix form. Rather
than have the catalog advertise content the repository no longer contains, the
pack is re-versioned and republished from the same commit as the Japanese pack,
so both archives and `catalog/packs.json` describe one tree.

## Coverage

60 goals, 809 units (20 on-ramp, 90 A1, 99 A2, 200 B1, 400 B2), 3,197
activities, 240 assessments (60 per modality: listening and speaking), 4,846
baked listening clips. Cyrillic stress marks are declared in the reading data;
the pack declares no transliteration readings, so the romaji rules added for
Japanese do not apply here.

Pronunciation feedback is guided-only and makes no accuracy claim (ADR-0013).
The app never synthesizes speech, so this archive is the only source of audio
(ADR-0024).

## Install

The app's in-app catalog already points at this archive; no configuration is
needed (ADR-0027). Verify with `langpack inspect ru-ru-reference-0.4.0.lpk` and
`sha256sum` against the value above.

Reviewers: `CONTRIBUTING.md` ("Reviewing language-pack content") and
`languages/ru-RU/review/REVIEWER_KIT.md`. Stress-pair and story-register items
are the highest-value places for a native speaker to look first.
