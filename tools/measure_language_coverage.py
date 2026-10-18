#!/usr/bin/env python3
"""Measure a language pack's practice coverage as FIVE SEPARATE COUNTS.

Per the repo contract (AGENTS.md, ADR-0025, docs/18 section 6), "defined",
"runnable practice", "servable practice", "valid evidence" and "review
posture" are five DIFFERENT counts. This tool never collapses or sums them
into one coverage number; every layer keeps its own heading, counts and
per-item tables. Numbers here are computed, never hand-edited.

The five layers:

  LAYER 1 - DECLARED          what the pack promises (curriculum/units + goals)
  LAYER 2 - RUNNABLE PRACTICE an engine runner exists for the (type, modality)
                              pair. The AUTHORITATIVE table is the
                              `activity_runner` function in
                              apps/desktop/src-tauri/src/lib.rs; this tool
                              parses that table from the Rust source at
                              runtime and never keeps a second copy. If the
                              parse yields no arms it fails loudly
                              ("activity_runner table not found") instead of
                              falling back to a constant, because a silent
                              fallback would manufacture coverage numbers.
  LAYER 3 - SERVABLE PRACTICE runnable AND the pack can actually serve it
                              (content ids resolve, media rows exist where
                              the runner needs audio, manifest capabilities
                              permit the modality).
  LAYER 4 - VALID EVIDENCE    can the activity produce evidence that may
                              count, per docs/assessment/MASTERY_POLICY.yaml
                              and the engine's dimension-kebab mapping.
  LAYER 5 - REVIEW POSTURE    is the content fit to ship, independent of
                              runnability. A posture statement, never a
                              coverage count; never merged with layers 1-4.

CLI: tools/measure_language_coverage.py [--pack DIR]... [--json]
Default packs: every languages/*/ directory containing manifest.yaml.
Deterministic ordering everywhere; no network; exit 0 on success.
"""

import argparse
import json
import re
import sys
from collections import Counter
from pathlib import Path

import yaml

REPO_ROOT = Path(__file__).resolve().parent.parent
LIB_RS = REPO_ROOT / "apps" / "desktop" / "src-tauri" / "src" / "lib.rs"
MASTERY_POLICY = REPO_ROOT / "docs" / "assessment" / "MASTERY_POLICY.yaml"
# Speaking posture authority: ADR-0017 decision 1, cited the same way the
# engine cites it (the comment above `speaking_sentence_task_build` in
# lib.rs). This is the real file; the card's `ADR-0017-microphone-capability-
# and-non-mastery.md` path has never existed in this checkout.
ADR_SPEAKING_ACTUAL = REPO_ROOT / "docs" / "adr" / "0017-unfunded-ai-only-posture.md"


# The five modalities that a manifest `capabilities` block can gate.
GATED_MODALITIES = ("listening", "speaking", "reading", "writing")



# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------

def sorted_counter(counter):
    """Counter -> list of [key, count] sorted by key (None last as '(none)')."""
    return [[("(none)" if k is None else k), v] for k, v in
            sorted(counter.items(), key=lambda kv: (str(kv[0] is None), str(kv[0])))]


def read_jsonl(path):
    rows = []
    if path.is_file():
        with path.open(encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if line:
                    rows.append(json.loads(line))
    return rows


# ---------------------------------------------------------------------------
# LAYER 2 input: parse the engine's authoritative activity_runner table
# ---------------------------------------------------------------------------

def _strip_comment(line):
    """Remove a trailing `//` comment that is outside a string literal."""
    in_str = False
    esc = False
    for i, ch in enumerate(line):
        if esc:
            esc = False
        elif ch == "\\" and in_str:
            esc = True
        elif ch == '"':
            in_str = not in_str
        elif ch == "/" and not in_str and line[i:i + 2] == "//":
            return line[:i]
    return line


def _alts(token):
    """Parse one side of a tuple pattern: quoted literals or `|`-alternations.

    Returns a set of type/modality strings, or None for the `_` wildcard —
    which in Rust means "any modality", so a wildcard entry matches every
    declared modality for that type.
    """
    token = token.strip()
    if token == "_":
        return None
    out = set()
    for alt in token.split("|"):
        alt = alt.strip()
        if alt == "_":
            return None
        if alt.startswith("&"):
            alt = alt[1:].strip()
        if alt.startswith("Modality::"):
            alt = alt[len("Modality::"):].strip()
        m = re.fullmatch(r'"([^"]*)"', alt)
        if m:
            out.add(m.group(1))
    return out or None


def parse_runner_table(lib_rs):
    """Parse `fn activity_runner(...)` in lib.rs into a list of entries.

    Each entry is (activity_type, modality_or_None_for_any, runner_name).
    Arms are collected in SOURCE ORDER so `runner_for` resolves a pair exactly
    the way Rust's `match` does (first arm wins). Every arm whose body is
    `Some("runner")` counts; each tuple pattern `("type" | ..., "modality" | _)`
    on the arm contributes one entry per type x modality alternative. Arms are
    split at top-level commas of the `match` block, so rustfmt's habit of
    wrapping a long tuple pattern over several lines is parsed, not missed —
    missing it would undercount runnable practice. FAILS LOUDLY (exit 1) if no
    arms are found: a silent fallback would manufacture coverage numbers.
    """
    src = lib_rs.read_text(encoding="utf-8")
    m = re.search(r"fn activity_runner\(", src)
    if not m:
        sys.stderr.write("activity_runner table not found\n")
        sys.exit(1)
    # Function body: brace-match from the first `{` after the signature.
    start = src.index("{", m.end())
    depth = 0
    end = None
    for i in range(start, len(src)):
        if src[i] == "{":
            depth += 1
        elif src[i] == "}":
            depth -= 1
            if depth == 0:
                end = i
                break
    if end is None:
        sys.stderr.write("activity_runner table not found\n")
        sys.exit(1)
    body = src[start:end]
    mm = re.search(r"\bmatch\b[^{}]*\{", body)
    if not mm:
        sys.stderr.write("activity_runner table not found\n")
        sys.exit(1)
    arms = body[mm.end():]
    depth = 0
    end = None
    for i in range(len(arms)):
        if arms[i] in "({[":
            depth += 1
        elif arms[i] in ")}]":
            if depth == 0:
                end = i
                break
            depth -= 1
    if end is None:
        sys.stderr.write("activity_runner table not found\n")
        sys.exit(1)

    # Split the match block into arms at top-level commas, comment-free and
    # whitespace-collapsed so a wrapped arm is one arm.
    chunks = []
    current = []
    depth = 0
    for raw in arms[:end].splitlines():
        for ch in _strip_comment(raw):
            if ch in "({[":
                depth += 1
            elif ch in ")}]":
                depth -= 1
            if ch == "," and depth == 0:
                chunks.append("".join(current))
                current = []
            else:
                current.append(ch)
    chunks.append("".join(current))

    entries = []
    for chunk in chunks:
        if "=>" not in chunk:
            continue
        pattern, result = chunk.split("=>", 1)
        rm = re.search(r'Some\("([^"]*)"\)', result)
        if not rm:
            continue  # `_ => None` and any None arm: not a runner
        runner = rm.group(1)
        pattern = re.sub(r"\s+", " ", pattern)
        for tup in re.findall(r"\(([^()]*)\)", pattern):
            # Split the tuple at the top-level comma (no nested parens).
            if "," not in tup:
                continue
            type_part, mod_part = tup.split(",", 1)
            types = _alts(type_part)
            mods = _alts(mod_part)
            if not types:
                continue
            if mods is None:
                for t in sorted(types):
                    entries.append((t, None, runner))
            else:
                for t in sorted(types):
                    for mod in sorted(mods):
                        entries.append((t, mod, runner))

    seen = set()
    ordered = []
    for entry in entries:
        if entry not in seen:
            seen.add(entry)
            ordered.append(entry)
    if not ordered:
        sys.stderr.write("activity_runner table not found\n")
        sys.exit(1)
    return ordered


def runner_for(entries, activity_type, modality):
    """Runner name for a declared pair, or None — exactly like the Rust fn."""
    for t, mod, runner in entries:
        if t == activity_type and (mod is None or mod == modality):
            return runner
    return None


# ---------------------------------------------------------------------------
# pack loading
# ---------------------------------------------------------------------------

def load_activities(pack):
    """Every declared activity from curriculum/units/*.yaml, sorted by file."""
    activities = []
    unit_files = sorted((pack / "curriculum" / "units").glob("*.yaml"))
    for path in unit_files:
        data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
        for act in data.get("activities") or []:
            act = dict(act)
            act["_unit"] = path.name
            activities.append(act)
    return unit_files, activities


def content_ids(activity):
    """Referenced content ids. The pack schema key is `content_refs`;
    the older spec alias `content` is accepted too."""
    refs = activity.get("content_refs")
    if refs is None:
        refs = activity.get("content")
    return list(refs or [])


def scan_defined_ids(pack):
    """Set of content ids DEFINED by the pack.

    Scans every .yaml/.jsonl/.json content file in the pack for top-level
    `"id"` values, EXCLUDING files that reference rather than define
    content: curriculum/, media/ (the media contract is checked separately),
    review/, tests/, sources.jsonl, licenses.jsonl and manifest.yaml.
    """
    excluded_dirs = {"curriculum", "media", "review", "tests"}
    excluded_files = {"sources.jsonl", "licenses.jsonl", "manifest.yaml"}
    ids = set()

    def walk_ids(node):
        if isinstance(node, dict):
            for key, val in node.items():
                if key == "id" and isinstance(val, str):
                    ids.add(val)
                walk_ids(val)
        elif isinstance(node, list):
            for item in node:
                walk_ids(item)

    for path in sorted(pack.rglob("*")):
        if not path.is_file() or path.suffix not in (".yaml", ".jsonl", ".json"):
            continue
        rel = path.relative_to(pack)
        if rel.parts[0] in excluded_dirs or str(rel) in excluded_files:
            continue
        if path.suffix == ".jsonl":
            for row in read_jsonl(path):
                if isinstance(row, dict) and isinstance(row.get("id"), str):
                    ids.add(row["id"])
        else:
            for doc in yaml.safe_load_all(path.read_text(encoding="utf-8")):
                walk_ids(doc)
    return ids


def scan_media_ids(pack):
    """Content ids with a row in media/manifest.jsonl (the tracked contract;
    the .wav bytes themselves are gitignored, so rows are the check)."""
    return {row["id"] for row in read_jsonl(pack / "media" / "manifest.jsonl")
            if isinstance(row, dict) and isinstance(row.get("id"), str)}


def load_capabilities(pack):
    """manifest.yaml `capabilities:` mapping for the four gated modalities.
    A modality with value `false` makes that modality NOT servable; absent
    or true permits it."""
    manifest = yaml.safe_load((pack / "manifest.yaml").read_text(encoding="utf-8")) or {}
    caps = manifest.get("capabilities") or {}
    return {mod: caps.get(mod, True) is not False for mod in GATED_MODALITIES}


def needs_audio(runner, activity_type):
    """Does serving this activity require audio for its referenced content?"""
    return (runner == "comprehension-listening"
            or (runner == "encounter" and activity_type == "encounter-listen")
            or "dictation" in (activity_type or ""))


# ---------------------------------------------------------------------------
# the five layers
# ---------------------------------------------------------------------------

def layer1_declared(pack, unit_files, activities):
    by_pair = Counter()
    missing_key = 0
    for act in activities:
        if act.get("id") is None or act.get("type") is None or act.get("modality") is None:
            missing_key += 1
        by_pair[(act.get("type") or "(missing)", act.get("modality") or "(missing)")] += 1

    goals_data = yaml.safe_load((pack / "curriculum" / "goals.yaml").read_text(encoding="utf-8")) or {}
    goals = goals_data.get("goals") or []
    goals_by_modality = Counter()
    for goal in goals:
        mods = goal.get("modality")
        if isinstance(mods, str):
            mods = [mods]
        else:
            mods = mods or goal.get("modalities") or []
        for mod in sorted(set(mods)):
            goals_by_modality[mod] += 1

    data = {
        "units": len(unit_files),
        "activities": len(activities),
        "activities_by_type_modality": [
            {"type": t, "modality": mod, "count": n}
            for (t, mod), n in sorted(by_pair.items())
        ],
        "activities_with_missing_key": missing_key,
        "goals": len(goals),
        "goals_by_modality": sorted_counter(goals_by_modality),
    }
    lines = [f"  units: {data['units']}   activities: {data['activities']}   goals: {data['goals']}"]
    lines.append("  activities grouped by (type, modality):")
    for row in data["activities_by_type_modality"]:
        lines.append(f"    {row['type']:<22} {row['modality']:<12} {row['count']:>5}")
    lines.append(f"  activities with a missing key (id/type/modality): {missing_key}")
    lines.append("  goals by modality (a goal counts once per declared modality):")
    for mod, n in data["goals_by_modality"]:
        lines.append(f"    {mod:<12} {n:>5}")
    return data, lines


def layer2_runnable(pack, activities, table):
    with_runner = 0
    pair_missing = {}
    used_runners = Counter()
    for act in activities:
        runner = runner_for(table, act.get("type"), act.get("modality"))
        if runner:
            with_runner += 1
            used_runners[runner] += 1
        else:
            key = (act.get("type") or "(missing)", act.get("modality") or "(missing)")
            entry = pair_missing.setdefault(key, {"count": 0, "example_ids": []})
            entry["count"] += 1
            if len(entry["example_ids"]) < 3 and act.get("id"):
                entry["example_ids"].append(act["id"])
    unrunnable = [
        {"type": t, "modality": mod, "activity_count": e["count"],
         "example_ids": e["example_ids"]}
        for (t, mod), e in sorted(pair_missing.items())
    ]
    data = {
        "activities_with_runner": with_runner,
        "activities_without_runner": len(activities) - with_runner,
        "runner_usage": sorted_counter(used_runners),
        "unrunnable_declared_pairs": unrunnable,
    }
    lines = [f"  activities with a runner: {with_runner}",
             f"  activities with no runner (None): {data['activities_without_runner']}"]
    lines.append("  runner usage over declared activities:")
    for runner, n in data["runner_usage"]:
        lines.append(f"    {runner:<26} {n:>5}")
    lines.append("  GAPS: declared (type, modality) pairs with NO runner:")
    if not unrunnable:
        lines.append("    (none)")
    for row in unrunnable:
        lines.append(f"    ({row['type']}, {row['modality']}): {row['activity_count']} activities"
                     f"; e.g. {', '.join(row['example_ids'])}")
    return data, lines


def layer3_servable(activities, table, defined_ids, media_ids, capabilities):
    reasons = {}
    servable = 0

    def add(reason, act_id):
        entry = reasons.setdefault(reason, {"count": 0, "example_ids": []})
        entry["count"] += 1
        if len(entry["example_ids"]) < 3 and act_id:
            entry["example_ids"].append(act_id)

    for act in activities:
        act_id = act.get("id")
        act_type = act.get("type")
        modality = act.get("modality")
        runner = runner_for(table, act_type, modality)
        refs = content_ids(act)
        ok = True
        if runner is None:
            add("no runner (see layer 2)", act_id)
            ok = False
        missing_content = [r for r in refs if r not in defined_ids]
        if missing_content:
            add("missing content id", act_id)
            ok = False
        if runner is not None and needs_audio(runner, act_type):
            missing_media = [r for r in refs if r not in media_ids]
            if missing_media:
                add("missing media row", act_id)
                ok = False
        if modality in GATED_MODALITIES and not capabilities.get(modality, True):
            add("capability disabled", act_id)
            ok = False
        if ok:
            servable += 1

    grouped = [
        {"reason": reason, "count": e["count"], "example_ids": e["example_ids"]}
        for reason, e in sorted(reasons.items())
    ]
    data = {
        "servable_activities": servable,
        "non_servable_activities": len(activities) - servable,
        "non_servable_reasons": grouped,
    }
    lines = [f"  servable activities: {servable}",
             f"  non-servable activities: {data['non_servable_activities']} "
             "(an activity may appear under several reasons)"]
    for entry in grouped:
        lines.append(f"    {entry['reason']:<34} {entry['count']:>5}  "
                     f"e.g. {', '.join(entry['example_ids'])}")
    return data, lines


# Runner -> the mastery dimension the engine files evidence under, or None for
# a stage that only presents content. This is the runner table's own output, so
# it cannot drift from `activity_runner`; each entry is pinned by the engine's
# test for that pair in lib.rs: `the_writing_pair_builds_a_typed_cloze_task`
# (cloze/typed -> production-writing), K-96's recall pair (recall-meaning),
# `comprehension_listening_runs_over_a_russian_pack_sentence`
# (comprehension-listening), and `the_speaking_pair_builds_a_guided_unscored_task`
# plus `a_speaking_attempt_is_refused_before_any_mastery_write`
# (guided-speaking -> production-speaking, recorded but NEVER scored).
RUNNER_DIMENSION = {
    "cloze": "production-writing",
    "typed": "production-writing",
    "recall-meaning": "recall-meaning",
    "comprehension-listening": "comprehension-listening",
    "guided-speaking": "production-speaking",
    "encounter": None,
}

# ADR-0017 decision 1: speaking evidence is formative.
UNSORED_DIMENSIONS = ("production-speaking",)


def mastery_dimension(runner):
    """Dimension a runnable activity files under, from the runner name."""
    return RUNNER_DIMENSION.get(runner, "UNMAPPED")


def layer4_evidence(activities, table, policy):
    """Evidence layer: what a RUNNING activity could file, and under what
    eligibility. Counted over runnable activities only — an activity with no
    runner executes nothing, so it produces no evidence at all."""
    dims = Counter()
    scored_capable = 0
    formative_only = 0
    no_evidence = 0
    unmapped = 0
    for act in activities:
        runner = runner_for(table, act.get("type"), act.get("modality"))
        if runner is None:
            no_evidence += 1  # nothing executes, so no evidence at all
            continue
        dim = mastery_dimension(runner)
        if dim == "UNMAPPED":
            unmapped += 1  # a runner the tool has no dimension for: loud, not guessed
            continue
        dims[dim] += 1
        if dim in UNSORED_DIMENSIONS or dim is None:
            # production-speaking: the engine records the attempt and refuses to
            # score it; typed substitution is disqualifying support. Encounter
            # stages file nothing (ADR-0017 decision 1, MASTERY_POLICY).
            formative_only += 1
        else:
            scored_capable += 1
    data = {
        "scored_eligibility": policy.get("eligibility", {}).get("counted_outcomes"),
        "dimension_counts": sorted_counter(dims),
        "scored_evidence_capable": scored_capable,
        "formative_only": formative_only,
        "no_evidence_unrunnable": no_evidence,
        "runners_without_known_dimension": unmapped,
    }
    lines = [f"  evidence over RUNNABLE activities only (counted_outcomes: "
             f"{data['scored_eligibility']}):"]
    lines.append("  activities per mastery dimension:")
    for dim, n in data["dimension_counts"]:
        lines.append(f"    {dim:<26} {n:>5}")
    lines.append(f"  can produce scored evidence: {scored_capable}")
    lines.append(f"  formative-only (speaking never scored; encounter files nothing): "
                 f"{formative_only}")
    lines.append(f"  no evidence possible (no runner, see layer 2): {no_evidence}")
    if unmapped:
        lines.append(f"  WARNING: {unmapped} activities ride a runner this tool has no "
                     "dimension for; update RUNNER_DIMENSION from the engine test.")
    return data, lines


AI_DRAFT_RE = re.compile(r"(?:\bAI\b|\bAI-|GPT|LLM|\bmodel\b|draft)", re.IGNORECASE)


def layer5_review(pack):
    sources = read_jsonl(pack / "sources.jsonl")
    licenses = Counter()
    flagged = []
    for row in sources:
        lic = (row.get("license") or {}).get("spdx") or "(none)"
        licenses[lic] += 1
        title = row.get("title") or ""
        if AI_DRAFT_RE.search(title):
            flagged.append({"id": row.get("id"), "title": title})
    media_rows = read_jsonl(pack / "media" / "manifest.jsonl")
    provenance = Counter((row.get("provenance") or "(none)") for row in media_rows)
    synthesizer = Counter(
        (row.get("synthesizer") or {}).get("runtime")
        for row in media_rows if (row.get("synthesizer") or {}).get("runtime")
    )

    review_dir = pack / "review"
    review_policy = (review_dir / "REVIEW_POLICY.yaml").is_file()
    reviewer_kit = (review_dir / "REVIEWER_KIT.md").is_file()
    worklists = []
    for path in sorted(review_dir.glob("WORKLIST-*.md")):
        m = re.search(r"WORKLIST-(\d{4}-\d{2}-\d{2})\.md$", path.name)
        entry = {"file": path.name, "date": m.group(1) if m else None}
        text = path.read_text(encoding="utf-8")
        entry["checkbox_open"] = len(re.findall(r"^\s*- \[ \]", text, re.MULTILINE))
        entry["checkbox_closed"] = len(re.findall(r"^\s*- \[x\]", text, re.MULTILINE))
        worklists.append(entry)
    newest = max((w for w in worklists if w["date"]), key=lambda w: w["date"], default=None)

    data = {
        "sources_total": len(sources),
        "sources_by_license_spdx": sorted_counter(licenses),
        "sources_flagged_ai_model_drafting": flagged,
        "media_rows_total": len(media_rows),
        "media_by_provenance": sorted_counter(provenance),
        "media_by_synthesizer_runtime": sorted_counter(synthesizer),
        "review_policy_present": review_policy,
        "reviewer_kit_present": reviewer_kit,
        "worklists": worklists,
        "newest_worklist": newest["file"] if newest else None,
        "newest_worklist_checkboxes": (
            {"open": newest["checkbox_open"], "closed": newest["checkbox_closed"]}
            if newest and (newest["checkbox_open"] or newest["checkbox_closed"])
            else None
        ),
    }
    lines = [f"  sources.jsonl: {len(sources)} sources, by license.spdx:"]
    for lic, n in data["sources_by_license_spdx"]:
        lines.append(f"    {lic:<16} {n:>4}")
    lines.append(f"  sources whose title mentions AI/model drafting: {len(flagged)}")
    for src in flagged:
        lines.append(f"    - {src['id']}: {src['title'][:100]}")
    lines.append(f"  media/manifest.jsonl: {len(media_rows)} rows, by provenance:")
    for prov, n in data["media_by_provenance"]:
        lines.append(f"    {prov:<16} {n:>4}")
    lines.append("  by synthesizer.runtime (where present):")
    for rt, n in data["media_by_synthesizer_runtime"]:
        lines.append(f"    {rt:<16} {n:>4}")
    lines.append(f"  review/: REVIEW_POLICY.yaml {'present' if review_policy else 'ABSENT'};"
                 f" REVIEWER_KIT.md {'present' if reviewer_kit else 'ABSENT'}")
    lines.append("  human review queues (dated WORKLIST-*.md):")
    for w in worklists:
        lines.append(f"    {w['file']}: open checkboxes {w['checkbox_open']},"
                     f" closed {w['checkbox_closed']}")
    if newest:
        if data["newest_worklist_checkboxes"]:
            cb = data["newest_worklist_checkboxes"]
            lines.append(f"  newest WORKLIST by filename date: {newest['file']}"
                         f" — open {cb['open']}, closed {cb['closed']}")
        else:
            lines.append(f"  newest WORKLIST by filename date: {newest['file']}"
                         " — contains no `- [ ]` / `- [x]` checkbox counts")
    lines.append("  review posture is not a coverage count")
    return data, lines


# ---------------------------------------------------------------------------
# main
# ---------------------------------------------------------------------------

def main():
    ap = argparse.ArgumentParser(
        description="Measure language-pack practice coverage as five separate counts.")
    ap.add_argument("--pack", action="append", default=None, metavar="DIR",
                    help="pack directory (repeatable); default: every languages/*/"
                         " containing manifest.yaml")
    ap.add_argument("--json", action="store_true", help="emit JSON instead of text")
    args = ap.parse_args()

    if args.pack:
        packs = sorted(Path(p).resolve() for p in args.pack)
    else:
        packs = sorted(p.parent for p in (REPO_ROOT / "languages").glob("*/manifest.yaml"))

    # LAYER 2 authority: parse the engine table (fails loudly if empty).
    table = parse_runner_table(LIB_RS)

    policy_data = yaml.safe_load(MASTERY_POLICY.read_text(encoding="utf-8")) or {}
    elig = policy_data.get("eligibility") or {}
    speaking_support = (policy_data.get("support") or {}).get("disqualifying_for", {}) \
        .get("production-speaking")

    preamble = {
        "policy_source": "docs/assessment/MASTERY_POLICY.yaml",
        "policy_version": policy_data.get("policy_version"),
        "status": policy_data.get("status"),
        "counted_outcomes": elig.get("counted_outcomes"),
        "never_linguistic": elig.get("never_linguistic"),
        "require_score_for_scored": elig.get("require_score_for_scored"),
        "thresholds_provisional": policy_data.get("status") == "provisional-hypotheses",
    }
    adr_actual_rel = ADR_SPEAKING_ACTUAL.relative_to(REPO_ROOT)
    footer = {
        "speaking_disqualifying_support_policy_line":
            f"support.disqualifying_for.production-speaking: {speaking_support}",
        "adr_decision_1_path": str(adr_actual_rel),
        "adr_decision_1_exists": ADR_SPEAKING_ACTUAL.is_file(),
    }

    out = {
        "engine_runner_table_source": str(LIB_RS.relative_to(REPO_ROOT)) + " :: fn activity_runner",
        "engine_runner_arms_parsed": len(table),
        "engine_runner_table": [
            {"type": t, "modality": mod, "runner": runner} for t, mod, runner in table
        ],
        "policy": preamble,
        "packs": [str(p.relative_to(REPO_ROOT)) if p.is_relative_to(REPO_ROOT) else str(p)
                  for p in packs],
        "declared": {},
        "runnable_practice": {},
        "servable_practice": {},
        "valid_evidence": {},
        "review_posture": {},
    }

    text = []
    text.append("LANGUAGE PACK COVERAGE MEASUREMENT — FIVE SEPARATE COUNTS")
    text.append("(the five layers are never collapsed or summed into one coverage number)")
    text.append("")
    text.append("POLICY PREAMBLE (docs/assessment/MASTERY_POLICY.yaml)")
    text.append(f"  policy_version: {preamble['policy_version']}   status: {preamble['status']}")
    text.append(f"  eligibility.counted_outcomes: {preamble['counted_outcomes']}")
    text.append(f"  eligibility.never_linguistic: {preamble['never_linguistic']}")
    text.append(f"  eligibility.require_score_for_scored: {preamble['require_score_for_scored']}")
    if preamble["thresholds_provisional"]:
        text.append("  status is `provisional-hypotheses`: every numeric threshold below is a")
        text.append("  provisional engineering hypothesis, not a calibrated constant.")
    text.append("")
    text.append(f"ENGINE RUNNABLE TABLE parsed from {LIB_RS.relative_to(REPO_ROOT)}"
                f" :: fn activity_runner — {len(table)} runner arms:")
    for t, mod, runner in table:
        text.append(f"  ({t!r}, {mod if mod is not None else '_ (any)'} => \"{runner}\")")
    if len(table) < 6:
        sys.stderr.write("activity_runner table not found\n")
        sys.exit(1)

    for pack in packs:
        rel = str(pack.relative_to(REPO_ROOT)) if pack.is_relative_to(REPO_ROOT) else str(pack)
        unit_files, activities = load_activities(pack)
        defined_ids = scan_defined_ids(pack)
        media_ids = scan_media_ids(pack)
        capabilities = load_capabilities(pack)

        d1, l1 = layer1_declared(pack, unit_files, activities)
        d2, l2 = layer2_runnable(pack, activities, table)
        d3, l3 = layer3_servable(activities, table, defined_ids, media_ids, capabilities)
        d4, l4 = layer4_evidence(activities, table, policy_data)
        d5, l5 = layer5_review(pack)

        out["declared"][rel] = d1
        out["runnable_practice"][rel] = d2
        out["servable_practice"][rel] = d3
        out["valid_evidence"][rel] = d4
        out["review_posture"][rel] = d5

        text.append("")
        text.append(f"================ PACK: {rel} ================")
        text.append("LAYER 1 — DECLARED (what the pack promises)")
        text.extend(l1)
        text.append("LAYER 2 — RUNNABLE PRACTICE (an engine runner exists for the pair)")
        text.extend(l2)
        text.append("LAYER 3 — SERVABLE PRACTICE (runnable AND the pack can actually serve it)")
        text.extend(l3)
        text.append("LAYER 4 — VALID EVIDENCE (can this activity produce evidence that may count?)")
        text.extend(l4)
        text.append("LAYER 5 — REVIEW POSTURE (is the content fit to ship, independent of runnability)")
        text.extend(l5)

    text.append("")
    text.append("FOOTER — SPEAKING EVIDENCE")
    text.append(f"  {footer['speaking_disqualifying_support_policy_line']}"
                "   (MASTERY_POLICY.yaml)")
    text.append("  A typed substitution NEVER yields valid speaking evidence: the engine")
    text.append("  refuses to score speaking attempts (`practice_submit_inner` refuses;")
    text.append("  `speaking_sentence_task_build` is guided-only), and the policy lists")
    text.append("  `text-input-substitution` as disqualifying support for `production-speaking`.")
    text.append(f"  ADR-0017 decision 1 (\"Speech feedback in desktop 1.0 is guided-only. No")
    text.append(f"  automated pronunciation score, no automatic pronunciation mastery\") is at:")
    text.append(f"  {footer['adr_decision_1_path']}")

    if args.json:
        print(json.dumps(out, indent=2, ensure_ascii=False, sort_keys=False))
    else:
        print("\n".join(text))


if __name__ == "__main__":
    main()
