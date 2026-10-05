#!/usr/bin/env python3
"""ja-JP batch 39: B2 units 445-449 (economics-work complete)."""
import json, os

R = "languages/ja-JP"
SRC = ["jf-standard", "ai-drafted-extension"]
NOTE = ("Framework-level sourcing only (JF Standard reference, no descriptor text copied); "
        "a dictionary/reviewer source must be added before verified status.")
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-04", "notes": "ai-assisted draft wording; qualified review pending."}

WORDS = [
 ("yokin","よきん","noun","bank deposit"),
 ("shiharai","しはらい","noun","payment"),
 ("akachin","あかちん","noun","deficit"),
 ("risoku","りそく","noun","interest"),
 ("yoyuu","よゆう","noun","leeway"),
 ("boeki","ぼえき","noun","trade"),
 ("sangyou","さんぎょう","noun","industry"),
 ("kumiai","くみあい","noun","union"),
 ("fuukyou","ふっきょう","noun","recession"),
 ("keiki","けいき","noun","business conditions"),
 ("kaso","かさ","noun","disparity"),
 ("toukei","とうけい","noun","statistics"),
 ("wariai","わりあい","noun","proportion"),
 ("gakureki","がくれき","noun","educational background"),
 ("kokugai","かいがい","noun","overseas"),
 ("douryoku","きょうりょく","noun","cooperation"),
 ("kenshu","けんしゅう","noun","training"),
 ("purojekuto","ぷろじぇくと","noun","project"),
 ("shinkoku","しんしゅつ","noun","market entry"),
 ("hanbai","はんばい","noun","sales"),
 ("naiken","ないてい","noun","job offer"),
 ("taishoku","たいしょく","noun","job resignation"),
 ("tenkin","てんきん","noun","job transfer"),
 ("nyuushoku","しゅうしょく","noun","finding employment"),
 ("dokusen","どくせん","noun","monopoly"),
]
assert len(WORDS) == 25, len(WORDS)

def entry(shard, rid, kana, pos, gloss, tag):
    return {"id": f"ja.lex.{shard}.{rid}", "status": "draft",
            "forms": [{"text": kana, "script": "hiragana", "is_primary": True}],
            "readings": [{"text": kana, "script": "hiragana"},
                         {"text": rid, "transliteration_system": "modified-hepburn"}],
            "glosses": {"en-US": [gloss]}, "part_of_speech": pos,
            "registers": ["ja.register.neutral-common"], "semantic_tags": [tag],
            "sources": SRC, "notes": NOTE, "generation": GEN}

with open(os.path.join(R, "lexicon", "economy2.jsonl"), "w") as f:
    for rid, kana, pos, gloss in WORDS:
        f.write(json.dumps(entry("economy2", rid, kana, pos, gloss, "economics"), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ja.grammar.b2.mono-da", "name": "〜ものだ (general tendency)", "category": "syntax",
  "definition": "ものだ expresses a general tendency or norm: しじょう は じき に ふくすう の へんか を ふくむ もの だ. Draft definition pending review."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("financial-literacy","よきん の ちえき を べんきょう しました。","yokin no chieki wo benkyou shimashita.","I studied the benefits of deposits.",["よきん"]),
 ("economic-history","ぼえき の れきし を べんきょう しました。","boeki no rekishi wo benkyou shimashita.","I studied the history of trade.",["ぼえき"]),
 ("inequality-data","かさ の データ を ぶんせき しました。","kaso no deeta wo bunseki shimashita.","I analyzed disparity data.",["かさ"]),
 ("workplace-motivation","けんしゅう で あたらしい じょうむ を おぼえました。","kenshu de atarashii joumu wo obiemashita.","I learned new duties at training.",["けんしゅう"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, romaji, gloss, cloze in SENTS:
        e = {"id": f"ja.sent.{sid}", "status": "draft", "text": text, "reading": text,
             "romaji": romaji, "gloss": gloss, "cloze_targets": cloze,
             "sources": SRC, "notes": "ai-assisted draft sentence; qualified review required before verified.",
             "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

U = [
 ("445-financial-literacy","financial literacy","financial-literacy","ja.goal.b2.economics-work",
  ["yokin","shiharai","akachin","risoku","yoyuu"], "s:financial-literacy"),
 ("446-economic-history","economic history","economic-history","ja.goal.b2.economics-work",
  ["boeki","sangyou","kumiai","fuukyou","keiki"], "s:economic-history"),
 ("447-inequality-data","inequality data","inequality-data","ja.goal.b2.economics-work",
  ["kaso","toukei","wariai","gakureki","kokugai"], "s:inequality-data"),
 ("448-workplace-motivation","workplace motivation","workplace-motivation","ja.goal.b2.economics-work",
  ["douryoku","kenshu","purojekuto","shinkoku","hanbai"], "s:workplace-motivation"),
 ("449-career-markets","career markets","career-markets","ja.goal.b2.economics-work",
  ["naiken","taishoku","tenkin","nyuushoku","dokusen"], "g:ja.grammar.b2.mono-da"),
]
OLD_SENTS = ["ja.sent.meeting-starts","ja.sent.reply-email","ja.sent.report-address",
             "ja.sent.work-company","ja.sent.interview-prep"]

def unit_yaml(topic, uid, goal, words, newitem):
    lex = [f"ja.lex.economy2.{w}" for w in words]
    if newitem.startswith("s:"):
        newref = f"ja.sent.{newitem[2:]}"
        allowed_gram = ["ja.grammar.particle.object-wo"]
    else:
        newref = newitem[2:]
        allowed_gram = [newref, "ja.grammar.particle.object-wo"]
    old = [s for s in OLD_SENTS if s != newref][:2]
    refs = lex + [newref] + old
    lines = [f"# ai-assisted draft unit (Mode B B2); content refs are pack data; qualified review pending.",
             f"id: ja.unit.{uid}", f"goal_id: {goal}",
             f"title: {topic}", f"summary: B2 language for {topic}.",
             "estimated_minutes: 6", "generation_contract:", "  allowed_vocab:"]
    for r in lex + [x for x in refs if x.startswith("ja.sent.")]: lines.append(f"  - {r}")
    lines.append("  allowed_grammar:")
    for g in allowed_gram: lines.append(f"  - {g}")
    lines += ["  new_item_budget: 6", "  validation_method: choice", "activities:"]
    acts = [("enc","encounter-read","reading",5),("listen","listen-and-choose","listening",3),
            ("match","match","reading",2),("speak","recall-choice","speaking",2)]
    for aid, atype, mod, sup in acts:
        lines += [f"- id: ja.activity.{uid}-{aid}", f"  type: {atype}", f"  modality: {mod}",
                  f"  support_level: {sup}", "  content_refs:"]
        for r in refs: lines.append(f"  - {r}")
    cloze_refs = [r for r in refs if r.startswith("ja.sent.")][:2]
    for i, cr in enumerate(cloze_refs):
        lines += [f"- id: ja.activity.{uid}-cloze{i}", "  type: cloze", "  modality: writing",
                  "  support_level: 2", "  content_refs:", f"  - {cr}"]
    return "\n".join(lines) + "\n"

for fname, topic, uid, goal, words, newitem in U:
    with open(os.path.join(R, "curriculum", "units", fname + ".yaml"), "w") as f:
        f.write(unit_yaml(topic, uid, goal, words, newitem))

print("batch39 written")
