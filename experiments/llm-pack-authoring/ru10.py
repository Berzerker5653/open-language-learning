#!/usr/bin/env python3
"""ru-RU batch 10: A2 units 120-129 (bookings, itineraries, and transport)."""
import json, os

R = "experiments/llm-pack-authoring/candidates/ru-fullkit-v1"
SRC = ["ru-original"]
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-05", "notes": "ai-drafted; needs dictionary sourcing and human review"}

WORDS = [
 ("bilety","билет","биле́т","ticket"),
 ("poezd","поезд","по́езд","train"),
 ("samolyot","самолёт","самолё́т","airplane"),
 ("avtobus","автобус","авто́бус","bus"),
 ("tramvay","трамвай","трамва́й","tram"),
 ("metro","метро","метро́","metro"),
 ("taksy","такси","та́кси","taxi"),
 ("vagon","вагон","ваго́н","carriage, wagon"),
 ("platforma","платформа","платфо́рма","platform"),
 ("vakzal","вокзал","вокза́л","station"),
 ("arest","аэропорт","аэропо́рт","airport"),
 ("peron","перрон","перро́н","platform"),
 ("raspisanie","расписание","расписа́ние","schedule"),
 ("otpravlenie","отправление","отпра́вление","departure"),
 ("pribytie","прибытие","прибы́тие","arrival"),
 ("opozdanie","опоздание","опозда́ние","delay, lateness"),
 ("peresadka","пересадка","переса́дка","transfer"),
 ("marshrut","маршрут","маршру́т","route"),
 ("ostanovka","остановка","оста́новка","stop"),
 ("poezdka","поездка","пое́здка","trip"),
 ("puteshestvie","путешествие","путеше́ствие","journey"),
 ("putevka","путёвка","путёвка","travel voucher"),
 ("bron","бронь","бро́нь","reservation"),
 ("bronirovat","бронировать","бронирова́ть","to book, reserve"),
 ("kassa","касса","ка́сса","ticket office"),
 ("kassir","кассир","касси́р","ticket clerk"),
 ("pasazhir","пассажир","пассажи́р","passenger"),
 ("provodnik","проводник","проводни́к","train attendant"),
 ("voditel","водитель","води́тель","driver"),
 ("sumka","сумка","су́мка","bag"),
 ("chemodan","чемодан","чемода́н","suitcase"),
 ("ruchka2","ручка","ру́чка","handle; pen"),
 ("ves","вес","вес","weight"),
 ("bagazh","багаж","бага́ж","luggage"),
 ("dokument","документ","докуме́нт","document"),
 ("passport","паспорт","па́спорт","passport"),
 ("viza","виза","ви́за","visa"),
 ("tamozhnya","таможня","тамо́жня","customs"),
 ("kontrol","контроль","ко́нтроль","check, control"),
 ("bezopasnost","безопасность","безопа́сность","safety"),
 ("svetofor","светофор","светофо́р","traffic light"),
 ("doroga","дорога","доро́га","road, way"),
 ("proizdat","проезжать","проезжа́ть","to pass through"),
 ("ehat","ехать","е́хать","to go by vehicle"),
 ("letet","лететь","лете́ть","to fly"),
 ("idti","идти","идти́","to walk, go on foot"),
 ("perekhod","переход","перехо́д","crossing, passage"),
 ("pereezd","переезд","перее́зд","railway crossing"),
 ("skorost","скорость","ско́рость","speed"),
 ("rasstoyanie","расстояние","расстоя́ние","distance"),
]
assert len(WORDS) == 50

def entry(rid, form, reading, gloss):
    return {"id": f"ru.lex.travel.{rid}", "status": "draft",
            "forms": [{"text": form, "is_primary": True}],
            "readings": [{"text": reading, "script": "cyrillic"}],
            "glosses": {"en-US": [gloss]}, "sources": SRC, "generation": GEN}

with open(os.path.join(R, "lexicon", "travel.jsonl"), "w") as f:
    for rid, form, reading, gloss in WORDS:
        f.write(json.dumps(entry(rid, form, reading, gloss), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ru.grammar.a2.prepositional-transport", "name": "На + prepositional for transport", "category": "syntax",
  "definition": "Use на with the prepositional for means of travel: на поезде, на автобусе, на самолёте. Learn the supplied forms; do not invent new endings."},
 {"id": "ru.grammar.a2.time-of-departure", "name": "Departure and arrival times", "category": "syntax",
  "definition": "Поезд отправляется в шесть; поезд прибывает в семь. Times use в plus the supplied hour forms. Learn the supplied chunks as given."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("u120","Это билет.","This is a ticket.",["билет"]),
 ("u121","Это поезд.","This is a train.",["поезд"]),
 ("u122","Это аэропорт.","This is the airport.",["аэропорт"]),
 ("u123","Это расписание.","This is the schedule.",["расписание"]),
 ("u124","Это маршрут.","This is the route.",["маршрут"]),
 ("u125","Это чемодан.","This is the suitcase.",["чемодан"]),
 ("u126","Это паспорт.","This is the passport.",["паспорт"]),
 ("u127","Это дорога.","This is the road.",["дорога"]),
 ("u128","Это скорость.","This is the speed.",["скорость"]),
 ("u129","Это остановка.","This is the stop.",["остановка"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, gloss, cloze in SENTS:
        e = {"id": f"ru.sent.a2.{sid}", "status": "draft", "text": text, "gloss": gloss,
             "cloze_targets": cloze, "sources": SRC, "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

ASSESS = [
 {"id": "ru.assess.a2.travel-reading", "goal_id": "ru.goal.a2.travel",
  "kind": "recognition", "modality": "reading",
  "rubric": {"scale": "observed", "criteria": [
      "Identify ticket, train, and schedule words on a supplied timetable or ticket.",
      "Match a transport word to its на + prepositional chunk.",
      "Read a supplied departure or arrival time correctly."]},
  "review_status": "draft"},
 {"id": "ru.assess.a2.travel-writing", "goal_id": "ru.goal.a2.travel",
  "kind": "production", "modality": "writing",
  "rubric": {"scale": "observed", "criteria": [
      "Write a travel-identification statement with это and a taught nominative noun.",
      "Complete a travel phrase with the supplied на + prepositional chunk.",
      "State a departure or arrival with the supplied time chunk."]},
  "review_status": "draft"},
]
with open(os.path.join(R, "assessments", "definitions.jsonl"), "a") as f:
    for a in ASSESS:
        f.write(json.dumps(a, ensure_ascii=False) + "\n")

GOAL_YAML = """  - id: "ru.goal.a2.travel"
    description: "Book travel, read itineraries, and describe transport."
    band: "A2"
    modalities: ["reading", "writing"]
    prerequisites:
      - {target: "ru.goal.a2.past-events", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.a1.city", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.on-ramp.everyday", dimension: "recall-meaning", required_state: "independent", strength: "hard"}
    required_concepts: ["ru.grammar.a2.prepositional-transport", "ru.grammar.a2.time-of-departure", "ru.grammar.on-ramp.zero-present-copula"]
    assessment_ids: ["ru.assess.a2.travel-reading", "ru.assess.a2.travel-writing"]
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
 ("120-travel-01","Tickets","билет, касса, кассир, бронь and бронировать.",
  ["bilety","kassa","kassir","bron","bronirovat"], "s:u120",
  "Do not confuse касса (ticket office) with магазин (shop)."),
 ("121-travel-02","Trains","поезд, вагон, платформа, перрон and вокзал.",
  ["poezd","vagon","platforma","peron","vakzal"], "s:u121",
  "Do not confuse платформа with остановка (street stop)."),
 ("122-travel-03","Flying","самолёт, аэропорт, лететь, пассажир and проводник.",
  ["samolyot","arest","letet","pasazhir","provodnik"], "s:u122",
  "Do not confuse аэропорт (airport) with вокзал (station)."),
 ("123-travel-04","Schedules","расписание, отправление, прибытие, опоздание and пересадка.",
  ["raspisanie","otpravlenie","pribytie","opozdanie","peresadka"], "s:u123",
  "Do not confuse отправление (departure) with прибытие (arrival)."),
 ("124-travel-05","Routes","маршрут, остановка, ехать, идти and переход.",
  ["marshrut","ostanovka","ehat","idti","perekhod"], "s:u124",
  "Do not confuse маршрут (route) with дорога (road)."),
 ("125-travel-06","Luggage","чемодан, сумка, багаж, вес and ручка.",
  ["chemodan","sumka","bagazh","ves","ruchka2"], "s:u125",
  "Do not confuse багаж (luggage) with сумка (hand bag)."),
 ("126-travel-07","Documents","паспорт, виза, документ, таможня and контроль.",
  ["passport","viza","dokument","tamozhnya","kontrol"], "s:u126",
  "Do not confuse паспорт with документ generally; паспорт is the identity document."),
 ("127-travel-08","City transport","трамвай, автобус, метро, такси and светофор.",
  ["tramvay","avtobus","metro","taksy","svetofor"], "s:u127",
  "Do not confuse трамвай with автобус; both take на + prepositional."),
 ("128-travel-09","On the road","дорога, переезд, безопасность, проезжать and расстояние.",
  ["doroga","pereezd","bezopasnost","proizdat","rasstoyanie"], "s:u128",
  "Do not confuse переезд (railway crossing) with переход (passage)."),
 ("129-travel-10","The journey","поездка, путешествие, путёвка, водитель and скорость.",
  ["poezdka","puteshestvie","putevka","voditel","skorost"], "s:u129",
  "Do not confuse поездка (trip) with путешествие (journey)."),
]

def unit_yaml(fname, title, summary, words, newitem, fence):
    uid = fname.split("-", 1)[1]
    num = fname[:3]
    lex = [f"ru.lex.travel.{w}" for w in words]
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
    L.append('goal_id: "ru.goal.a2.travel"')
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
    L.append(f'  expected_interpretations: ["{title}: travel with taught forms only."]')
    L.append(f'  prohibited_ambiguity: ["{fence}"]')
    L.append('  target_proficiency: "A2"')
    L.append('  validation_method: "choice"')
    return "\n".join(L) + "\n"

for fname, title, summary, words, newitem, fence in U:
    with open(os.path.join(R, "curriculum", "units", fname + ".yaml"), "w") as f:
        f.write(unit_yaml(fname, title, summary, words, newitem, fence))

print("ru batch 10 written")
