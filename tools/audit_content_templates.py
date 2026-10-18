#!/usr/bin/env python3
"""Deterministic content-template repetition auditor (review finding R12).

Measures structural repetition signals in language packs so that
"thousands of units built from the same template" becomes a counted,
review-queueable finding instead of an impression.

Rules (all thresholds are CLI flags; defaults in add_arguments):
  leading-token   per sentence file: sentences whose text starts with the
                  same N-token prefix, flagged when the prefix covers
                  >= --leading-share of the file (fires AT the threshold).
  skeleton        per sentence band: sentences whose token skeleton (every
                  token outside a small built-in function-word list replaced
                  by a slot) repeats >= --skeleton-min times in one band.
  grammar-sets    per curriculum band: units whose grammar-concept reference
                  set (generation_contract.allowed_grammar plus content_refs
                  that look like grammar ids) is non-empty and identical
                  across >= --group-min units; the largest shared set and
                  its band are reported.
  stage-kinds     per unit: activities whose stage kinds never exceed ONE
                  distinct kind (e.g. only encounter-read + cloze, both
                  "scaffolded") are reported as "no scaffolded->independent->
                  changed-context progression detected".
  task-sequence    per unit declaring `task_sequence` (ADR-0037): each of
                  the five roles must name a distinct, resolvable pack
                  activity with an engine runner (parsed from lib.rs by
                  measure_language_coverage, never restated here);
                  input/scaffolded/independent must belong to the unit and
                  input must be an encounter stage; scaffolded carries
                  support (>= 1) while independent carries none (== 0);
                  transfer proves a context change; reuse is phase-gated
                  on the declaring unit; transfer/reuse units must share
                  the goal. Each --require-band lacking a complete
                  declaration is reported once per pack.

What this tool does NOT claim: it makes NO claim about CEFR level
correctness, linguistic quality, naturalness, or pedagogical validity.
A counted repetition signal is an input to qualified human review, not a
certification of instructional depth — identical counts and reference
resolution alone say nothing about teaching quality.

Exit codes: 0 always for warnings — these findings queue review, they do
not fail a build — UNLESS --fail-on-findings is passed, in which case the
exit code is 1 when any finding was produced (still 2 on usage/IO errors).

Pack/goal parsing is standard-library only: pack units/goals are block
YAML in a narrow subset, so a tiny deterministic subset parser is used
instead of PyYAML. The task-sequence rule additionally imports
measure_language_coverage (which needs PyYAML) to read the engine runner
table; if that import or parse fails, only the runnability check
degrades, into one task-sequence-unverifiable finding.
"""
import argparse
import json
import re
import sys
import unicodedata
from collections import Counter, defaultdict
from datetime import date
from pathlib import Path

# Single source for the engine runner table: measure_language_coverage
# parses `fn activity_runner` out of apps/desktop/src-tauri/src/lib.rs;
# the table is NEVER restated as a Python literal in this audit. The
# audit runs as `python tools/audit_content_templates.py`, so sys.path[0]
# is tools/ and this sibling import resolves. measure_language_coverage
# imports PyYAML at module level, so the import is guarded: when it is
# unavailable, runnability degrades to one task-sequence-unverifiable
# finding and the stdlib-only audit keeps working.
try:
    import measure_language_coverage as M
except ImportError:  # PyYAML missing: unverifiable runnability, not fatal
    M = None

VERSION = "1.0.0"

BAND_TOKENS = ("pre-a1", "on-ramp", "onramp", "a1", "a2", "b1", "b2", "c1", "c2")

# Activity type -> stage kind. Unknown types become their own kind
# ("type:<name>") so the report stays honest instead of guessing.
STAGE_KIND = {
    "encounter-read": "scaffolded",
    "encounter": "scaffolded",
    "listen-and-choose": "scaffolded",
    "match": "scaffolded",
    "cloze": "scaffolded",
    "fill-blank": "scaffolded",
    "dictation": "scaffolded",
    "comprehension": "scaffolded",
    "hvpt": "scaffolded",
    "recall": "independent",
    "recall-choice": "independent",
    "retrieval": "independent",
    "scenario": "changed-context",
}

# ADR-0037 task_sequence roles, in report order.
TASK_SEQUENCE_ROLES = ("input", "scaffolded", "independent", "transfer", "reuse")

# Encounter stage types, taken from the STAGE_KIND mapping that
# stage_kinds_of uses (that mapping labels encounters "scaffolded" for
# progression counting, so the encounter subset is the encounter-named
# keys). A task_sequence `input` activity must use one of these types.
ENCOUNTER_TYPES = tuple(t for t in STAGE_KIND if t.startswith("encounter"))

# Small, explicit, deterministic function-word/particle lists (lowercase,
# stress/diacritic-stripped). Content words are slotted; these are kept.
FUNCTION_WORDS = {
    # ru (stress stripped)
    "я", "в", "на", "и", "из", "у", "не", "без", "с", "к", "о", "а", "но",
    "это", "ты", "вы", "он", "она", "оно", "мы", "они", "мой", "моя", "моё",
    "мое", "наш", "наша", "наше", "твой", "твоя", "свой", "своя", "как", "что",
    "кто", "где", "когда", "почему", "бы", "ли", "же", "да", "нет", "мне",
    "нас", "нам", "тебя", "тебе", "его", "её", "ее", "их", "них", "неё",
    "нее", "ней", "ним", "нею", "ними", "за", "перед", "над", "под", "между",
    "при", "до", "после", "про", "то", "та", "тоже",
    # ja (romaji particles/auxiliaries; ja text is not space-separated so the
    # skeleton rule tokenizes the entry's romaji field when present)
    "wa", "ga", "o", "wo", "ni", "de", "e", "to", "ka", "no", "mo", "ne", "yo",
    "ya", "kara", "made", "yori", "hodo", "dake", "desu", "masu", "mata",
}

# ---------------------------------------------------------------------------
# text normalization / tokenization
# ---------------------------------------------------------------------------


def strip_combining(text):
    nfd = unicodedata.normalize("NFD", text)
    return "".join(ch for ch in nfd if not unicodedata.combining(ch))


def tokenize(text):
    """Whitespace-split, strip punctuation from token edges, lowercase,
    drop stress marks. Deterministic; no language model, no stemming."""
    text = strip_combining(text)
    out = []
    for raw in text.split():
        tok = raw.strip("!?.,:;\"'()[]{}-—«»、。！？・…").lower()
        if tok:
            out.append(tok)
    return out


def band_of_id(id_):
    """Band from an explicit band token inside a dotted id, else None."""
    for token in re.split(r"[.\-_]", id_.lower()):
        if token in BAND_TOKENS:
            return "on-ramp" if token in ("on-ramp", "onramp") else token
    return None


def canon_band(band):
    """One spelling per band so goals.yaml 'A2' and id-token 'a2' group
    together."""
    b = str(band).lower()
    return "on-ramp" if b in ("on-ramp", "onramp") else b


# ---------------------------------------------------------------------------
# minimal deterministic YAML-subset parser (block maps, block seqs of
# scalars/maps, flow seqs possibly multi-line incl. [], quoted/plain
# scalars, full-line and trailing comments). Values stay strings except
# empty flow collections; the auditor only reads names and lists.
# ---------------------------------------------------------------------------


def _strip_comment(line):
    out, quote = [], None
    for i, ch in enumerate(line):
        if quote:
            out.append(ch)
            if ch == quote:
                quote = None
        elif ch in "\"'":
            quote = ch
            out.append(ch)
        elif ch == "#" and (i == 0 or line[i - 1] in " \t"):
            break
        else:
            out.append(ch)
    return "".join(out).rstrip()


def _scalar(text):
    text = text.strip()
    if len(text) >= 2 and text[0] == text[-1] and text[0] in "\"'":
        return text[1:-1]
    return text


def _split_flow(inner):
    parts, depth, quote, buf = [], 0, None, []
    for ch in inner:
        if quote:
            buf.append(ch)
            if ch == quote:
                quote = None
        elif ch in "\"'":
            quote = ch
            buf.append(ch)
        elif ch in "[{":
            depth += 1
            buf.append(ch)
        elif ch in "]}":
            depth -= 1
            buf.append(ch)
        elif ch == "," and depth == 0:
            parts.append("".join(buf))
            buf = []
        else:
            buf.append(ch)
    if buf:
        parts.append("".join(buf))
    return [p for p in (s.strip() for s in parts) if p]


def _flow_value(lines, i, text):
    """text starts with '['; may span lines until balanced. Returns
    (list, next_index)."""
    joined, depth = text, text.count("[") - text.count("]")
    j = i
    while depth > 0 and j + 1 < len(lines):
        j += 1
        joined += " " + lines[j][1]
        depth += lines[j][1].count("[") - lines[j][1].count("]")
    inner = joined.strip()
    if inner.startswith("[") and inner.endswith("]"):
        inner = inner[1:-1]
    return [_scalar(p) for p in _split_flow(inner)], j + 1


_KEY_RE = re.compile(r"^([A-Za-z0-9_][A-Za-z0-9_.-]*):(?:\s+(.*))?$")


def _parse_lines(lines, i, indent):
    """Parse the block at column `indent` starting at line i.
    Returns (value, next_index)."""
    if i >= len(lines):
        return None, i
    if lines[i][1] == "-" or lines[i][1].startswith("- "):
        return _parse_seq(lines, i, indent)
    return _parse_map(lines, i, indent)


def _parse_map(lines, i, indent):
    result = {}
    while i < len(lines):
        ind, content = lines[i]
        if ind < indent or content == "-" or content.startswith("- "):
            break
        m = _KEY_RE.match(content)
        if not m:
            i += 1  # not a key line in our subset; skip deterministically
            continue
        key, val = m.group(1), (m.group(2) or "").strip()
        i += 1
        if val.startswith("["):
            result[key], i = _flow_value(lines, i - 1, val)
        elif val == "":
            if i < len(lines) and (
                lines[i][0] > indent
                or (lines[i][0] == indent and (lines[i][1] == "-" or lines[i][1].startswith("- ")))
            ):
                # block seq may sit at the SAME indent as its key (pack style)
                sub_indent = lines[i][0]
                if lines[i][1].startswith("-") and sub_indent == indent:
                    result[key], i = _parse_seq(lines, i, indent)
                else:
                    result[key], i = _parse_lines(lines, i, sub_indent)
            else:
                result[key] = None
        else:
            result[key] = _scalar(val)
    return result, i


def _parse_seq_item_map(lines, i, key_indent, first_m):
    """Parse a seq item that is a map ('- key: value'); first_m matched the
    inline 'key: value' part. Returns (entry_map, next_index)."""
    entry = {}
    key, val = first_m.group(1), (first_m.group(2) or "").strip()
    if val == "":
        if i < len(lines) and (
            lines[i][0] > key_indent
            or (lines[i][0] == key_indent and lines[i][1].startswith("-"))
        ):
            entry[key], i = _parse_lines(lines, i, lines[i][0])
        else:
            entry[key] = None
    elif val.startswith("["):
        entry[key], i = _flow_value(lines, i - 1, val)
    else:
        entry[key] = _scalar(val)
    rest, i = _parse_map(lines, i, key_indent)
    entry.update(rest)
    return entry, i


def _parse_seq(lines, i, indent):
    result = []
    while i < len(lines):
        ind, content = lines[i]
        if ind < indent or not (content == "-" or content.startswith("- ")):
            break
        item = content[1:].strip()
        i += 1
        if item == "":
            if i < len(lines) and lines[i][0] > indent:
                value, i = _parse_lines(lines, i, lines[i][0])
                result.append(value)
            else:
                result.append(None)
        elif item.startswith("["):
            value, i = _flow_value(lines, i - 1, item)
            result.append(value)
        else:
            m = _KEY_RE.match(item)
            if m:
                # seq item is a map: "- key: value"; the item map starts at
                # the column where the key begins.
                entry, i = _parse_seq_item_map(lines, i, ind + 2, m)
                result.append(entry)
            else:
                result.append(_scalar(item))
    return result, i


def parse_yaml_subset(text):
    lines = []
    for raw in text.splitlines():
        line = _strip_comment(raw.replace("\t", "    "))
        if not line.strip():
            continue
        lines.append((len(line) - len(line.lstrip(" ")), line.strip()))
    value, _ = _parse_lines(lines, 0, 0)
    return value


# ---------------------------------------------------------------------------
# pack loading
# ---------------------------------------------------------------------------


def load_jsonl(path):
    rows, errors = [], 0
    with path.open(encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                rows.append(json.loads(line))
            except json.JSONDecodeError:
                errors += 1
    return rows, errors


def load_units(pack):
    units_dir = pack / "curriculum" / "units"
    units, errors = [], 0
    if not units_dir.is_dir():
        return units, errors
    for path in sorted(units_dir.glob("*.yaml")) + sorted(units_dir.glob("*.yml")):
        try:
            data = parse_yaml_subset(path.read_text(encoding="utf-8"))
        except Exception:
            errors += 1
            continue
        if isinstance(data, dict) and data.get("id"):
            data["_file"] = str(path.relative_to(pack))
            units.append(data)
    return units, errors


def load_goal_bands(pack):
    path = pack / "curriculum" / "goals.yaml"
    bands = {}
    if not path.is_file():
        return bands
    data = parse_yaml_subset(path.read_text(encoding="utf-8"))
    goals = data.get("goals") if isinstance(data, dict) else None
    if isinstance(goals, list):
        for goal in goals:
            if isinstance(goal, dict) and goal.get("id") and goal.get("band"):
                bands[str(goal["id"])] = str(goal["band"])
    return bands


def unit_band(unit, goal_bands):
    goal_id = str(unit.get("goal_id") or "")
    band = goal_bands.get(goal_id)
    if band:
        return canon_band(band)
    return band_of_id(goal_id) or band_of_id(str(unit.get("id") or "")) or "unknown"


def grammar_refs(unit):
    refs = set()
    contract = unit.get("generation_contract")
    if isinstance(contract, dict):
        allowed = contract.get("allowed_grammar")
        if isinstance(allowed, list):
            refs.update(str(r) for r in allowed if r)
    for act in unit.get("activities") or []:
        if not isinstance(act, dict):
            continue
        for ref in act.get("content_refs") or []:
            ref = str(ref)
            if ".grammar." in ref:
                refs.add(ref)
    return refs


# ---------------------------------------------------------------------------
# rules
# ---------------------------------------------------------------------------


def sentence_files(pack):
    d = pack / "sentences"
    if not d.is_dir():
        return []
    return sorted(list(d.glob("*.jsonl")) + list(d.glob("*.json")))


def sentence_band(entry, unit_ref_bands):
    band = band_of_id(str(entry.get("id") or ""))
    if band:
        return band
    return unit_ref_bands.get(str(entry.get("id") or ""), "unbanded")


def rule_leading_token(rows, opts):
    findings = []
    n = opts.leading_n
    counts = Counter()
    total = 0
    for entry in rows:
        if not isinstance(entry, dict):
            continue
        text = entry.get("text")
        if not isinstance(text, str):
            continue
        toks = tokenize(text)
        if not toks:
            continue
        total += 1
        counts[" ".join(toks[:n])] += 1
    if not total:
        return findings
    for prefix, count in sorted(counts.items(), key=lambda x: (-x[1], x[0])):
        share = count / total
        if share >= opts.leading_share - 1e-9:
            findings.append(
                {
                    "rule": "leading-token",
                    "prefix_tokens": n,
                    "prefix": prefix,
                    "count": count,
                    "sentences": total,
                    "share": round(share, 4),
                }
            )
    return findings


def skeleton_of(entry):
    if not isinstance(entry, dict):
        return None
    text = entry.get("text")
    if not isinstance(text, str):
        return None
    toks = tokenize(text)
    if len(toks) <= 1 and " " not in text:
        romaji = entry.get("romaji")
        if isinstance(romaji, str) and romaji.strip():
            toks = tokenize(romaji)
    if not toks:
        return None
    return " ".join(t if t in FUNCTION_WORDS else "_" for t in toks)


def rule_skeleton(rows_by_band, opts):
    findings = []
    for band, rows in sorted(rows_by_band.items()):
        counts = Counter(s for s in (skeleton_of(r) for r in rows) if s)
        for skel, count in sorted(counts.items(), key=lambda x: (-x[1], x[0])):
            if count >= opts.skeleton_min and count > 1:
                findings.append(
                    {
                        "rule": "skeleton",
                        "band": band,
                        "skeleton": skel,
                        "count": count,
                    }
                )
    return findings


def rule_grammar_sets(units, goal_bands, opts):
    by_band = defaultdict(lambda: defaultdict(list))
    for unit in units:
        refs = grammar_refs(unit)
        if not refs:
            continue
        by_band[unit_band(unit, goal_bands)][frozenset(refs)].append(
            str(unit["id"])
        )
    findings = []
    for band, groups in sorted(by_band.items()):
        for refs, ids in groups.items():
            if len(ids) >= opts.group_min:
                findings.append(
                    {
                        "rule": "identical-grammar-sets",
                        "band": band,
                        "set_size": len(refs),
                        "grammar_refs": sorted(refs),
                        "units": sorted(ids),
                    }
                )
    return findings


def stage_kinds_of(unit):
    kinds, types = set(), []
    for act in unit.get("activities") or []:
        if not isinstance(act, dict):
            continue
        t = str(act.get("type") or "")
        if not t:
            continue
        types.append(t)
        kinds.add(STAGE_KIND.get(t, f"type:{t}"))
    if not kinds:
        kinds.add("no-typed-activities")
    return kinds, types


def rule_stage_kinds(units, goal_bands):
    findings = []
    for unit in units:
        kinds, types = stage_kinds_of(unit)
        if len(kinds) <= 1:
            findings.append(
                {
                    "rule": "no-stage-progression",
                    "unit": str(unit["id"]),
                    "band": unit_band(unit, goal_bands),
                    "stage_kinds": sorted(kinds),
                    "activity_types": sorted(set(types)),
                    "detail": "no scaffolded->independent->changed-context "
                    "progression detected",
                }
            )
    return findings


_RUNNER_TABLE = None  # memoized (entries, error); built once per run


def runner_table():
    """(entries, error): the engine's activity_runner arms parsed from
    apps/desktop/src-tauri/src/lib.rs via measure_language_coverage — the
    single source, built once per run. parse_runner_table FAILS LOUDLY
    (SystemExit) when the Rust shape drifts; that is caught here so the
    audit degrades to one task-sequence-unverifiable finding instead of
    failing CI. On failure entries is None and runnability checks are
    skipped."""
    global _RUNNER_TABLE
    if _RUNNER_TABLE is None:
        if M is None:
            _RUNNER_TABLE = (None, "measure_language_coverage is not importable")
        else:
            try:
                _RUNNER_TABLE = (M.parse_runner_table(M.LIB_RS), None)
            except (SystemExit, Exception) as exc:
                _RUNNER_TABLE = (
                    None,
                    f"activity_runner table unreadable in {M.LIB_RS}: {exc}",
                )
    return _RUNNER_TABLE


def _support_level(act):
    """Parsed YAML-subset values stay strings; return an int or None."""
    try:
        return int(str(act.get("support_level")).strip())
    except (TypeError, ValueError):
        return None


def _unit_content_refs(unit):
    refs = set()
    for act in unit.get("activities") or []:
        if isinstance(act, dict):
            refs.update(str(r) for r in act.get("content_refs") or [] if r)
    return refs


def rule_task_sequences(units, table, required_bands, goal_bands=None):
    """ADR-0037 unit-level `task_sequence` claims (schemas/v0.2). Only
    units declaring the key produce per-unit findings; units without it
    are silent (absence is reported once per required band). `table` is
    the engine runner entries, or None to skip runnability. Returns
    (findings, summary)."""
    goal_bands = goal_bands or {}
    findings = []

    # Pack-wide map: activity id -> (activity, owning unit). Role
    # resolution is by id alone, so ids owned by more than one activity
    # are tracked for the duplicate finding.
    acts, dup_ids = {}, set()
    for unit in units:
        for act in unit.get("activities") or []:
            if not isinstance(act, dict):
                continue
            aid = str(act.get("id") or "")
            if not aid:
                continue
            if aid in acts:
                dup_ids.add(aid)
            acts[aid] = (act, unit)

    declared = complete = 0
    reps = []
    by_band = defaultdict(int)
    for unit in units:
        if "task_sequence" not in unit:
            continue
        declared += 1
        uid = str(unit["id"])
        band = unit_band(unit, goal_bands)
        own = []

        def report(rule, detail, **extra):
            entry = {"rule": rule, "unit": uid, "band": band, "detail": detail}
            entry.update(extra)
            own.append(entry)

        seq = unit.get("task_sequence")
        if not isinstance(seq, dict):
            # The YAML subset turns a flow mapping such as
            # `task_sequence: { input: x }` into a plain string.
            report(
                "task-sequence-incomplete", "task_sequence must be a block mapping"
            )
            findings.extend(own)
            continue

        resolved = {}  # role -> (activity id, activity, owning unit)
        for role in TASK_SEQUENCE_ROLES:
            aid = seq.get(role)
            if not isinstance(aid, str) or not aid.strip():
                report("task-sequence-incomplete", f"role {role} is missing", role=role)
                continue
            aid = aid.strip()
            if aid in dup_ids:
                report(
                    "task-sequence-incomplete",
                    f"role {role} names duplicate activity id {aid}",
                    role=role,
                    activity=aid,
                )
                continue
            if aid not in acts:
                report(
                    "task-sequence-incomplete",
                    f"role {role} names unknown activity id {aid}",
                    role=role,
                    activity=aid,
                )
                continue
            clash = next((r for r, (a, _, _) in resolved.items() if a == aid), None)
            if clash:
                report(
                    "task-sequence-incomplete",
                    f"roles {clash} and {role} name the same activity {aid}",
                    role=role,
                    activity=aid,
                )
                continue
            resolved[role] = (aid, *acts[aid])

        goal_id = str(unit.get("goal_id") or "")
        own_refs = _unit_content_refs(unit)
        for role, (aid, act, owner) in resolved.items():
            oid = str(owner.get("id") or "")
            atype = str(act.get("type") or "")
            amod = str(act.get("modality") or "")
            if role in ("input", "scaffolded", "independent") and oid != uid:
                report(
                    "task-sequence-incomplete",
                    f"role {role} must name an activity of this unit "
                    f"(found in {oid})",
                    role=role,
                    activity=aid,
                )
            if role == "input" and atype not in ENCOUNTER_TYPES:
                report(
                    "task-sequence-incomplete",
                    f"role input must be an encounter stage; type {atype!r} "
                    f"maps to stage kind "
                    f"{STAGE_KIND.get(atype, 'type:' + atype)!r}",
                    role=role,
                    activity=aid,
                )
            if (
                M is not None
                and table is not None
                and M.runner_for(table, atype, amod) is None
            ):
                report(
                    "task-sequence-unrunnable",
                    f"role {role} activity {aid} ({atype}/{amod}) has no "
                    "engine runner in activity_runner",
                    role=role,
                    activity=aid,
                    type=atype,
                    modality=amod,
                )

        if "scaffolded" in resolved and "independent" in resolved:
            sc_act = resolved["scaffolded"][1]
            ind_act = resolved["independent"][1]
            bad = []
            sc = _support_level(sc_act)
            if sc is None or sc < 1:
                bad.append(
                    f"scaffolded support_level "
                    f"{sc_act.get('support_level')!r}"
                )
            ind = _support_level(ind_act)
            if ind != 0:
                bad.append(
                    f"independent support_level "
                    f"{ind_act.get('support_level')!r}"
                )
            if bad:
                report(
                    "task-sequence-no-scaffold",
                    "scaffolded must carry support (>= 1) and independent "
                    "none (== 0); got " + " and ".join(bad),
                )

        if "transfer" in resolved:
            aid, act, owner = resolved["transfer"]
            oid = str(owner.get("id") or "")
            if not str(act.get("scenario_id") or "").strip():
                if oid == uid:
                    report(
                        "task-sequence-no-context-change",
                        f"transfer activity {aid} names no scenario_id and "
                        "lives in this unit",
                        role="transfer",
                        activity=aid,
                    )
                elif not (_unit_content_refs(owner) & own_refs):
                    report(
                        "task-sequence-no-context-change",
                        f"transfer unit {oid} shares no content_refs with "
                        f"{uid} and transfer activity {aid} names no "
                        "scenario_id",
                        role="transfer",
                        activity=aid,
                    )

        if "reuse" in resolved:
            aid, _, owner = resolved["reuse"]
            oid = str(owner.get("id") or "")
            prereq = any(
                isinstance(e, dict) and str(e.get("unit") or "") == uid
                for e in owner.get("requires_unit") or []
            )
            if oid == uid:
                reason = f"reuse activity {aid} names an activity of this unit"
            elif not prereq:
                reason = f"unit {oid} does not list {uid} in requires_unit"
            elif not (_unit_content_refs(owner) & own_refs):
                reason = f"unit {oid} shares no content_refs with {uid}"
            else:
                reason = None
            if reason:
                report(
                    "task-sequence-no-reuse",
                    f"delayed reuse unproven: {reason}",
                    role="reuse",
                    activity=aid,
                )

        for role in ("transfer", "reuse"):
            if role in resolved:
                owner = resolved[role][2]
                ogoal = str(owner.get("goal_id") or "")
                if ogoal != goal_id:
                    report(
                        "task-sequence-incomplete",
                        f"sequence crosses goals: {role} unit "
                        f"{owner.get('id')} has goal {ogoal!r}, this unit "
                        f"has {goal_id!r}",
                        role=role,
                        activity=resolved[role][0],
                    )

        if own:
            findings.extend(own)
        else:
            complete += 1
            by_band[band] += 1
            reps.append(
                {
                    "unit": uid,
                    "goal": goal_id,
                    "band": band,
                    "stages": {r: resolved[r][0] for r in TASK_SEQUENCE_ROLES},
                }
            )

    # Absence is a per-band statement, never one finding per unit.
    seen = set()
    for band in required_bands:
        band = canon_band(band)
        if band in seen:
            continue
        seen.add(band)
        if not by_band.get(band):
            findings.append(
                {
                    "rule": "task-sequence-missing-band",
                    "band": band,
                    "detail": "no complete task_sequence declaration in this "
                    "band (--require-band)",
                }
            )

    reps.sort(key=lambda rep: (rep["band"], rep["unit"]))
    return findings, {
        "declared": declared,
        "complete": complete,
        "by_band": dict(sorted(by_band.items())),
        "representatives": reps,
    }


# ---------------------------------------------------------------------------
# pack audit
# ---------------------------------------------------------------------------


def audit_pack(pack_path, opts):
    pack = Path(pack_path)
    units, unit_errors = load_units(pack)
    goal_bands = load_goal_bands(pack)

    table, table_error = runner_table()
    task_sequence_findings, task_sequence_summary = rule_task_sequences(
        units, table, opts.require_band, goal_bands
    )
    if table_error:
        # Degrade rather than fail CI: one finding, runnability skipped,
        # every other check kept.
        task_sequence_findings.append(
            {
                "rule": "task-sequence-unverifiable",
                "detail": f"{table_error}; task-sequence runnability was not "
                "checked (every other check ran)",
            }
        )

    # sentence id -> band of a unit that references it
    unit_ref_bands = {}
    for unit in units:
        band = unit_band(unit, goal_bands)
        for act in unit.get("activities") or []:
            if isinstance(act, dict):
                for ref in act.get("content_refs") or []:
                    unit_ref_bands.setdefault(str(ref), band)
        contract = unit.get("generation_contract")
        if isinstance(contract, dict):
            for ref in contract.get("allowed_vocab") or []:
                unit_ref_bands.setdefault(str(ref), band)

    per_file = []
    rows_by_band = defaultdict(list)
    all_rows = []
    parse_errors = 0
    for path in sentence_files(pack):
        rows, errs = load_jsonl(path)
        parse_errors += errs
        rel = str(path.relative_to(pack))
        findings = rule_leading_token(rows, opts)
        for f in findings:
            f["file"] = rel
        per_file.append({"file": rel, "sentences": len(rows), "findings": findings})
        all_rows.extend(r for r in rows if isinstance(r, dict))
        for r in rows:
            if isinstance(r, dict) and isinstance(r.get("text"), str):
                rows_by_band[sentence_band(r, unit_ref_bands)].append(r)

    result = {
        "pack": str(pack_path),
        "counts": {
            "sentence_files": len(per_file),
            "sentences": len(all_rows),
            "units": len(units),
            "task_sequences_declared": task_sequence_summary["declared"],
            "task_sequences_complete": task_sequence_summary["complete"],
            "jsonl_parse_errors": parse_errors,
            "unit_parse_errors": unit_errors,
        },
        "leading_token": [f for pf in per_file for f in pf["findings"]],
        "skeleton": rule_skeleton(rows_by_band, opts),
        "grammar_sets": rule_grammar_sets(units, goal_bands, opts),
        "stage_kinds": rule_stage_kinds(units, goal_bands),
        # "task_sequence" carries the task-sequence findings, the
        # plural "task_sequences" the declared/complete summary.
        "task_sequence": task_sequence_findings,
        "task_sequences": task_sequence_summary,
    }
    result["finding_count"] = sum(
        len(result[k])
        for k in (
            "leading_token",
            "skeleton",
            "grammar_sets",
            "stage_kinds",
            "task_sequence",
        )
    )
    return result


# ---------------------------------------------------------------------------
# output
# ---------------------------------------------------------------------------

DISCLAIMER = (
    "Structural repetition signals measured from pack files only. These "
    "counts queue qualified human review; they make NO claim about CEFR "
    "level correctness, linguistic quality, or pedagogical validity, and "
    "reference resolution / identical counts do not certify instructional "
    "depth."
)


def _unit_list(units, limit=12):
    shown = ", ".join(units[:limit])
    if len(units) > limit:
        shown += f", … (+{len(units) - limit} more, see --json)"
    return shown


def _ts_scope(f, q=""):
    """What a task-sequence finding applies to: a declaring unit, a band,
    or the whole pack (table-unverifiable findings carry neither)."""
    if "unit" in f:
        return f"unit {q}{f['unit']}{q} (band {f['band']})"
    if "band" in f:
        return f"band {q}{f['band']}{q}"
    return "pack"


def render_text(results):
    out = ["content-template repetition audit", "=" * 40, DISCLAIMER, ""]
    for r in results:
        c = r["counts"]
        out.append(
            f"pack {r['pack']}: {c['sentences']} sentences in "
            f"{c['sentence_files']} file(s), {c['units']} units; "
            f"{r['finding_count']} finding(s)"
        )
        for f in r["leading_token"]:
            out.append(
                f"  [leading-token] {f['file']}: prefix {f['prefix']!r} "
                f"in {f['count']}/{f['sentences']} sentences "
                f"(share {f['share']:.2%})"
            )
        for f in r["skeleton"]:
            out.append(
                f"  [skeleton] band {f['band']}: skeleton "
                f"{f['skeleton']!r} repeated {f['count']}x"
            )
        for f in r["grammar_sets"]:
            out.append(
                f"  [identical-grammar-sets] band {f['band']}: "
                f"{len(f['units'])} units share the same {f['set_size']}-element "
                f"grammar-concept set: {_unit_list(f['units'])}"
            )
        for f in r["stage_kinds"]:
            out.append(
                f"  [no-stage-progression] unit {f['unit']} (band "
                f"{f['band']}): activity types {f['activity_types']} "
                f"= stage kinds {f['stage_kinds']}; {f['detail']}"
            )
        ts = r["task_sequences"]
        out.append(
            f"Task sequences: declared {ts['declared']}, complete "
            f"{ts['complete']}"
        )
        for band, n in ts["by_band"].items():
            out.append(f"  band {band}: {n} complete")
        for rep in ts["representatives"]:
            stages = " ".join(
                f"{role}={rep['stages'][role]}" for role in TASK_SEQUENCE_ROLES
            )
            out.append(
                f"  band {rep['band']}: unit {rep['unit']} "
                f"(goal {rep['goal']}): {stages}"
            )
        for f in r["task_sequence"]:
            out.append(f"  [{f['rule']}] {_ts_scope(f)}: {f['detail']}")
        out.append("")
    return "\n".join(out).rstrip() + "\n"


def render_review_section(results, opts):
    stamp = opts.date or date.today().isoformat()
    lines = [
        f"## Content-template repetition audit ({stamp}) — machine-measured, review-pending",
        "",
        "Machine check: `python tools/audit_content_templates.py --json "
        + " ".join(opts.packs)
        + "`",
        "",
        DISCLAIMER,
        "",
    ]
    groups = [
        (
            "leading-token",
            "leading_token",
            lambda f: f"prefix `{f['prefix']}` covers {f['count']}/"
            f"{f['sentences']} of `{f['file']}` ({f['share']:.2%})",
        ),
        (
            "skeleton",
            "skeleton",
            lambda f: f"band {f['band']}: skeleton `{f['skeleton']}` "
            f"repeated {f['count']}x",
        ),
        (
            "identical-grammar-sets",
            "grammar_sets",
            lambda f: f"band {f['band']}: {len(f['units'])} units share one "
            f"{f['set_size']}-element grammar-concept set "
            f"({_unit_list(f['units'])})",
        ),
        (
            "no-stage-progression",
            "stage_kinds",
            lambda f: f"unit `{f['unit']}` (band {f['band']}): types "
            f"{f['activity_types']} never exceed stage kinds {f['stage_kinds']}",
        ),
        (
            "task-sequence-incomplete",
            "task_sequence",
            lambda f: f"{_ts_scope(f, '`')}: {f['detail']}",
        ),
        (
            "task-sequence-unrunnable",
            "task_sequence",
            lambda f: f"{_ts_scope(f, '`')}: role {f['role']} activity "
            f"`{f['activity']}` type `{f['type']}`/modality "
            f"`{f['modality']}` has no engine runner",
        ),
        (
            "task-sequence-no-scaffold",
            "task_sequence",
            lambda f: f"{_ts_scope(f, '`')}: {f['detail']}",
        ),
        (
            "task-sequence-no-context-change",
            "task_sequence",
            lambda f: f"{_ts_scope(f, '`')}: {f['detail']}",
        ),
        (
            "task-sequence-no-reuse",
            "task_sequence",
            lambda f: f"{_ts_scope(f, '`')}: {f['detail']}",
        ),
        (
            "task-sequence-missing-band",
            "task_sequence",
            lambda f: f"band `{f['band']}`: {f['detail']}",
        ),
        (
            "task-sequence-unverifiable",
            "task_sequence",
            lambda f: f"{_ts_scope(f, '`')}: {f['detail']}",
        ),
    ]
    for r in results:
        c = r["counts"]
        lines += [
            f"### Pack `{r['pack']}`",
            "",
            f"Measured {c['sentences']} sentences in {c['sentence_files']} "
            f"file(s) and {c['units']} curriculum units; "
            f"{r['finding_count']} structural finding(s). Each needs "
            "qualified human review (REVIEW-001); none is a CEFR or "
            "quality judgment.",
            "",
        ]
        if r["finding_count"] == 0:
            lines += ["- no structural repetition findings at current thresholds.", ""]
            continue
        for label, key, fmt in groups:
            # The group label is the finding's rule name, so the seven
            # task-sequence rules sharing one result list each get their
            # own review group.
            items = [f for f in r[key] if f.get("rule") == label]
            if not items:
                continue
            lines.append(f"- {label} — {len(items)} finding(s):")
            for f in items:
                lines.append(
                    f"  - [ ] {fmt(f)} — pattern is ai-drafted-template "
                    "shaped, needs calibrated human review."
                )
            lines.append("")
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def add_arguments(parser):
    parser.add_argument("packs", nargs="+", help="pack directories, e.g. languages/ru-RU")
    parser.add_argument("--leading-n", type=int, default=1,
                        help="leading-token prefix length (default 1)")
    parser.add_argument("--leading-share", type=float, default=0.15,
                        help="flag prefixes covering at least this share of a "
                             "sentence file (default 0.15)")
    parser.add_argument("--skeleton-min", type=int, default=2,
                        help="flag skeletons repeated >= this many times in a "
                             "band (default 2)")
    parser.add_argument("--group-min", type=int, default=2,
                        help="flag identical non-empty grammar-concept sets "
                             "shared by >= this many units (default 2)")
    parser.add_argument("--require-band", action="append", metavar="BAND",
                        default=["a2", "b1", "b2"],
                        help="bands that must hold at least one complete "
                             "task_sequence declaration (repeatable, "
                             "case-insensitive; default a2 b1 b2)")
    parser.add_argument("--json", action="store_true",
                        help="emit machine-readable JSON instead of the text report")
    parser.add_argument("--write-review", metavar="PATH",
                        help="append a review-queue section (WORKLIST style) to PATH")
    parser.add_argument("--date", help="date stamp for the review section (default today)")
    parser.add_argument("--fail-on-findings", action="store_true",
                        help="exit 1 when findings exist (default: warnings never fail a build)")
    return parser


def main(argv=None):
    opts = add_arguments(
        argparse.ArgumentParser(prog="audit_content_templates.py")
    ).parse_args(argv)
    results = []
    for pack in opts.packs:
        p = Path(pack)
        if not p.is_dir():
            print(f"error: not a pack directory: {pack}", file=sys.stderr)
            return 2
        results.append(audit_pack(p, opts))
    if opts.json:
        print(
            json.dumps(
                {
                    "tool": "audit_content_templates",
                    "version": VERSION,
                    "disclaimer": DISCLAIMER,
                    "packs": results,
                },
                indent=2,
                ensure_ascii=False,
            )
        )
    else:
        print(render_text(results), end="")
    if opts.write_review:
        path = Path(opts.write_review)
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("a", encoding="utf-8") as fh:
            fh.write("\n" + render_review_section(results, opts))
    total = sum(r["finding_count"] for r in results)
    return 1 if (opts.fail_on_findings and total) else 0


if __name__ == "__main__":
    sys.exit(main())
