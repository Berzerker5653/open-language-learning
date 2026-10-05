#!/usr/bin/env python3
"""ru-RU batch 54: B2 units 560-569 (findings, interpretations, and discussion)."""
import json, os

R = "experiments/llm-pack-authoring/candidates/ru-fullkit-v1"
SRC = ["ru-original"]
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-05", "notes": "ai-drafted; needs dictionary sourcing and human review"}

WORDS = [
 ("otkrytie","открытие","открýтие","discovery, opening"),
 ("nahodka","находка","нахóдка","finding"),
 ("obsuzhdenie","обсуждение","обсуждéние","discussion"),
 ("zvanie","звание","звáние","title, rank"),
 ("shirota","широта","широтá","breadth"),
 ("polnota","полнота","полнотá","completeness"),
 ("logichnost","логичность","лóгичность","logicality"),
 ("naglyadnost","наглядность","наглýдность","visual clarity"),
 ("naglyadnyy","наглядный","наглýдный","visual, illustrative"),
 ("oshchutimyy","ощутимый","ощýтимый","tangible"),
 ("realnyy","реальный","реáльный","real"),
 ("virtualnyy","виртуальный","виртуáльный","virtual"),
 ("fakticheskiy","фактический","фáктический","factual"),
 ("teoreticheskiy","теоретический","теорéтический","theoretical"),
 ("prakticheskiy","практический","прáктический","practical"),
 ("prikladnoy","прикладной","прикладнóй","applied"),
 ("chistyy","чистый","чúстый","pure"),
 ("primes","примесь","прúмесь","impurity, admixture"),
 ("dobavka","добавка","добáвка","additive"),
 ("smes","смесь","смесь","mixture"),
 ("rastvor","раствор","раствóр","solution"),
 ("splav","сплав","сплáв","alloy"),
 ("klej","клей","клей","glue"),
 ("soedinit","соединить","соединúть","to join, connect"),
 ("soedinenie","соединение","соединéние","connection, joint"),
 ("styk","стык","стык","joint, seam"),
 ("shov","шов","шов","seam"),
 ("zazor","зазор","зáзор","gap, clearance"),
 ("shchel","щель","щéль","crack, crevice"),
 ("treshchina","трещина","трéщина","crack"),
 ("dyra","дыра","дырá","hole"),
 ("otverstie","отверстие","отвéрстие","opening, hole"),
 ("izlom","излом","излóм","bend, fracture"),
 ("izgib","изгиб","изгúб","curve, bend"),
 ("razvorot","разворот","разворóт","turn, reversal"),
 ("oblik","облик","óблик","appearance, look"),
 ("normativ","норматив","норматúв","norm, standard"),
 ("normativnyy","нормативный","норматúвный","normative"),
 ("tipologiya","типология","типолóгия","typology"),
 ("sistematika","систематика","системáтика","systematics"),
 ("sistemnyy","системный","систéмный","systemic"),
 ("kompleks","комплекс","кóмплекс","complex"),
 ("kompleksnyy","комплексный","комплéксный","complex (adj)"),
 ("taksonomiya","таксономия","таксономúя","taxonomy"),
 ("preemstvennost","преемственность","прее́мственность","continuity"),
 ("preemnik","преемник","прее́мник","successor"),
 ("naslednik","наследник","наслéдник","heir"),
 ("imitaciya","имитация","имитáция","imitation"),
 ("karikatura","карикатура","карикату́ра","caricature"),
 ("grotesk","гротеск","гротéск","grotesque"),
]

def entry(rid, text, stress, gloss):
    return {"id": f"ru.lex.study4.{rid}", "status": "draft",
            "forms": [{"text": text}], "readings": [{"text": stress}],
            "glosses": {"en-US": [gloss]}, "sources": SRC, "generation": GEN}

with open(os.path.join(R, "lexicon", "study4.jsonl"), "w") as f:
    for rid, text, stress, gloss in WORDS:
        f.write(json.dumps(entry(rid, text, stress, gloss), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ru.grammar.b2-soglasno-avtoram", "name": "По данным авторов attribution", "category": "syntax",
  "definition": "Findings cite with по данным: по данным авторов. Learn the supplied chunks as given."},
 {"id": "ru.grammar.b2-v-hod-obsuzhdeniya", "name": "В ходе обсуждения discussion", "category": "syntax",
  "definition": "Discussion uses в ходе обсуждения: в ходе обсуждения выяснилось. Learn the supplied chunks as given."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("u560","Это открытие.","This is a discovery.",["открытие"]),
 ("u561","Это находка.","This is a finding.",["находка"]),
 ("u562","Это обсуждение.","This is a discussion.",["обсуждение"]),
 ("u563","Это полнота.","This is completeness.",["полнота"]),
 ("u564","Это смесь.","This is a mixture.",["смесь"]),
 ("u565","Это раствор.","This is a solution.",["раствор"]),
 ("u566","Это стык.","This is a joint.",["стык"]),
 ("u567","Это изгиб.","This is a curve.",["изгиб"]),
 ("u568","Это облик.","This is an appearance.",["облик"]),
 ("u569","Это комплекс.","This is a complex.",["комплекс"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, gloss, cloze in SENTS:
        e = {"id": f"ru.sent.b2.{sid}", "status": "draft", "text": text, "gloss": gloss,
             "cloze_targets": cloze, "sources": SRC, "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

ASSESS = [
 {"id": "ru.assess.b2.academic-study-reading4", "goal_id": "ru.goal.b2.academic-study4",
  "kind": "recognition", "modality": "reading",
  "rubric": {"scale": "observed", "criteria": [
      "Identify finding words (открытие, находка) in a supplied paper.",
      "Match по данным chunks to their attribution.",
      "Distinguish теоретический (theoretical) from практический (practical)."]},
  "review_status": "draft"},
 {"id": "ru.assess.b2.academic-study-writing4", "goal_id": "ru.goal.b2.academic-study4",
  "kind": "production", "modality": "writing",
  "rubric": {"scale": "observed", "criteria": [
      "Cite with the supplied по данных chunk.",
      "Discuss with the supplied в ходе обсуждения chunk.",
      "Interpret with a supplied обсуждение or версия chunk."]},
  "review_status": "draft"},
]
with open(os.path.join(R, "assessments", "definitions.jsonl"), "a") as f:
    for a in ASSESS:
        f.write(json.dumps(a, ensure_ascii=False) + "\n")

GOAL_YAML = """  - id: "ru.goal.b2.academic-study4"
    description: "Present findings, interpretations, and discussion."
    band: "B2"
    modalities: ["reading", "writing"]
    prerequisites:
      - {target: "ru.goal.b2.academic-study3", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.b2.critical-reading4", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.on-ramp.everyday", dimension: "recall-meaning", required_state: "independent", strength: "hard"}
    required_concepts: ["ru.grammar.b2-soglasno-avtoram", "ru.grammar.b2-v-hod-obsuzhdeniya", "ru.grammar.on-ramp.zero-present-copula"]
    assessment_ids: ["ru.assess.b2.academic-study-reading4", "ru.assess.b2.academic-study-writing4"]
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
 ("560-study4-01","Discovery","открытие, находка, обсуждение, звание and широта.",
  ["otkrytie","nahodka","obsuzhdenie","zvanie","shirota"], "s:u560",
  "Do not confuse открытие (discovery) with находка (finding)."),
 ("561-study4-02","Completeness","полнота, логичность, наглядность, наглядный and ощутимый.",
  ["polnota","logichnost","naglyadnost","naglyadnyy","oshchutimyy"], "s:u561",
  "Do not confuse полнота (completeness) with логичность (logicality)."),
 ("562-study4-03","Real","реальный, виртуальный, фактический, теоретический and практический.",
  ["realnyy","virtualnyy","fakticheskiy","teoreticheskiy","prakticheskiy"], "s:u562",
  "Do not confuse реальный (real) with виртуальный (virtual)."),
 ("563-study4-04","Applied","прикладной, чистый, примесь, добавка and смесь.",
  ["prikladnoy","chistyy","primes","dobavka","smes"], "s:u563",
  "Do not confuse примесь (impurity) with добавка (additive)."),
 ("564-study4-05","Solution","раствор, сплав, клей, соединить and соединение.",
  ["rastvor","splav","klej","soedinit","soedinenie"], "s:u564",
  "Do not confuse раствор (solution) with сплав (alloy)."),
 ("565-study4-06","Joint","стык, шов, зазор, щель and трещина.",
  ["styk","shov","zazor","shchel","treshchina"], "s:u565",
  "Do not confuse стык (joint) with шов (seam)."),
 ("566-study4-07","Hole","дыра, отверстие, излом, изгиб and разворот.",
  ["dyra","otverstie","izlom","izgib","razvorot"], "s:u566",
  "Do not confuse излом (fracture) with изгиб (curve)."),
 ("567-study4-08","Appearance","облик, норматив, нормативный, типология and систематика.",
  ["oblik","normativ","normativnyy","tipologiya","sistematika"], "s:u567",
  "Do not confuse типология (typology) with систематика (systematics)."),
 ("568-study4-09","Systemic","системный, комплекс, комплексный, таксономия and преемственность.",
  ["sistemnyy","kompleks","kompleksnyy","taksonomiya","preemstvennost"], "s:u568",
  "Do not confuse системный (systemic) with комплексный (complex)."),
 ("569-study4-10","Successor","преемник, наследник, имитация, карикатура and гротеск.",
  ["preemnik","naslednik","imitaciya","karikatura","grotesk"], "s:u569",
  "Do not confuse имитация (imitation) with карикатура (caricature)."),
]

def unit_yaml(fname, title, summary, words, newitem, fence):
    uid = fname.split("-", 1)[1]
    num = fname[:3]
    lex = [w if w.startswith("ru.lex.") else f"ru.lex.study4.{w}" for w in words]
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
    L.append('goal_id: "ru.goal.b2.academic-study4"')
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
    L.append(f'  expected_interpretations: ["{title}: findings with taught forms only."]')
    L.append(f'  prohibited_ambiguity: ["{fence}"]')
    L.append('  target_proficiency: "B2"')
    L.append('  validation_method: "choice"')
    return "\n".join(L) + "\n"

for fname, title, summary, words, newitem, fence in U:
    with open(os.path.join(R, "curriculum", "units", fname + ".yaml"), "w") as f:
        f.write(unit_yaml(fname, title, summary, words, newitem, fence))

print("ru batch 54 written")
assert len(WORDS) == 50, len(WORDS)
