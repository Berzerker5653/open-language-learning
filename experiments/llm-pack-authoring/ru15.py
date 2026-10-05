#!/usr/bin/env python3
"""ru-RU batch 15: A2 units 170-179 (comparisons and simple reasons)."""
import json, os

R = "experiments/llm-pack-authoring/candidates/ru-fullkit-v1"
SRC = ["ru-original"]
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-05", "notes": "ai-drafted; needs dictionary sourcing and human review"}

WORDS = [
 ("bolshe","больше","бо́льше","more, bigger"),
 ("menshe","меньше","ме́ньше","less, smaller"),
 ("chem","чем","чем","than"),
 ("sravnenie","сравнение","сравне́ние","comparison"),
 ("raznica","разница","ра́зница","difference"),
 ("lushche","лучше","лу́чше","better"),
 ("huzhe","хуже","ху́же","worse"),
 ("otlichnyi","отличный","о́тличный","excellent, great"),
 ("plohoi","плохой","плохо́й","bad"),
 ("klassnyi","классный","кла́ссный","cool, great"),
 ("bystree","быстрее","быстре́е","faster"),
 ("medlennee","медленнее","медле́ннее","slower"),
 ("bystro","быстро","бы́стро","quickly"),
 ("medlenno","медленно","медле́нно","slowly"),
 ("gonki","гонки","го́нки","race, racing"),
 ("dlinnee","длиннее","длинне́е","longer"),
 ("korotche","короче","короче́","shorter"),
 ("shire","шире","шире́","wider"),
 ("uzhe","уже","у́же","narrower; already"),
 ("vyshe","выше","вы́ше","higher"),
 ("trudnee","труднее","трудне́е","harder"),
 ("proshche","проще","про́ще","easier"),
 ("slozhnee","сложнее","сложне́е","more complicated"),
 ("legche","легче","ле́гче","easier, lighter"),
 ("tyazhelee","тяжелее","тяжелее́","heavier, harder"),
 ("dorozhe","дороже","доро́же","more expensive"),
 ("deshevle","дешевле","деше́вле","cheaper"),
 ("vazhnee","важнее","важне́е","more important"),
 ("poleznee","полезнее","поле́знее","healthier, more useful"),
 ("interesnee","интереснее","интересне́е","more interesting"),
 ("vkusnee","вкуснее","вкусне́е","tastier"),
 ("zdorovee","здоровее","здорове́е","healthier"),
 ("slashche","слаще","слаще́","sweeter"),
 ("svezhee","свежее","свеже́е","fresher"),
 ("myagche","мягче","мя́гче","softer"),
 ("schastlivee","счастливее","счастли́вее","happier"),
 ("spokoinee","спокойнее","спокойне́е","calmer"),
 ("veselee","веселее","веселе́е","more fun"),
 ("grustnee","грустнее","грустне́е","sadder"),
 ("trevozhnee","тревожнее","трево́жнее","more anxious"),
 ("potomu-cto","потому что","потому́ что","because"),
 ("tak-kak","так как","та́к как","since, because"),
 ("pojetomu","поэтому","поэ́тому","therefore, that's why"),
 ("prichina","причина","причи́на","reason, cause"),
 ("zachem","зачем","заче́м","what for, why"),
 ("chtoby","чтобы","что́бы","in order to, so that"),
 ("yesli","если","е́сли","if"),
 ("blagodarya","благодаря","благодаря́","thanks to"),
 ("iz-za","из-за","из-за́","because of, due to"),
 ("sravnit","сравнить","сравни́ть","to compare"),
]

def entry(rid, form, reading, gloss):
    return {"id": f"ru.lex.comparisons.{rid}", "status": "draft",
            "forms": [{"text": form, "is_primary": True}],
            "readings": [{"text": reading, "script": "cyrillic"}],
            "glosses": {"en-US": [gloss]}, "sources": SRC, "generation": GEN}

with open(os.path.join(R, "lexicon", "comparisons.jsonl"), "w") as f:
    for rid, form, reading, gloss in WORDS:
        f.write(json.dumps(entry(rid, form, reading, gloss), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ru.grammar.a2.comparative-short", "name": "Comparatives with чем", "category": "syntax",
  "definition": "Comparatives like больше, меньше, лучше, хуже link with чем: кофе больше, чем чай. Learn the supplied forms as given."},
 {"id": "ru.grammar.a2.potomu-chto", "name": "Потому что + clause", "category": "syntax",
  "definition": "Reasons use потому что or так как before a clause: я отдыхаю, потому что устал. Learn the supplied chunks; do not add new verbs."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("u170","Кофе больше, чем чай.","Coffee is more than tea.",["больше"]),
 ("u171","Это лучше, чем раньше.","This is better than before.",["лучше"]),
 ("u172","Поезд быстрее, чем автобус.","The train is faster than the bus.",["быстрее"]),
 ("u173","Эта дорога длиннее.","This road is longer.",["длиннее"]),
 ("u174","Это проще, чем кажется.","It is easier than it seems.",["проще"]),
 ("u175","Это дороже, чем билет.","This is more expensive than the ticket.",["дороже"]),
 ("u176","Яблоко слаще, чем лимон.","The apple is sweeter than the lemon.",["слаще"]),
 ("u177","Сегодня спокойнее, чем вчера.","Today is calmer than yesterday.",["спокойнее"]),
 ("u178","Я отдыхаю, потому что устал.","I rest because I am tired.",["потому"]),
 ("u179","Я учусь, чтобы работать.","I study in order to work.",["чтобы"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, gloss, cloze in SENTS:
        e = {"id": f"ru.sent.a2.{sid}", "status": "draft", "text": text, "gloss": gloss,
             "cloze_targets": cloze, "sources": SRC, "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

ASSESS = [
 {"id": "ru.assess.a2.comparisons-reading", "goal_id": "ru.goal.a2.comparisons",
  "kind": "recognition", "modality": "reading",
  "rubric": {"scale": "observed", "criteria": [
      "Identify comparative words (больше, меньше, лучше, хуже) in a supplied sentence.",
      "Match a reason clause to its потому что or так как chunk.",
      "Distinguish чем (than) from поэтому (therefore)."]},
  "review_status": "draft"},
 {"id": "ru.assess.a2.comparisons-writing", "goal_id": "ru.goal.a2.comparisons",
  "kind": "production", "modality": "writing",
  "rubric": {"scale": "observed", "criteria": [
      "Write a comparison with a taught comparative and чем.",
      "Give a reason with the supplied потому что chunk.",
      "State a purpose with the supplied чтобы chunk."]},
  "review_status": "draft"},
]
with open(os.path.join(R, "assessments", "definitions.jsonl"), "a") as f:
    for a in ASSESS:
        f.write(json.dumps(a, ensure_ascii=False) + "\n")

GOAL_YAML = """  - id: "ru.goal.a2.comparisons"
    description: "Compare things and give simple reasons."
    band: "A2"
    modalities: ["reading", "writing"]
    prerequisites:
      - {target: "ru.goal.a2.social-plans", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.a1.time-plans", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.on-ramp.everyday", dimension: "recall-meaning", required_state: "independent", strength: "hard"}
    required_concepts: ["ru.grammar.a2.comparative-short", "ru.grammar.a2.potomu-chto", "ru.grammar.on-ramp.zero-present-copula"]
    assessment_ids: ["ru.assess.a2.comparisons-reading", "ru.assess.a2.comparisons-writing"]
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
 ("170-comparisons-01","More and less","больше, меньше, чем, сравнение and разница.",
  ["bolshe","menshe","chem","sravnenie","raznica"], "s:u170",
  "Do not confuse больше (more) with меньше (less)."),
 ("171-comparisons-02","Better and worse","лучше, хуже, отличный, плохой and классный.",
  ["lushche","huzhe","otlichnyi","plohoi","klassnyi"], "s:u171",
  "Do not confuse лучше (better) with хуже (worse)."),
 ("172-comparisons-03","Speed","быстрее, медленнее, быстро, медленно and гонки.",
  ["bystree","medlennee","bystro","medlenno","gonki"], "s:u172",
  "Do not confuse быстрее (faster) with медленнее (slower)."),
 ("173-comparisons-04","Size","длиннее, короче, шире, уже and выше.",
  ["dlinnee","korotche","shire","uzhe","vyshe"], "s:u173",
  "Do not confuse длиннее (longer) with короче (shorter)."),
 ("174-comparisons-05","Difficulty","труднее, проще, сложнее, легче and тяжелее.",
  ["trudnee","proshche","slozhnee","legche","tyazhelee"], "s:u174",
  "Do not confuse проще (easier) with сложнее (harder)."),
 ("175-comparisons-06","Value","дороже, дешевле, важнее, полезнее and интереснее.",
  ["dorozhe","deshevle","vazhnee","poleznee","interesnee"], "s:u175",
  "Do not confuse дороже (pricier) with дешевле (cheaper)."),
 ("176-comparisons-07","Taste","вкуснее, здоровее, слаще, свежее and мягче.",
  ["vkusnee","zdorovee","slashche","svezhee","myagche"], "s:u176",
  "Do not confuse слаще (sweeter) with свежее (fresher)."),
 ("177-comparisons-08","Feelings","счастливее, спокойнее, веселее, грустнее and тревожнее.",
  ["schastlivee","spokoinee","veselee","grustnee","trevozhnee"], "s:u177",
  "Do not confuse счастливее (happier) with грустнее (sadder)."),
 ("178-comparisons-09","Reasons","потому что, так как, поэтому, причина and зачем.",
  ["potomu-cto","tak-kak","pojetomu","prichina","zachem"], "s:u178",
  "Do not confuse поэтому (therefore) with потому что (because)."),
 ("179-comparisons-10","Purpose","чтобы, если, благодаря, из-за and сравнить.",
  ["chtoby","yesli","blagodarya","iz-za","sravnit"], "s:u179",
  "Do not confuse чтобы (in order to) with если (if)."),
]

def unit_yaml(fname, title, summary, words, newitem, fence):
    uid = fname.split("-", 1)[1]
    num = fname[:3]
    lex = [f"ru.lex.comparisons.{w}" for w in words]
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
    L.append('goal_id: "ru.goal.a2.comparisons"')
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
    L.append(f'  expected_interpretations: ["{title}: comparisons with taught forms only."]')
    L.append(f'  prohibited_ambiguity: ["{fence}"]')
    L.append('  target_proficiency: "A2"')
    L.append('  validation_method: "choice"')
    return "\n".join(L) + "\n"

for fname, title, summary, words, newitem, fence in U:
    with open(os.path.join(R, "curriculum", "units", fname + ".yaml"), "w") as f:
        f.write(unit_yaml(fname, title, summary, words, newitem, fence))

print("ru batch 15 written")
