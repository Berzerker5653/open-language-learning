#!/usr/bin/env python3
"""ru-RU batch 12: A2 units 140-149 (symptoms, needs, and appointments)."""
import json, os

R = "experiments/llm-pack-authoring/candidates/ru-fullkit-v1"
SRC = ["ru-original"]
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-05", "notes": "ai-drafted; needs dictionary sourcing and human review"}

WORDS = [
 ("bol","боль","боль","pain"),
 ("bolit","болеть","боле́ть","to hurt, be ill"),
 ("golova2","голова","голова́","head"),
 ("gorlo","горло","го́рло","throat"),
 ("zhivot","живот","живо́т","stomach"),
 ("temperatura","температура","температу́ра","temperature, fever"),
 ("kasel","кашель","ка́шель","cough"),
 ("nasmork","насморк","насмо́рк","runny nose"),
 ("vrach","врач","врач","doctor"),
 ("vrach2","врачиха","врачи́ха","doctor (f)"),
 ("stomatolog","стоматолог","стомато́лог","dentist"),
 ("klinik","клиника","кли́ника","clinic"),
 ("vitaminy","витамины","витами́ны","vitamins"),
 ("lekarstvo","лекарство","ле́карство","medicine"),
 ("tabletki","таблетки","табле́тки","pills"),
 ("priyom","приём","приё́м","appointment, reception"),
 ("zapisat","записывать","за́писывать","to book, record"),
 ("prihod","приход","при́ход","visit, coming"),
 ("ukol","укол","уко́л","injection"),
 ("bant","бинт","бинт","bandage"),
 ("analiz","анализ","ана́лиз","test, analysis"),
 ("sostoyanie","состояние","состоя́ние","condition, state"),
 ("zdorovie","здоровье","здоро́вье","health"),
 ("zdorovyi","здоровый","здоро́вый","healthy"),
 ("travma","травма","тра́вма","injury"),
 ("prostudit","простудить","просту́дить","to catch a cold"),
 ("prostuda","простуда","просту́да","cold"),
 ("travmatolog","травматолог","травмато́лог","traumatologist"),
 ("kabinet","кабинет","кабине́т","office, consulting room"),
 ("kartochka","карточка","ка́рточка","card, chart"),
 ("diagnoz","диагноз","диа́гноз","diagnosis"),
 ("osmotr","осмотр","осмо́тр","examination"),
 ("sovet","советовать","сове́товать","to advise"),
 ("sovet2","совет","сове́т","advice"),
 ("nuzhno","нужно","ну́жно","it is needed"),
 ("nuzhen","нужен","ну́жен","needed (m)"),
 ("pomosh","помощь","по́мощь","help"),
 ("pomogat","помогать","помога́ть","to help"),
 ("chuvstvovat","чувствовать","чу́вствовать","to feel"),
 ("ploho","плохо","пло́хо","bad, unwell"),
 ("horosho2","хорошо","хорошо́","well, fine"),
 ("otdyhat","отдыхать","отдыха́ть","to rest"),
 ("son","сон","сон","sleep"),
 ("spat","спать","спа́ть","to sleep"),
 ("bolnichny","больничный","больни́чный","sick leave"),
 ("uvazhenie","уважение","уваже́ние","respect"),
 ("terpenie","терпение","терпе́ние","patience"),
 ("nervy","нервы","не́рвы","nerves"),
 ("ustalost","усталость","уста́лость","fatigue"),
 ("otdyh","отдых","о́тдых","rest, vacation"),
]
assert len(WORDS) == 50, len(WORDS)

def entry(rid, form, reading, gloss):
    return {"id": f"ru.lex.wellbeing.{rid}", "status": "draft",
            "forms": [{"text": form, "is_primary": True}],
            "readings": [{"text": reading, "script": "cyrillic"}],
            "glosses": {"en-US": [gloss]}, "sources": SRC, "generation": GEN}

with open(os.path.join(R, "lexicon", "wellbeing.jsonl"), "w") as f:
    for rid, form, reading, gloss in WORDS:
        f.write(json.dumps(entry(rid, form, reading, gloss), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ru.grammar.a2.dative-health", "name": "Dative experiencer", "category": "syntax",
  "definition": "Health states use the dative experiencer: у меня болит голова; мне плохо. Learn the supplied dative forms мне, тебе, у меня; do not invent new ones."},
 {"id": "ru.grammar.a2.imperative-advice", "name": "Advice imperatives", "category": "syntax",
  "definition": "Advice uses the polite imperative: Пейте тёплое. Отдыхайте. Learn the supplied imperative forms as given."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("u140","У меня болит голова.","My head hurts.",["голова"]),
 ("u141","Это врач.","This is a doctor.",["врач"]),
 ("u142","Это лекарство.","This is medicine.",["лекарство"]),
 ("u143","Это приём.","This is the appointment.",["приём"]),
 ("u144","Это клиника.","This is the clinic.",["клиника"]),
 ("u145","Это анализ.","This is the test.",["анализ"]),
 ("u146","Это совет.","This is the advice.",["совет"]),
 ("u147","Это помощь.","This is help.",["помощь"]),
 ("u148","Это отдых.","This is rest.",["отдых"]),
 ("u149","Это сон.","This is sleep.",["сон"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, gloss, cloze in SENTS:
        e = {"id": f"ru.sent.a2.{sid}", "status": "draft", "text": text, "gloss": gloss,
             "cloze_targets": cloze, "sources": SRC, "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

ASSESS = [
 {"id": "ru.assess.a2.wellbeing-reading", "goal_id": "ru.goal.a2.wellbeing",
  "kind": "recognition", "modality": "reading",
  "rubric": {"scale": "observed", "criteria": [
      "Identify symptom words (боль, температура, кашель) in a supplied note.",
      "Match a health word to its supplied dative chunk (у меня, мне).",
      "Distinguish an appointment word from a medicine word."]},
  "review_status": "draft"},
 {"id": "ru.assess.a2.wellbeing-writing", "goal_id": "ru.goal.a2.wellbeing",
  "kind": "production", "modality": "writing",
  "rubric": {"scale": "observed", "criteria": [
      "Write a symptom statement with the supplied dative chunk.",
      "Give advice with a supplied imperative form.",
      "State a need with нужно or нужен."]},
  "review_status": "draft"},
]
with open(os.path.join(R, "assessments", "definitions.jsonl"), "a") as f:
    for a in ASSESS:
        f.write(json.dumps(a, ensure_ascii=False) + "\n")

GOAL_YAML = """  - id: "ru.goal.a2.wellbeing"
    description: "Describe symptoms, needs, and medical appointments."
    band: "A2"
    modalities: ["reading", "writing"]
    prerequisites:
      - {target: "ru.goal.a2.services", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.a1.routines", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.on-ramp.everyday", dimension: "recall-meaning", required_state: "independent", strength: "hard"}
    required_concepts: ["ru.grammar.a2.dative-health", "ru.grammar.a2.imperative-advice", "ru.grammar.on-ramp.zero-present-copula"]
    assessment_ids: ["ru.assess.a2.wellbeing-reading", "ru.assess.a2.wellbeing-writing"]
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
 ("140-wellbeing-01","Symptoms","боль, болеть, голова, горло and живот.",
  ["bol","bolit","golova2","gorlo","zhivot"], "s:u140",
  "Do not put the body part in the genitive; the supplied chunk keeps it nominative."),
 ("141-wellbeing-02","Cold","температура, кашель, насморк, простуда and травма.",
  ["temperatura","kasel","nasmork","prostuda","travma"], "s:u141",
  "Do not confuse простуда (cold) with травма (injury)."),
 ("142-wellbeing-03","Doctors","врач, врачиха, стоматолог, травматолог and клиника.",
  ["vrach","vrach2","stomatolog","travmatolog","klinik"], "s:u142",
  "Do not confuse стоматолог with травматолог."),
 ("143-wellbeing-04","Appointments","приём, записывать, приход, кабинет and карточка.",
  ["priyom","zapisat","prihod","kabinet","kartochka"], "s:u143",
  "Do not confuse приём (appointment) with приход (coming)."),
 ("144-wellbeing-05","Medicine","лекарство, таблетки, витамины, укол and бинт.",
  ["lekarstvo","tabletki","vitaminy","ukol","bant"], "s:u144",
  "Do not confuse укол (injection) with бинт (bandage)."),
 ("145-wellbeing-06","Examination","анализ, диагноз, осмотр, состояние and здоровье.",
  ["analiz","diagnoz","osmotr","sostoyanie","zdorovie"], "s:u145",
  "Do not confuse анализ (test) with осмотр (examination)."),
 ("146-wellbeing-07","Advice","советовать, совет, нужно, нужен and помощь.",
  ["sovet","sovet2","nuzhno","nuzhen","pomosh"], "s:u146",
  "Do not decline нужно; it never changes form."),
 ("147-wellbeing-08","Help and feeling","помогать, чувствовать, плохо, хорошо and здоровый.",
  ["pomogat","chuvstvovat","ploho","horosho2","zdorovyi"], "s:u147",
  "Do not confuse плохо (unwell) with хорошо (well)."),
 ("148-wellbeing-09","Rest and sleep","отдыхать, сон, спать, отдых and простудить.",
  ["otdyhat","son","spat","otdyh","prostudit"], "s:u148",
  "Do not confuse отдых (rest) with сон (sleep)."),
 ("149-wellbeing-10","Recovery","больничный, уважение, терпение, нервы and усталость.",
  ["bolnichny","uvazhenie","terpenie","nervy","ustalost"], "s:u149",
  "Do not confuse больничный (sick leave) with отпуск (vacation)."),
]

def unit_yaml(fname, title, summary, words, newitem, fence):
    uid = fname.split("-", 1)[1]
    num = fname[:3]
    lex = [f"ru.lex.wellbeing.{w}" for w in words]
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
    L.append('goal_id: "ru.goal.a2.wellbeing"')
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
    L.append(f'  expected_interpretations: ["{title}: wellbeing with taught forms only."]')
    L.append(f'  prohibited_ambiguity: ["{fence}"]')
    L.append('  target_proficiency: "A2"')
    L.append('  validation_method: "choice"')
    return "\n".join(L) + "\n"

for fname, title, summary, words, newitem, fence in U:
    with open(os.path.join(R, "curriculum", "units", fname + ".yaml"), "w") as f:
        f.write(unit_yaml(fname, title, summary, words, newitem, fence))

print("ru batch 12 written")
