#!/usr/bin/env python3
"""ja-JP batch 45: B2 units 495-499 (literature-study complete)."""
import json, os

R = "languages/ja-JP"
SRC = ["jf-standard", "ai-drafted-extension"]
NOTE = ("Framework-level sourcing only (JF Standard reference, no descriptor text copied); "
        "a dictionary/reviewer source must be added before verified status.")
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-04", "notes": "ai-assisted draft wording; qualified review pending."}

WORDS = [
 ("jou","じょう","noun","upper volume"),
 ("rei","れい","noun","example"),
 ("yakimoku","やくもく","noun","assigned role"),
 ("hanmoto","はんもと","noun","publisher"),
 ("moji","もじ","noun","character"),
 ("kansatsu","かんさつ","noun","observation"),
 ("kyoumu","きょうむ","noun","interest"),
 ("shinmi","しんみ","noun","depth"),
 ("omomi","おもみ","noun","weight"),
 ("hakken","はっけん","noun","discovery"),
 ("ronsetsu","ろんせつ","noun","essay"),
 ("kijutsu","きじゅつ","noun","description"),
 ("genpon","げんぽん","noun","original book"),
 ("henkan","へんかん","noun","editing"),
 ("sousaku","そうさく","noun","creation"),
 ("butai","ぶたい","noun","stage"),
 ("serifu","せりふ","noun","dialogue"),
 ("kyogen","きょうげん","noun","kyogen play"),
 ("kabuki","かぶき","noun","kabuki"),
 ("engei","えんぎ","noun","acting"),
 ("yohyaku","ようやく","noun","summary"),
 ("gaiyou","がいよう","noun","outline"),
 ("hihyou","ひひょう","noun","criticism"),
 ("shoukai","しょうかい","noun","introduction"),
 ("saku","さく","noun","work"),
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

with open(os.path.join(R, "lexicon", "lit3.jsonl"), "w") as f:
    for rid, kana, pos, gloss in WORDS:
        f.write(json.dumps(entry("lit3", rid, kana, pos, gloss, "literature"), ensure_ascii=False) + "\n")
GRAMMAR = [
 {"id": "ja.grammar.b2.ni-yoru-to", "name": "〜によると (according to)", "category": "syntax",
  "definition": "によると marks an information source: ぶんけん によると はんのう が ある. Draft definition pending review."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("literary-vocabulary","じょう の ぶんしょう を よみました。","jou no bunshou wo yomimashita.","I read the text of the upper volume.",["じょう"]),
 ("close-reading","かんさつ の ほうほう を べんきょう しました。","kansatsu no houhou wo benkyou shimashita.","I studied methods of observation.",["かんさつ"]),
 ("essay-on-novel","きじゅつ の てきすと を べんきょう しました。","kijutsu no tekisuto wo benkyou shimashita.","I studied a descriptive text.",["きじゅつ"]),
 ("theatre-text","せりふ の ちょうし を かんがえました。","serifu no choushi wo kangaemashita.","I considered the rhythm of the dialogue.",["せりふ"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, romaji, gloss, cloze in SENTS:
        e = {"id": f"ja.sent.{sid}", "status": "draft", "text": text, "reading": text,
             "romaji": romaji, "gloss": gloss, "cloze_targets": cloze,
             "sources": SRC, "notes": "ai-assisted draft sentence; qualified review required before verified.",
             "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

U = [
 ("495-literary-vocabulary","literary vocabulary","literary-vocabulary","ja.goal.b2.literature-study",
  ["jou","rei","yakimoku","hanmoto","moji"], "s:literary-vocabulary"),
 ("496-close-reading","close reading","close-reading","ja.goal.b2.literature-study",
  ["kansatsu","kyoumu","shinmi","omomi","hakken"], "s:close-reading"),
 ("497-essay-on-novel","essay on novel","essay-on-novel","ja.goal.b2.literature-study",
  ["ronsetsu","kijutsu","genpon","henkan","sousaku"], "s:essay-on-novel"),
 ("498-theatre-text","theatre text","theatre-text","ja.goal.b2.literature-study",
  ["butai","serifu","kyogen","kabuki","engei"], "s:theatre-text"),
 ("499-literature-essay","literature essay","literature-essay","ja.goal.b2.literature-study",
  ["yohyaku","gaiyou","hihyou","shoukai","saku"], "g:ja.grammar.b2.ni-yoru-to"),
]
OLD_SENTS = ["ja.sent.meeting-starts","ja.sent.reply-email","ja.sent.report-address",
             "ja.sent.work-company","ja.sent.interview-prep"]

def unit_yaml(topic, uid, goal, words, newitem):
    lex = [f"ja.lex.lit3.{w}" for w in words]
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

print("batch45 written")
