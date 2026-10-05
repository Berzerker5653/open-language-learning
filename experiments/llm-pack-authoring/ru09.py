#!/usr/bin/env python3
"""ru-RU batch 9: A2 units 110-119 (past events and time sequence)."""
import json, os

R = "experiments/llm-pack-authoring/candidates/ru-fullkit-v1"
SRC = ["ru-original"]
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-05", "notes": "ai-drafted; needs dictionary sourcing and human review"}

WORDS = [
 ("vchera","вчера","вчера́","yesterday"),
 ("segodnya","сегодня","сегодня́","today"),
 ("zavtra","завтра","за́втра","tomorrow"),
 ("proshlyy","прошлый","про́шлый","past, last"),
 ("byl","был","был","was (m)"),
 ("byla","была","была́","was (f)"),
 ("bylo","было","бы́ло","was (n)"),
 ("byli","были","бы́ли","were"),
 ("delat","делать","де́лать","to do"),
 ("delal","делал","де́лал","did (m)"),
 ("chitat","читать","чита́ть","to read"),
 ("pisat","писать","писа́ть","to write"),
 ("smotret","смотреть","смотре́ть","to watch"),
 ("gulyat","гулять","гуля́ть","to walk"),
 ("priyti","прийти","прийти́","to come (pf)"),
 ("uiyti","уйти","уйти́","to leave (pf)"),
 ("kupit","купить","купи́ть","to buy (pf)"),
 ("sdelat","сделать","сде́лать","to do (pf)"),
 ("znat","знать","зна́ть","to know"),
 ("znal","знал","зна́л","knew"),
 ("zhit","жить","жи́ть","to live"),
 ("rabotal","работать","работа́ть","to work"),
 ("vstrechal","встречать","встреча́ть","to meet"),
 ("pozvonit","позвонить","позвони́ть","to call (pf)"),
 ("priletet","прилететь","прилете́ть","to fly in (pf)"),
 ("poehat","поехать","поеха́ть","to go by vehicle (pf)"),
 ("snachala","сначала","сначала́","first, at first"),
 ("potom","потом","по́том","then"),
 ("posle","после","по́сле","after"),
 ("pered","перед","пе́ред","before"),
 ("kogda","когда","когда́","when"),
 ("poka","пока","пока́","while"),
 ("eshche","ещё","ещё́","still, yet"),
 ("uz","уже","уже́","already"),
 ("nikogda","никогда","никогда́","never"),
 ("vsegda","всегда","всегда́","always"),
 ("chasto","часто","ча́сто","often"),
 ("redko","редко","ре́дко","rarely"),
 ("utrom","утром","у́тром","in the morning"),
 ("vecherom","вечером","ве́чером","in the evening"),
 ("nochyu","ночью","но́чью","at night"),
 ("vstrecha","встреча","встре́ча","meeting"),
 ("proshloe","прошлое","про́шлое","the past"),
 ("istoriya","история","исто́рия","story, history"),
 ("sobytie","событие","собы́тие","event"),
 ("sluchilos","случиться","случи́ться","to happen"),
 ("data","дата","да́та","date"),
 ("vyhodnye","выходные","выходны́е","weekend"),
 ("otpusk","отпуск","отпу́ск","vacation"),
 ("poezdka","поездка","пое́здка","trip"),
]
assert len(WORDS) == 50

def entry(rid, form, reading, gloss):
    return {"id": f"ru.lex.pastevents.{rid}", "status": "draft",
            "forms": [{"text": form, "is_primary": True}],
            "readings": [{"text": reading, "script": "cyrillic"}],
            "glosses": {"en-US": [gloss]}, "sources": SRC, "generation": GEN}

with open(os.path.join(R, "lexicon", "pastevents.jsonl"), "w") as f:
    for rid, form, reading, gloss in WORDS:
        f.write(json.dumps(entry(rid, form, reading, gloss), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ru.grammar.a2.past-tense", "name": "Past tense", "category": "morphology",
  "definition": "Past tense uses the -л ending agreeing in gender: я читал, она читала, оно было, они были. Learn the supplied past forms as given; do not invent new stems."},
 {"id": "ru.grammar.a2.time-connectors", "name": "Time sequence connectors", "category": "syntax",
  "definition": "Sequence events with сначала (first), потом (then) and потом again; place vchera or segodnya at the start: Сначала работа, потом встреча. Do not decline these connectors."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("u110","Вчера я читал.","Yesterday I read.",["читал"]),
 ("u111","Потом мы гуляли.","Then we walked.",["гуляли"]),
 ("u112","Сначала работа, потом встреча.","First work, then the meeting.",["встреча"]),
 ("u113","Она писала письмо.","She was writing a letter.",["писала"]),
 ("u114","Когда ты приехал?","When did you arrive?",["приехал"]),
 ("u115","Мы уже пришли.","We have already arrived.",["уже"]),
 ("u116","Вечером они смотрели.","In the evening they watched.",["смотрели"]),
 ("u117","Она всегда работала.","She always worked.",["работала"]),
 ("u118","Это было событие.","That was an event.",["событие"]),
 ("u119","Сначала поездка, потом отпуск.","First the trip, then the vacation.",["поездка"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, gloss, cloze in SENTS:
        e = {"id": f"ru.sent.a2.{sid}", "status": "draft", "text": text, "gloss": gloss,
             "cloze_targets": cloze, "sources": SRC, "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

ASSESS = [
 {"id": "ru.assess.a2.past-events-reading", "goal_id": "ru.goal.a2.past-events",
  "kind": "recognition", "modality": "reading",
  "rubric": {"scale": "observed", "criteria": [
      "Identify past-time words (вчера, был, -л forms) in a supplied short narrative.",
      "Order two or three supplied events using сначала and потом.",
      "Match a past verb form to its supplied subject by gender."]},
  "review_status": "draft"},
 {"id": "ru.assess.a2.past-events-writing", "goal_id": "ru.goal.a2.past-events",
  "kind": "production", "modality": "writing",
  "rubric": {"scale": "observed", "criteria": [
      "Write a past statement with a supplied -л form agreeing with the subject.",
      "Sequence two events with сначала and потом.",
      "Place a supplied time adverb (вчера, вечером) correctly."]},
  "review_status": "draft"},
]
with open(os.path.join(R, "assessments", "definitions.jsonl"), "a") as f:
    for a in ASSESS:
        f.write(json.dumps(a, ensure_ascii=False) + "\n")

GOAL_YAML = """  - id: "ru.goal.a2.past-events"
    description: "Narrate simple past events and sequence them in time."
    band: "A2"
    modalities: ["reading", "writing"]
    prerequisites:
      - {target: "ru.goal.a1.basic-messages", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.a1.time-plans", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.on-ramp.everyday", dimension: "recall-meaning", required_state: "independent", strength: "hard"}
    required_concepts: ["ru.grammar.a2.past-tense", "ru.grammar.a2.time-connectors", "ru.grammar.on-ramp.zero-present-copula"]
    assessment_ids: ["ru.assess.a2.past-events-reading", "ru.assess.a2.past-events-writing"]
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
 ("110-past-events-01","Yesterday","вчера, читал, делал, писал and был.",
  ["vchera","chitat","delal","pisat","byl"], "s:u110",
  "Do not use present forms to talk about вчера; use the supplied -л form."),
 ("111-past-events-02","Then and after","потом, после, перед, пока and гуляли.",
  ["potom","posle","pered","poka","gulyat"], "s:u111",
  "Do not decline сначала or потом; they never change form."),
 ("112-past-events-03","Work and meeting","сначала, работа, встреча, встречать and была.",
  ["snachala","rabotal","vstrecha","vstrechal","byla"], "s:u112",
  "Do not confuse встреча (meeting) with случай (occasion)."),
 ("113-past-events-04","She wrote","писала, была, письмо and the feminine -а ending.",
  ["pisat","byla","bylo","znal","znat"], "s:u113",
  "Do not use the masculine -л form with она; use the supplied feminine form."),
 ("114-past-events-05","When did you come?","когда, прийти, приехать and прилететь.",
  ["kogda","priyti","priletet","poehat","uiyti"], "s:u114",
  "Do not confuse прийти (to come) with уйти (to leave)."),
 ("115-past-events-06","Already done","уже, ещё, купить, сделать and пришли.",
  ["uz","eshche","kupit","sdelat","pozvonit"], "s:u115",
  "Do not use уже with a present verb; pair it with a supplied perfective past form."),
 ("117-past-events-08","Always and never","всегда, никогда, делать and знал.",
  ["vsegda","nikogda","delat","zhit","znal"], "s:u117",
  "Do not place никогда after the verb; it comes before it."),
 ("118-past-events-09","A past event","событие, история, прошлое, случай and было.",
  ["sobytie","istoriya","proshloe","sluchilos","bylo"], "s:u118",
  "Do not confuse событие (event) with дата (date)."),
 ("119-past-events-10","Trips and weekends","поездка, выходные, отпуск, дата and сегодня.",
  ["poezdka","vyhodnye","otpusk","data","segodnya"], "s:u119",
  "Do not confuse поездка (trip) with отпуск (vacation)."),
]

def unit_yaml(fname, title, summary, words, newitem, fence):
    uid = fname.split("-", 1)[1]
    num = fname[:3]
    lex = [f"ru.lex.pastevents.{w}" for w in words]
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
    L.append('goal_id: "ru.goal.a2.past-events"')
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
    L.append(f'  expected_interpretations: ["{title}: past events with taught forms only."]')
    L.append(f'  prohibited_ambiguity: ["{fence}"]')
    L.append('  target_proficiency: "A2"')
    L.append('  validation_method: "choice"')
    return "\n".join(L) + "\n"

for fname, title, summary, words, newitem, fence in U:
    with open(os.path.join(R, "curriculum", "units", fname + ".yaml"), "w") as f:
        f.write(unit_yaml(fname, title, summary, words, newitem, fence))

print("ru batch 9 written")
