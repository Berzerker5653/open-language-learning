#!/usr/bin/env python3
"""ja-JP batch 56: B2 units 600-609 (academic-skills tail)."""
import json, os

R = "languages/ja-JP"
SRC = ["jf-standard", "ai-drafted-extension"]
NOTE = ("Framework-level sourcing only (JF Standard reference, no descriptor text copied); "
        "a dictionary/reviewer source must be added before verified status.")
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-05", "notes": "ai-assisted draft wording; qualified review pending."}

WORDS = [
 ("yohou","ようほう","noun","prediction"),
 ("kentei","けんてい","noun","proposal"),
 ("rondatate","ろんたて","noun","argument structure"),
 ("kohyo","こうひょう","noun","peer review, public evaluation"),
 ("renraku2","れんらく","noun","connection, linkage"),
 ("junjo","じゅんじょ","noun","order, sequence"),
 ("setsuzoku","せつぞく","noun","cohesion, connection"),
 ("hantai","はんたい","noun","opposition"),
 ("hanron","はんろん","noun","counterargument"),
 ("youyaku","ようやく","noun","summary, abstract"),
 ("kiban","きばん","noun","base, foundation"),
 ("kijun","きじゅん","noun","standard, criterion"),
 ("kijutsu","きじゅつ","noun","description, narration"),
 ("happyou","はっぴょう","noun","presentation"),
 ("sankou","さんこう","noun","reference"),
 ("shuchou","しゅちょう","noun","claim, emphasis"),
 ("juyou","じゅうよう","noun","importance"),
 ("kairyou","かいりょう","noun","understanding, comprehension"),
 ("rikai","りかい","noun","understanding"),
 ("kikaku","きかく","noun","plan, project"),
 ("dankai","だんかい","noun","stage, step"),
 ("teki2","てき","noun","target, objective"),
 ("bunya","ぶんや","noun","field, domain"),
 ("yakuwari","やくわり","noun","role"),
 ("kenri","けんり","noun","right"),
 ("gimu","ぎむ","noun","duty, obligation"),
 ("tassei","たっせい","noun","accomplishment"),
 ("katsuyo","かつよう","noun","application, use"),
 ("tekiyou","てきよう","noun","application"),
 ("kaisetsu","かいせつ","noun","explanation, commentary"),
 ("kaito","かいとう","noun","answer, response"),
 ("shitsumon","しつもん","noun","question"),
 ("houkoku","ほうこく","noun","report"),
 ("seimei","せいめい","noun","clarity"),
 ("kyotsuu","きょうつう","noun","commonality"),
 ("kyouyuu","きょうゆう","noun","shared ownership"),
 ("riyou","りよう","noun","use, utilization"),
 ("seido","せいど","noun","system, institution"),
 ("seikaku","せいかく","noun","accuracy"),
 ("seisaku","せいさく","noun","production, creation"),
 ("taigen","たいげん","noun","representation"),
 ("taiou","たいおう","noun","correspondence, response"),
 ("tansaku","たんさく","noun","exploration, inquiry"),
 ("kouritsu","こうりつ","noun","efficiency"),
 ("koi2","こい","noun","request, petition"),
 ("kyouyoku","きょうよく","noun","curiosity"),
 ("kyozetsu","きょぜつ","noun","quotation, citation"),
 ("kunren","くんれん","noun","practice, training"),
 ("meishou","めいしょう","noun","name, title"),
 ("mokuteki","もくてき","noun","purpose"),
]
assert len(WORDS) == 50, len(WORDS)

def entry(rid, kana, pos, gloss):
    return {"id": f"ja.lex.academic2.{rid}", "status": "draft",
            "forms": [{"text": kana, "script": "hiragana", "is_primary": True}],
            "readings": [{"text": kana, "script": "hiragana"},
                         {"text": rid, "transliteration_system": "modified-hepburn"}],
            "glosses": {"en-US": [gloss]}, "part_of_speech": pos,
            "registers": ["ja.register.neutral-common"], "semantic_tags": ["academic"],
            "sources": SRC, "notes": NOTE, "generation": GEN}

with open(os.path.join(R, "lexicon", "academic2.jsonl"), "w") as f:
    for rid, kana, pos, gloss in WORDS:
        f.write(json.dumps(entry(rid, kana, pos, gloss), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ja.grammar.b2.wake-ni-wa-ikanai", "name": "〜わけにはいかない (cannot bring oneself to)",
  "category": "syntax",
  "definition": "わけにはいかない marks moral impossibility: ぎむ を はたさ ない わけ に は いかない. Draft definition pending review."},
 {"id": "ja.grammar.b2.zaru-o-enai", "name": "〜ざるを得ない (cannot but)", "category": "syntax",
  "definition": "ざるを得ない marks compulsion: はんろん を たて ざる を えない. Draft definition pending review."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("academic-hedging","ようほう の ぶんしょう を べんきょう しました。","youhou no bunshou wo benkyou shimashita.","I studied the prediction passage.",["ようほう"]),
 ("formal-style","きじゅつ の ぶんしょう を よみました。","kijutsu no bunshou wo yomimashita.","I read the description passage.",["きじゅつ"]),
 ("paragraph-cohesion","せつぞく の きほん を べんきょう しました。","setsuzoku no kihon wo benkyou shimashita.","I studied the basics of cohesion.",["せつぞく"]),
 ("counter-evidence","はんろん を ひとつ かきました。","hanron wo hitotsu kakimashita.","I wrote one counterargument.",["はんろん"]),
 ("abstract-writing","ようやく を かきました。","youyaku wo kakimashita.","I wrote the abstract.",["ようやく"]),
 ("conference-talk","はっぴょう の じゅんび を しました。","happyou no junbi wo shimashita.","I prepared the presentation.",["はっぴょう"]),
 ("peer-review-ideas","こうひょう の かい を もちました。","kouhyou no kai wo mochimashita.","We held the review meeting.",["こうひょう"]),
 ("poster-writing","せいさく の じゅんび を しました。","seisaku no junbi wo shimashita.","I prepared the production.",["せいさく"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, romaji, gloss, cloze in SENTS:
        e = {"id": f"ja.sent.{sid}", "status": "draft", "text": text, "reading": text,
             "romaji": romaji, "gloss": gloss, "cloze_targets": cloze,
             "sources": SRC, "notes": "ai-assisted draft sentence; qualified review required before verified.",
             "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

OLD_SENTS = ["ja.sent.meeting-starts","ja.sent.reply-email","ja.sent.report-address",
             "ja.sent.work-company","ja.sent.interview-prep"]

U = [
 ("600-academic-hedging","academic hedging","academic-hedging",
  ["yohou","kentei","rondatate","kijun","kairyou"], "s:academic-hedging"),
 ("601-formal-style","formal style","formal-style",
  ["kijutsu","seimei","teki2","kiban","dankai"], "s:formal-style"),
 ("602-paragraph-cohesion","paragraph cohesion","paragraph-cohesion",
  ["setsuzoku","junjo","renraku2","shuchou","taigen"], "s:paragraph-cohesion"),
 ("603-counter-evidence","counter evidence","counter-evidence",
  ["hantai","hanron","kaito","shitsumon","sankou"], "s:counter-evidence"),
 ("604-abstract-writing","abstract writing","abstract-writing",
  ["youyaku","seikaku","kaisetsu","houkoku","seido"], "s:abstract-writing"),
 ("605-peer-review-ideas","peer review ideas","peer-review-ideas",
  ["kohyo","kyouyoku","mokuteki","juyou","rikai"], "s:peer-review-ideas"),
 ("606-research-ethics","research ethics","research-ethics",
  ["kenri","gimu","kyouyuu","kyotsuu","kyozetsu"], "g:ja.grammar.b2.wake-ni-wa-ikanai"),
 ("607-conference-talk","conference talk","conference-talk",
  ["happyou","meishou","kunren","taiou","koi2"], "s:conference-talk"),
 ("608-poster-writing","poster writing","poster-writing",
  ["seisaku","bunya","tassei","kouritsu","riyou"], "s:poster-writing"),
 ("609-citation-advanced","citation advanced","citation-advanced",
  ["kikaku","yakuwari","katsuyo","tekiyou","tansaku"], "g:ja.grammar.b2.zaru-o-enai"),
]

def unit_yaml(topic, uid, goal, shard, words, newitem):
    lex = [f"ja.lex.{shard}.{w}" for w in words]
    if newitem.startswith("s:"):
        newref = f"ja.sent.{newitem[2:]}"
        allowed_gram = ["ja.grammar.particle.object-wo"]
    else:
        newref = newitem[2:]
        allowed_gram = [newref, "ja.grammar.particle.object-wo"]
    old = [s for s in OLD_SENTS if s != newref][:2]
    refs = lex + [newref] + old
    lines = ["# ai-assisted draft unit (Mode B B2); content refs are pack data; qualified review pending.",
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

for fname, topic, uid, words, newitem in U:
    with open(os.path.join(R, "curriculum", "units", fname + ".yaml"), "w") as f:
        f.write(unit_yaml(topic, uid, "ja.goal.b2.academic-skills", "academic2", words, newitem))

print("batch56 written")
