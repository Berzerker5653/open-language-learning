#!/usr/bin/env python3
"""ru-RU batch 56: B2 units 580-589 (proposals, benefits, and constraints)."""
import json, os

R = "experiments/llm-pack-authoring/candidates/ru-fullkit-v1"
SRC = ["ru-original"]
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-05", "notes": "ai-drafted; needs dictionary sourcing and human review"}

WORDS = [
 ("finansirovanie","финансирование","финансúрование","financing"),
 ("investiciya","инвестиция","инвестúция","investment"),
 ("investor","инвестор","инвéстор","investor"),
 ("investirovat","инвестировать","инвестúровать","to invest"),
 ("zatraty","затраты","затрáты","costs"),
 ("okupaemost","окупаемость","окупáемость","payback"),
 ("rentabelnost","рентабельность","рентабéльность","profitability"),
 ("dokhodnost","доходность","дохóдность","yield"),
 ("marzha","маржа","мáржа","margin"),
 ("sebestoimost","себестоимость","себестóимость","cost price"),
 ("rezultativnost","результативность","результатúвность","effectiveness"),
 ("pribylnyy","прибыльный","прúбыльный","profitable"),
 ("ubytochnyy","убыточный","убытóчный","loss-making"),
 ("bezubytochnyy","безубыточный","безубытóчный","break-even"),
 ("ubytochnost","убыточность","убытóчность","loss-making (noun)"),
 ("nekhvatka","нехватка","нéхватка","shortage"),
 ("deficit","дефицит","дефицúт","deficit"),
 ("izbytok","избыток","избúток","excess, surplus"),
 ("kadrovyy","кадровый","кáдровый","personnel (adj)"),
 ("potencial","потенциал","потенциáл","potential"),
 ("sryv","срыв","сры\u0301в","disruption, failure"),
 ("prosrochka","просрочка","прóсрочка","overdue, delinquency"),
 ("spad","спад","спáд","decline, downturn"),
 ("krizis","кризис","крúзис","crisis"),
 ("inflyaciya","инфляция","инфлýция","inflation"),
 ("avans","аванс","авáнс","advance payment"),
 ("pereplata","переплата","перéплата","overpayment"),
 ("bonus","бонус","бóнус","bonus"),
 ("lgota","льгота","льгóта","benefit, privilege"),
 ("subsidiya","субсидия","субсúдия","subsidy"),
 ("grant","грант","грáнт","grant"),
 ("dotaciya","дотация","дотáция","subsidy, grant"),
 ("faktoring","факторинг","фáкторинг","factoring"),
 ("lizing","лизинг","лúзинг","leasing"),
 ("franshiza","франшиза","франшúза","franchise"),
 ("finansist","финансист","финансúст","financier"),
 ("ekonomist","экономист","экономúст","economist"),
 ("bukhgalter","бухгалтер","бухгáлтер","accountant"),
 ("bukhgaltariya","бухгалтерия","бухгалтéрия","accounting office"),
 ("deklaraciya","декларация","декларáция","declaration"),
 ("sberezheniya","сбережения","сбережéния","savings"),
 ("nakopleniya","накопления","накоплéния","accumulations, savings"),
 ("dividend","дивиденд","дивúденд","dividend"),
 ("obligaciya","облигация","облигáция","bond"),
 ("polis","полис","пóлис","insurance policy"),
 ("nalog","налог","налóг","tax"),
 ("sbor","сбор","сбóр","fee, levy"),
 ("poshlina","пошлина","пошлúна","duty, fee"),
 ("taksa","такса","тáкса","fee, tariff"),
 ("optimizaciya","оптимизация","оптимизáция","optimization"),
]

def entry(rid, text, stress, gloss):
    return {"id": f"ru.lex.prof.{rid}", "status": "draft",
            "forms": [{"text": text}], "readings": [{"text": stress}],
            "glosses": {"en-US": [gloss]}, "sources": SRC, "generation": GEN}

with open(os.path.join(R, "lexicon", "prof2.jsonl"), "w") as f:
    for rid, text, stress, gloss in WORDS:
        f.write(json.dumps(entry(rid, text, stress, gloss), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ru.grammar.b2-predlagaem", "name": "Мы предлагаем + acc", "category": "syntax",
  "definition": "Proposals use мы предлагаем: мы предлагаем сотрудничество. Learn the supplied chunks as given."},
 {"id": "ru.grammar.b2-pri-uslovii", "name": "При условии + gen", "category": "syntax",
  "definition": "Constraints use при условии: при условии оплаты. Learn the supplied chunks as given."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("u580","Это инвестиция.","This is an investment.",["инвестиция"]),
 ("u581","Это маржа.","This is a margin.",["маржа"]),
 ("u582","Это себестоимость.","This is the cost price.",["себестоимость"]),
 ("u583","Это дефицит.","This is a deficit.",["дефицит"]),
 ("u584","Это кризис.","This is a crisis.",["кризис"]),
 ("u585","Это инфляция.","This is inflation.",["инфляция"]),
 ("u586","Это аванс.","This is an advance payment.",["аванс"]),
 ("u587","Это грант.","This is a grant.",["грант"]),
 ("u588","Это лизинг.","This is leasing.",["лизинг"]),
 ("u589","Это налог.","This is a tax.",["налог"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, gloss, cloze in SENTS:
        e = {"id": f"ru.sent.b2.{sid}", "status": "draft", "text": text, "gloss": gloss,
             "cloze_targets": cloze, "sources": SRC, "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

OLD_GRAM = ["ru.grammar.on-ramp.eto-identification", "ru.grammar.on-ramp.zero-present-copula"]

U = [
 ("580-prop-01","Financing","финансирование, инвестиция, инвестор, инвестировать and затраты.",
  ["finansirovanie","investiciya","investor","investirovat","zatraty"], "s:u580",
  "Do not confuse инвестор (investor) with финансист (financier)."),
 ("581-prop-02","Profitability","окупаемость, рентабельность, доходность, маржа and себестоимость.",
  ["okupaemost","rentabelnost","dokhodnost","marzha","sebestoimost"], "s:u581",
  "Do not confuse маржа (margin) with себестоимость (cost price)."),
 ("582-prop-03","Effectiveness","результативность, прибыльный, убыточный, безубыточный and убыточность.",
  ["rezultativnost","pribylnyy","ubytochnyy","bezubytochnyy","ubytochnost"], "s:u582",
  "Do not confuse прибыльный (profitable) with убыточный (loss-making)."),
 ("583-prop-04","Shortages","нехватка, дефицит, избыток, кадровый and потенциал.",
  ["nekhvatka","deficit","izbytok","kadrovyy","potencial"], "s:u583",
  "Do not confuse нехватка (shortage) with избыток (excess)."),
 ("584-prop-05","Setbacks","срыв, просрочка, спад, кризис and инфляция.",
  ["sryv","prosrochka","spad","krizis","inflyaciya"], "s:u584",
  "Do not confuse спад (decline) with кризис (crisis)."),
 ("585-prop-06","Payments","аванс, переплата, бонус, льгота and субсидия.",
  ["avans","pereplata","bonus","lgota","subsidiya"], "s:u585",
  "Do not confuse аванс (advance payment) with переплата (overpayment)."),
 ("586-prop-07","Funding schemes","грант, дотация, факторинг, лизинг and франшиза.",
  ["grant","dotaciya","faktoring","lizing","franshiza"], "s:u586",
  "Do not confuse грант (grant) with дотация (subsidy)."),
 ("587-prop-08","Finance staff","финансист, экономист, бухгалтер, бухгалтерия and декларация.",
  ["finansist","ekonomist","bukhgalter","bukhgaltariya","deklaraciya"], "s:u587",
  "Do not confuse финансист (financier) with экономист (economist)."),
 ("588-prop-09","Savings","сбережения, накопления, дивиденд, облигация and полис.",
  ["sberezheniya","nakopleniya","dividend","obligaciya","polis"], "s:u588",
  "Do not confuse сбережения (savings) with облигация (bond)."),
 ("589-prop-10","Taxes","налог, сбор, пошлина, такса and оптимизация.",
  ["nalog","sbor","poshlina","taksa","optimizaciya"], "s:u589",
  "Do not confuse налог (tax) with пошлина (duty)."),
]

def unit_yaml(fname, title, summary, words, newitem, fence):
    uid = fname.split("-", 1)[1]
    num = fname[:3]
    lex = [w if w.startswith("ru.lex.") else f"ru.lex.prof.{w}" for w in words]
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
    L.append('goal_id: "ru.goal.b2.professional-writing"')
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
    L.append(f'  expected_interpretations: ["{title}: business letter with taught forms only."]')
    L.append(f'  prohibited_ambiguity: ["{fence}"]')
    L.append('  target_proficiency: "B2"')
    L.append('  validation_method: "choice"')
    return "\n".join(L) + "\n"

for fname, title, summary, words, newitem, fence in U:
    with open(os.path.join(R, "curriculum", "units", fname + ".yaml"), "w") as f:
        f.write(unit_yaml(fname, title, summary, words, newitem, fence))

print("ru batch 56 written")
assert len(WORDS) == 50, len(WORDS)
