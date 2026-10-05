#!/usr/bin/env python3
"""ru-RU batch 1: A1 units 030-039 (people-family)."""
import json, os

R = "experiments/llm-pack-authoring/candidates/ru-fullkit-v1"
SRC = ["ru-original"]
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-04", "notes": "ai-drafted; needs dictionary sourcing and human review"}

WORDS = [
 ("sem-ya","семья","семья́","family"),
 ("brat","брат","бра́т","brother"),
 ("sestra","сестра","сестра́","sister"),
 ("syn","сын","сын","son"),
 ("doch","дочь","до́чь","daughter"),
 ("otec","отец","оте́ц","father"),
 ("mat","мать","ма́ть","mother"),
 ("roditeli","родители","роди́тели","parents"),
 ("babushka","бабушка","ба́бушка","grandmother"),
 ("dedushka","дедушка","де́душка","grandfather"),
 ("rebenok","ребёнок","ребёнок","child"),
 ("malchik","мальчик","ма́льчик","boy"),
 ("devochka","девочка","де́вочка","girl"),
 ("deti","дети","де́ти","children"),
 ("malenkiy","маленький","ма́ленький","small; little"),
 ("vnuk","внук","внук","grandson"),
 ("vnuchka","внучка","вну́чка","granddaughter"),
 ("rodstvennik","родственник","ро́дственник","relative"),
 ("rodstvennitsa","родственница","ро́дственница","female relative"),
 ("znakomyy","знакомый","знако́мый","acquaintance"),
 ("muzhchina","мужчина","мужчи́на","man"),
 ("zhenshchina","женщина","же́нщина","woman"),
 ("chelovek","человек","челове́к","person"),
 ("lyudi","люди","лю́ди","people"),
 ("sosed","сосед","со́сед","neighbour"),
 ("koshka","кошка","ко́шка","cat"),
 ("sobaka","собака","соба́ка","dog"),
 ("zhivotnoe","животное","живо́тное","animal"),
 ("domashniy","домашний","дома́шний","domestic; pet"),
 ("lyubit","любить","люби́ть","to love"),
 ("nravitsya","нравится","нра́вится","(it) pleases"),
 ("druzya","друзья","друзья́","friends"),
 ("moy","мой","мой","my; mine"),
 ("tvoy","твой","твой","your"),
 ("nash","наш","на́ш","our"),
 ("yego","его","его","his; its"),
 ("yey","её","её","her; its"),
 ("menya","меня","меня́","me"),
 ("tebya","тебя","тебя́","you"),
 ("u-menya","у меня","у меня́","I have (at me)"),
 ("est","есть","есть","there is; have"),
 ("veshch","вещь","ве́щь","thing"),
 ("sumka","сумка","су́мка","bag"),
 ("klyuch","ключ","ключ","key"),
 ("dengi","деньги","де́ньги","money"),
 ("vremya","время","вре́мя","time"),
 ("delo","дело","де́ло","matter; business"),
 ("semeynyy","семейный","семéйный","family (adjective)"),
 ("muzh","муж","муж","husband"),
 ("zhena","жена","жена́","wife"),
]
assert len(WORDS) == 50, len(WORDS)

def entry(rid, form, reading, gloss):
    return {"id": f"ru.lex.family.{rid}", "status": "draft",
            "forms": [{"text": form, "is_primary": True}],
            "readings": [{"text": reading, "script": "cyrillic"}],
            "glosses": {"en-US": [gloss]}, "sources": SRC, "generation": GEN}

with open(os.path.join(R, "lexicon", "family.jsonl"), "w") as f:
    for rid, form, reading, gloss in WORDS:
        f.write(json.dumps(entry(rid, form, reading, gloss), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ru.grammar.a1.u-possession", "name": "Possession with у + genitive", "category": "syntax",
  "definition": "Possession uses у followed by the possessor in the genitive: У меня есть книга. In the present tense есть may be omitted: У меня книга. With нет the possessed item takes the genitive: У меня нет книги. Use only the supplied genitive forms of taught nouns; do not guess endings."},
 {"id": "ru.grammar.a1.possessive-pronouns", "name": "Possessive pronouns мой, твой, наш", "category": "morphology",
  "definition": "мой, твой and наш agree with the thing possessed in gender and number: мой брат, моя сестра, наше дело. его and её do not change: его сестра, её брат. Learn each supplied agreement form as a chunk; do not decline его or её."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("u030","Это семья.","This is a family.",["семья"]),
 ("u031","Это отец.","This is father.",["отец"]),
 ("u032","Это ребёнок.","This is a child.",["ребёнок"]),
 ("u033","Это знакомый.","This is an acquaintance.",["знакомый"]),
 ("u034","Это человек.","This is a person.",["человек"]),
 ("u035","Это кошка.","This is a cat.",["кошка"]),
 ("u038","Это наш друг.","This is our friend.",["наш"]),
 ("u039","Это наш брат.","This is our brother.",["брат"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, gloss, cloze in SENTS:
        e = {"id": f"ru.sent.a1.{sid}", "status": "draft", "text": text, "gloss": gloss,
             "cloze_targets": cloze, "sources": SRC, "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

ASSESS = [
 {"id": "ru.assess.a1.people-family-reading", "goal_id": "ru.goal.a1.people-family",
  "kind": "recognition", "modality": "reading",
  "rubric": {"scale": "observed", "criteria": [
      "Identify family-member, people, pet and possession nouns in a supplied family note or profile.",
      "Distinguish the possessor in the у + genitive pattern from the possessed item.",
      "Match possessive pronouns to the person and item they refer to."]},
  "review_status": "draft"},
 {"id": "ru.assess.a1.people-family-writing", "goal_id": "ru.goal.a1.people-family",
  "kind": "production", "modality": "writing",
  "rubric": {"scale": "observed", "criteria": [
      "Write a family-identification statement with это and a taught nominative noun.",
      "Complete an у + genitive possession model with a supplied item noun.",
      "Use мой, твой or наш in the supplied gender form without inventing new endings."]},
  "review_status": "draft"},
]
with open(os.path.join(R, "assessments", "definitions.jsonl"), "a") as f:
    for a in ASSESS:
        f.write(json.dumps(a, ensure_ascii=False) + "\n")

GOAL_YAML = """  - id: "ru.goal.a1.people-family"
    description: "Read and write simple statements about family members, people, pets, and possessions."
    band: "A1"
    modalities: ["reading", "writing"]
    prerequisites:
      - {target: "ru.goal.a1.personal-details", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.on-ramp.everyday", dimension: "recall-meaning", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.on-ramp.numbers", dimension: "recall-meaning", required_state: "independent", strength: "hard"}
    required_concepts: ["ru.grammar.a1.u-possession", "ru.grammar.a1.possessive-pronouns", "ru.grammar.on-ramp.eto-identification"]
    assessment_ids: ["ru.assess.a1.people-family-reading", "ru.assess.a1.people-family-writing"]
    transfer_required: false
    sources: ["ru-original"]
    review_status: "draft"
    generation:
      method: "ai-assisted"
      tool: "omp"
      model: "strata/qwen3.8-flash-next-iq3_s"
      date: "2026-10-04"
      notes: "ai-drafted; needs dictionary sourcing and human review"
"""
with open(os.path.join(R, "curriculum", "goals.yaml"), "a") as f:
    f.write(GOAL_YAML)

OLD_VOCAB = ["ru.lex.everyday.eto", "ru.lex.everyday.mama", "ru.lex.everyday.papa",
             "ru.lex.personal.anna", "ru.lex.personal.ivan", "ru.lex.everyday.kniga",
             "ru.lex.everyday.dom", "ru.lex.personal.ya"]
OLD_GRAM = ["ru.grammar.on-ramp.eto-identification", "ru.grammar.on-ramp.zero-present-copula"]

U = [
 ("030-people-family-01","Family at home","семья, брат, сестра, сын, дочь introduced with identification models.",
  ["sem-ya","brat","sestra","syn","doch"], "s:u030",
  "Do not change это to agree with the following noun."),
 ("031-people-family-02","Parents and grandparents","отец, мать, родители, бабушка, дедушка introduced; parents is plural only.",
  ["otec","mat","roditeli","babushka","dedushka"], "s:u031",
  "Do not use родители for one parent; it names both together."),
 ("032-people-family-03","Children","ребёнок, мальчик, девочка, дети, маленький introduced; ребёнок and дети are suppletive pair.",
  ["rebenok","malchik","devochka","deti","malenkiy"], "s:u032",
  "Do not form the plural of ребёнок by adding a regular ending; the plural is дети."),
 ("033-people-family-04","Relatives and acquaintances","внук, внучка, родственник, родственница, знакомый introduced.",
  ["vnuk","vnuchka","rodstvennik","rodstvennitsa","znakomyy"], "s:u033",
  "Do not treat знакомый as a noun meaning friend; it names an acquaintance."),
 ("034-people-family-05","People around us","мужчина, женщина, человек, люди, сосед introduced; человек/люди are suppletive pair.",
  ["muzhchina","zhenshchina","chelovek","lyudi","sosed"], "s:u034",
  "Do not pluralize человек with a regular ending; the supplied plural is люди."),
 ("035-people-family-06","Pets","кошка, собака, животное, домашний, любить introduced with identification models.",
  ["koshka","sobaka","zhivotnoe","domashniy","lyubit"], "s:u035",
  "Do not conjugate любить beyond the supplied form; only любить and нравится are taught."),
 ("036-people-family-07","Having and not having","у меня, есть, вещь, сумка, ключ introduced with the possession pattern.",
  ["u-menya","est","veshch","sumka","klyuch"], "g:ru.grammar.a1.u-possession",
  "Do not put the possessed item in the genitive with есть; it stays nominative."),
 ("037-people-family-08","Money, time, and my things","деньги, время, дело, мой, твой introduced with possessive agreement models.",
  ["dengi","vremya","delo","moy","tvoy"], "g:ru.grammar.a1.possessive-pronouns",
  "Do not guess the genitive of время or the plural of дело; supplied forms only."),
 ("038-people-family-09","Who and whose","наш, его, её, меня, тебя introduced; его and её do not change.",
  ["nash","yego","yey","menya","tebya"], "s:u038",
  "Do not decline его or её to agree with the possessed item."),
 ("039-people-family-10","Family life","муж, жена, семейный, нравится, друзья introduced; friends plural of the taught друг.",
  ["muzh","zhena","semeynyy","nravitsya","druzya"], "s:u039",
  "Do not use нравится with a nominative thing; the thing that pleases stays nominative while the person is dative."),
]

def unit_yaml(fname, title, summary, words, newitem, fence):
    uid = fname.split("-", 1)[1]
    num = fname[:3]
    lex = [f"ru.lex.family.{w}" for w in words]
    if newitem.startswith("s:"):
        newref = f"ru.sent.a1.{newitem[2:]}"
        allowed_gram = OLD_GRAM
    else:
        newref = newitem[2:]
        allowed_gram = [newref] + OLD_GRAM
    old = ["ru.lex.everyday.eto", "ru.lex.everyday.mama"]
    refs = lex + [newref] + old
    L = []
    L.append('id: "ru.unit.a1.' + uid + '"')
    L.append('goal_id: "ru.goal.a1.people-family"')
    L.append(f'title: "{title}"')
    L.append(f'summary: "{summary}"')
    L.append("estimated_minutes: 8")
    L.append("activities:")
    L.append(f'  - id: "ru.activity.a1.u{num}-read"')
    L.append('    type: "encounter-read"')
    L.append('    modality: "reading"')
    L.append("    support_level: 1")
    L.append("    content_refs: &v [" + ", ".join(f'"{r}"' for r in refs) + "]")
    L.append(f'  - id: "ru.activity.a1.u{num}-grammar"')
    L.append('    type: "encounter-read"')
    L.append('    modality: "reading"')
    L.append("    support_level: 1")
    L.append("    content_refs: &g [" + ", ".join(f'"{r}"' for r in allowed_gram) + "]")
    if newitem.startswith("s:"):
        L.append(f'  - id: "ru.activity.a1.u{num}-cloze"')
        L.append('    type: "cloze"')
        L.append('    modality: "writing"')
        L.append("    support_level: 1")
        L.append(f'    content_refs: ["{newref}"]')
    L.append(f'  - id: "ru.activity.a1.u{num}-write"')
    L.append('    type: "recall"')
    L.append('    modality: "writing"')
    L.append("    support_level: 0")
    L.append("    content_refs: *v")
    L.append("generation_contract:")
    L.append("  allowed_vocab: *v")
    L.append("  allowed_grammar: *g")
    L.append("  new_item_budget: 6")
    L.append("  register: []")
    L.append(f'  expected_interpretations: ["{title}: naming and simple possession with taught forms only."]')
    L.append(f'  prohibited_ambiguity: ["{fence}"]')
    L.append('  target_proficiency: "A1"')
    L.append('  validation_method: "choice"')
    return "\n".join(L) + "\n"

for fname, title, summary, words, newitem, fence in U:
    with open(os.path.join(R, "curriculum", "units", fname + ".yaml"), "w") as f:
        f.write(unit_yaml(fname, title, summary, words, newitem, fence))

print("ru batch 1 written")
