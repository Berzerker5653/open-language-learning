#!/usr/bin/env python3
"""ru-RU batch 40: B2 units 420-429 (evidence, examples, justification)."""
import json, os

R = "experiments/llm-pack-authoring/candidates/ru-fullkit-v1"
SRC = ["ru-original"]
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-05", "notes": "ai-drafted; needs dictionary sourcing and human review"}

WORDS = [
 ("vyborka","выборка","вýборка","sample"),
 ("respondent","респондент","рэспóндент","respondent"),
 ("razbros","разброс","рáзброс","dispersion"),
 ("vybros","выброс","вýброс","outlier"),
 ("pogreshnost","погрешность","погрéшность","margin of error"),
 ("pokazatel","показатель","показáтель","indicator"),
 ("indikator","индикатор","индикáтор","indicator"),
 ("parametr","параметр","парáметр","parameter"),
 ("svoystvo","свойство","свóйство","property"),
 ("priroda","природа","прирóда","nature"),
 ("material","материал","материáл","material"),
 ("veshchestvo","вещество","вéщество","substance"),
 ("produkt","продукт","прóдукт","product"),
 ("motiv","мотив","мотúв","motive"),
 ("pobudka","побудка","пóбудка","motive, spur"),
 ("stimul","стимул","стúмул","stimulus"),
 ("pobuzhdenie","побуждение","побуждéние","urge, incentive"),
 ("metodika","методика","методúка","methodology"),
 ("prisooblenie","приспособление","приспособлéние","device, tool"),
 ("ustroystvo","устройство","устрóйство","device"),
 ("apparat","аппарат","аппарáт","apparatus"),
 ("mekhanizm","механизм","мехáнизм","mechanism"),
 ("sistema","система","систéма","system"),
 ("organizm","организм","óрганизм","organism"),
 ("organizaciya","организация","организа́ция","organization"),
 ("uchrezhdenie","учреждение","учреждéние","institution"),
 ("vedomstvo","ведомство","вéдомство","agency"),
 ("ministerstvo","министерство","минúстерство","ministry"),
 ("upravlenie","управление","управлéние","management"),
 ("nadzor","надзор","надзóр","oversight"),
 ("reviziya","ревизия","рéвизия","audit, revision"),
 ("audit","аудит","áудит","audit"),
 ("uchyot","учёт","учёт","accounting"),
 ("otchetnost","отчётность","отчéтность","reporting"),
 ("finansy","финансы","финáнсы","finances"),
 ("dokazuemyy","доказуемый","доказýемый","provable"),
 ("veroyatnyy","вероятный","верóятный","probable"),
 ("neveroyatnyy","невероятный","неверóятный","unbelievable"),
 ("dostovernyy","достоверный","достóверный","reliable"),
 ("podlinnyy","подлинный","пóдлинный","genuine"),
 ("poddelat","подделать","поддéлать","to forge"),
 ("falshivyy","фальшивый","фáльшивый","fake"),
 ("autentichnyy","аутентичный","аутéнтичный","authentic"),
 ("proveryat","проверять","проверýть","to check"),
 ("pereproveryat","перепроверять","перепроверýть","to double-check"),
 ("slichenie","сличение","слúчение","comparison"),
 ("slichat","сличать","слúчать","to compare"),
 ("sopostavlenie","сопоставление","сопоставлéние","juxtaposition"),
 ("sopostavlyat","сопоставлять","сопоставлýть","to compare"),
 ("korrelyaciya","корреляция","коррелýция","correlation"),
]

def entry(rid, text, stress, gloss):
    return {"id": f"ru.lex.argue2.{rid}", "status": "draft",
            "forms": [{"text": text}], "readings": [{"text": stress}],
            "glosses": {"en-US": [gloss]}, "sources": SRC, "generation": GEN}

with open(os.path.join(R, "lexicon", "argue2.jsonl"), "w") as f:
    for rid, text, stress, gloss in WORDS:
        f.write(json.dumps(entry(rid, text, stress, gloss), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ru.grammar.b2.naprimer-tak", "name": "Например, так illustration", "category": "syntax",
  "definition": "Examples use например: например, в нашем случае. Learn the supplied chunks as given."},
 {"id": "ru.grammar.b2-etogo-dokazyvaet", "name": "Это доказывает justification", "category": "syntax",
  "definition": "Justification uses это доказывает: это доказывает, что. Learn the supplied chunks as given."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("u420","Это выборка.","This is a sample.",["выборка"]),
 ("u421","Это показатель.","This is an indicator.",["показатель"]),
 ("u422","Это свойство.","This is a property.",["свойство"]),
 ("u423","Это материал.","This is a material.",["материал"]),
 ("u424","Это мотив.","This is a motive.",["мотив"]),
 ("u425","Это система.","This is a system.",["система"]),
 ("u426","Это аудит.","This is an audit.",["аудит"]),
 ("u427","Это учёт.","This is accounting.",["учёт"]),
 ("u428","Это корреляция.","This is a correlation.",["корреляция"]),
 ("u429","Это параметр.","This is a parameter.",["параметр"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, gloss, cloze in SENTS:
        e = {"id": f"ru.sent.b2.{sid}", "status": "draft", "text": text, "gloss": gloss,
             "cloze_targets": cloze, "sources": SRC, "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

ASSESS = [
 {"id": "ru.assess.b2.argumentation-reading2", "goal_id": "ru.goal.b2.argumentation2",
  "kind": "recognition", "modality": "reading",
  "rubric": {"scale": "observed", "criteria": [
      "Identify evidence words (выборка, показатель) in a supplied note.",
      "Match например chunks to their illustration.",
      "Distinguish подлинный (genuine) from фальшивый (fake)."]},
  "review_status": "draft"},
 {"id": "ru.assess.b2.argumentation-writing2", "goal_id": "ru.goal.b2.argumentation2",
  "kind": "production", "modality": "writing",
  "rubric": {"scale": "observed", "criteria": [
      "Illustrate with the supplied например chunk.",
      "Justify with the supplied это доказывает chunk.",
      "Compare with a supplied сопоставление or сличение chunk."]},
  "review_status": "draft"},
]
with open(os.path.join(R, "assessments", "definitions.jsonl"), "a") as f:
    for a in ASSESS:
        f.write(json.dumps(a, ensure_ascii=False) + "\n")

GOAL_YAML = """  - id: "ru.goal.b2.argumentation2"
    description: "Support claims with evidence, examples, and justification."
    band: "B2"
    modalities: ["reading", "writing"]
    prerequisites:
      - {target: "ru.goal.b2.argumentation", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.b1.opinions", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.on-ramp.everyday", dimension: "recall-meaning", required_state: "independent", strength: "hard"}
    required_concepts: ["ru.grammar.b2.naprimer-tak", "ru.grammar.b2-etogo-dokazyvaet", "ru.grammar.on-ramp.zero-present-copula"]
    assessment_ids: ["ru.assess.b2.argumentation-reading2", "ru.assess.b2.argumentation-writing2"]
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
 ("420-argue2-01","Sample","выборка, респондент, разброс, выброс and погрешность.",
  ["vyborka","respondent","razbros","vybros","pogreshnost"], "s:u420",
  "Do not confuse разброс (dispersion) with выброс (outlier)."),
 ("421-argue2-02","Indicator","показатель, индикатор, параметр, свойство and природа.",
  ["pokazatel","indikator","parametr","svoystvo","priroda"], "s:u421",
  "Do not confuse показатель (indicator) with параметр (parameter)."),
 ("422-argue2-03","Material","материал, вещество, продукт, механизм and устройство.",
  ["material","veshchestvo","produkt","mekhanizm","ustroystvo"], "s:u422",
  "Do not confuse вещество (substance) with материал (material)."),
 ("423-argue2-04","Motive","мотив, побудка, стимул, побуждение and аппарат.",
  ["motiv","pobudka","stimul","pobuzhdenie","apparat"], "s:u423",
  "Do not confuse мотив (motive) with стимул (stimulus)."),
 ("424-argue2-05","Methodology","методика, приспособление, аппарат, механизм and система.",
  ["metodika","prisooblenie","apparat","mekhanizm","sistema"], "s:u424",
  "Do not confuse механизм (mechanism) with система (system)."),
 ("425-argue2-06","Organization","организация, учреждение, ведомство, министерство and управление.",
  ["organizaciya","uchrezhdenie","vedomstvo","ministerstvo","upravlenie"], "s:u425",
  "Do not confuse ведомство (agency) with министерство (ministry)."),
 ("426-argue2-07","Oversight","надзор, ревизия, аудит, учёт and отчётность.",
  ["nadzor","reviziya","audit","uchyot","otchetnost"], "s:u426",
  "Do not confuse надзор (oversight) with ревизия (audit)."),
 ("427-argue2-08","Finances","финансы, доказуемый, вероятный, невероятный and достоверный.",
  ["finansy","dokazuemyy","veroyatnyy","neveroyatnyy","dostovernyy"], "s:u427",
  "Do not confuse вероятный (probable) with невероятный (unbelievable)."),
 ("428-argue2-09","Genuine","подлинный, подделать, фальшивый, аутентичный and проверять.",
  ["podlinnyy","poddelat","falshivyy","autentichnyy","proveryat"], "s:u428",
  "Do not confuse подлинный (genuine) with фальшивый (fake)."),
 ("429-argue2-10","Compare","перепроверять, сличение, сличать, сопоставление and корреляция.",
  ["pereproveryat","slichenie","slichat","sopostavlenie","korrelyaciya"], "s:u429",
  "Do not confuse сличение (comparison) with сопоставление (juxtaposition)."),
]

def unit_yaml(fname, title, summary, words, newitem, fence):
    uid = fname.split("-", 1)[1]
    num = fname[:3]
    lex = [w if w.startswith("ru.lex.") else f"ru.lex.argue2.{w}" for w in words]
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
    L.append('goal_id: "ru.goal.b2.argumentation2"')
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
    L.append(f'  expected_interpretations: ["{title}: evidence with taught forms only."]')
    L.append(f'  prohibited_ambiguity: ["{fence}"]')
    L.append('  target_proficiency: "B2"')
    L.append('  validation_method: "choice"')
    return "\n".join(L) + "\n"

for fname, title, summary, words, newitem, fence in U:
    with open(os.path.join(R, "curriculum", "units", fname + ".yaml"), "w") as f:
        f.write(unit_yaml(fname, title, summary, words, newitem, fence))

print("ru batch 40 written")
assert len(WORDS) == 50, len(WORDS)
