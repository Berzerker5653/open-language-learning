#!/usr/bin/env python3
"""ru-RU batch 19: B1 units 210-219 (narrative sequence and outcomes)."""
import json, os

R = "experiments/llm-pack-authoring/candidates/ru-fullkit-v1"
SRC = ["ru-original"]
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-05", "notes": "ai-drafted; needs dictionary sourcing and human review"}

WORDS = [
 ("sperva","сперва","спе́рва","first of all"),
 ("vdrug","вдруг","вдруг","suddenly"),
 ("vskore","вскоре","вско́ре","soon, shortly"),
 ("totchas","тотчас","то́тчас","at once, immediately"),
 ("tem-vremenem","тем временем","тем вре́менем","meanwhile"),
 ("neozhidanno","неожиданно","неожиданно","unexpectedly"),
 ("okazalos","оказалось","оказа́лось","it turned out"),
 ("vyyasnilos","выяснилось","вы́яснилось","it turned out that"),
 ("sluchilos","случилось","случи́лось","it happened"),
 ("proizoshlo","произошло","произошло́","it occurred"),
 ("poluchilos","получилось","получи́лось","it worked out"),
 ("udalos","удалось","удало́сь","managed to"),
 ("vyshlo","вышло","вы́шло","it turned out"),
 ("udacha","удача","уда́ча","luck, success"),
 ("proval","провал","прова́л","failure, flop"),
 ("posledstvie","последствие","после́ствие","consequence"),
 ("final","финал","фина́л","finale, end"),
 ("razvyazka","развязка","развя́зка","denouement, outcome"),
 ("jeffekt","эффект","эффе́кт","effect"),
 ("hod","ход","ход","course, progress"),
 ("dolgo","долго","до́лго","for a long time"),
 ("nedolgo","недолго","не́долго","for a short time"),
 ("togda","тогда","тогда́","then, at that time"),
 ("razu","сразу","сразу́","right away"),
 ("dnyom","днём","днём","during the day"),
 ("vspomnilsya","вспомнился","вспомни́лся","came to mind"),
 ("ranjshe","раньше","ра́ньше","earlier, before"),
 ("pomnitsya","помнится","по́мнится","as I recall"),
 ("detstvo","детство","де́тство","childhood"),
 ("yunost","юность","ю́ность","youth"),
 ("ispugaltsya","испугался","испуга́лся","got scared"),
 ("obradovalsya","обрадовался","обра́довался","got glad"),
 ("rasserdisya","рассердился","рассерди́лся","got angry"),
 ("uspokoilsya","успокоился","успоко́ился","calmed down"),
 ("udivilsya","удивился","удиви́лся","got surprised"),
 ("rasskazal","рассказал","рассказа́л","he told"),
 ("pokazal","показал","показа́л","he showed"),
 ("poyasnil","объяснил","объясни́л","he explained"),
 ("sprosil","спросил","спроси́л","he asked"),
 ("otvetil","ответил","ответи́л","he answered"),
 ("ulica","улица","у́лица","street"),
 ("porog","порог","поро́г","threshold, doorstep"),
 ("kryltso","крыльцо","крыльцо́","porch, entrance steps"),
 ("ugol","угол","у́гол","corner"),
 ("zabor","забор","забо́р","fence"),
 ("konets","конец","ко́нец","end"),
 ("schaste","счастье","сча́стье","happiness"),
 ("nadezhda","надежда","наде́жда","hope"),
 ("mechta","мечта","мечта́","dream"),
 ("budushchee","будущее","бу́дущее","future"),
]

def entry(rid, form, reading, gloss):
    return {"id": f"ru.lex.narration.{rid}", "status": "draft",
            "forms": [{"text": form, "is_primary": True}],
            "readings": [{"text": reading, "script": "cyrillic"}],
            "glosses": {"en-US": [gloss]}, "sources": SRC, "generation": GEN}

with open(os.path.join(R, "lexicon", "narration.jsonl"), "w") as f:
    for rid, form, reading, gloss in WORDS:
        f.write(json.dumps(entry(rid, form, reading, gloss), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ru.grammar.b1.narrative-past", "name": "Past narrative verbs", "category": "syntax",
  "definition": "Narrative uses neuter past verbs: случилось, оказалось, получилось. Learn the supplied forms as given."},
 {"id": "ru.grammar.b1.sequence-connectors", "name": "сперва … потом … в итоге", "category": "syntax",
  "definition": "Narrative sequence links сперва, потом, and в итоге: сперва ждали, потом ушли. Learn the supplied chunks."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("u210","Всё случилось вдруг.","Everything happened suddenly.",["вдруг"]),
 ("u211","Это случилось неожиданно.","It happened unexpectedly.",["неожиданно"]),
 ("u212","Всё получилось.","Everything worked out.",["получилось"]),
 ("u213","Это финал.","This is the end.",["финал"]),
 ("u214","Это было долго.","It was long.",["долго"]),
 ("u215","Это было раньше.","That was earlier.",["раньше"]),
 ("u216","Он обрадовался.","He got glad.",["обрадовался"]),
 ("u217","Он рассказал.","He told the story.",["рассказал"]),
 ("u218","Это улица.","This is the street.",["улица"]),
 ("u219","Это конец.","This is the end.",["конец"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, gloss, cloze in SENTS:
        e = {"id": f"ru.sent.b1.{sid}", "status": "draft", "text": text, "gloss": gloss,
             "cloze_targets": cloze, "sources": SRC, "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

ASSESS = [
 {"id": "ru.assess.b1.narration-reading", "goal_id": "ru.goal.b1.narration",
  "kind": "recognition", "modality": "reading",
  "rubric": {"scale": "observed", "criteria": [
      "Order events in a supplied narrative using сперва, потом, в итоге.",
      "Identify outcome words (получилось, удалось, провал) in a story.",
      "Match a feeling verb (испугался, обрадовался) to its meaning."]},
  "review_status": "draft"},
 {"id": "ru.assess.b1.narration-writing", "goal_id": "ru.goal.b1.narration",
  "kind": "production", "modality": "writing",
  "rubric": {"scale": "observed", "criteria": [
      "Write a three-step sequence with сперва, потом, and в итоге.",
      "State an outcome with the supplied получилось chunk.",
      "Describe a past feeling with one supplied -ся past form."]},
  "review_status": "draft"},
]
with open(os.path.join(R, "assessments", "definitions.jsonl"), "a") as f:
    for a in ASSESS:
        f.write(json.dumps(a, ensure_ascii=False) + "\n")

GOAL_YAML = """  - id: "ru.goal.b1.narration"
    description: "Tell past events in sequence and state outcomes."
    band: "B1"
    modalities: ["reading", "writing"]
    prerequisites:
      - {target: "ru.goal.a2.connected-messages", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.a1.basic-messages", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.on-ramp.everyday", dimension: "recall-meaning", required_state: "independent", strength: "hard"}
    required_concepts: ["ru.grammar.b1.narrative-past", "ru.grammar.b1.sequence-connectors", "ru.grammar.on-ramp.zero-present-copula"]
    assessment_ids: ["ru.assess.b1.narration-reading", "ru.assess.b1.narration-writing"]
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
assert len(WORDS) == 50, len(WORDS)

OLD_GRAM = ["ru.grammar.on-ramp.eto-identification", "ru.grammar.on-ramp.zero-present-copula"]

U = [
 ("210-narration-sequence-01","Sequence","сперва, вдруг, вскоре, тотчас and тем временем.",
  ["sperva","vdrug","vskore","totchas","tem-vremenem"], "s:u210",
  "Do not confuse сперва (first) with вскоре (soon)."),
 ("211-narration-sequence-02","It happened","неожиданно, оказалось, выяснилось, случилось and произошло.",
  ["neozhidanno","okazalos","vyyasnilos","sluchilos","proizoshlo"], "s:u211",
  "Do not confuse случилось (happened) with произошло (occurred)."),
 ("212-narration-sequence-03","Outcomes","получилось, удалось, вышло, удача and провал.",
  ["poluchilos","udalos","vyshlo","udacha","proval"], "s:u212",
  "Do not confuse удача (luck) with провал (failure)."),
 ("213-narration-sequence-04","Consequences","последствие, финал, развязка, эффект and ход.",
  ["posledstvie","final","razvyazka","jeffekt","hod"], "s:u213",
  "Do not confuse финал (finale) with развязка (outcome)."),
 ("214-narration-sequence-05","Time frame","долго, недолго, тогда, сразу and днём.",
  ["dolgo","nedolgo","togda","razu","dnyom"], "s:u214",
  "Do not confuse долго (long) with недолго (short time)."),
 ("215-narration-sequence-06","Remembering","вспомнился, раньше, помнится, детство and юность.",
  ["vspomnilsya","ranjshe","pomnitsya","detstvo","yunost"], "s:u215",
  "Do not confuse детство (childhood) with юность (youth)."),
 ("216-narration-sequence-07","Feelings","испугался, обрадовался, рассердился, успокоился and удивился.",
  ["ispugaltsya","obradovalsya","rasserdisya","uspokoilsya","udivilsya"], "s:u216",
  "Do not confuse испугался (scared) with удивился (surprised)."),
 ("217-narration-sequence-08","Telling","рассказал, показал, объяснил, спросил and ответил.",
  ["rasskazal","pokazal","poyasnil","sprosil","otvetil"], "s:u217",
  "Do not confuse спросил (asked) with ответил (answered)."),
 ("218-narration-sequence-09","Places","улица, порог, крыльцо, угол and забор.",
  ["ulica","porog","kryltso","ugol","zabor"], "s:u218",
  "Do not confuse крыльцо (porch) with порог (threshold)."),
 ("219-narration-sequence-10","Endings","конец, счастье, надежда, мечта and будущее.",
  ["konets","schaste","nadezhda","mechta","budushchee"], "s:u219",
  "Do not confuse надежда (hope) with мечта (dream)."),
]

def unit_yaml(fname, title, summary, words, newitem, fence):
    uid = fname.split("-", 1)[1]
    num = fname[:3]
    lex = [f"ru.lex.narration.{w}" for w in words]
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
    L.append('goal_id: "ru.goal.b1.narration"')
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
    L.append(f'  expected_interpretations: ["{title}: narration with taught forms only."]')
    L.append(f'  prohibited_ambiguity: ["{fence}"]')
    L.append('  target_proficiency: "B1"')
    L.append('  validation_method: "choice"')
    return "\n".join(L) + "\n"

for fname, title, summary, words, newitem, fence in U:
    with open(os.path.join(R, "curriculum", "units", fname + ".yaml"), "w") as f:
        f.write(unit_yaml(fname, title, summary, words, newitem, fence))

print("ru batch 19 written")
