#!/usr/bin/env python3
"""READABILITY-GATE-001 — authoring-time readability validator.

Russio/NuanceDeck discipline: no story/lesson sentence may contain more
than ONE lemma outside the pack's declared band lexicon. Sentences that
violate are rejected with reason codes that NAME the offending lemmas;
each rejection also emits a regeneration request carrying those lemmas
as explicit negative hints, so the authoring generation loop can
rewrite the sentence and re-submit it through --recheck until it
passes. Violations and requests are logged as pack-build evidence.

Known-lexicon source for a real learner profile (acceptance 3): the
local confirm/mine ledger in the app's SQLite store. A surface becomes
known once the learner mined it, and every lemma of a content item the
profile CONFIRMED (CONTENT-CONFIRM-001) counts as known for that
profile. A cold profile (no ledger rows, or no --known-db) falls back
to the pack band list alone.

Declared band lexicon for band B (deterministic, no network):
  * glue: the FUNC/CORE whitelist shared with tools/vocab-budget-check.py
  * the cumulative story drill pools (state/data/story-vocab-pools-2026-11.json),
    bands ordered on-ramp < a1 < a2 < b1 < b2
  * lexicon entries that DECLARE a band <= B via the v0.2 `band` field
  * ledger-known lemmas (see above)

A sentence's band is its id segment (ru.sent.<band>.<topic>); ids whose
segment is not a band (e.g. the content-parity shard `cp`) resolve via
--band, and without it get an honest `band_undeclared` diagnostic
instead of a silent guess.

Lemmatization authority: pymorphy3 (repo venv), the same pinned
tooling as scripts/build-morphology-table.py and
tools/vocab-budget-check.py. ru packs only this lane; other locales
exit 2 with a clear message (never a silent pass).

Usage:
  python3 tools/readability-gate.py --pack languages/ru-RU \
      [--band a2] [--known-db PATH --profile ID --pack-id ID] \
      [--requests-out requests.jsonl] [--evidence-out DIR]
  python3 tools/readability-gate.py --pack languages/ru-RU --recheck candidates.jsonl

Exit 0 = every checked sentence within the gate; 1 = violations
(author chain must regenerate or lexicon entries must be added);
2 = usage/environment error. Output is deterministic: sorted ids.
"""
from __future__ import annotations

import argparse
import glob
import importlib.util
import json
import os
import re
import sqlite3
import sys
import unicodedata

BANDS = ["on-ramp", "a1", "a2", "b1", "b2", "c1", "c2"]
STRESS = "\u0301"


def load_vocab_budget_module(repo_root):
    """Share the FUNC/CORE glue whitelist with vocab-budget-check.py
    (single source of truth; hyphenated module loads by path)."""
    path = os.path.join(repo_root, "tools", "vocab-budget-check.py")
    spec = importlib.util.spec_from_file_location("vocab_budget_check", path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def norm_token(word: str) -> str:
    """Same normalization as the morphology sidecar: strip U+0301,
    lowercase, NFC."""
    return unicodedata.normalize("NFC", word.replace(STRESS, "").lower())


def words(text: str):
    for w in re.findall(r"[а-яё]+(?:-[а-яё]+)?", text.lower()):
        for part in w.split("-"):
            yield norm_token(part)


def sentence_band(sent_id: str):
    seg = sent_id.split(".")[2] if len(sent_id.split(".")) > 2 else ""
    return seg if seg in BANDS else None


def load_pack(pack_dir):
    """Return (locale, {id: text} sentences, stories {id: [sent ids]},
    {band: set(lemmas)} declared-by-field, missing sentence refs)."""
    manifest = os.path.join(pack_dir, "manifest.yaml")
    locale = None
    with open(manifest, encoding="utf-8") as fh:
        for line in fh:
            m = re.match(r"^\s*target_locale:\s*\"?([A-Za-z0-9-]+)\"?", line)
            if m:
                locale = m.group(1)
                break
    sents = {}
    for path in sorted(glob.glob(os.path.join(pack_dir, "sentences", "*.jsonl"))):
        with open(path, encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if not line:
                    continue
                rec = json.loads(line)
                sents[rec["id"]] = rec.get("text", "")
    stories = {}
    for path in sorted(glob.glob(os.path.join(pack_dir, "stories", "*.yaml"))):
        sid = None
        refs = []
        in_sentences = False
        with open(path, encoding="utf-8") as fh:
            for line in fh:
                m = re.match(r"^id:\s*(\S+)", line)
                if m:
                    sid = m.group(1)
                if re.match(r"^sentences:", line):
                    in_sentences = True
                    continue
                if in_sentences:
                    m = re.match(r"^\s+-\s*(\S+)", line)
                    if m:
                        refs.append(m.group(1))
                        continue
                    if line.strip() and not line.startswith((" ", "\t", "#")):
                        in_sentences = False
        if sid:
            stories[sid] = refs
    band_lex = {b: set() for b in BANDS}
    for path in sorted(glob.glob(os.path.join(pack_dir, "lexicon", "*.jsonl"))):
        with open(path, encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if not line:
                    continue
                rec = json.loads(line)
                band = rec.get("band")
                if band and band.lower() in BANDS:
                    for f in rec.get("forms", []):
                        t = norm_token(f.get("text", ""))
                        if re.fullmatch(r"[а-яё-]+", t):
                            band_lex[band.lower()].add(t)
    return locale, sents, stories, band_lex


def known_sets(pack_dir, band_lex, mp):
    """Cumulative known-lemma sets per band, from pools + band-tagged
    lexicon + glue. Ledger-known is layered on top afterwards."""
    pools_path = None
    for cand in (
        os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                     "state", "data", "story-vocab-pools-2026-11.json"),
    ):
        if os.path.exists(cand):
            pools_path = cand
            break
    vb = load_vocab_budget_module(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    glue = {mp.parse(w)[0].normal_form
            for w in vb.FUNC + vb.CORE if re.fullmatch(r"[а-яё-]+", w)}
    pool = {}
    if pools_path:
        raw = json.load(open(pools_path, encoding="utf-8"))
        for lvl, forms in raw.items():
            pool[lvl.lower()] = {mp.parse(f)[0].normal_form for f in forms
                                 if re.fullmatch(r"[а-яё-]+", norm_token(f))}
    known = {}
    acc = set(glue)
    for b in BANDS:
        acc |= pool.get(b, set())
        acc |= band_lex.get(b, set())
        known[b] = set(acc)
    return known


def ledger_known(db_path, profile_id, pack_id, sents, stories, mp):
    """Lemma set known through the confirm/mine ledger. Mined surfaces
    are known; every lemma of a confirmed content item (sentence, or
    every sentence of a confirmed story) is known for that profile."""
    con = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
    known = set()

    def q(sql, params=()):
        try:
            return list(con.execute(sql, params))
        except sqlite3.OperationalError as exc:
            # a genuinely cold store may predate the ledger migrations:
            # an absent table is an empty ledger, not an error.
            if "no such table" in str(exc):
                return []
            raise

    for (surface,) in q(
            "SELECT surface FROM mined_items WHERE profile_id = ?", (profile_id,)):
        for w in words(surface):
            known.add(mp.parse(w)[0].normal_form)
    for (content_id,) in q(
            "SELECT content_id FROM content_confirmations WHERE profile_id = ? AND pack_id = ?",
            (profile_id, pack_id)):
        texts = []
        if content_id in sents:
            texts.append(sents[content_id])
        elif content_id in stories:
            texts.extend(sents[s] for s in stories[content_id] if s in sents)
        for t in texts:
            for w in words(t):
                known.add(mp.parse(w)[0].normal_form)
    con.close()
    return known


def check_sentence(sent_id, text, band, known, mp):
    unknown = set()
    for w in words(text):
        lem = mp.parse(w)[0].normal_form
        if lem not in known[band]:
            unknown.add(lem)
    if len(unknown) > 1:
        return sorted(unknown)
    return None


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[1])
    ap.add_argument("--pack", required=True, help="pack dir (e.g. languages/ru-RU)")
    ap.add_argument("--band", choices=[b.lower() for b in BANDS],
                    help="band for sentences whose id segment is not a band")
    ap.add_argument("--known-db", help="app SQLite store for ledger-known words")
    ap.add_argument("--profile", help="profile id for the ledger source")
    ap.add_argument("--pack-id", help="pack id as installed (ledger confirm join)")
    ap.add_argument("--recheck", metavar="FILE",
                    help="regenerated candidates jsonl {id?, band, text}: "
                         "re-run the gate; emits updated negative hints")
    ap.add_argument("--requests-out", metavar="FILE",
                    help="write regeneration requests (negative hints) here")
    ap.add_argument("--evidence-out", metavar="DIR",
                    help="write violations.jsonl + summary.json here")
    args = ap.parse_args()

    import pymorphy3
    mp = pymorphy3.MorphAnalyzer()

    if args.recheck:
        # Loop step: the authoring chain regenerated candidates; a
        # candidate whose band set already contains it passes, else its
        # NEW offending lemmas become the updated negative hints.
        locale, sents, stories, band_lex = load_pack(args.pack)
        known = known_sets(args.pack, band_lex, mp)
        if args.known_db:
            extra = ledger_known(args.known_db, args.profile,
                                 args.pack_id or "", sents, stories, mp)
            for b in known:
                known[b] |= extra
        bad = 0
        with open(args.recheck, encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if not line:
                    continue
                rec = json.loads(line)
                band = (rec.get("band") or args.band or "").lower()
                if band not in BANDS:
                    print(f"REJECT {rec.get('id', '?')}: readability_band_undeclared")
                    bad += 1
                    continue
                offenders = check_sentence(rec.get("id", ""), rec["text"],
                                           band, known, mp)
                if offenders:
                    print(f"REJECT {rec.get('id', '?')}: "
                          f"readability_unknown_lemma:{','.join(offenders)} "
                          f"negative_hints:{json.dumps(offenders, ensure_ascii=False)}")
                    bad += 1
                else:
                    print(f"PASS {rec.get('id', '?')}")
        sys.exit(1 if bad else 0)

    locale, sents, stories, band_lex = load_pack(args.pack)
    if not (locale or "").lower().startswith("ru"):
        print(f"readability_gate_unsupported_locale: {locale} "
              "(lemmatizer lane covers ru packs only)", file=sys.stderr)
        sys.exit(2)
    known = known_sets(args.pack, band_lex, mp)
    ledger_used = False
    if args.known_db:
        if not args.profile:
            print("--known-db requires --profile", file=sys.stderr)
            sys.exit(2)
        extra = ledger_known(args.known_db, args.profile,
                             args.pack_id or "", sents, stories, mp)
        for b in known:
            known[b] |= extra
        ledger_used = len(extra) > 0
        if not ledger_used:
            print("note: ledger empty for this profile — cold profile, "
                  "fell back to the pack band list")

    violations = []
    requests = []

    # Lesson sentences (every shard under sentences/).
    lesson_rejected = set()
    for sent_id in sorted(sents):
        band = sentence_band(sent_id) or (args.band or "")
        if band not in BANDS:
            violations.append({"kind": "band_undeclared", "source": sent_id,
                               "text": sents[sent_id]})
            continue
        offenders = check_sentence(sent_id, sents[sent_id], band, known, mp)
        if offenders:
            lesson_rejected.add(sent_id)
            violations.append({"kind": "unknown_lemma", "source": sent_id,
                               "band": band, "lemmas": offenders,
                               "text": sents[sent_id]})
            requests.append({"kind": "regeneration_request", "id": sent_id,
                             "band": band, "text": sents[sent_id],
                             "negative_hints": offenders,
                             "instruction": "rewrite this sentence using only "
                             "band-known lemmas plus at most ONE new lemma; "
                             "the listed lemmas must NOT appear"})

    # Story coverage (acceptance names story AND lesson sentences).
    for story_id in sorted(stories):
        refs = stories[story_id]
        bands = [b for b in (sentence_band(r) for r in refs) if b in BANDS]
        band = max(bands, key=BANDS.index) if bands else (args.band or "")
        if band not in BANDS:
            continue  # already flagged per-sentence as band_undeclared
        for ref in refs:
            if ref not in sents:
                violations.append({"kind": "story_sentence_missing",
                                   "source": story_id, "ref": ref})
                continue
            offenders = check_sentence(ref, sents[ref], band, known, mp)
            if offenders and ref in lesson_rejected:
                continue  # regeneration request already emitted at the
                          # sentence's own band in the lesson pass
            if offenders:
                violations.append({"kind": "unknown_lemma", "source": story_id,
                                   "ref": ref, "band": band, "lemmas": offenders,
                                   "text": sents[ref]})
                requests.append({"kind": "regeneration_request", "id": ref,
                                 "band": band, "text": sents[ref],
                                 "story": story_id, "negative_hints": offenders,
                                 "instruction": "rewrite using only band-known "
                                 "lemmas plus at most ONE new lemma; the listed "
                                 "lemmas must NOT appear"})

    rejections = [v for v in violations if v["kind"] == "unknown_lemma"]
    summary = {
        "gate": "READABILITY-GATE-001",
        "pack": args.pack,
        "locale": locale,
        "sentences_checked": len(sents),
        "stories_checked": len(stories),
        "ledger_known_source": "confirm/mine ledger" if ledger_used else "pack band list (cold profile)",
        "rejections": len(rejections),
        "band_undeclared": sum(1 for v in violations if v["kind"] == "band_undeclared"),
        "regeneration_requests": len(requests),
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    for v in violations:
        if v["kind"] == "unknown_lemma":
            print(f"REJECT {v['source']}{'#' + v['ref'] if 'ref' in v else ''} "
                  f"({v['band']}): readability_unknown_lemma:{','.join(v['lemmas'])}")
        elif v["kind"] == "band_undeclared":
            print(f"DIAG {v['source']}: readability_band_undeclared")
    if args.evidence_out:
        os.makedirs(args.evidence_out, exist_ok=True)
        with open(os.path.join(args.evidence_out, "violations.jsonl"), "w",
                  encoding="utf-8") as fh:
            for v in violations:
                fh.write(json.dumps(v, ensure_ascii=False, sort_keys=True) + "\n")
        with open(os.path.join(args.evidence_out, "summary.json"), "w",
                  encoding="utf-8") as fh:
            json.dump(summary, fh, ensure_ascii=False, indent=2)
            fh.write("\n")
    if args.requests_out:
        with open(args.requests_out, "w", encoding="utf-8") as fh:
            for r in requests:
                fh.write(json.dumps(r, ensure_ascii=False, sort_keys=True) + "\n")
    sys.exit(1 if rejections or any(v["kind"] == "story_sentence_missing"
                                    for v in violations) else 0)


if __name__ == "__main__":
    main()
