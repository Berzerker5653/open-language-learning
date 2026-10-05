#!/usr/bin/env python3
"""ru-RU batch 41: B2 units 430-439 (counterarguments and qualification)."""
import json, os

R = "experiments/llm-pack-authoring/candidates/ru-fullkit-v1"
SRC = ["ru-original"]
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-05", "notes": "ai-drafted; needs dictionary sourcing and human review"}

WORDS = [
 ("ogovorka","оговорка","оговóрка","reservation (caveat)"),
 ("vozrazhat","возражать","возражáть","to object"),
 ("ogovarivat","оговаривать","оговáривать","to stipulate"),
 ("ogovorit","оговорить","оговорúть","to stipulate"),
 ("neskolko","несколько","нéсколько","somewhat, a few"),
 ("dovolno","довольно","дóвольно","quite"),
 ("vpolne","вполне","впóлне","quite, entirely"),
 ("otchasti","отчасти","óтчасти","partly"),
 ("neredko","нередко","нерéдко","often"),
 ("poroy","порой","порóй","at times"),
 ("inoy","иной","инóй","other, different"),
 ("otnud","отнюдь","óтнюдь","not at all"),
 ("vryad","вряд","вряд","hardly"),
 ("edva","едва","едвá","barely"),
 ("primerno","примерно","примéрно","approximately"),
 ("okolo","около","óколо","about"),
 ("svershu","свыше","свéрху","over, above"),
 ("menee","менее","мéнее","less"),
 ("slishkom","слишком","сли́шком","too, excessively"),
 ("chrezmerno","чрезмерно","чрезмéрно","excessively"),
 ("izbytochno","избыточно","избúточно","redundantly"),
 ("umerenno","умеренно","ýмеренно","moderately"),
 ("slegka","слегка","слегкá","slightly"),
 ("nemnogo","немного","немнóго","a little"),
 ("chut","чуть","чуть","slightly"),
 ("sovmestno2","совсем","совсéм","completely"),
 ("absolyutno","абсолютно","абсолютно","absolutely"),
 ("ischerpyayushche","исчерпывающе","исчерпывáюще","exhaustively"),
 ("ischerpat","исчерпать","исчерпáть","to exhaust"),
 ("remarka","ремарка","ремáрка","remark, stage direction"),
 ("nedoskazannost","недосказанность","недоскáзанность","understatement"),
 ("nedomolvka","недомолвка","недóмолвка","omission, hint"),
 ("evfemizm","эвфемизм","эвфéмизм","euphemism"),
 ("tabu","табу","табý","taboo"),
 ("cenzura","цензура","цензýра","censorship"),
 ("korrektura","корректура","корректýра","proofreading"),
 ("vjorstka","вёрстка","вёрстка","layout"),
 ("nabor","набор","нáбор","typesetting, set"),
 ("tirazh","тираж","тирáж","print run"),
 ("izdanie","издание","издáние","edition, publication"),
 ("izdatelstvo","издательство","издáтельство","publisher"),
 ("razmetka","разметка","размéтка","markup"),
 ("kavychki","кавычки","кáвычки","quotation marks"),
 ("tire","тире","тирé","dash"),
 ("dvoetochie","двоеточие","двоетóчие","colon"),
 ("mnogotochie","многоточие","многотóчие","ellipsis"),
 ("skobka","скобка","скóбка","bracket"),
 ("defis","дефис","дéфис","hyphen"),
 ("perenos","перенос","пéренос","line break, transfer"),
 ("sochetanie","сочетание","сочетáние","combination"),
]

def entry(rid, text, stress, gloss):
    return {"id": f"ru.lex.argue3.{rid}", "status": "draft",
            "forms": [{"text": text}], "readings": [{"text": stress}],
            "glosses": {"en-US": [gloss]}, "sources": SRC, "generation": GEN}

with open(os.path.join(R, "lexicon", "argue3.jsonl"), "w") as f:
    for rid, text, stress, gloss in WORDS:
        f.write(json.dumps(entry(rid, text, stress, gloss), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ru.grammar.b2.esli-i", "name": "Если и concession", "category": "syntax",
  "definition": "Concessions use если и: если и спорить, то вежливо. Learn the supplied chunks as given."},
 {"id": "ru.grammar.b2-pravda", "name": "Правда, … qualification", "category": "syntax",
  "definition": "Qualification uses правда: правда, но важно. Learn the supplied chunks as given."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("u430","Это оговорка.","This is a caveat.",["оговорка"]),
 ("u431","Это ремарка.","This is a remark.",["ремарка"]),
 ("u432","Это эвфемизм.","This is a euphemism.",["эвфемизм"]),
 ("u433","Это табу.","This is a taboo.",["табу"]),
 ("u434","Это цензура.","This is censorship.",["цензура"]),
 ("u435","Это вёрстка.","This is a layout.",["вёрстка"]),
 ("u436","Это тираж.","This is a print run.",["тираж"]),
 ("u437","Это издание.","This is an edition.",["издание"]),
 ("u438","Это тире.","This is a dash.",["тире"]),
 ("u439","Это дефис.","This is a hyphen.",["дефис"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, gloss, cloze in SENTS:
        e = {"id": f"ru.sent.b2.{sid}", "status": "draft", "text": text, "gloss": gloss,
             "cloze_targets": cloze, "sources": SRC, "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

ASSESS = [
 {"id": "ru.assess.b2.argumentation-reading3", "goal_id": "ru.goal.b2.argumentation3",
  "kind": "recognition", "modality": "reading",
  "rubric": {"scale": "observed", "criteria": [
      "Identify qualification words (оговорка, ремарка) in a supplied note.",
      "Match правда chunks to their qualification.",
      "Distinguish эвфемизм (euphemism) from недомолвка (omission)."]},
  "review_status": "draft"},
 {"id": "ru.assess.b2.argumentation-writing3", "goal_id": "ru.goal.b2.argumentation3",
  "kind": "production", "modality": "writing",
  "rubric": {"scale": "observed", "criteria": [
      "Qualify with the supplied правда chunk.",
      "Concede with the supplied если и chunk.",
      "Object with a supplied возражать or оговорка chunk."]},
  "review_status": "draft"},
]
with open(os.path.join(R, "assessments", "definitions.jsonl"), "a") as f:
    for a in ASSESS:
        f.write(json.dumps(a, ensure_ascii=False) + "\n")

GOAL_YAML = """  - id: "ru.goal.b2.argumentation3"
    description: "Raise counterarguments and qualify claims."
    band: "B2"
    modalities: ["reading", "writing"]
    prerequisites:
      - {target: "ru.goal.b2.argumentation2", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.b1.opinions", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.on-ramp.everyday", dimension: "recall-meaning", required_state: "independent", strength: "hard"}
    required_concepts: ["ru.grammar.b2.esli-i", "ru.grammar.b2-pravda", "ru.grammar.on-ramp.zero-present-copula"]
    assessment_ids: ["ru.assess.b2.argumentation-reading3", "ru.assess.b2.argumentation-writing3"]
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
 ("430-argue3-01","Caveat","оговорка, возражать, оговаривать, оговорить and ремарка.",
  ["ogovorka","vozrazhat","ogovarivat","ogovorit","remarka"], "s:u430",
  "Do not confuse оговорка (caveat) with ремарка (remark)."),
 ("431-argue3-02","Somewhat","несколько, довольно, вполне, отчасти and набор.",
  ["neskolko","dovolno","vpolne","otchasti","nabor"], "s:u431",
  "Do not confuse вполне (entirely) with отчасти (partly)."),
 ("432-argue3-03","Often","нередко, порой, иной, едва and отнюдь.",
  ["neredko","poroy","inoy","edva","otnud"], "s:u432",
  "Do not confuse нередко (often) with порой (at times)."),
 ("433-argue3-04","Hardly","вряд, примерно, около, свыше and менее.",
  ["vryad","primerno","okolo","svershu","menee"], "s:u433",
  "Do not confuse свыше (over) with менее (less)."),
 ("434-argue3-05","Excessively","слишком, чрезмерно, избыточно, умеренно and слегка.",
  ["slishkom","chrezmerno","izbytochno","umerenno","slegka"], "s:u434",
  "Do not confuse чрезмерно (excessively) with умеренно (moderately)."),
 ("435-argue3-06","Completely","немного, чуть, совсем, абсолютно and исчерпывающе.",
  ["nemnogo","chut","sovmestno2","absolyutno","ischerpyayushche"], "s:u435",
  "Do not confuse чуть (slightly) with абсолютно (absolutely)."),
 ("436-argue3-07","Understatement","недосказанность, недомолвка, эвфемизм, табу and цензура.",
  ["nedoskazannost","nedomolvka","evfemizm","tabu","cenzura"], "s:u436",
  "Do not confuse эвфемизм (euphemism) with недомолвка (omission)."),
 ("437-argue3-08","Layout","корректура, вёрстка, набор, тираж and издание.",
  ["korrektura","vjorstka","nabor","tirazh","izdanie"], "s:u437",
  "Do not confuse вёрстка (layout) with набор (typesetting)."),
 ("438-argue3-09","Publisher","издательство, разметка, кавычки, тире and двоеточие.",
  ["izdatelstvo","razmetka","kavychki","tire","dvoetochie"], "s:u438",
  "Do not confuse тире (dash) with дефис (hyphen)."),
 ("439-argue3-10","Ellipsis","многоточие, скобка, дефис, перенос and сочетание.",
  ["mnogotochie","skobka","defis","perenos","sochetanie"], "s:u439",
  "Do not confuse скобка (bracket) with кавычки (quotation marks)."),
]

def unit_yaml(fname, title, summary, words, newitem, fence):
    uid = fname.split("-", 1)[1]
    num = fname[:3]
    lex = [w if w.startswith("ru.lex.") else f"ru.lex.argue3.{w}" for w in words]
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
    L.append('goal_id: "ru.goal.b2.argumentation3"')
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
    L.append(f'  expected_interpretations: ["{title}: qualification with taught forms only."]')
    L.append(f'  prohibited_ambiguity: ["{fence}"]')
    L.append('  target_proficiency: "B2"')
    L.append('  validation_method: "choice"')
    return "\n".join(L) + "\n"

for fname, title, summary, words, newitem, fence in U:
    with open(os.path.join(R, "curriculum", "units", fname + ".yaml"), "w") as f:
        f.write(unit_yaml(fname, title, summary, words, newitem, fence))

print("ru batch 41 written")
assert len(WORDS) == 50, len(WORDS)
