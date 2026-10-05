#!/usr/bin/env python3
"""ru-RU batch 64: B2 units 660-669 (policy options, costs, and benefits)."""
import json, os

R = "experiments/llm-pack-authoring/candidates/ru-fullkit-v1"
SRC = ["ru-original"]
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-05", "notes": "ai-drafted; needs dictionary sourcing and human review"}

WORDS = [
 ("alternativnyy","альтернативный","альтернатúвный","alternative (adj.)"),
 ("izderzhki","издержки","издéржки","costs, outlays"),
 ("ubytki","убытки","убúтки","losses"),
 ("kompensirovat","компенсировать","компенсúровать","to compensate"),
 ("vozmostit","возместить","возместúть","to reimburse"),
 ("profcit","профицит","профицúт","surplus"),
 ("ravnovesnyy","равновесный","равновéсный","equilibrium (adj.)"),
 ("ustoychivost","устойчивость","устойчúвость","stability, sustainability"),
 ("samostoyatelnost","самостоятельность","самостоятéльность","independence, self-reliance"),
 ("avtonomnyy","автономный","автономúвный","autonomous"),
 ("avtonomiya","автономия","автонóмия","autonomy"),
 ("samodostatochnyy","самодостаточный","самодостáточный","self-sufficient"),
 ("dostatok","достаток","достáток","prosperity, means"),
 ("zazhitochnyy","зажиточный","зажúточный","prosperous, well-off"),
 ("sostoyatelnyy","состоятельный","состоятéльный","affluent"),
 ("obespechennyy","обеспеченный","обеспéченный","well-off, provided for"),
 ("neobespechennyy","необеспеченный","необеспéченный","underprivileged"),
 ("neravnomernyy","неравномерный","неравномéрный","uneven"),
 ("variativnyy","вариативный","вариатúвный","variable, optional"),
 ("optsionalnyy","опциональный","опционáльный","optional"),
 ("dobavochnyy","добавочный","добавóчный","added, additional"),
 ("proizvodnyy","производный","производнúй","derivative"),
 ("skvoznoy","сквозной","сквознóй","end-to-end, through"),
 ("tochechnyy","точечный","тóчечный","pointwise, targeted"),
 ("adresnyy","адресный","адреснúй","targeted, addressed"),
 ("sekvestr","секвестр","секвéстр","sequestration"),
 ("sekvestirovanie","секвестирование","секвестúрование","sequestration"),
 ("urezanie","урезание","урезáние","cutting, curtailment"),
 ("urezat","урезать","урезáть","to cut, curtail"),
 ("restrukturizaciya","реструктуризация","реструктуризáция","restructuring"),
 ("restrukturirovat","реструктурировать","реструктурирúровать","to restructure"),
 ("konsolidaciya","консолидация","консолидáция","consolidation"),
 ("konsolidirovat","консолидировать","консолидúровать","to consolidate"),
 ("diversifikaciya","диверсификация","диверсификáция","diversification"),
 ("diversificirovat","диверсифицировать","диверсифицúровать","to diversify"),
 ("centralizaciya","централизация","централизáция","centralization"),
 ("centralizovannyy","централизованный","централизовáнный","centralized"),
 ("decentralizaciya","децентрализация","децентрализáция","decentralization"),
 ("decentralizovannyy","децентрализованный","децентрализовáнный","decentralized"),
 ("optimizirovat","оптимизировать","оптимизúровать","to optimize"),
 ("modernizirovat","модернизировать","модернизúровать","to modernize"),
 ("reinvestirovat","реинвестировать","реинвестúровать","to reinvest"),
 ("ekonomnyy","экономный","экóномный","economical"),
 ("berezhlivyy","бережливый","бережлúвый","thrifty"),
 ("rastochitelnyy","расточительный","расточúтельный","prodigal, wasteful"),
 ("rastochitelnost","расточительность","расточúтельность","prodigality"),
 ("dejstvennyy","действенный","дéйственный","effective, forceful"),
 ("rezultativnyy","результативный","результатúвный","productive, results-driven"),
 ("dejstvennost","действенность","дéйственность","effectiveness"),
 ("berezhlivost","бережливость","бережлúвость","thriftiness"),
]

def entry(rid, text, stress, gloss):
    return {"id": f"ru.lex.soc.{rid}", "status": "draft",
            "forms": [{"text": text}], "readings": [{"text": stress}],
            "glosses": {"en-US": [gloss]}, "sources": SRC, "generation": GEN}

with open(os.path.join(R, "lexicon", "soc2.jsonl"), "w") as f:
    for rid, text, stress, gloss in WORDS:
        f.write(json.dumps(entry(rid, text, stress, gloss), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ru.grammar.b2-variant-predpolagaet", "name": "Вариант предполагает + acc", "category": "syntax",
  "definition": "Policy options use вариант предполагает: вариант предполагает рост. Learn the supplied chunks as given."},
 {"id": "ru.grammar.b2-za-schet", "name": "За счёт + gen", "category": "syntax",
  "definition": "Funding sources use за счёт: за счёт бюджета. Learn the supplied chunks as given."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("u660","Это вариант.","This is an option.",["вариант"]),
 ("u661","Это секвестр.","This is sequestration.",["секвестр"]),
 ("u662","Это урезание.","This is a cut.",["урезание"]),
 ("u663","Это консолидация.","This is consolidation.",["консолидация"]),
 ("u664","Это децентрализация.","This is decentralization.",["децентрализация"]),
 ("u665","Это издержки.","These are costs.",["издержки"]),
 ("u666","Это профицит.","This is a surplus.",["профицит"]),
 ("u667","Это устойчивость.","This is stability.",["устойчивость"]),
 ("u668","Это достаток.","This is prosperity.",["достаток"]),
 ("u669","Это действенность.","This is effectiveness.",["действенность"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, gloss, cloze in SENTS:
        e = {"id": f"ru.sent.b2.{sid}", "status": "draft", "text": text, "gloss": gloss,
             "cloze_targets": cloze, "sources": SRC, "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

OLD_GRAM = ["ru.grammar.on-ramp.eto-identification", "ru.grammar.on-ramp.zero-present-copula"]

U = [
 ("660-pol-01","Options","альтернативный, вариативный, опциональный, добавочный and производный.",
  ["alternativnyy","variativnyy","optsionalnyy","dobavochnyy","proizvodnyy"], "s:u660",
  "Do not confuse вариативный (variable) with опциональный (optional)."),
 ("661-pol-02","Targeting","сквозной, точечный, адресный, секвестр and секвестирование.",
  ["skvoznoy","tochechnyy","adresnyy","sekvestr","sekvestirovanie"], "s:u661",
  "Do not confuse точечный (targeted) with сквозной (end-to-end)."),
 ("662-pol-03","Cuts","урезание, урезать, реструктуризация, реструктурировать and консолидация.",
  ["urezanie","urezat","restrukturizaciya","restrukturirovat","konsolidaciya"], "s:u662",
  "Do not confuse урезание (cutting) with реструктуризация (restructuring)."),
 ("663-pol-04","Consolidation","консолидировать, диверсификация, диверсифицировать, централизация and централизованный.",
  ["konsolidirovat","diversifikaciya","diversificirovat","centralizaciya","centralizovannyy"], "s:u663",
  "Do not confuse консолидировать (to consolidate) with диверсифицировать (to diversify)."),
 ("664-pol-05","Decentralization","децентрализация, децентрализованный, оптимизировать, модернизировать and реинвестировать.",
  ["decentralizaciya","decentralizovannyy","optimizirovat","modernizirovat","reinvestirovat"], "s:u664",
  "Do not confuse оптимизировать (to optimize) with модернизировать (to modernize)."),
 ("665-pol-06","Costs","издержки, убытки, компенсировать, возместить and профицит.",
  ["izderzhki","ubytki","kompensirovat","vozmostit","profcit"], "s:u665",
  "Do not confuse издержки (costs) with убытки (losses)."),
 ("666-pol-07","Balance","равновесный, устойчивость, самостоятельность, автономный and автономия.",
  ["ravnovesnyy","ustoychivost","samostoyatelnost","avtonomnyy","avtonomiya"], "s:u666",
  "Do not confuse автономия (autonomy) with самостоятельность (self-reliance)."),
 ("667-pol-08","Self-sufficiency","самодостаточный, достаток, зажиточный, состоятельный and обеспеченный.",
  ["samodostatochnyy","dostatok","zazhitochnyy","sostoyatelnyy","obespechennyy"], "s:u667",
  "Do not confuse достаток (prosperity) with обеспеченный (well-off)."),
 ("668-pol-09","Means","необеспеченный, неравномерный, экономный, бережливый and бережливость.",
  ["neobespechennyy","neravnomernyy","ekonomnyy","berezhlivyy","berezhlivost"], "s:u668",
  "Do not confuse экономный (economical) with бережливый (thrifty)."),
 ("669-pol-10","Effect","расточительный, расточительность, действенный, результативный and действенность.",
  ["rastochitelnyy","rastochitelnost","dejstvennyy","rezultativnyy","dejstvennost"], "s:u669",
  "Do not confuse действенность (effectiveness) with результативный (productive)."),
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

print("ru batch 64 written")
assert len(WORDS) == 50, len(WORDS)
