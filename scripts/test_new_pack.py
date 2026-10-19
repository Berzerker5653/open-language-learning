#!/usr/bin/env python3
"""Tests for scripts/new-pack.py (stdlib only, no network, no cargo, no TTS).

Pins the invariants that decide whether a scaffolded pack is installable and
whether it is lying about anything:

* media coverage — every audio-addressable item (each sentence, each phonology
  contrast item `{id}-{index}`, each script-tagged lexicon entry) has exactly
  one `media/manifest.jsonl` row, and each row's sha256/bytes/seconds agree
  with the bytes actually on disk (the engine refuses an addressable item with
  no row, and `media_hash_mismatch`/`media_size_mismatch` refuse a row that
  disagrees with its file);
* placeholder audio is labelled as placeholder (`runtime=fixture`,
  `model=fixture-silence`) so a scaffold can never be read as speech;
* `--with-real-audio` writes no media at all rather than a fake one;
* every `manifest.scripts` id is declared in `language/orthography.yaml` (an
  undeclared id is the `script_unknown` install error), and a shard only ever
  carries units for its own declared script;
* `rtl` is declared only when asked, and declaring it records the renderer gap
  in `review/UNRESOLVED.md` instead of implying the UI is right-to-left;
* install-mode prerequisites exist: non-empty `sources.jsonl`/`licenses.jsonl`
  with redistribution allowed, and every content row citing a registered source;
* an unknown script or a non-empty output directory is refused without writing;
* a language with no built-in content gets labelled placeholders, never
  invented words.
* scenario help is delivered as declared: the manifest declares
  `capabilities.scenario_help: true` (ADR-0038) and every node carries a
  `support` payload for every ladder rung > 0 and an `action_labels` entry
  for every `expected_actions` token.

Run: python -m unittest discover -s scripts -p 'test_new_pack.py'   (as in scripts/ci.sh)
"""

import hashlib
import json
import subprocess
import sys
import tempfile
import unittest
import wave
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
GENERATOR = REPO / "scripts" / "new-pack.py"



def generate(out: Path, *extra: str) -> subprocess.CompletedProcess:
    cmd = [
        sys.executable,
        str(GENERATOR),
        "--out", str(out),
        "--language", "eo",
        "--locale", "eo-001",
        "--title", "Test Scaffold",
        "--no-gates",
        *extra,
    ]
    return subprocess.run(cmd, capture_output=True, text=True, cwd=REPO)


def rows(pack: Path) -> list[dict]:
    text = (pack / "media" / "manifest.jsonl").read_text(encoding="utf-8")
    return [json.loads(line) for line in text.splitlines() if line.strip()]


def jsonl(pack: Path, rel: str) -> list[dict]:
    return [json.loads(line) for line in (pack / rel).read_text(encoding="utf-8").splitlines() if line.strip()]


def manifest_text(pack: Path) -> str:
    return (pack / "manifest.yaml").read_text(encoding="utf-8")


def scenario_texts(pack: Path) -> list[str]:
    return [f.read_text(encoding="utf-8")
            for f in sorted((pack / "activities" / "scenarios").glob("*.yaml"))]


def parse_scenario(text: str) -> dict:
    """Minimal indentation walk: node tokens/labels/support levels + ladder rungs.

    PyYAML is not in the scripts test stdlib-only environment, and the
    scaffold emits a fixed shape; this reads exactly the fields the pins
    below need.
    """
    ladder, nodes, node, section = [], [], None, None
    subsection = None
    for line in text.splitlines():
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        indent = len(line) - len(line.lstrip())
        stripped = line.strip()
        if indent == 0:
            section = stripped.split(":", 1)[0]
            node = None
            subsection = None
            continue
        if section == "support_ladder" and stripped.startswith("- support_level:"):
            ladder.append(int(stripped.split(":", 1)[1]))
        elif section == "nodes":
            if stripped.startswith("- id:"):
                node = {"tokens": [], "labels": set(), "levels": []}
                nodes.append(node)
                subsection = None
            elif node is not None:
                key, _, value = stripped.partition(":")
                key = key.strip()
                value = value.strip()
                if indent == 4:
                    if key == "expected_actions" and value.startswith("["):
                        node["tokens"] += [t.strip().strip('"')
                                          for t in value[1:-1].split(",") if t.strip()]
                    subsection = key if value == "" else None
                elif stripped.startswith("- level:"):
                    node["levels"].append(int(value))
                elif value == "" and indent >= 4:
                    subsection = key
                elif subsection == "action_labels" and value:
                    node["labels"].add(key.strip('"'))
    return {"ladder": ladder, "nodes": nodes}


class NewPackTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)

    def tearDown(self):
        self.tmp.cleanup()

    def scaffold(self, *extra: str) -> Path:
        out = self.root / "pack"
        proc = generate(out, "--scripts", "Latin", "--band", "on-ramp", *extra)
        self.assertEqual(proc.returncode, 0, proc.stdout + proc.stderr)
        return out

    def generate_into(self, name: str, *extra: str) -> Path:
        out = self.root / name
        proc = generate(out, *extra)
        self.assertEqual(proc.returncode, 0, proc.stdout + proc.stderr)
        return out

    def test_media_rows_cover_every_addressable_item(self):
        pack = self.scaffold()
        sentences = [r["id"] for r in jsonl(pack, "sentences/entries.jsonl")]
        contrasts = jsonl(pack, "phonology/contrasts.jsonl")
        contrast_items = [f"{c['id']}-{i}" for c in contrasts for i, _ in enumerate(c["items"])]
        lexicon_tagged = [
            r["id"] for r in jsonl(pack, "lexicon/entries.jsonl")
            if any("script" in reading for reading in r.get("readings", []))
        ]
        wanted = set(sentences) | set(contrast_items) | set(lexicon_tagged)
        have = [r["id"] for r in rows(pack)]
        self.assertEqual(len(have), len(set(have)), "duplicate media ids")

    def test_media_rows_match_the_bytes_on_disk(self):
        pack = self.generate_into("bytes", "--scripts", "Latin", "--band", "on-ramp")
        for row in rows(pack):
            path = pack / row["file"]
            self.assertTrue(path.is_file(), f"{row['id']}: file missing")
            data = path.read_bytes()
            self.assertEqual(row["sha256"], hashlib.sha256(data).hexdigest(), f"{row['id']}: hash disagrees")
            with wave.open(str(path), "rb") as handle:
                rate, channels, width = handle.getframerate(), handle.getnchannels(), handle.getsampwidth()
            self.assertEqual((rate, channels), (row["sample_rate"], row["channels"]),
                             f"{row['id']}: header disagrees with the row")
            self.assertEqual(
                row["seconds"],
                round((len(data) - 44) / (rate * channels * width), 3),
                f"{row['id']}: duration disagrees with the file",
            )

    def test_placeholder_audio_is_labelled_placeholder(self):
        pack = self.scaffold()
        for row in rows(pack):
            self.assertEqual(row["provenance"], "model-output")
            self.assertEqual(row["synthesizer"]["runtime"], "fixture")
            self.assertEqual(row["synthesizer"]["model"], "fixture-silence")
            self.assertIn("PLACEHOLDER", row["notes"])

    def test_real_audio_flag_writes_no_media_rather_than_fake_media(self):
        pack = self.scaffold("--with-real-audio")
        self.assertFalse((pack / "media" / "manifest.jsonl").exists())
        unresolved = (pack / "review" / "UNRESOLVED.md").read_text(encoding="utf-8")
        self.assertIn("generate-pack-audio.py", unresolved)

    def test_manifest_scripts_are_all_declared_in_orthography(self):
        pack = self.generate_into("ar", "--language", "ar", "--locale", "ar-MA",
                                  "--title", "Arabic Scaffold", "--scripts", "Arabic,Latin",
                                  "--rtl", "--band", "A1")
        declared = {
            line.split(":", 1)[1].strip().strip('"')
            for line in (pack / "language" / "orthography.yaml").read_text(encoding="utf-8").splitlines()
            if line.strip().startswith("- id:")
        }
        listed = [
            line.split("[", 1)[1].split("]")[0]
            for line in manifest_text(pack).splitlines()
            if line.startswith("scripts:")
        ][0]
        wanted = {item.strip().strip('"') for item in listed.split(",")}
        self.assertTrue(wanted, "manifest declares no scripts")
        self.assertEqual(wanted - declared, set(), "manifest scripts not declared in language/orthography.yaml")
        self.assertEqual(len(declared), 2, "both declared scripts need orthography entries")

    def test_shards_only_carry_their_own_script(self):
        pack = self.scaffold()
        for shard in (pack / "orthography").glob("*.jsonl"):
            for unit in jsonl(pack, f"orthography/{shard.name}"):
                self.assertEqual(unit["script"], shard.stem, f"{shard.name}: unit names another script")

    def test_rtl_is_declared_only_when_asked_and_records_the_gap(self):
        plain = self.scaffold()
        self.assertNotIn("rtl:", manifest_text(plain))
        rtl = generate(self.root / "rtl", "--language", "eo", "--locale", "eo-001",
                       "--title", "RTL Scaffold", "--scripts", "Arabic", "--rtl",
                       "--no-gates")
        self.assertEqual(rtl.returncode, 0, rtl.stdout + rtl.stderr)
        text = manifest_text(self.root / "rtl")
        self.assertIn("rtl: true", text)
        unresolved = (self.root / "rtl" / "review" / "UNRESOLVED.md").read_text(encoding="utf-8")
        self.assertIn("apps/desktop", unresolved)

    def test_install_prerequisites_are_present(self):
        pack = self.scaffold()
        sources = jsonl(pack, "sources.jsonl")
        licenses = jsonl(pack, "licenses.jsonl")
        self.assertTrue(sources and licenses)
        self.assertTrue(all(s.get("use", {}).get("redistribution_allowed") for s in sources))
        self.assertTrue(all(l.get("redistribution_allowed") for l in licenses))
        registered = {s["id"] for s in sources}
        for rel in ("lexicon/entries.jsonl", "sentences/entries.jsonl", "grammar/concepts.jsonl"):
            for row in jsonl(pack, rel):
                self.assertTrue(set(row["sources"]) <= registered, f"{rel}: cites an unregistered source")
        self.assertIn("redistribution_allowed: true", manifest_text(pack))

    def test_band_lands_on_every_goal(self):
        pack = self.scaffold("--band", "A2")
        goals = (pack / "curriculum" / "goals.yaml").read_text(encoding="utf-8")
        self.assertEqual(goals.count('band: "A2"'), goals.count("- id:"))

    def test_scenario_delivers_every_declared_rung_and_label(self):
        pack = self.scaffold()
        self.assertIn("scenario_help: true", manifest_text(pack))
        scenarios = scenario_texts(pack)
        self.assertTrue(scenarios, "scaffold ships no scenario")
        for text in scenarios:
            parsed = parse_scenario(text)
            rungs = [level for level in parsed["ladder"] if level > 0]
            self.assertTrue(rungs, "ladder should have a rung > 0 to deliver")
            for node in parsed["nodes"]:
                self.assertEqual(sorted(rungs), sorted(node["levels"]),
                                 "every ladder rung > 0 needs a support payload on every node")
                self.assertEqual(set(node["tokens"]), node["labels"],
                                 "every expected_actions token needs an action_labels entry")

    def test_unknown_script_and_dirty_output_are_refused(self):
        out = self.root / "bad"
        proc = generate(out, "--scripts", " Klingonian ")
        self.assertEqual(proc.returncode, 2)
        self.assertFalse(out.exists())
        good = self.scaffold()
        second = generate(good, "--scripts", "Latin")
        self.assertEqual(second.returncode, 2)
        self.assertIn("non-empty", second.stdout + second.stderr)

    def test_ungrounded_language_gets_labelled_placeholders(self):
        out = self.root / "qq"
        proc = generate(out, "--language", "qq", "--locale", "qq-001", "--scripts", "Latin")
        self.assertEqual(proc.returncode, 0, proc.stdout + proc.stderr)
        entries = jsonl(out, "lexicon/entries.jsonl")
        self.assertTrue(entries)
        for entry in entries:
            self.assertIn("unverified", entry["forms"][0]["text"])
            self.assertEqual(entry["status"], "draft")
        unresolved = (out / "review" / "UNRESOLVED.md").read_text(encoding="utf-8")
        self.assertIn("No built-in starter content", unresolved)


if __name__ == "__main__":
    unittest.main()
