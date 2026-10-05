#!/usr/bin/env python3
"""ru-RU batch 35: B1 units 370-379 (plans, possibilities, consequences)."""
import json, os

R = "experiments/llm-pack-authoring/candidates/ru-fullkit-v1"
SRC = ["ru-original"]
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-05", "notes": "ai-drafted; needs dictionary sourcing and human review"}

WORDS = [
 ("obstoyatelstvo","обстоятельство","обстоя́тельство","circumstance"),
 ("ishod","исход","исхо́д","outcome"),
 ("veroyatnost","вероятность","вероя́тность","probability"),
 ("prognoz","прогноз","прогно́з","forecast"),
 ("poslezavtra","послезавтра","после́завтра","the day after tomorrow"),
 ("nemedlenno","немедленно","неме́дленно","immediately"),
 ("pozhe","позже","по́зже","later"),
 ("inache","иначе","иначе́","otherwise"),
 ("povliyaet","повлияет","повли́яет","will affect"),
 ("zapret","запрет","запре́т","prohibition"),
 ("nakazanie","наказание","наказа́ние","punishment"),
 ("poterya","потеря","поте́ря","loss"),
 ("sledstvie","следствие","следст́вие","consequence"),
 ("deystvie","действие","де́йствие","action"),
 ("izmenitsya","изменится","изме́нится","will change"),
 ("uluchshitsya","улучшится","улу́чшится","will improve"),
 ("ukhudshitsya","ухудшится","уху́дшится","will worsen"),
 ("udastsya","удастся","уда́стся","will succeed"),
 ("poluchitsya","получится","полу́чится","will work out"),
 ("sluchitsya","случится","слу́чится","will happen"),
 ("zavisit","зависит","за́висит","depends"),
 ("prepyatstvie","препятствие","препя́тствие","obstacle"),
 ("pomexa","помеха","поме́ха","interference"),
 ("pomozhet","поможет","по́может","will help"),
 ("pomeshaet","помешает","поме́шает","will hinder"),
 ("soglashenie","соглашение","соглаше́ние","agreement"),
 ("bespokoystvo","беспокойство","беспоко́йство","anxiety"),
 ("obman","обман","обма́н","deception"),
 ("svedeniya","сведения","сведе́ния","information"),
 ("sobiraetsya","собирается","собира́ется","intends to"),
 ("predvidet","предвидеть","предви́деть","to foresee"),
 ("predpolagat","предполагать","предпола́гать","to assume"),
 ("dopuskat","допускать","допуска́ет","to admit"),
 ("dobivatsya","добиваться","добива́ться","to achieve"),
 ("prepyatstvovat","препятствовать","препя́тствовать","to hinder"),
 ("pregrada","преграда","прегра́да","barrier"),
 ("zatrudnenie","затруднение","затрудне́ние","difficulty"),
 ("byudzhet","бюджет","бюдже́т","budget"),
 ("smeta","смета","сме́та","estimate"),
 ("reshimost","решимость","реши́мость","determination"),
 ("neterpenie","нетерпение","нетерпе́ние","impatience"),
 ("opasenie","опасение","опасе́ние","apprehension"),
 ("opasnost","опасность","опа́сность","danger"),
 ("ugroza","угроза","угро́за","threat"),
 ("rasplata","расплата","распла́та","retribution"),
 ("dolya","доля","до́ля","share"),
 ("celoe","целое","цело́е","whole"),
 ("predskazanie","предсказание","предсказа́ние","prediction"),
 ("predvidenie","предвидение","предви́дение","foresight"),
 ("stanet","станет","ста́нет","will become"),
]

def entry(rid, text, stress, gloss):
    return {"id": f"ru.lex.future.{rid}", "status": "draft",
            "forms": [{"text": text}], "readings": [{"text": stress}],
            "glosses": {"en-US": [gloss]}, "sources": SRC, "generation": GEN}

with open(os.path.join(R, "lexicon", "future.jsonl"), "w") as f:
    for rid, text, stress, gloss in WORDS:
        f.write(json.dumps(entry(rid, text, stress, gloss), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ru.grammar.b1.esli-togda", "name": "Если … тогда sequence", "category": "syntax",
  "definition": "Conditions use если … тогда: если завтра, тогда позже. Learn the supplied chunks as given."},
 {"id": "ru.grammar.b1.mozhet-byt", "name": "Может быть possibility", "category": "syntax",
  "definition": "Possibility uses может быть: может быть, получится. Learn the supplied chunks as given."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("u370","Это обстоятельство.","This is a circumstance.",["обстоятельство"]),
 ("u371","Это исход.","This is the outcome.",["исход"]),
 ("u372","Это вероятность.","This is a probability.",["вероятность"]),
 ("u373","Это прогноз.","This is a forecast.",["прогноз"]),
 ("u374","Это запрет.","This is a prohibition.",["запрет"]),
 ("u375","Это потеря.","This is a loss.",["потеря"]),
 ("u376","Это следствие.","This is a consequence.",["следствие"]),
 ("u377","Это препятствие.","This is an obstacle.",["препятствие"]),
 ("u378","Это угроза.","This is a threat.",["угроза"]),
 ("u379","Это доля.","This is a share.",["доля"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, gloss, cloze in SENTS:
        e = {"id": f"ru.sent.b1.{sid}", "status": "draft", "text": text, "gloss": gloss,
             "cloze_targets": cloze, "sources": SRC, "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

ASSESS = [
 {"id": "ru.assess.b1.future-conditions-reading", "goal_id": "ru.goal.b1.future-conditions",
  "kind": "recognition", "modality": "reading",
  "rubric": {"scale": "observed", "criteria": [
      "Identify consequence words (следствие, исход) in a supplied note.",
      "Match если … тогда chunks to their sequence.",
      "Distinguish запрет (prohibition) from разрешение (permission)."]},
  "review_status": "draft"},
 {"id": "ru.assess.b1.future-conditions-writing", "goal_id": "ru.goal.b1.future-conditions",
  "kind": "production", "modality": "writing",
  "rubric": {"scale": "observed", "criteria": [
      "State a condition with the supplied если … тогда chunk.",
      "Express possibility with the supplied может быть chunk.",
      "Predict with a supplied удастся or получится chunk."]},
  "review_status": "draft"},
]
with open(os.path.join(R, "assessments", "definitions.jsonl"), "a") as f:
    for a in ASSESS:
        f.write(json.dumps(a, ensure_ascii=False) + "\n")

GOAL_YAML = """  - id: "ru.goal.b1.future-conditions"
    description: "Talk about plans, possibilities, and consequences."
    band: "B1"
    modalities: ["reading", "writing"]
    prerequisites:
      - {target: "ru.goal.b1.information-summary2", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.a2.problems-solutions", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.on-ramp.everyday", dimension: "recall-meaning", required_state: "independent", strength: "hard"}
    required_concepts: ["ru.grammar.b1.esli-togda", "ru.grammar.b1.mozhet-byt", "ru.grammar.on-ramp.zero-present-copula"]
    assessment_ids: ["ru.assess.b1.future-conditions-reading", "ru.assess.b1.future-conditions-writing"]
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
 ("370-future-01","Circumstance","обстоятельство, исход, вероятность, прогноз and доля.",
  ["obstoyatelstvo","ishod","veroyatnost","prognoz","dolya"], "s:u370",
  "Do not confuse исход (outcome) with следствие (consequence)."),
 ("371-future-02","Later","послезавтра, немедленно, позже, иначе and станет.",
  ["poslezavtra","nemedlenno","pozhe","inache","stanet"], "s:u371",
  "Do not confuse немедленно (immediately) with позже (later)."),
 ("372-future-03","Affect","повлияет, зависит, изменится, улучшится and ухудшится.",
  ["povliyaet","zavisit","izmenitsya","uluchshitsya","ukhudshitsya"], "s:u372",
  "Do not confuse улучшится (will improve) with ухудшится (will worsen)."),
 ("373-future-04","Succeed","удастся, получится, случится, собирается and станет.",
  ["udastsya","poluchitsya","sluchitsya","sobiraetsya","stanet"], "s:u373",
  "Do not confuse удастся (will succeed) with получится (will work out)."),
 ("374-future-05","Prohibition","запрет, наказание, расплата, потеря and следствие.",
  ["zapret","nakazanie","rasplata","poterya","sledstvie"], "s:u374",
  "Do not confuse наказание (punishment) with расплата (retribution)."),
 ("375-future-06","Action","действие, соглашение, препятствие, помеха and преграда.",
  ["deystvie","soglashenie","prepyatstvie","pomexa","pregrada"], "s:u375",
  "Do not confuse препятствие (obstacle) with преграда (barrier)."),
 ("376-future-07","Help","поможет, помешает, повлияет, препятствовать and затруднение.",
  ["pomozhet","pomeshaet","povliyaet","prepyatstvovat","zatrudnenie"], "s:u376",
  "Do not confuse поможет (will help) with помешает (will hinder)."),
 ("377-future-08","Assume","предполагать, допускать, предвидеть, сведения and прогноз.",
  ["predpolagat","dopuskat","predvidet","svedeniya","prognoz"], "s:u377",
  "Do not confuse предполагать (to assume) with допускать (to admit)."),
 ("378-future-09","Budget","бюджет, смета, доля, целое and добиваться.",
  ["byudzhet","smeta","dolya","celoe","dobivatsya"], "s:u378",
  "Do not confuse смета (estimate) with бюджет (budget)."),
 ("379-future-10","Danger","опасность, угроза, опасение, беспокойство and решимость.",
  ["opasnost","ugroza","opasenie","bespokoystvo","reshimost"], "s:u379",
  "Do not confuse опасение (apprehension) with беспокойство (anxiety)."),
]

def unit_yaml(fname, title, summary, words, newitem, fence):
    uid = fname.split("-", 1)[1]
    num = fname[:3]
    lex = [w if w.startswith("ru.lex.") else f"ru.lex.future.{w}" for w in words]
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
    L.append('goal_id: "ru.goal.b1.future-conditions"')
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
    L.append(f'  expected_interpretations: ["{title}: future/conditions with taught forms only."]')
    L.append(f'  prohibited_ambiguity: ["{fence}"]')
    L.append('  target_proficiency: "B1"')
    L.append('  validation_method: "choice"')
    return "\n".join(L) + "\n"

for fname, title, summary, words, newitem, fence in U:
    with open(os.path.join(R, "curriculum", "units", fname + ".yaml"), "w") as f:
        f.write(unit_yaml(fname, title, summary, words, newitem, fence))

print("ru batch 35 written")
assert len(WORDS) == 50, len(WORDS)
