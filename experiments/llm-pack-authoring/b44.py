#!/usr/bin/env python3
"""ja-JP batch 44: B2 units 490-494 (literature-study cont)."""
import json, os

R = "languages/ja-JP"
SRC = ["jf-standard", "ai-drafted-extension"]
NOTE = ("Framework-level sourcing only (JF Standard reference, no descriptor text copied); "
        "a dictionary/reviewer source must be added before verified status.")
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-04", "notes": "ai-assisted draft wording; qualified review pending."}

WORDS = [
 ("shiteisha","していしゃ","noun","narrator"),
 ("shitei","してい","noun","viewpoint"),
 ("dokusha","どくしゃ","noun","reader"),
 ("dokusho","どくしょ","noun","reading"),
 ("kotoba","ことば","noun","word"),
 ("shanru","しゃんる","noun","genre"),
 ("haikei","はいけい","noun","background"),
 ("bunken","ぶんけん","noun","literature"),
 ("shoseki","しょせき","noun","book"),
 ("shuppan","しゅっぱん","noun","publishing"),
 ("sakubun","さくぶん","noun","composition"),
 ("chiyaku","ちやく","noun","supporting role"),
 ("bunpatsu","ぶんぱつ","noun","phrase"),
 ("goju","ごじゅ","noun","phrase"),
 ("shuppan-sha","しゅっぱんしゃ","noun","publisher"),
 ("ku","く","noun","verse"),
 ("maku","まく","noun","act"),
 ("jo","じょ","noun","preface"),
 ("maki","まき","noun","volume"),
 ("hen","へん","noun","chapter"),
 ("honyaku-ka","ほんやくか","noun","translator"),
 ("yakubun","やくぶん","noun","translated text"),
 ("genbun","げんぶん","noun","original text"),
 ("jiten","じてん","noun","dictionary"),
 ("reibun","れいぶん","noun","example sentence"),
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

with open(os.path.join(R, "lexicon", "lit2.jsonl"), "w") as f:
    for rid, kana, pos, gloss in WORDS:
        f.write(json.dumps(entry("lit2", rid, kana, pos, gloss, "literature"), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ja.grammar.b2.ni-kagite", "name": "〜に限って (only in the case of)", "category": "syntax",
  "definition": "に限って restricts to a special case: じょうほう にかぎって はんのう する. Draft definition pending review."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("narrator-analysis","してい の ちがい を べんきょう しました。","shitei no chigai wo benkyou shimashita.","I studied the difference in viewpoint.",["してい"]),
 ("symbol-reading","ぶんけん の けんきゅう を しました。","bunken no kenkyuu wo shimashita.","I did research on literature.",["ぶんけん"]),
 ("genre-comparison","しゃんる の ぶんるい を べんきょう しました。","shanru no bunrui wo benkyou shimashita.","I studied the classification of genres.",["しゃんる"]),
 ("translation-comparison","ほんやく の げんぶん を よみました。","honyaku no genbun wo yomimashita.","I read the original text of a translation.",["ほんやく"]),
 ("author-context","じょ の ないよう を べんきょう しました。","jo no naiyou wo benkyou shimashita.","I studied the content of the preface.",["じょ"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, romaji, gloss, cloze in SENTS:
        e = {"id": f"ja.sent.{sid}", "status": "draft", "text": text, "reading": text,
             "romaji": romaji, "gloss": gloss, "cloze_targets": cloze,
             "sources": SRC, "notes": "ai-assisted draft sentence; qualified review required before verified.",
             "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

U = [
 ("490-narrator-analysis","narrator analysis","narrator-analysis","ja.goal.b2.literature-study",
  ["shiteisha","shitei","dokusha","dokusho","kotoba"], "s:narrator-analysis"),
 ("491-symbol-reading","symbol reading","symbol-reading","ja.goal.b2.literature-study",
  ["shanru","haikei","bunken","shoseki","shuppan"], "s:symbol-reading"),
 ("492-genre-comparison","genre comparison","genre-comparison","ja.goal.b2.literature-study",
  ["sakubun","chiyaku","bunpatsu","goju","shuppan-sha"], "s:genre-comparison"),
 ("493-author-context","author context","author-context","ja.goal.b2.literature-study",
  ["ku","maku","jo","maki","hen"], "s:author-context"),
 ("494-translation-comparison","translation comparison","translation-comparison","ja.goal.b2.literature-study",
  ["honyaku-ka","yakubun","genbun","jiten","reibun"], "g:ja.grammar.b2.ni-kagite"),
]
OLD_SENTS = ["ja.sent.meeting-starts","ja.sent.reply-email","ja.sent.report-address",
             "ja.sent.work-company","ja.sent.interview-prep"]

def unit_yaml(topic, uid, goal, words, newitem):
    lex = [f"ja.lex.lit2.{w}" for w in words]
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

print("batch44 written")
