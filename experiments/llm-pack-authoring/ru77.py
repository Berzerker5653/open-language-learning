#!/usr/bin/env python3
"""ru-RU batch 77: B2 units 790-799 (cohesion, information flow, and emphasis)."""
import json, os

R = "experiments/llm-pack-authoring/candidates/ru-fullkit-v1"
SRC = ["ru-original"]
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-05", "notes": "ai-drafted; needs dictionary sourcing and human review"}

WORDS = [
 ("dublirovanie","дублирование","дубли́рование","duplication"),
 ("izbytochnost","избыточность","избы́точность","redundancy"),
 ("vstavka","вставка","вста́вка","insertion"),
 ("otstuplenie","отступление","отступле́ние","digression"),
 ("ekskurs","экскурс","экску́рс","excursion"),
 ("anafora","анафора","ана́фора","anaphora"),
 ("katafora","катафора","ката́фора","cataphora"),
 ("ellipsis","эллипсис","э́ллипсис","ellipsis"),
 ("parallelizm","параллелизм","параллели́зм","parallelism"),
 ("antiteza","антитеза","антите́за","antithesis"),
 ("sochlenenie","сочленение","сочлен\u0301ение","articulation, joint"),
 ("nepreryvnost","непрерывность","непрерывность́","continuity"),
 ("emfaza","эмфаза","э́мфаза","emphasis"),
 ("relefmost","рельефность","релье́фность","relief, definition"),
 ("vypuklost","выпуклость","выпу́клость","prominence"),
 ("rema","рема","ре́ма","rheme"),
 ("obosoblenie","обособление","обособле́ние","isolation, set-off"),
 ("modulyaciya","модуляция","модуля́ция","modulation"),
 ("ritmika","ритмика","ри́тмика","rhythmics"),
 ("kadenciya","каденция","каде́нция","cadence"),
 ("cezura","цезура","це́зура","caesura"),
 ("scepka","сцепка","сце́пка","link, hitch"),
 ("tkan","ткань","тка́нь","fabric, texture"),
 ("uzor","узор","узо́р","pattern"),
 ("ornament","орнамент","орнаме́нт","ornament"),
 ("dinamika","динамика","ди́намика","dynamics"),
 ("statika","статика","ста́тика","statics"),
 ("razryadka","разрядка","ра́рядка","resolution, discharge"),
 ("peripetiya","перипетия","перип\u0301етия","peripeteia"),
 ("zaostrenie","заострение","заостре́ние","sharpening"),
 ("sglazhivanie","сглаживание","сгла́живание","smoothing"),
 ("gladkost","гладкость","гла́дкость","smoothness"),
 ("plavnost","плавность","пла́вность","fluidity"),
 ("monotonnost","монотонность","моното́нность","monotony"),
 ("odnoobrazie","однообразие","одноо́бразие","monotony, uniformity"),
 ("raznoobrazie","разнообразие","разноо́бразие","variety, diversity"),
 ("nystykovka","нестыковка","несты́ковка","inconsistency, mismatch"),
 ("neuvyazka","неувязка","неу́вязка","inconsistency, discrepancy"),
 ("nasloenie","наслоение","насло\u0301ение","layering, superposition"),
 ("spletenie","сплетение","сплет\u0301ение","weaving, braid"),
 ("perepletenie","переплетение","переплет\u0301ение","interweaving"),
 ("kolorit","колорит","колори́т","coloring, local color"),
 ("akcentirovanie","акцентирование","акценти́рование","accenting"),
 ("intonirovanie","интонирование","интони́рование","intoning"),
 ("otrivistost","отрывистость","о́трывистость","choppiness, abruptness"),
 ("belletnistika","беллетристика","беллетристи́ка","belles-lettres"),
 ("kupura","купюра","купю́ра","censorship cut"),
 ("narashivanie","наращивание","нара́щивание","increment, buildup"),
 ("parodiya","пародия","па́родия","parody"),
 ("sceplenie","сцепление","сце́пление","coupling, cohesion"),
]

def entry(rid, text, stress, gloss):
    return {"id": f"ru.lex.style.{rid}", "status": "draft",
            "forms": [{"text": text}], "readings": [{"text": stress}],
            "glosses": {"en-US": [gloss]}, "sources": SRC, "generation": GEN}

with open(os.path.join(R, "lexicon", "style3.jsonl"), "w") as f:
    for rid, text, stress, gloss in WORDS:
        f.write(json.dumps(entry(rid, text, stress, gloss), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ru.grammar.b2-krome-togo", "name": "Кроме того", "category": "syntax",
  "definition": "Adding information for flow: кроме того, далее. Learn the supplied chunks as given."},
 {"id": "ru.grammar.b2-v-chastnosti", "name": "В частности", "category": "syntax",
  "definition": "Narrowing focus: в частности, например. Learn the supplied chunks as given."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("u790","Это купюра.","This is a cut.",["купюра"]),
 ("u791","Это антитеза.","This is an antithesis.",["антитеза"]),
 ("u792","Это экскурс.","This is an excursion.",["экскурс"]),
 ("u793","Это ткань.","This is a fabric.",["ткань"]),
 ("u794","Это узор.","This is a pattern.",["узор"]),
 ("u795","Это цезура.","This is a caesura.",["цезура"]),
 ("u796","Это эмфаза.","This is emphasis.",["эмфаза"]),
 ("u797","Это статика.","This is statics.",["статика"]),
 ("u798","Это гладкость.","This is smoothness.",["гладкость"]),
 ("u799","Это пародия.","This is a parody.",["пародия"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, gloss, cloze in SENTS:
        e = {"id": f"ru.sent.b2.{sid}", "status": "draft", "text": text, "gloss": gloss,
             "cloze_targets": cloze, "sources": SRC, "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

OLD_GRAM = ["ru.grammar.on-ramp.eto-identification", "ru.grammar.on-ramp.zero-present-copula"]

U = [
 ("790-coh-01","Redundancy","дублирование, избыточность, нестыковка, неувязка and купюра.",
  ["dublirovanie","izbytochnost","nystykovka","neuvyazka","kupura"], "s:u790",
  "Do not confuse нестыковка (mismatch) with неувязка (discrepancy)."),
 ("791-coh-02","Figures","анафора, катафора, эллипсис, параллелизм and антитеза.",
  ["anafora","katafora","ellipsis","parallelizm","antiteza"], "s:u791",
  "Do not confuse анафора (anaphora) with катафора (cataphora)."),
 ("792-coh-03","Flow","вставка, отступление, экскурс, наслоение and наращивание.",
  ["vstavka","otstuplenie","ekskurs","nasloenie","narashivanie"], "s:u792",
  "Do not confuse вставка (insertion) with отступление (digression)."),
 ("793-coh-04","Joints","сочленение, сцепка, сцепление, переплетение and ткань.",
  ["sochlenenie","scepka","sceplenie","perepletenie","tkan"], "s:u793",
  "Do not confuse сцепка (link) with сцепление (coupling)."),
 ("794-coh-05","Pattern","узор, орнамент, разнообразие, однообразие and сплетение.",
  ["uzor","ornament","raznoobrazie","odnoobrazie","spletenie"], "s:u794",
  "Do not confuse разнообразие (variety) with однообразие (monotony)."),
 ("795-coh-06","Rhythm","ритмика, каденция, цезура, модуляция and интонирование.",
  ["ritmika","kadenciya","cezura","modulyaciya","intonirovanie"], "s:u795",
  "Do not confuse каденция (cadence) with цезура (caesura)."),
 ("796-coh-07","Emphasis","эмфаза, акцентирование, выпуклость, рельефность and рема.",
  ["emfaza","akcentirovanie","vypuklost","relefmost","rema"], "s:u796",
  "Do not confuse эмфаза (emphasis) with акцентирование (accenting)."),
 ("797-coh-08","Dynamics","динамика, статика, разрядка, перипетия and непрерывность.",
  ["dinamika","statika","razryadka","peripetiya","nepreryvnost"], "s:u797",
  "Do not confuse динамика (dynamics) with статика (statics)."),
 ("798-coh-09","Smoothness","сглаживание, гладкость, плавность, монотонность and отрывистость.",
  ["sglazhivanie","gladkost","plavnost","monotonnost","otrivistost"], "s:u798",
  "Do not confuse гладкость (smoothness) with монотонность (monotony)."),
 ("799-coh-10","Style","беллетристика, пародия, обособление, заострение and колорит.",
  ["belletnistika","parodiya","obosoblenie","zaostrenie","kolorit"], "s:u799",
  "Do not confuse беллетристика (belles-lettres) with пародия (parody)."),
]

def unit_yaml(fname, title, summary, words, newitem, fence):
    uid = fname.split("-", 1)[1]
    num = fname[:3]
    lex = [w if w.startswith("ru.lex.") else f"ru.lex.style.{w}" for w in words]
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
    L.append('goal_id: "ru.goal.b2.style-register"')
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
    L.append(f'  expected_interpretations: ["{title}: precision response with taught forms only."]')
    L.append(f'  prohibited_ambiguity: ["{fence}"]')
    L.append('  target_proficiency: "B2"')
    L.append('  validation_method: "choice"')
    return "\n".join(L) + "\n"

for fname, title, summary, words, newitem, fence in U:
    with open(os.path.join(R, "curriculum", "units", fname + ".yaml"), "w") as f:
        f.write(unit_yaml(fname, title, summary, words, newitem, fence))

print("ru batch 77 written")
assert len(WORDS) == 50, len(WORDS)
