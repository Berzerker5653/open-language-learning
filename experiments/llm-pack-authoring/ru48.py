#!/usr/bin/env python3
"""ru-RU batch 48: B2 units 500-509 (selective summaries across supplied texts)."""
import json, os

R = "experiments/llm-pack-authoring/candidates/ru-fullkit-v1"
SRC = ["ru-original"]
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-05", "notes": "ai-drafted; needs dictionary sourcing and human review"}

WORDS = [
 ("sverka","сверка","свéрка","cross-check"),
 ("fokus","фокус","фóкус","focus"),
 ("sloy","слой","слой","layer"),
 ("plast","пласт","пласт","stratum"),
 ("nitka","нитка","нúтка","thread"),
 ("kanva","канва","кáнва","canvas, framework"),
 ("karkas","каркас","кáркас","frame"),
 ("skelet","скелет","скелéт","skeleton"),
 ("chertezh","чертёж","чертёж","blueprint, drawing"),
 ("eskiz","эскиз","эски́з","sketch"),
 ("nabrosok","набросок","набрóсок","rough draft"),
 ("sketch","скетч","скетч","sketch"),
 ("zarisovka","зарисовка","зарúсовка","vignette, sketch"),
 ("etyud","этюд","этýд","study, sketch"),
 ("novella","новелла","новéлла","novella"),
 ("esse","эссе","эссé","essay"),
 ("feleton","фельетон","фельетóн","feuilleton"),
 ("statya","статья","статьý","article"),
 ("traktat","трактат","трактáт","treatise"),
 ("avtobiografiya","автобиография","автобиогрáфия","autobiography"),
 ("letopis","летопись","лéтопись","chronicle"),
 ("hronika","хроника","хрóника","chronicle"),
 ("alfavit","алфавит","алфавúт","alphabet"),
 ("azbuka","азбука","азбýка","alphabet"),
 ("sistematizaciya","систематизация","систематизáция","systematization"),
 ("klassifikaciya","классификация","классифика́ция","classification"),
 ("sortirovka","сортировка","сортúровка","sorting"),
 ("gruppirovka","группировка","группирóвка","grouping"),
 ("kategoriya","категория","категóрия","category"),
 ("razryad","разряд","разрýд","category, class"),
 ("tip","тип","тúп","type"),
 ("vid","вид","вúд","kind, view"),
 ("klass","класс","клáсс","class"),
 ("semeystvo","семейство","семéйство","family (biology)"),
 ("gruppa","группа","грýппа","group"),
 ("blok","блок","блок","block"),
 ("modul","модуль","мóдуль","module"),
 ("uzel","узел","ýзел","node, knot"),
 ("mazok","мазок","мáзок","brushstroke"),
 ("poluton","полутон","полутóн","half-tone"),
 ("svetoten","светотень","светотéнь","chiaroscuro"),
 ("kontrast","контраст","контрáст","contrast"),
 ("blik","блик","блик","glint"),
 ("otblesk","отблеск","óтблеск","gleam, reflection"),
 ("siyanie","сияние","сúяние","radiance"),
 ("blesk","блеск","блéск","shine, brilliance"),
 ("mrak","мрак","мрак","darkness"),
 ("tma","тьма","тьма","darkness"),
 ("mgla","мгла","мгла","haze, gloom"),
 ("tuman","туман","тумáн","fog"),
]

def entry(rid, text, stress, gloss):
    return {"id": f"ru.lex.synthesis2.{rid}", "status": "draft",
            "forms": [{"text": text}], "readings": [{"text": stress}],
            "glosses": {"en-US": [gloss]}, "sources": SRC, "generation": GEN}

with open(os.path.join(R, "lexicon", "synthesis2.jsonl"), "w") as f:
    for rid, text, stress, gloss in WORDS:
        f.write(json.dumps(entry(rid, text, stress, gloss), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ru.grammar.b2-kasatelsno", "name": "Касательно + gen reference", "category": "syntax",
  "definition": "Reference uses касательно: касательно вывода. Learn the supplied chunks as given."},
 {"id": "ru.grammar.b2-esli-govorit", "name": "Если говорить о framing", "category": "syntax",
  "definition": "Framing uses если говорить о: если говорить о сути. Learn the supplied chunks as given."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("u500","Это сверка.","This is a cross-check.",["сверка"]),
 ("u501","Это фокус.","This is a focus.",["фокус"]),
 ("u502","Это слой.","This is a layer.",["слой"]),
 ("u503","Это канва.","This is a framework.",["канва"]),
 ("u504","Это эскиз.","This is a sketch.",["эскиз"]),
 ("u505","Это эссе.","This is an essay.",["эссе"]),
 ("u506","Это хроника.","This is a chronicle.",["хроника"]),
 ("u507","Это категория.","This is a category.",["категория"]),
 ("u508","Это контраст.","This is a contrast.",["контраст"]),
 ("u509","Это туман.","This is fog.",["туман"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, gloss, cloze in SENTS:
        e = {"id": f"ru.sent.b2.{sid}", "status": "draft", "text": text, "gloss": gloss,
             "cloze_targets": cloze, "sources": SRC, "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

ASSESS = [
 {"id": "ru.assess.b2.synthesis-reading2", "goal_id": "ru.goal.b2.synthesis2",
  "kind": "recognition", "modality": "reading",
  "rubric": {"scale": "observed", "criteria": [
      "Identify framing words (фокус, канва) across supplied texts.",
      "Match касательно chunks to their reference.",
      "Distinguish слой (layer) from пласт (stratum)."]},
  "review_status": "draft"},
 {"id": "ru.assess.b2.synthesis-writing2", "goal_id": "ru.goal.b2.synthesis2",
  "kind": "production", "modality": "writing",
  "rubric": {"scale": "observed", "criteria": [
      "Frame with the supplied если говорить о chunk.",
      "Refer with the supplied касательно chunk.",
      "Select with a supplied фокус or критерий chunk."]},
  "review_status": "draft"},
]
with open(os.path.join(R, "assessments", "definitions.jsonl"), "a") as f:
    for a in ASSESS:
        f.write(json.dumps(a, ensure_ascii=False) + "\n")

GOAL_YAML = """  - id: "ru.goal.b2.synthesis2"
    description: "Write selective summaries across supplied texts."
    band: "B2"
    modalities: ["reading", "writing"]
    prerequisites:
      - {target: "ru.goal.b2.synthesis", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.b1.information-summary2", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.on-ramp.everyday", dimension: "recall-meaning", required_state: "independent", strength: "hard"}
    required_concepts: ["ru.grammar.b2-kasatelsno", "ru.grammar.b2-esli-govorit", "ru.grammar.on-ramp.zero-present-copula"]
    assessment_ids: ["ru.assess.b2.synthesis-reading2", "ru.assess.b2.synthesis-writing2"]
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
 ("500-synthesis2-01","Cross-check","сверка, фокус, слой, пласт and нитка.",
  ["sverka","fokus","sloy","plast","nitka"], "s:u500",
  "Do not confuse слой (layer) with пласт (stratum)."),
 ("501-synthesis2-02","Framework","канва, каркас, скелет, чертёж and фокус.",
  ["kanva","karkas","skelet","chertezh","fokus"], "s:u501",
  "Do not confuse канва (framework) with каркас (frame)."),
 ("502-synthesis2-03","Sketch","эскиз, набросок, скетч, зарисовка and этюд.",
  ["eskiz","nabrosok","sketch","zarisovka","etyud"], "s:u502",
  "Do not confuse эскиз (sketch) with набросок (rough draft)."),
 ("503-synthesis2-04","Novella","новелла, эссе, фельетон, статья and трактат.",
  ["novella","esse","feleton","statya","traktat"], "s:u503",
  "Do not confuse эссе (essay) with статья (article)."),
 ("504-synthesis2-05","Chronicle","автобиография, летопись, хроника, алфавит and азбука.",
  ["avtobiografiya","letopis","hronika","alfavit","azbuka"], "s:u504",
  "Do not confuse летопись (chronicle) with хроника (chronicle)."),
 ("505-synthesis2-06","Systematization","систематизация, классификация, сортировка, группировка and категория.",
  ["sistematizaciya","klassifikaciya","sortirovka","gruppirovka","kategoriya"], "s:u505",
  "Do not confuse классификация (classification) with сортировка (sorting)."),
 ("506-synthesis2-07","Category","разряд, тип, вид, класс and семейство.",
  ["razryad","tip","vid","klass","semeystvo"], "s:u506",
  "Do not confuse тип (type) with вид (kind)."),
 ("507-synthesis2-08","Group","группа, блок, модуль, узел and каркас.",
  ["gruppa","blok","modul","uzel","karkas"], "s:u507",
  "Do not confuse блок (block) with модуль (module)."),
 ("508-synthesis2-09","Brushstroke","мазок, полутон, светотень, контраст and блик.",
  ["mazok","poluton","svetoten","kontrast","blik"], "s:u508",
  "Do not confuse полутон (half-tone) with светотень (chiaroscuro)."),
 ("509-synthesis2-10","Radiance","отблеск, сияние, блеск, мрак and туман.",
  ["otblesk","siyanie","blesk","mrak","tuman"], "s:u509",
  "Do not confuse сияние (radiance) with блеск (shine)."),
]

def unit_yaml(fname, title, summary, words, newitem, fence):
    uid = fname.split("-", 1)[1]
    num = fname[:3]
    lex = [w if w.startswith("ru.lex.") else f"ru.lex.synthesis2.{w}" for w in words]
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
    L.append('goal_id: "ru.goal.b2.synthesis2"')
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
    L.append(f'  expected_interpretations: ["{title}: selective summary with taught forms only."]')
    L.append(f'  prohibited_ambiguity: ["{fence}"]')
    L.append('  target_proficiency: "B2"')
    L.append('  validation_method: "choice"')
    return "\n".join(L) + "\n"

for fname, title, summary, words, newitem, fence in U:
    with open(os.path.join(R, "curriculum", "units", fname + ".yaml"), "w") as f:
        f.write(unit_yaml(fname, title, summary, words, newitem, fence))

print("ru batch 48 written")
assert len(WORDS) == 50, len(WORDS)
