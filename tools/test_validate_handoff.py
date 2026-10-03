"""Mutation tests for scaffold assurance, not product/language correctness."""
import importlib.util
import json
from pathlib import Path
import shutil
import tempfile
import unittest

import yaml

SPEC = importlib.util.spec_from_file_location("validate_handoff", Path(__file__).with_name("validate_handoff.py"))
validator = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(validator)
ROOT = Path(__file__).resolve().parents[1]


class HandoffMutationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name) / "handoff"
        shutil.copytree(ROOT, self.root, ignore=shutil.ignore_patterns("__pycache__", ".venv", "target", "node_modules"))
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
        self.assertTrue(any("unresolved draft assessment" in w for w in audit.warnings))
        self.assertTrue(any("remain unverified" in w for w in audit.warnings))

    def test_strict_data_preflight_blocks_seed(self):
        audit = self.audit(release=True)
        self.assertTrue(any("unknown assessment" in e for e in audit.errors))
        self.assertTrue(any("not reviewed" in e for e in audit.errors))

    def test_duplicate_yaml_key_fails(self):
        with (self.pack / "manifest.yaml").open("a") as f:
            f.write('\nversion: "8.0.0"\n')
        self.fails_with("duplicate YAML key")

    def test_duplicate_json_key_fails(self):
        (self.root / "state/task-state.json").write_text('{"tasks": {}, "tasks": {}}')
        self.fails_with("duplicate JSON key")

    def test_corrupt_jsonl_fails(self):
        (self.pack / "lexicon/vocabulary.jsonl").write_text("{not json}\n")
        self.fails_with("lexicon/vocabulary.jsonl")

    def test_duplicate_jsonl_id_fails(self):
        path = self.pack / "lexicon/vocabulary.jsonl"
        path.write_text(path.read_text() * 2)
        self.fails_with("duplicate ID")

    def test_duplicate_jsonl_key_fails(self):
        (self.pack / "lexicon/vocabulary.jsonl").write_text('{"id":"a","id":"b"}\n')
        self.fails_with("duplicate JSON key")

    def test_nonfinite_json_fails(self):
        (self.root / "state/task-state.json").write_text('{"value":NaN}')
        self.fails_with("non-JSON numeric")

    def test_unknown_source_fails(self):
        self.edit_yaml("languages/ja-JP/curriculum/goals.yaml", lambda v: v[0]["sources"].append("missing"))
        self.fails_with("sources references unknown")

    def test_unknown_concept_fails(self):
        self.edit_yaml("languages/ja-JP/curriculum/goals.yaml", lambda v: v[0]["required_concepts"].append("missing"))
        self.fails_with("required_concepts references unknown")

    def test_new_unknown_assessment_cannot_be_allowlisted(self):
        self.edit_yaml("languages/ja-JP/manifest.yaml", lambda v: v["unresolved_references"].append({"kind":"assessment","owner_id":"ja.goal.onramp.respond-to-greeting","target_id":"missing","reason":"Invented allowance must not silently pass"}))
        self.edit_yaml("languages/ja-JP/curriculum/goals.yaml", lambda v: v[0]["assessment_ids"].append("missing"))
        self.fails_with("unknown assessment missing")

    def test_stale_draft_exception_fails(self):
        (self.pack / "curriculum/assessments").mkdir()
        (self.pack / "curriculum/assessments/greeting.yaml").write_text('id: ja.assess.onramp.greeting-transfer\n')
        self.fails_with("stale/unsupported")

    def test_missing_license_file_fails(self):
        (self.pack / "LICENSES.yaml").unlink()
        self.fails_with("LICENSES.yaml")

    def test_pack_path_traversal_fails(self):
        self.edit_yaml("languages/ja-JP/manifest.yaml", lambda v: v["license"].update(license_file="../../README.md"))
        self.fails_with("unsafe relative path")

    def test_unknown_scenario_fails(self):
        self.edit_yaml("languages/ja-JP/curriculum/units/000-onramp-greeting.yaml", lambda v: v["activities"][-1].update(scenario_id="missing"))
        self.fails_with("unknown scenario")

    def test_duplicate_activity_id_fails(self):
        self.edit_yaml("languages/ja-JP/curriculum/units/000-onramp-greeting.yaml", lambda v: v["activities"][1].update(id=v["activities"][0]["id"]))
        self.fails_with("duplicate activity ID")

    def test_goal_review_status_required(self):
        self.edit_yaml("languages/ja-JP/curriculum/goals.yaml", lambda v: v[0].pop("review_status"))
        self.fails_with("review_status")

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

    def test_automatic_feature_requires_calibration(self):
        self.edit_yaml("languages/ja-JP/speech/profile.yaml", lambda v: v["features"][0].update(mode="assess-automatic"))
        self.fails_with("calibration")

    def test_speech_variant_must_exist(self):
        self.edit_yaml("languages/ja-JP/speech/profile.yaml", lambda v: v.update(reference_variant="missing"))
        self.fails_with("reference variant")

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

    def test_active_task_consistency(self):
        self.edit_state(lambda v: v.update(active_task="BOOT-001"))
        self.fails_with("active_task must identify")

    def test_malformed_data_shapes_fail_cleanly(self):
        self.edit_yaml("tasks/ROADMAP.yaml", lambda v: v.update(tasks={}))
        self.fails_with("expected an array")

    def test_missing_required_schema_fails(self):
        (self.root / "schemas/unit.schema.json").unlink()
        self.fails_with("missing unit.schema.json")

    def test_invalid_locale_fails(self):
        self.edit_yaml("languages/ja-JP/manifest.yaml", lambda v: v.update(target_locale="@!"))
        self.fails_with("target_locale")

    def test_required_flag_must_be_boolean(self):
        self.edit_yaml("tasks/ROADMAP.yaml", lambda v: v["tasks"][0].update(required_for_desktop_1_0="true"))
        self.fails_with("must be boolean")

    def test_optional_scope_must_match_flags(self):
        self.edit_yaml("tasks/ROADMAP.yaml", lambda v: v["execution_scope"]["optional_tasks"].append("BOOT-001"))
        self.fails_with("policy mismatch")

    def test_required_task_must_gate_release(self):
        self.edit_yaml("tasks/ROADMAP.yaml", lambda v: v["tasks"].append({"id":"ORPHAN","milestone":"M10","priority":"P1","title":"orphan","dependencies":[],"read_first":[],"acceptance":["must complete"],"required_for_desktop_1_0":True}))
        self.fails_with("not gated by REL-001")

    def test_done_evidence_must_exist(self):
        self.edit_state(lambda v: v["tasks"]["BOOT-001"].update(status="done", evidence=["state/evidence/missing.txt"]))
        self.fails_with("missing/unsafe file")

    def test_yaml_aliases_rejected(self):
        (self.pack / "phonology/inventory.yaml").write_text("a: &a [value]\nb: *a\n")
        self.fails_with("aliases/merge")

    def test_missing_unreferenced_seed_file_fails(self):
        (self.pack / "lexicon/expressions.jsonl").unlink()
        self.fails_with("lexicon/expressions.jsonl")

    def test_unknown_goal_context_fails(self):
        self.edit_yaml("languages/ja-JP/curriculum/goals.yaml", lambda v: v[0]["contexts"].append("missing.situation"))
        self.fails_with("contexts references unknown")


if __name__ == "__main__":
    unittest.main()
