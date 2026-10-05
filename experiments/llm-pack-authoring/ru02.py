#!/usr/bin/env python3
"""ru-RU batch 2: A1 units 040-049 (home)."""
import json, os

R = "experiments/llm-pack-authoring/candidates/ru-fullkit-v1"
SRC = ["ru-original"]
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-04", "notes": "ai-drafted; needs dictionary sourcing and human review"}

WORDS = [
 ("komnata","комната","комната́","room"),
 ("kuhnya","кухня","ку́хня","kitchen"),
 ("vannaya","ванная","ва́нная","bathroom"),
 ("spalnya","спальня","спа́льня","bedroom"),
 ("peredaya","прихожая","прихо́жая","entrance hall"),
 ("okno","окно","окно́","window"),
 ("dver","дверь","две́рь","door"),
 ("stena","стена","стена́","wall"),
 ("pol","пол","пол","floor"),
 ("potolok","потолок","потоло́к","ceiling"),
 ("krovat","кровать","кровать","bed"),
 ("shkaf","шкаф","шкаф","wardrobe"),
 ("komod","комод","комóд","dresser"),
 ("zerkalo","зеркало","зе́ркало","mirror"),
 ("lampa","лампа","ла́мпа","lamp"),
 ("holodilnik","холодильник","холоди́льник","refrigerator"),
 ("plita","плита","плита́","stove"),
 ("chaynik","чайник","чайни́к","kettle"),
 ("chashka","чашка","ча́шка","cup"),
 ("tarelka","тарелка","та́релка","plate"),
 ("lozhka","ложка","ло́жка","spoon"),
 ("vilka","вилка","ви́лка","fork"),
 ("kovyor","ковёр","ковёр","rug"),
 ("zanaveski","занавески","занаве́ски","curtains"),
 ("televizor","телевизор","телеви́зор","television"),
 ("palto","пальто","па́льто","coat"),
 ("kurtka","куртка","ку́ртка","jacket"),
 ("obuv","обувь","о́бувь","footwear"),
 ("botinki","ботинки","боти́нки","shoes"),
 ("tapki","тапки","та́пки","slippers"),
 ("veshalka","вешалка","ве́шалка","coat rack"),
 ("dvor","двор","двор","yard"),
 ("balkon","балкон","балкóн","balcony"),
 ("sad","сад","сад","garden"),
 ("lestnica","лестница","ле́стница","stairs"),
 ("magazin","магазин","магази́н","shop"),
 ("rynok","рынок","ры́нок","market"),
 ("apteka","аптека","апе́ка","pharmacy"),
 ("bolnitsa","больница","больни́ца","hospital"),
 ("bank","банк","банк","bank"),
 ("teatr","театр","теат́р","theatre"),
 ("muzey","музей","музе́й","museum"),
 ("park","парк","парк","park"),
 ("stanciya","станция","ста́нция","station"),
 ("avtobus","автобус","авто́бус","bus"),
 ("mashina","машина","маши́на","car"),
 ("most","мост","мост","bridge"),
 ("reka","река","река́","river"),
 ("les","лес","лес","forest"),
 ("more","море","мо́ре","sea"),
]
assert len(WORDS) == 50

def entry(rid, form, reading, gloss):
    return {"id": f"ru.lex.home.{rid}", "status": "draft",
            "forms": [{"text": form, "is_primary": True}],
            "readings": [{"text": reading, "script": "cyrillic"}],
            "glosses": {"en-US": [gloss]}, "sources": SRC, "generation": GEN}

with open(os.path.join(R, "lexicon", "home.jsonl"), "w") as f:
    for rid, form, reading, gloss in WORDS:
        f.write(json.dumps(entry(rid, form, reading, gloss), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ru.grammar.a1.location-v-na", "name": "Location with в/на + prepositional", "category": "syntax",
  "definition": "Where is asked with где and answered with в or на followed by the prepositional case: Где комната? — В комнате. На кухне есть чайник. Learn the prepositional form of each taught noun as supplied (комната → комнате, кухня → кухне, стол → столе); do not guess endings."},
 {"id": "ru.grammar.a1.na-vs-v", "name": "Choosing в versus на", "category": "semantics",
  "definition": "в names being inside something (в комнате, в шкафу); на names being on a surface or in an open area (на столе, на кухне, на улице). Some taught places take на by convention (на кухне, на улице); learn the pairing together with the noun rather than translating from English."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("u040","Это комната.","This is a room.",["комната"]),
 ("u041","Это окно.","This is a window.",["окно"]),
 ("u042","Это кровать.","This is a bed.",["кровать"]),
 ("u043","Это чашка.","This is a cup.",["чашка"]),
 ("u044","Это телевизор.","This is a television.",["телевизор"]),
 ("u045","Это пальто.","This is a coat.",["пальто"]),
 ("u046","Это сад.","This is a garden.",["сад"]),
 ("u047","Это магазин.","This is a shop.",["магазин"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, gloss, cloze in SENTS:
        e = {"id": f"ru.sent.a1.{sid}", "status": "draft", "text": text, "gloss": gloss,
             "cloze_targets": cloze, "sources": SRC, "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

ASSESS = [
 {"id": "ru.assess.a1.home-reading", "goal_id": "ru.goal.a1.home",
  "kind": "recognition", "modality": "reading",
  "rubric": {"scale": "observed", "criteria": [
      "Identify room, household-object and place nouns in a supplied home note or list.",
      "Distinguish the location phrase in the где + в/на model from the thing located.",
      "Match в and на to the taught pairing for each place noun."]},
  "review_status": "draft"},
 {"id": "ru.assess.a1.home-writing", "goal_id": "ru.goal.a1.home",
  "kind": "production", "modality": "writing",
  "rubric": {"scale": "observed", "criteria": [
      "Write a home-identification statement with это and a taught nominative noun.",
      "Complete a location model with a supplied prepositional form.",
      "Choose в or на for a taught place without inventing new endings."]},
  "review_status": "draft"},
]
with open(os.path.join(R, "assessments", "definitions.jsonl"), "a") as f:
    for a in ASSESS:
        f.write(json.dumps(a, ensure_ascii=False) + "\n")

GOAL_YAML = """  - id: "ru.goal.a1.home"
    description: "Read and write simple statements about rooms, household objects, and familiar places."
    band: "A1"
    modalities: ["reading", "writing"]
    prerequisites:
      - {target: "ru.goal.a1.personal-details", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.a1.people-family", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.on-ramp.everyday", dimension: "recall-meaning", required_state: "independent", strength: "hard"}
    required_concepts: ["ru.grammar.a1.location-v-na", "ru.grammar.a1.na-vs-v", "ru.grammar.on-ramp.zero-present-copula"]
    assessment_ids: ["ru.assess.a1.home-reading", "ru.assess.a1.home-writing"]
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
 ("040-home-01","Rooms","комната, кухня, ванная, спальня, прихожая named with это.",
  ["komnata","kuhnya","vannaya","spalnya","peredaya"], "s:u040",
  "Do not use ванная as an adjective; here it names the bathroom room."),
 ("041-home-02","Parts of the flat","окно, дверь, стена, пол, потолок named with это.",
  ["okno","dver","stena","pol","potolok"], "s:u041",
  "Do not confuse дверь (one door) with двери (doors); only the singular is taught here."),
 ("042-home-03","Bedroom furniture","кровать, шкаф, комод, зеркало, лампа named with это.",
  ["krovat","shkaf","komod","zerkalo","lampa"], "s:u042",
  "Do not treat шкаф as feminine; it is masculine and takes no ending."),
 ("043-home-04","Kitchen things","холодильник, плита, чайник, чашка, тарелка named with это.",
  ["holodilnik","plita","chaynik","chashka","tarelka"], "s:u043",
  "Do not use чашка for a glass; чашка is a cup."),
 ("044-home-05","Table and living room","ложка, вилка, ковёр, занавески, телевизор named with это.",
  ["lozhka","vilka","kovyor","zanaveski","televizor"], "s:u044",
  "Do not guess the plural of ковёр; only the supplied forms are taught."),
 ("045-home-06","Clothing","пальто, куртка, обувь, ботинки, тапки named with это.",
  ["palto","kurtka","obuv","botinki","tapki"], "s:u045",
  "Do not decline пальто; it never changes form."),
 ("046-home-07","Entry and outdoors","вешалка, двор, балкон, сад, лестница named with это.",
  ["veshalka","dvor","balkon","sad","lestnica"], "s:u046",
  "Do not confuse сад (garden) with парк (park); they name different places."),
 ("047-home-08","Places in the city","магазин, рынок, аптека, больница, банк named with это.",
  ["magazin","rynok","apteka","bolnitsa","bank"], "s:u047",
  "Do not confuse аптека (pharmacy) with больница (hospital)."),
 ("048-home-09","Where things are","театр, музей, парк, станция, автобус with где + в/на location model.",
  ["teatr","muzey","park","stanciya","avtobus"], "g:ru.grammar.a1.location-v-na",
  "Do not put the place noun in the genitive after в or на; it takes the prepositional case."),
 ("049-home-10","In or on","машина, мост, река, лес, море with в versus на pairing.",
  ["mashina","most","reka","les","more"], "g:ru.grammar.a1.na-vs-v",
  "Do not choose в or на by translating from English; use the taught pairing."),
]

def unit_yaml(fname, title, summary, words, newitem, fence):
    uid = fname.split("-", 1)[1]
    num = fname[:3]
    lex = [f"ru.lex.home.{w}" for w in words]
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
    L.append('goal_id: "ru.goal.a1.home"')
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
    L.append(f'  expected_interpretations: ["{title}: naming and simple location with taught forms only."]')
    L.append(f'  prohibited_ambiguity: ["{fence}"]')
    L.append('  target_proficiency: "A1"')
    L.append('  validation_method: "choice"')
    return "\n".join(L) + "\n"

for fname, title, summary, words, newitem, fence in U:
    with open(os.path.join(R, "curriculum", "units", fname + ".yaml"), "w") as f:
        f.write(unit_yaml(fname, title, summary, words, newitem, fence))

print("ru batch 2 written")
