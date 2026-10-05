#!/usr/bin/env python3
"""ru-RU batch 68: B2 units 700-709 (technology, applications, and impacts)."""
import json, os

R = "experiments/llm-pack-authoring/candidates/ru-fullkit-v1"
SRC = ["ru-original"]
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-05", "notes": "ai-drafted; needs dictionary sourcing and human review"}

WORDS = [
 ("texnologicheskiy","технологический","технологúческий","technological"),
 ("vnedrenie","внедрение","внедрéние","implementation, deployment"),
 ("vnedrit","внедрить","внедрúть","to implement (pf.)"),
 ("vnedryat","внедрять","внедрýть","to implement"),
 ("analogovyy","аналоговый","аналóговый","analog (adj.)"),
 ("skanirovat","сканировать","сканúровать","to scan"),
 ("perekluchatel","переключатель","переключáтель","switch"),
 ("tumbler","тумблер","тумблéр","toggle switch"),
 ("displey","дисплей","дисплéй","display"),
 ("processor","процессор","процéссор","processor"),
 ("mikroschema","микросхема","микросхéма","microchip"),
 ("poluprovodnik","полупроводник","полупровóдник","semiconductor"),
 ("izolator","изолятор","изолýтор","insulator"),
 ("akkumulyator","аккумулятор","аккумýлятор","rechargeable battery"),
 ("razryazhat","разряжать","разряжáть","to discharge"),
 ("turbina","турбина","турбúна","turbine"),
 ("transformator","трансформатор","трансформáтор","transformer"),
 ("telekommunikacii","телекоммуникации","телекоммунúкации","telecommunications"),
 ("antena","антенна","антéнна","antenna"),
 ("glushenie","глушение","глушéние","suppression, jamming"),
 ("shifrovanie","шифрование","шифрóвание","encryption"),
 ("shifrovat","шифровать","шифрúвать","to encrypt"),
 ("vzlom","взлом","взлóм","hacking, break-in"),
 ("vzlomat","взломать","взломáть","to hack"),
 ("hacker","хакер","хáкер","hacker"),
 ("bresh","брешь","бре́шь","breach, gap"),
 ("iznos","износ","изнóс","wear"),
 ("smazka","смазка","смáзка","lubrication"),
 ("podshipnik","подшипник","подшúпник","bearing"),
 ("agregat","агрегат","агрегáт","aggregate unit, assembly"),
 ("sborochnyy","сборочный","сборóчный","assembly (adj.)"),
 ("montazh","монтаж","монта́ж","installation, assembly"),
 ("demontazh","демонтаж","демонта́ж","dismantling"),
 ("naladchik","наладчик","налáдчик","commissioning engineer, fitter"),
 ("pusk","пуск","пýск","start, startup"),
 ("razgon","разгон","разгóн","acceleration, spin-up"),
 ("konveyernyy","конвейерный","конвéйерный","conveyor (adj.)"),
 ("robototehnika","робототехника","робототéхника","robotics"),
 ("kibernetika","кибернетика","кибернéтика","cybernetics"),
 ("algoritmicheskiy","алгоритмический","алгоритмúческий","algorithmic"),
 ("vychislitelnyy","вычислительный","вычислúтельный","computing (adj.)"),
 ("translirovat","транслировать","транслúровать","to broadcast, relay"),
 ("sputnikovyy","спутниковый","спýтниковый","satellite (adj.)"),
 ("navigacionnyy","навигационный","навигациóнный","navigation (adj.)"),
 ("marshrutizaciya","маршрутизация","маршрутизáция","routing"),
 ("marshrutizator","маршрутизатор","маршрутизáтор","router"),
 ("oblachnyy","облачный","облáчный","cloud (adj.)"),
 ("raspoznavanie","распознавание","распознáвание","recognition"),
 ("autentifikaciya","аутентификация","аутентификáция","authentication"),
 ("biometriya","биометрия","биомéтрия","biometrics"),
]

def entry(rid, text, stress, gloss):
    return {"id": f"ru.lex.sci.{rid}", "status": "draft",
            "forms": [{"text": text}], "readings": [{"text": stress}],
            "glosses": {"en-US": [gloss]}, "sources": SRC, "generation": GEN}

with open(os.path.join(R, "lexicon", "sci2.jsonl"), "w") as f:
    for rid, text, stress, gloss in WORDS:
        f.write(json.dumps(entry(rid, text, stress, gloss), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ru.grammar.b2-s-pomoshchyu", "name": "С помощью + gen", "category": "syntax",
  "definition": "Applications use с помощью: с помощью датчика. Learn the supplied chunks as given."},
 {"id": "ru.grammar.b2-privodit-k", "name": "Приводит к + dat", "category": "syntax",
  "definition": "Impacts use приводит к: приводит к износу. Learn the supplied chunks as given."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("u700","Это внедрение.","This is an implementation.",["внедрение"]),
 ("u701","Это тумблер.","This is a toggle switch.",["тумблер"]),
 ("u702","Это процессор.","This is a processor.",["процессор"]),
 ("u703","Это турбина.","This is a turbine.",["турбина"]),
 ("u704","Это антенна.","This is an antenna.",["антенна"]),
 ("u705","Это маршрутизатор.","This is a router.",["маршрутизатор"]),
 ("u706","Это шифрование.","This is encryption.",["шифрование"]),
 ("u707","Это биометрия.","This is biometrics.",["биометрия"]),
 ("u708","Это износ.","This is wear.",["износ"]),
 ("u709","Это монтаж.","This is installation.",["монтаж"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, gloss, cloze in SENTS:
        e = {"id": f"ru.sent.b2.{sid}", "status": "draft", "text": text, "gloss": gloss,
             "cloze_targets": cloze, "sources": SRC, "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

OLD_GRAM = ["ru.grammar.on-ramp.eto-identification", "ru.grammar.on-ramp.zero-present-copula"]

U = [
 ("700-tec-01","Deployment","технологический, внедрение, внедрить, внедрять and конвейерный.",
  ["texnologicheskiy","vnedrenie","vnedrit","vnedryat","konveyernyy"], "s:u700",
  "Do not confuse внедрение (deployment) with использование (use)."),
 ("701-tec-02","Controls","аналоговый, сканировать, дисплей, переключатель and тумблер.",
  ["analogovyy","skanirovat","displey","perekluchatel","tumbler"], "s:u701",
  "Do not confuse переключатель (switch) with тумблер (toggle switch)."),
 ("702-tec-03","Chips","процессор, микросхема, полупроводник, изолятор and аккумулятор.",
  ["processor","mikroschema","poluprovodnik","izolator","akkumulyator"], "s:u702",
  "Do not confuse полупроводник (semiconductor) with изолятор (insulator)."),
 ("703-tec-04","Power","разряжать, турбина, трансформатор, разгон and вычислительный.",
  ["razryazhat","turbina","transformator","razgon","vychislitelnyy"], "s:u703",
  "Do not confuse разряжать (to discharge) with заряжать (to charge)."),
 ("704-tec-05","Comms","телекоммуникации, антенна, транслировать, спутниковый and навигационный.",
  ["telekommunikacii","antena","translirovat","sputnikovyy","navigacionnyy"], "s:u704",
  "Do not confuse транслировать (to broadcast) with передавать (to transmit)."),
 ("705-tec-06","Networks","маршрутизация, маршрутизатор, облачный, кибернетика and алгоритмический.",
  ["marshrutizaciya","marshrutizator","oblachnyy","kibernetika","algoritmicheskiy"], "s:u705",
  "Do not confuse маршрутизация (routing) with навигация (navigation)."),
 ("706-tec-07","Security","шифрование, шифровать, взлом, взломать and хакер.",
  ["shifrovanie","shifrovat","vzlom","vzlomat","hacker"], "s:u706",
  "Do not confuse шифрование (encryption) with взлом (hacking)."),
 ("707-tec-08","Access","брешь, аутентификация, биометрия, распознавание and глушение.",
  ["bresh","autentifikaciya","biometriya","raspoznavanie","glushenie"], "s:u707",
  "Do not confuse аутентификация (authentication) with верификация (verification)."),
 ("708-tec-09","Wear","износ, смазка, подшипник, агрегат and сборочный.",
  ["iznos","smazka","podshipnik","agregat","sborochnyy"], "s:u708",
  "Do not confuse износ (wear) with поломка (breakdown)."),
 ("709-tec-10","Assembly","монтаж, демонтаж, наладчик, пуск and робототехника.",
  ["montazh","demontazh","naladchik","pusk","robototehnika"], "s:u709",
  "Do not confuse монтаж (installation) with демонтаж (dismantling)."),
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

print("ru batch 68 written")
assert len(WORDS) == 50, len(WORDS)
