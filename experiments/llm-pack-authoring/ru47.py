#!/usr/bin/env python3
"""ru-RU batch 47: B2 units 490-499 (accurate paraphrase and attribution)."""
import json, os

R = "experiments/llm-pack-authoring/candidates/ru-fullkit-v1"
SRC = ["ru-original"]
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-05", "notes": "ai-drafted; needs dictionary sourcing and human review"}

WORDS = [
 ("atribuciya","атрибуция","атрибу́ция","attribution"),
 ("tsitirovanie","цитирование","цитúрование","quoting"),
 ("zaimstvovanie","заимствование","заúмствование","borrowing"),
 ("doslovno","дословно","дóсловно","verbatim"),
 ("svobodno","свободно","свобóдно","freely"),
 ("blizko","близко","блúзко","closely"),
 ("kalka","калька","кáлька","calque, loan translation"),
 ("adaptaciya","адаптация","адаптáция","adaptation"),
 ("inscenirovka","инсценировка","инсцени́ровка","staging"),
 ("ekranizaciya","экранизация","экраниза́ция","screen adaptation"),
 ("perelozenie","переложение","перелóжение","paraphrase, arrangement"),
 ("kompilyaciya","компиляция","компилýция","compilation"),
 ("referat","реферат","реферáт","abstract, report"),
 ("epigraf","эпиграф","эпúграф","epigraph"),
 ("dedikaciya","дедикация","дедика́ция","dedication"),
 ("posvyashchenie","посвящение","посвящéние","dedication"),
 ("rashifrovka","расшифровка","расшифрóвка","decoding, transcript"),
 ("stenogramma","стенограмма","стеногрáмма","transcript"),
 ("diktor","диктор","дúктор","announcer"),
 ("intonaciya","интонация","интонáция","intonation"),
 ("temp","темп","темп","tempo"),
 ("melodika","мелодика","мелóдика","melody of speech"),
 ("vyrazitelnost","выразительность","выразúтельность","expressiveness"),
 ("bukvalnost","буквальность","бýквальность","literality"),
 ("doslovnost","дословность","дóсловность","verbatimness"),
 ("volnost","вольность","вóльность","licence, freedom"),
 ("svoboda","свобода","свобóда","freedom"),
 ("volya","воля","вóля","will, freedom"),
 ("proizvol","произвол","произвóл","arbitrariness"),
 ("samotsenzura","самоцензура","самоцензýра","self-censorship"),
 ("izdatel","издатель","издáтель","publisher"),
 ("publikaciya","публикация","публикáция","publication"),
 ("opublikovat","опубликовать","опубликóвать","to publish"),
 ("avtor","автор","áвтор","author"),
 ("soavtor","соавтор","соáвтор","co-author"),
 ("komanda","команда","комáнда","team"),
 ("brigada","бригада","бригáда","brigade, crew"),
 ("kruzhok","кружок","кружóк","club, circle"),
 ("sekciya","секция","сéкция","section"),
 ("associaciya","ассоциация","ассоциáция","association"),
 ("obshchestvo","общество","óбщество","society"),
 ("hrestomatiya","хрестоматия","хрестомáтия","reader, chrestomathy"),
 ("tsitatnik","цитатник","цитáтник","quotation book"),
 ("antologiya","антология","антолóгия","anthology"),
 ("sbornik","сборник","сбóрник","collection"),
 ("almanah","альманах","альманáх","almanac"),
 ("samizdat","самиздат","самиздáт","samizdat"),
 ("zaimstvovat","заимствовать","заúмствовать","to borrow"),
 ("kompilirovat","компилировать","компили́ровать","to compile"),
 ("adaptirovat","адаптировать","адапти́ровать","to adapt"),
]

def entry(rid, text, stress, gloss):
    return {"id": f"ru.lex.synthesis.{rid}", "status": "draft",
            "forms": [{"text": text}], "readings": [{"text": stress}],
            "glosses": {"en-US": [gloss]}, "sources": SRC, "generation": GEN}

with open(os.path.join(R, "lexicon", "synthesis.jsonl"), "w") as f:
    for rid, text, stress, gloss in WORDS:
        f.write(json.dumps(entry(rid, text, stress, gloss), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ru.grammar.b2-po-mneniyu", "name": "По мнению + gen attribution", "category": "syntax",
  "definition": "Attribution uses по мнению: по мнению автора. Learn the supplied chunks as given."},
 {"id": "ru.grammar.b2-drugimi-slovami2", "name": "Другими словами paraphrase", "category": "syntax",
  "definition": "Paraphrase uses другими словами: другими словами, короче. Learn the supplied chunks as given."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("u490","Это атрибуция.","This is attribution.",["атрибуция"]),
 ("u491","Это цитирование.","This is quoting.",["цитирование"]),
 ("u492","Это калька.","This is a calque.",["калька"]),
 ("u493","Это адаптация.","This is an adaptation.",["адаптация"]),
 ("u494","Это реферат.","This is an abstract.",["реферат"]),
 ("u495","Это эпиграф.","This is an epigraph.",["эпиграф"]),
 ("u496","Это диктор.","This is an announcer.",["диктор"]),
 ("u497","Это издатель.","This is a publisher.",["издатель"]),
 ("u498","Это автор.","This is an author.",["автор"]),
 ("u499","Это сборник.","This is a collection.",["сборник"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, gloss, cloze in SENTS:
        e = {"id": f"ru.sent.b2.{sid}", "status": "draft", "text": text, "gloss": gloss,
             "cloze_targets": cloze, "sources": SRC, "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

ASSESS = [
 {"id": "ru.assess.b2.synthesis-reading", "goal_id": "ru.goal.b2.synthesis",
  "kind": "recognition", "modality": "reading",
  "rubric": {"scale": "observed", "criteria": [
      "Identify attribution words (атрибуция, автор) in a supplied text.",
      "Match по мнению chunks to their attribution.",
      "Distinguish дословно (verbatim) from свободно (freely)."]},
  "review_status": "draft"},
 {"id": "ru.assess.b2.synthesis-writing", "goal_id": "ru.goal.b2.synthesis",
  "kind": "production", "modality": "writing",
  "rubric": {"scale": "observed", "criteria": [
      "Attribute with the supplied по мнению chunk.",
      "Paraphrase with the supplied другими словами chunk.",
      "Quote with a supplied цитата or ссылка chunk."]},
  "review_status": "draft"},
]
with open(os.path.join(R, "assessments", "definitions.jsonl"), "a") as f:
    for a in ASSESS:
        f.write(json.dumps(a, ensure_ascii=False) + "\n")

GOAL_YAML = """  - id: "ru.goal.b2.synthesis"
    description: "Paraphrase accurately and attribute sources."
    band: "B2"
    modalities: ["reading", "writing"]
    prerequisites:
      - {target: "ru.goal.b1.extended-writing2", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.b2.critical-reading", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.on-ramp.everyday", dimension: "recall-meaning", required_state: "independent", strength: "hard"}
    required_concepts: ["ru.grammar.b2-po-mneniyu", "ru.grammar.b2-drugimi-slovami2", "ru.grammar.on-ramp.zero-present-copula"]
    assessment_ids: ["ru.assess.b2.synthesis-reading", "ru.assess.b2.synthesis-writing"]
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
 ("490-synthesis-01","Attribution","атрибуция, цитирование, заимствование, автор and соавтор.",
  ["atribuciya","tsitirovanie","zaimstvovanie","avtor","soavtor"], "s:u490",
  "Do not confuse атрибуция (attribution) with цитирование (quoting)."),
 ("491-synthesis-02","Verbatim","дословно, свободно, близко, буквальность and дословность.",
  ["doslovno","svobodno","blizko","bukvalnost","doslovnost"], "s:u491",
  "Do not confuse дословно (verbatim) with свободно (freely)."),
 ("492-synthesis-03","Calque","калька, адаптация, инсценировка, экранизация and переложение.",
  ["kalka","adaptaciya","inscenirovka","ekranizaciya","perelozenie"], "s:u492",
  "Do not confuse адаптация (adaptation) with инсценировка (staging)."),
 ("493-synthesis-04","Compilation","компиляция, реферат, эпиграф, дедикация and посвящение.",
  ["kompilyaciya","referat","epigraf","dedikaciya","posvyashchenie"], "s:u493",
  "Do not confuse дедикация (dedication) with посвящение (dedication)."),
 ("494-synthesis-05","Transcript","расшифровка, стенограмма, диктор, интонация and темп.",
  ["rashifrovka","stenogramma","diktor","intonaciya","temp"], "s:u494",
  "Do not confuse расшифровка (decoding) with стенограмма (transcript)."),
 ("495-synthesis-06","Expressiveness","мелодика, выразительность, интонация, темп and диктор.",
  ["melodika","vyrazitelnost","intonaciya","temp","diktor"], "s:u495",
  "Do not confuse мелодика (speech melody) with интонация (intonation)."),
 ("496-synthesis-07","Licence","вольность, свобода, воля, произвол and самоцензура.",
  ["volnost","svoboda","volya","proizvol","samotsenzura"], "s:u496",
  "Do not confuse свобода (freedom) with произвол (arbitrariness)."),
 ("497-synthesis-08","Publisher","издатель, публикация, опубликовать, издательство and тираж.",
  ["izdatel","publikaciya","opublikovat","hrestomatiya","tsitatnik"], "s:u497",
  "Do not confuse издатель (publisher) with автор (author)."),
 ("498-synthesis-09","Team","команда, бригада, кружок, секция and ассоциация.",
  ["komanda","brigada","kruzhok","sekciya","associaciya"], "s:u498",
  "Do not confuse кружок (club) with секция (section)."),
 ("499-synthesis-10","Society","общество, хрестоматия, цитатник, антология and сборник.",
  ["obshchestvo","hrestomatiya","tsitatnik","antologiya","sbornik"], "s:u499",
  "Do not confuse антология (anthology) with сборник (collection)."),
]

def unit_yaml(fname, title, summary, words, newitem, fence):
    uid = fname.split("-", 1)[1]
    num = fname[:3]
    lex = [w if w.startswith("ru.lex.") else f"ru.lex.synthesis.{w}" for w in words]
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
    L.append('goal_id: "ru.goal.b2.synthesis"')
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
    L.append(f'  expected_interpretations: ["{title}: paraphrase with taught forms only."]')
    L.append(f'  prohibited_ambiguity: ["{fence}"]')
    L.append('  target_proficiency: "B2"')
    L.append('  validation_method: "choice"')
    return "\n".join(L) + "\n"

for fname, title, summary, words, newitem, fence in U:
    with open(os.path.join(R, "curriculum", "units", fname + ".yaml"), "w") as f:
        f.write(unit_yaml(fname, title, summary, words, newitem, fence))

print("ru batch 47 written")
assert len(WORDS) == 50, len(WORDS)
