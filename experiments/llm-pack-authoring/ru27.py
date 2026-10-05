#!/usr/bin/env python3
"""ru-RU batch 27: B1 units 290-299 (relationships and social expectations)."""
import json, os

R = "experiments/llm-pack-authoring/candidates/ru-fullkit-v1"
SRC = ["ru-original"]
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-05", "notes": "ai-drafted; needs dictionary sourcing and human review"}

WORDS = [
 ("druzhba","дружба","дру́жба","friendship"),
 ("drug","друг","друг","friend"),
 ("byt","быт","быт","everyday life"),
 ("tjota","тётя","тётя","aunt"),
 ("kuzen","кузен","ку́зен","cousin"),
 ("djadya","дядя","дядя","uncle"),
 ("trebovanie","требование","требова́ние","requirement"),
 ("malysh","малыш","малы́ш","toddler"),
 ("podrostok","подросток","подро́сток","teenager"),
 ("potomok","потомок","по́томок","descendant"),
 ("suprug","супруг","супру́г","spouse"),
 ("supruga","супруга","супру́га","spouse (f)"),
 ("suvenir","сувенир","сувени́р","souvenir"),
 ("posetitel","посетитель","посети́тель","visitor"),
 ("radushie","радушие","ра́душие","cordiality"),
 ("torzhestvo","торжество","торже́ство","celebration"),
 ("dolg","долг","долг","duty, debt"),
 ("vina","вина","вина́","guilt"),
 ("prostit","простить","прости́ть","to forgive"),
 ("proshchenie","прощение","проще́ние","forgiveness"),
 ("obida","обида","оби́да","resentment"),
 ("mir","мир","мир","peace, world"),
 ("ustupat","уступать","уступа́ть","to give in"),
 ("kompromiss","компромисс","компроми́сс","compromise"),
 ("vera","вера","ве́ра","faith, trust"),
 ("predatelstvo","предательство","преда́тельство","betrayal"),
 ("vernost","верность","ве́рность","loyalty"),
 ("izmena","измена","измена́","betrayal (affair)"),
 ("otnoshenie","отношение","отноше́ние","attitude, relation"),
 ("znakomstvo","знакомство","знако́мство","acquaintance"),
 ("obshchenie","общение","обще́ние","communication"),
 ("beseda","беседа","бесе́да","conversation"),
 ("razgovor","разговор","разгово́р","talk"),
 ("spor","спор","спор","dispute"),
 ("privychka","привычка","при́вычка","habit"),
 ("kharakter","характер","хара́ктер","character"),
 ("cherta","черта","черта́","trait"),
 ("dobryj","добрый","до́брый","kind"),
 ("otkrovennost","откровенность","открове́нность","candor"),
 ("poryadochnost","порядочность","поря́дочность","decency"),
 ("vzaimnost","взаимность","взаи́мность","reciprocity"),
 ("rodnya","родня","родня́","relatives"),
 ("predki","предки","пре́дки","ancestors"),
 ("pokolenie","поколение","поколе́ние","generation"),
 ("vospitanie","воспитание","воспита́ние","upbringing"),
 ("vliyanie","влияние","влия́ние","influence"),
 ("imeniny","именины","имени́ны","name-day"),
 ("tsvety","цветы","цветы́","flowers"),
 ("vkuse","вкус","вкус","taste"),
 ("pochita","почитать","почита́ть","to respect"),
]

def entry(rid, text, stress, gloss):
    return {"id": f"ru.lex.rel.{rid}", "status": "draft",
            "forms": [{"text": text}], "readings": [{"text": stress}],
            "glosses": {"en-US": [gloss]}, "sources": SRC, "generation": GEN}

with open(os.path.join(R, "lexicon", "rel.jsonl"), "w") as f:
    for rid, text, stress, gloss in WORDS:
        f.write(json.dumps(entry(rid, text, stress, gloss), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ru.grammar.b1.dativum-feelings", "name": "Dative experiencers", "category": "syntax",
  "definition": "Feelings take dative: мне обидно, ему стыдно. Learn the supplied chunks as given."},
 {"id": "ru.grammar.b1.ustupit-kompromiss", "name": "Concede-and-compromise chunks", "category": "syntax",
  "definition": "Concession uses уступить + dative-free infinitive: уступить, чтобы найти компромисс. Learn the supplied chunks."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("u290","Это дружба.","This is friendship.",["дружба"]),
 ("u291","Это друг.","This is a friend.",["друг"]),
 ("u292","Это родня.","These are relatives.",["родня"]),
 ("u295","Это спор.","This is a dispute.",["спор"]),
 ("u296","Это компромисс.","This is a compromise.",["компромисс"]),
 ("u297","Это вера.","This is trust.",["вера"]),
 ("u298","Это привычка.","This is a habit.",["привычка"]),
 ("u299","Это цветы.","These are flowers.",["цветы"]),
 ("u293","Это посетитель.","This is a visitor.",["посетитель"]),
 ("u294","Это сувенир.","This is a souvenir.",["сувенир"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, gloss, cloze in SENTS:
        e = {"id": f"ru.sent.b1.{sid}", "status": "draft", "text": text, "gloss": gloss,
             "cloze_targets": cloze, "sources": SRC, "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

ASSESS = [
 {"id": "ru.assess.b1.relationships-reading", "goal_id": "ru.goal.b1.relationships",
  "kind": "recognition", "modality": "reading",
  "rubric": {"scale": "observed", "criteria": [
      "Identify the relationship word (дружба, родня) in a supplied note.",
      "Match dative feeling chunks (мне обидно) to their meaning.",
      "Distinguish уступать (give in) from спорить (dispute)."]},
  "review_status": "draft"},
 {"id": "ru.assess.b1.relationships-writing", "goal_id": "ru.goal.b1.relationships",
  "kind": "production", "modality": "writing",
  "rubric": {"scale": "observed", "criteria": [
      "State a feeling with a supplied dative chunk.",
      "Propose a compromise with the supplied компромисс chunk.",
      "Ask forgiveness with a supplied прости or извини chunk."]},
  "review_status": "draft"},
]
with open(os.path.join(R, "assessments", "definitions.jsonl"), "a") as f:
    for a in ASSESS:
        f.write(json.dumps(a, ensure_ascii=False) + "\n")

GOAL_YAML = """  - id: "ru.goal.b1.relationships"
    description: "Talk about relationships and social expectations."
    band: "B1"
    modalities: ["reading", "writing"]
    prerequisites:
      - {target: "ru.goal.b1.learning-work", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.b1.practical-problems", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.on-ramp.everyday", dimension: "recall-meaning", required_state: "independent", strength: "hard"}
    required_concepts: ["ru.grammar.b1.dativum-feelings", "ru.grammar.b1.ustupit-kompromiss", "ru.grammar.on-ramp.zero-present-copula"]
    assessment_ids: ["ru.assess.b1.relationships-reading", "ru.assess.b1.relationships-writing"]
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
 ("290-relationships-01","Friendship","дружба, друг, общение, беседа and разговор.",
  ["druzhba","drug","obshchenie","beseda","razgovor"], "s:u290",
  "Do not confuse беседа (conversation) with разговор (talk)."),
 ("291-relationships-02","Relatives","родня, тётя, дядя, кузен and предки.",
  ["rodnya","tjota","djadya","kuzen","predki"], "s:u291",
  "Do not confuse предки (ancestors) with потомок (descendant)."),
 ("292-relationships-03","Generations","поколение, малыш, подросток, потомок and воспитание.",
  ["pokolenie","malysh","podrostok","potomok","vospitanie"], "s:u292",
  "Do not confuse воспитание (upbringing) with влияние (influence)."),
 ("293-relationships-04","Visitors","посетитель, радушие, быт, цветы and сувенир.",
  ["posetitel","radushie","byt","tsvety","suvenir"], "s:u293",
  "Do not confuse радушие (cordiality) with привычка (habit)."),
 ("294-relationships-05","Celebration","торжество, именины, вкус, почитать and привычка.",
  ["torzhestvo","imeniny","vkuse","pochita","privychka"], "s:u294",
  "Do not confuse именины (name-day) with торжество (celebration)."),
 ("295-relationships-06","Disputes","спор, требование, долг, вина and обида.",
  ["spor","trebovanie","dolg","vina","obida"], "s:u295",
  "Do not confuse долг (duty) with вина (guilt)."),
 ("296-relationships-07","Forgiveness","простить, прощение, мир, уступать and компромисс.",
  ["prostit","proshchenie","mir","ustupat","kompromiss"], "s:u296",
  "Do not confuse уступать (give in) with прощать (forgive)."),
 ("297-relationships-08","Trust","вера, верность, измена, предательство and отношение.",
  ["vera","vernost","izmena","predatelstvo","otnoshenie"], "s:u297",
  "Do not confuse верность (loyalty) with измена (betrayal)."),
 ("298-relationships-09","Character","характер, черта, привычка, откровенность and порядочность.",
  ["kharakter","cherta","privychka","otkrovennost","poryadochnost"], "s:u298",
  "Do not confuse черта (trait) with характер (character)."),
 ("299-relationships-10","Acquaintance","знакомство, взаимность, влияние, супруг and супруга.",
  ["znakomstvo","vzaimnost","vliyanie","suprug","supruga"], "s:u299",
  "Do not confuse знакомство (acquaintance) with дружба (friendship)."),
]

def unit_yaml(fname, title, summary, words, newitem, fence):
    uid = fname.split("-", 1)[1]
    num = fname[:3]
    lex = [w if w.startswith("ru.lex.") else f"ru.lex.rel.{w}" for w in words]
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
    L.append('goal_id: "ru.goal.b1.relationships"')
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
    L.append(f'  expected_interpretations: ["{title}: relationships with taught forms only."]')
    L.append(f'  prohibited_ambiguity: ["{fence}"]')
    L.append('  target_proficiency: "B1"')
    L.append('  validation_method: "choice"')
    return "\n".join(L) + "\n"

for fname, title, summary, words, newitem, fence in U:
    with open(os.path.join(R, "curriculum", "units", fname + ".yaml"), "w") as f:
        f.write(unit_yaml(fname, title, summary, words, newitem, fence))

print("ru batch 27 written")
assert len(WORDS) == 50, len(WORDS)
