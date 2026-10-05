#!/usr/bin/env python3
"""ru-RU batch 55: B2 units 570-579 (professional requests and correspondence)."""
import json, os

R = "experiments/llm-pack-authoring/candidates/ru-fullkit-v1"
SRC = ["ru-original"]
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-05", "notes": "ai-drafted; needs dictionary sourcing and human review"}

WORDS = [
 ("otmena","отмена","отмéна","cancellation"),
 ("izmenenie","изменение","изменéние","change"),
 ("soglasovanie","согласование","согласовáние","coordination, approval"),
 ("rezoljuciya","резолюция","резолýция","resolution, minute"),
 ("deloproizvodstvo","делопроизводство","делопроизвóдство","office work, records management"),
 ("kanceljariya","канцелярия","канцелýрия","chancellery"),
 ("pomoshchnik","помощник","помóщник","assistant"),
 ("assistent","ассистент","ассистéнт","assistant"),
 ("referent","референт","рéферент","referent, aide"),
 ("sekretariat","секретариат","секретариáт","secretariat"),
 ("vhodyashchiy","входящий","вхóдящий","incoming"),
 ("ishodyashchiy","исходящий","исхóдящий","outgoing"),
 ("registraciya","регистрация","регистрáция","registration"),
 ("numeraciya","нумерация","нумерáция","numbering"),
 ("hranenie","хранение","хранéние","storage, custody"),
 ("unichtozhenie","уничтожение","уничтожéние","destruction"),
 ("utilizaciya","утилизация","утилизáция","utilization"),
 ("nomenklatura","номенклатура","номенклатýра","nomenclature"),
 ("proizvodstvo","производство","произвóдство","production, proceedings"),
 ("kanceljarit","канцелярит","канцелярúт","bureaucratese"),
 ("kanceljarizm","канцеляризм","канцелярúзм","bureaucratism"),
 ("vizirovanie","визирование","визúрование","vising, initialing"),
 ("skrepa","скрепа","скрéпа","fastener, staple"),
 ("skrepit","скрепить","скрепúть","to fasten"),
 ("sshivka","сшивка","сшúвка","binding (sewn)"),
 ("proshivka","прошивка","прóшивка","binding"),
 ("numerator","нумератор","нумерáтор","numbering machine"),
 ("pronumerovat","пронумеровать","пронумéровать","to number"),
 ("shtampovat","проштамповать","проштамповáть","to stamp"),
 ("zaverit","заверить","заверúть","to certify"),
 ("zaverenie","заверение","заверéние","certification"),
 ("zaverennyy","заверенный","завéренный","certified"),
 ("legalizaciya","легализация","легализáция","legalization"),
 ("apostil","апостиль","апостúль","apostille"),
 ("legalizovat","легализовать","легализóвать","to legalize"),
 ("notarius","нотариус","нотáриус","notary"),
 ("notarialnyy","нотариальный","нотариáльный","notarial"),
 ("veshchanie2","завещание","завéщание","will, testament"),
 ("nasledstvo","наследство","наслéдство","inheritance"),
 ("kontrakt","контракт","контрáкт","contract"),
 ("rasporyazhenie","распоряжение","распорýжение","order, directive"),
 ("postanovlenie","постановление","постановлéние","resolution, decree"),
 ("ukaz","указ","ýказ","decree, ukase"),
 ("deloprovoditel","делопроводитель","делопровóдитель","records manager"),
 ("kanceljarist","канцелярист","канцелярúст","clerk"),
 ("registracionnyy","регистрационный","регистрациóнный","registration (adj)"),
 ("vedomstvennyy","ведомственный","вéдомственный","departmental"),
 ("sluzhebnaya","служебная","служéбная","official (fem.)"),
 ("sluzhebnoe","служебное","служéбное","official (neut.)"),
 ("sluzhebka","служебка","служéбка","office memo"),
]

def entry(rid, text, stress, gloss):
    return {"id": f"ru.lex.prof.{rid}", "status": "draft",
            "forms": [{"text": text}], "readings": [{"text": stress}],
            "glosses": {"en-US": [gloss]}, "sources": SRC, "generation": GEN}

with open(os.path.join(R, "lexicon", "prof.jsonl"), "w") as f:
    for rid, text, stress, gloss in WORDS:
        f.write(json.dumps(entry(rid, text, stress, gloss), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ru.grammar.b2-proshu", "name": "Прошу + inf request", "category": "syntax",
  "definition": "Requests use прошу: прошу рассмотреть. Learn the supplied chunks as given."},
 {"id": "ru.grammar.b2-v-svyazi-s2", "name": "В связи с + reason", "category": "syntax",
  "definition": "Business letters use в связи с: в связи с отменой. Learn the supplied chunks as given."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("u570","Это отмена.","This is a cancellation.",["отмена"]),
 ("u571","Это изменение.","This is a change.",["изменение"]),
 ("u572","Это согласование.","This is coordination.",["согласование"]),
 ("u573","Это резолюция.","This is a resolution.",["резолюция"]),
 ("u574","Это входящий.","This is an incoming document.",["входящий"]),
 ("u575","Это исходящий.","This is an outgoing document.",["исходящий"]),
 ("u576","Это регистрация.","This is registration.",["регистрация"]),
 ("u577","Это апостиль.","This is an apostille.",["апостиль"]),
 ("u578","Это нотариус.","This is a notary.",["нотариус"]),
 ("u579","Это указ.","This is a decree.",["указ"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, gloss, cloze in SENTS:
        e = {"id": f"ru.sent.b2.{sid}", "status": "draft", "text": text, "gloss": gloss,
             "cloze_targets": cloze, "sources": SRC, "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

ASSESS = [
 {"id": "ru.assess.b2.professional-writing-reading", "goal_id": "ru.goal.b2.professional-writing",
  "kind": "recognition", "modality": "reading",
  "rubric": {"scale": "observed", "criteria": [
      "Identify request words (запрос, прошу) in a supplied letter.",
      "Match прошу chunks to their request.",
      "Distinguish входящий (incoming) from исходящий (outgoing)."]},
  "review_status": "draft"},
 {"id": "ru.assess.b2.professional-writing-writing", "goal_id": "ru.goal.b2.professional-writing",
  "kind": "production", "modality": "writing",
  "rubric": {"scale": "observed", "criteria": [
      "Request with the supplied прошу chunk.",
      "Give reason with the supplied в связи с chunk.",
      "Close with a supplied с уважением chunk."]},
  "review_status": "draft"},
]
with open(os.path.join(R, "assessments", "definitions.jsonl"), "a") as f:
    for a in ASSESS:
        f.write(json.dumps(a, ensure_ascii=False) + "\n")

GOAL_YAML = """  - id: "ru.goal.b2.professional-writing"
    description: "Write professional requests and correspondence."
    band: "B2"
    modalities: ["reading", "writing"]
    prerequisites:
      - {target: "ru.goal.b1.extended-writing", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.a2.services", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.on-ramp.everyday", dimension: "recall-meaning", required_state: "independent", strength: "hard"}
    required_concepts: ["ru.grammar.b2-proshu", "ru.grammar.b2-v-svyazi-s2", "ru.grammar.on-ramp.zero-present-copula"]
    assessment_ids: ["ru.assess.b2.professional-writing-reading", "ru.assess.b2.professional-writing-writing"]
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
 ("570-prof-01","Cancellation","отмена, изменение, согласование, резолюция and указ.",
  ["otmena","izmenenie","soglasovanie","rezoljuciya","ukaz"], "s:u570",
  "Do not confuse отмена (cancellation) with изменение (change)."),
 ("571-prof-02","Records","делопроизводство, канцелярия, помощник, ассистент and референт.",
  ["deloproizvodstvo","kanceljariya","pomoshchnik","assistent","referent"], "s:u571",
  "Do not confuse помощник (assistant) with ассистент (assistant)."),
 ("572-prof-03","Secretariat","секретариат, входящий, исходящий, регистрация and нумерация.",
  ["sekretariat","vhodyashchiy","ishodyashchiy","registraciya","numeraciya"], "s:u572",
  "Do not confuse входящий (incoming) with исходящий (outgoing)."),
 ("573-prof-04","Storage","хранение, уничтожение, утилизация, номенклатура and производство.",
  ["hranenie","unichtozhenie","utilizaciya","nomenklatura","proizvodstvo"], "s:u573",
  "Do not confuse хранение (storage) with уничтожение (destruction)."),
 ("574-prof-05","Bureaucratese","канцелярит, канцеляризм, визирование, скрепа and скрепить.",
  ["kanceljarit","kanceljarizm","vizirovanie","skrepa","skrepit"], "s:u574",
  "Do not confuse канцелярит (bureaucratese) with канцеляризм (bureaucratism)."),
 ("575-prof-06","Binding","сшивка, прошивка, нумератор, пронумеровать and проштамповать.",
  ["sshivka","proshivka","numerator","pronumerovat","shtampovat"], "s:u575",
  "Do not confuse сшивка (sewn binding) with прошивка (binding)."),
 ("576-prof-07","Certification","заверить, заверение, заверенный, легализация and апостиль.",
  ["zaverit","zaverenie","zaverennyy","legalizaciya","apostil"], "s:u576",
  "Do not confuse заверение (certification) with легализация (legalization)."),
 ("577-prof-08","Notary","легализовать, нотариус, нотариальный, завещание and наследство.",
  ["legalizovat","notarius","notarialnyy","veshchanie2","nasledstvo"], "s:u577",
  "Do not confuse завещание (will) with наследство (inheritance)."),
 ("578-prof-09","Contract","контракт, распоряжение, постановление, указ and делопроводитель.",
  ["kontrakt","rasporyazhenie","postanovlenie","ukaz","deloprovoditel"], "s:u578",
  "Do not confuse распоряжение (order) with постановление (resolution)."),
 ("579-prof-10","Clerk","канцелярист, регистрационный, ведомственный, служебная and служебка.",
  ["kanceljarist","registracionnyy","vedomstvennyy","sluzhebnaya","sluzhebka"], "s:u579",
  "Do not confuse канцелярист (clerk) with делопроводитель (records manager)."),
]

def unit_yaml(fname, title, summary, words, newitem, fence):
    uid = fname.split("-", 1)[1]
    num = fname[:3]
    lex = [w if w.startswith("ru.lex.") else f"ru.lex.prof.{w}" for w in words]
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
    L.append('goal_id: "ru.goal.b2.professional-writing"')
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
    L.append(f'  expected_interpretations: ["{title}: business letter with taught forms only."]')
    L.append(f'  prohibited_ambiguity: ["{fence}"]')
    L.append('  target_proficiency: "B2"')
    L.append('  validation_method: "choice"')
    return "\n".join(L) + "\n"

for fname, title, summary, words, newitem, fence in U:
    with open(os.path.join(R, "curriculum", "units", fname + ".yaml"), "w") as f:
        f.write(unit_yaml(fname, title, summary, words, newitem, fence))

print("ru batch 55 written")
assert len(WORDS) == 50, len(WORDS)
