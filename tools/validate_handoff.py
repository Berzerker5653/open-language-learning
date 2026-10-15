#!/usr/bin/env python3
"""Validate this specification scaffold; never certify a completed application.

See schemas/README.md for scope, setup, draft-reference policy and SDK gaps.
No instructions or code contained in pack data are executed.
"""
from __future__ import annotations
import argparse
import json
import re
import sys
from pathlib import Path, PurePosixPath
try:
    from referencing import Registry, Resource
    import yaml
    from jsonschema import Draft202012Validator, FormatChecker
except ImportError as exc:
    print(f"Missing validator dependency: {exc}. Install tools/requirements.txt in a virtual environment.", file=sys.stderr)
    raise SystemExit(2)

ROOT = Path(__file__).resolve().parents[1]
# Headroom over the committed pack media manifests (docs/13 §"Packs with
# generated audio"): ja-JP media/manifest.jsonl is 3.2 MB and every entry is
# schema-validated; the cap guards against runaway/accidental data files.
MAX_DATA_BYTES = 8_000_000
TRUSTED = {"validated", "verified", "reference"}


class DuplicateKeyError(ValueError):
    pass


class StrictLoader(yaml.SafeLoader):
    def compose_node(self, parent, index):
        if self.check_event(yaml.AliasEvent):
            raise ValueError("YAML aliases/merge expansion are unsupported in handoff data")
        return super().compose_node(parent, index)


def strict_mapping(loader, node, deep=False):
    result = {}
    for key_node, value_node in node.value:
        key = loader.construct_object(key_node, deep=deep)
        if not isinstance(key, str):
            raise ValueError("YAML mapping keys must be strings")
        if key in result:
            raise DuplicateKeyError(f"duplicate YAML key {key!r} at line {key_node.start_mark.line + 1}")
        result[key] = loader.construct_object(value_node, deep=deep)
    return result


StrictLoader.add_constructor(yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG, strict_mapping)


def strict_json_pairs(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise DuplicateKeyError(f"duplicate JSON key {key!r}")
        result[key] = value
    return result


def reject_constant(value):
    raise ValueError(f"non-JSON numeric value {value}")


def read_data(path):
    if path.stat().st_size > MAX_DATA_BYTES:
        raise ValueError(f"data file exceeds {MAX_DATA_BYTES} bytes")
    value = path.read_text(encoding="utf-8")
    if path.suffix == ".json":
        parsed = json.loads(value, object_pairs_hook=strict_json_pairs, parse_constant=reject_constant)
    elif path.suffix == ".jsonl":
        parsed = [json.loads(line, object_pairs_hook=strict_json_pairs, parse_constant=reject_constant)
                  for line in value.splitlines() if line.strip()]
    else:
        parsed = yaml.load(value, Loader=StrictLoader)
    json.dumps(parsed, allow_nan=False)  # reject dates, bytes, NaN and cyclic aliases
    return parsed


def semver_tuple(value):
    """Ordering used only after schema validation of full SemVer syntax."""
    core, _, pre = value.split("+", 1)[0].partition("-")
    nums = tuple(int(n) for n in core.split("."))
    identifiers = tuple((0, int(p)) if p.isdigit() else (1, p) for p in pre.split(".")) if pre else ()
    return nums, 1 if not pre else 0, identifiers


class Audit:
    def __init__(self, root, release=False, require_ledger=False):
        self.root = Path(root).resolve()
        self.release = release
        self.require_ledger = require_ledger
        self.errors = []
        self.warnings = []
        self.cache = {}
        self.schemas = {}
        self.registry = Registry()
        self.checked = 0

    def fail(self, label, message):
        self.errors.append(f"{label}: {message}")

    def warn(self, label, message):
        self.warnings.append(f"{label}: {message}")

    def relative_file(self, base, value, label):
        if not isinstance(value, str) or chr(92) in value or re.match(r"^[A-Za-z]:", value):
            self.fail(label, "expected a portable relative file path")
            return None
        pure = PurePosixPath(value)
        if pure.is_absolute() or ".." in pure.parts or not pure.parts:
            self.fail(label, f"unsafe relative path {value!r}")
            return None
        path = base / value
        if not path.is_file() or path.is_symlink() or not path.resolve().is_relative_to(base.resolve()):
            self.fail(label, f"missing/unsafe file {value!r}")
            return None
        return path

    def data(self, path):
        path = Path(path)
        if path in self.cache:
            return self.cache[path]
        label = str(path.relative_to(self.root))
        try:
            value = read_data(path)
        except (OSError, ValueError, TypeError, RecursionError, yaml.YAMLError) as exc:
            self.fail(label, str(exc))
            value = None
        self.cache[path] = value
        self.checked += 1
        return value

    def schema(self, name, value, label):
        if value is None:
            return False
        schema = self.schemas.get(name)
        if schema is None:
            self.fail(label, f"missing usable schema {name}")
            return False
        errors = sorted(Draft202012Validator(schema, registry=self.registry, format_checker=FormatChecker()).iter_errors(value), key=lambda e: str(list(e.path)))
        for error in errors:
            self.fail(label, f"{'/'.join(map(str,error.path)) or '<root>'}: {error.message}")
        return not errors

    def records(self, value, label):
        if not isinstance(value, list) or any(not isinstance(v, dict) for v in value):
            self.fail(label, "expected an array of objects")
            return []
        return value

    def index(self, records, label):
        result = {}
        for item in records:
            ident = item.get("id")
            if not isinstance(ident, str) or not ident:
                self.fail(label, "record missing nonempty ID")
                continue
            if ident in result:
                self.fail(label, f"duplicate ID {ident}")
            result[ident] = item
        return result

    def dag(self, edges, label):
        visited, active = set(), []
        def visit(node):
            if node in active:
                self.fail(label, "prerequisite cycle: " + " -> ".join(active[active.index(node):] + [node]))
                return
            if node in visited:
                return
            active.append(node)
            for dep in edges[node]:
                if dep not in edges:
                    self.fail(label, f"{node} references unknown prerequisite {dep}")
                else:
                    visit(dep)
            active.pop()
            visited.add(node)
        for node in edges:
            visit(node)

    def refs(self, records, field, targets, label, required=False):
        for record in records:
            for target in record.get(field, []):
                if target not in targets:
                    self.fail(label, f"{record.get('id')} {field} references unknown ID {target}")
            if required and not record.get(field):
                self.fail(label, f"{record.get('id')} needs {field}")

    def load_schemas(self):
        expected = {"concept.schema.json", "goal.schema.json", "unit.schema.json", "source-entry.schema.json", "language-pack-manifest.schema.json", "lexicon-entry.schema.json", "sentence.schema.json", "assessment.schema.json", "license-inventory.schema.json"}
        for name in sorted(expected):
            if not (self.root / "schemas" / "v0.2" / name).is_file():
                self.fail("schemas", f"missing {name}")
        for path in sorted((self.root / "schemas" / "v0.2").glob("*.schema.json")):
            schema = self.data(path)
            if schema is None:
                continue
            try:
                Draft202012Validator.check_schema(schema)
                if schema.get("$schema") != "https://json-schema.org/draft/2020-12/schema":
                    raise ValueError("expected Draft 2020-12 declaration")
                self.schemas[path.name] = schema
            except Exception as exc:
                self.fail(str(path.relative_to(self.root)), f"invalid schema: {exc}")
        self.registry = Registry().with_resources(
            [(schema["$id"], Resource.from_contents(schema)) for schema in self.schemas.values() if "$id" in schema])

    def pack(self, base):
        label = str(base.relative_to(self.root))
        manifest = self.data(base / "manifest.yaml")
        if not self.schema("language-pack-manifest.schema.json", manifest, label + "/manifest.yaml"):
            return
        upper = manifest["engine"].get("max_version_exclusive")
        if upper and semver_tuple(manifest["engine"]["min_version"]) >= semver_tuple(upper):
            self.fail(label, "engine compatibility range is empty/reversed")
        if manifest["maturity"] != "experimental":
            self.fail(label, "this scaffold checker cannot authorize trust promotion; implement SDK review/trust gates before changing maturity")
        for field in ["license_file", "attribution_file"]:
            if field in manifest["license"]:
                self.relative_file(base, manifest["license"][field], label + "/license")
        # The examples/ shortcut existed because every example was a manifest-only
        # stub. It is now a content test: a stub still short-circuits (and fails a
        # release check), but a complete pack under examples/ falls through to the
        # full record/schema path, so generated conformance packs are checked by
        # these schemas rather than excused. Trust promotion stays out of reach:
        # the maturity check above and the TRUSTED release check below still apply.
        if base.parent.name == "examples" and not (base / "curriculum").is_dir():
            self.warn(label, "manifest-only onboarding fixture; no instructional content or full pack conformance")
            if self.release:
                self.fail(label, "manifest-only example is not a releasable language pack")
            return
        for name in ["sources.jsonl", "licenses.jsonl", "curriculum/goals.yaml", "grammar/concepts.jsonl",
                     "sentences/entries.jsonl", "assessments/definitions.jsonl"]:
            self.relative_file(base, name, label)
        if not sorted((base / "lexicon").glob("*.jsonl")):
            self.fail(label, "pack needs at least one lexicon/*.jsonl file")
        if not sorted((base / "curriculum" / "units").glob("*.yaml")):
            self.fail(label, "pack needs at least one curriculum/units/*.yaml file")
        if "UNLICENSED" in manifest["license"]["content_license"] or "UNKNOWN" in manifest["license"]["content_license"]:
            self.warn(label, "draft distribution license unresolved; no redistribution/release authorization inferred")
        for name, paths, schema in [
            ("source", [base / "sources.jsonl"], "source-entry.schema.json"),
            ("license", [base / "licenses.jsonl"], "license-inventory.schema.json"),
            ("concept", [base / "grammar/concepts.jsonl"], "concept.schema.json"),
            ("lexical", sorted((base / "lexicon").glob("*.jsonl")), "lexicon-entry.schema.json"),
            ("sentence", [base / "sentences/entries.jsonl"], "sentence.schema.json"),
            ("assessment", [base / "assessments/definitions.jsonl"], "assessment.schema.json"),
            ("unit", sorted((base / "curriculum" / "units").glob("*.yaml")), "unit.schema.json"),
        ]:
            for path in paths:
                if not path.is_file():
                    continue
                data = self.data(path)
                values = data if isinstance(data, list) else [data]
                for record in self.records(values, str(path.relative_to(self.root))):
                    self.schema(schema, record, str(path.relative_to(self.root)))
        goal_paths = sorted((base / "curriculum").glob("goals*.yaml")) + sorted((base / "curriculum" / "goals").glob("*.yaml"))
        if not goal_paths:
            self.fail(label, "pack needs curriculum/goals.yaml or curriculum/goals/*.yaml")
        for path in goal_paths:
            data = self.data(path)
            goals = data.get("goals") if isinstance(data, dict) else None
            for record in self.records(goals, str(path.relative_to(self.root))):
                self.schema("goal.schema.json", record, str(path.relative_to(self.root)))
        if self.release:
            if manifest["maturity"] not in TRUSTED:
                self.fail(label, "pack is experimental/unreviewed")
            if "UNLICENSED" in manifest["license"]["content_license"] or "UNKNOWN" in manifest["license"]["content_license"]:
                self.fail(label, "pack distribution license is unresolved")

    def roadmap(self):
        value = self.data(self.root / "tasks/ROADMAP.yaml")
        if not isinstance(value, dict) or value.get("schema_version") != "1.0":
            self.fail("roadmap", "expected roadmap schema version 1.0")
            return
        tasks = self.index(self.records(value.get("tasks"), "roadmap/tasks"), "roadmap")
        milestones = self.index(self.records(value.get("milestones"), "roadmap/milestones"), "milestones")
        for task in tasks.values():
            ident = task["id"]
            if not isinstance(task.get("required_for_desktop_1_0"), bool):
                self.fail(ident, "required_for_desktop_1_0 must be boolean")
            if task.get("priority") not in {"P0", "P1", "P2", "P3"}:
                self.fail(ident, "invalid priority")
            if task.get("milestone") not in milestones:
                self.fail(ident, "unknown milestone")
            for field in ["dependencies", "read_first", "acceptance"]:
                if not isinstance(task.get(field), list) or any(not isinstance(v, str) or not v.strip() for v in task[field]):
                    self.fail(ident, f"{field} must be an array of nonempty strings")
                    task[field] = []
                if len(task[field]) != len(set(task[field])):
                    self.fail(ident, f"duplicate {field} entries")
            if not task.get("title") or not task["acceptance"]:
                self.fail(ident, "task must have title and acceptance criteria")
            for doc in task["read_first"]:
                self.relative_file(self.root, doc, ident + "/read_first")
        self.dag({ident: task.get("dependencies", []) for ident, task in tasks.items()}, "roadmap")
        scope = value.get("execution_scope")
        optional = {ident for ident, task in tasks.items() if task.get("required_for_desktop_1_0") is False}
        if not isinstance(scope, dict):
            self.fail("roadmap", "execution_scope must declare completion and optional work")
        elif (scope.get("completion_task") != "REL-001" or scope.get("required_flag") != "required_for_desktop_1_0"
              or not isinstance(scope.get("optional_tasks"), list)
              or set(scope.get("optional_tasks", [])) != optional
              or len(scope.get("optional_tasks", [])) != len(set(scope.get("optional_tasks", [])))
              or scope.get("public_publication_authorized") is not False):
            self.fail("roadmap", "execution_scope completion_task/required_flag/optional_tasks/publication policy mismatch")
        if "REL-001" in tasks:
            def ancestors(ident, seen=None):
                seen = set() if seen is None else seen
                for dep in tasks[ident]["dependencies"]:
                    if dep in tasks and dep not in seen:
                        seen.add(dep)
                        ancestors(dep, seen)
                return seen
            release_path = ancestors("REL-001") | {"REL-001"}
            for ident, task in tasks.items():
                if task.get("required_for_desktop_1_0") is True and ident not in release_path:
                    self.fail("roadmap", f"required task {ident} is not gated by REL-001")
        state = self.data(self.root / "state/task-state.json")
        if not isinstance(state, dict) or state.get("schema_version") != "1.0" or not isinstance(state.get("tasks"), dict):
            self.fail("task-state", "expected task-state schema version 1.0 and task map")
            return
        if not isinstance(state.get("updated"), str) or not FormatChecker().conforms(state["updated"], "date"):
            self.fail("task-state", "updated must be an ISO calendar date")
        statuses = {"blocked", "ready", "in_progress", "review", "done", "retryable"}
        states = state["tasks"]
        for ident, entry in states.items():
            if ident not in tasks:
                self.fail("task-state", f"unknown task {ident}")
                continue
            if not isinstance(entry, dict) or entry.get("status") not in statuses:
                self.fail("task-state", f"invalid status on {ident}")
                continue
            attempts = entry.get("attempts")
            if not isinstance(attempts, int) or isinstance(attempts, bool) or attempts < 0:
                self.fail("task-state", f"invalid attempts on {ident}")
            if entry.get("status") == "done":
                evidence = entry.get("evidence")
                if not isinstance(evidence, list) or not evidence:
                    self.fail("task-state", f"done task {ident} needs recorded evidence paths")
                else:
                    for path in evidence:
                        self.relative_file(self.root, path, ident + "/evidence")
            if entry.get("status") in {"ready", "in_progress", "review", "done", "retryable"}:
                for dep in tasks[ident]["dependencies"]:
                    if states.get(dep, {}).get("status") != "done":
                        self.fail("task-state", f"{ident} has incomplete prerequisite {dep}")
        active = state.get("active_task")
        in_progress = [ident for ident, entry in states.items() if isinstance(entry, dict) and entry.get("status") == "in_progress"]
        if active is not None and (active not in tasks or active not in in_progress):
            self.fail("task-state", "active_task must identify an in_progress roadmap task")
        if in_progress != ([active] if active else []):
            self.fail("task-state", "exactly the active_task may be in_progress")
        if self.require_ledger:
            # Proposed policy (docs/adr/0033, Status: Proposed, so off by default): a
            # task on the desktop-1.0 release path must carry an explicit ledger
            # record. Without one, docs/15 derivation lets a human-gated card report
            # as ready merely because its dependencies are done.
            for ident, task in tasks.items():
                if ident in states:
                    continue
                if task.get("required_for_desktop_1_0") is True:
                    self.fail("task-state", f"required task {ident} has no explicit ledger record")
                else:
                    self.warn("task-state", f"optional task {ident} has no explicit ledger record")

    def run(self):
        required = ["README.md", "START_HERE_OMP.md", "AGENTS.md", "docs/00_MASTER_SPEC.md", "state/STATUS.md", "schemas/README.md", "tasks/ROADMAP.yaml", "state/task-state.json", "languages/ja-JP/manifest.yaml", "examples/minimal-language-pack/manifest.yaml"]
        for name in required:
            self.relative_file(self.root, name, "handoff")
        for folder in ["schemas", "languages", "examples", "tasks", "state"]:
            for path in sorted((self.root / folder).rglob("*")):
                if path.is_file() and path.suffix in {".yaml", ".yml", ".json", ".jsonl"}:
                    if path.is_symlink() or not path.resolve().is_relative_to(self.root):
                        self.fail(str(path), "symlink/outside data file")
                    else:
                        self.data(path)
        self.load_schemas()
        for folder in ["languages", "examples"]:
            for manifest in sorted((self.root / folder).glob("*/manifest.yaml")):
                try:
                    self.pack(manifest.parent)
                except (KeyError, TypeError, ValueError, AttributeError, RecursionError) as exc:
                    self.fail(str(manifest.parent.relative_to(self.root)), f"invalid data shape: {exc}")
        try:
            self.roadmap()
        except (KeyError, TypeError, ValueError, AttributeError, RecursionError) as exc:
            self.fail("roadmap/state", f"invalid data shape: {exc}")
        self.warn("scope", "handoff structure checked; SDK completeness, linguistic correctness, source rights, calibration quality, build/install/runtime/UX/privacy/security remain unverified")
        return self


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=ROOT, help="validate a separate copy without executing its content")
    parser.add_argument("--release-readiness", action="store_true", help="strict pack data preflight; never certifies app/linguistic release quality")
    parser.add_argument("--require-explicit-ledger-records", action="store_true",
                        help="fail any desktop-1.0-required roadmap task that has no state/task-state.json record (proposed policy, ADR-0033)")
    parser.add_argument("--json", action="store_true", help="machine-readable diagnostics")
    args = parser.parse_args(argv)
    audit = Audit(args.root, args.release_readiness, args.require_explicit_ledger_records).run()
    result = {"mode": "pack-data-preflight" if args.release_readiness else "handoff", "passed": not audit.errors, "data_files_checked": audit.checked, "errors": audit.errors, "warnings": audit.warnings}
    if args.json:
        print(json.dumps(result, indent=2, ensure_ascii=False))
    else:
        for message in audit.errors:
            print("FAIL", message)
        for message in audit.warnings:
            print("WARN", message)
        print(f"{result['mode'].upper()} VALIDATION {'PASSED' if result['passed'] else 'FAILED'} ({audit.checked} data files checked)")
    return 0 if result["passed"] else 1


if __name__ == "__main__":
    sys.exit(main())
