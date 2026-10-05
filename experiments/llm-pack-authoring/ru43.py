#!/usr/bin/env python3
"""ru-RU batch 43: B2 units 450-459 (structure and relationships between claims)."""
import json, os

R = "experiments/llm-pack-authoring/candidates/ru-fullkit-v1"
SRC = ["ru-original"]
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-05", "notes": "ai-drafted; needs dictionary sourcing and human review"}

WORDS = [
 ("svyaz","связь","связь","connection"),
 ("vzaimosvyaz","взаимосвязь","взаимосвúзь","interconnection"),
 ("zavisimost","зависимость","завúсимость","dependence"),
 ("ierarhiya","иерархия","иерáрхия","hierarchy"),
 ("podchinenie","подчинение","подчинéние","subordination"),
 ("sopodchinenie","соподчинение","соподчинéние","coordination"),
 ("koordinaciya","координация","координáция","coordination"),
 ("subordinaciya","субординация","субордина́ция","subordination (rank)"),
 ("sochinenie","сочинение","сочинéние","composition (writing)"),
 ("konstrukciya","конструкция","констрýкция","construction"),
 ("model","модель","мóдель","model"),
 ("nit","нить","нить","thread"),
 ("antitezis","антитезис","антéзис","antithesis"),
 ("sintez","синтез","синтéз","synthesis"),
 ("triada","триада","триáда","triad"),
 ("dialektika","диалектика","диалéктика","dialectics"),
 ("paradoks","парадокс","пáрадокс","paradox"),
 ("tavtologiya","тавтология","тавтолóгия","tautology"),
 ("pleonazm","плеоназм","плеонáзм","pleonasm"),
 ("kalambur","каламбур","каламбу́р","pun"),
 ("dvusmyslennost","двусмысленность","двусмýсленность","ambiguity"),
 ("omonim","омоним","омóним","homonym"),
 ("sinonim","синоним","синóним","synonym"),
 ("antonim","антоним","антóним","antonym"),
 ("paronim","пароним","парóним","paronym"),
 ("epitet","эпитет","эпúтет","epithet"),
 ("giperbola","гипербола","гипéрбола","hyperbole"),
 ("litota","литота","литóта","litotes"),
 ("perifraz","перифраз","перúфраз","periphrasis"),
 ("metonimiya","метонимия","метонúмия","metonymy"),
 ("allegoriya","аллегория","аллéгория","allegory"),
 ("skazuemoe","сказуемое","сказýемое","predicate"),
 ("podlezhashchee","подлежащее","подлéжащее","subject (grammar)"),
 ("dopolnenie","дополнение","дополнéние","object (grammar)"),
 ("sostav","состав","состáв","composition, make-up"),
 ("padezh","падеж","падéж","case (grammar)"),
 ("spryazhenie","спряжение","спряжéние","conjugation"),
 ("koren","корень","кóрень","root"),
 ("pristavka","приставка","пристáвка","prefix"),
 ("suffiks","суффикс","суффúкс","suffix"),
 ("okontanie","окончание","окончáние","ending"),
 ("chastica","частица","чáстица","particle"),
 ("mezhdometie","междометие","междомéтие","interjection"),
 ("deeprichastie","деепричастие","деепричáстие","gerund"),
 ("prichastie","причастие","причáстие","participle"),
 ("infinitiv","инфинитив","инфинитúв","infinitive"),
 ("naklonenie","наклонение","наклонéние","mood (grammar)"),
 ("zalog","залог","залóг","voice (grammar)"),
 ("rod","род","род","gender"),
 ("frazeologizm","фразеологизм","фразеологúзм","idiom"),
]

def entry(rid, text, stress, gloss):
    return {"id": f"ru.lex.critical.{rid}", "status": "draft",
            "forms": [{"text": text}], "readings": [{"text": stress}],
            "glosses": {"en-US": [gloss]}, "sources": SRC, "generation": GEN}

with open(os.path.join(R, "lexicon", "critical.jsonl"), "w") as f:
    for rid, text, stress, gloss in WORDS:
        f.write(json.dumps(entry(rid, text, stress, gloss), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ru.grammar.b2-tak-kak", "name": "Так как reason", "category": "syntax",
  "definition": "Reasons use так как: так как важно, вывод. Learn the supplied chunks as given."},
 {"id": "ru.grammar.b2-ne-tolko-no", "name": "Не только … но и pairing", "category": "syntax",
  "definition": "Pairing uses не только … но и: не только тезис, но и антитезис. Learn the supplied chunks as given."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("u450","Это связь.","This is a connection.",["связь"]),
 ("u451","Это иерархия.","This is a hierarchy.",["иерархия"]),
 ("u452","Это модель.","This is a model.",["модель"]),
 ("u453","Это парадокс.","This is a paradox.",["парадокс"]),
 ("u454","Это синоним.","This is a synonym.",["синоним"]),
 ("u455","Это антоним.","This is an antonym.",["антоним"]),
 ("u456","Это гипербола.","This is a hyperbole.",["гипербола"]),
 ("u457","Это аллегория.","This is an allegory.",["аллегория"]),
 ("u458","Это падеж.","This is a case.",["падеж"]),
 ("u459","Это род.","This is a gender.",["род"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, gloss, cloze in SENTS:
        e = {"id": f"ru.sent.b2.{sid}", "status": "draft", "text": text, "gloss": gloss,
             "cloze_targets": cloze, "sources": SRC, "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

ASSESS = [
 {"id": "ru.assess.b2.critical-reading-reading", "goal_id": "ru.goal.b2.critical-reading",
  "kind": "recognition", "modality": "reading",
  "rubric": {"scale": "observed", "criteria": [
      "Identify structure words (связь, иерархия) in a supplied argument map.",
      "Match так как chunks to their reason.",
      "Distinguish тезис (thesis) from антитезис (antithesis)."]},
  "review_status": "draft"},
 {"id": "ru.assess.b2.critical-reading-writing", "goal_id": "ru.goal.b2.critical-reading",
  "kind": "production", "modality": "writing",
  "rubric": {"scale": "observed", "criteria": [
      "Link claims with the supplied так как chunk.",
      "Pair claims with the supplied не только … но и chunk.",
      "Map with a supplied связь or иерархия chunk."]},
  "review_status": "draft"},
]
with open(os.path.join(R, "assessments", "definitions.jsonl"), "a") as f:
    for a in ASSESS:
        f.write(json.dumps(a, ensure_ascii=False) + "\n")

GOAL_YAML = """  - id: "ru.goal.b2.critical-reading"
    description: "Analyze structure and relationships between claims."
    band: "B2"
    modalities: ["reading", "writing"]
    prerequisites:
      - {target: "ru.goal.b2.argumentation4", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.b2.argumentation", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.on-ramp.everyday", dimension: "recall-meaning", required_state: "independent", strength: "hard"}
    required_concepts: ["ru.grammar.b2-tak-kak", "ru.grammar.b2-ne-tolko-no", "ru.grammar.on-ramp.zero-present-copula"]
    assessment_ids: ["ru.assess.b2.critical-reading-reading", "ru.assess.b2.critical-reading-writing"]
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
 ("450-critical-01","Connection","связь, взаимосвязь, зависимость, иерархия and подчинение.",
  ["svyaz","vzaimosvyaz","zavisimost","ierarhiya","podchinenie"], "s:u450",
  "Do not confuse связь (connection) with зависимость (dependence)."),
 ("451-critical-02","Coordination","соподчинение, координация, субординация, сочинение and конструкция.",
  ["sopodchinenie","koordinaciya","subordinaciya","sochinenie","konstrukciya"], "s:u451",
  "Do not confuse координация (coordination) with субординация (rank)."),
 ("452-critical-03","Model","модель, нить, состав, конструкция and сочинение.",
  ["model","nit","sostav","konstrukciya","sochinenie"], "s:u452",
  "Do not confuse модель (model) with конструкция (construction)."),
 ("453-critical-04","Antithesis","антитезис, синтез, триада, диалектика and парадокс.",
  ["antitezis","sintez","triada","dialektika","paradoks"], "s:u453",
  "Do not confuse тезис (thesis) with антитезис (antithesis)."),
 ("454-critical-05","Tautology","тавтология, плеоназм, каламбур, двусмысленность and омоним.",
  ["tavtologiya","pleonazm","kalambur","dvusmyslennost","omonim"], "s:u454",
  "Do not confuse тавтология (tautology) with плеоназм (pleonasm)."),
 ("455-critical-06","Synonym","синоним, антоним, пароним, эпитет and гипербола.",
  ["sinonim","antonim","paronim","epitet","giperbola"], "s:u455",
  "Do not confuse синоним (synonym) with пароним (paronym)."),
 ("456-critical-07","Litotes","литота, перифраз, метонимия, аллегория and гипербола.",
  ["litota","perifraz","metonimiya","allegoriya","giperbola"], "s:u456",
  "Do not confuse метонимия (metonymy) with аллегория (allegory)."),
 ("457-critical-08","Predicate","сказуемое, подлежащее, дополнение, состав and падеж.",
  ["skazuemoe","podlezhashchee","dopolnenie","sostav","padezh"], "s:u457",
  "Do not confuse подлежащее (subject) with сказуемое (predicate)."),
 ("458-critical-09","Conjugation","спряжение, корень, приставка, суффикс and окончание.",
  ["spryazhenie","koren","pristavka","suffiks","okontanie"], "s:u458",
  "Do not confuse приставка (prefix) with суффикс (suffix)."),
 ("459-critical-10","Particle","частица, междометие, деепричастие, причастие and инфинитив.",
  ["chastica","mezhdometie","deeprichastie","prichastie","infinitiv"], "s:u459",
  "Do not confuse причастие (participle) with деепричастие (gerund)."),
]

def unit_yaml(fname, title, summary, words, newitem, fence):
    uid = fname.split("-", 1)[1]
    num = fname[:3]
    lex = [w if w.startswith("ru.lex.") else f"ru.lex.critical.{w}" for w in words]
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
    L.append('goal_id: "ru.goal.b2.critical-reading"')
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
    L.append(f'  expected_interpretations: ["{title}: critical reading with taught forms only."]')
    L.append(f'  prohibited_ambiguity: ["{fence}"]')
    L.append('  target_proficiency: "B2"')
    L.append('  validation_method: "choice"')
    return "\n".join(L) + "\n"

for fname, title, summary, words, newitem, fence in U:
    with open(os.path.join(R, "curriculum", "units", fname + ".yaml"), "w") as f:
        f.write(unit_yaml(fname, title, summary, words, newitem, fence))

print("ru batch 43 written")
assert len(WORDS) == 50, len(WORDS)
