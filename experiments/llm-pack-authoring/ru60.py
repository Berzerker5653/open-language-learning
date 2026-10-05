#!/usr/bin/env python3
"""ru-RU batch 60: B2 units 620-629 (competing positions and priorities)."""
import json, os

R = "experiments/llm-pack-authoring/candidates/ru-fullkit-v1"
SRC = ["ru-original"]
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-05", "notes": "ai-drafted; needs dictionary sourcing and human review"}

WORDS = [
 ("prioritetnyy","приоритетный","приоритéтный","priority (adj.)"),
 ("pervochederednoy","первоочередной","первоочереднóй","top-priority"),
 ("vesomost","весомость","весóмость","weight, importance"),
 ("srochnost","срочность","срóчность","urgency"),
 ("otsrochka","отсрочка","óтсрочка","deferral"),
 ("otsrochit","отсрочить","отсрóчить","to defer"),
 ("priostranovit","приостановить","приостанóвить","to suspend"),
 ("priostranovka","приостановка","приостанóвка","suspension"),
 ("vozobnovit","возобновить","возобновúть","to resume"),
 ("vozobnovlenie","возобновление","возобновлéние","resumption"),
 ("zamorozit","заморозить","заморóзить","to freeze"),
 ("zamorozka","заморозка","замóрозка","freeze"),
 ("uskorit","ускорить","ускóрить","to accelerate"),
 ("uskorenie","ускорение","ускóрение","acceleration"),
 ("zamedlit","замедлить","замéдлить","to slow down"),
 ("zamedlenie","замедление","замéдление","deceleration"),
 ("tormozhenie","торможение","торможéние","braking, slowdown"),
 ("lobbirovanie","лоббирование","лоббúрование","lobbying"),
 ("lobhist","лоббист","лóббист","lobbyist"),
 ("deviz","девиз","девúз","motto"),
 ("slogan","слоган","слогáн","slogan"),
 ("prestizhnyy","престижный","прести́жный","prestigious"),
 ("konkurirovat","конкурировать","конкури́ровать","to compete"),
 ("vneocherednoy","внеочередной","внеочереднóй","out of turn, extraordinary"),
 ("ocherednost","очередность","очерéдность","sequence, turn"),
 ("nepasledovatelnyy","непоследовательный","непоследóвательный","inconsistent"),
 ("vliyatelnyy","влиятельный","влиятéльный","influential"),
 ("konkurentnyy","конкурентный","конкурéнтный","competitive"),
 ("sopernichestvo","соперничество","сопéрничество","rivalry"),
 ("koaliciya","коалиция","коалúция","coalition"),
 ("aljans","альянс","альýнс","alliance"),
 ("lavirovanie","лавирование","лавúрование","maneuvering"),
 ("uklonchivyy","уклончивый","уклóнчивый","evasive"),
 ("uklonyatsya","уклоняться","уклонýться","to evade"),
 ("izvorotlivyy","изворотливый","извóротливый","dodgy, resourceful"),
 ("trebovatelnyy","требовательный","требовáтельный","demanding"),
 ("trebovatelnost","требовательность","требовáтельность","demandingness"),
 ("prityazanie","притязание","притýзание","pretension"),
 ("prityazatelnyy","притязательный","притýзательный","pretentious"),
 ("appetity","аппетиты","áппетиты","appetites, ambitions"),
 ("prioritisaciya","приоритизация","приоритизáция","prioritization"),
 ("ranzhirovanie","ранжирование","ранжúрование","ranking"),
 ("ranzhirovat","ранжировать","рáнжировать","to rank"),
 ("dominirovanie","доминирование","доминúрование","domination"),
 ("dominirovat","доминировать","домúнировать","to dominate"),
 ("gegemoniya","гегемония","гегемóния","hegemony"),
 ("dumping","демпинг","дéмпинг","dumping"),
 ("sabotazh","саботаж","саботáж","sabotage"),
 ("sabotirovat","саботировать","саботúровать","to sabotage"),
 ("boykot","бойкот","бойкóт","boycott"),
]

def entry(rid, text, stress, gloss):
    return {"id": f"ru.lex.neg.{rid}", "status": "draft",
            "forms": [{"text": text}], "readings": [{"text": stress}],
            "glosses": {"en-US": [gloss]}, "sources": SRC, "generation": GEN}

with open(os.path.join(R, "lexicon", "neg2.jsonl"), "w") as f:
    for rid, text, stress, gloss in WORDS:
        f.write(json.dumps(entry(rid, text, stress, gloss), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ru.grammar.b2-v-prioritete", "name": "В приоритете + noun", "category": "syntax",
  "definition": "Priorities use в приоритете: в приоритете срок. Learn the supplied chunks as given."},
 {"id": "ru.grammar.b2-my-ne-soglasny", "name": "Мы не согласны с + instr", "category": "syntax",
  "definition": "Competing positions use мы не согласны с: мы не согласны с условием. Learn the supplied chunks as given."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("u620","Это отсрочка.","This is a deferral.",["отсрочка"]),
 ("u621","Это срочность.","This is urgency.",["срочность"]),
 ("u622","Это заморозка.","This is a freeze.",["заморозка"]),
 ("u623","Это ускорение.","This is acceleration.",["ускорение"]),
 ("u624","Это лоббист.","This is a lobbyist.",["лоббист"]),
 ("u625","Это девиз.","This is a motto.",["девиз"]),
 ("u626","Это коалиция.","This is a coalition.",["коалиция"]),
 ("u627","Это альянс.","This is an alliance.",["альянс"]),
 ("u628","Это притязание.","This is a pretension.",["притязание"]),
 ("u629","Это бойкот.","This is a boycott.",["бойкот"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, gloss, cloze in SENTS:
        e = {"id": f"ru.sent.b2.{sid}", "status": "draft", "text": text, "gloss": gloss,
             "cloze_targets": cloze, "sources": SRC, "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

OLD_GRAM = ["ru.grammar.on-ramp.eto-identification", "ru.grammar.on-ramp.zero-present-copula"]

U = [
 ("620-comp-01","Priorities","приоритетный, первоочередной, приоритизация, ранжирование and ранжировать.",
  ["prioritetnyy","pervochederednoy","prioritisaciya","ranzhirovanie","ranzhirovat"], "s:u620",
  "Do not confuse приоритетный (priority) with первоочередной (top-priority)."),
 ("621-comp-02","Urgency","весомость, срочность, отсрочка, отсрочить and внеочередной.",
  ["vesomost","srochnost","otsrochka","otsrochit","vneocherednoy"], "s:u621",
  "Do not confuse срочность (urgency) with весомость (importance)."),
 ("622-comp-03","Suspension","приостановить, приостановка, возобновить, возобновление and заморозить.",
  ["priostranovit","priostranovka","vozobnovit","vozobnovlenie","zamorozit"], "s:u622",
  "Do not confuse приостановить (to suspend) with возобновить (to resume)."),
 ("623-comp-04","Momentum","заморозка, ускорить, ускорение, замедлить and замедление.",
  ["zamorozka","uskorit","uskorenie","zamedlit","zamedlenie"], "s:u623",
  "Do not confuse ускорить (to accelerate) with замедлить (to slow down)."),
 ("624-comp-05","Lobbying","торможение, лоббирование, лоббист, девиз and слоган.",
  ["tormozhenie","lobbirovanie","lobhist","deviz","slogan"], "s:u624",
  "Do not confuse лоббист (lobbyist) with девиз (motto)."),
 ("625-comp-06","Standing","престижный, влиятельный, очередность, непоследовательный and гегемония.",
  ["prestizhnyy","vliyatelnyy","ocherednost","nepasledovatelnyy","gegemoniya"], "s:u625",
  "Do not confuse престижный (prestigious) with влиятельный (influential)."),
 ("626-comp-07","Competition","конкурировать, конкурентный, соперничество, коалиция and альянс.",
  ["konkurirovat","konkurentnyy","sopernichestvo","koaliciya","aljans"], "s:u626",
  "Do not confuse коалиция (coalition) with альянс (alliance)."),
 ("627-comp-08","Maneuvering","лавирование, уклончивый, уклоняться, изворотливый and демпинг.",
  ["lavirovanie","uklonchivyy","uklonyatsya","izvorotlivyy","dumping"], "s:u627",
  "Do not confuse уклоняться (to evade) with лавирование (maneuvering)."),
 ("628-comp-09","Demands","требовательный, требовательность, притязание, притязательный and аппетиты.",
  ["trebovatelnyy","trebovatelnost","prityazanie","prityazatelnyy","appetity"], "s:u628",
  "Do not confuse притязание (pretension) with аппетиты (ambitions)."),
 ("629-comp-10","Hardball","доминирование, доминировать, саботаж, саботировать and бойкот.",
  ["dominirovanie","dominirovat","sabotazh","sabotirovat","boykot"], "s:u629",
  "Do not confuse саботаж (sabotage) with бойкот (boycott)."),
]

def unit_yaml(fname, title, summary, words, newitem, fence):
    uid = fname.split("-", 1)[1]
    num = fname[:3]
    lex = [w if w.startswith("ru.lex.") else f"ru.lex.neg.{w}" for w in words]
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
    L.append('goal_id: "ru.goal.b2.negotiation"')
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
    L.append(f'  expected_interpretations: ["{title}: negotiation exchange with taught forms only."]')
    L.append(f'  prohibited_ambiguity: ["{fence}"]')
    L.append('  target_proficiency: "B2"')
    L.append('  validation_method: "choice"')
    return "\n".join(L) + "\n"

for fname, title, summary, words, newitem, fence in U:
    with open(os.path.join(R, "curriculum", "units", fname + ".yaml"), "w") as f:
        f.write(unit_yaml(fname, title, summary, words, newitem, fence))

print("ru batch 60 written")
assert len(WORDS) == 50, len(WORDS)
