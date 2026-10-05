#!/usr/bin/env python3
"""ru-RU batch 36: B1 units 380-389 (conditions and hypothetical choices)."""
import json, os

R = "experiments/llm-pack-authoring/candidates/ru-fullkit-v1"
SRC = ["ru-original"]
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-05", "notes": "ai-drafted; needs dictionary sourcing and human review"}

WORDS = [
 ("predstav","представь","предста́вь","imagine"),
 ("voobraz","вообрази","вообрази́","imagine"),
 ("fantaziya","фантазия","фанта́зия","fantasy"),
 ("vymysel","вымысел","вы́мысел","fiction"),
 ("illyuziya","иллюзия","иллю́зия","illusion"),
 ("realnost","реальность","реáльность","reality"),
 ("dejstvitelnost","действительность","действúтельность","actuality"),
 ("ispytanie","испытание","испыта́ние","trial, ordeal"),
 ("izmerenie","измерение","измерéние","measurement"),
 ("razlichie","различие","рáзличие","difference"),
 ("shodstvo","сходство","схóдство","similarity"),
 ("otlichie","отличие","óтличие","distinction"),
 ("osobennost","особенность","особéнность","feature"),
 ("specifika","специфика","специ́фика","specificity"),
 ("proporciya","пропорция","пропóрция","proportion"),
 ("sootnoshenie","соотношение","соотношéние","ratio"),
 ("balans","баланс","бáланс","balance"),
 ("ravnovesie","равновесие","равновéсие","equilibrium"),
 ("pereves","перевес","перевéс","preponderance"),
 ("preimushchestvo","преимущество","преимýщество","advantage"),
 ("nedostatok","недостаток","недóстаток","shortcoming"),
 ("plyus","плюс","плюс","plus"),
 ("minus","минус","мúнус","minus"),
 ("vygoda","выгода","вы́года","benefit"),
 ("vklad","вклад","вклáд","contribution"),
 ("trud","труд","трýд","labor"),
 ("hobbi","хобби","хóбби","hobby"),
 ("uvlechenie","увлечение","увлечéние","hobby, passion"),
 ("strast","страсть","стрáсть","passion"),
 ("prizvanie","призвание","призвáние","calling"),
 ("chest","честь","чéсть","honor"),
 ("reputaciya","репутация","репутáция","reputation"),
 ("prestizh","престиж","прести́ж","prestige"),
 ("status","статус","стáтус","status"),
 ("rang","ранг","ранг","rank"),
 ("mesto","место","мéсто","place"),
 ("rukovoditel","руководитель","руководúтель","leader"),
 ("sleduet","следует","слéдует","one should"),
 ("vygodnyy","выгодный","вы́годный","profitable"),
 ("obdumat","обдумать","обду́мать","to consider"),
 ("vzvesit","взвесить","взвéсить","to weigh"),
 ("somnevat","сомневаться","сóмневаться","to doubt"),
 ("rassudok","рассудок","рассýдок","reason"),
 ("logichnyy","логичный","лóгичный","logical"),
 ("posledovatelnyy","последовательный","последóвательный","consistent"),
 ("protivorechie","противоречие","противóречие","contradiction"),
 ("dokazyvat","доказывать","дóказывать","to prove"),
 ("opiratsya","опираться","опúраться","to rely on"),
 ("polagat","полагать","полага́ть","to suppose"),
 ("voobrazhenie","воображение","воображéние","imagination"),
]

def entry(rid, text, stress, gloss):
    return {"id": f"ru.lex.future2.{rid}", "status": "draft",
            "forms": [{"text": text}], "readings": [{"text": stress}],
            "glosses": {"en-US": [gloss]}, "sources": SRC, "generation": GEN}

with open(os.path.join(R, "lexicon", "future2.jsonl"), "w") as f:
    for rid, text, stress, gloss in WORDS:
        f.write(json.dumps(entry(rid, text, stress, gloss), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ru.grammar.b1.esli-by", "name": "Если бы hypothetical", "category": "syntax",
  "definition": "Hypotheticals use если бы: если бы завтра, было бы интересно. Learn the supplied chunks as given."},
 {"id": "ru.grammar.b1.luchshe-by", "name": "Лучше бы preference", "category": "syntax",
  "definition": "Preferences use лучше бы: лучше бы остаться. Learn the supplied chunks as given."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("u380","Это различие.","This is a difference.",["различие"]),
 ("u381","Это сходство.","This is a similarity.",["сходство"]),
 ("u382","Это отличие.","This is a distinction.",["отличие"]),
 ("u383","Это баланс.","This is a balance.",["баланс"]),
 ("u384","Это преимущество.","This is an advantage.",["преимущество"]),
 ("u385","Это недостаток.","This is a shortcoming.",["недостаток"]),
 ("u386","Это выгода.","This is a benefit.",["выгода"]),
 ("u387","Это репутация.","This is a reputation.",["репутация"]),
 ("u388","Это противоречие.","This is a contradiction.",["противоречие"]),
 ("u389","Это испытание.","This is a trial.",["испытание"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, gloss, cloze in SENTS:
        e = {"id": f"ru.sent.b1.{sid}", "status": "draft", "text": text, "gloss": gloss,
             "cloze_targets": cloze, "sources": SRC, "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

ASSESS = [
 {"id": "ru.assess.b1.future-conditions-reading2", "goal_id": "ru.goal.b1.future-conditions2",
  "kind": "recognition", "modality": "reading",
  "rubric": {"scale": "observed", "criteria": [
      "Identify comparison words (различие, сходство) in a supplied note.",
      "Match если бы chunks to their hypothetical.",
      "Distinguish преимущество (advantage) from недостаток (shortcoming)."]},
  "review_status": "draft"},
 {"id": "ru.assess.b1.future-conditions-writing2", "goal_id": "ru.goal.b1.future-conditions2",
  "kind": "production", "modality": "writing",
  "rubric": {"scale": "observed", "criteria": [
      "Weigh options with the supplied следует chunk.",
      "Hypothesize with the supplied если бы chunk.",
      "Prefer with a supplied лучше бы chunk."]},
  "review_status": "draft"},
]
with open(os.path.join(R, "assessments", "definitions.jsonl"), "a") as f:
    for a in ASSESS:
        f.write(json.dumps(a, ensure_ascii=False) + "\n")

GOAL_YAML = """  - id: "ru.goal.b1.future-conditions2"
    description: "Weigh conditions and hypothetical choices."
    band: "B1"
    modalities: ["reading", "writing"]
    prerequisites:
      - {target: "ru.goal.b1.future-conditions", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.b1.opinions", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.on-ramp.everyday", dimension: "recall-meaning", required_state: "independent", strength: "hard"}
    required_concepts: ["ru.grammar.b1.esli-by", "ru.grammar.b1.luchshe-by", "ru.grammar.on-ramp.zero-present-copula"]
    assessment_ids: ["ru.assess.b1.future-conditions-reading2", "ru.assess.b1.future-conditions-writing2"]
    transfer_required: false
    sources: ["ru-original"]
    review_status: "draft"
    generation:
      method: "ai-assisted"
      tool: "omp"
      model: "strata/qwen3.8-flash-next-iq3_s"
      date: "2026-10-05"
      notes: "ai-drafted; needs dictionary sourcing and human review"
"""
with open(os.path.join(R, "curriculum", "goals.yaml"), "a") as f:
    f.write(GOAL_YAML)

OLD_GRAM = ["ru.grammar.on-ramp.eto-identification", "ru.grammar.on-ramp.zero-present-copula"]

U = [
 ("380-future2-01","Imagine","представь, вообрази, фантазия, вымысел and воображение.",
  ["predstav","voobraz","fantaziya","vymysel","voobrazhenie"], "s:u380",
  "Do not confuse вымысел (fiction) with иллюзия (illusion)."),
 ("381-future2-02","Reality","реальность, действительность, иллюзия, фантазия and вымысел.",
  ["realnost","dejstvitelnost","illyuziya","fantaziya","vymysel"], "s:u381",
  "Do not confuse реальность (reality) with иллюзия (illusion)."),
 ("382-future2-03","Trial","испытание, измерение, различие, сходство and отличие.",
  ["ispytanie","izmerenie","razlichie","shodstvo","otlichie"], "s:u382",
  "Do not confuse различие (difference) with отличие (distinction)."),
 ("383-future2-04","Feature","особенность, специфика, пропорция, соотношение and баланс.",
  ["osobennost","specifika","proporciya","sootnoshenie","balans"], "s:u383",
  "Do not confuse специфика (specificity) with особенность (feature)."),
 ("384-future2-05","Balance","равновесие, перевес, преимущество, недостаток and баланс.",
  ["ravnovesie","pereves","preimushchestvo","nedostatok","balans"], "s:u384",
  "Do not confuse перевес (preponderance) with равновесие (equilibrium)."),
 ("385-future2-06","Plus","плюс, минус, выгода, вклад and труд.",
  ["plyus","minus","vygoda","vklad","trud"], "s:u385",
  "Do not confuse выгода (benefit) with вклад (contribution)."),
 ("386-future2-07","Hobby","хобби, увлечение, страсть, призвание and труд.",
  ["hobbi","uvlechenie","strast","prizvanie","trud"], "s:u386",
  "Do not confuse увлечение (hobby) with призвание (calling)."),
 ("387-future2-08","Honor","честь, репутация, престиж, статус and ранг.",
  ["chest","reputaciya","prestizh","status","rang"], "s:u387",
  "Do not confuse престиж (prestige) with репутация (reputation)."),
 ("388-future2-09","Leader","место, руководитель, следует, выгодный and обдумать.",
  ["mesto","rukovoditel","sleduet","vygodnyy","obdumat"], "s:u388",
  "Do not confuse следует (one should) with выгодный (profitable)."),
 ("389-future2-10","Weigh","взвесить, сомневаться, рассудок, логичный and последовательный.",
  ["vzvesit","somnevat","rassudok","logichnyy","posledovatelnyy"], "s:u389",
  "Do not confuse рассудок (reason) with сомневаться (to doubt)."),
]

def unit_yaml(fname, title, summary, words, newitem, fence):
    uid = fname.split("-", 1)[1]
    num = fname[:3]
    lex = [w if w.startswith("ru.lex.") else f"ru.lex.future2.{w}" for w in words]
    if newitem.startswith("s:"):
        newref = f"ru.sent.b1.{newitem[2:]}"
        allowed_gram = OLD_GRAM
    else:
        newref = newitem[2:]
        allowed_gram = [newref] + OLD_GRAM
    old = ["ru.lex.everyday.eto", "ru.lex.everyday.dom"]
    refs = lex + [newref] + old
    L = []
    L.append('id: "ru.unit.b1.' + uid + '"')
    L.append('goal_id: "ru.goal.b1.future-conditions2"')
    L.append(f'title: "{title}"')
    L.append(f'summary: "{summary}"')
    L.append("estimated_minutes: 8")
    L.append("activities:")
    L.append(f'  - id: "ru.activity.b1.u{num}-read"')
    L.append('    type: "encounter-read"')
    L.append('    modality: "reading"')
    L.append("    support_level: 1")
    L.append("    content_refs: &v [" + ", ".join(f'"{r}"' for r in refs) + "]")
    L.append(f'  - id: "ru.activity.b1.u{num}-grammar"')
    L.append('    type: "encounter-read"')
    L.append('    modality: "reading"')
    L.append("    support_level: 1")
    L.append("    content_refs: &g [" + ", ".join(f'"{r}"' for r in allowed_gram) + "]")
    if newitem.startswith("s:"):
        L.append(f'  - id: "ru.activity.b1.u{num}-cloze"')
        L.append('    type: "cloze"')
        L.append('    modality: "writing"')
        L.append("    support_level: 1")
        L.append(f'    content_refs: ["{newref}"]')
    L.append(f'  - id: "ru.activity.b1.u{num}-write"')
    L.append('    type: "recall"')
    L.append('    modality: "writing"')
    L.append("    support_level: 0")
    L.append("    content_refs: *v")
    L.append("generation_contract:")
    L.append("  allowed_vocab: *v")
    L.append("  allowed_grammar: *g")
    L.append("  new_item_budget: 6")
    L.append("  register: []")
    L.append(f'  expected_interpretations: ["{title}: hypothetical with taught forms only."]')
    L.append(f'  prohibited_ambiguity: ["{fence}"]')
    L.append('  target_proficiency: "B1"')
    L.append('  validation_method: "choice"')
    return "\n".join(L) + "\n"

for fname, title, summary, words, newitem, fence in U:
    with open(os.path.join(R, "curriculum", "units", fname + ".yaml"), "w") as f:
        f.write(unit_yaml(fname, title, summary, words, newitem, fence))

print("ru batch 36 written")
assert len(WORDS) == 50, len(WORDS)
