#!/usr/bin/env python3
"""ja-JP batch 71: B2 units 750-759 (abstract-debate: argument reasoning)."""
import json, os

R = "languages/ja-JP"
SRC = ["jf-standard", "ai-drafted-extension"]
NOTE = ("Framework-level sourcing only (JF Standard reference, no descriptor text copied); "
        "a dictionary/reviewer source must be added before verified status.")
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-05", "notes": "ai-assisted draft wording; qualified review pending."}

W = [
 ("ronso2","ろんそう","noun","debate"),
 ("teigen","ていげん","noun","proposal"),
 ("koka","こうか","noun","effect"),
 ("genin","げんいん","noun","cause"),
 ("kankei2","かんけい","noun","relationship"),
 ("juni2","じゅんい","noun","order, rank"),
 ("hyoka2","ひょうか","noun","evaluation"),
 ("kenkyu2","けんきゅう","noun","research"),
 ("shiryou3","しりょう","noun","data, materials"),
 ("kenso","けんそう","noun","consideration"),
 ("kentou","けんとう","noun","examination"),
 ("juri","じゅり","noun","logic"),
 ("gaisetsu","がいせつ","noun","generalization"),
 ("shuuyou","しゅうよう","noun","generalization (usage)"),
 ("hantai6","はんたい","noun","opposition"),
 ("haken","はっけん","noun","discovery"),
 ("kenji","けんじ","noun","indication"),
 ("shimei2","しめい","noun","hint, indication"),
 ("shoko","しょうこ","noun","evidence"),
 ("kagi","かぎ","noun","key, clue"),
 ("chosa","ちょうさ","noun","investigation"),
 ("bunseki3","ぶんせき","noun","analysis"),
 ("betsubetsu","べつべつ","noun","distinction"),
 ("kurikaeshi","くりかえし","noun","repetition"),
 ("yuukyuu","ゆうきゅう","noun","validity"),
 ("genkai","げんかい","noun","limit"),
 ("kosaten","こうさてん","noun","intersection"),
 ("kachi6","かち","noun","value"),
 ("taisha","たいしゃ","noun","conflict"),
 ("keni","けんい","noun","authority, power"),
 ("shikaku","しかく","noun","qualification"),
 ("hohou","ほうほう","noun","method"),
 ("tekiyou","てきよう","noun","application"),
 ("tenkan","てんかん","noun","conversion"),
 ("joukyou","じょうきょう","noun","situation"),
 ("youken","ようけん","noun","condition"),
 ("koutei","こうてい","noun","process"),
 ("kekka2","けっか","noun","result"),
 ("risu3","りくつ","noun","theory, argument"),
 ("setsuzoku","せつぞく","noun","connection"),
 ("hatten","はってん","noun","development"),
 ("mondai2","もんだい","noun","problem"),
 ("kaiketsu","かいけつ","noun","solution"),
 ("hannou","はんのう","noun","reaction"),
 ("taiwa","たいわ","noun","dialogue"),
 ("ronbun","ろんぶん","noun","essay, paper"),
 ("bunken","ぶんけん","noun","literature (research)"),
 ("chishiki","ちしき","noun","knowledge"),
 ("ninchi","にんち","noun","cognition"),
 ("hikaku","ひかく","noun","comparison"),
]
assert len(W) == 50

def entry(rid, kana, pos, gloss):
    return {"id": f"ja.lex.abst2.{rid}", "status": "draft",
            "forms": [{"text": kana, "script": "hiragana", "is_primary": True}],
            "readings": [{"text": kana, "script": "hiragana"},
                         {"text": rid, "transliteration_system": "modified-hepburn"}],
            "glosses": {"en-US": [gloss]}, "part_of_speech": pos,
            "registers": ["ja.register.neutral-common"], "semantic_tags": ["abstract"],
            "sources": SRC, "notes": NOTE, "generation": GEN}

with open(os.path.join(R, "lexicon", "abst2.jsonl"), "w") as f:
    for rid, kana, pos, gloss in W:
        f.write(json.dumps(entry(rid, kana, pos, gloss), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ja.grammar.b2-ni-taishite", "name": "〜に対して (toward, against)", "category": "syntax",
  "definition": "に対して marks the target of an attitude or action: かいしゃ に たいして ていげん する. Draft definition pending review."},
 {"id": "ja.grammar.b2-to-areba", "name": "〜とあれば (if that is the case)", "category": "syntax",
  "definition": "とあれば grounds an action on a stated situation: ぜんそう が あっていると あれば、しゅうちょう を かえる. Draft definition pending review."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("analogy-critique","ひかく の かた を かんがえました。","hikaku no kata wo kangaemashita.","I thought about the way of comparing.",["ひかく"]),
 ("evidence-evaluation","しょうこ を ちょうさ しました。","shouko wo chousa shimashita.","I examined the evidence.",["しょうこ"]),
 ("causation-correlation","げんいん と かんけい を べんきょう しました。","genin to kankei wo benkyou shimashita.","I studied cause and relationship.",["げんいん"]),
 ("generalization-limits","げんかい を はっきり しめしました。","genkai wo hakkari shime shimashita.","I clearly showed the limits.",["げんかい"]),
 ("value-conflict","かち の たいしゃ が おきました。","kachi no taisha ga okimashita.","A conflict of values occurred.",["たいしゃ"]),
 ("stakeholder-analysis","じょうきょう の ぶんせき を しました。","joukyou no bunseki wo shimashita.","I did an analysis of the situation.",["ぶんせき"]),
 ("scenario-reasoning","ようけん を かえて こうこ を かんがえました。","youken wo kaete kouko wo kangaemashita.","I changed the condition and thought about the effect.",["ようけん"]),
 ("abstraction-ladders","じゅんい の ちがい を べんきょう しました。","juni no chigai wo benkyou shimashita.","I studied the difference in rank.",["じゅんい"]),
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

ABSTG = "ja.goal.b2.abstract-debate"
U = [
 ("750-analogy-critique","analogy critique","750-analogy-critique",ABSTG,"abst2",
  ["hikaku","kosaten","setsuzoku","tenkan","risu3"], "s:analogy-critique"),
 ("751-evidence-evaluation","evidence evaluation","751-evidence-evaluation",ABSTG,"abst2",
  ["shoko","chosa","kenji","shimei2","kagi"], "s:evidence-evaluation"),
 ("752-causation-correlation","causation correlation","752-causation-correlation",ABSTG,"abst2",
  ["genin","kankei2","kurikaeshi","hannou","koutei"], "s:causation-correlation"),
 ("753-generalization-limits","generalization limits","753-generalization-limits",ABSTG,"abst2",
  ["gaisetsu","shuuyou","genkai","yuukyuu","betsubetsu"], "s:generalization-limits"),
 ("754-value-conflict","value conflict","754-value-conflict",ABSTG,"abst2",
  ["kachi6","taisha","keni","shikaku","hantai6"], "s:value-conflict"),
 ("755-stakeholder-analysis","stakeholder analysis","755-stakeholder-analysis",ABSTG,"abst2",
  ["joukyou","bunseki3","kenso","kentou","hyoka2"], "s:stakeholder-analysis"),
 ("756-scenario-reasoning","scenario reasoning","756-scenario-reasoning",ABSTG,"abst2",
  ["youken","koka","kekka2","hatten","kaiketsu"], "s:scenario-reasoning"),
 ("757-abstraction-ladders","abstraction ladders","757-abstraction-ladders",ABSTG,"abst2",
  ["juni2","chishiki","ninchi","bunken","ronbun"], "s:abstraction-ladders"),
 ("758-counterfactual-thinking","counterfactual thinking","758-counterfactual-thinking",ABSTG,"abst2",
  ["teigen","taiwa","haken","hohou","tekiyou"], "g:ja.grammar.b2-ni-taishite"),
 ("759-definition-debate","definition debate","759-definition-debate",ABSTG,"abst2",
  ["ronso2","mondai2","kenkyu2","shiryou3","koutei"], "g:ja.grammar.b2-to-areba"),
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

for fname, topic, uid, goal, shard, words, newitem in U:
    with open(os.path.join(R, "curriculum", "units", fname + ".yaml"), "w") as f:
        f.write(unit_yaml(topic, uid, goal, shard, words, newitem))

print("batch71 written")
