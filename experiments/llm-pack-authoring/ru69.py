#!/usr/bin/env python3
"""ru-RU batch 69: B2 units 710-719 (environmental choices and trade-offs)."""
import json, os

R = "experiments/llm-pack-authoring/candidates/ru-fullkit-v1"
SRC = ["ru-original"]
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-05", "notes": "ai-drafted; needs dictionary sourcing and human review"}

WORDS = [
 ("svalka","свалка","свáлка","dump, landfill"),
 ("poligon","полигон","полигóн","landfill site"),
 ("zahoronenie","захоронение","захоронéние","burial, disposal"),
 ("szhiganie","сжигание","сжигáние","incineration"),
 ("razdelnyy","раздельный","раздéльный","separate (collection)"),
 ("tara","тара","тарá","container, packaging"),
 ("organika","органика","оргáника","organic matter"),
 ("kompost","компост","компóст","compost"),
 ("kompostirovanie","компостирование","компостúрование","composting"),
 ("pestitsid","пестицид","пестицúд","pesticide"),
 ("gerbitsid","гербицид","гербицúд","herbicide"),
 ("insektitsid","инсектицид","инсектицúд","insecticide"),
 ("transgennyy","трансгенный","трансгéнный","transgenic"),
 ("klonirovanie","клонирование","клонúрование","cloning"),
 ("vymiranie","вымирание","вымирáние","extinction"),
 ("sokhranenie","сохранение","сохранéние","preservation, conservation"),
 ("zapovednik","заповедник","запóведник","nature reserve"),
 ("zakaznik","заказник","закáзник","wildlife sanctuary"),
 ("areal","ареал","ареáл","range, habitat area"),
 ("pereselenie","переселение","переселéние","resettlement"),
 ("rasselenie","расселение","расселéние","dispersal, settlement"),
 ("invaziya","инвазия","инвáзия","invasion"),
 ("invazivnyy","инвазивный","инвазúвный","invasive"),
 ("aborigennyy","аборигенный","аборигéнный","indigenous"),
 ("endemik","эндемик","эндéмик","endemic species"),
 ("chuzherodnyy","чужеродный","чужерóдный","alien, foreign"),
 ("adaptirovatsya","адаптироваться","адаптирóваться","to adapt (refl.)"),
 ("parnik","парник","пáрник","greenhouse"),
 ("parnikovyy","парниковый","парникóвый","greenhouse (adj.)"),
 ("ozonovyy","озоновый","озóновый","ozone (adj.)"),
 ("smog","смог","смо́г","smog"),
 ("tumannyy","туманный","тумáнный","foggy"),
 ("pavodok","паводок","павóдок","spring flood"),
 ("podtoplenie","подтопление","подтоплéние","partial flooding"),
 ("eroziya","эрозия","эрóзия","erosion"),
 ("opolzen","оползень","опóлзень","landslide"),
 ("zashushlivyy","засушливый","засýшливый","arid, dry"),
 ("osushenie","осушение","осушéние","drainage"),
 ("oroshenie","орошение","орошéние","irrigation"),
 ("irrigaciya","ирригация","ирригáция","irrigation"),
 ("vodosnabzhenie","водоснабжение","водоснабжéние","water supply"),
 ("kanalizaciya","канализация","канализáция","sewerage"),
 ("pritok","приток","притóк","tributary, inflow"),
 ("istok","исток","истóк","source, headwater"),
 ("otliv","отлив","óтлив","low tide"),
 ("vetryanoy","ветряной","ветрянóй","wind (adj.)"),
 ("vetroenergetika","ветроэнергетика","ветроэнергéтика","wind energy"),
 ("gidroenergetika","гидроэнергетика","гидроэнергéтика","hydro energy"),
 ("radioaktivnyy","радиоактивный","радиоакúвный","radioactive"),
 ("radioaktivnost","радиоактивность","радиоакúвность","radioactivity"),
]

def entry(rid, text, stress, gloss):
    return {"id": f"ru.lex.sci.{rid}", "status": "draft",
            "forms": [{"text": text}], "readings": [{"text": stress}],
            "glosses": {"en-US": [gloss]}, "sources": SRC, "generation": GEN}

with open(os.path.join(R, "lexicon", "sci3.jsonl"), "w") as f:
    for rid, text, stress, gloss in WORDS:
        f.write(json.dumps(entry(rid, text, stress, gloss), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ru.grammar.b2-chem-vsyo", "name": "Чем …, тем …", "category": "syntax",
  "definition": "Trade-offs use чем …, тем …: чем меньше отходов, тем чище воздух. Learn the supplied chunks as given."},
 {"id": "ru.grammar.b2-vo-obmen", "name": "В обмен на + acc", "category": "syntax",
  "definition": "Exchanges use в обмен на: в обмен на уступку. Learn the supplied chunks as given."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("u710","Это свалка.","This is a dump.",["свалка"]),
 ("u711","Это компост.","This is compost.",["компост"]),
 ("u712","Это пестицид.","This is a pesticide.",["пестицид"]),
 ("u713","Это заповедник.","This is a nature reserve.",["заповедник"]),
 ("u714","Это инвазия.","This is an invasion.",["инвазия"]),
 ("u715","Это эндемик.","This is an endemic species.",["эндемик"]),
 ("u716","Это смог.","This is smog.",["смог"]),
 ("u717","Это паводок.","This is a spring flood.",["паводок"]),
 ("u718","Это приток.","This is a tributary.",["приток"]),
 ("u719","Это эрозия.","This is erosion.",["эрозия"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, gloss, cloze in SENTS:
        e = {"id": f"ru.sent.b2.{sid}", "status": "draft", "text": text, "gloss": gloss,
             "cloze_targets": cloze, "sources": SRC, "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

OLD_GRAM = ["ru.grammar.on-ramp.eto-identification", "ru.grammar.on-ramp.zero-present-copula"]

U = [
 ("710-env-01","Waste","свалка, полигон, захоронение, сжигание and раздельный.",
  ["svalka","poligon","zahoronenie","szhiganie","razdelnyy"], "s:u710",
  "Do not confuse свалка (dump) with полигон (landfill site)."),
 ("711-env-02","Compost","тара, органика, компост, компостирование and парник.",
  ["tara","organika","kompost","kompostirovanie","parnik"], "s:u711",
  "Do not confuse компост (compost) with удобрение (fertilizer)."),
 ("712-env-03","Agro-bio","пестицид, гербицид, инсектицид, трансгенный and клонирование.",
  ["pestitsid","gerbitsid","insektitsid","transgennyy","klonirovanie"], "s:u712",
  "Do not confuse гербицид (herbicide) with инсектицид (insecticide)."),
 ("713-env-04","Conservation","вымирание, сохранение, заповедник, заказник and ареал.",
  ["vymiranie","sokhranenie","zapovednik","zakaznik","areal"], "s:u713",
  "Do not confuse заповедник (nature reserve) with заказник (sanctuary)."),
 ("714-env-05","Populations","переселение, расселение, инвазия, инвазивный and аборигенный.",
  ["pereselenie","rasselenie","invaziya","invazivnyy","aborigennyy"], "s:u714",
  "Do not confuse переселение (resettlement) with расселение (dispersal)."),
 ("715-env-06","Balance","чужеродный, эндемик, адаптироваться, парниковый and озоновый.",
  ["chuzherodnyy","endemik","adaptirovatsya","parnikovyy","ozonovyy"], "s:u715",
  "Do not confuse парниковый (greenhouse) with озоновый (ozone)."),
 ("716-env-07","Energy","смог, туманный, ветряной, ветроэнергетика and гидроэнергетика.",
  ["smog","tumannyy","vetryanoy","vetroenergetika","gidroenergetika"], "s:u716",
  "Do not confuse ветроэнергетика (wind energy) with гидроэнергетика (hydro energy)."),
 ("717-env-08","Water","паводок, подтопление, осушение, орошение and ирригация.",
  ["pavodok","podtoplenie","osushenie","oroshenie","irrigaciya"], "s:u717",
  "Do not confuse орошение (irrigation) with осушение (drainage)."),
 ("718-env-09","Water systems","водоснабжение, канализация, приток, исток and отлив.",
  ["vodosnabzhenie","kanalizaciya","pritok","istok","otliv"], "s:u718",
  "Do not confuse приток (tributary) with исток (source)."),
 ("719-env-10","Hazards","эрозия, оползень, засушливый, радиоактивный and радиоактивность.",
  ["eroziya","opolzen","zashushlivyy","radioaktivnyy","radioaktivnost"], "s:u719",
  "Do not confuse эрозия (erosion) with оползень (landslide)."),
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

print("ru batch 69 written")
assert len(WORDS) == 50, len(WORDS)
