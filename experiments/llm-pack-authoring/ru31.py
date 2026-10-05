#!/usr/bin/env python3
"""ru-RU batch 31: B1 units 330-339 (opinions, reasons, examples)."""
import json, os

R = "experiments/llm-pack-authoring/candidates/ru-fullkit-v1"
SRC = ["ru-original"]
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-05", "notes": "ai-drafted; needs dictionary sourcing and human review"}

WORDS = [
 ("ubezhdenie","убеждение","убежде́ние","conviction"),
 ("illustraciya","иллюстрация","иллюстра́ция","illustration"),
 ("oprazhdenie","опровержение","опроверже́ние","refutation"),
 ("somnenie","сомнение","сомне́ние","doubt"),
 ("uverennost","уверенность","уве́ренность","confidence"),
 ("nesoglasie","несогласие","несогла́сие","disagreement"),
 ("protest","протест","протéст","protest"),
 ("vozrazhenie","возражение","возраже́ние","objection"),
 ("zamechanie","замечание","замéчание","remark"),
 ("popravka","поправка","попра́вка","amendment"),
 ("utochnenie","уточнение","уточне́ние","clarification"),
 ("formulirovka","формулировка","формули́ровка","wording"),
 ("tezis","тезис","те́зис","thesis"),
 ("polozhenie","положение","положе́ние","position, statement"),
 ("predpolozhenie","предположение","предположе́ние","supposition"),
 ("gipoteza","гипотеза","гипо́теза","hypothesis"),
 ("versiya","версия","ве́рсия","version"),
 ("dopushchenie","допущение","допуще́ние","assumption"),
 ("predposylka","предпосылка","предпосы́лка","premise"),
 ("statistika","статистика","статисти́ка","statistics"),
 ("cifra","цифра","цифра","digit, figure"),
 ("dannye","данные","да́нные","data"),
 ("issledovanie","исследование","исследова́ние","research"),
 ("eksperiment","эксперимент","эксперимéнт","experiment"),
 ("nablyudenie","наблюдение","наблюдéние","observation"),
 ("analogiya","аналогия","аналогия","analogy"),
 ("metafora","метафора","метафора","metaphor"),
 ("logika","логика","логика","logic"),
 ("zaklyuchenie","заключение","заключéние","conclusion"),
 ("fundament","фундамент","фундамéнт","foundation"),
 ("tablitsa","таблица","таблúца","table"),
 ("diagramma","диаграмма","диагра́мма","chart"),
 ("procent","процент","процéнт","percent"),
 ("menshinstvo","меньшинство","меньши́нство","minority"),
 ("bolshinstvo","большинство","большúнство","majority"),
 ("ekspertiza","экспертиза","эксперти́за","expert review"),
 ("suzhdenie","суждение","суждéние","judgment"),
 ("tochnost","точность","то́чность","accuracy"),
 ("netochnost","неточность","нетóчность","inaccuracy"),
 ("obobshchenie","обобщение","обобще́ние","generalization"),
 ("chastnost","частность","чáстность","particular case"),
 ("isklyuchenie","исключение","исключéние","exception"),
 ("zakon","закон","зако́н","law"),
 ("teoriya","теория","теорúя","theory"),
 ("praktika","практика","пра́ктика","practice"),
 ("tochka","точка","то́чка","point"),
 ("ulika","улика","у́лика","clue, evidence"),
 ("verdict","вердикт","ве́рдикт","verdict"),
 ("argumentaciya","аргументация","аргументáция","argumentation"),
 ("ubit","убедить","убеди́ть","to convince"),
]

def entry(rid, text, stress, gloss):
    return {"id": f"ru.lex.opinions.{rid}", "status": "draft",
            "forms": [{"text": text}], "readings": [{"text": stress}],
            "glosses": {"en-US": [gloss]}, "sources": SRC, "generation": GEN}

with open(os.path.join(R, "lexicon", "opinions.jsonl"), "w") as f:
    for rid, text, stress, gloss in WORDS:
        f.write(json.dumps(entry(rid, text, stress, gloss), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ru.grammar.b1.po-mneniyu-gen", "name": "По мнению + gen", "category": "syntax",
  "definition": "Attribution uses по мнению + genitive: по мнению экспертов. Learn the supplied chunks as given."},
 {"id": "ru.grammar.b1.naprimier", "name": "Например parenthetical", "category": "syntax",
  "definition": "Examples use например + clause: например, в прошлом году. Learn the supplied chunks as given."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("u330","Это убеждение.","This is a conviction.",["убеждение"]),
 ("u331","Это сомнение.","This is doubt.",["сомнение"]),
 ("u332","Это несогласие.","This is disagreement.",["несогласие"]),
 ("u333","Это возражение.","This is an objection.",["возражение"]),
 ("u334","Это тезис.","This is a thesis.",["тезис"]),
 ("u335","Это гипотеза.","This is a hypothesis.",["гипотеза"]),
 ("u336","Это данные.","This is data.",["данные"]),
 ("u337","Это большинство.","This is the majority.",["большинство"]),
 ("u338","Это суждение.","This is a judgment.",["суждение"]),
 ("u339","Это закон.","This is a law.",["закон"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, gloss, cloze in SENTS:
        e = {"id": f"ru.sent.b1.{sid}", "status": "draft", "text": text, "gloss": gloss,
             "cloze_targets": cloze, "sources": SRC, "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

ASSESS = [
 {"id": "ru.assess.b1.opinions-reading", "goal_id": "ru.goal.b1.opinions",
  "kind": "recognition", "modality": "reading",
  "rubric": {"scale": "observed", "criteria": [
      "Identify the stance word (сомнение, уверенность) in a supplied note.",
      "Match например chunks to their example.",
      "Distinguish возражение (objection) from замечание (remark)."]},
  "review_status": "draft"},
 {"id": "ru.assess.b1.opinions-writing", "goal_id": "ru.goal.b1.opinions",
  "kind": "production", "modality": "writing",
  "rubric": {"scale": "observed", "criteria": [
      "State an opinion with the supplied по мнению chunk.",
      "Give an example with the supplied например chunk.",
      "Express doubt or confidence with a supplied сомнение or уверенность chunk."]},
  "review_status": "draft"},
]
with open(os.path.join(R, "assessments", "definitions.jsonl"), "a") as f:
    for a in ASSESS:
        f.write(json.dumps(a, ensure_ascii=False) + "\n")

GOAL_YAML = """  - id: "ru.goal.b1.opinions"
    description: "State opinions with reasons and examples."
    band: "B1"
    modalities: ["reading", "writing"]
    prerequisites:
      - {target: "ru.goal.b1.culture-media", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.b1.relationships", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.on-ramp.everyday", dimension: "recall-meaning", required_state: "independent", strength: "hard"}
    required_concepts: ["ru.grammar.b1.po-mneniyu-gen", "ru.grammar.b1.naprimier", "ru.grammar.on-ramp.zero-present-copula"]
    assessment_ids: ["ru.assess.b1.opinions-reading", "ru.assess.b1.opinions-writing"]
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
 ("330-opinions-01","Conviction","убеждение, уверенность, сомнение, тезис and положение.",
  ["ubezhdenie","uverennost","somnenie","tezis","polozhenie"], "s:u330",
  "Do not confuse убеждение (conviction) with предположение (supposition)."),
 ("331-opinions-02","Doubt","сомнение, неточность, уточнение, версия and предположение.",
  ["somnenie","netochnost","utochnenie","versiya","predpolozhenie"], "s:u331",
  "Do not confuse версия (version) with предположение (supposition)."),
 ("332-opinions-03","Disagreement","несогласие, протест, возражение, замечание and поправка.",
  ["nesoglasie","protest","vozrazhenie","zamechanie","popravka"], "s:u332",
  "Do not confuse протест (protest) with возражение (objection)."),
 ("333-opinions-04","Objection","возражение, опровержение, улика, вердикт and заключение.",
  ["vozrazhenie","oprazhdenie","ulika","verdict","zaklyuchenie"], "s:u333",
  "Do not confuse опровержение (refutation) with заключение (conclusion)."),
 ("334-opinions-05","Thesis","тезис, формулировка, положение, аргументация and убедить.",
  ["tezis","formulirovka","polozhenie","argumentaciya","ubit"], "s:u334",
  "Do not confuse формулировка (wording) with положение (statement)."),
 ("335-opinions-06","Hypothesis","гипотеза, допущение, предпосылка, фундамент and теория.",
  ["gipoteza","dopushchenie","predposylka","fundament","teoriya"], "s:u335",
  "Do not confuse допущение (assumption) with предпосылка (premise)."),
 ("336-opinions-07","Data","данные, статистика, цифра, таблица and диаграмма.",
  ["dannye","statistika","cifra","tablitsa","diagramma"], "s:u336",
  "Do not confuse таблица (table) with диаграмма (chart)."),
 ("337-opinions-08","Majority","большинство, меньшинство, процент, экспертиза and наблюдение.",
  ["bolshinstvo","menshinstvo","procent","ekspertiza","nablyudenie"], "s:u337",
  "Do not confuse большинство (majority) with меньшинство (minority)."),
 ("338-opinions-09","Judgment","суждение, точность, неточность, обобщение and частность.",
  ["suzhdenie","tochnost","netochnost","obobshchenie","chastnost"], "s:u338",
  "Do not confuse обобщение (generalization) with частность (particular case)."),
 ("339-opinions-10","Law","закон, исключение, практика, аналогия and метафора.",
  ["zakon","isklyuchenie","praktika","analogiya","metafora"], "s:u339",
  "Do not confuse аналогия (analogy) with метафора (metaphor)."),
]

def unit_yaml(fname, title, summary, words, newitem, fence):
    uid = fname.split("-", 1)[1]
    num = fname[:3]
    lex = [w if w.startswith("ru.lex.") else f"ru.lex.opinions.{w}" for w in words]
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
    L.append('goal_id: "ru.goal.b1.opinions"')
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
    L.append(f'  expected_interpretations: ["{title}: opinions with taught forms only."]')
    L.append(f'  prohibited_ambiguity: ["{fence}"]')
    L.append('  target_proficiency: "B1"')
    L.append('  validation_method: "choice"')
    return "\n".join(L) + "\n"

for fname, title, summary, words, newitem, fence in U:
    with open(os.path.join(R, "curriculum", "units", fname + ".yaml"), "w") as f:
        f.write(unit_yaml(fname, title, summary, words, newitem, fence))

print("ru batch 31 written")
assert len(WORDS) == 50, len(WORDS)
