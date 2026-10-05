#!/usr/bin/env python3
"""ja-JP batch 69: B2 units 730-739 (linguistics tail + culture-identity start)."""
import json, os

R = "languages/ja-JP"
SRC = ["jf-standard", "ai-drafted-extension"]
NOTE = ("Framework-level sourcing only (JF Standard reference, no descriptor text copied); "
        "a dictionary/reviewer source must be added before verified status.")
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-05", "notes": "ai-assisted draft wording; qualified review pending."}

LING = [
 ("korpusu","こーぷす","noun","corpus"),
 ("bunseki2","ぶんせき","noun","analysis"),
 ("hyouka","ひょうか","noun","evaluation, assessment"),
 ("keitai","けいたい","noun","form, morphology"),
 ("yaku","やく","noun","meaning, function"),
 ("bunsho","ぶんしょ","noun","document, text"),
 ("tally","たっりー","noun","tally, count"),
 ("pin","ぴん","noun","pin, frequency point"),
 ("shiryou2","しりょう","noun","material, data"),
 ("kouryuu3","こうりゅう","noun","exchange, flow"),
 ("seibun","せいぶん","noun","composition, makeup"),
 ("bunrui","ぶんるい","noun","classification"),
 ("hatsuon2","はつおん","noun","pronunciation"),
 ("taigen2","たいげん","noun","body, main part"),
 ("kouzou2","こうぞう","noun","structure"),
]
CULT = [
 ("identity","あいでんてぃてぃ","noun","identity"),
 ("shinzoku","しんぞく","noun","relatives, kin"),
 ("denkou","でんこう","noun","tradition, transmission"),
 ("idai","いだい","na-adjective","great, grand"),
 ("shuusei","しゅうせい","noun","correction, reform"),
 ("kaizoku","かいぞく","noun","belonging"),
 ("juni","じゅうに","noun","residence, living"),
 ("rikken","りっけん","noun","recognition"),
 ("tango","たんご","noun","term, vocabulary"),
 ("kioku2","きおく","noun","memory, record"),
 ("juri2","じゅり","noun","acceptance, adoption"),
 ("shiminkai","しみんかい","noun","citizens' group"),
 ("kaiso","かいそ","noun","consideration, deliberation"),
 ("tokucho","とくちょう","noun","feature, characteristic"),
 ("kouchi","こうち","noun","will, motivation"),
 ("housou","ほうそう","noun","broadcast"),
 ("zatsu","ざつ","noun","miscellaneous"),
 ("senzoku","せんぞく","noun","ancestors"),
 ("denshi","でんし","noun","electronic, digital"),
 ("media2","めでぃあ","noun","media"),
 ("kiban","きばん","noun","base, ground"),
 ("kanko","かんこ","noun","tolerance, endurance"),
 ("tairi","たいり","noun","endurance, patience"),
 ("tassei","たっせい","noun","achievement"),
 ("kaikei","かいけい","noun","account, story"),
 ("densetsu","でんせつ","noun","legend, tradition"),
 ("matsuri","まつり","noun","festival"),
 ("fukuzatsu","ふくざつ","na-adjective","complex"),
 ("fuyu","ふゆう","noun","immersion"),
 ("kairyou","かいりょう","noun","improvement"),
 ("shinchou","しんちょう","noun","growth, development"),
 ("jitsuri","じつり","noun","profit, gain"),
 ("sonzai","そんざい","noun","existence, being"),
 ("juyou","じゅうよう","na-adjective","important"),
 ("hatsu","はつ","noun","departure, start"),
]
assert len(LING) == 15 and len(CULT) == 35

def entry(shard, rid, kana, pos, gloss, tag):
    return {"id": f"ja.lex.{shard}.{rid}", "status": "draft",
            "forms": [{"text": kana, "script": "hiragana", "is_primary": True}],
            "readings": [{"text": kana, "script": "hiragana"},
                         {"text": rid, "transliteration_system": "modified-hepburn"}],
            "glosses": {"en-US": [gloss]}, "part_of_speech": pos,
            "registers": ["ja.register.neutral-common"], "semantic_tags": [tag],
            "sources": SRC, "notes": NOTE, "generation": GEN}

with open(os.path.join(R, "lexicon", "ling3.jsonl"), "w") as f:
    for rid, kana, pos, gloss in LING:
        f.write(json.dumps(entry("ling3", rid, kana, pos, gloss, "language"), ensure_ascii=False) + "\n")
with open(os.path.join(R, "lexicon", "cult.jsonl"), "w") as f:
    for rid, kana, pos, gloss in CULT:
        f.write(json.dumps(entry("cult", rid, kana, pos, gloss, "culture"), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ja.grammar.b2-ni-anto-shite", "name": "〜に相当して (corresponding to)", "category": "syntax",
  "definition": "に相当して marks equivalence: この ご に 相当する ことば. Draft definition pending review."},
 {"id": "ja.grammar.b2-ni-mukete", "name": "〜に向けて (toward)", "category": "syntax",
  "definition": "に向けて marks direction of effort: みらい に むけて かつどう. Draft definition pending review."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("corpus-linguistics","ぶんしょ の ぶんせき を しました。","bunsho no bunseki wo shimashita.","I did document analysis.",["ぶんしょ"]),
 ("register-analysis","しりょう の こうりゅう を べんきょう しました。","shiryou no kouryuu wo benkyou shimashita.","I studied the flow of materials.",["しりょう"]),
 ("identity-construction","でんこう の だい を ぎろん しました。","denkou no dai wo giron shimashita.","We discussed the role of tradition.",["でんこう"]),
 ("cultural-belonging","きおく の もんだい を はなしました。","kioku no mondai wo hanashimashita.","We talked about the problem of memory.",["きおく"]),
 ("heritage-debate","せんぞく の ため を かんがえました。","senzoku no tame wo kangaemashita.","We thought about the ancestors' sake.",["せんぞく"]),
 ("multiculturalism","めでぃあ の げんざい を ぎろん しました。","media no genzai wo giron shimashita.","We discussed the state of media.",["めでぃあ"]),
 ("subculture-study","まつり の とくちょう を べんきょう しました。","matsuri no tokucho wo benkyou shimashita.","I studied the features of festivals.",["まつり"]),
 ("pop-culture","ほうそう の ぶんか を べんきょう しました。","housou no bunka wo benkyou shimashita.","I studied broadcast culture.",["ほうそう"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, romaji, gloss, cloze in SENTS:
        e = {"id": f"ja.sent.{sid}", "status": "draft", "text": text, "reading": text,
             "romaji": romaji, "gloss": gloss, "cloze_targets": cloze,
             "sources": SRC, "notes": "ai-assisted draft sentence; qualified review required before verified.",
             "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

ASSESS = {"id": "ja.assess.culture-identity", "goal_id": "ja.goal.b2.culture-identity",
          "kind": "transfer", "modality": "interaction",
          "rubric": {"scale": "observed", "criteria": [
              "discuss identity, tradition, or belonging using taught culture vocabulary",
              "argue about heritage or subculture without blocking errors"]},
          "review_status": "draft"}
with open(os.path.join(R, "assessments", "definitions.jsonl"), "a") as f:
    f.write(json.dumps(ASSESS, ensure_ascii=False) + "\n")

GOAL_YAML = """  - id: ja.goal.b2.culture-identity
    description: 'Discuss culture and identity: tradition, belonging, and subcultures.'
    band: B2
    framework_refs: []
    contexts:
    - ja.situation.classroom
    modalities:
    - listening
    - speaking
    - reading
    - writing
    prerequisites:
    - target: ja.goal.b2.society-change
      dimension: grammar-controlled
      required_state: independent
      strength: hard
    required_concepts:
    - ja.lex.cult.denkou
    - ja.lex.cult.kaizoku
    assessment_ids:
    - ja.assess.culture-identity
    transfer_required: true
    sources:
    - jf-standard
    - ai-drafted-extension
    review_status: draft
    generation:
      method: ai-assisted
      tool: omp
      model: strata/qwen3.8-flash-next-iq3_s
      date: '2026-10-05'
"""
with open(os.path.join(R, "curriculum", "goals.yaml"), "a") as f:
    f.write(GOAL_YAML)

DEP = """- from: ja.goal.b2.culture-identity
  to: ja.goal.b2.society-change
  dimension: grammar-controlled
  required_state: independent
  strength: hard
"""
dp = os.path.join(R, "grammar", "dependencies.yaml")
with open(dp) as f:
    dep = f.read()
dep = dep.replace("notes:", DEP + "notes:", 1)
with open(dp, "w") as f:
    f.write(dep)

OLD_SENTS = ["ja.sent.meeting-starts","ja.sent.reply-email","ja.sent.report-address",
             "ja.sent.work-company","ja.sent.interview-prep"]

LINGG = "ja.goal.b2.language-linguistics"
CULTG = "ja.goal.b2.culture-identity"
U = [
 ("730-corpus-linguistics","corpus linguistics","730-corpus-linguistics",LINGG,"ling3",
  ["korpusu","bunseki2","hyouka","keitai","yaku"], "s:corpus-linguistics"),
 ("731-register-analysis","register analysis","731-register-analysis",LINGG,"ling3",
  ["bunsho","tally","pin","shiryou2","kouryuu3"], "s:register-analysis"),
 ("732-linguistics-essay","linguistics essay","732-linguistics-essay",LINGG,"ling3",
  ["seibun","bunrui","hatsuon2","taigen2","kouzou2"], "g:ja.grammar.b2-ni-anto-shite"),
 ("733-identity-construction","identity construction","733-identity-construction",CULTG,"cult",
  ["identity","shinzoku","denkou","idai","shuusei"], "s:identity-construction"),
 ("734-cultural-belonging","cultural belonging","734-cultural-belonging",CULTG,"cult",
  ["kaizoku","juni","rikken","tango","kioku2"], "s:cultural-belonging"),
 ("735-heritage-debate","heritage debate","735-heritage-debate",CULTG,"cult",
  ["juri2","shiminkai","kaiso","tokucho","kouchi"], "s:heritage-debate"),
 ("736-multiculturalism","multiculturalism","736-multiculturalism",CULTG,"cult",
  ["housou","zatsu","senzoku","denshi","media2"], "s:multiculturalism"),
 ("737-subculture-study","subculture study","737-subculture-study",CULTG,"cult",
  ["kiban","kanko","tairi","tassei","kaikei"], "s:subculture-study"),
 ("738-pop-culture","pop culture","738-pop-culture",CULTG,"cult",
  ["densetsu","matsuri","fukuzatsu","juyou","sonzai"], "s:pop-culture"),
 ("739-tradition-invention","tradition invention","739-tradition-invention",CULTG,"cult",
  ["hatsu","fuyu","kairyou","shinchou","jitsuri"], "g:ja.grammar.b2-ni-mukete"),
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

print("batch69 written")
