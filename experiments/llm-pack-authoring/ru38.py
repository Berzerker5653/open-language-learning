#!/usr/bin/env python3
"""ru-RU batch 38: B1 units 400-409 (paragraphing, cohesion, revision)."""
import json, os

R = "experiments/llm-pack-authoring/candidates/ru-fullkit-v1"
SRC = ["ru-original"]
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-05", "notes": "ai-drafted; needs dictionary sourcing and human review"}

WORDS = [
 ("svyazka","связка","свúзка","link"),
 ("soyuz","союз","сóюз","conjunction"),
 ("predlog","предлог","предлóг","preposition"),
 ("narechie","наречие","нарéчие","adverb"),
 ("mestoimenie","местоимение","местоимéние","pronoun"),
 ("glagol","глагол","глáгол","verb"),
 ("sushchestvitelnoe","существительное","существúтельное","noun"),
 ("prilagatelnoe","прилагательное","прилагáтельное","adjective"),
 ("sklonenie","склонение","склонéние","declension"),
 ("pravka","правка","прáвка","edit"),
 ("redaktirovanie","редактирование","редактúрование","editing"),
 ("korrektor","корректор","коррéктор","proofreader"),
 ("dorabotka","доработка","дорабóтка","polishing"),
 ("ispravlenie","исправление","исправлéние","correction"),
 ("peredelka","переделка","передéлка","remake"),
 ("perepisat","переписать","переписáть","to rewrite"),
 ("pereformulirovat","переформулировать","переформули́ровать","to rephrase"),
 ("svaznost","связность","свáзность","coherence"),
 ("celostnost","целостность","целóстность","integrity"),
 ("garmoniya","гармония","гармóния","harmony"),
 ("kompoziciya","композиция","компози́ция","composition"),
 ("postroenie","построение","построéние","construction"),
 ("plagiat","плагиат","плагиáт","plagiarism"),
 ("avtorstvo","авторство","áвторство","authorship"),
 ("podlinnik","подлинник","пóдлинник","original"),
 ("poyasnit","пояснить","пояснúть","to explain"),
 ("etalon","эталон","этáлон","standard"),
 ("zakonomernost","закономерность","закономéрность","regularity"),
 ("tendenciya","тенденция","тендéнция","tendency"),
 ("ritm","ритм","рúтм","rhythm"),
 ("zvuchanie","звучание","звучáние","sound"),
 ("povtor","повтор","пóвтор","repetition"),
 ("klishe","клише","клишé","cliché"),
 ("trafaret","трафарет","трафарéт","stereotype"),
 ("vodnyy","вводный","ввóдный","introductory"),
 ("kultminaciya","кульминация","кульминáция","climax"),
 ("zavyazka","завязка","завýзка","opening"),
 ("intriga","интрига","интри́га","intrigue"),
 ("fabula","фабула","фáбула","fable, plot"),
 ("geroy","герой","герóй","hero"),
 ("personazh","персонаж","персóнаж","character"),
 ("prototip","прототип","прототúп","prototype"),
 ("dialog","диалог","диáлог","dialogue"),
 ("monolog","монолог","монолóг","monologue"),
 ("replika","реплика","рéплика","line, reply"),
 ("pauza","пауза","пáуза","pause"),
 ("satira","сатира","сатúра","satire"),
 ("basnya","басня","бáсня","fable"),
 ("pritcha","притча","прúтча","parable"),
 ("skazka","сказка","скáзка","fairy tale"),
]

def entry(rid, text, stress, gloss):
    return {"id": f"ru.lex.writing2.{rid}", "status": "draft",
            "forms": [{"text": text}], "readings": [{"text": stress}],
            "glosses": {"en-US": [gloss]}, "sources": SRC, "generation": GEN}

with open(os.path.join(R, "lexicon", "writing2.jsonl"), "w") as f:
    for rid, text, stress, gloss in WORDS:
        f.write(json.dumps(entry(rid, text, stress, gloss), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ru.grammar.b1.krome-togo2", "name": "Кроме того addition", "category": "syntax",
  "definition": "Cohesion uses кроме того: кроме того, важно. Learn the supplied chunks as given."},
 {"id": "ru.grammar.b1.drugimi-slovami", "name": "Другими словами reformulation", "category": "syntax",
  "definition": "Revision uses другими словами: другими словами, точнее. Learn the supplied chunks as given."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("u400","Это связка.","This is a link.",["связка"]),
 ("u401","Это союз.","This is a conjunction.",["союз"]),
 ("u402","Это правка.","This is an edit.",["правка"]),
 ("u403","Это повтор.","This is a repetition.",["повтор"]),
 ("u404","Это ритм.","This is a rhythm.",["ритм"]),
 ("u405","Это композиция.","This is a composition.",["композиция"]),
 ("u406","Это герой.","This is a hero.",["герой"]),
 ("u407","Это диалог.","This is a dialogue.",["диалог"]),
 ("u408","Это пауза.","This is a pause.",["пауза"]),
 ("u409","Это сказка.","This is a fairy tale.",["сказка"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, gloss, cloze in SENTS:
        e = {"id": f"ru.sent.b1.{sid}", "status": "draft", "text": text, "gloss": gloss,
             "cloze_targets": cloze, "sources": SRC, "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

ASSESS = [
 {"id": "ru.assess.b1.extended-writing-reading2", "goal_id": "ru.goal.b1.extended-writing2",
  "kind": "recognition", "modality": "reading",
  "rubric": {"scale": "observed", "criteria": [
      "Identify cohesion words (связка, союз) in a supplied paragraph.",
      "Match кроме того chunks to their addition.",
      "Distinguish черновик (draft) from подлинник (original)."]},
  "review_status": "draft"},
 {"id": "ru.assess.b1.extended-writing-writing2", "goal_id": "ru.goal.b1.extended-writing2",
  "kind": "production", "modality": "writing",
  "rubric": {"scale": "observed", "criteria": [
      "Connect paragraphs with the supplied кроме того chunk.",
      "Revise with the supplied другими словами chunk.",
      "Rewrite with a supplied переписать or правка chunk."]},
  "review_status": "draft"},
]
with open(os.path.join(R, "assessments", "definitions.jsonl"), "a") as f:
    for a in ASSESS:
        f.write(json.dumps(a, ensure_ascii=False) + "\n")

GOAL_YAML = """  - id: "ru.goal.b1.extended-writing2"
    description: "Paragraph, connect, and revise extended writing."
    band: "B1"
    modalities: ["reading", "writing"]
    prerequisites:
      - {target: "ru.goal.b1.extended-writing", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.b1.information-summary2", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.on-ramp.everyday", dimension: "recall-meaning", required_state: "independent", strength: "hard"}
    required_concepts: ["ru.grammar.b1.krome-togo2", "ru.grammar.b1.drugimi-slovami", "ru.grammar.on-ramp.zero-present-copula"]
    assessment_ids: ["ru.assess.b1.extended-writing-reading2", "ru.assess.b1.extended-writing-writing2"]
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
 ("400-writing2-01","Link","связка, союз, предлог, наречие and местоимение.",
  ["svyazka","soyuz","predlog","narechie","mestoimenie"], "s:u400",
  "Do not confuse союз (conjunction) with предлог (preposition)."),
 ("401-writing2-02","Verb","глагол, существительное, прилагательное, склонение and союз.",
  ["glagol","sushchestvitelnoe","prilagatelnoe","sklonenie","soyuz"], "s:u401",
  "Do not confuse глагол (verb) with наречие (adverb)."),
 ("402-writing2-03","Edit","правка, редактирование, корректор, доработка and исправление.",
  ["pravka","redaktirovanie","korrektor","dorabotka","ispravlenie"], "s:u402",
  "Do not confuse правка (edit) with исправление (correction)."),
 ("403-writing2-04","Rewrite","переписать, переделка, переформулировать, правка and повтор.",
  ["perepisat","peredelka","pereformulirovat","pravka","povtor"], "s:u403",
  "Do not confuse переписать (to rewrite) with переформулировать (to rephrase)."),
 ("404-writing2-05","Coherence","связность, целостность, гармония, ритм and звучание.",
  ["svaznost","celostnost","garmoniya","ritm","zvuchanie"], "s:u404",
  "Do not confuse связность (coherence) with целостность (integrity)."),
 ("405-writing2-06","Composition","композиция, построение, повтор, клише and трафарет.",
  ["kompoziciya","postroenie","povtor","klishe","trafaret"], "s:u405",
  "Do not confuse клише (cliché) with трафарет (stereotype)."),
 ("406-writing2-07","Authorship","авторство, плагиат, подлинник, эталон and пояснить.",
  ["avtorstvo","plagiat","podlinnik","etalon","poyasnit"], "s:u406",
  "Do not confuse подлинник (original) with плагиат (plagiarism)."),
 ("407-writing2-08","Tendency","тенденция, закономерность, вводный, связка and союз.",
  ["tendenciya","zakonomernost","vodnyy","svyazka","soyuz"], "s:u407",
  "Do not confuse тенденция (tendency) with закономерность (regularity)."),
 ("408-writing2-09","Climax","кульминация, завязка, интрига, фабула and герой.",
  ["kultminaciya","zavyazka","intriga","fabula","geroy"], "s:u408",
  "Do not confuse завязка (opening) with кульминация (climax)."),
 ("409-writing2-10","Dialogue","диалог, монолог, реплика, пауза and сказка.",
  ["dialog","monolog","replika","pauza","skazka"], "s:u409",
  "Do not confuse диалог (dialogue) with монолог (monologue)."),
]

def unit_yaml(fname, title, summary, words, newitem, fence):
    uid = fname.split("-", 1)[1]
    num = fname[:3]
    lex = [w if w.startswith("ru.lex.") else f"ru.lex.writing2.{w}" for w in words]
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
    L.append('goal_id: "ru.goal.b1.extended-writing2"')
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
    L.append(f'  expected_interpretations: ["{title}: revision with taught forms only."]')
    L.append(f'  prohibited_ambiguity: ["{fence}"]')
    L.append('  target_proficiency: "B1"')
    L.append('  validation_method: "choice"')
    return "\n".join(L) + "\n"

for fname, title, summary, words, newitem, fence in U:
    with open(os.path.join(R, "curriculum", "units", fname + ".yaml"), "w") as f:
        f.write(unit_yaml(fname, title, summary, words, newitem, fence))

print("ru batch 38 written")
assert len(WORDS) == 50, len(WORDS)
