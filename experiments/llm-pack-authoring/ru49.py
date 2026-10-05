#!/usr/bin/env python3
"""ru-RU batch 49: B2 units 510-519 (agreement, disagreement, source comparison)."""
import json, os

R = "experiments/llm-pack-authoring/candidates/ru-fullkit-v1"
SRC = ["ru-original"]
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-05", "notes": "ai-drafted; needs dictionary sourcing and human review"}

WORDS = [
 ("raznoglasie","разногласие","разногáсие","disagreement"),
 ("konsensus","консенсус","консéнсус","consensus"),
 ("edinodushie","единодушие","единóдушие","unanimity"),
 ("edinoglasie","единогласие","единóгласие","unanimity (voting)"),
 ("rezonans","резонанс","резонáнс","resonance"),
 ("dissonans","диссонанс","диссóнанс","dissonance"),
 ("sozvuchie","созвучие","созвýчие","consonance"),
 ("sozvuchnyy","созвучный","созвýчный","consonant, akin"),
 ("pereklika","перекликаться","переклúкаться","to echo, rhyme"),
 ("pereklitchka","перекличка","перéкличка","call-and-response, echo"),
 ("otklik","отклик","óтклик","response"),
 ("kivok","кивок","кúвок","nod"),
 ("rashozhdenie","расхождение","расхождéние","divergence"),
 ("sovpadenie","совпадение","совпадéние","coincidence"),
 ("tozhestvo","тождество","тóждество","identity"),
 ("identichnost","идентичность","идентúчность","identity"),
 ("parallel","параллель","параллéль","parallel"),
 ("peresechenie","пересечение","пересечéние","intersection"),
 ("protivopostavlenie","противопоставление","противопоставлéние","contrast, juxtaposition"),
 ("kosvenno","косвенно","кóсвенно","indirectly"),
 ("kosvennyy","косвенный","кóсвенный","indirect"),
 ("pryamoy","прямой","прямóй","direct"),
 ("napryamuyu","напрямую","напрямýю","directly"),
 ("edinomishlennik","единомышленник","единомýшленник","like-minded person"),
 ("soyuznik","союзник","сóюзник","ally"),
 ("soratnik","соратник","сорáтник","comrade, ally"),
 ("neprimirimyy","непримиримый","непримúримый","intransigent"),
 ("peremirie","перемирие","перемúрие","truce"),
 ("posrednik","посредник","посрéдник","intermediary"),
 ("sudya","судья","судья","judge"),
 ("arbitr","арбитр","áрбитр","arbiter"),
 ("ekspert","эксперт","экспéрт","expert"),
 ("otsenchik","оценщик","óценщик","appraiser"),
 ("auditor","аудитор","аудúтор","auditor"),
 ("revizor","ревизор","ревúзор","inspector"),
 ("inspektor","инспектор","инспéктор","inspector"),
 ("kontroljor","контролёр","контролёр","controller"),
 ("razgranichenie","разграничение","разграничéние","demarcation"),
 ("razdelenie","разделение","разделéние","separation"),
 ("razryv","разрыв","рáзрыв","break, gap"),
 ("antagonist","антагонист","антагонúст","antagonist"),
 ("opoziciya","оппозиция","оппози́ция","opposition"),
 ("opozicionnyy","оппозиционный","оппозициóнный","oppositional"),
 ("pollemist","полемист","полемúст","polemicist"),
 ("kontrapunkt","контрапункт","контрапýнкт","counterpoint"),
 ("ednoborstvo","единоборство","единобóрство","single combat"),
 ("poedynok","поединок","поéдинок","duel"),
 ("skhvatka","схватка","схвáтка","skirmish"),
 ("sostyazanie","состязание","состязáние","contest"),
 ("turnir","турнир","турни́р","tournament"),
]

def entry(rid, text, stress, gloss):
    return {"id": f"ru.lex.synthesis3.{rid}", "status": "draft",
            "forms": [{"text": text}], "readings": [{"text": stress}],
            "glosses": {"en-US": [gloss]}, "sources": SRC, "generation": GEN}

with open(os.path.join(R, "lexicon", "synthesis3.jsonl"), "w") as f:
    for rid, text, stress, gloss in WORDS:
        f.write(json.dumps(entry(rid, text, stress, gloss), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ru.grammar.b2-v-otlicie-ot", "name": "В отличие от contrast", "category": "syntax",
  "definition": "Contrast uses в отличие от: в отличие от автора. Learn the supplied chunks as given."},
 {"id": "ru.grammar.b2-vmeste-s-tim", "name": "Вместе с тем concession", "category": "syntax",
  "definition": "Concession uses вместе с тем: вместе с тем, согласен. Learn the supplied chunks as given."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("u510","Это разногласие.","This is a disagreement.",["разногласие"]),
 ("u511","Это консенсус.","This is a consensus.",["консенсус"]),
 ("u512","Это резонанс.","This is a resonance.",["резонанс"]),
 ("u513","Это отклик.","This is a response.",["отклик"]),
 ("u514","Это расхождение.","This is a divergence.",["расхождение"]),
 ("u515","Это совпадение.","This is a coincidence.",["совпадение"]),
 ("u516","Это параллель.","This is a parallel.",["параллель"]),
 ("u517","Это посредник.","This is an intermediary.",["посредник"]),
 ("u518","Это эксперт.","This is an expert.",["эксперт"]),
 ("u519","Это поединок.","This is a duel.",["поединок"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, gloss, cloze in SENTS:
        e = {"id": f"ru.sent.b2.{sid}", "status": "draft", "text": text, "gloss": gloss,
             "cloze_targets": cloze, "sources": SRC, "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

ASSESS = [
 {"id": "ru.assess.b2.synthesis-reading3", "goal_id": "ru.goal.b2.synthesis3",
  "kind": "recognition", "modality": "reading",
  "rubric": {"scale": "observed", "criteria": [
      "Identify comparison words (расхождение, совпадение) across supplied texts.",
      "Match в отличие от chunks to their contrast.",
      "Distinguish консенсус (consensus) from компромисс (compromise)."]},
  "review_status": "draft"},
 {"id": "ru.assess.b2.synthesis-writing3", "goal_id": "ru.goal.b2.synthesis3",
  "kind": "production", "modality": "writing",
  "rubric": {"scale": "observed", "criteria": [
      "Contrast with the supplied в отличие от chunk.",
      "Concede with the supplied вместе с тем chunk.",
      "Compare with a supplied параллель or пересечение chunk."]},
  "review_status": "draft"},
]
with open(os.path.join(R, "assessments", "definitions.jsonl"), "a") as f:
    for a in ASSESS:
        f.write(json.dumps(a, ensure_ascii=False) + "\n")

GOAL_YAML = """  - id: "ru.goal.b2.synthesis3"
    description: "Express agreement, disagreement, and compare sources."
    band: "B2"
    modalities: ["reading", "writing"]
    prerequisites:
      - {target: "ru.goal.b2.synthesis2", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.b2.argumentation3", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.on-ramp.everyday", dimension: "recall-meaning", required_state: "independent", strength: "hard"}
    required_concepts: ["ru.grammar.b2-v-otlicie-ot", "ru.grammar.b2-vmeste-s-tim", "ru.grammar.on-ramp.zero-present-copula"]
    assessment_ids: ["ru.assess.b2.synthesis-reading3", "ru.assess.b2.synthesis-writing3"]
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
 ("510-synthesis3-01","Disagreement","разногласие, консенсус, единодушие, единогласие and резонанс.",
  ["raznoglasie","konsensus","edinodushie","edinoglasie","rezonans"], "s:u510",
  "Do not confuse консенсус (consensus) with единогласие (unanimity)."),
 ("511-synthesis3-02","Dissonance","диссонанс, созвучие, созвучный, перекликаться and перекличка.",
  ["dissonans","sozvuchie","sozvuchnyy","pereklika","pereklitchka"], "s:u511",
  "Do not confuse созвучие (consonance) with диссонанс (dissonance)."),
 ("512-synthesis3-03","Response","отклик, кивок, расхождение, совпадение and тождество.",
  ["otklik","kivok","rashozhdenie","sovpadenie","tozhestvo"], "s:u512",
  "Do not confuse расхождение (divergence) with совпадение (coincidence)."),
 ("513-synthesis3-04","Identity","тождество, идентичность, параллель, пересечение and противопоставление.",
  ["tozhestvo","identichnost","parallel","peresechenie","protivopostavlenie"], "s:u513",
  "Do not confuse тождество (identity) with совпадение (coincidence)."),
 ("514-synthesis3-05","Indirect","косвенно, косвенный, прямой, напрямую and параллель.",
  ["kosvenno","kosvennyy","pryamoy","napryamuyu","parallel"], "s:u514",
  "Do not confuse косвенно (indirectly) with напрямую (directly)."),
 ("515-synthesis3-06","Ally","единомышленник, союзник, соратник, антагонист and оппозиция.",
  ["edinomishlennik","soyuznik","soratnik","antagonist","opoziciya"], "s:u515",
  "Do not confuse союзник (ally) with соратник (comrade)."),
 ("516-synthesis3-07","Truce","непримиримый, перемирие, посредник, судья and арбитр.",
  ["neprimirimyy","peremirie","posrednik","sudya","arbitr"], "s:u516",
  "Do not confuse посредник (intermediary) with арбитр (arbiter)."),
 ("517-synthesis3-08","Expert","эксперт, оценщик, аудитор, ревизор and инспектор.",
  ["ekspert","otsenchik","auditor","revizor","inspektor"], "s:u517",
  "Do not confuse оценщик (appraiser) with аудитор (auditor)."),
 ("518-synthesis3-09","Demarcation","контролёр, разграничение, разделение, разрыв and оппозиционный.",
  ["kontroljor","razgranichenie","razdelenie","razryv","opozicionnyy"], "s:u518",
  "Do not confuse разграничение (demarcation) with разделение (separation)."),
 ("519-synthesis3-10","Duel","полемист, контрапункт, единоборство, поединок and схватка.",
  ["pollemist","kontrapunkt","ednoborstvo","poedynok","skhvatka"], "s:u519",
  "Do not confuse поединок (duel) with схватка (skirmish)."),
]

def unit_yaml(fname, title, summary, words, newitem, fence):
    uid = fname.split("-", 1)[1]
    num = fname[:3]
    lex = [w if w.startswith("ru.lex.") else f"ru.lex.synthesis3.{w}" for w in words]
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
    L.append('goal_id: "ru.goal.b2.synthesis3"')
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
    L.append(f'  expected_interpretations: ["{title}: comparison with taught forms only."]')
    L.append(f'  prohibited_ambiguity: ["{fence}"]')
    L.append('  target_proficiency: "B2"')
    L.append('  validation_method: "choice"')
    return "\n".join(L) + "\n"

for fname, title, summary, words, newitem, fence in U:
    with open(os.path.join(R, "curriculum", "units", fname + ".yaml"), "w") as f:
        f.write(unit_yaml(fname, title, summary, words, newitem, fence))

print("ru batch 49 written")
assert len(WORDS) == 50, len(WORDS)
