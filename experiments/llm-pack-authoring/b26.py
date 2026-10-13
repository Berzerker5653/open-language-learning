#!/usr/bin/env python3
"""Batch 26: ja-JP B1 units 310-319 (environment part 1)."""
import json, os
from pathlib import Path

R = str(Path(__file__).resolve().parents[2] / "languages/ja-JP")
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-04", "notes": "ai-assisted draft wording; qualified review pending."}
SRC = ["jf-standard", "ai-drafted-extension"]
NOTE = ("Framework-level sourcing only (JF Standard reference, no descriptor text copied); "
        "a dictionary/reviewer source must be added before verified status.")

WORDS = [
 ("kikou","きこう","noun","climate"),
 ("saitei","さいてい","noun","lowest"),
 ("risaikuru","りさいくる","noun","recycling"),
 ("kikaku","きかく","noun","specification"),
 ("puratsu","ぷらつ","noun","plate"),
 ("gomi-bunkatsu","ごみぶんかつ","noun","waste sorting"),
 ("seisaku","せいさく","noun","creation; production"),
 ("denryoku","でんりょく","noun","electric power"),
 ("ene","えね","noun","energy"),
 ("kiko-ene","きこえね","noun","renewable energy"),
 ("genryo","げんりょう","noun","reduction"),
 ("mottainai","もったいない","i-adjective","wasteful"),
 ("eco","エコ","noun","eco"),
 ("jiten-sha","じてんしゃ","noun","bicycle"),
 ("hogo","ほご","noun","protection"),
 ("ikubutsu","いくぶつ","noun","living thing"),
 ("doubutsu","どうぶつ","noun","animal"),
 ("tochi","とち","noun","land"),
 ("seita","せいた","noun","ecosystem"),
 ("kan","かん","noun","can"),
 ("bin","びん","noun","bottle"),
 ("tane","たね","noun","seed"),
 ("shokubutsu","しょくぶつ","noun","plant"),
 ("norikae","のりかえ","noun","transfer (transport)"),
 ("chikyuu","ちきゅう","noun","earth"),
 ("ozone","オゾン","noun","ozone"),
 ("tan-so-ka","たんそか","noun","carbonization"),
 ("kaisui","かいすい","noun","seawater"),
 ("nouka","のうか","noun","farmer"),
 ("michi","みち","noun","road"),
 ("sora","そら","noun","sky"),
 ("purastic","ぷらすちっく","noun","plastic"),
 ("air","エア","noun","air"),
 ("eco-bag","エコバッグ","noun","eco bag"),
 ("eco-kuruma","エコくるま","noun","eco car"),
 ("aruki","あるき","noun","walking"),
 ("seibutsu","せいぶつ","noun","living thing"),
 ("happyou","はっぴょう","noun","announcement"),
 ("genki","げんき","na-adjective","energetic"),
 ("sanpuru","さんぷる","noun","sample"),
 ("kiko","きこ","noun","machine"),
 ("ene-ki","えねき","noun","power plant"),
 ("denki","でんき","noun","electricity"),
 ("shinpan","しんぱん","noun","judgment"),
 ("kankyou-hozen","かんきょうほぜん","noun","environmental conservation"),
 ("shizen-hogo","しぜんほご","noun","nature conservation"),
 ("koushou","こうしょう","noun","emission"),
 ("hoan","ほうあん","noun","plan"),
 ("seizou","せいぞう","noun","manufacturing"),
 ("seisi","せいし","noun","cleanliness"),
]
assert len(WORDS) == 50, len(WORDS)

with open(os.path.join(R, "lexicon", "env.jsonl"), "w") as f:
    for rid, kana, pos, gloss in WORDS:
        e = {"id": f"ja.lex.env.{rid}", "status": "draft",
             "forms": [{"text": kana, "script": "hiragana", "is_primary": True}],
             "readings": [{"text": kana, "script": "hiragana"},
                          {"text": rid, "transliteration_system": "modified-hepburn"}],
             "glosses": {"en-US": [gloss]}, "part_of_speech": pos,
             "registers": ["ja.register.neutral-common"], "semantic_tags": ["environment"],
             "sources": SRC, "notes": NOTE, "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ja.grammar.b1.shieki-ukemi", "name": "causative-passive (forced to)", "category": "morphology",
  "definition": "The causative-passive marks being made to act: しゃかい が ぜんぶ の じん を さんか させられました (society made everyone participate). Draft definition pending review."},
 {"id": "ja.grammar.b1.ni-yotte", "name": "〜により (by / through, formal)", "category": "syntax",
  "definition": "により marks agency in formal passive: ほうせい は しみん により つくられました; it also means means or variation: ばしょ により ことなる. Draft definition pending review."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("climate-lowest","きこう の へんか で さいてい きお が あがりました。","kikou no henka de saitei kio ga agarimashita.","With climate change the lowest temperature rose.",["さいてい"]),
 ("recycle-bottle","びん と かんと ぷらすちっく を りさいくる しました。","bin to kan to purasuchikku wo risaikuru shimashita.","I recycled bottles, cans, and plastic.",["りさいくる"]),
 ("energy-wind","かざい の エネルギー で でんき を つくります。","kazai no enerugii de denki wo tsukurimasu.","We make electricity from wind energy.",["えね"]),
 ("waste-reduce","ごみ を げんりょう して、エコバッグ を つかいます。","gomi wo genryou shite, ekobaggu wo tsukaimasu.","We reduce waste and use eco bags.",["げんりょう"]),
 ("eco-transport","じてんしゃ で かいしゃ まで いきます。","jitensha de kaisha made ikimasu.","I go to work by bicycle.",["じてんしゃ"]),
 ("nature-protect","しぜん ほご の かつどう に さんか しました。","shizen hogo no katsudou ni sanka shimashita.","I joined nature-protection activities.",["しぜんほご"]),
 ("wildlife-talk","この ちほう の どうぶつ が へって います。","kono chiho no doubutsu ga hettemasu.","The animals in this region are decreasing.",["どうぶつ"]),
 ("pollution-problem","こうじょう の こうしょう が もんだい です。","koujou no koushou ga mondai desu.","Factory emissions are a problem.",["こうしょう"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, romaji, gloss, cloze in SENTS:
        e = {"id": f"ja.sent.{sid}", "status": "draft", "text": text, "reading": text,
             "romaji": romaji, "gloss": gloss, "cloze_targets": cloze,
             "sources": SRC, "notes": "ai-assisted draft sentence; qualified review required before verified.",
             "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

ASSESS = {"id": "ja.assess.environment", "goal_id": "ja.goal.b1.environment",
          "kind": "transfer", "modality": "interaction",
          "rubric": {"scale": "observed", "criteria": [
              "describe recycling, energy, and waste choices using environment vocabulary",
              "discuss a pollution or nature-protection issue without blocking errors"]},
          "review_status": "draft"}
with open(os.path.join(R, "assessments", "definitions.jsonl"), "a") as f:
    f.write(json.dumps(ASSESS, ensure_ascii=False) + "\n")

U = [
 ("310-weather-versus-climate","weather versus climate","weather-climate","ja.goal.b1.environment",
  ["kikou","saitei","air","chikyuu","sora"], "s:climate-lowest"),
 ("311-recycling-systems","recycling systems","recycling-systems","ja.goal.b1.environment",
  ["risaikuru","bin","kan","purastic","gomi-bunkatsu"], "s:recycle-bottle"),
 ("312-energy-choices","energy choices","energy-choices","ja.goal.b1.environment",
  ["ene","denryoku","kiko-ene","ene-ki","denki"], "s:energy-wind"),
 ("313-reducing-waste","reducing waste","reducing-waste","ja.goal.b1.environment",
  ["genryo","mottainai","eco","eco-bag","puratsu"], "s:waste-reduce"),
 ("314-eco-transport","eco transport","eco-transport","ja.goal.b1.environment",
  ["jiten-sha","aruki","eco-kuruma","norikae","michi"], "s:eco-transport"),
 ("315-nature-protection","nature protection","nature-protection","ja.goal.b1.environment",
  ["hogo","shizen-hogo","kankyou-hozen","seibutsu","ikubutsu"], "s:nature-protect"),
 ("316-wildlife-discussion","wildlife discussion","wildlife-discussion","ja.goal.b1.environment",
  ["doubutsu","tane","shokubutsu","seita","tochi"], "s:wildlife-talk"),
 ("317-pollution-problems","pollution problems","pollution-problems","ja.goal.b1.environment",
  ["koushou","kaisui","ozone","tan-so-ka","seisi"], "s:pollution-problem"),
 ("318-sustainable-shopping","sustainable shopping","sustainable-shopping","ja.goal.b1.environment",
  ["nouka","sanpuru","kiko","shinpan","kikaku"], "g:ja.grammar.b1.shieki-ukemi"),
 ("319-environmental-policy","environmental policy","environmental-policy","ja.goal.b1.environment",
  ["happyou","genki","seizou","seisaku","hoan"], "g:ja.grammar.b1.ni-yotte"),
]
OLD_SENTS = ["ja.sent.meeting-starts","ja.sent.reply-email","ja.sent.report-address",
             "ja.sent.work-company","ja.sent.interview-prep"]

def unit_yaml(topic, uid, goal, words, newitem):
    lex = [f"ja.lex.env.{w}" for w in words]
    if newitem.startswith("s:"):
        newref = f"ja.sent.{newitem[2:]}"
        allowed_gram = ["ja.grammar.particle.object-wo"]
    else:
        newref = newitem[2:]
        allowed_gram = [newref, "ja.grammar.particle.object-wo"]
    old = [s for s in OLD_SENTS if s != newref][:2]
    refs = lex + [newref] + old
    lines = [f"# ai-assisted draft unit (Mode B B1); content refs are pack data; qualified review pending.",
             f"id: ja.unit.{uid}", f"goal_id: {goal}",
             f"title: {topic}", f"summary: B1 language for {topic}.",
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

print("batch26 written")
