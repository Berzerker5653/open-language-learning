#!/usr/bin/env python3
"""Learner-facing copy auditor (review finding I04).

The renderer is the learner-facing surface: anything reachable from a string
literal or a JSX text node can end up in a sentence a learner reads. Internal
work identifiers (ticket ids, ADR numbers, gate codes, ledger task names) belong
in documents, code comments and the handoff ledger — not in that sentence.

Rules (lexical, not a full parse; the scanner keeps its own comment/string
state so a `//` inside a URL and a `/*` inside prose are handled):
  string   a string literal whose contents contain an internal identifier,
           unless the literal is a hook or a wiring token (data-*/className/id/
           src/href/key/for/htmlFor attributes, `import`/`from` specifiers, or
           the `testid` argument of `getByTestId`/`querySelector`).
  jsx-text the text between a closing tag and the next tag in a .tsx file.
Comment bodies are never findings: they are where those ids *should* live.
Files named `*.test.*` / `*.spec.*` are skipped: a test name is a developer
assertion about behaviour, not copy a learner sees.

Identifier families tracked: the ticket ids used across this repo (K-n, BLK-n,
W-n, RT-n, TTS-n, LEARN-n), ADR numbers, owner decisions (O-0n), pack/release
and ledger gate ids (PACK-n, REL-n, ACC-n, SEC-n, REVIEW-n, RL-n), and the
per-language content gates (JA-XXn, RU-XXn).

What this tool does NOT claim: an id-free surface is not a claim that the copy
is clear, age-appropriate, accessible or pedagogically correct. That judgement
stays with a qualified human; this gate only keeps the project's bookkeeping
out of what the learner reads.
"""

import argparse
import json
import re
import sys
from pathlib import Path

VERSION = "1.0.0"

DEFAULT_ROOTS = ["apps/desktop/src", "packages/ui/src"]

ID_RE = re.compile(
    r"\b(?:"
    r"K-\d+"
    r"|BLK-\d+"
    r"|W-\d+"
    r"|RT-\d+"
    r"|TTS-\d+"
    r"|LEARN-\d+"
    r"|ADR-\d+"
    r"|O-0\d+"
    r"|PACK-\d+"
    r"|REL-\d+"
    r"|ACC-\d+"
    r"|SEC-\d+"
    r"|REVIEW-\d+"
    r"|RL-\d+"
    r"|JA-[A-Z]{2}\d+"
    r"|RU-[A-Z]{2}\d+"
    r")\b"
)

# Attribute names whose value is a wiring token rather than learner copy.
WIRING_ATTR_RE = re.compile(
    r"(?:^|[\s{(,])(?:data-[\w-]+|className|class|id|src|href|to|for|htmlFor|key|ref|role|testid)="
    r"\s*$"
)
IMPORT_CTX_RE = re.compile(r"(?:from|import|require|case|in)\s*$")
GET_BY_TESTID_RE = re.compile(r"(?:getByTestId|queryByTestId|findByTestId|querySelector|getElementById)\s*\(\s*$")
JSX_TEXT_RE = re.compile(r">([^<>{}\n]{2,})<")


def scan_source(text):
    """Return findings (line, kind, excerpt, matched id) for one source file."""
    findings = []
    n = len(text)
    i = 0
    line = 1
    while i < n:
        c = text[i]
        if c == "\n":
            line += 1
            i += 1
            continue
        if c == "/" and text[i + 1 : i + 2] == "/":
            end = text.find("\n", i)
            i = n if end < 0 else end
            continue
        if c == "/" and text[i + 1 : i + 2] == "*":
            end = text.find("*/", i + 2)
            end = n if end < 0 else end + 2
            line += text.count("\n", i, end)
            i = end
            continue
        if c in "\"'`":
            quote = c
            j = i + 1
            body = []
            while j < n and text[j] != quote:
                if text[j] == "\\":
                    j += 2
                    continue
                if text[j] == "\n" and quote != "`":
                    break
                body.append(text[j])
                j += 1
            body = "".join(body)
            match = ID_RE.search(body)
            if match and not _is_wiring(text, i):
                findings.append((line, "string", body.strip()[:90], match.group(0)))
            line += text.count("\n", i, j + 1)
            i = j + 1
            continue
        i += 1
    return findings


def _is_wiring(text, quote_start):
    """True when the literal at `quote_start` is a hook/wiring token."""
    head = text[:quote_start]
    return bool(
        WIRING_ATTR_RE.search(head)
        or IMPORT_CTX_RE.search(head)
        or GET_BY_TESTID_RE.search(head)
    )


def strip_comments(text):
    """Blank out comment bodies so JSX scanning cannot see them."""
    out = []
    i = 0
    n = len(text)
    while i < n:
        c = text[i]
        if c == "/" and text[i + 1 : i + 2] == "/":
            end = text.find("\n", i)
            end = n if end < 0 else end
            out.append(" " * (end - i))
            i = end
            continue
        if c == "/" and text[i + 1 : i + 2] == "*":
            end = text.find("*/", i + 2)
            end = n if end < 0 else end + 2
            out.append("".join(ch if ch == "\n" else " " for ch in text[i:end]))
            i = end
            continue
        out.append(c)
        i += 1
    return "".join(out)


def audit_file(path):
    text = path.read_text(encoding="utf-8")
    findings = []
    for line, kind, excerpt, matched in scan_source(text):
        findings.append(
            {"file": str(path), "line": line, "kind": kind, "id": matched, "text": excerpt}
        )
    if path.suffix == ".tsx":
        stripped = strip_comments(text)
        for line, node in _jsx_text_nodes(stripped):
            match = ID_RE.search(node)
            if match:
                findings.append(
                    {
                        "file": str(path),
                        "line": line,
                        "kind": "jsx-text",
                        "id": match.group(0),
                        "text": node.strip()[:90],
                    }
                )
    return findings


def _jsx_text_nodes(stripped):
    """(line, text) for each text node between tags, comment bodies removed."""
    for m in JSX_TEXT_RE.finditer(stripped):
        node = m.group(1).strip()
        if not node:
            continue
        yield stripped.count("\n", 0, m.start()) + 1, node


def audit_roots(roots):
    scanned = 0
    skipped = 0
    findings = []
    for root in roots:
        p = Path(root)
        if not p.is_dir():
            raise SystemExit(f"error: not a source directory: {root}")
        for path in sorted(p.rglob("*.ts*")):
            if ".test." in path.name or ".spec." in path.name:
                skipped += 1
                continue
            if path.suffix not in (".ts", ".tsx"):
                continue
            scanned += 1
            findings.extend(audit_file(path))
    return scanned, skipped, findings


def render(scanned, skipped, findings):
    lines = [
        f"LEARNER COPY AUDIT v{VERSION}: {scanned} source files scanned, "
        f"{skipped} test files skipped"
    ]
    for f in findings:
        lines.append(f"  {f['file']}:{f['line']}  {f['kind']}  {f['id']}  {f['text']}")
    lines.append(f"findings: {len(findings)}")
    return "\n".join(lines) + "\n"


def add_arguments(parser):
    parser.add_argument("roots", nargs="*", default=DEFAULT_ROOTS, help="source directories")
    parser.add_argument("--json", action="store_true", help="emit JSON instead of text")
    return parser


def main(argv=None):
    opts = add_arguments(
        argparse.ArgumentParser(prog="audit_learner_copy.py")
    ).parse_args(argv)
    roots = opts.roots or DEFAULT_ROOTS
    scanned, skipped, findings = audit_roots(roots)
    if opts.json:
        print(
            json.dumps(
                {
                    "tool": "audit_learner_copy",
                    "version": VERSION,
                    "scanned": scanned,
                    "skipped_tests": skipped,
                    "findings": findings,
                },
                indent=2,
            )
        )
    else:
        print(render(scanned, skipped, findings), end="")
    return 1 if findings else 0


if __name__ == "__main__":
    sys.exit(main())
