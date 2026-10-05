#!/usr/bin/env python3
"""ru-RU batch 13: A2 units 150-159 (duties, experience, and immediate goals)."""
import json, os

R = "experiments/llm-pack-authoring/candidates/ru-fullkit-v1"
SRC = ["ru-original"]
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-05", "notes": "ai-drafted; needs dictionary sourcing and human review"}

WORDS = [
 ("obyazannost","обязанность","обяза́нность","duty, obligation"),
 ("rabota2","работа","рабо́та","work, job"),
 ("dolzhnost","должность","до́жность","position, post"),
 ("opyt","опыт","о́пыт","experience"),
 ("navyk","навык","на́вык","skill"),
 ("cel","цель","цель","goal"),
 ("plan2","план","пла́н","plan"),
 ("srok","срок","срок","deadline, term"),
 ("vozmozhnost","возможность","возмо́жность","possibility"),
 ("shans","шанс","шанс","chance"),
 ("uspeh","успех","успе́х","success"),
 ("pobeda","победа","побе́да","victory"),
 ("porazhenie","поражение","пораже́ние","defeat"),
 ("konkurent","конкурент","конкуре́нт","competitor"),
 ("kollega","коллега","колле́га","colleague"),
 ("nachalnik","начальник","нача́льник","boss"),
 ("podchinenny","подчинённый","подчинё́нный","subordinate"),
 ("sotrudnik","сотрудник","сотру́дник","coworker, staff"),
 ("proekt","проект","прое́кт","project"),
 ("zadacha","задача","зада́ча","task"),
 ("rezultat","результат","резуста́т","result"),
 ("proverka","проверка","прове́рка","check"),
 ("otchet","отчёт","отчё́т","report"),
 ("karierny","карьерный","карье́рный","career (adj)"),
 ("znanie","знание","зна́ние","knowledge"),
 ("dostich","достичь","достичь","to achieve (pf)"),
 ("dostigat","достигать","достига́ть","to achieve, reach"),
 ("uchastie","участие","уча́стие","participation"),
 ("uchastvovat","участвовать","у́частвовать","to participate"),
 ("organizator","организатор","организа́тор","organizer"),
 ("meropriyatie","мероприятие","меропри́ятие","event, activity"),
 ("initsiativa","инициатива","инициати́ва","initiative"),
 ("resurs","ресурс","ресу́рс","resource"),
 ("sredstva","средства","сре́дства","funds, means"),
 ("polza","польза","по́льза","use, benefit"),
 ("vred","вред","вред","harm"),
 ("risk2","риск","риск","risk"),
 ("doverie","доверие","дове́рие","trust"),
 ("iskrennost","искренность","и́скренность","sincerity"),
 ("chestnost","честность","че́стность","honesty"),
 ("otvetstvennyi","ответственный","отве́тственный","responsible"),
 ("initsiativnyi","инициативный","инициати́вный","proactive"),
 ("opytnyi","опытный","о́пытный","experienced"),
 ("molodoi","молодой","молодо́й","young"),
 ("starshe","старше","ста́рше","older"),
 ("vozrast","возраст","во́зраст","age"),
 ("diplom","диплом","дипло́м","diploma"),
 ("kvalifikatsiya","квалификация","квалифика́ция","qualification"),
 ("obuchenie","обучение","обуче́ние","training"),
 ("kursy","курсы","ку́рсы","courses"),
]
assert len(WORDS) == 50, len(WORDS)

def entry(rid, form, reading, gloss):
    return {"id": f"ru.lex.workstudy.{rid}", "status": "draft",
            "forms": [{"text": form, "is_primary": True}],
            "readings": [{"text": reading, "script": "cyrillic"}],
            "glosses": {"en-US": [gloss]}, "sources": SRC, "generation": GEN}

with open(os.path.join(R, "lexicon", "workstudy.jsonl"), "w") as f:
    for rid, form, reading, gloss in WORDS:
        f.write(json.dumps(entry(rid, form, reading, gloss), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ru.grammar.a2.instrumental-role", "name": "Instrumental of role", "category": "syntax",
  "definition": "Roles and professions take the instrumental: Я работаю врачом; Он стал менеджером. Learn the supplied instrumental forms; do not invent new endings."},
 {"id": "ru.grammar.a2.genitive-of-achievement", "name": "Genitive after достичь", "category": "syntax",
  "definition": "Достичь and добиваться take the genitive: достичь цели; добиваться успеха. Learn the supplied genitive forms as given."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("u150","Это работа.","This is work.",["работа"]),
 ("u151","Это обязанность.","This is a duty.",["обязанность"]),
 ("u152","Это опыт.","This is experience.",["опыт"]),
 ("u153","Это цель.","This is the goal.",["цель"]),
 ("u154","Это план.","This is the plan.",["план"]),
 ("u155","Это проект.","This is the project.",["проект"]),
 ("u156","Это задача.","This is the task.",["задача"]),
 ("u157","Это результат.","This is the result.",["результат"]),
 ("u158","Это успех.","This is success.",["успех"]),
 ("u159","Это диплом.","This is the diploma.",["диплом"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, gloss, cloze in SENTS:
        e = {"id": f"ru.sent.a2.{sid}", "status": "draft", "text": text, "gloss": gloss,
             "cloze_targets": cloze, "sources": SRC, "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

ASSESS = [
 {"id": "ru.assess.a2.work-study-reading", "goal_id": "ru.goal.a2.work-study",
  "kind": "recognition", "modality": "reading",
  "rubric": {"scale": "observed", "criteria": [
      "Identify duty, task, and result words in a supplied work note.",
      "Match a role word to its supplied instrumental chunk (работаю врачом).",
      "Distinguish a goal word from a plan word."]},
  "review_status": "draft"},
 {"id": "ru.assess.a2.work-study-writing", "goal_id": "ru.goal.a2.work-study",
  "kind": "production", "modality": "writing",
  "rubric": {"scale": "observed", "criteria": [
      "Write a work-identification statement with это and a taught nominative noun.",
      "State a role with the supplied instrumental chunk.",
      "State an achievement with the supplied достичь + genitive chunk."]},
  "review_status": "draft"},
]
with open(os.path.join(R, "assessments", "definitions.jsonl"), "a") as f:
    for a in ASSESS:
        f.write(json.dumps(a, ensure_ascii=False) + "\n")

GOAL_YAML = """  - id: "ru.goal.a2.work-study"
    description: "Describe duties, experience, and immediate goals at work and study."
    band: "A2"
    modalities: ["reading", "writing"]
    prerequisites:
      - {target: "ru.goal.a2.wellbeing", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.on-ramp.classroom", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.on-ramp.everyday", dimension: "recall-meaning", required_state: "independent", strength: "hard"}
    required_concepts: ["ru.grammar.a2.instrumental-role", "ru.grammar.a2.genitive-of-achievement", "ru.grammar.on-ramp.zero-present-copula"]
    assessment_ids: ["ru.assess.a2.work-study-reading", "ru.assess.a2.work-study-writing"]
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
 ("150-work-study-01","Duties","обязанность, работа, должность, навык and ответственный.",
  ["obyazannost","rabota2","dolzhnost","navyk","otvetstvennyi"], "s:u150",
  "Do not confuse должность (position) with работа (work)."),
 ("151-work-study-02","Experience","опыт, опытный, знание, квалификация and диплом.",
  ["opyt","opytnyi","znanie","kvalifikatsiya","diplom"], "s:u151",
  "Do not confuse квалификация with диплом."),
 ("152-work-study-03","Goals","цель, план, срок, возможность and шанс.",
  ["cel","plan2","srok","vozmozhnost","shans"], "s:u152",
  "Do not confuse цель (goal) with план (plan)."),
 ("153-work-study-04","Success","успех, победа, поражение, конкурент and достичь.",
  ["uspeh","pobeda","porazhenie","konkurent","dostich"], "s:u153",
  "Do not confuse победа (victory) with поражение (defeat)."),
 ("154-work-study-05","Projects","проект, задача, результат, проверка and отчёт.",
  ["proekt","zadacha","rezultat","proverka","otchet"], "s:u154",
  "Do not confuse задача (task) with проект (project)."),
 ("155-work-study-06","Team","коллега, начальник, подчинённый, сотрудник and организатор.",
  ["kollega","nachalnik","podchinenny","sotrudnik","organizator"], "s:u155",
  "Do not confuse начальник (boss) with подчинённый (subordinate)."),
 ("156-work-study-07","Participation","участие, участвовать, мероприятие, инициатива and инициативный.",
  ["uchastie","uchastvovat","meropriyatie","initsiativa","initsiativnyi"], "s:u156",
  "Do not confuse инициатива (initiative) with мероприятие (event)."),
 ("157-work-study-08","Resources","ресурс, средства, риск, доверие and честность.",
  ["resurs","sredstva","risk2","doverie","chestnost"], "s:u157",
  "Do not confuse средства (funds) with ресурс (resource)."),
 ("158-work-study-09","Training","обучение, курсы, карьерный, достигать and возраст.",
  ["obuchenie","kursy","karierny","dostigat","vozrast"], "s:u158",
  "Do not confuse обучение (training) with курсы (courses)."),
 ("159-work-study-10","People and values","молодой, старше, искренность, вред and польза.",
  ["molodoi","starshe","iskrennost","vred","polza"], "s:u159",
  "Do not confuse польза (benefit) with вред (harm)."),
]

def unit_yaml(fname, title, summary, words, newitem, fence):
    uid = fname.split("-", 1)[1]
    num = fname[:3]
    lex = [f"ru.lex.workstudy.{w}" for w in words]
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
    L.append('goal_id: "ru.goal.a2.work-study"')
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
    L.append(f'  expected_interpretations: ["{title}: work and study with taught forms only."]')
    L.append(f'  prohibited_ambiguity: ["{fence}"]')
    L.append('  target_proficiency: "A2"')
    L.append('  validation_method: "choice"')
    return "\n".join(L) + "\n"

for fname, title, summary, words, newitem, fence in U:
    with open(os.path.join(R, "curriculum", "units", fname + ".yaml"), "w") as f:
        f.write(unit_yaml(fname, title, summary, words, newitem, fence))

print("ru batch 13 written")
