#!/usr/bin/env python3
"""ja-JP batch 70: B2 units 740-749 (culture-identity tail + abstract-debate start)."""
import json, os

R = "languages/ja-JP"
SRC = ["jf-standard", "ai-drafted-extension"]
NOTE = ("Framework-level sourcing only (JF Standard reference, no descriptor text copied); "
        "a dictionary/reviewer source must be added before verified status.")
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-05", "notes": "ai-assisted draft wording; qualified review pending."}

CULT = [
 ("gengo2","げんご","noun","language (identity)"),
 ("hasshu","はっしゅ","noun","ethnicity, descent"),
 ("ikoku","いこく","noun","foreign country"),
 ("ishiki3","いしき","noun","awareness"),
 ("sedai","せだい","noun","generation"),
 ("danho","だんほう","noun","discrimination"),
 ("kyosei2","きょうせい","noun","coercion"),
 ("tekisho","てきしょう","noun","appropriation"),
 ("bunka2","ぶんか","noun","culture"),
 ("kozou3","こうぞう","noun","structure (social)"),
 ("konketsu","こんけつ","noun","mixing, hybridity"),
 ("furon","ふろん","noun","borderline"),
 ("kioku3","きおく","noun","memory (collective)"),
 ("seiji2","せいじ","noun","politics"),
 ("hommon2","ほうもん","noun","visit"),
 ("ronso","ろんそう","noun","debate, controversy"),
 ("shiki","しき","noun","consciousness"),
 ("kachi5","かち","noun","value"),
 ("hakai","はかい","noun","destruction"),
 ("hogo2","ほご","noun","protection"),
 ("sanka3","さんか","noun","participation"),
 ("hatsugen","はつげん","noun","statement, remark"),
 ("hyosho","ひょうしょう","noun","expression (of feeling)"),
 ("gimon2","ぎもん","noun","question, doubt"),
 ("kodo2","こうどう","noun","action"),
 ("hantai4","はんたい","noun","opposition"),
 ("rikken2","りっけん","noun","recognition"),
 ("jiyu3","じゆう","noun","freedom"),
 ("kizon2","きぞん","noun","respect, existence"),
 ("tokui","とくい","na-adjective","strong point, specialty"),
 ("fumei","ふめい","na-adjective","unknown, obscure"),
 ("himei","ひめい","noun","confidentiality"),
 ("soshiki","そしき","noun","organization"),
 ("kikan2","きかん","noun","period, institution"),
 ("renmei","れんめい","noun","joint name, coalition"),
 ("shingakusha","しんがくしゃ","noun","scholar"),
 ("kenkyusha","けんきゅうしゃ","noun","researcher"),
 ("shogen","しょうげん","noun","testimony"),
 ("kaiso2","かいそう","noun","reflection, retrospection"),
 ("denki","でんき","noun","electricity"),
]
ABST = [
 ("gainen","がいねん","noun","concept"),
 ("teigi","ていぎ","noun","definition"),
 ("zenso","ぜんそう","noun","assumption, premise"),
 ("risu2","りくつ","noun","theory, argument"),
 ("hantai5","はんたい","noun","counterargument"),
 ("kosetsu","こうせつ","noun","hypothesis"),
 ("kenkyusha2","けんきゅうしゃ","noun","researcher"),
 ("shomei","しょうめい","noun","proof, clarification"),
 ("fuyu2","ふゆう","noun","immersion (debate)"),
 ("koryu4","こうりゅう","noun","exchange (of ideas)"),
]
assert len(CULT) == 40 and len(ABST) == 10

def entry(shard, rid, kana, pos, gloss, tag):
    return {"id": f"ja.lex.{shard}.{rid}", "status": "draft",
            "forms": [{"text": kana, "script": "hiragana", "is_primary": True}],
            "readings": [{"text": kana, "script": "hiragana"},
                         {"text": rid, "transliteration_system": "modified-hepburn"}],
            "glosses": {"en-US": [gloss]}, "part_of_speech": pos,
            "registers": ["ja.register.neutral-common"], "semantic_tags": [tag],
            "sources": SRC, "notes": NOTE, "generation": GEN}

with open(os.path.join(R, "lexicon", "cult2.jsonl"), "w") as f:
    for rid, kana, pos, gloss in CULT:
        f.write(json.dumps(entry("cult2", rid, kana, pos, gloss, "culture"), ensure_ascii=False) + "\n")
with open(os.path.join(R, "lexicon", "abst.jsonl"), "w") as f:
    for rid, kana, pos, gloss in ABST:
        f.write(json.dumps(entry("abst", rid, kana, pos, gloss, "abstract"), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ja.grammar.b2-to-sureba", "name": "〜とすれば (if we suppose)", "category": "syntax",
  "definition": "とすれば sets a supposition for argument: もし ぜんそう が あっていると すれば、こう なる. Draft definition pending review."},
 {"id": "ja.grammar.b2-ni-hokanaranai", "name": "〜にほかならない (nothing other than)", "category": "syntax",
  "definition": "にほかならない asserts identity: それは ぶんか の ちから に ほかならない. Draft definition pending review."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("language-identity","げんご と じぶん の かんけい を ろんそう しました。","gengo to jibun no kankei wo ronsou shimashita.","We debated the relationship between language and self.",["げんご"]),
 ("migration-identity","いこく から きた ひと の きおく を まち の かたから ききました。","ikoku kara kita hito no kioku wo machi no kata kara kikimashita.","I heard the memories of people from foreign countries from locals.",["いこく"]),
 ("generational-identity","せだい が かわると かち も かわります。","sedai ga kawaru to kachi mo kawarimasu.","Values change as generations change.",["せだい"]),
 ("national-narrative","くに の れきし について ぎもん が でました。","kuni no rekishi ni tsuite gimon ga demashita.","A question arose about the nation's history.",["ぎもん"]),
 ("cultural-appropriation","ぶんか の つかいかた について てきしょう の ろんそう が ありました。","bunka no tsukaikata ni tsuite tekishou no ronsou ga arimashita.","There was a debate about appropriation regarding how culture is used.",["てきしょう"]),
 ("hybrid-cultures","こんけつ で うまれた ぶんか が ふえています。","konketsu de umareta bunka ga fuete imasu.","Cultures born from mixing are increasing.",["こんけつ"]),
 ("memory-politics","きおく を めぐって せいじ の ろんそう が はじまりました。","kioku wo megutte seiji no ronsou ga hajimarimashita.","A political debate over memory began.",["きおく"]),
 ("concept-definition","がいねん の ていぎ を はっきり しました。","gainen no teigi wo hakkari shimashita.","I clarified the definition of the concept.",["がいねん"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, romaji, gloss, cloze in SENTS:
        e = {"id": f"ja.sent.{sid}", "status": "draft", "text": text, "reading": text,
             "romaji": romaji, "gloss": gloss, "cloze_targets": cloze,
             "sources": SRC, "notes": "ai-assisted draft sentence; qualified review required before verified.",
             "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

ASSESS = {"id": "ja.assess.abstract-debate", "goal_id": "ja.goal.b2.abstract-debate",
          "kind": "transfer", "modality": "interaction",
          "rubric": {"scale": "observed", "criteria": [
              "define a concept and state assumptions before arguing",
              "present a counterargument or hypothesis without blocking errors"]},
          "review_status": "draft"}
with open(os.path.join(R, "assessments", "definitions.jsonl"), "a") as f:
    f.write(json.dumps(ASSESS, ensure_ascii=False) + "\n")

GOAL_YAML = """  - id: ja.goal.b2.abstract-debate
    description: 'Argue at the abstract level: define concepts, surface assumptions, and weigh counterarguments.'
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
    - target: ja.goal.b2.academic-skills
      dimension: grammar-controlled
      required_state: independent
      strength: hard
    required_concepts:
    - ja.lex.abst.gainen
    - ja.lex.abst.teigi
    assessment_ids:
    - ja.assess.abstract-debate
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

DEP = """- from: ja.goal.b2.abstract-debate
  to: ja.goal.b2.academic-skills
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

CULTG = "ja.goal.b2.culture-identity"
ABSTG = "ja.goal.b2.abstract-debate"
U = [
 ("740-language-identity","language identity","740-language-identity",CULTG,"cult2",
  ["gengo2","hasshu","ikoku","ishiki3","sedai"], "s:language-identity"),
 ("741-migration-identity","migration identity","741-migration-identity",CULTG,"cult2",
  ["danho","kyosei2","tekisho","bunka2","kozou3"], "s:migration-identity"),
 ("742-generational-identity","generational identity","742-generational-identity",CULTG,"cult2",
  ["konketsu","furon","kioku3","seiji2","hommon2"], "s:generational-identity"),
 ("743-national-narrative","national narrative","743-national-narrative",CULTG,"cult2",
  ["ronso","shiki","kachi5","hakai","hogo2"], "s:national-narrative"),
 ("744-cultural-appropriation","cultural appropriation","744-cultural-appropriation",CULTG,"cult2",
  ["sanka3","hatsugen","hyosho","gimon2","kodo2"], "s:cultural-appropriation"),
 ("745-hybrid-cultures","hybrid cultures","745-hybrid-cultures",CULTG,"cult2",
  ["hantai4","rikken2","jiyu3","kizon2","tokui"], "s:hybrid-cultures"),
 ("746-memory-politics","memory politics","746-memory-politics",CULTG,"cult2",
  ["fumei","himei","soshiki","kikan2","renmei"], "s:memory-politics"),
 ("747-identity-essay","identity essay","747-identity-essay",CULTG,"cult2",
  ["shingakusha","kenkyusha","shogen","kaiso2","denki"], "g:ja.grammar.b2-to-sureba"),
 ("748-concept-definition","concept definition","748-concept-definition",ABSTG,"abst",
  ["gainen","teigi","zenso","risu2","hantai5"], "s:concept-definition"),
 ("749-assumption-hunting","assumption hunting","749-assumption-hunting",ABSTG,"abst",
  ["kosetsu","kenkyusha2","shomei","fuyu2","koryu4"], "g:ja.grammar.b2-ni-hokanaranai"),
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

print("batch70 written")
