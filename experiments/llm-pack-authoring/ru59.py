#!/usr/bin/env python3
"""ru-RU batch 59: B2 units 610-619 (requests, boundaries, polite firmness)."""
import json, os

R = "experiments/llm-pack-authoring/candidates/ru-fullkit-v1"
SRC = ["ru-original"]
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-05", "notes": "ai-drafted; needs dictionary sourcing and human review"}

WORDS = [
 ("otkazyvat","отказывать","отказýвать","to refuse (impf.)"),
 ("otkazat","отказать","откáзать","to refuse (pf.)"),
 ("naotrez","наотрез","наóтрез","point-blank"),
 ("kategoricheski","категорически","категорúчески","categorically"),
 ("otkazyvatsya","отказываться","отказýваться","to refuse (impf., refl.)"),
 ("naporistyy","напористый","напóристый","pushy"),
 ("nastoychivyy","настойчивый","настóйчивый","persistent"),
 ("nastoychivo","настойчиво","настóйчиво","persistently"),
 ("naporisto","напористо","напорúсто","pushingly"),
 ("naporistost","напористость","напорúстость","pushiness"),
 ("kategorichnyy","категоричный","категóричный","categorical"),
 ("kategorichnost","категоричность","категóричность","categoricalness"),
 ("ultimatum","ультиматум","ультимáтум","ultimatum"),
 ("ultimativnyy","ультимативный","ультиматúвный","ultimatum-like"),
 ("myagkost","мягкость","мягкóсть","softness"),
 ("nastavat","настаивать","настаúвать","to insist"),
 ("otstaivat","отстаивать","отстаúвать","to defend, uphold"),
 ("otstoyat","отстоять","отстоя́ть","to firmly defend"),
 ("otstaivanie","отстаивание","отстаúвание","defending, upholding"),
 ("otpor","отпор","отпóр","active resistance"),
 ("ustupchivost","уступчивость","уступчúвость","compliance"),
 ("kompromissnyy","компромиссный","компромúсный","compromising"),
 ("ugovor","уговор","угóвор","persuasion"),
 ("ugovority","уговорить","уговорúть","to persuade (pf.)"),
 ("ugovarivat","уговаривать","уговáривать","to persuade"),
 ("ubezhdat","убеждать","убеждáть","to persuade"),
 ("ubeditelno","убедительно","убедúтельно","persuasively"),
 ("argumentirovanno","аргументированно","аргументúрованно","with argumentation"),
 ("obosnovat","обосновать","обосновáть","to substantiate"),
 ("nadumannyy","надуманный","надýманный","far-fetched"),
 ("nedovolstvo","недовольство","недовóльство","dissatisfaction"),
 ("nedovolnyy","недовольный","недовóльный","dissatisfied"),
 ("vygovor","выговор","вы\u0301говор","reprimand"),
 ("vyskazyvanie","высказывание","выскáзывание","utterance"),
 ("predosterezhenie","предостережение","предостережéние","warning"),
 ("nepriemlemyy","неприемлемый","неприéмлемый","unacceptable"),
 ("priemlemyy","приемлемый","приемлéмый","acceptable"),
 ("dopustimyy","допустимый","допúстимый","permissible"),
 ("nedopustimyy","недопустимый","недопúстимый","impermissible"),
 ("otkaznoy","отказной","отказнóй","refusal (adj.)"),
 ("korrektnyy","корректный","корре́ктный","correct, polite"),
 ("nekorrektnyy","некорректный","некоррéктный","incorrect, rude"),
 ("korrektnost","корректность","корре́ктность","correctness, tact"),
 ("prilichie","приличие","прилúчие","decency"),
 ("prilichnyy","приличный","прилúчный","decent"),
 ("predosterech","предостеречь","предостерéчь","to warn against"),
 ("pregradit","преградить","преградúть","to block"),
 ("protivodeystvie","противодействие","противодéйствие","resistance, counteraction"),
 ("soprotivlyatsya","сопротивляться","сопротивлýться","to resist"),
 ("neprilichno","неприлично","неприлúчно","indecently"),
]

def entry(rid, text, stress, gloss):
    return {"id": f"ru.lex.neg.{rid}", "status": "draft",
            "forms": [{"text": text}], "readings": [{"text": stress}],
            "glosses": {"en-US": [gloss]}, "sources": SRC, "generation": GEN}

with open(os.path.join(R, "lexicon", "neg.jsonl"), "w") as f:
    for rid, text, stress, gloss in WORDS:
        f.write(json.dumps(entry(rid, text, stress, gloss), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ru.grammar.b2-ya-ne-mogu", "name": "Я не могу + inf", "category": "syntax",
  "definition": "Polite refusal uses я не могу: я не могу согласиться. Learn the supplied chunks as given."},
 {"id": "ru.grammar.b2-nastoyatelno-proshu", "name": "Настоятельно прошу", "category": "syntax",
  "definition": "Firm requests use настоятельно прошу: настоятельно прошу ответить. Learn the supplied chunks as given."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("u610","Это ультиматум.","This is an ultimatum.",["ультиматум"]),
 ("u611","Это уговор.","This is a persuasion.",["уговор"]),
 ("u612","Это мягкость.","This is softness.",["мягкость"]),
 ("u613","Это отпор.","This is active resistance.",["отпор"]),
 ("u614","Это уступчивость.","This is compliance.",["уступчивость"]),
 ("u615","Это настойчивость.","This is persistence.",["настойчивость"]),
 ("u616","Это выговор.","This is a reprimand.",["выговор"]),
 ("u617","Это корректность.","This is correctness.",["корректность"]),
 ("u618","Это приличие.","This is decency.",["приличие"]),
 ("u619","Это противодействие.","This is resistance.",["противодействие"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, gloss, cloze in SENTS:
        e = {"id": f"ru.sent.b2.{sid}", "status": "draft", "text": text, "gloss": gloss,
             "cloze_targets": cloze, "sources": SRC, "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

ASSESS = [
 {"id": "ru.assess.b2.negotiation-reading", "goal_id": "ru.goal.b2.negotiation",
  "kind": "recognition", "modality": "reading",
  "rubric": {"scale": "observed", "criteria": [
      "Identify refusal words (отказывать, наотрез) in a supplied exchange.",
      "Match я не могу chunks to their refusal.",
      "Distinguish firm (ультиматум) from soft (мягкость) tone."]},
  "review_status": "draft"},
 {"id": "ru.assess.b2.negotiation-writing", "goal_id": "ru.goal.b2.negotiation",
  "kind": "production", "modality": "writing",
  "rubric": {"scale": "observed", "criteria": [
      "Refuse with the supplied я не могу chunk.",
      "Make a firm request with the supplied настоятельно прошу chunk.",
      "Keep the reply корректный using taught forms only."]},
  "review_status": "draft"},
]
with open(os.path.join(R, "assessments", "definitions.jsonl"), "a") as f:
    for a in ASSESS:
        f.write(json.dumps(a, ensure_ascii=False) + "\n")

GOAL_YAML = """  - id: "ru.goal.b2.negotiation"
    description: "Make requests, set boundaries, and refuse politely but firmly."
    band: "B2"
    modalities: ["reading", "writing"]
    prerequisites:
      - {target: "ru.goal.b1.opinions", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.a2.services", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.on-ramp.everyday", dimension: "recall-meaning", required_state: "independent", strength: "hard"}
    required_concepts: ["ru.grammar.b2-ya-ne-mogu", "ru.grammar.b2-nastoyatelno-proshu", "ru.grammar.on-ramp.zero-present-copula"]
    assessment_ids: ["ru.assess.b2.negotiation-reading", "ru.assess.b2.negotiation-writing"]
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
 ("610-neg-01","Refusing","отказывать, отказать, наотрез, категорически and отказываться.",
  ["otkazyvat","otkazat","naotrez","kategoricheski","otkazyvatsya"], "s:u610",
  "Do not confuse отказывать (to refuse) with возражать (to object)."),
 ("611-neg-02","Persistence","напористый, настойчивый, настойчиво, напористо and напористость.",
  ["naporistyy","nastoychivyy","nastoychivo","naporisto","naporistost"], "s:u611",
  "Do not confuse настойчивый (persistent) with напористый (pushy)."),
 ("612-neg-03","Tone","категоричный, категоричность, ультиматум, ультимативный and мягкость.",
  ["kategorichnyy","kategorichnost","ultimatum","ultimativnyy","myagkost"], "s:u612",
  "Do not confuse категоричный (categorical) with мягкость (softness)."),
 ("613-neg-04","Standing firm","настаивать, отстаивать, отстоять, отстаивание and отпор.",
  ["nastavat","otstaivat","otstoyat","otstaivanie","otpor"], "s:u613",
  "Do not confuse отстаивать (to defend) with сопротивляться (to resist)."),
 ("614-neg-05","Concession","уступчивость, компромиссный, уговор, уговорить and уговаривать.",
  ["ustupchivost","kompromissnyy","ugovor","ugovority","ugovarivat"], "s:u614",
  "Do not confuse уговорить (to persuade) with убеждать (to persuade)."),
 ("615-neg-06","Persuading","убеждать, убедительно, аргументированно, обосновать and надуманный.",
  ["ubezhdat","ubeditelno","argumentirovanno","obosnovat","nadumannyy"], "s:u615",
  "Do not confuse обосновать (to substantiate) with надуманный (far-fetched)."),
 ("616-neg-07","Dissatisfaction","недовольство, недовольный, выговор, высказывание and предостережение.",
  ["nedovolstvo","nedovolnyy","vygovor","vyskazyvanie","predosterezhenie"], "s:u616",
  "Do not confuse выговор (reprimand) with предостережение (warning)."),
 ("617-neg-08","Acceptability","неприемлемый, приемлемый, допустимый, недопустимый and отказной.",
  ["nepriemlemyy","priemlemyy","dopustimyy","nedopustimyy","otkaznoy"], "s:u617",
  "Do not confuse приемлемый (acceptable) with допустимый (permissible)."),
 ("618-neg-09","Decorum","корректный, некорректный, корректность, приличие and приличный.",
  ["korrektnyy","nekorrektnyy","korrektnost","prilichie","prilichnyy"], "s:u618",
  "Do not confuse корректный (polite) with приличный (decent)."),
 ("619-neg-10","Objections","предостеречь, преградить, противодействие, сопротивляться and неприлично.",
  ["predosterech","pregradit","protivodeystvie","soprotivlyatsya","neprilichno"], "s:u619",
  "Do not confuse предостеречь (to warn against) with предупредить (to warn)."),
]

def unit_yaml(fname, title, summary, words, newitem, fence):
    uid = fname.split("-", 1)[1]
    num = fname[:3]
    lex = [w if w.startswith("ru.lex.") else f"ru.lex.neg.{w}" for w in words]
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
    L.append('goal_id: "ru.goal.b2.negotiation"')
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
    L.append(f'  expected_interpretations: ["{title}: negotiation exchange with taught forms only."]')
    L.append(f'  prohibited_ambiguity: ["{fence}"]')
    L.append('  target_proficiency: "B2"')
    L.append('  validation_method: "choice"')
    return "\n".join(L) + "\n"

for fname, title, summary, words, newitem, fence in U:
    with open(os.path.join(R, "curriculum", "units", fname + ".yaml"), "w") as f:
        f.write(unit_yaml(fname, title, summary, words, newitem, fence))

print("ru batch 59 written")
assert len(WORDS) == 50, len(WORDS)
