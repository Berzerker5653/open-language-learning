#!/usr/bin/env python3
"""ru-RU batch 32: B1 units 340-349 (alternative views, respectful responses)."""
import json, os

R = "experiments/llm-pack-authoring/candidates/ru-fullkit-v1"
SRC = ["ru-original"]
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-05", "notes": "ai-drafted; needs dictionary sourcing and human review"}

WORDS = [
 ("alternativa","альтернатива","альтернатúва","alternative"),
 ("rakis","ракурс","раку́рс","angle"),
 ("aspekt","аспект","аспéкт","aspect"),
 ("gran2","грань","грань","facet"),
 ("storona","сторона","сторона́","side"),
 ("vezhlivost","вежливость","ве́жливость","politeness"),
 ("takt","такт","такт","tact"),
 ("taktichnost","тактичность","та́ктичность","tactfulness"),
 ("utchtivost","учтивость","у́чтивость","courtesy"),
 ("grubost","грубость","гру́бость","rudeness"),
 ("hamstvo","хамство","ха́мство","gross rudeness"),
 ("derzost","дерзость","де́рзость","boldness"),
 ("naglost","наглость","на́глость","impudence"),
 ("skromnost","скромность","скро́мность","modesty"),
 ("pochtenie","почтение","почтéние","deference"),
 ("tolerantnost","толерантность","толерáнтность","tolerance"),
 ("predubezhdenie","предубеждение","предубежде́ние","prejudice"),
 ("stereotip","стереотип","стереоти́п","stereotype"),
 ("predrassudok","предрассудок","предрассу́док","superstition, bias"),
 ("predvzyatost","предвзятость","предвзя́тость","bias"),
 ("obektivnost","объективность","объекти́вность","objectivity"),
 ("subektivnost","субъективность","субъекти́вность","subjectivity"),
 ("nejtralitet","нейтралитет","нейтралитéт","neutrality"),
 ("bespristrastnost","беспристрастность","беспристра́стность","impartiality"),
 ("sderzhannost","сдержанность","сде́ржанность","restraint"),
 ("vyderzhka","выдержка","вы́держка","patience"),
 ("hladnokrovie","хладнокровие","хладнокро́вие","composure"),
 ("samoobladanie","самообладание","самооблáдание","self-control"),
 ("terpimost","терпимость","те́рпимость","tolerance"),
 ("ustupka","уступка","усту́пка","concession"),
 ("dobrozhelatelnost","доброжелательность","доброжелáтельность","goodwill"),
 ("vrazhdebnost","враждебность","вражде́бность","hostility"),
 ("vrazhda","вражда","вражда́","enmity"),
 ("druzhelyubie","дружелюбие","дружелю́бие","friendliness"),
 ("otkrytost","открытость","откры́тость","openness"),
 ("zakrytost","закрытость","закры́тость","closedness"),
 ("doverchivost","доверчивость","дове́рчивость","gullibility"),
 ("noverie","недоверие","недове́рие","distrust"),
 ("podozritelost","подозрительность","подозри́тельность","suspiciousness"),
 ("ostorozhnost","осторожность","осто́рожность","caution"),
 ("reshitelnost","решительность","реши́тельность","decisiveness"),
 ("nereshitelnost","нерешительность","нерешúтельность","indecisiveness"),
 ("kolebanie","колебание","колеба́ние","hesitation"),
 ("promedlenie","промедление","промéдление","delay"),
 ("toroplivost","торопливость","торопли́вость","rashness"),
 ("pospeshnost","поспешность","поспе́шность","haste"),
 ("vyvod2","вывод","вы́вод","conclusion"),
 ("mnenie2","мнение","мнéние","opinion"),
 ("glas2","глас","гла́с","voice (public)"),
 ("golosa2","голоса","голоса́","voices (pl)"),
]

def entry(rid, text, stress, gloss):
    return {"id": f"ru.lex.respect.{rid}", "status": "draft",
            "forms": [{"text": text}], "readings": [{"text": stress}],
            "glosses": {"en-US": [gloss]}, "sources": SRC, "generation": GEN}

with open(os.path.join(R, "lexicon", "respect.jsonl"), "w") as f:
    for rid, text, stress, gloss in WORDS:
        f.write(json.dumps(entry(rid, text, stress, gloss), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ru.grammar.b1.sdrugoy-storony", "name": "С другой стороны", "category": "syntax",
  "definition": "Alternative views use с другой стороны: с другой стороны, это полезно. Learn the supplied chunks as given."},
 {"id": "ru.grammar.b1.ya-vashego-mneniya", "name": "Respectful disagreement chunks", "category": "syntax",
  "definition": "Polite disagreement uses я вас понимаю, но: я вас понимаю, но не согласен. Learn the supplied chunks."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("u340","Это альтернатива.","This is an alternative.",["альтернатива"]),
 ("u341","Это вежливость.","This is politeness.",["вежливость"]),
 ("u342","Это такт.","This is tact.",["такт"]),
 ("u343","Это грубость.","This is rudeness.",["грубость"]),
 ("u344","Это скромность.","This is modesty.",["скромность"]),
 ("u345","Это стереотип.","This is a stereotype.",["стереотип"]),
 ("u346","Это вражда.","This is enmity.",["вражда"]),
 ("u347","Это открытость.","This is openness.",["открытость"]),
 ("u348","Это осторожность.","This is caution.",["осторожность"]),
 ("u349","Это уступка.","This is a concession.",["уступка"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, gloss, cloze in SENTS:
        e = {"id": f"ru.sent.b1.{sid}", "status": "draft", "text": text, "gloss": gloss,
             "cloze_targets": cloze, "sources": SRC, "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

OLD_GRAM = ["ru.grammar.on-ramp.eto-identification", "ru.grammar.on-ramp.zero-present-copula"]

U = [
 ("340-respect-01","Alternative","альтернатива, ракурс, аспект, грань and сторона.",
  ["alternativa","rakis","aspekt","gran2","storona"], "s:u340",
  "Do not confuse ракурс (angle) with аспект (aspect)."),
 ("341-respect-02","Politeness","вежливость, учтивость, такт, тактичность and почтение.",
  ["vezhlivost","utchtivost","takt","taktichnost","pochtenie"], "s:u341",
  "Do not confuse учтивость (courtesy) with вежливость (politeness)."),
 ("342-respect-03","Tact","такт, тактичность, скромность, сдержанность and выдержка.",
  ["takt","taktichnost","skromnost","sderzhannost","vyderzhka"], "s:u342",
  "Do not confuse сдержанность (restraint) with выдержка (patience)."),
 ("343-respect-04","Rudeness","грубость, хамство, дерзость, наглость and враждебность.",
  ["grubost","hamstvo","derzost","naglost","vrazhdebnost"], "s:u343",
  "Do not confuse хамство (gross rudeness) with дерзость (boldness)."),
 ("344-respect-05","Modesty","скромность, самообладание, хладнокровие, терпимость and толерантность.",
  ["skromnost","samoobladanie","hladnokrovie","terpimost","tolerantnost"], "s:u344",
  "Do not confuse терпимость (tolerance) with толерантность (tolerance)."),
 ("345-respect-06","Stereotype","стереотип, предубеждение, предрассудок, предвзятость and недоверие.",
  ["stereotip","predubezhdenie","predrassudok","predvzyatost","noverie"], "s:u345",
  "Do not confuse предубеждение (prejudice) with предрассудок (bias)."),
 ("346-respect-07","Enmity","вражда, враждебность, недоверие, подозрительность and закрытость.",
  ["vrazhda","vrazhdebnost","noverie","podozritelost","zakrytost"], "s:u346",
  "Do not confuse вражда (enmity) with враждебность (hostility)."),
 ("347-respect-08","Openness","открытость, дружелюбие, доброжелательность, доверчивость and объективность.",
  ["otkrytost","druzhelyubie","dobrozhelatelnost","doverchivost","obektivnost"], "s:u347",
  "Do not confuse доверчивость (gullibility) with открытость (openness)."),
 ("348-respect-09","Caution","осторожность, нерешительность, колебание, промедление and торопливость.",
  ["ostorozhnost","nereshitelnost","kolebanie","promedlenie","toroplivost"], "s:u348",
  "Do not confuse колебание (hesitation) with промедление (delay)."),
 ("349-respect-10","Concession","уступка, нейтралитет, беспристрастность, субъективность and решительность.",
  ["ustupka","nejtralitet","bespristrastnost","subektivnost","reshitelnost"], "s:u349",
  "Do not confuse нейтралитет (neutrality) with беспристрастность (impartiality)."),
]

def unit_yaml(fname, title, summary, words, newitem, fence):
    uid = fname.split("-", 1)[1]
    num = fname[:3]
    lex = [w if w.startswith("ru.lex.") else f"ru.lex.respect.{w}" for w in words]
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
    L.append('goal_id: "ru.goal.b1.opinions"')
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
    L.append(f'  expected_interpretations: ["{title}: respect with taught forms only."]')
    L.append(f'  prohibited_ambiguity: ["{fence}"]')
    L.append('  target_proficiency: "B1"')
    L.append('  validation_method: "choice"')
    return "\n".join(L) + "\n"

for fname, title, summary, words, newitem, fence in U:
    with open(os.path.join(R, "curriculum", "units", fname + ".yaml"), "w") as f:
        f.write(unit_yaml(fname, title, summary, words, newitem, fence))

print("ru batch 32 written")
assert len(WORDS) == 50, len(WORDS)
