#!/usr/bin/env python3
"""ru-RU batch 74: B2 units 760-769 (intercultural comparison and perspective taking)."""
import json, os

R = "experiments/llm-pack-authoring/candidates/ru-fullkit-v1"
SRC = ["ru-original"]
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-05", "notes": "ai-drafted; needs dictionary sourcing and human review"}

WORDS = [
 ("mentalitet","менталитет","менталите́т","mentality"),
 ("mirovozzrenie","мировоззрение","мировоззре́ние","worldview"),
 ("nravy","нравы","нра́вы","mores, customs"),
 ("uklad","уклад","укла́д","way of life, order"),
 ("mirosvospriyatie","мировосприятие","мировосприятие́","world-perception"),
 ("etnos","этнос","э́тнос","ethnic group"),
 ("etnicheskij","этнический","этни́ческий","ethnic (adj.)"),
 ("narodnost","народность","на́родность","nationality, folk group"),
 ("plemya","племя","пле́мя","tribe, clan"),
 ("artel","артель","арте́ль","artel, cooperative"),
 ("empatiya","эмпатия","эмпатíя","empathy"),
 ("zalost","жалость","жа́лость","pity, compassion"),
 ("pricezhij","приезжий","прие́зжий","newcomer, outsider"),
 ("mestnyj","местный","ме́стный","local (adj.)"),
 ("korennoy","коренной","коренно́й","native, indigenous"),
 ("sushchestvovanie","сосуществование","сосуществова́ние","coexistence"),
 ("sushchestvovat","сосуществовать","сосуществова́ть","to coexist"),
 ("dvuyazychie","двуязычие","двуязы́чие","bilingualism"),
 ("mnogoyazychie","многоязычие","многоязы́чие","multilingualism"),
 ("arhaizm","архаизм","архаи́зм","archaism"),
 ("dialekt","диалект","диа́лект","dialect"),
 ("govor","говор","говóр","local speech, dialect"),
 ("bilingv","билингв","билингв́","bilingual person"),
 ("inkulturaciya","инкультурация","инкультура́ция","enculturation"),
 ("refleksiya","рефлексия","рефле́ксия","reflection, self-examination"),
 ("kosmopolitizm","космополитизм","космополити́зм","cosmopolitanism"),
 ("nacionalizm","национализм","национали́зм","nationalism"),
 ("internacionalizm","интернационализм","интернационали́зм","internationalism"),
 ("vesternizaciya","вестернизация","вестерниза́ция","Westernization"),
 ("tradicionalizm","традиционализм","традиционали́зм","traditionalism"),
 ("zastoy","застой","засто́й","stagnation"),
 ("smeshenie","смешение","смешéние","mixing, blending"),
 ("simbioz","симбиоз","симвио́з","symbiosis"),
 ("apropriaciya","апроприация","апроприа́ция","appropriation"),
 ("marginalizaciya","маргинализация","маргинализа́ция","marginalization"),
 ("segregaciya","сегрегация","сегрега́ция","segregation"),
 ("diskriminaciya","дискриминация","дискримина́ция","discrimination"),
 ("spravedlivost","справедливость","справедливость́","fairness, justice"),
 ("etiket","этикет","этике́т","etiquette"),
 ("folklor","фольклор","фолькло́р","folklore"),
 ("poslovica","пословица","послóвица","proverb"),
 ("pogovorka","поговорка","поговóрка","saying, idiom"),
 ("poverie","поверье","поверье́","folk belief"),
 ("radushnyj","радушный","ра́душный","cordial, warm-hearted"),
 ("gostepriimnyj","гостеприимный","гостеприи́мный","hospitable"),
 ("chuzhestranec","чужестранец","чужестранéц","foreigner, stranger"),
 ("sootechestvennik","соотечественник","сооте́чественник","compatriot"),
 ("nacionalnost","национальность","национа́льность","nationality"),
 ("ritual","ритуал","ритуа́л","ritual"),
 ("povsednevnost","повседневность","повседнéвность","everyday life, routine"),
]

def entry(rid, text, stress, gloss):
    return {"id": f"ru.lex.cult.{rid}", "status": "draft",
            "forms": [{"text": text}], "readings": [{"text": stress}],
            "glosses": {"en-US": [gloss]}, "sources": SRC, "generation": GEN}

with open(os.path.join(R, "lexicon", "cult4.jsonl"), "w") as f:
    for rid, text, stress, gloss in WORDS:
        f.write(json.dumps(entry(rid, text, stress, gloss), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ru.grammar.b2-po-sravneniyu-s", "name": "По сравнению с + instr", "category": "syntax",
  "definition": "Comparison uses по сравнению с: по сравнению с предками. Learn the supplied chunks as given."},
 {"id": "ru.grammar.b2-glazami-drugogo", "name": "Глазами другого + gen", "category": "syntax",
  "definition": "Perspective taking uses глазами + genitive: смотреть глазами другого. Learn the supplied chunks as given."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("u760","Это уклад.","This is a way of life.",["уклад"]),
 ("u761","Это этнос.","This is an ethnic group.",["этнос"]),
 ("u762","Это артель.","This is an artel.",["артель"]),
 ("u763","Это смешение.","This is a mixing.",["смешение"]),
 ("u764","Это диалект.","This is a dialect.",["диалект"]),
 ("u765","Это эмпатия.","This is empathy.",["эмпатия"]),
 ("u766","Это ритуал.","This is a ritual.",["ритуал"]),
 ("u767","Это фольклор.","This is folklore.",["фольклор"]),
 ("u768","Это национализм.","This is nationalism.",["национализм"]),
 ("u769","Это нравы.","These are mores.",["нравы"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, gloss, cloze in SENTS:
        e = {"id": f"ru.sent.b2.{sid}", "status": "draft", "text": text, "gloss": gloss,
             "cloze_targets": cloze, "sources": SRC, "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

OLD_GRAM = ["ru.grammar.on-ramp.eto-identification", "ru.grammar.on-ramp.zero-present-copula"]

U = [
 ("760-int-01","Worldviews","менталитет, мировоззрение, мировосприятие, рефлексия and уклад.",
  ["mentalitet","mirovozzrenie","mirosvospriyatie","refleksiya","uklad"], "s:u760",
  "Do not confuse мировоззрение (worldview) with мировосприятие (world-perception)."),
 ("761-int-02","Peoples","этнос, этнический, народность, национальность and племя.",
  ["etnos","etnicheskij","narodnost","nacionalnost","plemya"], "s:u761",
  "Do not confuse народность (folk group) with национальность (nationality)."),
 ("762-int-03","Insiders","артель, приезжий, местный, коренной and чужестранец.",
  ["artel","pricezhij","mestnyj","korennoy","chuzhestranec"], "s:u762",
  "Do not confuse приезжий (newcomer) with чужестранец (foreigner)."),
 ("763-int-04","Coexistence","сосуществование, сосуществовать, смешение, симбиоз and повседневность.",
  ["sushchestvovanie","sushchestvovat","smeshenie","simbioz","povsednevnost"], "s:u763",
  "Do not confuse смешение (mixing) with симбиоз (symbiosis)."),
 ("764-int-05","Languages","диалект, говор, двуязычие, многоязычие and билингв.",
  ["dialekt","govor","dvuyazychie","mnogoyazychie","bilingv"], "s:u764",
  "Do not confuse диалект (dialect) with говор (local speech)."),
 ("765-int-06","Empathy","эмпатия, жалость, радушный, гостеприимный and соотечественник.",
  ["empatiya","zalost","radushnyj","gostepriimnyj","sootechestvennik"], "s:u765",
  "Do not confuse эмпатия (empathy) with жалость (pity)."),
 ("766-int-07","Customs","этикет, ритуал, поверье, поговорка and пословица.",
  ["etiket","ritual","poverie","pogovorka","poslovica"], "s:u766",
  "Do not confuse пословица (proverb) with поговорка (saying)."),
 ("767-int-08","Tradition","фольклор, архаизм, застой, традиционализм and вестернизация.",
  ["folklor","arhaizm","zastoy","tradicionalizm","vesternizaciya"], "s:u767",
  "Do not confuse традиционализм (traditionalism) with архаизм (archaism)."),
 ("768-int-09","Ideologies","национализм, интернационализм, космополитизм, сегрегация and дискриминация.",
  ["nacionalizm","internacionalizm","kosmopolitizm","segregaciya","diskriminaciya"], "s:u768",
  "Do not confuse национализм (nationalism) with интернационализм (internationalism)."),
 ("769-int-10","Exchange","апроприация, маргинализация, справедливость, инкультурация and нравы.",
  ["apropriaciya","marginalizaciya","spravedlivost","inkulturaciya","nravy"], "s:u769",
  "Do not confuse апроприация (appropriation) with заимствование (borrowing)."),
]

def unit_yaml(fname, title, summary, words, newitem, fence):
    uid = fname.split("-", 1)[1]
    num = fname[:3]
    lex = [w if w.startswith("ru.lex.") else f"ru.lex.cult.{w}" for w in words]
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
    L.append('goal_id: "ru.goal.b2.culture-perspectives"')
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
    L.append(f'  expected_interpretations: ["{title}: literary response with taught forms only."]')
    L.append(f'  prohibited_ambiguity: ["{fence}"]')
    L.append('  target_proficiency: "B2"')
    L.append('  validation_method: "choice"')
    return "\n".join(L) + "\n"

for fname, title, summary, words, newitem, fence in U:
    with open(os.path.join(R, "curriculum", "units", fname + ".yaml"), "w") as f:
        f.write(unit_yaml(fname, title, summary, words, newitem, fence))

print("ru batch 74 written")
assert len(WORDS) == 50, len(WORDS)
