#!/usr/bin/env python3
"""JA-KANJI-REFRESH-001: pinned, repeatable refresh path for the EDRDG-derived
kanji `radicals` lists in languages/ja-JP/kanji/{entries,a2-topics}.jsonl.

Successor to the O-07 one-off `derive-radicals-from-kradfile.py`. The upstream
input is the jmdict-simplified conversion of the EDRDG KRADFILE visible-component
data (CC BY-SA 4.0): the release asset `kradfile-<release>.json.tgz`, whose
single JSON member maps each kanji to its visible components in KRADFILE source
order, duplicates included. The pack's conversion is: dedup with source order
preserved (`list(dict.fromkeys(...))`).

Pin model (one stored pin, provenance-consistent):
  - The release pin is read from the pack itself: the `jmdict-simplified` row of
    languages/ja-JP/sources.jsonl carries "jmdict-simplified release <ver>, ..."
    in its title. There is no second copy of the version in this script, so an
    `audit-sources` failure on that row is a real signal that the declared
    provenance no longer matches the shipped data.
  - Per consumed download (the release asset and the extracted JSON member),
    the expected sha256 lives in EXPECTED_SHA256 keyed by release. Downloads
    are verified against the pins BEFORE any derivation; a mismatch aborts.

Modes:
  default (or --check)  download, verify, derive, report. NEVER writes pack
                        files. Against the pinned release this is the
                        byte-for-byte reproduction check; with --release
                        <newer> it prints a drift report instead.
  --release <ver>       derive from a different upstream release (drift check).
                        Unpinned inputs are hashed and reported, never written.
  --write               explicit human opt-in: rewrite only the "radicals" and
                        "sources" spans in place. Refused for a non-pinned
                        release unless --allow-unpinned is also given.

CI never refreshes pack content: scripts/ci.sh runs only the unit tests for
this module, never --write.
"""
import argparse
import hashlib
import io
import json
import re
import sys
import tarfile
import tempfile
import urllib.parse
import urllib.request
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
PACK_DIR = REPO_ROOT / "languages" / "ja-JP"
PACK_FILES = [PACK_DIR / "kanji" / "entries.jsonl", PACK_DIR / "kanji" / "a2-topics.jsonl"]
SOURCES_PATH = PACK_DIR / "sources.jsonl"
PIN_SOURCE_ID = "jmdict-simplified"

# sha256 of every consumed download, keyed by release:
#   "asset": kradfile-<release>.json.tgz as downloaded
#   "json":  the single .json member extracted from it
EXPECTED_SHA256 = {
    "3.6.2+20260928191014": {
        "asset": "5948198f92fe5afd2ed85f27d1b204b9a2fed258c128edaac147d73ee69c9d97",
        "json": "90369021899d89159ee6e079bccd7d83915daa3191f0c6ed7efc2473e088c086",
    },
}

NEW_SOURCE = "kradfile"  # the source that supplies these lists
ALLOWED_OLD_SOURCES = (["jf-standard"], ["jf-standard", "jmdict-simplified"])


class Abort(Exception):
    """Fatal condition; the run stops with exit code 2 and writes nothing."""


def parse_pin(sources_text: str) -> str:
    """Extract the release pin from the pack's own sources.jsonl text."""
    for ln, line in enumerate(sources_text.splitlines(), 1):
        if not line.strip():
            continue
        row = json.loads(line)
        if row.get("id") == PIN_SOURCE_ID:
            m = re.search(r"\b\d+\.\d+\.\d+\+\d{14}\b", row.get("title", ""))
            if not m:
                raise Abort(
                    f"sources.jsonl line {ln}: {PIN_SOURCE_ID!r} title carries no "
                    f"'release <version>' pin; provenance pin cannot be derived"
                )
            return m.group(0)
    raise Abort(f"sources.jsonl has no {PIN_SOURCE_ID!r} row to pin against")


def asset_name(release: str) -> str:
    return f"kradfile-{release}.json.tgz"


def sha256_of(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def verify_sha256(data: bytes, expected: str, label: str, release: str) -> str:
    got = sha256_of(data)
    if got != expected:
        raise Abort(
            f"sha256 mismatch for {label} of release {release}: "
            f"expected {expected}, got {got} - aborting before any derivation"
        )
    return got


def download_asset(release: str, workdir: Path) -> bytes:
    """Fetch the release asset (or reuse a cached copy in workdir)."""
    name = asset_name(release)
    cached = workdir / name
    if cached.exists():
        print(f"using cached download: {cached}")
        return cached.read_bytes()
    api = (
        "https://api.github.com/repos/scriptin/jmdict-simplified/releases/tags/"
        + urllib.parse.quote(release, safe="")
    )
    req = urllib.request.Request(api, headers={"Accept": "application/vnd.github+json"})
    with urllib.request.urlopen(req) as resp:
        release_doc = json.load(resp)
    urls = [
        a["browser_download_url"]
        for a in release_doc.get("assets", [])
        if a["name"] == name
    ]
    if not urls:
        raise Abort(f"release {release}: asset {name} not found")
    areq = urllib.request.Request(urls[0], headers={"Accept": "application/octet-stream"})
    with urllib.request.urlopen(areq) as resp:
        data = resp.read()
    cached.write_bytes(data)
    print(f"downloaded {name} -> {cached}")
    return data


def extract_json_member(tgz_bytes: bytes) -> "tuple[str, bytes]":
    """Return (member_name, raw bytes) of the single .json member."""
    with tarfile.open(fileobj=io.BytesIO(tgz_bytes), mode="r:gz") as tf:
        members = [m for m in tf.getmembers() if m.name.endswith(".json")]
        if len(members) != 1:
            raise Abort(
                "expected exactly one .json member in the tarball, got "
                + str([m.name for m in members])
            )
        member = tf.extractfile(members[0]).read()
    return members[0].name, member


def load_krad_verified(tgz_bytes: bytes, pins) -> dict:
    """Verify every consumed byte against the pins BEFORE deriving anything."""
    if pins:
        verify_sha256(tgz_bytes, pins["asset"], "downloaded asset", pins["release"])
    name, member = extract_json_member(tgz_bytes)
    if pins:
        verify_sha256(member, pins["json"], f"extracted {name}", pins["release"])
    try:
        doc = json.loads(member.decode("utf-8"))
        krad = doc["kanji"]
    except (ValueError, KeyError, UnicodeDecodeError) as exc:
        raise Abort(f"unexpected kradfile JSON structure: {exc}") from exc
    print(f"extracted {name}: {len(member)} B, {len(krad)} kanji entries")
    return krad


def convert(components) -> list:
    """Pack conversion of one kradfile component list: dedup, source order kept."""
    if not all(isinstance(c, str) and len(c) == 1 for c in components):
        raise Abort(f"non single-character component in {components!r}")
    out = list(dict.fromkeys(components))
    if not out:
        raise Abort("empty component list")
    return out


def find_span(line: str, key: str):
    """Return (start, end_excl) of the `"key": [...]` span, bracket-walked
    with JSON string awareness."""
    anchor = f'"{key}": ['
    i = line.index(anchor)
    j = i + len(anchor) - 1
    depth = 0
    in_str = False
    esc = False
    for k in range(j, len(line)):
        c = line[k]
        if in_str:
            if esc:
                esc = False
            elif c == "\\":
                esc = True
            elif c == '"':
                in_str = False
        else:
            if c == '"':
                in_str = True
            elif c == "[":
                depth += 1
            elif c == "]":
                depth -= 1
                if depth == 0:
                    return i, k + 1
    raise AssertionError(f"unbalanced span for {key}")


def arr_literal(items) -> str:
    return "[" + ", ".join(json.dumps(s, ensure_ascii=False) for s in items) + "]"


def load_pack_records(paths=PACK_FILES):
    """Read the shipped kanji JSONL files; return (path, line_no, obj, raw_line)."""
    records = []
    for path in paths:
        lines = path.read_text(encoding="utf-8").split("\n")
        if lines[-1] != "":
            raise Abort(f"{path}: file must end with a newline")
        for ln, line in enumerate(lines[:-1], 1):
            obj = json.loads(line)
            records.append((path, ln, obj, line))
    return records


def allowed_source_lists():
    out = set()
    for old in ALLOWED_OLD_SOURCES:
        out.add(tuple(old))
        out.add(tuple(dict.fromkeys(old + [NEW_SOURCE])))
    return out


def compare_pack(records, krad) -> dict:
    """Compare shipped spans against the derived lists. Pure: never writes."""
    stats = dict(
        records=0,
        byte_identical_radicals=0,
        byte_identical_sources=0,
        set_equal_order_diff=0,
        changed_set=0,
        removed_characters=[],
        changed_records=[],
    )
    allowed = allowed_source_lists()
    for path, ln, obj, line in records:
        char = obj["character"]
        if tuple(obj["sources"]) not in allowed:
            raise Abort(
                f"{path.name}:{ln}: sources {obj['sources']!r} is not a form this "
                "refresh path produces; pack content diverged outside it"
            )
        if char not in krad:
            stats["removed_characters"].append(
                {"file": path.name, "line": ln, "id": obj["id"], "character": char}
            )
            continue
        new_rad = convert(krad[char])
        new_src = list(dict.fromkeys(obj["sources"] + [NEW_SOURCE]))
        r0, r1 = find_span(line, "radicals")
        s0, s1 = find_span(line, "sources")
        stats["records"] += 1
        cur_rad = line[r0 + len('"radicals": ') : r1]
        new_rad_lit = arr_literal(new_rad)
        if cur_rad == new_rad_lit:
            stats["byte_identical_radicals"] += 1
        else:
            kind = (
                "order-only"
                if set(obj["radicals"]) == set(new_rad)
                else "set"
            )
            if kind == "order-only":
                stats["set_equal_order_diff"] += 1
            else:
                stats["changed_set"] += 1
            stats["changed_records"].append(
                {
                    "kind": kind,
                    "id": obj["id"],
                    "character": char,
                    "old": obj["radicals"],
                    "new": new_rad,
                }
            )
        cur_src = line[s0 + len('"sources": ') : s1]
        if cur_src == arr_literal(new_src):
            stats["byte_identical_sources"] += 1
        else:
            stats["changed_records"].append(
                {
                    "kind": "sources",
                    "id": obj["id"],
                    "character": char,
                    "old": obj["sources"],
                    "new": new_src,
                }
            )
    return stats


def write_pack(records, krad):
    """Opt-in in-place rewrite of the two spans only. Bytes outside the
    radicals/sources spans stay untouched; reparsed objects must match."""
    by_path = {}
    for path, ln, obj, line in records:
        by_path.setdefault(path, []).append((ln, obj, line))
    rewritten_files = []
    for path, entries in by_path.items():
        lines = path.read_text(encoding="utf-8").split("\n")
        assert lines[-1] == ""
        changed_any = False
        for ln, obj, line in entries:
            new_rad = convert(krad[obj["character"]])
            new_src = list(dict.fromkeys(obj["sources"] + [NEW_SOURCE]))
            new_line = line
            r0, r1 = find_span(new_line, "radicals")
            new_line = new_line[:r0] + '"radicals": ' + arr_literal(new_rad) + new_line[r1:]
            s0, s1 = find_span(new_line, "sources")
            new_line = new_line[:s0] + '"sources": ' + arr_literal(new_src) + new_line[s1:]
            new_obj = json.loads(new_line)
            assert list(new_obj.keys()) == list(obj.keys()), (path, ln)
            for k in obj:
                if k in ("radicals", "sources"):
                    continue
                assert new_obj[k] == obj[k], (path, ln, k)
            assert new_obj["radicals"] == new_rad
            assert new_obj["sources"] == new_src
            if new_line != line:
                lines[ln - 1] = new_line
                changed_any = True
        if changed_any:
            path.write_text("\n".join(lines) + "\n", encoding="utf-8")
            rewritten_files.append(str(path))
    return rewritten_files


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--check", action="store_true", help="explicit default: report only, never write")
    ap.add_argument("--write", action="store_true", help="human opt-in: rewrite the two spans in place")
    ap.add_argument("--release", help="upstream release to derive from (default: the pack's own pin)")
    ap.add_argument("--allow-unpinned", action="store_true", help="permit --write against a release with no sha256 pin")
    ap.add_argument("--workdir", help="download cache directory (default: a fresh temp dir)")
    args = ap.parse_args(argv)

    if args.write and args.check:
        print("ABORT: --check and --write are mutually exclusive", file=sys.stderr)
        return 2

    try:
        pin = parse_pin(SOURCES_PATH.read_text(encoding="utf-8"))
    except Abort as exc:
        print(f"ABORT: {exc}", file=sys.stderr)
        return 2
    release = args.release or pin
    print(f"pack pin (sources.jsonl {PIN_SOURCE_ID!r} row): {pin}")
    print(f"deriving from release: {release}" + ("" if release == pin else "  (NOT the pack pin)"))

    workdir = Path(args.workdir) if args.workdir else Path(tempfile.mkdtemp(prefix="o07-kanji-refresh-"))
    workdir.mkdir(parents=True, exist_ok=True)
    print(f"download cache: {workdir}")

    try:
        tgz = download_asset(release, workdir)
        name = asset_name(release)
        got = sha256_of(tgz)
        print(f"{name}: {len(tgz)} B sha256={got}")
        pins = EXPECTED_SHA256.get(release)
        if pins:
            print(f"{name}: sha256 pin OK")
        else:
            print(f"{name}: UNPINNED INPUT (no sha256 pin for this release); writes are refused")
        krad = load_krad_verified(tgz, {**(pins or {}), "release": release} if pins else None)
        records = load_pack_records()
        stats = compare_pack(records, krad)
    except Abort as exc:
        print(f"ABORT: {exc}", file=sys.stderr)
        return 2

    print(f"pack records carrying radicals: {stats['records']}")
    print(f"radicals spans byte-identical: {stats['byte_identical_radicals']}/{stats['records']}")
    print(f"sources spans byte-identical:  {stats['byte_identical_sources']}/{stats['records']}")
    print(f"changed radical sets: {stats['changed_set']}  order-only differences: {stats['set_equal_order_diff']}")
    if stats["changed_records"]:
        print("changed records:")
        print(json.dumps(stats["changed_records"], ensure_ascii=False, indent=2))
    if stats["removed_characters"]:
        print("characters in the pack that disappear from this release (their lists would have to be dropped or re-sourced):")
        print(json.dumps(stats["removed_characters"], ensure_ascii=False, indent=2))

    clean = (
        stats["byte_identical_radicals"] == stats["records"]
        and stats["byte_identical_sources"] == stats["records"]
        and not stats["removed_characters"]
    )

    if args.write:
        if pins is None and not args.allow_unpinned:
            print("ABORT: --write against an unpinned release needs --allow-unpinned", file=sys.stderr)
            return 2
        if clean:
            print("RESULT: already byte-for-byte identical; no file touched")
            return 0
        rewritten = write_pack(records, krad)
        print(f"WROTE {len(rewritten)} file(s): {rewritten}")
        print("human review + pack gates required before commit")
        return 0

    if clean:
        print("RESULT: REPRODUCED byte-for-byte against shipped pack data (check mode; nothing written)")
        return 0
    print("RESULT: DRIFT DETECTED (check mode; nothing written - a human must opt in via --write)")
    return 1


if __name__ == "__main__":
    sys.exit(main())
