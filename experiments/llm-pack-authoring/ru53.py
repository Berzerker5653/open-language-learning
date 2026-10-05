#!/usr/bin/env python3
"""ru-RU batch 53: B2 units 550-559 (methods, procedures, and limitations)."""
import json, os

R = "experiments/llm-pack-authoring/candidates/ru-fullkit-v1"
SRC = ["ru-original"]
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-05", "notes": "ai-drafted; needs dictionary sourcing and human review"}

WORDS = [
 ("stadiya","стадия","стáдия","stage"),
 ("algoritm","алгоритм","алгорúтм","algorithm"),
 ("retsept","рецепт","рецéпт","recipe"),
 ("ukazanie","указание","указáние","instruction, directive"),
 ("predpisanie","предписание","предписáние","order, prescription"),
 ("ogranichenie","ограничение","ограничéние","limitation, restriction"),
 ("limit","лимит","лúмит","limit"),
 ("kvota","квота","квóта","quota"),
 ("barer","барьер","барьéр","barrier"),
 ("slozhnost","сложность","слóжность","complexity"),
 ("prostota","простота","простóта","simplicity"),
 ("elementarnyy","элементарный","элемéнтарный","elementary"),
 ("primativnyy","примитивный","примитúвный","primitive"),
 ("slozhnyy","сложный","слóжный","complex, difficult"),
 ("prostoy","простой","простóй","simple"),
 ("dostupnyy","доступный","достýпный","accessible"),
 ("nedostupnyy","недоступный","недостýпный","inaccessible"),
 ("dostup","доступ","достýп","access"),
 ("zakrytyy","закрытый","зáкрытый","closed"),
 ("otkrytyy","открытый","óткрытый","open"),
 ("publichnyy","публичный","пýбличный","public"),
 ("chastnyy","частный","чáстный","private, particular"),
 ("sekretntyy","секретный","секрéтный","secret"),
 ("tayna","тайна","тáйна","secret, mystery"),
 ("yavnyy","явный","ýвный","explicit, manifest"),
 ("skrytyy","скрытый","скрýтый","hidden"),
 ("ochevidnyy","очевидный","очéвидный","obvious"),
 ("neochevidnyy","неочевидный","неочéвидный","non-obvious"),
 ("ponytnyy","понятный","понýтный","understandable"),
 ("neponytnyy","непонятный","непонýтный","incomprehensible"),
 ("yasnyy","ясный","ýсный","clear"),
 ("rasplyvchatyy","расплывчатый","расплýвчатый","vague"),
 ("chetkiy","чёткий","чéткий","clear-cut"),
 ("tochnyy","точный","тóчный","accurate"),
 ("priblizitelnyy","приблизительный","приблизúтельный","approximate"),
 ("otsenochnyy","оценочный","óценочный","evaluative, rough"),
 ("predvaritelnyy","предварительный","предварúтельный","preliminary"),
 ("okonchatelnyy","окончательный","окончáтельный","final"),
 ("itogovyy","итоговый","итóговый","final, summary"),
 ("chernovoy","черновой","черновóй","draft (adj)"),
 ("chistovoy","чистовой","чистовóй","final (clean copy)"),
 ("rabochiy","рабочий","рабóчий","working (adj)"),
 ("sluzhebnyy","служебный","служéбный","official, service (adj)"),
 ("osnovnoy","основной","основнóй","main, basic"),
 ("vspomagatelnyy","вспомогательный","вспомогáтельный","auxiliary"),
 ("dopolnitelnyy","дополнительный","дополнúтельный","additional"),
 ("glavnyy","главный","глáвный","main, chief"),
 ("rukovodstvo","руководство","руководство","guide, leadership"),
 ("nastavlenie","наставление","наставление","admonition, instruction"),
 ("vektor","вектор","вéктор","vector"),
]

def entry(rid, text, stress, gloss):
    return {"id": f"ru.lex.study3.{rid}", "status": "draft",
            "forms": [{"text": text}], "readings": [{"text": stress}],
            "glosses": {"en-US": [gloss]}, "sources": SRC, "generation": GEN}

with open(os.path.join(R, "lexicon", "study3.jsonl"), "w") as f:
    for rid, text, stress, gloss in WORDS:
        f.write(json.dumps(entry(rid, text, stress, gloss), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ru.grammar.b2-chem-bolshe", "name": "Чем … тем … correlation", "category": "syntax",
  "definition": "Correlation uses чем … тем: чем больше данных, тем точнее вывод. Learn the supplied chunks as given."},
 {"id": "ru.grammar.b2-nesmotrya-na", "name": "Несмотря на concession", "category": "syntax",
  "definition": "Concession uses несмотря на: несмотря на ограничения. Learn the supplied chunks as given."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("u550","Это стадия.","This is a stage.",["стадия"]),
 ("u551","Это алгоритм.","This is an algorithm.",["алгоритм"]),
 ("u552","Это рецепт.","This is a recipe.",["рецепт"]),
 ("u553","Это указание.","This is an instruction.",["указание"]),
 ("u554","Это ограничение.","This is a limitation.",["ограничение"]),
 ("u555","Это лимит.","This is a limit.",["лимит"]),
 ("u556","Это барьер.","This is a barrier.",["барьер"]),
 ("u557","Это доступ.","This is access.",["доступ"]),
 ("u558","Это тайна.","This is a secret.",["тайна"]),
 ("u559","Это вектор.","This is a vector.",["вектор"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, gloss, cloze in SENTS:
        e = {"id": f"ru.sent.b2.{sid}", "status": "draft", "text": text, "gloss": gloss,
             "cloze_targets": cloze, "sources": SRC, "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

ASSESS = [
 {"id": "ru.assess.b2.academic-study-reading3", "goal_id": "ru.goal.b2.academic-study3",
  "kind": "recognition", "modality": "reading",
  "rubric": {"scale": "observed", "criteria": [
      "Identify method words (алгоритм, стадия) in a supplied procedure.",
      "Match чем … тем chunks to their correlation.",
      "Distinguish предварительный (preliminary) from окончательный (final)."]},
  "review_status": "draft"},
 {"id": "ru.assess.b2.academic-study-writing3", "goal_id": "ru.goal.b2.academic-study3",
  "kind": "production", "modality": "writing",
  "rubric": {"scale": "observed", "criteria": [
      "Correlate with the supplied чем … тем chunk.",
      "Concede with the supplied несмотря на chunk.",
      "Qualify with a supplied ограничение or приблизительный chunk."]},
  "review_status": "draft"},
]
with open(os.path.join(R, "assessments", "definitions.jsonl"), "a") as f:
    for a in ASSESS:
        f.write(json.dumps(a, ensure_ascii=False) + "\n")

GOAL_YAML = """  - id: "ru.goal.b2.academic-study3"
    description: "Describe methods, procedures, and limitations."
    band: "B2"
    modalities: ["reading", "writing"]
    prerequisites:
      - {target: "ru.goal.b2.academic-study2", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.a2.instructions", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.on-ramp.everyday", dimension: "recall-meaning", required_state: "independent", strength: "hard"}
    required_concepts: ["ru.grammar.b2-chem-bolshe", "ru.grammar.b2-nesmotrya-na", "ru.grammar.on-ramp.zero-present-copula"]
    assessment_ids: ["ru.assess.b2.academic-study-reading3", "ru.assess.b2.academic-study-writing3"]
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
 ("550-study3-01","Stage","стадия, алгоритм, рецепт, указание and предписание.",
  ["stadiya","algoritm","retsept","ukazanie","predpisanie"], "s:u550",
  "Do not confuse указание (instruction) with предписание (order)."),
 ("551-study3-02","Limitation","ограничение, лимит, квота, барьер and стадия.",
  ["ogranichenie","limit","kvota","barer","stadiya"], "s:u551",
  "Do not confuse лимит (limit) with квота (quota)."),
 ("552-study3-03","Complexity","сложность, простота, элементарный, примитивный and сложный.",
  ["slozhnost","prostota","elementarnyy","primativnyy","slozhnyy"], "s:u552",
  "Do not confuse элементарный (elementary) with примитивный (primitive)."),
 ("553-study3-04","Simple","простой, доступный, недоступный, доступ and закрытый.",
  ["prostoy","dostupnyy","nedostupnyy","dostup","zakrytyy"], "s:u553",
  "Do not confuse доступный (accessible) with недоступный (inaccessible)."),
 ("554-study3-05","Open","открытый, публичный, частный, секретный and тайна.",
  ["otkrytyy","publichnyy","chastnyy","sekretntyy","tayna"], "s:u554",
  "Do not confuse публичный (public) with частный (private)."),
 ("555-study3-06","Explicit","явный, скрытый, очевидный, неочевидный and понятный.",
  ["yavnyy","skrytyy","ochevidnyy","neochevidnyy","ponytnyy"], "s:u555",
  "Do not confuse явный (explicit) with скрытый (hidden)."),
 ("556-study3-07","Clear","непонятный, ясный, расплывчатый, чёткий and точный.",
  ["neponytnyy","yasnyy","rasplyvchatyy","chetkiy","tochnyy"], "s:u556",
  "Do not confuse расплывчатый (vague) with чёткий (clear-cut)."),
 ("557-study3-08","Approximate","приблизительный, оценочный, предварительный, окончательный and итоговый.",
  ["priblizitelnyy","otsenochnyy","predvaritelnyy","okonchatelnyy","itogovyy"], "s:u557",
  "Do not confuse предварительный (preliminary) with окончательный (final)."),
 ("558-study3-09","Draft","черновой, чистовой, рабочий, служебный and основной.",
  ["chernovoy","chistovoy","rabochiy","sluzhebnyy","osnovnoy"], "s:u558",
  "Do not confuse черновой (draft) with чистовой (clean copy)."),
 ("559-study3-10","Auxiliary","вспомогательный, дополнительный, главный, руководство and вектор.",
  ["vspomagatelnyy","dopolnitelnyy","glavnyy","rukovodstvo","vektor"], "s:u559",
  "Do not confuse вспомогательный (auxiliary) with дополнительный (additional)."),
]

def unit_yaml(fname, title, summary, words, newitem, fence):
    uid = fname.split("-", 1)[1]
    num = fname[:3]
    lex = [w if w.startswith("ru.lex.") else f"ru.lex.study3.{w}" for w in words]
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
    L.append('goal_id: "ru.goal.b2.academic-study3"')
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
    L.append(f'  expected_interpretations: ["{title}: method with taught forms only."]')
    L.append(f'  prohibited_ambiguity: ["{fence}"]')
    L.append('  target_proficiency: "B2"')
    L.append('  validation_method: "choice"')
    return "\n".join(L) + "\n"

for fname, title, summary, words, newitem, fence in U:
    with open(os.path.join(R, "curriculum", "units", fname + ".yaml"), "w") as f:
        f.write(unit_yaml(fname, title, summary, words, newitem, fence))

print("ru batch 53 written")
assert len(WORDS) == 50, len(WORDS)
