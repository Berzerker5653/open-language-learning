#!/usr/bin/env python3
"""ru-RU batch 34: B1 units 360-369 (selection, compression, summaries)."""
import json, os

R = "experiments/llm-pack-authoring/candidates/ru-fullkit-v1"
SRC = ["ru-original"]
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-05", "notes": "ai-drafted; needs dictionary sourcing and human review"}

WORDS = [
 ("otbor","отбор","отбóр","selection"),
 ("kriteriy","критерий","критéрий","criterion"),
 ("priznak","признак","при́знак","sign, feature"),
 ("filtr","фильтр","фúльтр","filter"),
 ("kandidat","кандидат","кандидáт","candidate"),
 ("proba","проба","прóба","trial, sample"),
 ("test","тест","тéст","test"),
 ("obem","объём","объём","volume"),
 ("velichina","величина","величúна","magnitude"),
 ("dlina","длина","дли́на","length"),
 ("shirina","ширина","ширинá","width"),
 ("glubina","глубина","глубинá","depth"),
 ("vykota","высота","высотá","height"),
 ("tyazhest","тяжесть","тя́жесть","weight, heaviness"),
 ("massa","масса","мáсса","mass"),
 ("kolichestvo","количество","колúчество","quantity"),
 ("chislo","число","чúсло","number"),
 ("mera","мера","мéра","measure"),
 ("stepen","степень","стéпень","degree"),
 ("uroven","уровень","ýровень","level"),
 ("masshtab","масштаб","масштáб","scale"),
 ("razmah","размах","размáх","scope, range"),
 ("szhatie","сжатие","сжáтие","compression"),
 ("sokrashchenie","сокращение","сокращéние","shortening"),
 ("kratko","кратко","крáтко","briefly"),
 ("podrobno","подробно","подрóбно","in detail"),
 ("polnost2","полностью","пóлностью","completely"),
 ("chastichno","частично","чáстично","partially"),
 ("vkratce","вкратце","вкрáтце","in short"),
 ("vmesto","вместо","вмéсто","instead of"),
 ("itak","итак","итáк","so, in short"),
 ("szhato","сжато","сжáто","concisely"),
 ("koncovka","концовка","концóвка","ending"),
 ("predislovie","предисловие","предислóвие","preface"),
 ("posleslovie","послесловие","послеслóвие","afterword"),
 ("oglavlenie","оглавление","оглавлéние","table of contents"),
 ("titul","титул","тúтул","title page"),
 ("oblozhka","обложка","облóжка","cover"),
 ("pereplet","переплёт","переплёт","binding"),
 ("list","лист","лист","sheet, leaf"),
 ("stroka","строка","строка́","line"),
 ("kolonka","колонка","колóнка","column"),
 ("podzagolovok","подзаголовок","подзагóловок","subtitle"),
 ("snoska","сноска","сно́ска","footnote"),
 ("primechanie","примечание","примечáние","note"),
 ("ssylka","ссылка","ссылка","link, reference"),
 ("citata","цитата","цитáта","quote"),
 ("kusok","кусок","кусóк","piece"),
 ("otryvok","отрывок","отрýвок","excerpt"),
 ("fragment","фрагмент","фрагмéнт","fragment"),
]

def entry(rid, text, stress, gloss):
    return {"id": f"ru.lex.summary2.{rid}", "status": "draft",
            "forms": [{"text": text}], "readings": [{"text": stress}],
            "glosses": {"en-US": [gloss]}, "sources": SRC, "generation": GEN}

with open(os.path.join(R, "lexicon", "summary2.jsonl"), "w") as f:
    for rid, text, stress, gloss in WORDS:
        f.write(json.dumps(entry(rid, text, stress, gloss), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ru.grammar.b1.takim-obrazom", "name": "Таким образом conclusion", "category": "syntax",
  "definition": "Conclusions use таким образом: таким образом, вывод. Learn the supplied chunks as given."},
 {"id": "ru.grammar.b1.korotche-govorya", "name": "Короче говоря reformulation", "category": "syntax",
  "definition": "Compression uses короче говоря: короче говоря, кратко. Learn the supplied chunks as given."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("u360","Это отбор.","This is selection.",["отбор"]),
 ("u361","Это критерий.","This is a criterion.",["критерий"]),
 ("u362","Это объём.","This is the volume.",["объём"]),
 ("u363","Это количество.","This is the quantity.",["количество"]),
 ("u364","Это уровень.","This is the level.",["уровень"]),
 ("u365","Это сжатие.","This is compression.",["сжатие"]),
 ("u366","Это оглавление.","This is the table of contents.",["оглавление"]),
 ("u367","Это обложка.","This is the cover.",["обложка"]),
 ("u368","Это цитата.","This is a quote.",["цитата"]),
 ("u369","Это отрывок.","This is an excerpt.",["отрывок"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, gloss, cloze in SENTS:
        e = {"id": f"ru.sent.b1.{sid}", "status": "draft", "text": text, "gloss": gloss,
             "cloze_targets": cloze, "sources": SRC, "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

ASSESS = [
 {"id": "ru.assess.b1.info-summary-reading2", "goal_id": "ru.goal.b1.information-summary",
  "kind": "recognition", "modality": "reading",
  "rubric": {"scale": "observed", "criteria": [
      "Identify selection words (отбор, критерий) in a supplied note.",
      "Match таким образом chunks to their conclusion.",
      "Distinguish оглавление (table of contents) from предисловие (preface)."]},
  "review_status": "draft"},
 {"id": "ru.assess.b1.info-summary-writing2", "goal_id": "ru.goal.b1.information-summary",
  "kind": "production", "modality": "writing",
  "rubric": {"scale": "observed", "criteria": [
      "Conclude with the supplied таким образом chunk.",
      "Compress with the supplied короче говоря chunk.",
      "Cite with a supplied цитата or отрывок chunk."]},
  "review_status": "draft"},
]
with open(os.path.join(R, "assessments", "definitions.jsonl"), "a") as f:
    for a in ASSESS:
        f.write(json.dumps(a, ensure_ascii=False) + "\n")

GOAL_YAML = """  - id: "ru.goal.b1.information-summary2"
    description: "Select, compress, and summarize information with conclusion chunks."
    band: "B1"
    modalities: ["reading", "writing"]
    prerequisites:
      - {target: "ru.goal.b1.information-summary", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.b1.opinions", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.on-ramp.everyday", dimension: "recall-meaning", required_state: "independent", strength: "hard"}
    required_concepts: ["ru.grammar.b1.takim-obrazom", "ru.grammar.b1.korotche-govorya", "ru.grammar.on-ramp.zero-present-copula"]
    assessment_ids: ["ru.assess.b1.info-summary-reading2", "ru.assess.b1.info-summary-writing2"]
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
 ("360-summary2-01","Selection","отбор, критерий, признак, фильтр and кандидат.",
  ["otbor","kriteriy","priznak","filtr","kandidat"], "s:u360",
  "Do not confuse признак (feature) with критерий (criterion)."),
 ("361-summary2-02","Trial","проба, тест, отбор, критерий and признак.",
  ["proba","test","otbor","kriteriy","priznak"], "s:u361",
  "Do not confuse проба (trial) with тест (test)."),
 ("362-summary2-03","Volume","объём, величина, длина, ширина and глубина.",
  ["obem","velichina","dlina","shirina","glubina"], "s:u362",
  "Do not confuse длина (length) with ширина (width)."),
 ("363-summary2-04","Height","высота, тяжесть, масса, количество and число.",
  ["vykota","tyazhest","massa","kolichestvo","chislo"], "s:u363",
  "Do not confuse масса (mass) with количество (quantity)."),
 ("364-summary2-05","Measure","мера, степень, уровень, масштаб and размах.",
  ["mera","stepen","uroven","masshtab","razmah"], "s:u364",
  "Do not confuse степень (degree) with уровень (level)."),
 ("365-summary2-06","Compression","сжатие, сокращение, кратко, подробно and вкратце.",
  ["szhatie","sokrashchenie","kratko","podrobno","vkratce"], "s:u365",
  "Do not confuse кратко (briefly) with подробно (in detail)."),
 ("366-summary2-07","Partially","полностью, частично, сжато, вместо and итак.",
  ["polnost2","chastichno","szhato","vmesto","itak"], "s:u366",
  "Do not confuse полностью (completely) with частично (partially)."),
 ("367-summary2-08","Preface","предисловие, послесловие, оглавление, титул and концовка.",
  ["predislovie","posleslovie","oglavlenie","titul","koncovka"], "s:u367",
  "Do not confuse предисловие (preface) with послесловие (afterword)."),
 ("368-summary2-09","Cover","обложка, переплёт, лист, строка and колонка.",
  ["oblozhka","pereplet","list","stroka","kolonka"], "s:u368",
  "Do not confuse обложка (cover) with переплёт (binding)."),
 ("369-summary2-10","Quote","цитата, кусок, отрывок, фрагмент and подзаголовок.",
  ["citata","kusok","otryvok","fragment","podzagolovok"], "s:u369",
  "Do not confuse отрывок (excerpt) with фрагмент (fragment)."),
]

def unit_yaml(fname, title, summary, words, newitem, fence):
    uid = fname.split("-", 1)[1]
    num = fname[:3]
    lex = [w if w.startswith("ru.lex.") else f"ru.lex.summary2.{w}" for w in words]
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
    L.append('goal_id: "ru.goal.b1.information-summary2"')
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
    L.append(f'  expected_interpretations: ["{title}: summary with taught forms only."]')
    L.append(f'  prohibited_ambiguity: ["{fence}"]')
    L.append('  target_proficiency: "B1"')
    L.append('  validation_method: "choice"')
    return "\n".join(L) + "\n"

for fname, title, summary, words, newitem, fence in U:
    with open(os.path.join(R, "curriculum", "units", fname + ".yaml"), "w") as f:
        f.write(unit_yaml(fname, title, summary, words, newitem, fence))

print("ru batch 34 written")
assert len(WORDS) == 50, len(WORDS)
