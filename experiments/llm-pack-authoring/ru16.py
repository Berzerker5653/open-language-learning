#!/usr/bin/env python3
"""ru-RU batch 16: A2 units 180-189 (practical instructions and procedures)."""
import json, os

R = "experiments/llm-pack-authoring/candidates/ru-fullkit-v1"
SRC = ["ru-original"]
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-05", "notes": "ai-drafted; needs dictionary sourcing and human review"}

WORDS = [
 ("shag","шаг","шаг","step"),
 ("instrukciya","инструкция","инструкция́","instruction, manual"),
 ("pravilo","правило","пра́вило","rule"),
 ("dalee","далее","да́лее","further, next"),
 ("zatem","затем","затем","then, thereafter"),
 ("instrument","инструмент","инстру́мент","tool, instrument"),
 ("otvyortka","отвёртка","отвёртка","screwdriver"),
 ("molotok","молоток","мо́лоток","hammer"),
 ("gvozd","гвоздь","гвоздь","nail"),
 ("lineika","линейка","линейка","ruler"),
 ("remont","ремонт","ремо́нт","repair"),
 ("pochinit","починить","почини́ть","to fix, mend"),
 ("slomannyi","сломанный","сло́манный","broken"),
 ("zamenit","заменить","замени́ть","to replace"),
 ("proverit","проверить","провери́ть","to check, verify"),
 ("sobrat","собрать","собра́ть","to assemble, collect"),
 ("detal","деталь","дета́ль","part, detail"),
 ("vint","винт","винт","screw, bolt"),
 ("shema","схема","схе́ма","diagram, scheme"),
 ("chast","часть","часть","part, piece"),
 ("otkryt","открыть","откры́ть","to open"),
 ("zakryt","закрыть","закры́ть","to close"),
 ("vklyuchit","включить","включи́ть","to turn on"),
 ("vyklyuchit","выключить","выключи́ть","to turn off"),
 ("nazhat","нажать","нажать","to press"),
 ("derzhat","держать","держа́ть","to hold"),
 ("rezat","резать","ре́зать","to cut"),
 ("nozhnicy","ножницы","но́жницы","scissors"),
 ("bbumaga","бумага","бумага","paper"),
 ("skotch","скотч","скотч","tape"),
 ("ostorozhno","осторожно","осто́рожно","carefully"),
 ("vnimatelno","внимательно","внима́тельно","attentively"),
 ("akkuratno","аккуратно","а́ккуратно","neatly, carefully"),
 ("medlennyi","медленный","ме́дленный","slow (adj)"),
 ("silno","сильно","си́льно","strongly, hard"),
 ("narezat","нарезать","нареза́ть","to cut up"),
 ("peremeshat","перемешать","перемеша́ть","to mix up, stir"),
 ("posolit","посолить","посолить","to salt"),
 ("poperchit","поперчить","попе́рчить","to pepper"),
 ("razogret","разогреть","разогреть","to heat up"),
 ("vyteret","вытереть","вы́тереть","to wipe"),
 ("vymyt","вымыть","вы́мыть","to wash"),
 ("pylesos","пылесос","пылесос","vacuum cleaner"),
 ("gubka","губка","гу́бка","sponge"),
 ("sredstvo","средство","сре́дство","means, product"),
 ("sledovat","следовать","сле́довать","to follow"),
 ("vypolnit","выполнить","выполни́ть","to carry out, complete"),
 ("zadanie","задание","зада́ние","task, assignment"),
 ("itog","итог","ито́г","result, summary"),
 ("gotovo","готово","го́тово","done, ready"),
]
assert len(WORDS) == 50, len(WORDS)

def entry(rid, form, reading, gloss):
    return {"id": f"ru.lex.instructions.{rid}", "status": "draft",
            "forms": [{"text": form, "is_primary": True}],
            "readings": [{"text": reading, "script": "cyrillic"}],
            "glosses": {"en-US": [gloss]}, "sources": SRC, "generation": GEN}

with open(os.path.join(R, "lexicon", "instructions.jsonl"), "w") as f:
    for rid, form, reading, gloss in WORDS:
        f.write(json.dumps(entry(rid, form, reading, gloss), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ru.grammar.a2.imperative-instructions", "name": "Imperative instructions", "category": "syntax",
  "definition": "Instructions use imperative verbs: открой окно, нажми кнопку. Learn the supplied forms as given; do not conjugate further."},
 {"id": "ru.grammar.a2.infinitive-steps", "name": "Infinitive step lists", "category": "syntax",
  "definition": "Step lists use infinitives with сначала and затем: сначала открыть, затем нажать. Learn the supplied chunks."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("u180","Это инструкция.","This is the instruction.",["инструкция"]),
 ("u181","Это инструмент.","This is a tool.",["инструмент"]),
 ("u182","Это ремонт.","This is a repair.",["ремонт"]),
 ("u183","Это схема.","This is a diagram.",["схема"]),
 ("u184","Это правило.","This is the rule.",["правило"]),
 ("u185","Это задание.","This is the task.",["задание"]),
 ("u186","Это шаг.","This is a step.",["шаг"]),
 ("u187","Это средство.","This is a product.",["средство"]),
 ("u188","Это готово.","This is ready.",["готово"]),
 ("u189","Это итог.","This is the result.",["итог"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, gloss, cloze in SENTS:
        e = {"id": f"ru.sent.a2.{sid}", "status": "draft", "text": text, "gloss": gloss,
             "cloze_targets": cloze, "sources": SRC, "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

ASSESS = [
 {"id": "ru.assess.a2.instructions-reading", "goal_id": "ru.goal.a2.instructions",
  "kind": "recognition", "modality": "reading",
  "rubric": {"scale": "observed", "criteria": [
      "Identify step-order words (сначала, затем, далее) in a supplied instruction.",
      "Match a tool word to its picture or context.",
      "Order two supplied steps correctly."]},
  "review_status": "draft"},
 {"id": "ru.assess.a2.instructions-writing", "goal_id": "ru.goal.a2.instructions",
  "kind": "production", "modality": "writing",
  "rubric": {"scale": "observed", "criteria": [
      "Write a two-step instruction with сначала and затем using supplied infinitives.",
      "State that something is готово with a taught noun.",
      "Use a taught imperative chunk to give one command."]},
  "review_status": "draft"},
]
with open(os.path.join(R, "assessments", "definitions.jsonl"), "a") as f:
    for a in ASSESS:
        f.write(json.dumps(a, ensure_ascii=False) + "\n")

GOAL_YAML = """  - id: "ru.goal.a2.instructions"
    description: "Follow and give practical instructions and procedures."
    band: "A2"
    modalities: ["reading", "writing"]
    prerequisites:
      - {target: "ru.goal.a2.comparisons", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.a1.time-plans", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.on-ramp.everyday", dimension: "recall-meaning", required_state: "independent", strength: "hard"}
    required_concepts: ["ru.grammar.a2.imperative-instructions", "ru.grammar.a2.infinitive-steps", "ru.grammar.on-ramp.zero-present-copula"]
    assessment_ids: ["ru.assess.a2.instructions-reading", "ru.assess.a2.instructions-writing"]
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
 ("180-instructions-01","Steps","шаг, инструкция, правило, далее and затем.",
  ["shag","instrukciya","pravilo","dalee","zatem"], "s:u180",
  "Do not confuse правило (rule) with инструкция (manual)."),
 ("181-instructions-02","Tools","инструмент, отвёртка, молоток, гвоздь and линейка.",
  ["instrument","otvyortka","molotok","gvozd","lineika"], "s:u181",
  "Do not confuse молоток (hammer) with отвёртка (screwdriver)."),
 ("182-instructions-03","Repair","ремонт, починить, сломанный, заменить and проверить.",
  ["remont","pochinit","slomannyi","zamenit","proverit"], "s:u182",
  "Do not confuse починить (to fix) with заменить (to replace)."),
 ("183-instructions-04","Assembly","собрать, деталь, винт, схема and часть.",
  ["sobrat","detal","vint","shema","chast"], "s:u183",
  "Do not confuse деталь (part) with часть (piece)."),
 ("184-instructions-05","Open and close","открыть, закрыть, включить, выключить and нажать.",
  ["otkryt","zakryt","vklyuchit","vyklyuchit","nazhat"], "s:u184",
  "Do not confuse включить (to turn on) with выключить (to turn off)."),
 ("185-instructions-06","Hands on","держать, резать, ножницы, скотч and бумага.",
  ["derzhat","rezat","nozhnicy","skotch","bbumaga"], "s:u185",
  "Do not confuse резать (to cut) with держать (to hold)."),
 ("186-instructions-07","Carefully","осторожно, внимательно, аккуратно, медленный and сильно.",
  ["ostorozhno","vnimatelno","akkuratno","medlennyi","silno"], "s:u186",
  "Do not confuse осторожно (careful) with внимательно (attentive)."),
 ("187-instructions-08","In the kitchen","нарезать, перемешать, посолить, поперчить and разогреть.",
  ["narezat","peremeshat","posolit","poperchit","razogret"], "s:u187",
  "Do not confuse нарезать (to slice) with перемешать (to stir)."),
 ("188-instructions-09","Cleaning","вытереть, вымыть, пылесос, губка and средство.",
  ["vyteret","vymyt","pylesos","gubka","sredstvo"], "s:u188",
  "Do not confuse вытереть (to wipe) with вымыть (to wash)."),
 ("189-instructions-10","Getting it done","следовать, выполнить, задание, итог and готово.",
  ["sledovat","vypolnit","zadanie","itog","gotovo"], "s:u189",
  "Do not confuse итог (result) with готово (done)."),
]

def unit_yaml(fname, title, summary, words, newitem, fence):
    uid = fname.split("-", 1)[1]
    num = fname[:3]
    lex = [f"ru.lex.instructions.{w}" for w in words]
    if newitem.startswith("s:"):
        newref = f"ru.sent.a2.{newitem[2:]}"
        allowed_gram = OLD_GRAM
    else:
        newref = newitem[2:]
        allowed_gram = [newref] + OLD_GRAM
    old = ["ru.lex.everyday.eto", "ru.lex.everyday.dom"]
    refs = lex + [newref] + old
    L = []
    L.append('id: "ru.unit.a2.' + uid + '"')
    L.append('goal_id: "ru.goal.a2.instructions"')
    L.append(f'title: "{title}"')
    L.append(f'summary: "{summary}"')
    L.append("estimated_minutes: 8")
    L.append("activities:")
    L.append(f'  - id: "ru.activity.a2.u{num}-read"')
    L.append('    type: "encounter-read"')
    L.append('    modality: "reading"')
    L.append("    support_level: 1")
    L.append("    content_refs: &v [" + ", ".join(f'"{r}"' for r in refs) + "]")
    L.append(f'  - id: "ru.activity.a2.u{num}-grammar"')
    L.append('    type: "encounter-read"')
    L.append('    modality: "reading"')
    L.append("    support_level: 1")
    L.append("    content_refs: &g [" + ", ".join(f'"{r}"' for r in allowed_gram) + "]")
    if newitem.startswith("s:"):
        L.append(f'  - id: "ru.activity.a2.u{num}-cloze"')
        L.append('    type: "cloze"')
        L.append('    modality: "writing"')
        L.append("    support_level: 1")
        L.append(f'    content_refs: ["{newref}"]')
    L.append(f'  - id: "ru.activity.a2.u{num}-write"')
    L.append('    type: "recall"')
    L.append('    modality: "writing"')
    L.append("    support_level: 0")
    L.append("    content_refs: *v")
    L.append("generation_contract:")
    L.append("  allowed_vocab: *v")
    L.append("  allowed_grammar: *g")
    L.append("  new_item_budget: 6")
    L.append("  register: []")
    L.append(f'  expected_interpretations: ["{title}: instructions with taught forms only."]')
    L.append(f'  prohibited_ambiguity: ["{fence}"]')
    L.append('  target_proficiency: "A2"')
    L.append('  validation_method: "choice"')
    return "\n".join(L) + "\n"

for fname, title, summary, words, newitem, fence in U:
    with open(os.path.join(R, "curriculum", "units", fname + ".yaml"), "w") as f:
        f.write(unit_yaml(fname, title, summary, words, newitem, fence))

print("ru batch 16 written")
