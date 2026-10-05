#!/usr/bin/env python3
"""ru-RU batch 33: B1 units 350-359 (main points and clear explanations)."""
import json, os

R = "experiments/llm-pack-authoring/candidates/ru-fullkit-v1"
SRC = ["ru-original"]
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-05", "notes": "ai-drafted; needs dictionary sourcing and human review"}

WORDS = [
 ("sut2","суть","суть","essence"),
 ("smysl","смысл","смысл","meaning"),
 ("soderzhanie","содержание","содéржание","content"),
 ("annotaciya","аннотация","аннотáция","annotation"),
 ("kratkost","краткость","крáткость","brevity"),
 ("yasnost","ясность","я́сность","clarity"),
 ("ponyatnost","понятность","поня́тность","intelligibility"),
 ("neyasnost","неясность","нея́сность","unclearness"),
 ("struktura","структура","стру́ктура","structure"),
 ("posledovatelnost","последовательность","последовáтельность","sequence"),
 ("vedenie","введение","введéние","introduction"),
 ("razdel","раздел","раздéл","section"),
 ("glava","глава","гла́ва","chapter"),
 ("paragraf","параграф","парагрáф","paragraph"),
 ("slovo","слово","сло́во","word"),
 ("termin","термин","тéрмин","term"),
 ("opredelenie","определение","определéние","definition"),
 ("tolkovanie","толкование","толковáние","interpretation"),
 ("pereskaz","пересказ","перескáз","retelling"),
 ("izlozhenie","изложение","изложéние","exposition"),
 ("vyzhimka","выжимка","вы́жимка","digest"),
 ("obzor","обзор","обзóр","overview"),
 ("doklad","доклад","доклáд","report (talk)"),
 ("prezentaciya","презентация","презентáция","presentation"),
 ("rech2","речь","рéчь","speech"),
 ("vstuplenie","вступление","вступлéние","opening"),
 ("zavershenie","завершение","завершéние","completion"),
 ("akcent","акцент","акцéнт","accent, emphasis"),
 ("udarenie","ударение","удáрение","stress, emphasis"),
 ("zamytsel","замысел","замýсел","design, intent"),
 ("osnova","основа","oснóва","basis"),
 ("sterzhen2","стержень","стéржень","core"),
 ("shtrih","штрих","штрих","stroke, nuance"),
 ("kraska","краска","крáска","paint, color"),
 ("ottenok","оттенок","оттéнок","shade, nuance"),
 ("nyuans","нюанс","нюáнс","nuance"),
 ("kontekst","контекст","контéкст","context"),
 ("podtekst","подтекст","подтéкст","subtext"),
 ("znak","знак","знак","sign"),
 ("simvol","символ","сúмвол","symbol"),
 ("obraz","образ","óбраз","image"),
 ("opisanie","описание","описáние","description"),
 ("harakteristika","характеристика","характерúстика","characteristic"),
 ("biografiya","биография","биогрáфия","biography"),
 ("memuary","мемуары","мемуáры","memoirs"),
 ("dnevnik","дневник","дневни́к","diary"),
 ("zapis2","запись","за́пись","record, entry"),
 ("sushchnost2","сущность","су́щность","essence"),
 ("predmet","предмет","предмéт","subject, object"),
 ("yavlenie","явление","явлéние","phenomenon"),
]

def entry(rid, text, stress, gloss):
    return {"id": f"ru.lex.summary.{rid}", "status": "draft",
            "forms": [{"text": text}], "readings": [{"text": stress}],
            "glosses": {"en-US": [gloss]}, "sources": SRC, "generation": GEN}

with open(os.path.join(R, "lexicon", "summary.jsonl"), "w") as f:
    for rid, text, stress, gloss in WORDS:
        f.write(json.dumps(entry(rid, text, stress, gloss), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ru.grammar.b1.glavnoe-chto", "name": "Главное — это + clause", "category": "syntax",
  "definition": "Main points use главное — это: главное — это смысл. Learn the supplied chunks as given."},
 {"id": "ru.grammar.b1.inymi-slovami", "name": "Иными словами reformulation", "category": "syntax",
  "definition": "Reformulation uses иными словами: иными словами, проще. Learn the supplied chunks as given."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("u350","Это суть.","This is the essence.",["суть"]),
 ("u351","Это смысл.","This is the meaning.",["смысл"]),
 ("u352","Это структура.","This is the structure.",["структура"]),
 ("u353","Это глава.","This is a chapter.",["глава"]),
 ("u354","Это термин.","This is a term.",["термин"]),
 ("u355","Это пересказ.","This is a retelling.",["пересказ"]),
 ("u356","Это доклад.","This is a report.",["доклад"]),
 ("u357","Это контекст.","This is context.",["контекст"]),
 ("u358","Это образ.","This is an image.",["образ"]),
 ("u359","Это дневник.","This is a diary.",["дневник"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, gloss, cloze in SENTS:
        e = {"id": f"ru.sent.b1.{sid}", "status": "draft", "text": text, "gloss": gloss,
             "cloze_targets": cloze, "sources": SRC, "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

ASSESS = [
 {"id": "ru.assess.b1.info-summary-reading", "goal_id": "ru.goal.b1.information-summary",
  "kind": "recognition", "modality": "reading",
  "rubric": {"scale": "observed", "criteria": [
      "Identify the main-point word (суть, смысл) in a supplied note.",
      "Match иными словами chunks to their reformulation.",
      "Distinguish аннотация (annotation) from рецензия (review)."]},
  "review_status": "draft"},
 {"id": "ru.assess.b1.info-summary-writing", "goal_id": "ru.goal.b1.information-summary",
  "kind": "production", "modality": "writing",
  "rubric": {"scale": "observed", "criteria": [
      "State the main point with the supplied главное chunk.",
      "Reformulate with the supplied иными словами chunk.",
      "Summarize with a supplied пересказ or выжимка chunk."]},
  "review_status": "draft"},
]
with open(os.path.join(R, "assessments", "definitions.jsonl"), "a") as f:
    for a in ASSESS:
        f.write(json.dumps(a, ensure_ascii=False) + "\n")

GOAL_YAML = """  - id: "ru.goal.b1.information-summary"
    description: "Give main points and clear explanations in summary form."
    band: "B1"
    modalities: ["reading", "writing"]
    prerequisites:
      - {target: "ru.goal.b1.opinions", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.b1.culture-media", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.on-ramp.everyday", dimension: "recall-meaning", required_state: "independent", strength: "hard"}
    required_concepts: ["ru.grammar.b1.glavnoe-chto", "ru.grammar.b1.inymi-slovami", "ru.grammar.on-ramp.zero-present-copula"]
    assessment_ids: ["ru.assess.b1.info-summary-reading", "ru.assess.b1.info-summary-writing"]
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
 ("350-summary-01","Essence","суть, смысл, содержание, аннотация and краткость.",
  ["sut2","smysl","soderzhanie","annotaciya","kratkost"], "s:u350",
  "Do not confuse суть (essence) with содержание (content)."),
 ("351-summary-02","Clarity","ясность, понятность, неясность, акцент and ударение.",
  ["yasnost","ponyatnost","neyasnost","akcent","udarenie"], "s:u351",
  "Do not confuse ясность (clarity) with неясность (unclearness)."),
 ("352-summary-03","Structure","структура, последовательность, введение, раздел and глава.",
  ["struktura","posledovatelnost","vedenie","razdel","glava"], "s:u352",
  "Do not confuse раздел (section) with глава (chapter)."),
 ("353-summary-04","Chapter","глава, параграф, слово, термин and определение.",
  ["glava","paragraf","slovo","termin","opredelenie"], "s:u353",
  "Do not confuse термин (term) with определение (definition)."),
 ("354-summary-05","Term","термин, толкование, сущность, предмет and явление.",
  ["termin","tolkovanie","sushchnost2","predmet","yavlenie"], "s:u354",
  "Do not confuse толкование (interpretation) with определение (definition)."),
 ("355-summary-06","Retelling","пересказ, изложение, выжимка, обзор and доклад.",
  ["pereskaz","izlozhenie","vyzhimka","obzor","doklad"], "s:u355",
  "Do not confuse пересказ (retelling) with изложение (exposition)."),
 ("356-summary-07","Report","доклад, презентация, речь, вступление and завершение.",
  ["doklad","prezentaciya","rech2","vstuplenie","zavershenie"], "s:u356",
  "Do not confuse вступление (opening) with завершение (completion)."),
 ("357-summary-08","Context","контекст, подтекст, знак, символ and образ.",
  ["kontekst","podtekst","znak","simvol","obraz"], "s:u357",
  "Do not confuse знак (sign) with символ (symbol)."),
 ("358-summary-09","Description","описание, характеристика, штрих, краска and оттенок.",
  ["opisanie","harakteristika","shtrih","kraska","ottenok"], "s:u358",
  "Do not confuse штрих (stroke) with оттенок (shade)."),
 ("359-summary-10","Diary","дневник, запись, биография, мемуары and замысел.",
  ["dnevnik","zapis2","biografiya","memuary","zamytsel"], "s:u359",
  "Do not confuse биография (biography) with мемуары (memoirs)."),
]

def unit_yaml(fname, title, summary, words, newitem, fence):
    uid = fname.split("-", 1)[1]
    num = fname[:3]
    lex = [w if w.startswith("ru.lex.") else f"ru.lex.summary.{w}" for w in words]
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
    L.append('goal_id: "ru.goal.b1.information-summary"')
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
    L.append(f'  expected_interpretations: ["{title}: summary with taught forms only."]')
    L.append(f'  prohibited_ambiguity: ["{fence}"]')
    L.append('  target_proficiency: "B1"')
    L.append('  validation_method: "choice"')
    return "\n".join(L) + "\n"

for fname, title, summary, words, newitem, fence in U:
    with open(os.path.join(R, "curriculum", "units", fname + ".yaml"), "w") as f:
        f.write(unit_yaml(fname, title, summary, words, newitem, fence))

print("ru batch 33 written")
assert len(WORDS) == 50, len(WORDS)
