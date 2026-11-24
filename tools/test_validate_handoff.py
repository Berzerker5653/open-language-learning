"""Mutation tests for scaffold assurance, not product/language correctness.

Pack reference resolution and install conformance are the langpack CLI's
job (cargo tests); this suite covers strict parsing, manifest/record
schema preflight, and roadmap/task-state consistency.
"""
import atexit
import importlib.util
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

import yaml

SPEC = importlib.util.spec_from_file_location("validate_handoff", Path(__file__).with_name("validate_handoff.py"))
validator = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(validator)
ROOT = Path(__file__).resolve().parents[1]

# A working checkout carries generated bulk the validator never reads: pack
# .wav bytes (gitignored; ADR-0016, restorable with
# scripts/fetch-pack-audio.sh), the pack-audio work dir, build output and
# .git. Re-copying ~1.5 GB per case turned this suite into a multi-minute
# crawl; the baseline below is built ONCE per test run and overlaid per case.
IGNORE = shutil.ignore_patterns(
    "__pycache__",
    ".venv",
    "target",
    "node_modules",
    ".git",
    "tmp",
    "dist",
    "build",
    "*.wav",
)

_BASELINE_DIR = None
_BASELINE_PATH = None


def _baseline():
    """Build the repo baseline once per test run."""
    global _BASELINE_DIR, _BASELINE_PATH
    if _BASELINE_PATH is not None:
        return _BASELINE_PATH
    _BASELINE_DIR = Path(tempfile.mkdtemp(prefix="lts-mutation-baseline-"))
    baseline = _BASELINE_DIR / "handoff"
    shutil.copytree(ROOT, baseline, ignore=IGNORE)
    _BASELINE_PATH = baseline

    def _cleanup():
        shutil.rmtree(_BASELINE_DIR, ignore_errors=True)

    atexit.register(_cleanup)
    return _BASELINE_PATH


def _overlay():
    """Per-case overlay of the pristine baseline.

    Reflink copy (`cp --reflink=auto`) is near-instant on btrfs/xfs; on
    filesystems without CoW the flag is ignored and cp degrades to a plain
    copy - same semantics as the original per-case copytree, never wrong.
    """
    parent = Path(tempfile.mkdtemp(prefix="lts-mutation-case-"))
    subprocess.run(["cp", "-r", "--reflink=auto", str(_baseline()),
                    str(parent / "handoff")], check=True)
    return parent


class HandoffMutationTests(unittest.TestCase):
    def setUp(self):
        self._parent = _overlay()
        self.addCleanup(shutil.rmtree, self._parent, True)
        self.root = self._parent / "handoff"
        self.pack = self.root / "languages/ja-JP"

    def audit(self, release=False):
        return validator.Audit(self.root, release).run()

    def edit_yaml(self, name, edit):
        path = self.root / name
        value = yaml.safe_load(path.read_text())
        edit(value)
        path.write_text(yaml.safe_dump(value, allow_unicode=True, sort_keys=False))

    def edit_state(self, edit):
        path = self.root / "state/task-state.json"
        value = json.loads(path.read_text())
        edit(value)
        path.write_text(json.dumps(value))

    def fails_with(self, phrase):
        errors = self.audit().errors
        self.assertTrue(any(phrase in e for e in errors), errors)

    def test_baseline_passes_with_explicit_scope_warnings(self):
        audit = self.audit()
        self.assertEqual(audit.errors, [])
        self.assertTrue(any("remain unverified" in w for w in audit.warnings))

    def test_strict_data_preflight_blocks_experimental_seed(self):
        audit = self.audit(release=True)
        self.assertTrue(any("pack is experimental/unreviewed" in e for e in audit.errors))

    def test_duplicate_yaml_key_fails(self):
        with (self.pack / "manifest.yaml").open("a") as f:
            f.write('\nversion: "8.0.0"\n')
        self.fails_with("duplicate YAML key")

    def test_duplicate_json_key_fails(self):
        (self.root / "state/task-state.json").write_text('{"tasks": {}, "tasks": {}}')
        self.fails_with("duplicate JSON key")

    def test_corrupt_jsonl_fails(self):
        (self.pack / "lexicon/entries.jsonl").write_text("{not json}\n")
        self.fails_with("lexicon/entries.jsonl")

    def test_duplicate_jsonl_key_fails(self):
        (self.pack / "lexicon/entries.jsonl").write_text('{"id":"a","id":"b"}\n')
        self.fails_with("duplicate JSON key")

    def test_nonfinite_json_fails(self):
        (self.root / "state/task-state.json").write_text('{"value":NaN}')
        self.fails_with("non-JSON numeric")

    def test_yaml_aliases_rejected(self):
        (self.pack / "curriculum/units/000-onramp-greeting.yaml").write_text("a: &a [value]\nb: *a\n")
        self.fails_with("aliases/merge")

    def test_bare_date_rejected(self):
        (self.pack / "curriculum/units/000-onramp-greeting.yaml").write_text("id: ja.unit.x\nestimated_minutes: 2026-10-04\n")
        self.fails_with("Object of type date")

    def test_missing_required_pack_file_fails(self):
        (self.pack / "sources.jsonl").unlink()
        self.fails_with("sources.jsonl")

    def test_missing_license_file_fails(self):
        (self.pack / "licenses.jsonl").unlink()
        self.fails_with("licenses.jsonl")

    def test_invalid_lexicon_record_fails(self):
        (self.pack / "lexicon/entries.jsonl").write_text('{"id":"ja.lex.demo.broken"}\n')
        self.fails_with("required property")

    def test_goal_review_status_required(self):
        self.edit_yaml("languages/ja-JP/curriculum/goals.yaml", lambda v: v["goals"][0].pop("review_status"))
        self.fails_with("review_status")

    def test_pack_path_traversal_fails(self):
        self.edit_yaml("languages/ja-JP/manifest.yaml", lambda v: v["license"].update(license_file="../../README.md"))
        self.fails_with("unsafe relative path")

    def test_valid_semver_combination_passes(self):
        self.edit_yaml("languages/ja-JP/manifest.yaml", lambda v: v.update(version="0.0.2-alpha+build.1"))
        self.assertEqual(self.audit().errors, [])

    def test_invalid_semver_leading_zero_fails(self):
        self.edit_yaml("languages/ja-JP/manifest.yaml", lambda v: v.update(version="01.0.0"))
        self.fails_with("version")

    def test_invalid_engine_version_fails(self):
        self.edit_yaml("languages/ja-JP/manifest.yaml", lambda v: v["engine"].update(min_version="potato"))
        self.fails_with("min_version")

    def test_reversed_engine_range_fails(self):
        self.edit_yaml("languages/ja-JP/manifest.yaml", lambda v: v["engine"].update(max_version_exclusive="0.0.1"))
        self.fails_with("range is empty/reversed")

    def test_unsupported_schema_version_fails(self):
        self.edit_yaml("languages/ja-JP/manifest.yaml", lambda v: v.update(schema_version="9.9"))
        self.fails_with("schema_version")

    def test_false_trust_promotion_fails(self):
        self.edit_yaml("languages/ja-JP/manifest.yaml", lambda v: v.update(maturity="reference"))
        self.fails_with("cannot authorize trust promotion")

    def test_invalid_locale_fails(self):
        self.edit_yaml("languages/ja-JP/manifest.yaml", lambda v: v.update(target_locale="@!"))
        self.fails_with("target_locale")

    def test_missing_required_schema_fails(self):
        (self.root / "schemas/v0.2/unit.schema.json").unlink()
        self.fails_with("missing unit.schema.json")

    def test_roadmap_cycle_fails(self):
        self.edit_yaml("tasks/ROADMAP.yaml", lambda v: next(t for t in v["tasks"] if t["id"] == "BOOT-001")["dependencies"].append("BOOT-002"))
        self.fails_with("prerequisite cycle")

    def test_unknown_roadmap_dependency_fails(self):
        self.edit_yaml("tasks/ROADMAP.yaml", lambda v: v["tasks"][0]["dependencies"].append("MISSING"))
        self.fails_with("unknown prerequisite")

    def test_missing_read_first_fails(self):
        self.edit_yaml("tasks/ROADMAP.yaml", lambda v: v["tasks"][0]["read_first"].append("missing.md"))
        self.fails_with("missing/unsafe file")

    def test_read_first_traversal_fails(self):
        self.edit_yaml("tasks/ROADMAP.yaml", lambda v: v["tasks"][0]["read_first"].append("../README.md"))
        self.fails_with("unsafe relative path")

    def test_required_flag_must_be_boolean(self):
        self.edit_yaml("tasks/ROADMAP.yaml", lambda v: v["tasks"][0].update(required_for_desktop_1_0="true"))
        self.fails_with("must be boolean")

    def test_optional_scope_must_match_flags(self):
        self.edit_yaml("tasks/ROADMAP.yaml", lambda v: v["execution_scope"]["optional_tasks"].append("BOOT-001"))
        self.fails_with("policy mismatch")

    def test_required_task_must_gate_release(self):
        self.edit_yaml("tasks/ROADMAP.yaml", lambda v: v["tasks"].append({"id":"ORPHAN","milestone":"M10","priority":"P1","title":"orphan","dependencies":[],"read_first":[],"acceptance":["must complete"],"required_for_desktop_1_0":True}))
        self.fails_with("not gated by REL-001")

    def test_malformed_data_shapes_fail_cleanly(self):
        self.edit_yaml("tasks/ROADMAP.yaml", lambda v: v.update(tasks={}))
        self.fails_with("expected an array")

    def test_invalid_task_state_status_fails(self):
        self.edit_state(lambda v: v["tasks"]["BOOT-001"].update(status="banana"))
        self.fails_with("invalid status")

    def test_unknown_task_state_id_fails(self):
        self.edit_state(lambda v: v["tasks"].update(MISSING={"status":"ready","attempts":0}))
        self.fails_with("unknown task")

    def test_ready_task_requires_done_dependencies(self):
        # ADV-001 depends on REL-001, which stays incomplete until the release
        # gate; a task whose own dependencies are complete would not trigger.
        self.edit_state(lambda v: v["tasks"].update({"ADV-001":{"status":"ready","attempts":0}}))
        self.fails_with("incomplete prerequisite")

    def test_done_requires_evidence(self):
        self.edit_state(lambda v: v["tasks"]["BOOT-001"].update(status="done", evidence=[]))
        self.fails_with("needs recorded evidence")

    def test_done_evidence_must_exist(self):
        self.edit_state(lambda v: v["tasks"]["BOOT-001"].update(status="done", evidence=["state/evidence/missing.txt"]))
        self.fails_with("missing/unsafe file")

    def test_active_task_consistency(self):
        self.edit_state(lambda v: v.update(active_task="BOOT-001"))
        self.fails_with("active_task must identify")

    def test_updated_must_be_iso_date(self):
        self.edit_state(lambda v: v.update(updated="yesterday"))
        self.fails_with("ISO calendar date")


if __name__ == "__main__":
    unittest.main()
