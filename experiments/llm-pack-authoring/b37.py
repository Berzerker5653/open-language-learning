#!/usr/bin/env python3
"""ja-JP batch 37: B2 units 425-434 (politics-governance complete)."""
import json, os

R = "languages/ja-JP"
SRC = ["jf-standard", "ai-drafted-extension"]
NOTE = ("Framework-level sourcing only (JF Standard reference, no descriptor text copied); "
        "a dictionary/reviewer source must be added before verified status.")
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-04", "notes": "ai-assisted draft wording; qualified review pending."}

WORDS = [
 ("gaikou","がいこう","noun","foreign affairs"),
 ("gaikoku","がいこく","noun","foreign country"),
 ("kokumin","こくみん","noun","citizen"),
 ("zei2","ぜい","noun","tax"),
 ("koku","こく","noun","nation"),
 ("kokka","こっか","noun","state"),
 ("kokkou","こっこう","noun","national polity"),
 ("bunkou","ぶんこう","noun","division"),
 ("demo","デモ","noun","demonstration"),
 ("gaishi","がいし","noun","foreign post"),
 ("zeimu","ぜいむ","noun","tax affairs"),
 ("kikoku","きこく","noun","return to country"),
 ("kokuho","こくほう","noun","national report"),
 ("kogen","こうげん","noun","statement"),
 ("seigen","せいげん","noun","restriction"),
 ("genron","げんろん","noun","free speech"),
 ("shimei","しめい","noun","designation"),
 ("meiyo","めいよ","noun","honor"),
 ("june","じゅんれい","noun","order"),
 ("juyou","じゅよう","noun","acceptance"),
 ("tokken","とっけん","noun","privilege"),
 ("hotei","ほてい","noun","legal ruling"),
 ("yoron","よろん","noun","public opinion"),
 ("kyousei","きょうせい","noun","enforcement"),
 ("shoukou","しょうこう","noun","reference"),
 ("taishu","たいしゅう","noun","masses"),
 ("shuyuu","しゅゆう","noun","mainstream"),
 ("shuryuu","しゅうりゅう","noun","trend"),
 ("horyuu","ちょうりゅう","noun","tide"),
 ("fuhyou","ふひょう","noun","poor reputation"),
 ("shouba","しょうば","noun","market"),
 ("shoubai","しょうばい","noun","trade"),
 ("shouzei","しょうぜい","noun","commerce tax"),
 ("shourei","しょうれい","noun","reward"),
 ("zeihou","ぜいほう","noun","tax law"),
 ("zeiri","ぜいり","noun","tax rate"),
 ("jichitai","じちたい","noun","local government"),
 ("seijika","せいじか","noun","politician"),
 ("seijigaku","せいじがく","noun","political science"),
 ("senkyoku","せんきょく","noun","constituency"),
 ("giinkai","ぎいんかい","noun","legislative body"),
 ("hoju","ほじゅ","noun","support"),
 ("hoshu","ほしゅ","noun","demand"),
 ("chousen","ちょうせん","noun","challenge"),
 ("choushou","ちょうしょう","noun","petition"),
 ("chouka","ちょうか","noun","degradation"),
 ("chouan","ちょうあん","noun","long-term plan"),
 ("hansen","はんせん","noun","rebellion"),
 ("koi","こい","noun","petition"),
 ("seimei","せいめい","noun","life"),
]
assert len(WORDS) == 50, len(WORDS)

def entry(shard, rid, kana, pos, gloss, tag):
    return {"id": f"ja.lex.{shard}.{rid}", "status": "draft",
            "forms": [{"text": kana, "script": "hiragana", "is_primary": True}],
            "readings": [{"text": kana, "script": "hiragana"},
                         {"text": rid, "transliteration_system": "modified-hepburn"}],
            "glosses": {"en-US": [gloss]}, "part_of_speech": pos,
            "registers": ["ja.register.neutral-common"], "semantic_tags": [tag],
            "sources": SRC, "notes": NOTE, "generation": GEN}

with open(os.path.join(R, "lexicon", "politics2.jsonl"), "w") as f:
    for rid, kana, pos, gloss in WORDS:
        f.write(json.dumps(entry("politics2", rid, kana, pos, gloss, "politics"), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ja.grammar.b2.ni-yotte", "name": "〜によって (by means of)", "category": "syntax",
  "definition": "によって marks means or agency: ほうほう によって けっか が かわる. Draft definition pending review."},
 {"id": "ja.grammar.b2.toiu-koto", "name": "〜ということ (that)", "category": "semantics",
  "definition": "ということ nominalizes: ぜい が ふえる ということ を はなす. Draft definition pending review."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("public-debate","よろん の ぶんこう を べんきょう しました。","yoron no bunkou wo benkyou shimashita.","We studied the division of public opinion.",["よろん"]),
 ("campaign-critique","こうげん の ないよう を ひひょう しました。","kogen no naiyou wo hihiyou shimashita.","We criticized the statement's content.",["こうげん"]),
 ("constitutional-ideas","ほてい の ぶんしょう を よみました。","hotei no bunshou wo yomimashita.","I read the legal ruling's text.",["ほてい"]),
 ("rights-discussion","とっけん の こと を はなしました。","tokken no koto wo hanashimashita.","I talked about privilege.",["とっけん"]),
 ("local-governance","じちたい の しごと を しらべました。","jichitai no shigoto wo shirabemashita.","I researched local government work.",["じちたい"]),
 ("international-relations","がいこく の こと を べんきょう しました。","gaikoku no koto wo benkyou shimashita.","I studied about foreign countries.",["がいこく"]),
 ("diplomacy-language","がいこう の はなし を ききました。","gaikou no hanashi wo kikimashita.","I heard about foreign affairs.",["がいこう"]),
 ("protest-movements","ちょうしょう を だしました。","choushou wo dashimashita.","I submitted a petition.",["ちょうしょう"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, romaji, gloss, cloze in SENTS:
        e = {"id": f"ja.sent.{sid}", "status": "draft", "text": text, "reading": text,
             "romaji": romaji, "gloss": gloss, "cloze_targets": cloze,
             "sources": SRC, "notes": "ai-assisted draft sentence; qualified review required before verified.",
             "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

U = [
 ("425-public-debate","public debate","public-debate","ja.goal.b2.politics-governance",
  ["yoron","bunkou","demo","taishu","shuryuu"], "s:public-debate"),
 ("426-campaign-critique","campaign critique","campaign-critique","ja.goal.b2.politics-governance",
  ["kogen","fuhyou","meiyo","shimei","hoshu"], "s:campaign-critique"),
 ("427-constitutional-ideas","constitutional ideas","constitutional-ideas","ja.goal.b2.politics-governance",
  ["hotei","kyousei","seigen","genron","june"], "s:constitutional-ideas"),
 ("428-rights-discussion","rights discussion","rights-discussion","ja.goal.b2.politics-governance",
  ["tokken","juyou","hoju","chousen","koi"], "s:rights-discussion"),
 ("429-local-governance","local governance","local-governance","ja.goal.b2.politics-governance",
  ["jichitai","giinkai","senkyoku","seijika","seijigaku"], "s:local-governance"),
 ("430-international-relations","international relations","international-relations","ja.goal.b2.politics-governance",
  ["gaikoku","gaishi","kikoku","kokuho","koku"], "s:international-relations"),
 ("431-diplomacy-language","diplomacy language","diplomacy-language","ja.goal.b2.politics-governance",
  ["gaikou","kokka","kokkou","kokumin","seimei"], "s:diplomacy-language"),
 ("432-protest-movements","protest movements","protest-movements","ja.goal.b2.politics-governance",
  ["choushou","chouka","chouan","hansen","hoshu"], "s:protest-movements"),
 ("433-public-opinion","public opinion","public-opinion","ja.goal.b2.politics-governance",
  ["shuyuu","horyuu","shoukou","shouba","shoubai"], "g:ja.grammar.b2.ni-yotte"),
 ("434-political-figures","political figures","political-figures","ja.goal.b2.politics-governance",
  ["zei2","zeimu","shouzei","shourei","zeihou"], "g:ja.grammar.b2.toiu-koto"),
]
OLD_SENTS = ["ja.sent.meeting-starts","ja.sent.reply-email","ja.sent.report-address",
             "ja.sent.work-company","ja.sent.interview-prep"]

def unit_yaml(topic, uid, goal, words, newitem):
    lex = [f"ja.lex.politics2.{w}" for w in words]
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

print("batch37 written")
