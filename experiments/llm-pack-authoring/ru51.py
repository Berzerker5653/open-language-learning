#!/usr/bin/env python3
"""ru-RU batch 51: B2 units 530-539 (study-oriented reading and definitions)."""
import json, os

R = "experiments/llm-pack-authoring/candidates/ru-fullkit-v1"
SRC = ["ru-original"]
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-05", "notes": "ai-drafted; needs dictionary sourcing and human review"}

WORDS = [
 ("glossariy","глоссарий","глоссáрий","glossary"),
 ("definiciya","дефиниция","дефинúция","definition"),
 ("konnotaciya","коннотация","коннотáция","connotation"),
 ("denotaciya","денотация","денотáция","denotation"),
 ("znachenie","значение","значéние","meaning, value"),
 ("upotreblenie","употребление","употрéбление","usage"),
 ("potreblenie","потребление","потрéбление","consumption"),
 ("paradigma","парадигма","парадúгма","paradigm"),
 ("inventar","инвентарь","инвентáрь","inventory"),
 ("perechen","перечень","пéречень","list, enumeration"),
 ("spisok","список","спúсок","list"),
 ("perechislenie","перечисление","перечúсление","enumeration"),
 ("vychislenie","вычисление","вычúсление","calculation"),
 ("podschjot","подсчёт","подсчёт","counting"),
 ("edinica","единица","едúница","unit"),
 ("shkala","шкала","шкалá","scale"),
 ("gradaciya","градация","градáция","gradation"),
 ("stupen","ступень","стýпень","step, rung"),
 ("faza","фаза","фáза","phase"),
 ("period","период","перúод","period"),
 ("epoha","эпоха","э́поха","epoch"),
 ("era","эра","э́ра","era"),
 ("kalendar","календарь","календáрь","calendar"),
 ("mig","миг","миг","moment"),
 ("mgnovenie","мгновение","мгновéние","instant"),
 ("sekunda","секунда","секýнда","second"),
 ("sutki","сутки","сýтки","24 hours, day"),
 ("stoletie","столетие","столéтие","century"),
 ("desatiletie","десятилетие","десятúлетие","decade"),
 ("chetvert","четверть","чéтверть","quarter"),
 ("tret","треть","треть","third"),
 ("raznost","разность","рáзность","difference"),
 ("proizvedenie","произведение","произведéние","product; work (art)"),
 ("uravnennie","уравнение","уравнéние","equation"),
 ("formula","формула","фóрмула","formula"),
 ("vyrazhenie","выражение","выражéние","expression"),
 ("ravenstvo","равенство","равéнство","equality"),
 ("neravenstvo","неравенство","неравéнство","inequality"),
 ("graf","граф","граф","graph"),
 ("rebro","ребро","рéбро","edge"),
 ("radius","радиус","рáдиус","radius"),
 ("diametr","диаметр","диáметр","diameter"),
 ("okruzhnost","окружность","окрýжность","circle, circumference"),
 ("kvadrat","квадрат","квадрáт","square"),
 ("kub","куб","куб","cube"),
 ("shar","шар","шар","sphere, ball"),
 ("piramida","пирамида","пирамúда","pyramid"),
 ("mnozhestvo","множество","мнóжество","set, multitude"),
 ("element","элемент","элéмент","element"),
 ("beskonechnost","бесконечность","бесконéчность","infinity"),
]

def entry(rid, text, stress, gloss):
    return {"id": f"ru.lex.study.{rid}", "status": "draft",
            "forms": [{"text": text}], "readings": [{"text": stress}],
            "glosses": {"en-US": [gloss]}, "sources": SRC, "generation": GEN}

with open(os.path.join(R, "lexicon", "study.jsonl"), "w") as f:
    for rid, text, stress, gloss in WORDS:
        f.write(json.dumps(entry(rid, text, stress, gloss), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ru.grammar.b2-nazyvaetsya", "name": "Называется definition", "category": "syntax",
  "definition": "Definitions use называется: это называется термин. Learn the supplied chunks as given."},
 {"id": "ru.grammar.b2-pod-kotorym-ponimayu", "name": "Под которым понимаю definition", "category": "syntax",
  "definition": "Stipulation uses под которым понимаю: под термином понимаю. Learn the supplied chunks as given."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("u530","Это глоссарий.","This is a glossary.",["глоссарий"]),
 ("u531","Это дефиниция.","This is a definition.",["дефиниция"]),
 ("u532","Это значение.","This is a meaning.",["значение"]),
 ("u533","Это перечень.","This is a list.",["перечень"]),
 ("u534","Это единица.","This is a unit.",["единица"]),
 ("u535","Это шкала.","This is a scale.",["шкала"]),
 ("u536","Это фаза.","This is a phase.",["фаза"]),
 ("u537","Это формула.","This is a formula.",["формула"]),
 ("u538","Это квадрат.","This is a square.",["квадрат"]),
 ("u539","Это элемент.","This is an element.",["элемент"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, gloss, cloze in SENTS:
        e = {"id": f"ru.sent.b2.{sid}", "status": "draft", "text": text, "gloss": gloss,
             "cloze_targets": cloze, "sources": SRC, "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

ASSESS = [
 {"id": "ru.assess.b2.academic-study-reading", "goal_id": "ru.goal.b2.academic-study",
  "kind": "recognition", "modality": "reading",
  "rubric": {"scale": "observed", "criteria": [
      "Identify definition words (дефиниция, термин) in a supplied text.",
      "Match называется chunks to their definition.",
      "Distinguish значение (meaning) from денотация (denotation)."]},
  "review_status": "draft"},
 {"id": "ru.assess.b2.academic-study-writing", "goal_id": "ru.goal.b2.academic-study",
  "kind": "production", "modality": "writing",
  "rubric": {"scale": "observed", "criteria": [
      "Define with the supplied называется chunk.",
      "Stipulate with the supplied под которым понимаю chunk.",
      "Classify with a supplied перечень or категория chunk."]},
  "review_status": "draft"},
]
with open(os.path.join(R, "assessments", "definitions.jsonl"), "a") as f:
    for a in ASSESS:
        f.write(json.dumps(a, ensure_ascii=False) + "\n")

GOAL_YAML = """  - id: "ru.goal.b2.academic-study"
    description: "Read for study and write precise definitions."
    band: "B2"
    modalities: ["reading", "writing"]
    prerequisites:
      - {target: "ru.goal.b2.critical-reading4", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.b1.learning-work", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.on-ramp.everyday", dimension: "recall-meaning", required_state: "independent", strength: "hard"}
    required_concepts: ["ru.grammar.b2-nazyvaetsya", "ru.grammar.b2-pod-kotorym-ponimayu", "ru.grammar.on-ramp.zero-present-copula"]
    assessment_ids: ["ru.assess.b2.academic-study-reading", "ru.assess.b2.academic-study-writing"]
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
 ("530-study-01","Glossary","глоссарий, дефиниция, коннотация, денотация and значение.",
  ["glossariy","definiciya","konnotaciya","denotaciya","znachenie"], "s:u530",
  "Do not confuse коннотация (connotation) with денотация (denotation)."),
 ("531-study-02","Usage","употребление, потребление, значение, дефиниция and глоссарий.",
  ["upotreblenie","potreblenie","znachenie","definiciya","glossariy"], "s:u531",
  "Do not confuse употребление (usage) with потребление (consumption)."),
 ("532-study-03","Paradigm","парадигма, инвентарь, перечень, список and перечисление.",
  ["paradigma","inventar","perechen","spisok","perechislenie"], "s:u532",
  "Do not confuse перечень (list) with перечисление (enumeration)."),
 ("533-study-04","Calculation","вычисление, подсчёт, единица, шкала and градация.",
  ["vychislenie","podschjot","edinica","shkala","gradaciya"], "s:u533",
  "Do not confuse вычисление (calculation) with подсчёт (counting)."),
 ("534-study-05","Step","ступень, фаза, период, эпоха and эра.",
  ["stupen","faza","period","epoha","era"], "s:u534",
  "Do not confuse фаза (phase) with период (period)."),
 ("535-study-06","Calendar","календарь, миг, мгновение, секунда and сутки.",
  ["kalendar","mig","mgnovenie","sekunda","sutki"], "s:u535",
  "Do not confuse миг (moment) with мгновение (instant)."),
 ("536-study-07","Century","столетие, десятилетие, четверть, треть and период.",
  ["stoletie","desatiletie","chetvert","tret","period"], "s:u536",
  "Do not confuse столетие (century) with десятилетие (decade)."),
 ("537-study-08","Equation","разность, произведение, уравнение, формула and выражение.",
  ["raznost","proizvedenie","uravnennie","formula","vyrazhenie"], "s:u537",
  "Do not confuse разность (difference) with произведение (product)."),
 ("538-study-09","Equality","равенство, неравенство, граф, ребро and множество.",
  ["ravenstvo","neravenstvo","graf","rebro","mnozhestvo"], "s:u538",
  "Do not confuse равенство (equality) with неравенство (inequality)."),
 ("539-study-10","Sphere","радиус, диаметр, окружность, квадрат and шар.",
  ["radius","diametr","okruzhnost","kvadrat","shar"], "s:u539",
  "Do not confuse радиус (radius) with диаметр (diameter)."),
]

def unit_yaml(fname, title, summary, words, newitem, fence):
    uid = fname.split("-", 1)[1]
    num = fname[:3]
    lex = [w if w.startswith("ru.lex.") else f"ru.lex.study.{w}" for w in words]
    if newitem.startswith("s:"):
        newref = f"ru.sent.b2.{newitem[2:]}"
        allowed_gram = OLD_GRAM
    else:
        newref = newitem[2:]
        allowed_gram = [newref] + OLD_GRAM
    old = ["ru.lex.everyday.eto", "ru.lex.everyday.dom"]
    refs = lex + [newref] + old
    L = []
    L.append('id: "ru.unit.b2.' + uid + '"')
    L.append('goal_id: "ru.goal.b2.academic-study"')
    L.append(f'title: "{title}"')
    L.append(f'summary: "{summary}"')
    L.append("estimated_minutes: 8")
    L.append("activities:")
    L.append(f'  - id: "ru.activity.b2.u{num}-read"')
    L.append('    type: "encounter-read"')
    L.append('    modality: "reading"')
    L.append("    support_level: 1")
    L.append("    content_refs: &v [" + ", ".join(f'"{r}"' for r in refs) + "]")
    L.append(f'  - id: "ru.activity.b2.u{num}-grammar"')
    L.append('    type: "encounter-read"')
    L.append('    modality: "reading"')
    L.append("    support_level: 1")
    L.append("    content_refs: &g [" + ", ".join(f'"{r}"' for r in allowed_gram) + "]")
    if newitem.startswith("s:"):
        L.append(f'  - id: "ru.activity.b2.u{num}-cloze"')
        L.append('    type: "cloze"')
        L.append('    modality: "writing"')
        L.append("    support_level: 1")
        L.append(f'    content_refs: ["{newref}"]')
    L.append(f'  - id: "ru.activity.b2.u{num}-write"')
    L.append('    type: "recall"')
    L.append('    modality: "writing"')
    L.append("    support_level: 0")
    L.append("    content_refs: *v")
    L.append("generation_contract:")
    L.append("  allowed_vocab: *v")
    L.append("  allowed_grammar: *g")
    L.append("  new_item_budget: 6")
    L.append("  register: []")
    L.append(f'  expected_interpretations: ["{title}: definition with taught forms only."]')
    L.append(f'  prohibited_ambiguity: ["{fence}"]')
    L.append('  target_proficiency: "B2"')
    L.append('  validation_method: "choice"')
    return "\n".join(L) + "\n"

for fname, title, summary, words, newitem, fence in U:
    with open(os.path.join(R, "curriculum", "units", fname + ".yaml"), "w") as f:
        f.write(unit_yaml(fname, title, summary, words, newitem, fence))

print("ru batch 51 written")
assert len(WORDS) == 50, len(WORDS)
