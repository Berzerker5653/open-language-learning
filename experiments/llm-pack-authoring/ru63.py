#!/usr/bin/env python3
"""ru-RU batch 63: B2 units 650-659 (public services and competing needs)."""
import json, os

R = "experiments/llm-pack-authoring/candidates/ru-fullkit-v1"
SRC = ["ru-original"]
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-05", "notes": "ai-drafted; needs dictionary sourcing and human review"}

WORDS = [
 ("gosusluga","госуслуга","госуслýга","government service"),
 ("ministerskiy","министерский","минúстерский","ministerial"),
 ("pravitelstvennyy","правительственный","правúтельственный","governmental"),
 ("zakonodatelnyy","законодательный","законодáтельный","legislative"),
 ("zakonoproekt","законопроект","законопрóект","bill, draft law"),
 ("lgotnik","льготник","льгóтник","beneficiary"),
 ("proshenie","прошение","прошéние","petition"),
 ("khodataystvo","ходатайство","ходатáйство","motion, petition"),
 ("petsiya","петиция","пéтиция","petition"),
 ("munitsipalnyy","муниципальный","муницúпальный","municipal"),
 ("munitsipalitet","муниципалитет","муницúпалитет","municipality"),
 ("rayonnyy","районный","райóнный","district (adj.)"),
 ("oblastnoy","областной","областнóй","regional"),
 ("nuzhdayushchiysya","нуждающийся","нуждáющийся","needy, deserving"),
 ("gossluzhashchiy","госслужащий","госслужúщий","civil servant"),
 ("chinovnichiy","чиновничий","чиновнúчий","bureaucratic"),
 ("nadzornyy","надзорный","надзóрный","supervisory"),
 ("litsenzirovanie","лицензирование","лицензúрование","licensing"),
 ("litsenzionnyy","лицензионный","лицензúонный","licensing (adj.)"),
 ("akkreditovat","аккредитовать","аккредитóвать","to accredit"),
 ("tarifikatsiya","тарификация","тарификáция","tariffication"),
 ("tarifnyy","тарифный","тарúфный","tariff (adj.)"),
 ("subsidirovanie","субсидирование","субсидúрование","subsidizing"),
 ("dotirovanie","дотирование","дотúрование","subsidizing"),
 ("nalogooblozhenie","налогообложение","налогообложéние","taxation"),
 ("fiskalnyy","фискальный","фúскальный","fiscal"),
 ("deklarirovanie","декларирование","декларúрование","declaring"),
 ("kvotirovanie","квотирование","квотúрование","quota allocation"),
 ("limitirovanie","лимитирование","лимитúрование","limiting"),
 ("normirovanie","нормирование","нормúрование","standardization, rationing"),
 ("raspredelitelnyy","распределительный","распределúтельный","distributive"),
 ("prioritetnost","приоритетность","приоритéтность","priority (noun)"),
 ("kolichestvennyy","количественный","колúчественный","quantitative"),
 ("kachestvennyy","качественный","качéственный","qualitative"),
 ("obshchestvennost","общественность","обшéственность","the public, society"),
 ("gosudarstvennost","государственность","госудáрственность","statehood"),
 ("byurokraticheskiy","бюрократический","бюрокрáтический","bureaucratic"),
 ("reformirovanie","реформирование","реформúрование","reforming"),
 ("tsifrovizatsiya","цифровизация","цифровизáция","digitalization"),
 ("otsifrovka","оцифровка","оцифрóвка","digitization"),
 ("bezbumazhnyy","безбумажный","безбýмажный","paperless"),
 ("arkhivnyy","архивный","архúвный","archival"),
 ("reestrovyy","реестровый","реéстровый","registry (adj.)"),
 ("peni","пени","пéни","penalty, late fees"),
 ("blokirovka","блокировка","блокúровка","blocking"),
 ("razblokirovka","разблокировка","разблокúровка","unblocking"),
 ("upravlencheskiy","управленческий","управлéнческий","managerial"),
 ("mezhvedomstvennyy","межведомственный","межвéдомственный","interdepartmental"),
 ("elektronnyy","электронный","электрóнный","electronic"),
 ("tsifrovoy","цифровой","цифровóй","digital"),
]

def entry(rid, text, stress, gloss):
    return {"id": f"ru.lex.soc.{rid}", "status": "draft",
            "forms": [{"text": text}], "readings": [{"text": stress}],
            "glosses": {"en-US": [gloss]}, "sources": SRC, "generation": GEN}

with open(os.path.join(R, "lexicon", "soc.jsonl"), "w") as f:
    for rid, text, stress, gloss in WORDS:
        f.write(json.dumps(entry(rid, text, stress, gloss), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ru.grammar.b2-gosudarstvo-obespechivaet", "name": "Государство обеспечивает + acc", "category": "syntax",
  "definition": "Public provision uses государство обеспечивает: государство обеспечивает доступ. Learn the supplied chunks as given."},
 {"id": "ru.grammar.b2-v-interesakh", "name": "В интересах + gen", "category": "syntax",
  "definition": "Policy justification uses в интересах: в интересах граждан. Learn the supplied chunks as given."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("u650","Это госуслуга.","This is a government service.",["госуслуга"]),
 ("u651","Это петиция.","This is a petition.",["петиция"]),
 ("u652","Это муниципалитет.","This is a municipality.",["муниципалитет"]),
 ("u653","Это госслужащий.","This is a civil servant.",["госслужащий"]),
 ("u654","Это лицензирование.","This is licensing.",["лицензирование"]),
 ("u655","Это налогообложение.","This is taxation.",["налогообложение"]),
 ("u656","Это квотирование.","This is quota allocation.",["квотирование"]),
 ("u657","Это блокировка.","This is blocking.",["блокировка"]),
 ("u658","Это оцифровка.","This is digitization.",["оцифровка"]),
 ("u659","Это реформа.","This is a reform.",["реформа"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, gloss, cloze in SENTS:
        e = {"id": f"ru.sent.b2.{sid}", "status": "draft", "text": text, "gloss": gloss,
             "cloze_targets": cloze, "sources": SRC, "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

ASSESS = [
 {"id": "ru.assess.b2.society-policy-reading", "goal_id": "ru.goal.b2.society-policy",
  "kind": "recognition", "modality": "reading",
  "rubric": {"scale": "observed", "criteria": [
      "Identify public-service words (госуслуга, льготник) in a supplied notice.",
      "Match государство обеспечивает chunks to what is provided.",
      "Distinguish quantitative (количественный) from qualitative (качественный) claims."]},
  "review_status": "draft"},
 {"id": "ru.assess.b2.society-policy-writing", "goal_id": "ru.goal.b2.society-policy",
  "kind": "production", "modality": "writing",
  "rubric": {"scale": "observed", "criteria": [
      "State a need with the supplied в интересах chunk.",
      "File a request with the supplied ходатайство chunk.",
      "Justify with taught forms only."]},
  "review_status": "draft"},
]
with open(os.path.join(R, "assessments", "definitions.jsonl"), "a") as f:
    for a in ASSESS:
        f.write(json.dumps(a, ensure_ascii=False) + "\n")

GOAL_YAML = """  - id: "ru.goal.b2.society-policy"
    description: "Discuss public services and competing needs in society."
    band: "B2"
    modalities: ["reading", "writing"]
    prerequisites:
      - {target: "ru.goal.b1.culture-media", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.a2.services", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.on-ramp.everyday", dimension: "recall-meaning", required_state: "independent", strength: "hard"}
    required_concepts: ["ru.grammar.b2-gosudarstvo-obespechivaet", "ru.grammar.b2-v-interesakh", "ru.grammar.on-ramp.zero-present-copula"]
    assessment_ids: ["ru.assess.b2.society-policy-reading", "ru.assess.b2.society-policy-writing"]
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
 ("650-soc-01","Government services","госуслуга, министерский, правительственный, законодательный and законопроект.",
  ["gosusluga","ministerskiy","pravitelstvennyy","zakonodatelnyy","zakonoproekt"], "s:u650",
  "Do not confuse законопроект (bill) with поправка (amendment)."),
 ("651-soc-02","Petitions","льготник, прошение, ходатайство, петиция and муниципальный.",
  ["lgotnik","proshenie","khodataystvo","petsiya","munitsipalnyy"], "s:u651",
  "Do not confuse прошение (petition) with ходатайство (motion)."),
 ("652-soc-03","Levels","муниципалитет, районный, областной, общественность and государственность.",
  ["munitsipalitet","rayonnyy","oblastnoy","obshchestvennost","gosudarstvennost"], "s:u652",
  "Do not confuse муниципалитет (municipality) with область (region)."),
 ("653-soc-04","Officials","нуждающийся, госслужащий, чиновничий, надзорный and бюрократический.",
  ["nuzhdayushchiysya","gossluzhashchiy","chinovnichiy","nadzornyy","byurokraticheskiy"], "s:u653",
  "Do not confuse госслужащий (civil servant) with нуждающийся (needy person)."),
 ("654-soc-05","Licensing","лицензирование, лицензионный, аккредитовать, тарификация and тарифный.",
  ["litsenzirovanie","litsenzionnyy","akkreditovat","tarifikatsiya","tarifnyy"], "s:u654",
  "Do not confuse лицензирование (licensing) with аккредитовать (to accredit)."),
 ("655-soc-06","Funding","субсидирование, дотирование, налогообложение, фискальный and декларирование.",
  ["subsidirovanie","dotirovanie","nalogooblozhenie","fiskalnyy","deklarirovanie"], "s:u655",
  "Do not confuse субсидирование (subsidizing) with дотирование (granting subsidies)."),
 ("656-soc-07","Limits","квотирование, лимитирование, нормирование, распределительный and приоритетность.",
  ["kvotirovanie","limitirovanie","normirovanie","raspredelitelnyy","prioritetnost"], "s:u656",
  "Do not confuse квотирование (quota allocation) with лимитирование (limiting)."),
 ("657-soc-08","Metrics","количественный, качественный, реестровый, пени and блокировка.",
  ["kolichestvennyy","kachestvennyy","reestrovyy","peni","blokirovka"], "s:u657",
  "Do not confuse количественный (quantitative) with качественный (qualitative)."),
 ("658-soc-09","Digital","цифровизация, оцифровка, безбумажный, архивный and разблокировка.",
  ["tsifrovizatsiya","otsifrovka","bezbumazhnyy","arkhivnyy","razblokirovka"], "s:u658",
  "Do not confuse цифровизация (digitalization) with оцифровка (digitization)."),
 ("659-soc-10","Management","управленческий, межведомственный, электронный, цифровой and реформирование.",
  ["upravlencheskiy","mezhvedomstvennyy","elektronnyy","tsifrovoy","reformirovanie"], "s:u659",
  "Do not confuse электронный (electronic) with цифровой (digital)."),
]

def unit_yaml(fname, title, summary, words, newitem, fence):
    uid = fname.split("-", 1)[1]
    num = fname[:3]
    lex = [w if w.startswith("ru.lex.") else f"ru.lex.soc.{w}" for w in words]
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
    L.append('goal_id: "ru.goal.b2.society-policy"')
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
    L.append(f'  expected_interpretations: ["{title}: policy notice with taught forms only."]')
    L.append(f'  prohibited_ambiguity: ["{fence}"]')
    L.append('  target_proficiency: "B2"')
    L.append('  validation_method: "choice"')
    return "\n".join(L) + "\n"

for fname, title, summary, words, newitem, fence in U:
    with open(os.path.join(R, "curriculum", "units", fname + ".yaml"), "w") as f:
        f.write(unit_yaml(fname, title, summary, words, newitem, fence))

print("ru batch 63 written")
assert len(WORDS) == 50, len(WORDS)
