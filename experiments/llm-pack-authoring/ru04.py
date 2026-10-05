#!/usr/bin/env python3
"""ru-RU batch 4: A1 units 060-069 (food)."""
import json, os

R = "experiments/llm-pack-authoring/candidates/ru-fullkit-v1"
SRC = ["ru-original"]
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-04", "notes": "ai-drafted; needs dictionary sourcing and human review"}

WORDS = [
 ("hleb","хлеб","хлеб","bread"),
 ("maslo","масло","ма́сло","butter"),
 ("sir","сыр","сыр","cheese"),
 ("moloko","молоко","молоко́","milk"),
 ("voda","вода","вода́","water"),
 ("sok","сок","сок","juice"),
 ("myaso","мясо","мя́со","meat"),
 ("ryba","рыба","ры́ба","fish"),
 ("jajco","яйцо","яйцо́","egg"),
 ("kasha","каша","ка́ша","porridge"),
 ("sup","суп","суп","soup"),
 ("kholshch","борщ","борщ","beet soup"),
 ("pelmeni","пельмени","пельме́ни","dumplings"),
 ("bliny","блины","блины́","pancakes"),
 ("salat","салат","сала́т","salad"),
 ("karta","картофель","ка́ртофель","potato"),
 ("ovoshchi","овощи","о́вощи","vegetables"),
 ("frukty","фрукты","фру́кты","fruits"),
 ("yabloko","яблоко","я́блоко","apple"),
 ("banan","банан","бана́н","banana"),
 ("kuritsa","курица","ку́рица","chicken"),
 ("kolbasa","колбаса","колбаса́","sausage"),
 ("tort","торт","торт","cake"),
 ("konfeta","конфета","конфе́та","candy"),
 ("sahar","сахар","са́хар","sugar"),
 ("sol","соль","соль","salt"),
 ("muka","мука","мука́","flour"),
 ("med","мёд","мёд","honey"),
 ("varene","варенье","варе́нье","jam"),
 ("kefir","кефир","кефи́р","kefir"),
 ("tvarog","творог","тво́рог","cottage cheese"),
 ("smetana","сметана","смета́на","sour cream"),
 ("restoran","ресторан","рестора́н","restaurant"),
 ("kafe","кафе","кафе́","café"),
 ("menu","меню","меню́","menu"),
 ("schet","счёт","счёт","bill"),
 ("zakaz","заказ","зака́з","order"),
 ("porciya","порция","по́рция","portion"),
 ("vkusno","вкусно","вку́сно","tasty"),
 ("golodny","голодный","голо́дный","hungry"),
 ("kushat","кушать","ку́шать","to eat"),
 ("pit","пить","пить","to drink"),
 ("stakan","стакан","стака́н","glass"),
 ("butylka","бутылка","бу́тылка","bottle"),
 ("eda","еда","еда́","food"),
 ("uzhin","ужин","у́жин","dinner"),
 ("desert","десерт","десе́рт","dessert"),
 ("povar","повар","пова́р","cook"),
 ("cena","цена","цена́","price"),
 ("skolko","сколько","ско́лько","how much, how many"),
]
assert len(WORDS) == 50

def entry(rid, form, reading, gloss):
    return {"id": f"ru.lex.food.{rid}", "status": "draft",
            "forms": [{"text": form, "is_primary": True}],
            "readings": [{"text": reading, "script": "cyrillic"}],
            "glosses": {"en-US": [gloss]}, "sources": SRC, "generation": GEN}

with open(os.path.join(R, "lexicon", "food.jsonl"), "w") as f:
    for rid, form, reading, gloss in WORDS:
        f.write(json.dumps(entry(rid, form, reading, gloss), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ru.grammar.a1.accusative-food", "name": "Accusative for the thing eaten", "category": "morphology",
  "definition": "The thing eaten or ordered takes the accusative: Я хочу суп, Дайте салат, пожалуйста. Inanimate masculine nouns keep the nominative shape (суп, салат); feminine -а becomes -у (вода → воду). Learn each supplied accusative form and do not invent endings."},
 {"id": "ru.grammar.a1.polite-order", "name": "Ordering politely", "category": "syntax",
  "definition": "Ordering uses Дайте, пожалуйста plus the accusative item: Дайте кофе, пожалуйста. The price is asked with Сколько стоит? Learn these phrases as fixed chunks; do not change the verb form."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("u060","Это хлеб.","This is bread.",["хлеб"]),
 ("u061","Это сок.","This is juice.",["сок"]),
 ("u062","Это рыба.","This is fish.",["рыба"]),
 ("u063","Это суп.","This is soup.",["суп"]),
 ("u064","Это яблоко.","This is an apple.",["яблоко"]),
 ("u065","Это торт.","This is a cake.",["торт"]),
 ("u066","Это яйцо.","This is an egg.",["яйцо"]),
 ("u067","Это каша.","This is porridge.",["каша"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, gloss, cloze in SENTS:
        e = {"id": f"ru.sent.a1.{sid}", "status": "draft", "text": text, "gloss": gloss,
             "cloze_targets": cloze, "sources": SRC, "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

ASSESS = [
 {"id": "ru.assess.a1.food-reading", "goal_id": "ru.goal.a1.food",
  "kind": "recognition", "modality": "reading",
  "rubric": {"scale": "observed", "criteria": [
      "Identify food, drink and menu nouns in a supplied menu or shopping note.",
      "Distinguish the ordered item in the Дайте + accusative model from the polite frame.",
      "Match accusative forms to their nominative nouns for the supplied pairs."]},
  "review_status": "draft"},
 {"id": "ru.assess.a1.food-writing", "goal_id": "ru.goal.a1.food",
  "kind": "production", "modality": "writing",
  "rubric": {"scale": "observed", "criteria": [
      "Write a food-identification statement with это and a taught nominative noun.",
      "Complete a polite order with Дайте, пожалуйста and a supplied accusative item.",
      "Ask the price with the taught Сколько стоит? chunk."]},
  "review_status": "draft"},
]
with open(os.path.join(R, "assessments", "definitions.jsonl"), "a") as f:
    for a in ASSESS:
        f.write(json.dumps(a, ensure_ascii=False) + "\n")

GOAL_YAML = """  - id: "ru.goal.a1.food"
    description: "Read and write simple statements about food, menus, and polite orders."
    band: "A1"
    modalities: ["reading", "writing"]
    prerequisites:
      - {target: "ru.goal.a1.routines", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.a1.home", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.on-ramp.numbers", dimension: "recall-meaning", required_state: "independent", strength: "hard"}
    required_concepts: ["ru.grammar.a1.accusative-food", "ru.grammar.a1.polite-order", "ru.grammar.on-ramp.zero-present-copula"]
    assessment_ids: ["ru.assess.a1.food-reading", "ru.assess.a1.food-writing"]
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
 ("060-food-01","Table basics","хлеб, масло, сыр, соль and сахар.",
  ["hleb","maslo","sir","sol","sahar"], "s:u060",
  "Do not guess genders here; хлеб is masculine and масло is neuter as taught."),
 ("061-food-02","Drinks and dairy","молоко, вода, сок, кефир and стакан.",
  ["moloko","voda","sok","kefir","stakan"], "s:u061",
  "Do not use стакан for a cup; чашка is the taught cup."),
 ("062-food-03","Protein","мясо, рыба, яйцо, курица and колбаса.",
  ["myaso","ryba","jajco","kuritsa","kolbasa"], "s:u062",
  "Do not guess the plural of яйцо; only the supplied forms are taught."),
 ("063-food-04","Soups and mains","суп, борщ, пельмени, блины and салат.",
  ["sup","kholshch","pelmeni","bliny","salat"], "s:u063",
  "Do not treat борщ as the generic word for soup; суп is generic."),
 ("064-food-05","Produce","картофель, овощи, фрукты, яблоко and банан.",
  ["karta","ovoshchi","frukty","yabloko","banan"], "s:u064",
  "Do not confuse фрукты (fruits) with овощи (vegetables)."),
 ("065-food-06","Sweet things","торт, конфета, мёд, варенье and десерт.",
  ["tort","konfeta","med","varene","desert"], "s:u065",
  "Do not guess the gender of мёд; it is masculine."),
 ("066-food-07","Pantry","мука, сметана, творог, бутылка and еда.",
  ["muka","smetana","tvarog","butylka","eda"], "s:u066",
  "Do not confuse бутылка (bottle) with a jar; only бутылка is taught here."),
 ("067-food-08","Cooking and eating","каша, ужин, кушать, пить and повар.",
  ["kasha","uzhin","kushat","pit","povar"], "s:u067",
  "Do not confuse кушать (to eat) with любить (to like)."),
 ("068-food-09","At the restaurant","ресторан, кафе, меню, счёт and заказ with the accusative model.",
  ["restoran","kafe","menu","schet","zakaz"], "g:ru.grammar.a1.accusative-food",
  "Do not keep the ordered item in the nominative after Дайте; it takes the accusative."),
 ("069-food-10","Ordering","порция, вкусно, голодный, сколько and цена with the polite-order chunk.",
  ["porciya","vkusno","golodny","skolko","cena"], "g:ru.grammar.a1.polite-order",
  "Do not ask the price with это; use the taught Сколько стоит? chunk."),
]

def unit_yaml(fname, title, summary, words, newitem, fence):
    uid = fname.split("-", 1)[1]
    num = fname[:3]
    lex = [f"ru.lex.food.{w}" for w in words]
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
    L.append('goal_id: "ru.goal.a1.food"')
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
    L.append(f'  expected_interpretations: ["{title}: food and ordering with taught forms only."]')
    L.append(f'  prohibited_ambiguity: ["{fence}"]')
    L.append('  target_proficiency: "A1"')
    L.append('  validation_method: "choice"')
    return "\n".join(L) + "\n"

for fname, title, summary, words, newitem, fence in U:
    with open(os.path.join(R, "curriculum", "units", fname + ".yaml"), "w") as f:
        f.write(unit_yaml(fname, title, summary, words, newitem, fence))

print("ru batch 4 written")
