#!/usr/bin/env python3
"""ru-RU batch 7: A1 units 090-099 (time-plans)."""
import json, os

R = "experiments/llm-pack-authoring/candidates/ru-fullkit-v1"
SRC = ["ru-original"]
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-04", "notes": "ai-drafted; needs dictionary sourcing and human review"}

WORDS = [
 ("ponedelnik","понедельник","понеде́льник","Monday"),
 ("vtornik","вторник","вто́рник","Tuesday"),
 ("sreda","среда","среда́","Wednesday"),
 ("chetverg","четверг","четве́рг","Thursday"),
 ("pyatnica","пятница","пя́тница","Friday"),
 ("subbota","суббота","суббо́та","Saturday"),
 ("voskresene","воскресенье","воскресе́нье","Sunday"),
 ("yanvar","январь","я́нварь","January"),
 ("fevral","февраль","февра́ль","February"),
 ("mart","март","март","March"),
 ("aprel","апрель","апре́ль","April"),
 ("may","май","май","May"),
 ("iyun","июнь","ию́нь","June"),
 ("iyul","июль","ию́ль","July"),
 ("avgust","август","а́вгуст","August"),
 ("sentyabr","сентябрь","сентя́брь","September"),
 ("oktyabr","октябрь","октя́брь","October"),
 ("noyabr","ноябрь","ноя́брь","November"),
 ("dekabr","декабрь","дека́брь","December"),
 ("zima","зима","зима́","winter"),
 ("vesna","весна","весна́","spring"),
 ("leto","лето","ле́то","summer"),
 ("osen","осень","о́сень","autumn"),
 ("segodnyshniy","сегодняшний","сего́дняшний","today's"),
 ("vcheraishniy","вчерашний","вче́рашний","yesterday's"),
 ("zavtrashniy","завтрашний","за́втрашний","tomorrow's"),
 ("proshlyy","прошлый","про́шлый","past, last"),
 ("sleduyushchiy","следующий","сле́дующий","next, following"),
 ("etot","этот","э́тот","this"),
 ("plan","план","план","plan"),
 ("vstrecha","встреча","встре́ча","meeting"),
 ("den-rozhdeniya","день рождения","день рожде́ния","birthday"),
 ("prazdnik","праздник","пра́здник","holiday"),
 ("godovshchina","годовщина","годо́вщина","anniversary"),
 ("svidanie","свидание","свида́ние","date, appointment"),
 ("zapisat","записываться","запи́сываться","to book, to sign up"),
 ("perenesti","переносить","перено́сить","to postpone"),
 ("dogovorit","договориться","договори́ться","to agree"),
 ("pominut","упоминать","упомина́ть","to mention"),
 ("napomnit","напомнить","напо́мнить","to remind"),
 ("zhdat","ждать","ждать","to wait"),
 ("sobratsya","собираться","собира́ться","to gather, to plan to"),
 ("uvazhenie","уважение","уваже́ние","respect"),
 ("pozdravit","поздравить","поздра́вить","to congratulate"),
 ("tost","тост","тост","toast"),
 ("siurpriz","сюрприз","сюрпри́з","surprise"),
 ("aromat","аромат","арома́т","aroma"),
 ("svechi","свечи","свечи́","candles"),
 ("muzyka","музыка","му́зыка","music"),
 ("veselyy","весёлый","весёлый","cheerful"),
]
assert len(WORDS) == 50

def entry(rid, form, reading, gloss):
    return {"id": f"ru.lex.timeplans.{rid}", "status": "draft",
            "forms": [{"text": form, "is_primary": True}],
            "readings": [{"text": reading, "script": "cyrillic"}],
            "glosses": {"en-US": [gloss]}, "sources": SRC, "generation": GEN}

with open(os.path.join(R, "lexicon", "timeplans.jsonl"), "w") as f:
    for rid, form, reading, gloss in WORDS:
        f.write(json.dumps(entry(rid, form, reading, gloss), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ru.grammar.a1.plan-construction", "name": "Plans with собираться plus infinitive", "category": "syntax",
  "definition": "Plans and intentions use the supplied собираться form plus an infinitive: Я собираюсь читать. Learn each supplied conjugated chunk; do not build future forms of the other taught verbs on your own."},
 {"id": "ru.grammar.a1.time-when", "name": "When questions with Когда", "category": "syntax",
  "definition": "When is asked with Когда? and answered with a supplied time phrase: Когда встреча? — В субботу. Day and month answers use в with the prepositional form as supplied (в понедельник, в январе); learn each pairing and do not use the bare nominative."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("u090","Это понедельник.","This is Monday.",["понедельник"]),
 ("u091","Это суббота.","This is Saturday.",["суббота"]),
 ("u092","Это январь.","This is January.",["январь"]),
 ("u093","Это июнь.","This is June.",["июнь"]),
 ("u094","Это зима.","This is winter.",["зима"]),
 ("u095","Это осень.","This is autumn.",["осень"]),
 ("u097","Это праздник.","This is a holiday.",["праздник"]),
 ("u098","Это тост.","This is a toast.",["тост"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, gloss, cloze in SENTS:
        e = {"id": f"ru.sent.a1.{sid}", "status": "draft", "text": text, "gloss": gloss,
             "cloze_targets": cloze, "sources": SRC, "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

ASSESS = [
 {"id": "ru.assess.a1.time-plans-reading", "goal_id": "ru.goal.a1.time-plans",
  "kind": "recognition", "modality": "reading",
  "rubric": {"scale": "observed", "criteria": [
      "Identify day, month, season and celebration words in a supplied calendar or invitation note.",
      "Distinguish the time answer in the Когда model from the event itself.",
      "Match a plan statement to the supplied собираться plus infinitive chunk."]},
  "review_status": "draft"},
 {"id": "ru.assess.a1.time-plans-writing", "goal_id": "ru.goal.a1.time-plans",
  "kind": "production", "modality": "writing",
  "rubric": {"scale": "observed", "criteria": [
      "Write a date-identification statement with это and a taught nominative noun.",
      "Answer a Когда question with the supplied в + prepositional time phrase.",
      "State a plan with the supplied собираться chunk without inventing verb forms."]},
  "review_status": "draft"},
]
with open(os.path.join(R, "assessments", "definitions.jsonl"), "a") as f:
    for a in ASSESS:
        f.write(json.dumps(a, ensure_ascii=False) + "\n")

GOAL_YAML = """  - id: "ru.goal.a1.time-plans"
    description: "Read and write simple statements about times, dates, schedules, and plans."
    band: "A1"
    modalities: ["reading", "writing"]
    prerequisites:
      - {target: "ru.goal.a1.routines", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.a1.city", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.on-ramp.numbers", dimension: "recall-meaning", required_state: "independent", strength: "hard"}
    required_concepts: ["ru.grammar.a1.plan-construction", "ru.grammar.a1.time-when", "ru.grammar.a1.location-v-na"]
    assessment_ids: ["ru.assess.a1.time-plans-reading", "ru.assess.a1.time-plans-writing"]
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
 ("090-time-plans-01","Weekdays","понедельник, вторник, среда, четверг and пятница.",
  ["ponedelnik","vtornik","sreda","chetverg","pyatnica"], "s:u090",
  "Do not capitalize weekday names; Russian weekdays are written in lowercase."),
 ("091-time-plans-02","Weekend plans","суббота, воскресенье, план, встреча and ждать.",
  ["subbota","voskresene","plan","vstrecha","zhdat"], "s:u091",
  "Do not confuse план (plan) with the already-taught расписание (schedule)."),
 ("092-time-plans-03","Months, part one","январь, февраль, март, апрель and май.",
  ["yanvar","fevral","mart","aprel","may"], "s:u092",
  "Do not guess month genders; the supplied month forms are masculine."),
 ("093-time-plans-04","Months, part two","июнь, июль, август, сентябрь and октябрь.",
  ["iyun","iyul","avgust","sentyabr","oktyabr"], "s:u093",
  "Do not confuse июнь (June) with июль (July)."),
 ("094-time-plans-05","Months and seasons","ноябрь, декабрь, зима, весна and лето.",
  ["noyabr","dekabr","zima","vesna","leto"], "s:u094",
  "Do not confuse зима (winter) with весна (spring)."),
 ("095-time-plans-06","Last and next","осень, прошлый, следующий, этот and сегодняшний.",
  ["osen","proshlyy","sleduyushchiy","etot","segodnyshniy"], "s:u095",
  "Do not attach этот to a location form; it matches the noun as supplied."),
 ("096-time-plans-07","Making plans","вчерашний, завтрашний, записываться, переносить and договориться.",
  ["vcheraishniy","zavtrashniy","zapisat","perenesti","dogovorit"], "g:ru.grammar.a1.plan-construction",
  "Do not build future forms of these verbs yourself; use the supplied собираться plus infinitive chunk."),
 ("097-time-plans-08","Celebrations","день рождения, праздник, годовщина, сюрприз and свечи.",
  ["den-rozhdeniya","prazdnik","godovshchina","siurpriz","svechi"], "s:u097",
  "Do not confuse день рождения (birthday) with праздник (holiday)."),
 ("098-time-plans-09","At the party","поздравить, тост, аромат, музыка and весёлый.",
  ["pozdravit","tost","aromat","muzyka","veselyy"], "s:u098",
  "Do not confuse свечи (candles) with the already-taught лампы (lamps)."),
 ("099-time-plans-10","Appointments","свидание, упоминать, напомнить, собираться and уважение with the Когда model.",
  ["svidanie","pominut","napomnit","sobratsya","uvazhenie"], "g:ru.grammar.a1.time-when",
  "Do not answer Когда? with a bare nominative; use the supplied в + prepositional time phrase."),
]

def unit_yaml(fname, title, summary, words, newitem, fence):
    uid = fname.split("-", 1)[1]
    num = fname[:3]
    lex = [f"ru.lex.timeplans.{w}" for w in words]
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
    L.append('goal_id: "ru.goal.a1.time-plans"')
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
    L.append(f'  expected_interpretations: ["{title}: dates and plans with taught forms only."]')
    L.append(f'  prohibited_ambiguity: ["{fence}"]')
    L.append('  target_proficiency: "A1"')
    L.append('  validation_method: "choice"')
    return "\n".join(L) + "\n"

for fname, title, summary, words, newitem, fence in U:
    with open(os.path.join(R, "curriculum", "units", fname + ".yaml"), "w") as f:
        f.write(unit_yaml(fname, title, summary, words, newitem, fence))

print("ru batch 7 written")
