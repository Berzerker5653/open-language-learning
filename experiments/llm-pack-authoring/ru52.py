#!/usr/bin/env python3
"""ru-RU batch 52: B2 units 540-549 (structured notes and conceptual relationships)."""
import json, os

R = "experiments/llm-pack-authoring/candidates/ru-fullkit-v1"
SRC = ["ru-original"]
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-05", "notes": "ai-drafted; needs dictionary sourcing and human review"}

WORDS = [
 ("pometka","пометка","пóметка","note, annotation"),
 ("infografika","инфографика","инфогрáфика","infographics"),
 ("hronologiya","хронология","хронолóгия","chronology"),
 ("vzaimodeystvie","взаимодействие","взаимодействéние","interaction"),
 ("vozdeystvie","воздействие","воздéйствие","impact, effect"),
 ("otdacha","отдача","отдáча","feedback, return"),
 ("potok","поток","потóк","flow, stream"),
 ("obekt","объект","объéкт","object"),
 ("subekt","субъект","субъéкт","subject"),
 ("funkciya","функция","фýнкция","function"),
 ("naznachenie","назначение","назначéние","purpose, assignment"),
 ("mestopolozhenie","местоположение","местоположéние","location"),
 ("raspolozhenie","расположение","расположéние","arrangement"),
 ("stroenie","строение","стрóение","structure, build"),
 ("komponent","компонент","компонéнт","component"),
 ("sostavlyayushchaya","составляющая","составлýющая","component, constituent"),
 ("zveno","звено","знéно","link, member"),
 ("cep","цепь","цепь","chain"),
 ("cepochka","цепочка","цéпочка","chain, sequence"),
 ("duga","дуга","дýга","arc"),
 ("petlya","петля","пéтля","loop"),
 ("kontur","контур","контýр","contour, outline"),
 ("zona","зона","зóна","zone"),
 ("sfera","сфера","сфéра","sphere"),
 ("atribut","атрибут","атрибýт","attribute"),
 ("maket","макет","макéт","mockup, model"),
 ("originalnost","оригинальность","оригинáльность","originality"),
 ("novizna","новизна","новúзна","novelty"),
 ("aktualnost","актуальность","актуáльность","relevance"),
 ("znachimost","значимость","значúмость","significance"),
 ("sushchestvennyy","существенный","существéнный","essential, substantial"),
 ("neznachitelnyy","незначительный","незначúтельный","insignificant"),
 ("vtorostepennyy","второстепенный","второстéпенный","secondary"),
 ("dominanta","доминанта","доминáнта","dominant"),
 ("preobladanie","преобладание","преобладáние","preponderance"),
 ("slabost","слабость","слáбость","weakness"),
 ("moschnost","мощность","мóщность","power, capacity"),
 ("analog","аналог","аналóг","analogue"),
 ("proobraz","прообраз","прóобраз","prototype, archetype"),
 ("arhetip","архетип","архéтип","archetype"),
 ("mif","миф","миф","myth"),
 ("legenda","легенда","легéнда","legend"),
 ("skazanie","сказание","сказáние","tale, legend"),
 ("bylina","былина","бýлина","epic tale"),
 ("epos","эпос","э́пос","epic"),
 ("lirika","лирика","лúрика","lyrics, lyricism"),
 ("dramaturgiya","драматургия","драматýргия","dramaturgy"),
 ("libretto","либретто","либрéтто","libretto"),
 ("partitura","партитура","партитýра","score (music)"),
 ("mitologiya","мифология","мифолóгия","mythology"),
]

def entry(rid, text, stress, gloss):
    return {"id": f"ru.lex.study2.{rid}", "status": "draft",
            "forms": [{"text": text}], "readings": [{"text": stress}],
            "glosses": {"en-US": [gloss]}, "sources": SRC, "generation": GEN}

with open(os.path.join(R, "lexicon", "study2.jsonl"), "w") as f:
    for rid, text, stress, gloss in WORDS:
        f.write(json.dumps(entry(rid, text, stress, gloss), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ru.grammar.b2-v-ramkah", "name": "В рамках + gen framing", "category": "syntax",
  "definition": "Framing uses в рамках: в рамках темы. Learn the supplied chunks as given."},
 {"id": "ru.grammar.b2-v-svyazi-s", "name": "В связи с + instr relation", "category": "syntax",
  "definition": "Relation uses в связи с: в связи с выводом. Learn the supplied chunks as given."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("u540","Это пометка.","This is a note.",["пометка"]),
 ("u541","Это инфографика.","This is infographics.",["инфографика"]),
 ("u542","Это хронология.","This is chronology.",["хронология"]),
 ("u543","Это поток.","This is a flow.",["поток"]),
 ("u544","Это объект.","This is an object.",["объект"]),
 ("u545","Это функция.","This is a function.",["функция"]),
 ("u546","Это цепь.","This is a chain.",["цепь"]),
 ("u547","Это зона.","This is a zone.",["зона"]),
 ("u548","Это макет.","This is a mockup.",["макет"]),
 ("u549","Это миф.","This is a myth.",["миф"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, gloss, cloze in SENTS:
        e = {"id": f"ru.sent.b2.{sid}", "status": "draft", "text": text, "gloss": gloss,
             "cloze_targets": cloze, "sources": SRC, "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

ASSESS = [
 {"id": "ru.assess.b2.academic-study-reading2", "goal_id": "ru.goal.b2.academic-study2",
  "kind": "recognition", "modality": "reading",
  "rubric": {"scale": "observed", "criteria": [
      "Identify relation words (взаимодействие, зависимость) in supplied notes.",
      "Match в связи с chunks to their relation.",
      "Distinguish объект (object) from субъект (subject)."]},
  "review_status": "draft"},
 {"id": "ru.assess.b2.academic-study-writing2", "goal_id": "ru.goal.b2.academic-study2",
  "kind": "production", "modality": "writing",
  "rubric": {"scale": "observed", "criteria": [
      "Frame with the supplied в рамках chunk.",
      "Relate with the supplied в связи с chunk.",
      "Map with a supplied цепь or иерархия chunk."]},
  "review_status": "draft"},
]
with open(os.path.join(R, "assessments", "definitions.jsonl"), "a") as f:
    for a in ASSESS:
        f.write(json.dumps(a, ensure_ascii=False) + "\n")

GOAL_YAML = """  - id: "ru.goal.b2.academic-study2"
    description: "Take structured notes and map conceptual relationships."
    band: "B2"
    modalities: ["reading", "writing"]
    prerequisites:
      - {target: "ru.goal.b2.academic-study", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.b2.critical-reading", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.on-ramp.everyday", dimension: "recall-meaning", required_state: "independent", strength: "hard"}
    required_concepts: ["ru.grammar.b2-v-ramkah", "ru.grammar.b2-v-svyazi-s", "ru.grammar.on-ramp.zero-present-copula"]
    assessment_ids: ["ru.assess.b2.academic-study-reading2", "ru.assess.b2.academic-study-writing2"]
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
 ("540-study2-01","Note","пометка, инфографика, хронология, взаимодействие and воздействие.",
  ["pometka","infografika","hronologiya","vzaimodeystvie","vozdeystvie"], "s:u540",
  "Do not confuse взаимодействие (interaction) with воздействие (impact)."),
 ("541-study2-02","Flow","отдача, поток, объект, субъект and функция.",
  ["otdacha","potok","obekt","subekt","funkciya"], "s:u541",
  "Do not confuse объект (object) with субъект (subject)."),
 ("542-study2-03","Purpose","назначение, местоположение, расположение, строение and компонент.",
  ["naznachenie","mestopolozhenie","raspolozhenie","stroenie","komponent"], "s:u542",
  "Do not confuse местоположение (location) with расположение (arrangement)."),
 ("543-study2-04","Link","звено, цепь, цепочка, дуга and петля.",
  ["zveno","cep","cepochka","duga","petlya"], "s:u543",
  "Do not confuse цепь (chain) with цепочка (sequence)."),
 ("544-study2-05","Contour","контур, зона, сфера, атрибут and макет.",
  ["kontur","zona","sfera","atribut","maket"], "s:u544",
  "Do not confuse зона (zone) with сфера (sphere)."),
 ("545-study2-06","Originality","оригинальность, новизна, актуальность, значимость and существенный.",
  ["originalnost","novizna","aktualnost","znachimost","sushchestvennyy"], "s:u545",
  "Do not confuse новизна (novelty) with актуальность (relevance)."),
 ("546-study2-07","Secondary","незначительный, второстепенный, доминанта, преобладание and слабость.",
  ["neznachitelnyy","vtorostepennyy","dominanta","preobladanie","slabost"], "s:u546",
  "Do not confuse доминанта (dominant) with преобладание (preponderance)."),
 ("547-study2-08","Capacity","мощность, аналог, прообраз, архетип and миф.",
  ["moschnost","analog","proobraz","arhetip","mif"], "s:u547",
  "Do not confuse прообраз (prototype) with архетип (archetype)."),
 ("548-study2-09","Legend","легенда, сказание, былина, эпос and лирика.",
  ["legenda","skazanie","bylina","epos","lirika"], "s:u548",
  "Do not confuse былина (epic tale) with сказание (tale)."),
 ("549-study2-10","Dramaturgy","драматургия, либретто, партитура, мифология and эпос.",
  ["dramaturgiya","libretto","partitura","mitologiya","epos"], "s:u549",
  "Do not confuse либретто (libretto) with партитура (score)."),
]

def unit_yaml(fname, title, summary, words, newitem, fence):
    uid = fname.split("-", 1)[1]
    num = fname[:3]
    lex = [w if w.startswith("ru.lex.") else f"ru.lex.study2.{w}" for w in words]
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
    L.append('goal_id: "ru.goal.b2.academic-study2"')
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
    L.append(f'  expected_interpretations: ["{title}: notes with taught forms only."]')
    L.append(f'  prohibited_ambiguity: ["{fence}"]')
    L.append('  target_proficiency: "B2"')
    L.append('  validation_method: "choice"')
    return "\n".join(L) + "\n"

for fname, title, summary, words, newitem, fence in U:
    with open(os.path.join(R, "curriculum", "units", fname + ".yaml"), "w") as f:
        f.write(unit_yaml(fname, title, summary, words, newitem, fence))

print("ru batch 52 written")
assert len(WORDS) == 50, len(WORDS)
