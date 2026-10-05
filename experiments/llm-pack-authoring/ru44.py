#!/usr/bin/env python3
"""ru-RU batch 44: B2 units 460-469 (stance, implication, rhetorical choices)."""
import json, os

R = "experiments/llm-pack-authoring/candidates/ru-fullkit-v1"
SRC = ["ru-original"]
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-05", "notes": "ai-drafted; needs dictionary sourcing and human review"}

WORDS = [
 ("retorika","риторика","ритóрика","rhetoric"),
 ("manjovr","манёвр","манёвр","maneuver"),
 ("nastoychivost","настойчивость","настóйчивость","persistence"),
 ("napor","напор","напóр","push, pressure"),
 ("agressiya","агрессия","агрéссия","aggression"),
 ("passivnost","пассивность","пáссивность","passivity"),
 ("ustanovka","установка","устанóвка","attitude, setup"),
 ("imperativ","императив","императúв","imperative"),
 ("posyl","посыл","пóсыл","message, premise"),
 ("zaryad","заряд","зарýд","charge"),
 ("nakal","накал","накáл","intensity, heat"),
 ("azart","азарт","азáрт","ardor, excitement"),
 ("derzkiy","дерзкий","дéрзкий","bold, audacious"),
 ("robkiy","робкий","рóбкий","timid"),
 ("ostorozhnyy","осторожный","остóрожный","cautious"),
 ("sderzhannyy","сдержанный","сдéржанный","restrained"),
 ("krasnorechie","красноречие","краснорéчие","eloquence"),
 ("orator","оратор","орáтор","orator"),
 ("tribuna","трибуна","трибýна","platform, rostrum"),
 ("kafedra","кафедра","кафéдра","lectern, chair"),
 ("zal","зал","зал","hall, audience"),
 ("kulisy","кулисы","кулúсы","wings (theater)"),
 ("estrada","эстрада","эстрáда","variety stage"),
 ("maska","маска","мáска","mask"),
 ("zhanr","жанр","жáнр","genre"),
 ("techenie","течение","течéние","movement, current"),
 ("shkola","школа","шкóла","school"),
 ("novatorstvo","новаторство","новáторство","innovativeness"),
 ("avantgard","авангард","авангáрд","avant-garde"),
 ("konservatizm","консерватизм","консерватúзм","conservatism"),
 ("liberalizm","либерализм","либералúзм","liberalism"),
 ("radikalizm","радикализм","радикалúзм","radicalism"),
 ("umerennost","умеренность","ýмеренность","moderation"),
 ("ekstremizm","экстремизм","экстремúзм","extremism"),
 ("nasilie","насилие","насилúе","violence"),
 ("voyna","война","войнá","war"),
 ("konflikt","конфликт","конфлúкт","conflict"),
 ("stolknovenie","столкновение","столкновéние","collision"),
 ("protivostoyanie","противостояние","противостóяние","confrontation"),
 ("diskurs","дискурс","дискýрс","discourse"),
 ("narrativ","нарратив","нарратúв","narrative"),
 ("kod","код","кóд","code"),
 ("shifr","шифр","шифр","cipher"),
 ("rebus","ребус","рéбус","rebus"),
 ("zagadka","загадка","загáдка","riddle"),
 ("razgadka","разгадка","разгáдка","solution, key"),
 ("poslanie","послание","послáние","message, epistle"),
 ("manifest","манифест","манифéст","manifesto"),
 ("vozzvanie","воззвание","воззвáние","appeal"),
 ("lozung","лозунг","лóзунг","slogan"),
]

def entry(rid, text, stress, gloss):
    return {"id": f"ru.lex.critical2.{rid}", "status": "draft",
            "forms": [{"text": text}], "readings": [{"text": stress}],
            "glosses": {"en-US": [gloss]}, "sources": SRC, "generation": GEN}

with open(os.path.join(R, "lexicon", "critical2.jsonl"), "w") as f:
    for rid, text, stress, gloss in WORDS:
        f.write(json.dumps(entry(rid, text, stress, gloss), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ru.grammar.b2-imeya-v-vydu", "name": "Имея в виду implication", "category": "syntax",
  "definition": "Implication uses имея в виду: имея в виду вывод. Learn the supplied chunks as given."},
 {"id": "ru.grammar.b2-podchjorkivayu", "name": "Подчёркиваю stance", "category": "syntax",
  "definition": "Stance uses подчёркиваю: подчёркиваю, что важно. Learn the supplied chunks as given."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("u460","Это риторика.","This is rhetoric.",["риторика"]),
 ("u461","Это установка.","This is an attitude.",["установка"]),
 ("u462","Это посыл.","This is a premise.",["посыл"]),
 ("u463","Это накал.","This is intensity.",["накал"]),
 ("u464","Это оратор.","This is an orator.",["оратор"]),
 ("u465","Это жанр.","This is a genre.",["жанр"]),
 ("u466","Это школа.","This is a school.",["школа"]),
 ("u467","Это конфликт.","This is a conflict.",["конфликт"]),
 ("u468","Это дискурс.","This is a discourse.",["дискурс"]),
 ("u469","Это лозунг.","This is a slogan.",["лозунг"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, gloss, cloze in SENTS:
        e = {"id": f"ru.sent.b2.{sid}", "status": "draft", "text": text, "gloss": gloss,
             "cloze_targets": cloze, "sources": SRC, "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

ASSESS = [
 {"id": "ru.assess.b2.critical-reading-reading2", "goal_id": "ru.goal.b2.critical-reading2",
  "kind": "recognition", "modality": "reading",
  "rubric": {"scale": "observed", "criteria": [
      "Identify stance words (установка, посыл) in a supplied text.",
      "Match имея в виду chunks to their implication.",
      "Distinguish лозунг (slogan) from воззвание (appeal)."]},
  "review_status": "draft"},
 {"id": "ru.assess.b2.critical-reading-writing2", "goal_id": "ru.goal.b2.critical-reading2",
  "kind": "production", "modality": "writing",
  "rubric": {"scale": "observed", "criteria": [
      "Signal implication with the supplied имея в виду chunk.",
      "Mark stance with the supplied подчёркиваю chunk.",
      "Frame with a supplied дискурс or нарратив chunk."]},
  "review_status": "draft"},
]
with open(os.path.join(R, "assessments", "definitions.jsonl"), "a") as f:
    for a in ASSESS:
        f.write(json.dumps(a, ensure_ascii=False) + "\n")

GOAL_YAML = """  - id: "ru.goal.b2.critical-reading2"
    description: "Read stance, implication, and rhetorical choices."
    band: "B2"
    modalities: ["reading", "writing"]
    prerequisites:
      - {target: "ru.goal.b2.critical-reading", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.b2.argumentation4", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.on-ramp.everyday", dimension: "recall-meaning", required_state: "independent", strength: "hard"}
    required_concepts: ["ru.grammar.b2-imeya-v-vydu", "ru.grammar.b2-podchjorkivayu", "ru.grammar.on-ramp.zero-present-copula"]
    assessment_ids: ["ru.assess.b2.critical-reading-reading2", "ru.assess.b2.critical-reading-writing2"]
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
 ("460-critical2-01","Rhetoric","риторика, красноречие, оратор, трибуна and кафедра.",
  ["retorika","krasnorechie","orator","tribuna","kafedra"], "s:u460",
  "Do not confuse трибуна (rostrum) with кафедра (lectern)."),
 ("461-critical2-02","Attitude","установка, настойчивость, напор, агрессия and пассивность.",
  ["ustanovka","nastoychivost","napor","agressiya","passivnost"], "s:u461",
  "Do not confuse напор (push) with настойчивость (persistence)."),
 ("462-critical2-03","Premise","посыл, императив, заряд, накал and азарт.",
  ["posyl","imperativ","zaryad","nakal","azart"], "s:u462",
  "Do not confuse посыл (premise) with заряд (charge)."),
 ("463-critical2-04","Bold","дерзкий, робкий, осторожный, сдержанный and настойчивость.",
  ["derzkiy","robkiy","ostorozhnyy","sderzhannyy","nastoychivost"], "s:u463",
  "Do not confuse дерзкий (bold) with осторожный (cautious)."),
 ("464-critical2-05","Hall","зал, кулисы, эстрада, маска and манёвр.",
  ["zal","kulisy","estrada","maska","manjovr"], "s:u464",
  "Do not confuse кулисы (wings) with эстрада (stage)."),
 ("465-critical2-06","Genre","жанр, течение, школа, новаторство and авангард.",
  ["zhanr","techenie","shkola","novatorstvo","avantgard"], "s:u465",
  "Do not confuse течение (movement) with школа (school)."),
 ("466-critical2-07","Conservatism","консерватизм, либерализм, радикализм, умеренность and экстремизм.",
  ["konservatizm","liberalizm","radikalizm","umerennost","ekstremizm"], "s:u466",
  "Do not confuse умеренность (moderation) with экстремизм (extremism)."),
 ("467-critical2-08","Violence","насилие, война, конфликт, столкновение and противостояние.",
  ["nasilie","voyna","konflikt","stolknovenie","protivostoyanie"], "s:u467",
  "Do not confuse столкновение (collision) with противостояние (confrontation)."),
 ("468-critical2-09","Discourse","дискурс, нарратив, код, шифр and ребус.",
  ["diskurs","narrativ","kod","shifr","rebus"], "s:u468",
  "Do not confuse код (code) with шифр (cipher)."),
 ("469-critical2-10","Riddle","загадка, разгадка, послание, манифест and лозунг.",
  ["zagadka","razgadka","poslanie","manifest","lozung"], "s:u469",
  "Do not confuse послание (epistle) with манифест (manifesto)."),
]

def unit_yaml(fname, title, summary, words, newitem, fence):
    uid = fname.split("-", 1)[1]
    num = fname[:3]
    lex = [w if w.startswith("ru.lex.") else f"ru.lex.critical2.{w}" for w in words]
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
    L.append('goal_id: "ru.goal.b2.critical-reading2"')
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
    L.append(f'  expected_interpretations: ["{title}: stance with taught forms only."]')
    L.append(f'  prohibited_ambiguity: ["{fence}"]')
    L.append('  target_proficiency: "B2"')
    L.append('  validation_method: "choice"')
    return "\n".join(L) + "\n"

for fname, title, summary, words, newitem, fence in U:
    with open(os.path.join(R, "curriculum", "units", fname + ".yaml"), "w") as f:
        f.write(unit_yaml(fname, title, summary, words, newitem, fence))

print("ru batch 44 written")
assert len(WORDS) == 50, len(WORDS)
