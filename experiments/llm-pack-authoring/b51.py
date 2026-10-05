#!/usr/bin/env python3
"""ja-JP batch 51: B2 units 550-559 (science-tech-ethics)."""
import json, os

R = "languages/ja-JP"
SRC = ["jf-standard", "ai-drafted-extension"]
NOTE = ("Framework-level sourcing only (JF Standard reference, no descriptor text copied); "
        "a dictionary/reviewer source must be added before verified status.")
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-04", "notes": "ai-assisted draft wording; qualified review pending."}

WORDS = [
 ("toukeigaku","statistics as a discipline","n","statistics (discipline)"),
 ("hyousou","chart","n","chart"),
 ("heikinkyou","average value","n","average value"),
 ("henza","deviation","n","deviation"),
 ("samupuru","sample","n","sample"),
 ("denki","electricity","n","electricity"),
 ("taiyou","solar","n","solar"),
 ("kaze2","wind power","n","wind power"),
 ("genshi","nuclear","n","nuclear"),
 ("denpo","power plant","n","power plant"),
 ("seibutsu","organism","n","organism"),
 ("igen","gene","n","gene"),
 ("saikou","cultivation","n","cultivation"),
 ("gaisei","modification","n","modification"),
 ("zouho","information","n","information, data"),
 ("kojin","individual","n","individual"),
 ("jouhou2","personal info","n","personal information"),
 ("shakunin","legal person","n","legal person, corporation"),
 ("poribaishikku","privacy","n","privacy"),
 ("uchuu","outer space","n","outer space"),
 ("houshaki","rocket","n","rocket"),
 ("chikyu","earth","n","earth"),
 ("getsuyou","lunar surface","n","lunar surface"),
 ("isshou","satellite","n","satellite"),
 ("iryou","medical care","n","medical care"),
 ("shutsunyu","entry and exit","n","entry and exit"),
 ("sougou","diagnosis","n","diagnosis"),
 ("yakuhin","pharmaceuticals","n","pharmaceuticals"),
 ("chiryou","treatment","n","treatment"),
 ("kikou","mechanism","n","mechanism"),
 ("kikai","machine","n","machine"),
 ("jinkou-chou","artificial intelligence","n","artificial intelligence"),
 ("robo","robot","n","robot"),
 ("arugo","algorithm","n","algorithm"),
 ("bunseki","analysis","n","analysis"),
 ("kiki2","risk","n","risk"),
 ("hazard","hazard","n","hazard"),
 ("yosoku","prediction","n","prediction"),
 ("houkoku","report","n","report"),
 ("kankyou-hoju","environmental protection","n","environmental protection"),
 ("tenkan2","climate","n","climate"),
 ("kisha2","journalist","n","journalist"),
 ("kagaku","science","n","science"),
 ("kentei","examination","n","examination, test"),
 ("jikken","experiment","n","experiment"),
 ("risshi","success","n","success"),
 ("shippai2","failure","n","failure"),
 ("seika2","achievement","n","achievement"),
 ("riron","theory","n","theory"),
 ("unmei","fate","n","fate, destiny"),
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

with open(os.path.join(R, "lexicon", "science.jsonl"), "w") as f:
    for rid, kana, pos, gloss in WORDS:
        f.write(json.dumps(entry("science", rid, kana, pos, gloss, "science"), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ja.grammar.b2.ni-totoi", "name": "〜に際して (upon, when)", "category": "syntax",
  "definition": "に際して marks a critical moment: kentei に さいして じゅんび した. Draft definition pending review."},
 {"id": "ja.grammar.b2.wake-hodo", "name": "〜わけほど (to the extent that)", "category": "syntax",
  "definition": "わけほど scales a degree: せいか の わけ ほど べんきょう した. Draft definition pending review."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("statistics-literacy","ひょうそう の きじ を よみました。","hyousou no kiji wo yomimashita.","I read the chart article.",["ひょうそう"]),
 ("energy-technology","でんきの はなし を べんきょう しました。","denki no hanashi wo benkyou shimashita.","I studied the electricity topic.",["でんき"]),
 ("biotechnology","いでん の じっけん を べんきょう しました。","iden no jikken wo benkyou shimashita.","I studied the gene experiment.",["いでん"]),
 ("ai-society","じんこうちのう の はなし を ききました。","jinkouchinou no hanashi wo kikimashita.","I heard the AI talk.",["じんこうちのう"]),
 ("data-ethics","こじん の じょうほう を まもります。","kojin no jouhou wo mamorimasu.","We protect personal information.",["こじん"]),
 ("space-exploration","うちゅう の ぼうけん を よみました。","uchuu no bouken wo yomimashita.","I read the space adventure.",["うちゅう"]),
 ("medical-advance","ちりょう の ぶんせき を かきました。","chiryou no bunseki wo kakimashita.","I wrote an analysis of the treatment.",["ちりょう"]),
 ("climate-science","きこう の よそく を べんきょう しました。","kikou no yosoku wo benkyou shimashita.","I studied the climate prediction.",["きこう"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, romaji, gloss, cloze in SENTS:
        e = {"id": f"ja.sent.{sid}", "status": "draft", "text": text, "reading": text,
             "romaji": romaji, "gloss": gloss, "cloze_targets": cloze,
             "sources": SRC, "notes": "ai-assisted draft sentence; qualified review required before verified.",
             "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

ASSESS = {"id": "ja.assess.science-tech-ethics", "goal_id": "ja.goal.b2.science-tech-ethics",
          "kind": "transfer", "modality": "interaction",
          "rubric": {"scale": "observed", "criteria": [
              "discuss science, technology, and ethics with precise vocabulary",
              "describe a risk or benefit and its social effect without blocking errors"]},
          "review_status": "draft"}
with open(os.path.join(R, "assessments", "definitions.jsonl"), "a") as f:
    f.write(json.dumps(ASSESS, ensure_ascii=False) + "\n")

GOAL_YAML = """  - id: ja.goal.b2.science-tech-ethics
    description: 'Discuss science and technology: energy, biotech, AI, space, medicine, and ethics.'
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
    - ja.lex.science.kagaku
    - ja.lex.science.zouho
    assessment_ids:
    - ja.assess.science-tech-ethics
    transfer_required: true
    sources:
    - jf-standard
    - ai-drafted-extension
    review_status: draft
    generation:
      method: ai-assisted
      tool: omp
      model: strata/qwen3.8-flash-next-iq3_s
      date: '2026-10-04'
"""
with open(os.path.join(R, "curriculum", "goals.yaml"), "a") as f:
    f.write(GOAL_YAML)

DEP = """- from: ja.goal.b2.science-tech-ethics
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

U = [
 ("550-statistics-literacy","statistics literacy","statistics-literacy",
  ["toukeigaku","hyousou","heikinkyou","henza","samupuru"], "s:statistics-literacy"),
 ("551-energy-technology","energy technology","energy-technology",
  ["denki","taiyou","kaze2","genshi","denpo"], "s:energy-technology"),
 ("552-biotechnology","biotechnology","biotechnology",
  ["seibutsu","igen","saikou","gaisei","riron"], "s:biotechnology"),
 ("553-ai-society","AI and society","ai-society",
  ["kikai","jinkou-chou","robo","arugo","bunseki"], "s:ai-society"),
 ("554-data-ethics","data ethics","data-ethics",
  ["zouho","kojin","jouhou2","shakunin","poribaishikku"], "s:data-ethics"),
 ("555-space-exploration","space exploration","space-exploration",
  ["uchuu","houshaki","chikyu","getsuyou","isshou"], "s:space-exploration"),
 ("556-medical-advance","medical advance","medical-advance",
  ["iryou","sougou","yakuhin","chiryou","shutsunyu"], "s:medical-advance"),
 ("557-climate-science","climate science","climate-science",
  ["kikou","yosoku","kankyou-hoju","tenkan2","kisha2"], "s:climate-science"),
 ("558-risk-communication","risk communication","risk-communication",
  ["kiki2","hazard","houkoku","unmei","risshi"], "g:ja.grammar.b2.ni-totoi"),
 ("559-science-education","science education","science-education",
  ["kagaku","kentei","jikken","shippai2","seika2"], "g:ja.grammar.b2.wake-hodo"),
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

for fname, topic, uid, words, newitem in U:
    with open(os.path.join(R, "curriculum", "units", fname + ".yaml"), "w") as f:
        f.write(unit_yaml(topic, uid, "ja.goal.b2.science-tech-ethics", "science", words, newitem))

print("batch51 written")
