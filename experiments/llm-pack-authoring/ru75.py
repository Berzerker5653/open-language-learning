#!/usr/bin/env python3
"""ru-RU batch 75: B2 units 770-779 (lexical precision and ambiguity reduction). New goal style-register."""
import json, os

R = "experiments/llm-pack-authoring/candidates/ru-fullkit-v1"
SRC = ["ru-original"]
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-05", "notes": "ai-drafted; needs dictionary sourcing and human review"}

WORDS = [
 ("leksicheskij","лексический","лексический","lexical (adj.)"),
 ("sofistika","софистика","софи́стика","sophistry"),
 ("uklonchivost","уклончивость","уклончи́вость","evasiveness"),
 ("oznachat","означать","означа́ть","to mean, to signify"),
 ("podrazumevat","подразумевать","подразумева́ть","to imply"),
 ("razgranichivat","разграничивать","разграни́чивать","to demarcate, distinguish"),
 ("smeshivat","смешивать","сме́шивать","to mix up, blend"),
 ("podmenyat","подменять","подменя́ть","to substitute"),
 ("tolkovat","толковать","толкува́ть","to interpret, explain"),
 ("formulirovat","формулировать","формули́ровать","to formulate"),
 ("odnoznachnyj","однозначный","однозна́чный","unambiguous"),
 ("dvusmyslennyj","двусмысленный","двусмы́сленный","ambiguous"),
 ("bukvalnyj","буквальный","буква́льный","literal"),
 ("perenosnyj","переносный","перено́сный","figurative"),
 ("prostorechie","просторечие","просторе́чие","vernacular"),
 ("zhargon","жаргон","жарго́н","jargon"),
 ("argo","арго","арго́","argot"),
 ("dialektizm","диалектизм","диалекти́зм","dialectism"),
 ("istorizm","историзм","истори́зм","historicism"),
 ("oksymoron","оксюморон","оксюморо́н","oxymoron"),
 ("smyslovoj","смысловой","смыслово́й","semantic (adj.)"),
 ("leksika","лексика","ле́ксика","vocabulary, lexis"),
 ("podmena","подмена","подмена́","substitution"),
 ("omonimiya","омонимия","омони́мия","homonymy"),
 ("polisemiya","полисемия","полисе́мия","polysemy"),
 ("odnoznachnost","однозначность","однозна́чность","unambiguity"),
 ("sochetaemost","сочетаемость","сочета́емость","collocation, combinability"),
 ("shchepetilnost","щепетильность","щепети́льность","scrupulousness"),
 ("pedantichnost","педантичность","педанти́чность","pedantry"),
 ("dotoshnost","дотошность","дото́щность","meticulousness"),
 ("pridirchivost","придирчивость","при́дирчивость","nitpicking"),
 ("pridirka","придирка","при́дирка","cavil, nitpick"),
 ("strofa","строфа","стро́фа","stanza"),
 ("kuplet","куплет","купле́т","verse, couplet"),
 ("alliteraciya","аллитерация","аллитера́ция","alliteration"),
 ("stilistika","стилистика","стили́стика","stylistics"),
 ("fonetika","фонетика","фоне́тика","phonetics"),
 ("morfologiya","морфология","морфоло́гия","morphology"),
 ("sintaksis","синтаксис","синта́ксис","syntax"),
 ("etimologiya","этимология","этимоло́гия","etymology"),
 ("podrazumevatsya","подразумеваться","подразумева́ться","to be implied"),
 ("direktiva","директива","директи́ва","directive"),
 ("leksikografiya","лексикография","лексикогра́фия","lexicography"),
 ("inoskazanie","иносказание","иносказа́ние","allegory, parable"),
 ("byl","быль","бы́ль","true story"),
 ("nebylica","небылица","небыли́ца","tall tale"),
 ("bayka","байка","ба́йка","tall story, anecdote"),
 ("nasmeshka","насмешка","насме́шка","mockery, ridicule"),
 ("sarkastichnost","саркастичность","саркасти́чность","sarcasticness"),
 ("neodnoznachnyj","неоднозначный","неоднозна́чный","ambiguous, ambivalent"),
]

def entry(rid, text, stress, gloss):
    return {"id": f"ru.lex.style.{rid}", "status": "draft",
            "forms": [{"text": text}], "readings": [{"text": stress}],
            "glosses": {"en-US": [gloss]}, "sources": SRC, "generation": GEN}

with open(os.path.join(R, "lexicon", "style.jsonl"), "w") as f:
    for rid, text, stress, gloss in WORDS:
        f.write(json.dumps(entry(rid, text, stress, gloss), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ru.grammar.b2-imeet-vidu", "name": "Имеет в виду + acc", "category": "syntax",
  "definition": "Stating intended meaning: он имеет в виду точность. Learn the supplied chunks as given."},
 {"id": "ru.grammar.b2-inache-govorya", "name": "Иначе говоря", "category": "syntax",
  "definition": "Restating for precision: иначе говоря, точнее. Learn the supplied chunks as given."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

ASSESS = [
 {"id": "ru.assess.b2.style-register-reading", "goal_id": "ru.goal.b2.style-register", "kind": "recognition", "modality": "reading",
  "rubric": {"scale": "observed", "criteria": [
    "Distinguish literal (буквальный) from figurative (переносный) meaning in a supplied sentence.",
    "Match имеет в виду chunks to their intended referent.",
    "Identify the term (термин) among stylistically neutral words."]}},
 {"id": "ru.assess.b2.style-register-writing", "goal_id": "ru.goal.b2.style-register", "kind": "production", "modality": "writing",
  "rubric": {"scale": "observed", "criteria": [
    "State intended meaning with the supplied имеет в виду chunk.",
    "Restate with the supplied иначе говоря chunk.",
    "Use taught forms only."]}},
]
for a in ASSESS:
    a["review_status"] = "draft"
with open(os.path.join(R, "assessments", "definitions.jsonl"), "a") as f:
    for a in ASSESS:
        f.write(json.dumps(a, ensure_ascii=False) + "\n")

GOAL_YAML = '''  - id: "ru.goal.b2.style-register"
    description: "Choose precise words and reduce ambiguity in writing."
    band: "B2"
    modalities: ["reading", "writing"]
    prerequisites:
      - {
          target: "ru.goal.b1.extended-writing",
          dimension: "comprehension-reading",
          required_state: "independent",
          strength: "hard",
        }
      - {
          target: "ru.goal.a2.services",
          dimension: "comprehension-reading",
          required_state: "independent",
          strength: "hard",
        }
      - {
          target: "ru.goal.on-ramp.everyday",
          dimension: "recall-meaning",
          required_state: "independent",
          strength: "hard",
        }
    required_concepts:
      [
        "ru.grammar.b2-imeet-vidu",
        "ru.grammar.b2-inache-govorya",
        "ru.grammar.on-ramp.zero-present-copula",
      ]
    assessment_ids:
      [
        "ru.assess.b2.style-register-reading",
        "ru.assess.b2.style-register-writing",
      ]
    transfer_required: false
    sources: ["ru-original"]
    review_status: "draft"
    generation:
      method: "ai-assisted"
      tool: "omp"
      model: "strata/qwen3.8-flash-next-iq3_s"
      date: "2026-10-05"
      notes: "ai-drafted; needs dictionary sourcing and human review"
'''
with open(os.path.join(R, "curriculum", "goals.yaml"), "a") as f:
    f.write(GOAL_YAML)

SENTS = [
 ("u770","Это лексика.","This is vocabulary.",["лексика"]),
 ("u771","Это стилистика.","This is stylistics.",["стилистика"]),
 ("u772","Это омонимия.","This is homonymy.",["омонимия"]),
 ("u773","Это иносказание.","This is an allegory.",["иносказание"]),
 ("u774","Это арго.","This is argot.",["арго"]),
 ("u775","Это придирка.","This is a cavil.",["придирка"]),
 ("u776","Это директива.","This is a directive.",["директива"]),
 ("u777","Это подмена.","This is a substitution.",["подмена"]),
 ("u778","Это насмешка.","This is mockery.",["насмешка"]),
 ("u779","Это строфа.","This is a stanza.",["строфа"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, gloss, cloze in SENTS:
        e = {"id": f"ru.sent.b2.{sid}", "status": "draft", "text": text, "gloss": gloss,
             "cloze_targets": cloze, "sources": SRC, "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

OLD_GRAM = ["ru.grammar.on-ramp.eto-identification", "ru.grammar.on-ramp.zero-present-copula"]

U = [
 ("770-lex-01","Meaning","означать, подразумевать, подразумеваться, смысловой and лексика.",
  ["oznachat","podrazumevat","podrazumevatsya","smyslovoj","leksika"], "s:u770",
  "Do not confuse означать (to mean) with подразумевать (to imply)."),
 ("771-lex-02","Disciplines","лексический, стилистика, фонетика, морфология and синтаксис.",
  ["leksicheskij","stilistika","fonetika","morfologiya","sintaksis"], "s:u771",
  "Do not confuse стилистика (stylistics) with фонетика (phonetics)."),
 ("772-lex-03","Polysemy","омонимия, полисемия, однозначность, неоднозначный and двусмысленный.",
  ["omonimiya","polisemiya","odnoznachnost","neodnoznachnyj","dvusmyslennyj"], "s:u772",
  "Do not confuse омонимия (homonymy) with полисемия (polysemy)."),
 ("773-lex-04","Figures","буквальный, переносный, иносказание, оксюморон and аллитерация.",
  ["bukvalnyj","perenosnyj","inoskazanie","oksymoron","alliteraciya"], "s:u773",
  "Do not confuse буквальный (literal) with переносный (figurative)."),
 ("774-lex-05","Registers","просторечие, жаргон, арго, диалектизм and историзм.",
  ["prostorechie","zhargon","argo","dialektizm","istorizm"], "s:u774",
  "Do not confuse жаргон (jargon) with арго (argot)."),
 ("775-lex-06","Words","лексикография, этимология, толковать, придирка and придирчивость.",
  ["leksikografiya","etimologiya","tolkovat","pridirka","pridirchivost"], "s:u775",
  "Do not confuse придирка (cavil) with насмешка (mockery)."),
 ("776-lex-07","Precision","щепетильность, педантичность, дотошность, формулировать and директива.",
  ["shchepetilnost","pedantichnost","dotoshnost","formulirovat","direktiva"], "s:u776",
  "Do not confuse щепетильность (scrupulousness) with педантичность (pedantry)."),
 ("777-lex-08","Fallacies","софистика, уклончивость, однозначный, разграничивать and подмена.",
  ["sofistika","uklonchivost","odnoznachnyj","razgranichivat","podmena"], "s:u777",
  "Do not confuse подмена (substitution) with смешивание (mixing)."),
 ("778-lex-09","Tone","смешивать, подменять, насмешка, саркастичность and куплет.",
  ["smeshivat","podmenyat","nasmeshka","sarkastichnost","kuplet"], "s:u778",
  "Do not confuse насмешка (mockery) with саркастичность (sarcasticness)."),
 ("779-lex-10","Verses","сочетаемость, строфа, быль, байка and небылица.",
  ["sochetaemost","strofa","byl","bayka","nebylica"], "s:u779",
  "Do not confuse быль (true story) with небылица (tall tale)."),
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

print("ru batch 75 written")
assert len(WORDS) == 50, len(WORDS)
