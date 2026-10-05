#!/usr/bin/env python3
"""ru-RU batch 6: A1 units 080-089 (city)."""
import json, os

R = "experiments/llm-pack-authoring/candidates/ru-fullkit-v1"
SRC = ["ru-original"]
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-04", "notes": "ai-drafted; needs dictionary sourcing and human review"}

WORDS = [
 ("ploshchad","площадь","пло́щадь","square"),
 ("etazh","этаж","эта́ж","floor"),
 ("podezd","подъезд","подъе́зд","building entrance"),
 ("povorot","поворот","поворо́т","turn"),
 ("napravo","направо","напра́во","to the right"),
 ("nalevo","налево","нале́во","to the left"),
 ("priyamo","прямо","пря́мо","straight"),
 ("nedaleko","недалеко","недалеко́","not far"),
 ("daleko","далеко","далеко́","far"),
 ("zdes","здесь","здесь","here"),
 ("tam","там","там","there"),
 ("vkhod","вход","вход","entrance"),
 ("vykhod","выход","вы́ход","exit"),
 ("skver","сквер","сквер","small park"),
 ("doroga","дорога","дорога́","road"),
 ("svetofor","светофор","светофо́р","traffic light"),
 ("ploshchadka","площадка","пло́щадка","small square, platform"),
 ("ostanovka","остановка","остано́вка","bus stop"),
 ("tramvay","трамвай","трамва́й","tram"),
 ("metro","метро","метро́","metro"),
 ("taks","такси","та́кси","taxi"),
 ("samol","самолёт","самолё́т","plane"),
 ("poezd","поезд","по́езд","train"),
 ("velosiped","велосипед","велосипе́д","bicycle"),
 ("biliet","билет","биле́т","ticket"),
 ("opozdat","опаздывать","опа́здывать","to be late"),
 ("ehat","ехать","е́хать","to go (by vehicle)"),
 ("idti","идти","идти́","to walk, to go"),
 ("perekhod","переход","перехо́д","crossing"),
 ("marshrut","маршрут","маршру́т","route"),
 ("voditel","водитель","води́тель","driver"),
 ("passazhir","пассажир","пассажи́р","passenger"),
 ("chemodan","чемодан","чемода́н","suitcase"),
 ("dokument","документ","докуме́нт","document"),
 ("biblioteka","библиотека","библиоте́ка","library"),
 ("stadion","стадион","стадио́н","stadium"),
 ("vystavka","выставка","выста́вка","exhibition"),
 ("koncert","концерт","конце́рт","concert"),
 ("gostinitsa","гостиница","гостини́ца","hotel"),
 ("rayon","район","райо́н","district"),
 ("centr","центр","це́нтр","center"),
 ("fontan","фонтан","фонта́н","fountain"),
 ("skameyka","скамейка","скаме́йка","bench"),
 ("derevo","дерево","де́рево","tree"),
 ("kiosk","киоск","киоск","kiosk"),
 ("probka","пробка","про́бка","traffic jam"),
 ("pochti","почти","по́чти","almost"),
 ("konechno","конечно","коне́чно","of course"),
 ("nazad","назад","наза́д","back"),
 ("vperyod","вперёд","вперё́д","ahead"),
]
assert len(WORDS) == 50

def entry(rid, form, reading, gloss):
    return {"id": f"ru.lex.city.{rid}", "status": "draft",
            "forms": [{"text": form, "is_primary": True}],
            "readings": [{"text": reading, "script": "cyrillic"}],
            "glosses": {"en-US": [gloss]}, "sources": SRC, "generation": GEN}

with open(os.path.join(R, "lexicon", "city.jsonl"), "w") as f:
    for rid, form, reading, gloss in WORDS:
        f.write(json.dumps(entry(rid, form, reading, gloss), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ru.grammar.a1.motion-idti-ehat", "name": "идти versus ехать", "category": "semantics",
  "definition": "идти is going on foot and ехать is going by vehicle: Я иду домой, Я еду на работу. Learn the supplied forms of each verb and do not mix the two verbs or invent new forms."},
 {"id": "ru.grammar.a1.direction-prepositions", "name": "Direction versus location", "category": "syntax",
  "definition": "Direction uses в/на with the supplied accusative phrase (Я иду в парк), while location uses в/на with the prepositional (Я в парке). Learn each supplied phrase whole; do not reuse the location form after a direction verb."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("u080","Это площадь.","This is a square.",["площадь"]),
 ("u081","Это стадион.","This is a stadium.",["стадион"]),
 ("u082","Это билет.","This is a ticket.",["билет"]),
 ("u083","Это такси.","This is a taxi.",["такси"]),
 ("u084","Это вход.","This is the entrance.",["вход"]),
 ("u085","Это этаж.","This is a floor.",["этаж"]),
 ("u086","Это поворот.","This is a turn.",["поворот"]),
 ("u088","Это пассажир.","This is a passenger.",["пассажир"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, gloss, cloze in SENTS:
        e = {"id": f"ru.sent.a1.{sid}", "status": "draft", "text": text, "gloss": gloss,
             "cloze_targets": cloze, "sources": SRC, "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

ASSESS = [
 {"id": "ru.assess.a1.city-reading", "goal_id": "ru.goal.a1.city",
  "kind": "recognition", "modality": "reading",
  "rubric": {"scale": "observed", "criteria": [
      "Identify city, transport and route nouns in a supplied route note or ticket.",
      "Distinguish direction words (направо, налево, прямо) from distance words.",
      "Match a direction phrase to its verb rather than the location form."]},
  "review_status": "draft"},
 {"id": "ru.assess.a1.city-writing", "goal_id": "ru.goal.a1.city",
  "kind": "production", "modality": "writing",
  "rubric": {"scale": "observed", "criteria": [
      "Write a place-identification statement with это and a taught nominative noun.",
      "Complete a route instruction with the supplied direction words.",
      "Choose идти or ехать and the supplied phrase form without inventing endings."]},
  "review_status": "draft"},
]
with open(os.path.join(R, "assessments", "definitions.jsonl"), "a") as f:
    for a in ASSESS:
        f.write(json.dumps(a, ensure_ascii=False) + "\n")

GOAL_YAML = """  - id: "ru.goal.a1.city"
    description: "Read and write simple statements about places, locations, and simple routes."
    band: "A1"
    modalities: ["reading", "writing"]
    prerequisites:
      - {target: "ru.goal.a1.shopping", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.a1.home", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.on-ramp.everyday", dimension: "recall-meaning", required_state: "independent", strength: "hard"}
    required_concepts: ["ru.grammar.a1.motion-idti-ehat", "ru.grammar.a1.direction-prepositions", "ru.grammar.a1.location-v-na"]
    assessment_ids: ["ru.assess.a1.city-reading", "ru.assess.a1.city-writing"]
    transfer_required: false
    sources: ["ru-original"]
    review_status: "draft"
    generation:
      method: "ai-assisted"
      tool: "omp"
      model: "strata/qwen3.8-flash-next-iq3_s"
      date: "2026-10-04"
      notes: "ai-drafted; needs dictionary sourcing and human review"
"""
with open(os.path.join(R, "curriculum", "goals.yaml"), "a") as f:
    f.write(GOAL_YAML)

OLD_VOCAB = ["ru.lex.everyday.eto", "ru.lex.everyday.mama", "ru.lex.everyday.papa",
             "ru.lex.personal.anna", "ru.lex.personal.ivan", "ru.lex.everyday.kniga",
             "ru.lex.everyday.dom", "ru.lex.personal.ya"]
OLD_GRAM = ["ru.grammar.on-ramp.eto-identification", "ru.grammar.on-ramp.zero-present-copula"]

U = [
 ("080-city-01","City places","площадь, сквер, район, центр and библиотека.",
  ["ploshchad","skver","rayon","centr","biblioteka"], "s:u080",
  "Do not confuse сквер (small park) with the already-taught парк (park)."),
 ("081-city-02","City events","стадион, выставка, концерт, метро and трамвай.",
  ["stadion","vystavka","koncert","metro","tramvay"], "s:u081",
  "Do not confuse выставка (exhibition) with концерт (concert)."),
 ("082-city-03","Tickets and vehicles","такси, самолёт, поезд, велосипед and билет.",
  ["taks","samol","poezd","velosiped","biliet"], "s:u082",
  "Do not confuse билет (ticket) with the already-taught чек (receipt)."),
 ("083-city-04","Getting around","ехать, идти, маршрут, пробка and водитель.",
  ["ehat","idti","marshrut","probka","voditel"], "s:u083",
  "Do not confuse водитель (driver) with пассажир (passenger)."),
 ("084-city-05","Street parts","дорога, светофор, переход, вход and выход.",
  ["doroga","svetofor","perekhod","vkhod","vykhod"], "s:u084",
  "Do not confuse вход (entrance) with выход (exit)."),
 ("085-city-06","Buildings and stops","этаж, подъезд, гостиница, площадка and остановка.",
  ["etazh","podezd","gostinitsa","ploshchadka","ostanovka"], "s:u085",
  "Do not confuse этаж (building floor) with the already-taught пол (floor underfoot)."),
 ("086-city-07","Directions","поворот, направо, налево, прямо and назад.",
  ["povorot","napravo","nalevo","priyamo","nazad"], "s:u086",
  "Do not confuse направо (right) with налево (left)."),
 ("087-city-08","Near and far","недалеко, далеко, здесь, там and вперёд with the motion verbs.",
  ["nedaleko","daleko","zdes","tam","vperyod"], "g:ru.grammar.a1.motion-idti-ehat",
  "Do not use ехать for walking; идти is the walking verb."),
 ("088-city-09","Travel things","пассажир, чемодан, документ, почти and конечно.",
  ["passazhir","chemodan","dokument","pochti","konechno"], "s:u088",
  "Do not confuse чемодан (suitcase) with the already-taught сумка (bag)."),
 ("089-city-10","In the park","фонтан, скамейка, дерево, киоск and опаздывать with direction phrases.",
  ["fontan","skameyka","derevo","kiosk","opozdat"], "g:ru.grammar.a1.direction-prepositions",
  "Do not reuse the location form after a direction verb; direction takes the supplied accusative phrase."),
]

def unit_yaml(fname, title, summary, words, newitem, fence):
    uid = fname.split("-", 1)[1]
    num = fname[:3]
    lex = [f"ru.lex.city.{w}" for w in words]
    if newitem.startswith("s:"):
        newref = f"ru.sent.a1.{newitem[2:]}"
        allowed_gram = OLD_GRAM
    else:
        newref = newitem[2:]
        allowed_gram = [newref] + OLD_GRAM
    old = ["ru.lex.everyday.eto", "ru.lex.everyday.mama"]
    refs = lex + [newref] + old
    L = []
    L.append('id: "ru.unit.a1.' + uid + '"')
    L.append('goal_id: "ru.goal.a1.city"')
    L.append(f'title: "{title}"')
    L.append(f'summary: "{summary}"')
    L.append("estimated_minutes: 8")
    L.append("activities:")
    L.append(f'  - id: "ru.activity.a1.u{num}-read"')
    L.append('    type: "encounter-read"')
    L.append('    modality: "reading"')
    L.append("    support_level: 1")
    L.append("    content_refs: &v [" + ", ".join(f'"{r}"' for r in refs) + "]")
    L.append(f'  - id: "ru.activity.a1.u{num}-grammar"')
    L.append('    type: "encounter-read"')
    L.append('    modality: "reading"')
    L.append("    support_level: 1")
    L.append("    content_refs: &g [" + ", ".join(f'"{r}"' for r in allowed_gram) + "]")
    if newitem.startswith("s:"):
        L.append(f'  - id: "ru.activity.a1.u{num}-cloze"')
        L.append('    type: "cloze"')
        L.append('    modality: "writing"')
        L.append("    support_level: 1")
        L.append(f'    content_refs: ["{newref}"]')
    L.append(f'  - id: "ru.activity.a1.u{num}-write"')
    L.append('    type: "recall"')
    L.append('    modality: "writing"')
    L.append("    support_level: 0")
    L.append("    content_refs: *v")
    L.append("generation_contract:")
    L.append("  allowed_vocab: *v")
    L.append("  allowed_grammar: *g")
    L.append("  new_item_budget: 6")
    L.append("  register: []")
    L.append(f'  expected_interpretations: ["{title}: city and routes with taught forms only."]')
    L.append(f'  prohibited_ambiguity: ["{fence}"]')
    L.append('  target_proficiency: "A1"')
    L.append('  validation_method: "choice"')
    return "\n".join(L) + "\n"

for fname, title, summary, words, newitem, fence in U:
    with open(os.path.join(R, "curriculum", "units", fname + ".yaml"), "w") as f:
        f.write(unit_yaml(fname, title, summary, words, newitem, fence))

print("ru batch 6 written")
