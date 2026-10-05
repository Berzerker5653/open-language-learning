#!/usr/bin/env python3
"""ru-RU batch 5: A1 units 070-079 (shopping)."""
import json, os

R = "experiments/llm-pack-authoring/candidates/ru-fullkit-v1"
SRC = ["ru-original"]
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-04", "notes": "ai-drafted; needs dictionary sourcing and human review"}

WORDS = [
 ("prodavec","продавец","продаве́ц","shop assistant"),
 ("pokupka","покупка","по́купка","purchase"),
 ("pokupat","покупать","покупа́ть","to buy"),
 ("prodat","продавать","продава́ть","to sell"),
 ("skidka","скидка","ски́дка","discount"),
 ("tolko","только","то́лько","only"),
 ("eshchyo","ещё","ещё","more, also"),
 ("podarok","подарок","пода́рок","gift"),
 ("dorogoy","дорогой","дорого́й","expensive"),
 ("deshevy","дешёвый","дешёвый","cheap"),
 ("bolshoy","большой","большо́й","big"),
 ("novyy","новый","но́вый","new"),
 ("staryy","старый","ста́рый","old"),
 ("tsvet","цвет","цвет","color"),
 ("belyy","белый","бе́лый","white"),
 ("chernyy","чёрный","чо́рный","black"),
 ("krasnyy","красный","кра́сный","red"),
 ("zelenyy","зелёный","зелёный","green"),
 ("siniy","синий","си́ний","blue"),
 ("razmer","размер","разме́р","size"),
 ("kassa","касса","ка́сса","checkout"),
 ("vybrat","выбрать","вы́брать","to choose"),
 ("chek","чек","чек","receipt"),
 ("nalichnye","наличные","на́личные","cash"),
 ("sdacha","сдача","сдача́","change"),
 ("polka","полка","по́лка","shelf"),
 ("korzina","корзина","корзи́на","basket"),
 ("paket","пакет","паке́т","bag"),
 ("etiketka","этикетка","этике́тка","price tag"),
 ("tovar","товар","това́р","goods"),
 ("marka","марка","ма́рка","brand"),
 ("rubashka","рубашка","ру́башка","shirt"),
 ("bryuki","брюки","брю́ки","trousers"),
 ("yubka","юбка","ю́бка","skirt"),
 ("platye","платье","пла́тье","dress"),
 ("krossovki","кроссовки","кроссо́вки","sneakers"),
 ("perchatki","перчатки","перча́тки","gloves"),
 ("shapka","шапка","ша́пка","hat"),
 ("sharf","шарф","шарф","scarf"),
 ("noski","носки","но́ски","socks"),
 ("remen","ремень","ремень","belt"),
 ("stoit","стоит","стои́т","costs, is worth"),
 ("pokupatel","покупатель","покупа́тель","customer"),
 ("prodazha","продажа","продажа́","sale"),
 ("normalno","нормально","но́рмально","fine, OK"),
 ("horosho","хорошо","хорошо́","good, well"),
 ("ploho","плохо","пло́хо","bad, badly"),
 ("nichego","ничего","ничево́","nothing, it is fine"),
 ("upakovka","упаковка","упако́вка","packaging"),
 ("sprashivat","спрашивать","спра́шивать","to ask"),
]
assert len(WORDS) == 50

def entry(rid, form, reading, gloss):
    return {"id": f"ru.lex.shopping.{rid}", "status": "draft",
            "forms": [{"text": form, "is_primary": True}],
            "readings": [{"text": reading, "script": "cyrillic"}],
            "glosses": {"en-US": [gloss]}, "sources": SRC, "generation": GEN}

with open(os.path.join(R, "lexicon", "shopping.jsonl"), "w") as f:
    for rid, form, reading, gloss in WORDS:
        f.write(json.dumps(entry(rid, form, reading, gloss), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ru.grammar.a1.adjective-agreement", "name": "Adjective agreement", "category": "morphology",
  "definition": "An adjective agrees with its noun: новый дом, новая рубашка, старое окно. Learn each supplied adjective form together with the noun it matches; do not transfer an ending from another gender or invent new endings."},
 {"id": "ru.grammar.a1.genitive-quantity", "name": "Genitive after сколько and numbers", "category": "syntax",
  "definition": "After сколько and the taught numbers, the counted noun appears in the supplied genitive form: Сколько рублей? Пять яблок. Learn each supplied genitive pairing; do not keep the counted noun in the nominative."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("u070","Это продавец.","This is the shop assistant.",["продавец"]),
 ("u071","Это покупка.","This is a purchase.",["покупка"]),
 ("u072","Это чек.","This is a receipt.",["чек"]),
 ("u073","Это полка.","This is a shelf.",["полка"]),
 ("u074","Это рубашка.","This is a shirt.",["рубашка"]),
 ("u075","Это шапка.","This is a hat.",["шапка"]),
 ("u076","Это цвет.","This is a color.",["цвет"]),
 ("u078","Это подарок.","This is a gift.",["подарок"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, gloss, cloze in SENTS:
        e = {"id": f"ru.sent.a1.{sid}", "status": "draft", "text": text, "gloss": gloss,
             "cloze_targets": cloze, "sources": SRC, "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

ASSESS = [
 {"id": "ru.assess.a1.shopping-reading", "goal_id": "ru.goal.a1.shopping",
  "kind": "recognition", "modality": "reading",
  "rubric": {"scale": "observed", "criteria": [
      "Identify shop, product, clothing and payment nouns in a supplied shopping note.",
      "Distinguish the shop assistant from the customer in a supplied dialogue line.",
      "Match an adjective or genitive quantity form to the noun it goes with."]},
  "review_status": "draft"},
 {"id": "ru.assess.a1.shopping-writing", "goal_id": "ru.goal.a1.shopping",
  "kind": "production", "modality": "writing",
  "rubric": {"scale": "observed", "criteria": [
      "Write a product-identification statement with это and a taught nominative noun.",
      "Complete a price question with the taught Сколько стоит? chunk.",
      "Use a supplied adjective agreement or genitive quantity form without inventing endings."]},
  "review_status": "draft"},
]
with open(os.path.join(R, "assessments", "definitions.jsonl"), "a") as f:
    for a in ASSESS:
        f.write(json.dumps(a, ensure_ascii=False) + "\n")

GOAL_YAML = """  - id: "ru.goal.a1.shopping"
    description: "Read and write simple statements about prices, products, and purchase requests."
    band: "A1"
    modalities: ["reading", "writing"]
    prerequisites:
      - {target: "ru.goal.a1.food", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.a1.home", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.on-ramp.numbers", dimension: "recall-meaning", required_state: "independent", strength: "hard"}
    required_concepts: ["ru.grammar.a1.adjective-agreement", "ru.grammar.a1.genitive-quantity", "ru.grammar.on-ramp.zero-present-copula"]
    assessment_ids: ["ru.assess.a1.shopping-reading", "ru.assess.a1.shopping-writing"]
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
 ("070-shopping-01","In the shop","продавец, покупатель, товар, продажа and скидка.",
  ["prodavec","pokupatel","tovar","prodazha","skidka"], "s:u070",
  "Do not confuse продавец (shop assistant) with покупатель (customer)."),
 ("071-shopping-02","Buying and selling","покупать, продавать, выбрать, стоит and покупка.",
  ["pokupat","prodat","vybrat","stoit","pokupka"], "s:u071",
  "Do not confuse покупать (to buy) with продавать (to sell)."),
 ("072-shopping-03","Paying","касса, чек, наличные, сдача and ещё.",
  ["kassa","chek","nalichnye","sdacha","eshchyo"], "s:u072",
  "Do not treat сдача as a verb; it names the money change."),
 ("073-shopping-04","Shop fittings","полка, корзина, пакет, этикетка and размер.",
  ["polka","korzina","paket","etiketka","razmer"], "s:u073",
  "Do not confuse полка (shelf) with the already-taught пол (floor)."),
 ("074-shopping-05","Clothes for buying","рубашка, брюки, юбка, платье and кроссовки.",
  ["rubashka","bryuki","yubka","platye","krossovki"], "s:u074",
  "Do not guess a singular of брюки; it is used in the supplied plural form."),
 ("075-shopping-06","Accessories","перчатки, шапка, шарф, носки and ремень.",
  ["perchatki","shapka","sharf","noski","remen"], "s:u075",
  "Do not confuse шапка (hat) with шарф (scarf)."),
 ("076-shopping-07","Colors","цвет, белый, чёрный, красный and зелёный.",
  ["tsvet","belyy","chernyy","krasnyy","zelenyy"], "s:u076",
  "Do not place the color word after the noun by English habit; taught phrases put it before."),
 ("077-shopping-08","Describing things","синий, дорогой, дешёвый, большой and новый with agreement forms.",
  ["siniy","dorogoy","deshevy","bolshoy","novyy"], "g:ru.grammar.a1.adjective-agreement",
  "Do not attach an adjective ending from one noun to another; agreement forms are supplied per gender."),
 ("078-shopping-09","Gifts and extras","старый, подарок, марка, только and ничего.",
  ["staryy","podarok","marka","tolko","nichego"], "s:u078",
  "Do not confuse подарок (gift) with покупка (purchase)."),
 ("079-shopping-10","Asking about prices","нормально, хорошо, плохо, упаковка and спрашивать with the quantity model.",
  ["normalno","horosho","ploho","upakovka","sprashivat"], "g:ru.grammar.a1.genitive-quantity",
  "Do not keep the counted noun in the nominative after сколько; it takes the supplied genitive form."),
]

def unit_yaml(fname, title, summary, words, newitem, fence):
    uid = fname.split("-", 1)[1]
    num = fname[:3]
    lex = [f"ru.lex.shopping.{w}" for w in words]
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
    L.append('goal_id: "ru.goal.a1.shopping"')
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
    L.append(f'  expected_interpretations: ["{title}: shopping with taught forms only."]')
    L.append(f'  prohibited_ambiguity: ["{fence}"]')
    L.append('  target_proficiency: "A1"')
    L.append('  validation_method: "choice"')
    return "\n".join(L) + "\n"

for fname, title, summary, words, newitem, fence in U:
    with open(os.path.join(R, "curriculum", "units", fname + ".yaml"), "w") as f:
        f.write(unit_yaml(fname, title, summary, words, newitem, fence))

print("ru batch 5 written")
