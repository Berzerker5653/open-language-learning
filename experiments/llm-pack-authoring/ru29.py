#!/usr/bin/env python3
"""ru-RU batch 29: B1 units 310-319 (cultural experiences and personal responses)."""
import json, os

R = "experiments/llm-pack-authoring/candidates/ru-fullkit-v1"
SRC = ["ru-original"]
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-05", "notes": "ai-drafted; needs dictionary sourcing and human review"}

WORDS = [
 ("film","фильм","фи́льм","film"),
 ("serial","сериал","сериал","series"),
 ("postanovka","постановка","постано́вка","production (theatre)"),
 ("vystuplenie","выступление","выступле́ние","performance"),
 ("opera","опера","о́пера","opera"),
 ("balet","балет","балéт","ballet"),
 ("eksponat","экспонат","экспона́т","exhibit"),
 ("galereya","галерея","галере́я","gallery"),
 ("kartina","картина","карти́на","painting"),
 ("hudozhnik","художник","худо́жник","artist"),
 ("pisatel","писатель","писáтель","writer"),
 ("poet","поэт","поэ́т","poet"),
 ("roman","роман","рома́н","novel"),
 ("povest","повесть","по́весть","novella"),
 ("stihotvorenie","стихотворение","стихотворéние","poem"),
 ("melodiya","мелодия","мелóдия","melody"),
 ("pevec","певец","певéц","singer"),
 ("stena2","сцена","сце́на","stage"),
 ("aktyor","актёр","актёр","actor"),
 ("rezhisyor","режиссёр","режиссёр","director"),
 ("stsenarij","сценарий","сценáрий","screenplay"),
 ("syuzhet","сюжет","сюжéт","plot"),
 ("rol","роль","роль","role"),
 ("zritel","зритель","зри́тель","audience member"),
 ("publika","публика","пу́блика","audience"),
 ("aplodismenty","аплодисменты","аплоди́сменты","applause"),
 ("anshlag","аншлаг","аншла́г","sold-out"),
 ("premjera","премьера","премье́ра","premiere"),
 ("festival","фестиваль","фестивáль","festival"),
 ("konkurs","конкурс","ко́нкурс","contest"),
 ("priz","приз","приз","prize"),
 ("pobeditel","победитель","побéдитель","winner"),
 ("zhuri","жюри","жюри","jury"),
 ("golosovanie","голосование","голосовáние","voting"),
 ("reakciya","реакция","реáкция","reaction"),
 ("retsenziya","рецензия","рецéнзия","review"),
 ("kritik","критик","кри́тик","critic"),
 ("trogatelnyj","трогательный","трогáтельный","touching"),
 ("zapominayushchijsya","запоминающийся","запомина́ющийся","memorable"),
 ("shedeavr","шедевр","шеде́вр","masterpiece"),
 ("klassika","классика","клáссика","classics"),
 ("obyavlenie","объявление","объявле́ние","announcement"),
 ("priglashenie","приглашение","приглашéние","invitation"),
 ("programmka","программка","программка","program (booklet)"),
 ("ansambl","ансамбль","анса́мбль","ensemble"),
 ("orkestr","оркестр","оркéстр","orchestra"),
 ("dirizhyor","дирижёр","дирижёр","conductor"),
 ("tancor","танцор","танцо́р","dancer"),
 ("kostyum","костюм","костю́м","costume"),
 ("dekoracii","декорации","декорáции","set design (pl)"),
]

def entry(rid, text, stress, gloss):
    return {"id": f"ru.lex.culture.{rid}", "status": "draft",
            "forms": [{"text": text}], "readings": [{"text": stress}],
            "glosses": {"en-US": [gloss]}, "sources": SRC, "generation": GEN}

with open(os.path.join(R, "lexicon", "culture.jsonl"), "w") as f:
    for rid, text, stress, gloss in WORDS:
        f.write(json.dumps(entry(rid, text, stress, gloss), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ru.grammar.b1.mne-ponravilos", "name": "Personal response chunks", "category": "syntax",
  "definition": "Responses use мне понравилось + perfective infinitive: мне понравилось смотреть. Learn the supplied chunks as given."},
 {"id": "ru.grammar.b1.kakoj-kakoe", "name": "Какое впечатление!", "category": "syntax",
  "definition": "Exclamations use какое + noun: какое впечатление! Learn the supplied chunks as given."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("u310","Это фильм.","This is a film.",["фильм"]),
 ("u311","Это экспонат.","This is an exhibit.",["экспонат"]),
 ("u312","Это картина.","This is a painting.",["картина"]),
 ("u313","Это роман.","This is a novel.",["роман"]),
 ("u314","Это поэт.","This is a poet.",["поэт"]),
 ("u315","Это сцена.","This is a stage.",["сцена"]),
 ("u316","Это премьера.","This is a premiere.",["премьера"]),
 ("u317","Это приз.","This is a prize.",["приз"]),
 ("u318","Это рецензия.","This is a review.",["рецензия"]),
 ("u319","Это оркестр.","This is an orchestra.",["оркестр"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, gloss, cloze in SENTS:
        e = {"id": f"ru.sent.b1.{sid}", "status": "draft", "text": text, "gloss": gloss,
             "cloze_targets": cloze, "sources": SRC, "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

ASSESS = [
 {"id": "ru.assess.b1.culture-media-reading", "goal_id": "ru.goal.b1.culture-media",
  "kind": "recognition", "modality": "reading",
  "rubric": {"scale": "observed", "criteria": [
      "Identify the cultural word (фильм, картина) in a supplied note.",
      "Match какое chunks to their exclamation.",
      "Distinguish рецензия (review) from объявление (announcement)."]},
  "review_status": "draft"},
 {"id": "ru.assess.b1.culture-media-writing", "goal_id": "ru.goal.b1.culture-media",
  "kind": "production", "modality": "writing",
  "rubric": {"scale": "observed", "criteria": [
      "Say you liked something with the supplied мне понравилось chunk.",
      "Give an evaluation with a supplied трогательный or запоминающийся chunk.",
      "Name a reaction with a supplied реакция or аплодисменты chunk."]},
  "review_status": "draft"},
]
with open(os.path.join(R, "assessments", "definitions.jsonl"), "a") as f:
    for a in ASSESS:
        f.write(json.dumps(a, ensure_ascii=False) + "\n")

GOAL_YAML = """  - id: "ru.goal.b1.culture-media"
    description: "Describe cultural experiences and personal responses to media."
    band: "B1"
    modalities: ["reading", "writing"]
    prerequisites:
      - {target: "ru.goal.b1.relationships", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.b1.experiences", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.on-ramp.everyday", dimension: "recall-meaning", required_state: "independent", strength: "hard"}
    required_concepts: ["ru.grammar.b1.mne-ponravilos", "ru.grammar.b1.kakoj-kakoe", "ru.grammar.on-ramp.zero-present-copula"]
    assessment_ids: ["ru.assess.b1.culture-media-reading", "ru.assess.b1.culture-media-writing"]
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
 ("310-culture-media-01","Film","фильм, сериал, сценарий, сюжет and режиссёр.",
  ["film","serial","stsenarij","syuzhet","rezhisyor"], "s:u310",
  "Do not confuse сюжет (plot) with сценарий (screenplay)."),
 ("311-culture-media-02","Exhibit","экспонат, галерея, картина, художник and классика.",
  ["eksponat","galereya","kartina","hudozhnik","klassika"], "s:u311",
  "Do not confuse картина (painting) with экспонат (exhibit)."),
 ("312-culture-media-03","Painting","картина, шедевр, галерея, объявление and приглашение.",
  ["kartina","shedeavr","galereya","obyavlenie","priglashenie"], "s:u312",
  "Do not confuse шедевр (masterpiece) with картина (painting)."),
 ("313-culture-media-04","Novel","роман, повесть, писатель, поэт and стихотворение.",
  ["roman","povest","pisatel","poet","stihotvorenie"], "s:u313",
  "Do not confuse роман (novel) with повесть (novella)."),
 ("314-culture-media-05","Poetry","поэт, стихотворение, мелодия, певец and ансамбль.",
  ["poet","stihotvorenie","melodiya","pevec","ansambl"], "s:u314",
  "Do not confuse певец (singer) with поэт (poet)."),
 ("315-culture-media-06","Stage","сцена, актёр, роль, костюм and декорации.",
  ["stena2","aktyor","rol","kostyum","dekoracii"], "s:u315",
  "Do not confuse роль (role) with актёр (actor)."),
 ("316-culture-media-07","Premiere","премьера, публика, аншлаг, аплодисменты and выступление.",
  ["premjera","publika","anshlag","aplodismenty","vystuplenie"], "s:u316",
  "Do not confuse аншлаг (sold-out) with публика (audience)."),
 ("317-culture-media-08","Contest","конкурс, приз, победитель, жюри and голосование.",
  ["konkurs","priz","pobeditel","zhuri","golosovanie"], "s:u317",
  "Do not confuse жюри (jury) with победитель (winner)."),
 ("318-culture-media-09","Review","рецензия, критик, реакция, трогательный and запоминающийся.",
  ["retsenziya","kritik","reakciya","trogatelnyj","zapominayushchijsya"], "s:u318",
  "Do not confuse критик (critic) with рецензия (review)."),
 ("319-culture-media-10","Orchestra","оркестр, дирижёр, танцор, балет and опера.",
  ["orkestr","dirizhyor","tancor","balet","opera"], "s:u319",
  "Do not confuse дирижёр (conductor) with танцор (dancer)."),
]

def unit_yaml(fname, title, summary, words, newitem, fence):
    uid = fname.split("-", 1)[1]
    num = fname[:3]
    lex = [w if w.startswith("ru.lex.") else f"ru.lex.culture.{w}" for w in words]
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
    L.append('goal_id: "ru.goal.b1.culture-media"')
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
    L.append(f'  expected_interpretations: ["{title}: culture with taught forms only."]')
    L.append(f'  prohibited_ambiguity: ["{fence}"]')
    L.append('  target_proficiency: "B1"')
    L.append('  validation_method: "choice"')
    return "\n".join(L) + "\n"

for fname, title, summary, words, newitem, fence in U:
    with open(os.path.join(R, "curriculum", "units", fname + ".yaml"), "w") as f:
        f.write(unit_yaml(fname, title, summary, words, newitem, fence))

print("ru batch 29 written")
assert len(WORDS) == 50, len(WORDS)
