#!/usr/bin/env python3
"""Scaffold a schema-0.2 language pack that passes every langpack gate.

Unlike `langpack init` (a draft skeleton that cannot install), this emits the
inventory an install-mode pack needs — language layers, orthography shards per
declared script, phonology contrasts, curriculum, assessments, a scenario, a
story, non-empty sources/licenses, a reviewer kit — plus honestly-labelled
PLACEHOLDER audio so `langpack test` passes on a fresh checkout with no TTS and
no network.

Nothing here is a linguistic claim: every generated row is `status: draft` or
`review-needed`, and anything the scaffold could not ground is written to
`review/UNRESOLVED.md` for a human.

    python3 scripts/new-pack.py --out examples/eo-community --language eo \
        --locale eo-001 --title "Esperanto Community Starter" \
        --scripts Latin --band on-ramp
"""

from __future__ import annotations

import argparse
import datetime
import hashlib
import json
import subprocess
import sys
import wave
from pathlib import Path

PLACEHOLDER_MODEL_SHA256 = "0" * 64
SAMPLE_RATE = 24000
SECONDS = 0.2

# Declared script metadata: id suffix, direction, and the ranges a pack's
# orthography layer names. Adding a script is authoring, not an engine change
# (`crates/langpack/src/pack.rs` only requires that every manifest script id
# appears in language/orthography.yaml).
SCRIPTS = {
    "latin": {"direction": "ltr", "unicode_blocks": ["U+0041-U+005A", "U+0061-U+007A"]},
    "arabic": {"direction": "rtl", "unicode_blocks": ["U+0600-U+06FF"]},
    "hebrew": {"direction": "rtl", "unicode_blocks": ["U+0590-U+05FF"]},
    "cyrillic": {"direction": "ltr", "unicode_blocks": ["U+0400-U+04FF"]},
    "devanagari": {"direction": "ltr", "unicode_blocks": ["U+0900-U+097F"]},
    "hangul": {"direction": "ltr", "unicode_blocks": ["U+AC00-U+D7AF"]},
    "georgian": {"direction": "ltr", "unicode_blocks": ["U+10A0-U+10FF"]},
    "kana": {"direction": "ltr", "unicode_blocks": ["U+3040-U+309F", "U+30A0-U+30FF"]},
}

RTL_BY_DEFAULT = {"arabic", "hebrew"}

# Built-in starter content. Anything not listed here gets a labelled
# placeholder rather than an invented word.
CONTENT = {
    "eo": {
        "source_locale": "en-US",
        "phrases": [
            ("Saluton.", "Hello."),
            ("Mi nomiĝas Ana.", "My name is Ana."),
            ("Mi lernas Esperanton.", "I am learning Esperanto."),
            ("Kiel vi fartas?", "How are you?"),
        ],
        "words": [
            ("saluton", "hello"),
            ("dankon", "thank you"),
            ("bonvolu", "please"),
            ("akvo", "water"),
            ("kato", "cat"),
            ("hundo", "dog"),
        ],
        "letters": [("a", "a"), ("b", "b"), ("c", "ts"), ("ĉ", "ch")],
        "contrast": {
            "description": "Letter ĉ versus c: /tʃ/ vs /ts/; the circumflex changes the consonant and can change the word.",
            "items": [("ĉapelo", "hat"), ("capelo", "no such word; contrast pair for the letter alone")],
        },
    },
    # Arabic forms here are standard/MSA-flavoured and correctly written in Arabic
    # script. The Moroccan (Darija) variants, vowel quality and register
    # judgements are NOT asserted by this scaffold: they are listed for review.
    "ar": {
        "phrases": [
            ("مرحبا.", "Hello."),
            ("شكرا.", "Thank you."),
            ("كيف حالك؟", "How are you?"),
            ("هذا كتاب.", "This is a book."),
        ],
        "words": [
            ("مرحبا", "hello"),
            ("شكرا", "thank you"),
            ("ماء", "water"),
            ("كتاب", "book"),
            ("بيت", "house"),
            ("قطة", "cat"),
        ],
        "letters_by_script": {
            "arabic": [("ا", "a"), ("ب", "b"), ("ت", "t"), ("ش", "sh")],
            "latin": [("a", "a"), ("b", "b"), ("t", "t"), ("sh", "sh")],
        },
        "contrast": {
            "description": "ت /t/ versus ب /b/: كتاب (kitāb, book) versus كباب (kabāb, kebab) differ by one letter and its dots.",
            "items": [("كتاب", "book"), ("كباب", "kebab")],
        },
    }
}


def yq(value: str) -> str:
    """Quote a YAML scalar defensively."""
    return json.dumps(value, ensure_ascii=False)


class Pack:
    def __init__(self, out: Path, language: str, locale: str, title: str,
                 scripts: list[str], band: str, rtl: bool,
                 source_url: str | None = None):
        self.out = out
        self.lang = language
        self.locale = locale
        self.title = title
        self.scripts = scripts
        self.band = band
        self.rtl = rtl or any(s in RTL_BY_DEFAULT for s in scripts)
        self.content = CONTENT.get(language)
        self.source_url = source_url
        self.unresolved: list[str] = []
        self.date = datetime.date.today().isoformat()

    # ---------- helpers ----------
    def sub(self, rel: str, text: str) -> None:
        path = self.out / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")

    def jline(self, obj: dict) -> str:
        return json.dumps(obj, ensure_ascii=False, separators=(",", ":"))

    def pid(self, kind: str, topic: str) -> str:
        return f"{self.lang}.{kind}.{topic}"

    def generation(self, note: str) -> dict:
        return {
            "method": "ai-assisted",
            "tool": "scripts/new-pack.py",
            "date": self.date,
            "notes": note,
        }

    # ---------- files ----------
    def manifest(self) -> None:
        caps = ["listening: true", "speaking: true", "reading: true", "writing: true",
                # ADR-0038: the scaffold keeps the U07 help promise, so it
                # must declare it (scenario() delivers per-rung payloads and
                # per-token labels to match).
                "scenario_help: true"]
        if self.rtl:
            caps.append("rtl: true")
            self.unresolved.append(
                "`capabilities.rtl: true` is declared, but nothing in apps/desktop reads it today: "
                "the pack installs and validates while the UI still lays out left-to-right. "
                "Renderer direction is an engine gap to report, not something a pack can fix."
            )
        script_ids = ", ".join(yq(self.pid("orth", s)) for s in self.scripts)
        self.sub(
            "manifest.yaml",
            "\n".join(
                [
                    'schema_version: "0.2"',
                    f"pack_id: {yq('org.openlanguage.' + self.lang + '.scaffold')}",
                    f"display_name: {yq(self.title)}",
                    'version: "0.1.0"',
                    f"target_locale: {yq(self.locale)}",
                    'source_locales: ["en-US"]',
                    f"scripts: [{script_ids}]",
                    "engine:",
                    '  min_version: "0.1.0"',
                    "  max_version_exclusive: null",
                    # Unreviewed scaffold content: `community` would claim a review
                    # tier nobody performed, and tools/validate_handoff.py refuses to
                    # authorize trust promotion for a scanned pack that is not
                    # `experimental` (see its pack() check). Promotion is a human call.
                    'maturity: "experimental"',
                    "capabilities:",
                    *(f"  {c}" for c in caps),
                    "license:",
                    '  content_license: "CC-BY-SA-4.0"',
                    "  redistribution_allowed: true",
                    "",
                ]
            ),
        )

    def orthography(self) -> None:
        blocks = []
        for i, s in enumerate(self.scripts):
            meta = SCRIPTS[s]
            blocks += [
                f"  - id: {yq(self.pid('orth', s))}",
                f"    name: {yq(s.capitalize())}",
                f"    direction: {yq(meta['direction'])}",
                f"    unicode_blocks: [{', '.join(yq(b) for b in meta['unicode_blocks'])}]",
                f"    teaching_order: {i}",
            ]
        self.sub("language/orthography.yaml", "\n".join(['schema_version: "0.2"', "scripts:", *blocks, ""]) )

    def phonology(self) -> None:
        segs = ["schema_version: \"0.2\"", "segments:"]
        if self.content:
            for sym in ("a", "k", "s"):
                segs += [f"  - symbol: {yq(sym)}", "    type: consonant" if sym not in "aeiou" else "    type: vowel", "    mode: teach", '    examples: ["placeholder"]']
        else:
            segs += [
                "  - symbol: \"a\"",
                "    type: vowel",
                "    mode: reference-only",
                '    examples: ["unverified"]',
            ]
            self.unresolved.append(
                "language/phonology.yaml carries one placeholder segment. The real segment inventory, "
                "phonotactics and prosody model need a phonologist or a citable reference grammar."
            )
        segs += [
            "phonotactics: []",
            "prosody:",
            f"  - id: {yq(self.pid('phon', 'placeholder'))}",
            '    description: "Scaffold placeholder: no prosody model has been researched yet. '
            'Reference comparison only; never graded."',
            "    mode: reference-only",
            '    orthographic_cues: ["none recorded"]',
            "",
        ]
        self.sub("language/phonology.yaml", "\n".join(segs))
        self.unresolved.append(
            "language/phonology.yaml is a scaffold: the segment inventory, phonotactics and prosody "
            "model are unresearched and the example strings are not evidence of a phoneme."
        )

    def orthography_units(self) -> list[dict]:
        rows: list[dict] = []
        for script in self.scripts:
            if self.content:
                letters = self.content.get("letters_by_script", {}).get(script) or (
                    self.content["letters"] if script == self.scripts[0] else []
                )
            else:
                letters = [("<unverified>", "<unverified reading>")] if script == self.scripts[0] else []
            for i, (symbol, reading) in enumerate(letters):
                rows.append(
                    {
                        "id": self.pid("orth", f"{script}-{i:02d}"),
                        "status": "review-needed",
                        "script": script,
                        "symbol": symbol,
                        "reading": reading,
                        "mnemonic": "Scaffold mnemonic placeholder — replace with a taught memory hook.",
                        "teaching_order": i,
                        "sources": [self.pid("src", "ai-drafted-scaffold")],
                        "generation": self.generation("scaffold placeholder symbol; needs human review"),
                    }
                )
            self.sub(
                f"orthography/{script}.jsonl",
                "".join(self.jline(r) + "\n" for r in rows if r["script"] == script),
            )
        return rows

    def lexicon(self) -> list[dict]:
        words = self.content["words"] if self.content else [("<unverified>", "<unverified gloss>")]
        rows = []
        for i, (form, gloss) in enumerate(words):
            rows.append(
                {
                    "id": self.pid("lex", f"scaffold-{i:02d}"),
                    "status": "draft",
                    "forms": [{"text": form, "is_primary": True}],
                    "readings": [{"text": form, "script": self.scripts[0]}],
                    "glosses": {"en-US": [gloss]},
                    "sources": [self.pid("src", "ai-drafted-scaffold")],
                    "generation": self.generation("scaffold word; unverified unless the language has built-in content"),
                }
            )
        self.sub("lexicon/entries.jsonl", "".join(self.jline(r) + "\n" for r in rows))
        if not self.content:
            self.unresolved.append("lexicon/entries.jsonl holds one placeholder entry: real lexical content, "
                                   "its source and its licence are the author's job.")
        return rows

    def sentences(self) -> list[dict]:
        phrases = self.content["phrases"] if self.content else [("<unverified>", "<unverified gloss>")]
        rows = []
        for i, (text, gloss) in enumerate(phrases):
            rows.append(
                {
                    "id": self.pid("sent", f"scaffold-{i:02d}"),
                    "status": "review-needed",
                    "text": text,
                    "gloss": gloss,
                    "cloze_targets": [text.split(".")[0][:12]],
                    "sources": [self.pid("src", "ai-drafted-scaffold")],
                    "generation": self.generation("scaffold sentence; audio is placeholder"),
                }
            )
        self.sub("sentences/entries.jsonl", "".join(self.jline(r) + "\n" for r in rows))
        return rows

    def contrasts(self) -> list[dict]:
        c = self.content["contrast"] if self.content else {
            "description": "Scaffold contrast: no minimal pair researched yet.",
            "items": [("<unverified>", "unverified"), ("<unverified>", "unverified")],
        }
        row = {
            "id": self.pid("contrast", "scaffold"),
            "status": "review-needed",
            "feature_id": self.pid("phon", "placeholder"),
            "items": [{"text": t, "gloss": g} for t, g in c["items"]],
            "description": c["description"],
            "sources": [self.pid("src", "ai-drafted-scaffold")],
            "notes": "Each item's audio is placeholder silence (media/manifest.jsonl records runtime=fixture).",
            "generation": self.generation("scaffold contrast pair"),
        }
        self.sub("phonology/contrasts.jsonl", self.jline(row) + "\n")
        return [row]

    def grammar(self) -> list[str]:
        row = {
            "id": self.pid("grammar", "scaffold"),
            "name": "Scaffold concept",
            "category": "pragmatics",
            "status": "draft",
            "definition": "Scaffold placeholder concept: replace with a researched rule and its source.",
            "sources": [self.pid("src", "ai-drafted-scaffold")],
            "generation": self.generation("scaffold concept"),
        }
        self.sub("grammar/concepts.jsonl", self.jline(row) + "\n")
        return [row["id"]]

    def curriculum(self, lex: list[dict], concepts: list[str]) -> tuple[list[dict], list[dict]]:
        goals = [
            {
                "id": self.pid("goal", "scaffold-greet"),
                "description": "Use the scaffold greetings in a first contact",
                "band": self.band,
                "modalities": ["reading", "writing"],
                "prerequisites": [
                    {
                        "target": lex[0]["id"],
                        "dimension": "recall-meaning",
                        "required_state": "independent",
                        "strength": "hard",
                    }
                ],
                "required_concepts": concepts,
                "assessment_ids": [self.pid("assess", "scaffold-greet")],
                "transfer_required": True,
                "sources": [self.pid("src", "ai-drafted-scaffold")],
                "review_status": "draft",
            }
        ]
        lines = ["goals:"]
        for g in goals:
            lines += [
                f"  - id: {yq(g['id'])}",
                f"    description: {yq(g['description'])}",
                f"    band: {yq(g['band'])}",
                f"    modalities: [{', '.join(yq(m) for m in g['modalities'])}]",
                "    prerequisites:",
                f"      - target: {yq(g['prerequisites'][0]['target'])}",
                "        dimension: \"recall-meaning\"",
                "        required_state: \"independent\"",
                "        strength: \"hard\"",
                f"    required_concepts: [{', '.join(yq(c) for c in g['required_concepts'])}]",
                f"    assessment_ids: [{', '.join(yq(a) for a in g['assessment_ids'])}]",
                f"    transfer_required: {str(g['transfer_required']).lower()}",
                f"    sources: [{', '.join(yq(s) for s in g['sources'])}]",
                f"    review_status: {yq(g['review_status'])}",
            ]
        self.sub("curriculum/goals.yaml", "\n".join(lines) + "\n")

        units = [
            {
                "id": self.pid("unit", "scaffold-first-contact"),
                "goal_id": goals[0]["id"],
                "title": "First contact",
                "estimated_minutes": 5,
                "activities": [
                    {"id": self.pid("activity", "sc-encounter"), "type": "encounter-read",
                     "modality": "reading", "support_level": 0, "content_refs": [lex[0]["id"]]},
                    {"id": self.pid("activity", "sc-recall"), "type": "recall",
                     "modality": "reading", "support_level": 0, "content_refs": [lex[0]["id"]]},
                    {"id": self.pid("activity", "sc-produce"), "type": "produce",
                     "modality": "writing", "support_level": 1, "content_refs": [lex[0]["id"]]},
                ],
            }
        ]
        for u in units:
            lines = [
                f"id: {yq(u['id'])}",
                f"goal_id: {yq(u['goal_id'])}",
                f"title: {yq(u['title'])}",
                f"estimated_minutes: {u['estimated_minutes']}",
                "activities:",
            ]
            for a in u["activities"]:
                lines += [
                    f"  - id: {yq(a['id'])}",
                    f"    type: {yq(a['type'])}",
                    f"    modality: {yq(a['modality'])}",
                    f"    support_level: {a['support_level']}",
                    f"    content_refs: [{', '.join(yq(r) for r in a['content_refs'])}]",
                ]
            self.sub(f"curriculum/units/{u['id'].split('.')[-1]}.yaml", "\n".join(lines) + "\n")
        return goals, units

    def assessments(self, goals: list[dict]) -> None:
        rows = [
            {
                "id": g["assessment_ids"][0],
                "goal_id": g["id"],
                "kind": "recall",
                "modality": "reading",
                "rubric": {"scale": "observed", "criteria": ["item matched to meaning"]},
                "review_status": "draft",
            }
            for g in goals
        ]
        self.sub("assessments/definitions.jsonl", "".join(self.jline(r) + "\n" for r in rows))

    def scenario(self, goals: list[dict]) -> None:
        g = goals[0]
        self.sub(
            "activities/scenarios/scaffold-first-contact.yaml",
            "\n".join(
                [
                    f"id: {yq(self.pid('scenario', 'scaffold-first-contact'))}",
                    f"goal_id: {yq(g['id'])}",
                    'title: "First contact"',
                    'situation: "Meeting someone for the first time"',
                    'register: "neutral"',
                    "nodes:",
                    f"  - id: {yq(self.pid('activity', 'scn.open'))}",
                    '    prompt: "Greet the other person."',
                    '    expected_actions: ["greeting"]',
                    "    action_labels:",
                    '      greeting: "Greet the other person"',
                    "    support:",
                    "      - level: 3",
                    "        kind: hint",
                    '        text: "Think of a friendly greeting you already know."',
                    f"    next: [{yq(self.pid('activity', 'scn.ask'))}]",
                    f"  - id: {yq(self.pid('activity', 'scn.ask'))}",
                    '    prompt: "Say what you are doing: learning this language."',
                    '    expected_actions: ["self-description"]',
                    "    action_labels:",
                    '      self-description: "Say you are learning the language"',
                    "    support:",
                    "      - level: 3",
                    "        kind: hint",
                    '        text: "Say that you are learning this language."',
                    "    next: []",
                    "support_ladder:",
                    "  - support_level: 0",
                    '    description: "No supports"',
                    "  - support_level: 3",
                    '    description: "Word bank",',
                    "transfer_variants_required: 1",
                    "transfer_variants:",
                    f"  - id: {yq(self.pid('scenario', 'scaffold-first-contact.formal'))}",
                    '    description: "Same contact in a formal setting"',
                    '    changed_variable: "register"',
                    "",
                ]
            ).replace('"Word bank",', '"Word bank"'),
        )

    def story(self, sentences: list[dict]) -> None:
        self.sub(
            "stories/scaffold.yaml",
            "\n".join(
                [
                    f"id: {yq(self.pid('story', 'scaffold'))}",
                    'status: "review-needed"',
                    'title: "Scaffold story"',
                    'description: "The scaffold sentences, read in order."',
                    "sentences:",
                    *(f"  - {yq(s['id'])}" for s in sentences[:3]),
                    f"sources: [{yq(self.pid('src', 'ai-drafted-scaffold'))}]",
                    "generation:",
                    "  method: ai-assisted",
                    "  tool: scripts/new-pack.py",
                    f'  date: "{self.date}"',
                    "",
                ]
            ),
        )

    def inventories(self) -> None:
        src = {
            "id": self.pid("src", "ai-drafted-scaffold"),
            "title": f"AI-scaffolded starter content for {self.title} (this pack)",
            "license": {"spdx": "CC-BY-SA-4.0", "text_url": "https://creativecommons.org/licenses/by-sa/4.0/"},
            "access": {"mode": "public"},
            "use": {
                "redistribution_allowed": True,
                "attribution_required": True,
                "attribution_text": f"{self.title} scaffold content, CC BY-SA 4.0, pending human review",
            },
            "retrieved": self.date,
        }
        if self.source_url:
            src["url"] = self.source_url
        self.sub("sources.jsonl", self.jline(src) + "\n")
        self.unresolved.append(
            "The only registered source is this pack's own scaffold content, which has no locator. "
            "docs/10 expects a URL/DOI per source: replace it with the real reference sources "
            "(grammar, dictionary, frequency list) and their licences before release."
        )
        lic = {
            "id": "lic-scaffold-content",
            "scope": {"kind": "derived-from-source", "source_id": src["id"]},
            "license": {"spdx": "CC-BY-SA-4.0"},
            "redistribution_allowed": True,
            "attribution": f"{self.title} scaffold content, CC BY-SA 4.0, unreviewed",
        }
        audio_lic = {
            "id": "lic-placeholder-audio",
            "scope": {"kind": "model-output", "path_glob": "media/*.wav"},
            "license": {
                "spdx": "Apache-2.0",
                "notes": "placeholder audio: media/manifest.jsonl records synthesizer.runtime=fixture, "
                "model=fixture-silence, model_sha256=" + PLACEHOLDER_MODEL_SHA256 +
                " (generated silence, 24 kHz mono, bytes equal seconds*24000*2). No model runs in CI and nothing here is speech.",
            },
            "redistribution_allowed": True,
            "attribution": "project-generated placeholder audio",
        }
        self.sub("licenses.jsonl", "".join(self.jline(r) + "\n" for r in (lic, audio_lic)))

    def audio(self, sentences: list[dict], lex: list[dict], contrasts: list[dict]) -> int:
        """Placeholder silence for every audio-addressable item.

        The addressable set is exactly what `scripts/generate-pack-audio.py`
        enumerates: every sentence, every contrast item (`{id}-{index}`), and
        every script-tagged lexicon entry.
        """
        targets = [(s["id"], s["text"]) for s in sentences]
        for row in contrasts:
            for i, item in enumerate(row["items"]):
                targets.append((f"{row['id']}-{i}", item["text"]))
        targets += [(e["id"], e["forms"][0]["text"]) for e in lex]
        rows = []
        for item_id, text in targets:
            rel = f"media/{item_id}.wav"
            path = self.out / rel
            path.parent.mkdir(parents=True, exist_ok=True)
            frames = int(SECONDS * SAMPLE_RATE)
            with wave.open(str(path), "wb") as w:
                w.setnchannels(1)
                w.setsampwidth(2)
                w.setframerate(SAMPLE_RATE)
                w.writeframes(b"\x00\x00" * frames)
            data = path.read_bytes()
            rows.append(
                {
                    "id": item_id,
                    "file": rel,
                    "sha256": hashlib.sha256(data).hexdigest(),
                    "bytes": len(data),
                    "sample_rate": SAMPLE_RATE,
                    "channels": 1,
                    "seconds": round((len(data) - 44) / (SAMPLE_RATE * 2), 3),
                    "provenance": "model-output",
                    "synthesizer": {
                        "runtime": "fixture",
                        "model": "fixture-silence",
                        "model_sha256": PLACEHOLDER_MODEL_SHA256,
                        "voice": "fixture",
                    },
                    "text": text,
                    "generated": self.date,
                    "notes": "PLACEHOLDER silence, not speech: replace with scripts/generate-pack-audio.py before any release",
                }
            )
        self.sub("media/manifest.jsonl", "".join(self.jline(r) + "\n" for r in rows))
        return len(rows)

    def review_kit(self) -> None:
        self.sub(
            "review/REVIEW_POLICY.yaml",
            "\n".join(
                [
                    "schema_version: \"0.2\"",
                    "policy:",
                    "  - kind: lexicon",
                    "    required_reviewer: \"native speaker of the target variety\"",
                    "    blocks: [\"install\"]",
                    "  - kind: sentences",
                    "    required_reviewer: \"native speaker of the target variety\"",
                    "    blocks: [\"install\"]",
                    "  - kind: phonology",
                    "    required_reviewer: \"phonologist or citable reference grammar\"",
                    "    blocks: [\"band-claim\"]",
                    "",
                ]
            ),
        )
        self.sub(
            "review/REVIEWER_KIT.md",
            f"# Reviewer kit — {self.title}\n\n"
            "Every row in this pack is scaffold output. Review order:\n\n"
            "1. `language/phonology.yaml` and `phonology/contrasts.jsonl` — segments and the contrast pair.\n"
            f"2. `lexicon/entries.jsonl` and `sentences/entries.jsonl` — forms, glosses, register.\n"
            f"3. `orthography/{self.scripts[0]}.jsonl` — symbols, readings, mnemonics.\n"
            "4. `curriculum/` — is the goal worth teaching, and do the activities measure it?\n\n"
            "Approve by writing a `reviews.jsonl` record naming the reviewer and the date. "
            "The author model cannot write that record for its own content (REVIEW-001).\n",
        )
        self.sub("tests/README.md", f"# Test plan — {self.title}\n\n"
                 "Conformance only: this pack exists to prove a new language can be authored without engine edits.\n"
                 "Gate order and commands: `docs/QUICKSTART_PACK_AUTHORING.md` §3-4.\n"
                 "Placeholder audio rows must be replaced (or the pack kept out of release) before any learner uses it.\n")

    def unresolved_file(self) -> None:
        header = (
            f"# Unresolved questions — {self.title}\n\n"
            "Written by `scripts/new-pack.py`. Every item below is a claim the scaffold could not ground; "
            "none of it may be resolved by the author model.\n\n"
        )
        body = "".join(f"- {u}\n" for u in dict.fromkeys(self.unresolved))
        self.sub("review/UNRESOLVED.md", header + body)

    def run_gates(self) -> int:
        gates = ["validate", "lint", "audit-curriculum", "audit-lexicon",
                 "audit-licenses", "audit-sources", "test"]
        root = Path.cwd()
        while root != root.parent and not (root / "Cargo.toml").exists():
            root = root.parent
        failures = 0
        for g in gates:
            proc = subprocess.run(
                ["cargo", "run", "-q", "-p", "lts-langpack-cli", "--", g, str(self.out)],
                cwd=root, capture_output=True, text=True,
            )
            out = (proc.stdout + proc.stderr).strip().splitlines()
            tail = out[-1] if out else "(no output)"
            print(f"{g:16s} exit={proc.returncode}  {tail}")
            if proc.returncode != 0:
                failures += 1
                for line in out[:20]:
                    print(f"    {line}")
        return failures


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--out", required=True, type=Path)
    ap.add_argument("--language", required=True, help="iso639-1 tag, also the id prefix")
    ap.add_argument("--locale", required=True, help="BCP-47 target locale")
    ap.add_argument("--title", required=True)
    ap.add_argument("--scripts", required=True, help="comma-separated script names (e.g. Latin,Arabic)")
    ap.add_argument("--rtl", action="store_true", help="declare the rtl capability honestly")
    ap.add_argument("--band", default="on-ramp",
                    choices=["on-ramp", "A1", "A2", "B1", "B2", "C1", "C2"])
    ap.add_argument("--with-real-audio", action="store_true",
                    help="print the real bake command instead of writing placeholder audio")
    ap.add_argument("--no-gates", action="store_true", help="skip running the seven gates")
    ap.add_argument("--source-url", default=None,
                    help="locator for the scaffold source record (docs/10 wants one per source)")
    args = ap.parse_args()

    scripts = [s.strip().lower() for s in args.scripts.split(",") if s.strip()]
    unknown = [s for s in scripts if s not in SCRIPTS]
    if unknown:
        print(f"unknown script(s): {', '.join(unknown)}; known: {', '.join(sorted(SCRIPTS))}", file=sys.stderr)
        return 2
    if args.out.exists() and any(args.out.iterdir()):
        print(f"refusing to write into a non-empty directory: {args.out}", file=sys.stderr)
        return 2

    pack = Pack(args.out, args.language, args.locale, args.title, scripts, args.band, args.rtl,
                args.source_url)
    if not pack.content:
        pack.unresolved.append(
            f"No built-in starter content for '{args.language}': every form, gloss, segment and contrast "
            "row is a labelled placeholder. Real content, its sources and its licences must come from the author."
        )

    pack.manifest()
    units = pack.orthography_units()
    lex = pack.lexicon()
    sents = pack.sentences()
    contrasts = pack.contrasts()
    concepts = pack.grammar()
    goals, _ = pack.curriculum(lex, concepts)
    pack.assessments(goals)
    pack.scenario(goals)
    pack.story(sents)
    pack.inventories()
    pack.orthography()
    pack.phonology()
    pack.review_kit()

    if args.with_real_audio:
        pack.unresolved.append(
            "No audio was written. Bake before any install-mode gate: "
            f"scripts/generate-pack-audio.py --pack {args.out} --language {args.language}"
        )
        rows = 0
    else:
        rows = pack.audio(sents, lex, contrasts)
        print(f"placeholder audio: {rows} rows, all runtime=fixture / model=fixture-silence (silence, not speech)")
    pack.unresolved_file()

    print(f"scaffolded {args.out}: {len(sents)} sentences, {len(lex)} lexicon entries, "
          f"{len(units)} orthography symbols, scripts={','.join(scripts)}, band={args.band}, rtl={pack.rtl}")
    print("every row is draft/review-needed; open review/UNRESOLVED.md")

    if args.no_gates:
        return 0
    return 1 if pack.run_gates() else 0


if __name__ == "__main__":
    sys.exit(main())
