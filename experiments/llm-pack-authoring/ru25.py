#!/usr/bin/env python3
"""ru-RU batch 25: B1 units 270-279 (learning methods, progress, decisions)."""
import json, os

R = "experiments/llm-pack-authoring/candidates/ru-fullkit-v1"
SRC = ["ru-original"]
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-05", "notes": "ai-drafted; needs dictionary sourcing and human review"}

WORDS = [
 ("sposobnost","способность","спо́собность","ability, aptitude"),
 ("talant","талант","тала́нт","talent"),
 ("namerenie","намерение","намере́ние","intention"),
 ("programma","программа","програ́мма","program, plan"),
 ("progress","прогресс","прогре́сс","progress"),
 ("printsip","принцип","принцы́п","principle"),
 ("podkhod","подход","подхо́д","approach"),
 ("dokhod","доход","дохо́д","income, benefit"),
 ("usherb","ущерб","ущерб","damage, harm"),
 ("dobitsya","добиться","доби́ться","to achieve"),
 ("keys","кейс","кейс","case, problem"),
 ("vybor","выбор","вы́бор","choice"),
 ("reshit","решить","реши́ть","to decide, solve"),
 ("vybrat","выбрать","вы́брать","to choose"),
 ("obyazannost","обязанность","обяза́нность","duty"),
 ("peregovory","переговоры","перегово́ры","negotiations"),
 ("obyazatelstvo","обязательство","обяза́тельство","obligation, commitment"),
 ("kvalifikatsiya","квалификация","квалифика́ция","qualification"),
 ("trenirovka","тренировка","трениро́вка","training"),
 ("uprazhnenie","упражнение","упражне́ние","exercise"),
 ("konspekt","конспект","конспе́кт","notes, outline"),
 ("povtorenie","повторение","повторе́ние","repetition"),
 ("slovar","словарь","слова́рь","dictionary"),
 ("grammatika","грамматика","гра́мматика","grammar"),
 ("proiznoshenie","произношение","произноше́ние","pronunciation"),
 ("fraza","фраза","фра́за","phrase"),
 ("kniga","книга","кни́га","book"),
 ("tetrad","тетрадь","тетра́дь","notebook"),
 ("stranitsa","страница","страни́ца","page"),
 ("zanyatie","занятие","заня́тие","class, session"),
 ("ekzamen","экзамен","экза́мен","exam"),
 ("otsenka","оценка","оце́нка","grade, estimate"),
 ("ball","балл","балл","point, grade"),
 ("ponyatie","понятие","поня́тие","concept"),
 ("karera","карьера","карье́ра","career"),
 ("vakansiya","вакансия","вака́нсия","job opening"),
 ("sobesedovanie","собеседование","собесе́дование","interview"),
 ("rezume","резюме","резюме́","CV, resume"),
 ("motivatsiya","мотивация","мотива́ция","motivation"),
 ("interes","интерес","интере́с","interest"),
 ("spokoystvie","спокойствие","споко́йствие","calm"),
 ("sila","сила","си́ла","strength"),
 ("usilie","усилие","уси́лие","effort"),
 ("nagrada","награда","награ́да","award"),
 ("vyigrysh","выигрыш","вы́игрыш","win"),
 ("proigrysh","проигрыш","прои́грыш","loss"),
 ("fakt","факт","факт","fact"),
 ("pravo","право","пра́во","right"),
 ("perspektiva","перспектива","перспекти́ва","prospect"),
 ("uchenie","учение","уче́ние","learning"),
]

def entry(rid, text, stress, gloss):
    return {"id": f"ru.lex.learning.{rid}", "status": "draft",
            "forms": [{"text": text}], "readings": [{"text": stress}],
            "glosses": {"en-US": [gloss]}, "sources": SRC, "generation": GEN}

with open(os.path.join(R, "lexicon", "learning.jsonl"), "w") as f:
    for rid, text, stress, gloss in WORDS:
        f.write(json.dumps(entry(rid, text, stress, gloss), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ru.grammar.b1.chtoby-goals", "name": "Чтобы + past (purpose)", "category": "syntax",
  "definition": "Purpose clauses use чтобы + past form: чтобы сдать экзамен, учу слова. Learn the supplied chunks as given."},
 {"id": "ru.grammar.b1.reshit-vybrat", "name": "Decide/choose constructions", "category": "syntax",
  "definition": "Decide uses решить + infinitive; choose uses выбрать + accusative: решить учиться, выбрать курс. Learn the supplied chunks."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("u270","Это упражнение.","This is an exercise.",["упражнение"]),
 ("u271","Это словарь.","This is a dictionary.",["словарь"]),
 ("u272","Это прогресс.","This is progress.",["прогресс"]),
 ("u273","Это выбор.","This is a choice.",["выбор"]),
 ("u274","Это экзамен.","This is an exam.",["экзамен"]),
 ("u275","Это оценка.","This is a grade.",["оценка"]),
 ("u276","Это резюме.","This is a CV.",["резюме"]),
 ("u277","Это собеседование.","This is an interview.",["собеседование"]),
 ("u278","Это мотивация.","This is motivation.",["мотивация"]),
 ("u279","Это сила.","This is strength.",["сила"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, gloss, cloze in SENTS:
        e = {"id": f"ru.sent.b1.{sid}", "status": "draft", "text": text, "gloss": gloss,
             "cloze_targets": cloze, "sources": SRC, "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

ASSESS = [
 {"id": "ru.assess.b1.learning-work-reading", "goal_id": "ru.goal.b1.learning-work",
  "kind": "recognition", "modality": "reading",
  "rubric": {"scale": "observed", "criteria": [
      "Identify the progress word (прогресс, оценка) in a supplied note.",
      "Match чтобы chunks to their purpose.",
      "Distinguish выбрать (choose) from решить (decide)."]},
  "review_status": "draft"},
 {"id": "ru.assess.b1.learning-work-writing", "goal_id": "ru.goal.b1.learning-work",
  "kind": "production", "modality": "writing",
  "rubric": {"scale": "observed", "criteria": [
      "State a study purpose with the supplied чтобы chunk.",
      "Say you decided to do something with the supplied решить chunk.",
      "Report progress with a supplied оценка or прогресс chunk."]},
  "review_status": "draft"},
]
with open(os.path.join(R, "assessments", "definitions.jsonl"), "a") as f:
    for a in ASSESS:
        f.write(json.dumps(a, ensure_ascii=False) + "\n")

GOAL_YAML = """  - id: "ru.goal.b1.learning-work"
    description: "Talk about learning methods, progress, and work decisions."
    band: "B1"
    modalities: ["reading", "writing"]
    prerequisites:
      - {target: "ru.goal.b1.practical-problems", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.b1.narration", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.on-ramp.everyday", dimension: "recall-meaning", required_state: "independent", strength: "hard"}
    required_concepts: ["ru.grammar.b1.chtoby-goals", "ru.grammar.b1.reshit-vybrat", "ru.grammar.on-ramp.zero-present-copula"]
    assessment_ids: ["ru.assess.b1.learning-work-reading", "ru.assess.b1.learning-work-writing"]
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
 ("270-learning-work-01","Exercises","упражнение, повторение, тренировка, конспект and тетрадь.",
  ["uprazhnenie","povtorenie","trenirovka","konspekt","tetrad"], "s:u270",
  "Do not confuse повторение (repetition) with тренировка (training)."),
 ("271-learning-work-02","Tools","словарь, грамматика, фраза, книга and страница.",
  ["slovar","grammatika","fraza","kniga","stranitsa"], "s:u271",
  "Do not confuse словарь (dictionary) with грамматика (grammar)."),
 ("272-learning-work-03","Progress","прогресс, оценка, понятие, факт and балл.",
  ["progress","otsenka","ponyatie","fakt","ball"], "s:u272",
  "Do not confuse оценка (grade) with факт (fact)."),
 ("273-learning-work-04","Decisions","выбор, решить, выбрать, намерение and принцип.",
  ["vybor","reshit","vybrat","namerenie","printsip"], "s:u273",
  "Do not confuse решить (decide) with выбрать (choose)."),
 ("274-learning-work-05","Exams","экзамен, занятие, упражнение, оценка and балл.",
  ["ekzamen","zanyatie","uprazhnenie","otsenka","ball"], "s:u274",
  "Do not confuse экзамен (exam) with занятие (class)."),
 ("275-learning-work-06","Grades","оценка, балл, понятие, факт and прогресс.",
  ["otsenka","ball","ponyatie","fakt","progress"], "s:u275",
  "Do not confuse балл (point) with оценка (grade)."),
 ("276-learning-work-07","CV","резюме, вакансия, карьера, квалификация and обязанность.",
  ["rezume","vakansiya","karera","kvalifikatsiya","obyazannost"], "s:u276",
  "Do not confuse вакансия (job opening) with карьера (career)."),
 ("277-learning-work-08","Interview","собеседование, резюме, переговоры, обязательство and право.",
  ["sobesedovanie","rezume","peregovory","obyazatelstvo","pravo"], "s:u277",
  "Do not confuse переговоры (negotiations) with собеседование (interview)."),
 ("278-learning-work-09","Motivation","мотивация, интерес, способность, талант and намерение.",
  ["motivatsiya","interes","sposobnost","talant","namerenie"], "s:u278",
  "Do not confuse способность (aptitude) with талант (talent)."),
 ("279-learning-work-10","Effort","сила, усилие, спокойствие, выигрыш and проигрыш.",
  ["sila","usilie","spokoystvie","vyigrysh","proigrysh"], "s:u279",
  "Do not confuse выигрыш (win) with проигрыш (loss)."),
]

def unit_yaml(fname, title, summary, words, newitem, fence):
    uid = fname.split("-", 1)[1]
    num = fname[:3]
    lex = [w if w.startswith("ru.lex.") else f"ru.lex.learning.{w}" for w in words]
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
    L.append('goal_id: "ru.goal.b1.learning-work"')
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
    L.append(f'  expected_interpretations: ["{title}: learning and work with taught forms only."]')
    L.append(f'  prohibited_ambiguity: ["{fence}"]')
    L.append('  target_proficiency: "B1"')
    L.append('  validation_method: "choice"')
    return "\n".join(L) + "\n"

for fname, title, summary, words, newitem, fence in U:
    with open(os.path.join(R, "curriculum", "units", fname + ".yaml"), "w") as f:
        f.write(unit_yaml(fname, title, summary, words, newitem, fence))

print("ru batch 25 written")
assert len(WORDS) == 50, len(WORDS)
