#!/usr/bin/env python3
"""ru-RU batch 67: B2 units 690-699 (scientific explanation from supplied information)."""
import json, os

R = "experiments/llm-pack-authoring/candidates/ru-fullkit-v1"
SRC = ["ru-original"]
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-05", "notes": "ai-drafted; needs dictionary sourcing and human review"}

WORDS = [
 ("peremennaya","переменная","перемéнная","variable"),
 ("postoyannaya","постоянная","постóянная","constant"),
 ("prichinnyy","причинный","причúнный","causal"),
 ("korrelirovat","коррелировать","коррели́ровать","to correlate"),
 ("korrelyacionnyy","корреляционный","корреляциóнный","correlational"),
 ("ekosistema","экосистема","экосистéма","ecosystem"),
 ("bioraznoobrazie","биоразнообразие","биоразноóбразие","biodiversity"),
 ("poteplenie","потепление","потéпление","warming"),
 ("pohlodanie","похолодание","похолодáние","cooling"),
 ("vybrosy","выбросы","выбрóсы","emissions"),
 ("vozobnovlyaemyy","возобновляемый","возобновлýемый","renewable"),
 ("nevozobnovlyaemyy","невозобновляемый","невозобновлýемый","non-renewable"),
 ("generaciya","генерация","генерáция","generation"),
 ("uglerodnyy","углеродный","углерóдный","carbon (adj.)"),
 ("neytralizaciya","нейтрализация","нейтрализáция","neutralization"),
 ("neytralizovat","нейтрализовать","нейтрализу́ть","to neutralize"),
 ("adaptacionnyy","адаптационный","адаптациóнный","adaptive"),
 ("uyazvimost","уязвимость","уязвúмость","vulnerability"),
 ("nablyudatelnyy","наблюдательный","наблýдательный","observant"),
 ("verifitsirovat","верифицировать","верифицúровать","to verify"),
 ("falsifitsirovat","фальсифицировать","фальсифицúровать","to falsify"),
 ("validnost","валидность","вáлидность","validity"),
 ("validnyy","валидный","вáлидный","valid"),
 ("povtoryaemost","повторяемость","повторя́емость","repeatability"),
 ("vosproizvodimost","воспроизводимость","воспроизвóдимость","reproducibility"),
 ("etalonnyy","эталонный","этáлонный","reference, standard (adj.)"),
 ("zamerit","замерить","замéрить","to measure"),
 ("izmerimyy","измеримый","измéримый","measurable"),
 ("neizmerimyy","неизмеримый","неизмéримый","unmeasurable"),
 ("statisticheskiy","статистический","статúстический","statistical"),
 ("vyborochnyy","выборочный","вúборочный","sample-based"),
 ("mediana","медиана","медиáна","median"),
 ("dispersiya","дисперсия","диспéрсия","variance, dispersion"),
 ("estestvoznanie","естествознание","естествознáние","natural science"),
 ("issledovatelskiy","исследовательский","исследовáтельский","research (adj.)"),
 ("laboratornyy","лабораторный","лаборатóрный","laboratory (adj.)"),
 ("apparatura","аппаратура","аппаратýра","apparatus, equipment"),
 ("eksperimentalnyy","экспериментальный","экспериментáльный","experimental"),
 ("eksperimentirovat","экспериментировать","экспериментúровать","to experiment"),
 ("datchik","датчик","дáтчик","sensor, detector"),
 ("sensor","сенсор","сéнсор","sensor"),
 ("graduirovka","градуировка","градуирóвка","graduation, scaling"),
 ("kalibrovka","калибровка","калибрóвка","calibration"),
 ("kalibrovat","калибровать","калибрúровать","to calibrate"),
 ("udelnyy","удельный","удéльный","specific (per unit)"),
 ("zagryznitel","загрязнитель","загрязнúтель","pollutant"),
 ("stochnyy","сточный","стóчный","sewage, effluent (adj.)"),
 ("filtraciya","фильтрация","фильтра́ция","filtration"),
 ("ochistnoy","очистной","очистнóй","purification (adj.)"),
 ("sbros","сброс","сбрóс","discharge"),
]

def entry(rid, text, stress, gloss):
    return {"id": f"ru.lex.sci.{rid}", "status": "draft",
            "forms": [{"text": text}], "readings": [{"text": stress}],
            "glosses": {"en-US": [gloss]}, "sources": SRC, "generation": GEN}

with open(os.path.join(R, "lexicon", "sci.jsonl"), "w") as f:
    for rid, text, stress, gloss in WORDS:
        f.write(json.dumps(entry(rid, text, stress, gloss), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ru.grammar.b2-sledovatelno-vyvod", "name": "Следовательно, вывод", "category": "syntax",
  "definition": "Scientific conclusions use следовательно: следовательно, гипотеза верна. Learn the supplied chunks as given."},
 {"id": "ru.grammar.b2-zavisit-ot", "name": "Зависит от + gen", "category": "syntax",
  "definition": "Dependence uses зависит от: зависит от температуры. Learn the supplied chunks as given."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("u690","Это переменная.","This is a variable.",["переменная"]),
 ("u691","Это валидность.","This is validity.",["валидность"]),
 ("u692","Это калибровка.","This is calibration.",["калибровка"]),
 ("u693","Это медиана.","This is a median.",["медиана"]),
 ("u694","Это аппаратура.","This is apparatus.",["аппаратура"]),
 ("u695","Это датчик.","This is a sensor.",["датчик"]),
 ("u696","Это экосистема.","This is an ecosystem.",["экосистема"]),
 ("u697","Это потепление.","This is warming.",["потепление"]),
 ("u698","Это выбросы.","These are emissions.",["выбросы"]),
 ("u699","Это фильтрация.","This is filtration.",["фильтрация"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, gloss, cloze in SENTS:
        e = {"id": f"ru.sent.b2.{sid}", "status": "draft", "text": text, "gloss": gloss,
             "cloze_targets": cloze, "sources": SRC, "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

ASSESS = [
 {"id": "ru.assess.b2.science-environment-reading", "goal_id": "ru.goal.b2.science-environment",
  "kind": "recognition", "modality": "reading",
  "rubric": {"scale": "observed", "criteria": [
      "Identify method words (калибровка, выборочный) in a supplied report.",
      "Match зависит от chunks to their dependence.",
      "Distinguish renewable (возобновляемый) from non-renewable (невозобновляемый)."]},
  "review_status": "draft"},
 {"id": "ru.assess.b2.science-environment-writing", "goal_id": "ru.goal.b2.science-environment",
  "kind": "production", "modality": "writing",
  "rubric": {"scale": "observed", "criteria": [
      "State a conclusion with the supplied следовательно chunk.",
      "Express dependence with the supplied зависит от chunk.",
      "Use taught forms only."]},
  "review_status": "draft"},
]
with open(os.path.join(R, "assessments", "definitions.jsonl"), "a") as f:
    for a in ASSESS:
        f.write(json.dumps(a, ensure_ascii=False) + "\n")

GOAL_YAML = """  - id: "ru.goal.b2.science-environment"
    description: "Explain scientific and environmental matters from supplied information."
    band: "B2"
    modalities: ["reading", "writing"]
    prerequisites:
      - {target: "ru.goal.b1.learning-work", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.a2.services", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.on-ramp.everyday", dimension: "recall-meaning", required_state: "independent", strength: "hard"}
    required_concepts: ["ru.grammar.b2-sledovatelno-vyvod", "ru.grammar.b2-zavisit-ot", "ru.grammar.on-ramp.zero-present-copula"]
    assessment_ids: ["ru.assess.b2.science-environment-reading", "ru.assess.b2.science-environment-writing"]
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
 ("690-sci-01","Variables","переменная, постоянная, причинный, коррелировать and корреляционный.",
  ["peremennaya","postoyannaya","prichinnyy","korrelirovat","korrelyacionnyy"], "s:u690",
  "Do not confuse причинный (causal) with корреляционный (correlational)."),
 ("691-sci-02","Verification","верифицировать, фальсифицировать, валидность, валидный and повторяемость.",
  ["verifitsirovat","falsifitsirovat","validnost","validnyy","povtoryaemost"], "s:u691",
  "Do not confuse верифицировать (to verify) with фальсифицировать (to falsify)."),
 ("692-sci-03","Reproducibility","воспроизводимость, эталонный, замерить, измеримый and неизмеримый.",
  ["vosproizvodimost","etalonnyy","zamerit","izmerimyy","neizmerimyy"], "s:u692",
  "Do not confuse измеримый (measurable) with неизмеримый (unmeasurable)."),
 ("693-sci-04","Statistics","статистический, выборочный, медиана, дисперсия and естествознание.",
  ["statisticheskiy","vyborochnyy","mediana","dispersiya","estestvoznanie"], "s:u693",
  "Do not confuse медиана (median) with среднее (average)."),
 ("694-sci-05","Lab","исследовательский, лабораторный, аппаратура, экспериментальный and экспериментировать.",
  ["issledovatelskiy","laboratornyy","apparatura","eksperimentalnyy","eksperimentirovat"], "s:u694",
  "Do not confuse аппаратура (apparatus) with прибор (instrument)."),
 ("695-sci-06","Sensors","датчик, сенсор, градуировка, калибровка and калибровать.",
  ["datchik","sensor","graduirovka","kalibrovka","kalibrovat"], "s:u695",
  "Do not confuse градуировка (scaling) with калибровка (calibration)."),
 ("696-sci-07","Ecosystem","экосистема, биоразнообразие, углеродный, нейтрализация and нейтрализовать.",
  ["ekosistema","bioraznoobrazie","uglerodnyy","neytralizaciya","neytralizovat"], "s:u696",
  "Do not confuse нейтрализация (neutralization) with очистка (purification)."),
 ("697-sci-08","Climate","потепление, похолодание, выбросы, сброс and загрязнитель.",
  ["poteplenie","pohlodanie","vybrosy","sbros","zagryznitel"], "s:u697",
  "Do not confuse выбросы (emissions) with сброс (discharge)."),
 ("698-sci-09","Energy","возобновляемый, невозобновляемый, генерация, удельный and очистной.",
  ["vozobnovlyaemyy","nevozobnovlyaemyy","generaciya","udelnyy","ochistnoy"], "s:u698",
  "Do not confuse возобновляемый (renewable) with невозобновляемый (non-renewable)."),
 ("699-sci-10","Adaptation","адаптационный, уязвимость, наблюдательный, сточный and фильтрация.",
  ["adaptacionnyy","uyazvimost","nablyudatelnyy","stochnyy","filtraciya"], "s:u699",
  "Do not confuse фильтрация (filtration) with очистка (purification)."),
]

def unit_yaml(fname, title, summary, words, newitem, fence):
    uid = fname.split("-", 1)[1]
    num = fname[:3]
    lex = [w if w.startswith("ru.lex.") else f"ru.lex.sci.{w}" for w in words]
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
    L.append('goal_id: "ru.goal.b2.science-environment"')
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
    L.append(f'  expected_interpretations: ["{title}: science report with taught forms only."]')
    L.append(f'  prohibited_ambiguity: ["{fence}"]')
    L.append('  target_proficiency: "B2"')
    L.append('  validation_method: "choice"')
    return "\n".join(L) + "\n"

for fname, title, summary, words, newitem, fence in U:
    with open(os.path.join(R, "curriculum", "units", fname + ".yaml"), "w") as f:
        f.write(unit_yaml(fname, title, summary, words, newitem, fence))

print("ru batch 67 written")
assert len(WORDS) == 50, len(WORDS)
