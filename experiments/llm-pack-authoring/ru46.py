#!/usr/bin/env python3
"""ru-RU batch 46: B2 units 480-489 (competing interpretations and inference)."""
import json, os

R = "experiments/llm-pack-authoring/candidates/ru-fullkit-v1"
SRC = ["ru-original"]
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-05", "notes": "ai-drafted; needs dictionary sourcing and human review"}

WORDS = [
 ("umozakljuchenie","умозаключение","умозаключéние","inference, syllogism"),
 ("indukciya","индукция","индýкция","induction"),
 ("dedukciya","дедукция","дéдукция","deduction"),
 ("sillogizm","силлогизм","силлóгизм","syllogism"),
 ("nelepica","нелепица","нелéпица","nonsense"),
 ("chush","чушь","чушь","nonsense, drivel"),
 ("vzdor","вздор","вздóр","nonsense"),
 ("bred","бред","бред","delusion, ravings"),
 ("zabluzhdenie","заблуждение","заблýждение","misconception"),
 ("samooobman","самообман","самообмáн","self-deception"),
 ("yarklyk","ярлык","ярлýк","label, tag"),
 ("nakleyka","наклейка","наклéйка","sticker, label"),
 ("kontrdovod","контрдовод","контрдóвод","counter-reason"),
 ("traktovka","трактовка","трактóвка","interpretation"),
 ("prochtenie","прочтение","прочтéние","reading, interpretation"),
 ("allyuziya","аллюзия","аллýзия","allusion"),
 ("otsylka","отсылка","óтсылка","reference, allusion"),
 ("primeta","примета","примéта","sign, omen"),
 ("prevestnik","предвестник","прéвестник","harbinger"),
 ("interpretaciya","интерпретация","интерпретáция","interpretation"),
 ("ponimanie","понимание","понимáние","understanding"),
 ("neponimanie","непонимание","непонимáние","misunderstanding"),
 ("ozarenie","озарение","озарéние","insight, revelation"),
 ("dogadka","догадка","догáдка","guess"),
 ("prozrenie","прозрение","прозрéние","insight, enlightenment"),
 ("naitie","наитие","наúтие","intuition, hunch"),
 ("intuiciya","интуиция","интýиция","intuition"),
 ("predchuvstvie","предчувствие","прéдчувствие","premonition"),
 ("teorema","теорема","теорéма","theorem"),
 ("aksioma","аксиома","аксиóма","axiom"),
 ("postulat","постулат","постулáт","postulate"),
 ("prichinnost","причинность","причúнность","causality"),
 ("sluchaynost","случайность","слýчайность","randomness"),
 ("anomaliya","аномалия","аномáлия","anomaly"),
 ("otklonenie","отклонение","отклонéние","deviation"),
 ("smeshchenie","смещение","смéщение","shift, displacement"),
 ("perekos","перекос","перекóс","skew, distortion"),
 ("lozhnyy","ложный","лóжный","false"),
 ("istinnyy","истинный","úстинный","true"),
 ("spravedlivyy","справедливый","справéдливый","fair"),
 ("nepravda","неправда","непрáвда","untruth"),
 ("polupravda","полуправда","пóлуправда","half-truth"),
 ("poverxnostnyy","поверхностный","поверхнóстный","superficial"),
 ("glubokiy","глубокий","глубóкий","deep"),
 ("umozrittelnyy","умозрительный","умозрúтельный","speculative"),
 ("empirika","эмпирика","эмпúрика","empirics"),
 ("empiricheskiy","эмпирический","эмпири́ческий","empirical"),
 ("neodnoznachnyy","неоднозначный","неоднознáчный","ambiguous"),
 ("mnogoznachnost","многозначность","многознáчность","polysemy, ambiguity"),
 ("neopredelennost","неопределенность","неопределéнность","uncertainty"),
]

def entry(rid, text, stress, gloss):
    return {"id": f"ru.lex.critical4.{rid}", "status": "draft",
            "forms": [{"text": text}], "readings": [{"text": stress}],
            "glosses": {"en-US": [gloss]}, "sources": SRC, "generation": GEN}

with open(os.path.join(R, "lexicon", "critical4.jsonl"), "w") as f:
    for rid, text, stress, gloss in WORDS:
        f.write(json.dumps(entry(rid, text, stress, gloss), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ru.grammar.b2-iz-etogo-sleduet", "name": "Из этого следует inference", "category": "syntax",
  "definition": "Inference uses из этого следует: из этого следует вывод. Learn the supplied chunks as given."},
 {"id": "ru.grammar.b2-mozhno-tolkovat", "name": "Можно толковать interpretation", "category": "syntax",
  "definition": "Interpretation uses можно толковать: можно толковать двояко. Learn the supplied chunks as given."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("u480","Это умозаключение.","This is an inference.",["умозаключение"]),
 ("u481","Это индукция.","This is induction.",["индукция"]),
 ("u482","Это заблуждение.","This is a misconception.",["заблуждение"]),
 ("u483","Это ярлык.","This is a label.",["ярлык"]),
 ("u484","Это трактовка.","This is an interpretation.",["трактовка"]),
 ("u485","Это аллюзия.","This is an allusion.",["аллюзия"]),
 ("u486","Это интуиция.","This is intuition.",["интуиция"]),
 ("u487","Это аксиома.","This is an axiom.",["аксиома"]),
 ("u488","Это аномалия.","This is an anomaly.",["аномалия"]),
 ("u489","Это полуправда.","This is a half-truth.",["полуправда"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, gloss, cloze in SENTS:
        e = {"id": f"ru.sent.b2.{sid}", "status": "draft", "text": text, "gloss": gloss,
             "cloze_targets": cloze, "sources": SRC, "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

ASSESS = [
 {"id": "ru.assess.b2.critical-reading-reading4", "goal_id": "ru.goal.b2.critical-reading4",
  "kind": "recognition", "modality": "reading",
  "rubric": {"scale": "observed", "criteria": [
      "Identify inference words (умозаключение, индукция) in a supplied note.",
      "Match из этого следует chunks to their inference.",
      "Distinguish трактовка (interpretation) from прочтение (reading)."]},
  "review_status": "draft"},
 {"id": "ru.assess.b2.critical-reading-writing4", "goal_id": "ru.goal.b2.critical-reading4",
  "kind": "production", "modality": "writing",
  "rubric": {"scale": "observed", "criteria": [
      "Infer with the supplied из этого следует chunk.",
      "Interpret with the supplied можно толковать chunk.",
      "Contrast with a supplied трактовка or версия chunk."]},
  "review_status": "draft"},
]
with open(os.path.join(R, "assessments", "definitions.jsonl"), "a") as f:
    for a in ASSESS:
        f.write(json.dumps(a, ensure_ascii=False) + "\n")

GOAL_YAML = """  - id: "ru.goal.b2.critical-reading4"
    description: "Weigh competing interpretations and inferences."
    band: "B2"
    modalities: ["reading", "writing"]
    prerequisites:
      - {target: "ru.goal.b2.critical-reading3", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.b2.argumentation3", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.on-ramp.everyday", dimension: "recall-meaning", required_state: "independent", strength: "hard"}
    required_concepts: ["ru.grammar.b2-iz-etogo-sleduet", "ru.grammar.b2-mozhno-tolkovat", "ru.grammar.on-ramp.zero-present-copula"]
    assessment_ids: ["ru.assess.b2.critical-reading-reading4", "ru.assess.b2.critical-reading-writing4"]
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
 ("480-critical4-01","Inference","умозаключение, индукция, дедукция, силлогизм and постулат.",
  ["umozakljuchenie","indukciya","dedukciya","sillogizm","postulat"], "s:u480",
  "Do not confuse индукция (induction) with дедукция (deduction)."),
 ("481-critical4-02","Nonsense","нелепица, чушь, вздор, бред and заблуждение.",
  ["nelepica","chush","vzdor","bred","zabluzhdenie"], "s:u481",
  "Do not confuse чушь (drivel) with заблуждение (misconception)."),
 ("482-critical4-03","Self-deception","самообман, заблуждение, ярлык, наклейка and контрдовод.",
  ["samooobman","zabluzhdenie","yarklyk","nakleyka","kontrdovod"], "s:u482",
  "Do not confuse ярлык (label) with наклейка (sticker)."),
 ("483-critical4-04","Interpretation","трактовка, прочтение, интерпретация, аллюзия and отсылка.",
  ["traktovka","prochtenie","interpretaciya","allyuziya","otsylka"], "s:u483",
  "Do not confuse трактовка (interpretation) with прочтение (reading)."),
 ("484-critical4-05","Harbinger","примета, предвестник, аллюзия, отсылка and предчувствие.",
  ["primeta","prevestnik","allyuziya","otsylka","predchuvstvie"], "s:u484",
  "Do not confuse примета (omen) with предвестник (harbinger)."),
 ("485-critical4-06","Understanding","понимание, непонимание, озарение, догадка and прозрение.",
  ["ponimanie","neponimanie","ozarenie","dogadka","prozrenie"], "s:u485",
  "Do not confuse озарение (revelation) with прозрение (enlightenment)."),
 ("486-critical4-07","Intuition","наитие, интуиция, предчувствие, догадка and озарение.",
  ["naitie","intuiciya","predchuvstvie","dogadka","ozarenie"], "s:u486",
  "Do not confuse наитие (hunch) with предчувствие (premonition)."),
 ("487-critical4-08","Axiom","теорема, аксиома, постулат, причинность and случайность.",
  ["teorema","aksioma","postulat","prichinnost","sluchaynost"], "s:u487",
  "Do not confuse аксиома (axiom) with теорема (theorem)."),
 ("488-critical4-09","Anomaly","аномалия, отклонение, смещение, перекос and эмпирика.",
  ["anomaliya","otklonenie","smeshchenie","perekos","empirika"], "s:u488",
  "Do not confuse отклонение (deviation) with смещение (shift)."),
 ("489-critical4-10","Half-truth","неправда, полуправда, ложный, истинный and справедливый.",
  ["nepravda","polupravda","lozhnyy","istinnyy","spravedlivyy"], "s:u489",
  "Do not confuse полуправда (half-truth) with неправда (untruth)."),
]

def unit_yaml(fname, title, summary, words, newitem, fence):
    uid = fname.split("-", 1)[1]
    num = fname[:3]
    lex = [w if w.startswith("ru.lex.") else f"ru.lex.critical4.{w}" for w in words]
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
    L.append('goal_id: "ru.goal.b2.critical-reading4"')
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
    L.append(f'  expected_interpretations: ["{title}: inference with taught forms only."]')
    L.append(f'  prohibited_ambiguity: ["{fence}"]')
    L.append('  target_proficiency: "B2"')
    L.append('  validation_method: "choice"')
    return "\n".join(L) + "\n"

for fname, title, summary, words, newitem, fence in U:
    with open(os.path.join(R, "curriculum", "units", fname + ".yaml"), "w") as f:
        f.write(unit_yaml(fname, title, summary, words, newitem, fence))

print("ru batch 46 written")
assert len(WORDS) == 50, len(WORDS)
