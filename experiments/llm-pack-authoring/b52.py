#!/usr/bin/env python3
"""ja-JP batch 52: B2 units 560-569 (science-tech-ethics tail + education-pedagogy start)."""
import json, os

R = "languages/ja-JP"
SRC = ["jf-standard", "ai-drafted-extension"]
NOTE = ("Framework-level sourcing only (JF Standard reference, no descriptor text copied); "
        "a dictionary/reviewer source must be added before verified status.")
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-04", "notes": "ai-assisted draft wording; qualified review pending."}

WORDS = [
 ("kitei","regulation","n","regulation, rule"),
 ("seinin","adult","n","adult"),
 ("hoshou2","guarantee2","n","assurance"),
 ("tousei2","control","n","control, regulation"),
 ("hantai3","resistance","n","resistance"),
 ("sangyou","industry","n","industry"),
 ("shinko2","emerging","adj-na","emerging"),
 ("fukumu2","include","v","to include"),
 ("koura","efficiency loss","n","waste, loss"),
 ("touka","tokenization","n","tokenization"),
 ("tsuuyou","universal","adj-na","universal, common"),
 ("kiso2","basic","adj-na","basic, fundamental"),
 ("kentei2","hypothesis","n","hypothesis"),
 ("shoumei","proof","n","proof, explanation"),
 ("hanrei","counterexample","n","counterexample"),
 ("kairyou","improvement","n","improvement"),
 ("kyoushi","teacher","n","teacher"),
 ("gakusei","student","n","student"),
 ("kyoshitsu","classroom","n","classroom"),
 ("kyokugaku","pedagogy","n","pedagogy, education studies"),
 ("rinen","principle","n","principle, ideal"),
 ("mokuteki","purpose","n","purpose"),
 ("hyoka","assessment","n","assessment"),
 ("seiseki","grades","n","grades, results"),
 ("shikaku","qualification","n","qualification"),
 ("kyouzai","teaching materials","n","teaching materials"),
 ("shukudai","homework","n","homework"),
 ("taiwa","conversation","n","conversation"),
 ("happyou","presentation","n","presentation"),
 ("guruupu","group","n","group"),
 ("togihou","discussion method","n","discussion method"),
 ("jiko","self","n","self"),
 ("ninshiki","cognition","n","cognition"),
 ("riki","comprehension","n","comprehension"),
 ("oen","application","n","application"),
 ("kihon","basics","n","basics"),
 ("jissen","practice","n","practice"),
 ("gakuryoku","academic ability","n","academic ability"),
 ("saidou","adaptation","n","adaptation"),
 ("koryaku","strategy","n","strategy"),
 ("rengo","association","n","association"),
 ("koubun","passage","n","passage, text"),
 ("yakugo","translation","n","translation"),
 ("hatsuon","pronunciation","n","pronunciation"),
 ("choukai","dialogue","n","dialogue"),
 ("bunkai","breakdown","n","analysis, breakdown"),
 ("bunkou","reading aloud","n","reading aloud"),
 ("fantei","judgment","n","judgment"),
 ("seminaa","seminar","n","seminar"),
 ("hodai","method","n","method"),
]
assert len(WORDS) == 50, len(WORDS)

SCIENCE_IDS = ["kitei","seinin","hoshou2","tousei2","hantai3","sangyou","shinko2","fukumu2",
               "koura","touka","tsuuyou","kiso2","kentei2","shoumei","hanrei","kairyou",
               "rinen","mokuteki","hyoka","koryaku"]

def entry(shard, rid, kana, pos, gloss, tag):
    return {"id": f"ja.lex.{shard}.{rid}", "status": "draft",
            "forms": [{"text": kana, "script": "hiragana", "is_primary": True}],
            "readings": [{"text": kana, "script": "hiragana"},
                         {"text": rid, "transliteration_system": "modified-hepburn"}],
            "glosses": {"en-US": [gloss]}, "part_of_speech": pos,
            "registers": ["ja.register.neutral-common"], "semantic_tags": [tag],
            "sources": SRC, "notes": NOTE, "generation": GEN}

with open(os.path.join(R, "lexicon", "science2.jsonl"), "w") as f:
    for rid, kana, pos, gloss in WORDS:
        if rid in SCIENCE_IDS:
            f.write(json.dumps(entry("science2", rid, kana, pos, gloss, "science"), ensure_ascii=False) + "\n")
with open(os.path.join(R, "lexicon", "edu3.jsonl"), "w") as f:
    for rid, kana, pos, gloss in WORDS:
        if rid not in SCIENCE_IDS:
            f.write(json.dumps(entry("edu3", rid, kana, pos, gloss, "education"), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ja.grammar.b2.ni-sotte", "name": "〜に沿って (in line with)", "category": "syntax",
  "definition": "に沿って marks conformity: きてい に そって うんよう する. Draft definition pending review."},
 {"id": "ja.grammar.b2.bakari-da", "name": "〜ばかりだ (just did / nothing but)", "category": "syntax",
  "definition": "ばかりだ marks recency or excess: べんきょう した ばかりだ. Draft definition pending review."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("tech-regulation","きてい の きじ を よみました。","kitei no kiji wo yomimashita.","I read the regulation article.",["きてい"]),
 ("innovation-economics","さんぎょう の はなし を ききました。","sangyou no hanashi wo kikimashita.","I heard the industry talk.",["さんぎょう"]),
 ("science-communication","しょうめい の ぶんぽう を べんきょう しました。","shoumei no bunpou wo benkyou shimashita.","I studied the proof structure.",["しょうめい"]),
 ("learning-theory","にんしき の じっけん を べんきょう しました。","ninshiki no jikken wo benkyou shimashita.","I studied the cognition experiment.",["にんしき"]),
 ("classroom-methods","きょうしつの ほうほう を べんきょう しました。","kyoshitsu no houhou wo benkyou shimashita.","I studied the classroom method.",["きょうしつ"]),
 ("assessment-debate","せいせき の てんじ を べんきょう しました。","seiseki no tenji wo benkyou shimashita.","I studied the display of grades.",["せいせき"]),
 ("curriculum-design","きょうざい を あつめました。","kyouzai wo atsumemashita.","I gathered teaching materials.",["きょうざい"]),
 ("language-acquisition","はつおん の れんしゅう を しました。","hatsuon no renshuu wo shimashita.","I practiced pronunciation.",["はつおん"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, romaji, gloss, cloze in SENTS:
        e = {"id": f"ja.sent.{sid}", "status": "draft", "text": text, "reading": text,
             "romaji": romaji, "gloss": gloss, "cloze_targets": cloze,
             "sources": SRC, "notes": "ai-assisted draft sentence; qualified review required before verified.",
             "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

ASSESS = {"id": "ja.assess.education-pedagogy", "goal_id": "ja.goal.b2.education-pedagogy",
          "kind": "transfer", "modality": "interaction",
          "rubric": {"scale": "observed", "criteria": [
              "discuss teaching methods, assessment, and acquisition with precise vocabulary",
              "describe a learning activity and its purpose without blocking errors"]},
          "review_status": "draft"}
with open(os.path.join(R, "assessments", "definitions.jsonl"), "a") as f:
    f.write(json.dumps(ASSESS, ensure_ascii=False) + "\n")

GOAL_YAML = """  - id: ja.goal.b2.education-pedagogy
    description: 'Discuss education: methods, assessment, curriculum, and acquisition.'
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
    - ja.lex.edu3.kyoushi
    - ja.lex.edu3.gakusei
    assessment_ids:
    - ja.assess.education-pedagogy
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

DEP = """- from: ja.goal.b2.education-pedagogy
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
 ("560-tech-regulation","tech regulation","tech-regulation","science2",
  ["kitei","tousei2","hantai3","hoshou2","seinin"], "s:tech-regulation"),
 ("561-innovation-economics","innovation economics","innovation-economics","science2",
  ["sangyou","shinko2","fukumu2","koura","touka"], "s:innovation-economics"),
 ("562-science-communication","science communication","science-communication","science2",
  ["tsuuyou","kiso2","shoumei","hanrei","kairyou"], "s:science-communication"),
 ("563-ethics-debate","ethics debate","ethics-debate","science2",
  ["kentei2","rinen","mokuteki","hyoka","koryaku"], "g:ja.grammar.b2.ni-sotte"),
 ("564-learning-theory","learning theory","learning-theory","edu3",
  ["kyokugaku","ninshiki","riki","rengo","gakuryoku"], "s:learning-theory"),
 ("565-classroom-methods","classroom methods","classroom-methods","edu3",
  ["kyoushi","gakusei","kyoshitsu","hodai","guruupu"], "s:classroom-methods"),
 ("566-assessment-debate","assessment debate","assessment-debate","edu3",
  ["seiseki","shikaku","fantei","togihou","happyou"], "s:assessment-debate"),
 ("567-curriculum-design","curriculum design","curriculum-design","edu3",
  ["kyouzai","shukudai","kihon","jissen","koubun"], "s:curriculum-design"),
 ("568-language-acquisition","language acquisition","language-acquisition","edu3",
  ["yakugo","hatsuon","choukai","taiwa","bunkai"], "s:language-acquisition"),
 ("569-bilingual-education","bilingual education","bilingual-education","edu3",
  ["bunkou","saidou","oen","jiko","seminaa"], "g:ja.grammar.b2.bakari-da"),
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

for fname, topic, uid, shard, words, newitem in U:
    goal = "ja.goal.b2.science-tech-ethics" if shard == "science2" else "ja.goal.b2.education-pedagogy"
    with open(os.path.join(R, "curriculum", "units", fname + ".yaml"), "w") as f:
        f.write(unit_yaml(topic, uid, goal, shard, words, newitem))

print("batch52 written")
