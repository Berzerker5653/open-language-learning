#!/usr/bin/env python3
"""ru-RU batch 45: B2 units 470-479 (evidence quality and source limitations)."""
import json, os

R = "experiments/llm-pack-authoring/candidates/ru-fullkit-v1"
SRC = ["ru-original"]
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-05", "notes": "ai-drafted; needs dictionary sourcing and human review"}

WORDS = [
 ("anonimnyy","анонимный","анонúмный","anonymous"),
 ("pervoistochnik","первоисточник","пéрвоисточник","primary source"),
 ("arhiv","архив","архúв","archive"),
 ("attestat","аттестат","аттестáт","certificate"),
 ("licenziya","лицензия","лицéнзия","license"),
 ("patent","патент","патéнт","patent"),
 ("poddelka","подделка","поддéлка","forgery"),
 ("podlog","подлог","пóдлог","falsification (act)"),
 ("falsifikaciya","фальсификация","фальсифика́ция","falsification"),
 ("sfabrikovat","сфабриковать","сфабрикóвать","to fabricate"),
 ("fabrikaciya","фабрикация","фабрикáция","fabrication"),
 ("utka","утка","ýтка","hoax (rumor)"),
 ("vbros","вброс","вбрóс","plant (disinfo)"),
 ("fejk","фейк","фéйк","fake"),
 ("propaganda","пропаганда","пропагáнда","propaganda"),
 ("agitaciya","агитация","агитáция","agitation"),
 ("kontent","контент","контéнт","content"),
 ("media","медиа","мéдиа","media"),
 ("pressa","пресса","прéсса","press"),
 ("veshchanie","вещание","вещáние","broadcasting"),
 ("translyaciya","трансляция","транслýция","broadcast"),
 ("efir","эфир","эфúр","air, broadcast"),
 ("redaktura","редактура","редактýра","editing (process)"),
 ("verifikaciya","верификация","верифика́ция","verification"),
 ("validaciya","валидация","валидáция","validation"),
 ("akkreditaciya","аккредитация","аккредитáция","accreditation"),
 ("legitimnost","легитимность","легитúмность","legitimacy"),
 ("polnomochie","полномочие","полномóчие","authority, power"),
 ("mandat","мандат","мáндат","mandate"),
 ("veshchdok","вещдок","вещдóк","physical evidence"),
 ("poterpevshiy","потерпевший","потерпéвший","victim"),
 ("podozrevaemyy","подозреваемый","подозревáемый","suspect"),
 ("obvinyaemyy","обвиняемый","обвинýемый","defendant"),
 ("istec","истец","истéц","plaintiff"),
 ("otvetchik","ответчик","отвéтчик","defendant (civil)"),
 ("isk","иск","иск","lawsuit"),
 ("arbitrazh","арбитраж","арбитра́ж","arbitration"),
 ("tribunal","трибунал","трибунáл","tribunal"),
 ("konvenciya","конвенция","конвéнция","convention"),
 ("ustav","устав","устáв","charter, statute"),
 ("reglament","регламент","регламéнт","regulations"),
 ("metodichka","методичка","методúчка","guidebook"),
 ("posobie","пособие","посóбие","manual, handbook"),
 ("uchebnik","учебник","учéбник","textbook"),
 ("spravochnik","справочник","спрáвочник","reference book"),
 ("atlas","атлас","атлáс","atlas"),
 ("enciklopediya","энциклопедия","энциклопéдия","encyclopedia"),
 ("katalog","каталог","каталóг","catalog"),
 ("fond","фонд","фóнд","archive fund"),
 ("protokol","протокол","протóкол","protocol, minutes"),
]

def entry(rid, text, stress, gloss):
    return {"id": f"ru.lex.critical3.{rid}", "status": "draft",
            "forms": [{"text": text}], "readings": [{"text": stress}],
            "glosses": {"en-US": [gloss]}, "sources": SRC, "generation": GEN}

with open(os.path.join(R, "lexicon", "critical3.jsonl"), "w") as f:
    for rid, text, stress, gloss in WORDS:
        f.write(json.dumps(entry(rid, text, stress, gloss), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ru.grammar.b2-soglasno", "name": "Согласно + dat attribution", "category": "syntax",
  "definition": "Attribution uses согласно: согласно данным. Learn the supplied chunks as given."},
 {"id": "ru.grammar.b2-pri-etom", "name": "При этом limitation", "category": "syntax",
  "definition": "Limitations use при этом: при этом выборка мала. Learn the supplied chunks as given."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("u470","Это первоисточник.","This is a primary source.",["первоисточник"]),
 ("u471","Это архив.","This is an archive.",["архив"]),
 ("u472","Это лицензия.","This is a license.",["лицензия"]),
 ("u473","Это подделка.","This is a forgery.",["подделка"]),
 ("u474","Это фейк.","This is a fake.",["фейк"]),
 ("u475","Это пропаганда.","This is propaganda.",["пропаганда"]),
 ("u476","Это эфир.","This is a broadcast.",["эфир"]),
 ("u477","Это верификация.","This is verification.",["верификация"]),
 ("u478","Это мандат.","This is a mandate.",["мандат"]),
 ("u479","Это учебник.","This is a textbook.",["учебник"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, gloss, cloze in SENTS:
        e = {"id": f"ru.sent.b2.{sid}", "status": "draft", "text": text, "gloss": gloss,
             "cloze_targets": cloze, "sources": SRC, "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

ASSESS = [
 {"id": "ru.assess.b2.critical-reading-reading3", "goal_id": "ru.goal.b2.critical-reading3",
  "kind": "recognition", "modality": "reading",
  "rubric": {"scale": "observed", "criteria": [
      "Identify source words (первоисточник, архив) in a supplied note.",
      "Match согласно chunks to their attribution.",
      "Distinguish подделка (forgery) from фейк (fake)."]},
  "review_status": "draft"},
 {"id": "ru.assess.b2.critical-reading-writing3", "goal_id": "ru.goal.b2.critical-reading3",
  "kind": "production", "modality": "writing",
  "rubric": {"scale": "observed", "criteria": [
      "Attribute with the supplied согласно chunk.",
      "Limit with the supplied при этом chunk.",
      "Verify with a supplied верификация or проверка chunk."]},
  "review_status": "draft"},
]
with open(os.path.join(R, "assessments", "definitions.jsonl"), "a") as f:
    for a in ASSESS:
        f.write(json.dumps(a, ensure_ascii=False) + "\n")

GOAL_YAML = """  - id: "ru.goal.b2.critical-reading3"
    description: "Judge evidence quality and source limitations."
    band: "B2"
    modalities: ["reading", "writing"]
    prerequisites:
      - {target: "ru.goal.b2.critical-reading2", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.b2.argumentation2", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.on-ramp.everyday", dimension: "recall-meaning", required_state: "independent", strength: "hard"}
    required_concepts: ["ru.grammar.b2-soglasno", "ru.grammar.b2-pri-etom", "ru.grammar.on-ramp.zero-present-copula"]
    assessment_ids: ["ru.assess.b2.critical-reading-reading3", "ru.assess.b2.critical-reading-writing3"]
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
 ("470-critical3-01","Primary source","первоисточник, архив, анонимный, фонд and протокол.",
  ["pervoistochnik","arhiv","anonimnyy","fond","protokol"], "s:u470",
  "Do not confuse первоисточник (primary source) with архив (archive)."),
 ("471-critical3-02","Certificate","аттестат, лицензия, патент, аккредитация and верификация.",
  ["attestat","licenziya","patent","akkreditaciya","verifikaciya"], "s:u471",
  "Do not confuse лицензия (license) with патент (patent)."),
 ("472-critical3-03","Forgery","подделка, подлог, фальсификация, сфабриковать and фабрикация.",
  ["poddelka","podlog","falsifikaciya","sfabrikovat","fabrikaciya"], "s:u472",
  "Do not confuse подделка (forgery) with подлог (falsification)."),
 ("473-critical3-04","Hoax","утка, вброс, фейк, пропаганда and агитация.",
  ["utka","vbros","fejk","propaganda","agitaciya"], "s:u473",
  "Do not confuse утка (hoax) with вброс (plant)."),
 ("474-critical3-05","Content","контент, медиа, пресса, вещание and трансляция.",
  ["kontent","media","pressa","veshchanie","translyaciya"], "s:u474",
  "Do not confuse вещание (broadcasting) with трансляция (broadcast)."),
 ("475-critical3-06","Air","эфир, редактура, валидация, аккредитация and легитимность.",
  ["efir","redaktura","validaciya","akkreditaciya","legitimnost"], "s:u475",
  "Do not confuse верификация (verification) with валидация (validation)."),
 ("476-critical3-07","Authority","полномочие, мандат, устав, регламент and конвенция.",
  ["polnomochie","mandat","ustav","reglament","konvenciya"], "s:u476",
  "Do not confuse устав (charter) with регламент (regulations)."),
 ("477-critical3-08","Physical evidence","вещдок, протокол, потерпевший, подозреваемый and обвиняемый.",
  ["veshchdok","poterpevshiy","protokol","podozrevaemyy","obvinyaemyy"], "s:u477",
  "Do not confuse подозреваемый (suspect) with обвиняемый (defendant)."),
 ("478-critical3-09","Lawsuit","иск, истец, ответчик, арбитраж and трибунал.",
  ["isk","istec","otvetchik","arbitrazh","tribunal"], "s:u478",
  "Do not confuse истец (plaintiff) with ответчик (defendant)."),
 ("479-critical3-10","Guidebook","методичка, пособие, учебник, справочник and энциклопедия.",
  ["metodichka","posobie","uchebnik","spravochnik","enciklopediya"], "s:u479",
  "Do not confuse учебник (textbook) with справочник (reference book)."),
]

def unit_yaml(fname, title, summary, words, newitem, fence):
    uid = fname.split("-", 1)[1]
    num = fname[:3]
    lex = [w if w.startswith("ru.lex.") else f"ru.lex.critical3.{w}" for w in words]
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
    L.append('goal_id: "ru.goal.b2.critical-reading3"')
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
    L.append(f'  expected_interpretations: ["{title}: source quality with taught forms only."]')
    L.append(f'  prohibited_ambiguity: ["{fence}"]')
    L.append('  target_proficiency: "B2"')
    L.append('  validation_method: "choice"')
    return "\n".join(L) + "\n"

for fname, title, summary, words, newitem, fence in U:
    with open(os.path.join(R, "curriculum", "units", fname + ".yaml"), "w") as f:
        f.write(unit_yaml(fname, title, summary, words, newitem, fence))

print("ru batch 45 written")
assert len(WORDS) == 50, len(WORDS)
