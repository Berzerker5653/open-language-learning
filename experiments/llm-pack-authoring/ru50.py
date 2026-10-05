#!/usr/bin/env python3
"""ru-RU batch 50: B2 units 520-529 (integrated reports with clear attribution)."""
import json, os

R = "experiments/llm-pack-authoring/candidates/ru-fullkit-v1"
SRC = ["ru-original"]
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-05", "notes": "ai-drafted; needs dictionary sourcing and human review"}

WORDS = [
 ("analitika","аналитика","аналúтика","analytics"),
 ("monitoring","мониторинг","монитóринг","monitoring"),
 ("diagnostika","диагностика","диагнóстика","diagnostics"),
 ("obsledovanie","обследование","обслéдование","survey, examination"),
 ("zamer","замер","зáмер","measurement"),
 ("perepis","перепись","пéрепись","census"),
 ("sovokupnost","совокупность","совóкупность","totality, aggregate"),
 ("populyaciya","популяция","популýция","population"),
 ("predstavitelnyy","представительный","представúтельный","representative"),
 ("plotnost","плотность","плóтность","density"),
 ("nasyschennost","насыщенность","насы́щенность","saturation"),
 ("nasyschenie","насыщение","насы́щение","saturation"),
 ("vypiska","выписка","вýписка","extract, statement"),
 ("reestr","реестр","реéстр","register"),
 ("vedomost","ведомость","вéдомость","statement, schedule"),
 ("stolbec","столбец","столбéц","column"),
 ("hranilishche","хранилище","хранúлище","repository"),
 ("kollekciya","коллекция","коллéкция","collection"),
 ("vitrina","витрина","витрúна","showcase, window"),
 ("stellazh","стеллаж","стеллáж","shelving"),
 ("papka","папка","пáпка","folder"),
 ("fayl","файл","фáйл","file"),
 ("metka","метка","мéтка","tag, mark"),
 ("marker","маркер","мáркер","marker"),
 ("birka","бирка","бúрка","tag, ticket"),
 ("plomba","пломба","плóмба","seal, plug"),
 ("rospis","роспись","рóпись","signature; mural painting"),
 ("propusk","пропуск","прóпуск","pass, permit"),
 ("tarif","тариф","тарúф","tariff, rate"),
 ("stavka","ставка","стáвка","rate, stake"),
 ("nadbavka","надбавка","надбáвка","supplement, bonus"),
 ("doplata","доплата","доплáта","surcharge, extra pay"),
 ("nakidka","накидка","накúдка","markup"),
 ("nacenka","наценка","нацéнка","markup"),
 ("zaem","заём","заём","loan"),
 ("ssuda","ссуда","ссýда","loan, credit"),
 ("opis","опись","óпись","inventory"),
 ("byulleten","бюллетень","бюллéтень","bulletin, ballot"),
 ("mashinopis","машинопись","машинóпись","typescript"),
 ("avtograf","автограф","áвтограф","autograph"),
 ("grafika","графика","грáфика","graphics"),
 ("plastika","пластика","плáстика","sculpture, plasticity"),
 ("faktura","фактура","фактýра","texture"),
 ("siluet","силуэт","силуэ́т","silhouette"),
 ("portret","портрет","портрéт","portrait"),
 ("peyzazh","пейзаж","пейзáж","landscape"),
 ("kolllazh","коллаж","коллáж","collage"),
 ("mozaika","мозаика","мозáика","mosaic"),
 ("gravjura","гравюра","гравюрá","engraving"),
 ("dublikat","дубликат","дубликáт","duplicate"),
]

def entry(rid, text, stress, gloss):
    return {"id": f"ru.lex.synthesis4.{rid}", "status": "draft",
            "forms": [{"text": text}], "readings": [{"text": stress}],
            "glosses": {"en-US": [gloss]}, "sources": SRC, "generation": GEN}

with open(os.path.join(R, "lexicon", "synthesis4.jsonl"), "w") as f:
    for rid, text, stress, gloss in WORDS:
        f.write(json.dumps(entry(rid, text, stress, gloss), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ru.grammar.b2-soglasno-dannym", "name": "Согласно данным attribution", "category": "syntax",
  "definition": "Reports attribute with согласно данным: согласно данным отчёта. Learn the supplied chunks as given."},
 {"id": "ru.grammar.b2-kak-otmechaet", "name": "Как отмечает + author attribution", "category": "syntax",
  "definition": "Attribution uses как отмечает: как отмечает автор. Learn the supplied chunks as given."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("u520","Это аналитика.","This is analytics.",["аналитика"]),
 ("u521","Это мониторинг.","This is monitoring.",["мониторинг"]),
 ("u522","Это замер.","This is a measurement.",["замер"]),
 ("u523","Это выписка.","This is an extract.",["выписка"]),
 ("u524","Это реестр.","This is a register.",["реестр"]),
 ("u525","Это папка.","This is a folder.",["папка"]),
 ("u526","Это файл.","This is a file.",["файл"]),
 ("u527","Это тариф.","This is a tariff.",["тариф"]),
 ("u528","Это опись.","This is an inventory.",["опись"]),
 ("u529","Это портрет.","This is a portrait.",["портрет"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, gloss, cloze in SENTS:
        e = {"id": f"ru.sent.b2.{sid}", "status": "draft", "text": text, "gloss": gloss,
             "cloze_targets": cloze, "sources": SRC, "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

ASSESS = [
 {"id": "ru.assess.b2.synthesis-reading4", "goal_id": "ru.goal.b2.synthesis4",
  "kind": "recognition", "modality": "reading",
  "rubric": {"scale": "observed", "criteria": [
      "Identify report words (аналитика, мониторинг) in a supplied report.",
      "Match согласно данным chunks to their attribution.",
      "Distinguish опись (inventory) from реестр (register)."]},
  "review_status": "draft"},
 {"id": "ru.assess.b2.synthesis-writing4", "goal_id": "ru.goal.b2.synthesis4",
  "kind": "production", "modality": "writing",
  "rubric": {"scale": "observed", "criteria": [
      "Attribute with the supplied согласно данным chunk.",
      "Cite with the supplied как отмечает chunk.",
      "Summarize with a supplied выписка or опись chunk."]},
  "review_status": "draft"},
]
with open(os.path.join(R, "assessments", "definitions.jsonl"), "a") as f:
    for a in ASSESS:
        f.write(json.dumps(a, ensure_ascii=False) + "\n")

GOAL_YAML = """  - id: "ru.goal.b2.synthesis4"
    description: "Write integrated reports with clear attribution."
    band: "B2"
    modalities: ["reading", "writing"]
    prerequisites:
      - {target: "ru.goal.b2.synthesis3", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.b1.extended-writing", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.on-ramp.everyday", dimension: "recall-meaning", required_state: "independent", strength: "hard"}
    required_concepts: ["ru.grammar.b2-soglasno-dannym", "ru.grammar.b2-kak-otmechaet", "ru.grammar.on-ramp.zero-present-copula"]
    assessment_ids: ["ru.assess.b2.synthesis-reading4", "ru.assess.b2.synthesis-writing4"]
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
 ("520-synthesis4-01","Analytics","аналитика, мониторинг, диагностика, обследование and замер.",
  ["analitika","monitoring","diagnostika","obsledovanie","zamer"], "s:u520",
  "Do not confuse мониторинг (monitoring) with обследование (survey)."),
 ("521-synthesis4-02","Census","перепись, совокупность, популяция, представительный and плотность.",
  ["perepis","sovokupnost","populyaciya","predstavitelnyy","plotnost"], "s:u521",
  "Do not confuse перепись (census) with популяция (population)."),
 ("522-synthesis4-03","Saturation","насыщенность, насыщение, плотность, популяция and совокупность.",
  ["nasyschennost","nasyschenie","plotnost","populyaciya","sovokupnost"], "s:u522",
  "Do not confuse насыщенность (saturation) with плотность (density)."),
 ("523-synthesis4-04","Extract","выписка, реестр, ведомость, столбец and опись.",
  ["vypiska","reestr","vedomost","stolbec","opis"], "s:u523",
  "Do not confuse выписка (extract) with ведомость (statement)."),
 ("524-synthesis4-05","Repository","хранилище, коллекция, витрина, стеллаж and папка.",
  ["hranilishche","kollekciya","vitrina","stellazh","papka"], "s:u524",
  "Do not confuse хранилище (repository) with витрина (showcase)."),
 ("525-synthesis4-06","File","файл, метка, маркер, бирка and пломба.",
  ["fayl","metka","marker","birka","plomba"], "s:u525",
  "Do not confuse метка (tag) with бирка (ticket)."),
 ("526-synthesis4-07","Signature","роспись, пропуск, автограф, дубликат and бюллетень.",
  ["rospis","propusk","avtograf","dublikat","byulleten"], "s:u526",
  "Do not confuse роспись (signature) with автограф (autograph)."),
 ("527-synthesis4-08","Tariff","тариф, ставка, надбавка, доплата and наценка.",
  ["tarif","stavka","nadbavka","doplata","nacenka"], "s:u527",
  "Do not confuse надбавка (supplement) with доплата (surcharge)."),
 ("528-synthesis4-09","Loan","заём, ссуда, ставка, тариф and накидка.",
  ["zaem","ssuda","stavka","tarif","nakidka"], "s:u528",
  "Do not confuse заём (loan) with ссуда (credit)."),
 ("529-synthesis4-10","Portrait","графика, пластика, фактура, силуэт and портрет.",
  ["grafika","plastika","faktura","siluet","portret"], "s:u529",
  "Do not confuse графика (graphics) with пластика (sculpture)."),
]

def unit_yaml(fname, title, summary, words, newitem, fence):
    uid = fname.split("-", 1)[1]
    num = fname[:3]
    lex = [w if w.startswith("ru.lex.") else f"ru.lex.synthesis4.{w}" for w in words]
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
    L.append('goal_id: "ru.goal.b2.synthesis4"')
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
    L.append(f'  expected_interpretations: ["{title}: report with taught forms only."]')
    L.append(f'  prohibited_ambiguity: ["{fence}"]')
    L.append('  target_proficiency: "B2"')
    L.append('  validation_method: "choice"')
    return "\n".join(L) + "\n"

for fname, title, summary, words, newitem, fence in U:
    with open(os.path.join(R, "curriculum", "units", fname + ".yaml"), "w") as f:
        f.write(unit_yaml(fname, title, summary, words, newitem, fence))

print("ru batch 50 written")
assert len(WORDS) == 50, len(WORDS)
