#!/usr/bin/env python3
"""ru-RU batch 14: A2 units 160-169 (invitations, suggestions, and arrangements)."""
import json, os

R = "experiments/llm-pack-authoring/candidates/ru-fullkit-v1"
SRC = ["ru-original"]
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-05", "notes": "ai-drafted; needs dictionary sourcing and human review"}

WORDS = [
 ("priglashenie","приглашение","приглаше́ние","invitation"),
 ("priglasit2","пригласить","пригласи́ть","to invite (pf)"),
 ("soglasitsya","согласиться","согласи́ться","to agree (pf)"),
 ("otkazatsya","отказаться","отказа́ться","to refuse (pf)"),
 ("dogovorit","договорить","договори́ться","to agree, arrange"),
 ("dogovor","договор","догово́р","agreement, contract"),
 ("vstrecha2","встреча","встре́ча","meeting"),
 ("svidanie","свидание","свиде́ние","date, rendezvous"),
 ("vecherinka","вечеринка","вечери́нка","party"),
 ("gost","гость","гость","guest"),
 ("gostepriimstvo","гостеприимство","гостеприи́мство","hospitality"),
 ("podarok","подарок","пода́рок","gift"),
 ("cvety","цветы","цветы́","flowers"),
 ("tort","торт","торт","cake"),
 ("stol2","стол","стол","table"),
 ("posuda","посуда","посу́да","dishes"),
 ("napitok","напиток","напи́ток","drink"),
 ("zakuska","закуска","заку́ска","snack, appetizer"),
 ("muzyka2","музыка","му́зыка","music"),
 ("tancevat","танцевать","танцева́ть","to dance"),
 ("pesnya","песня","пе́сня","song"),
 ("podskazat","подсказать","подсказа́ть","to suggest, prompt"),
 ("naprimer","например","напри́мер","for example"),
 ("davay","давай","дава́й","let's, come on"),
 ("davay2","давайте","дава́йте","let's (polite)"),
 ("mozhet","может быть","мо́жет бы́ть","maybe"),
 ("nazad","назад","наза́д","back"),
 ("perenesti","переносить","переноси́ть","to postpone, move"),
 ("otmenit","отменять","отменя́ть","to cancel"),
 ("podtverdit","подтверждать","подтвержда́ть","to confirm"),
 ("izmenit","изменять","изменя́ть","to change"),
 ("zapisat2","записаться","записа́ться","to sign up, book"),
 ("soglasovat","согласовывать","согласо́вывать","to coordinate"),
 ("udobnyi","удобный","у́добный","convenient"),
 ("razvlekatsiya","развлечение","развлече́ние","entertainment"),
 ("pohod","поход","похо́д","hike, walk"),
 ("progulka","прогулка","прогу́лка","walk, stroll"),
 ("kino2","кино","кино́","cinema"),
 ("spektakl","спектакль","спекта́кль","play, performance"),
 ("bilety3","билетик","биле́тик","small ticket"),
 ("afisha","афиша","афи́ша","poster, billboard"),
 ("anons","анонс","ано́нс","announcement, preview"),
 ("vyhod","выход","вы́ход","exit, day off"),
 ("doma","дома","дома́","at home"),
 ("soglasno","согласно","согла́сно","according to"),
 ("zabyt","забыть","забы́ть","to forget"),
 ("pomnit","помнить","по́мнить","to remember"),
 ("povtorit","повторять","повторя́ть","to repeat"),
 ("zhdem","ждать","жда́ть","to wait"),
 ("gostya","гостья","гостья́","hostess (f)"),
]
assert len(WORDS) == 50, len(WORDS)


def entry(rid, form, reading, gloss):
    return {"id": f"ru.lex.socialplans.{rid}", "status": "draft",
            "forms": [{"text": form, "is_primary": True}],
            "readings": [{"text": reading, "script": "cyrillic"}],
            "glosses": {"en-US": [gloss]}, "sources": SRC, "generation": GEN}

with open(os.path.join(R, "lexicon", "socialplans.jsonl"), "w") as f:
    for rid, form, reading, gloss in WORDS:
        f.write(json.dumps(entry(rid, form, reading, gloss), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ru.grammar.a2.let-us-imperative", "name": "Давай(те) + verb", "category": "syntax",
  "definition": "Suggestions use давай or давайте with a verb: Давай пойдём в кино; Давайте отдыхать. Learn the supplied chunks; do not add new verbs."},
 {"id": "ru.grammar.a2.invitation-accusative", "name": "Пригласить + accusative", "category": "syntax",
  "definition": "Пригласить takes an accusative person and в + accusative place: пригласить меня в кино. Learn the supplied forms as given."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("u160","Это приглашение.","This is an invitation.",["приглашение"]),
 ("u161","Это встреча.","This is the meeting.",["встреча"]),
 ("u162","Это вечеринка.","This is the party.",["вечеринка"]),
 ("u163","Это подарок.","This is the gift.",["подарок"]),
 ("u164","Это цветы.","These are flowers.",["цветы"]),
 ("u165","Это афиша.","This is the poster.",["афиша"]),
 ("u166","Это кино.","This is the cinema.",["кино"]),
 ("u167","Это прогулка.","This is the walk.",["прогулка"]),
 ("u168","Это выход.","This is the day off.",["выход"]),
 ("u169","Это договор.","This is the agreement.",["договор"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, gloss, cloze in SENTS:
        e = {"id": f"ru.sent.a2.{sid}", "status": "draft", "text": text, "gloss": gloss,
             "cloze_targets": cloze, "sources": SRC, "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

ASSESS = [
 {"id": "ru.assess.a2.social-plans-reading", "goal_id": "ru.goal.a2.social-plans",
  "kind": "recognition", "modality": "reading",
  "rubric": {"scale": "observed", "criteria": [
      "Identify invitation, meeting, and party words in a supplied message.",
      "Match a suggestion to its давай(те) chunk.",
      "Distinguish agreement from refusal in a supplied exchange."]},
  "review_status": "draft"},
 {"id": "ru.assess.a2.social-plans-writing", "goal_id": "ru.goal.a2.social-plans",
  "kind": "production", "modality": "writing",
  "rubric": {"scale": "observed", "criteria": [
      "Write a social-identification statement with это and a taught nominative noun.",
      "Make a suggestion with the supplied давай(те) chunk.",
      "Issue an invitation with the supplied пригласить chunk."]},
  "review_status": "draft"},
]
with open(os.path.join(R, "assessments", "definitions.jsonl"), "a") as f:
    for a in ASSESS:
        f.write(json.dumps(a, ensure_ascii=False) + "\n")

GOAL_YAML = """  - id: "ru.goal.a2.social-plans"
    description: "Invite, suggest, and arrange social plans."
    band: "A2"
    modalities: ["reading", "writing"]
    prerequisites:
      - {target: "ru.goal.a2.work-study", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.a1.time-plans", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.on-ramp.everyday", dimension: "recall-meaning", required_state: "independent", strength: "hard"}
    required_concepts: ["ru.grammar.a2.let-us-imperative", "ru.grammar.a2.invitation-accusative", "ru.grammar.on-ramp.zero-present-copula"]
    assessment_ids: ["ru.assess.a2.social-plans-reading", "ru.assess.a2.social-plans-writing"]
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
 ("160-social-plans-01","Invitations","приглашение, пригласить, договор, согласиться and отказаться.",
  ["priglashenie","priglasit2","dogovor","soglasitsya","otkazatsya"], "s:u160",
  "Do not confuse согласиться (to agree) with отказаться (to refuse)."),
 ("161-social-plans-02","Meetings","встреча, свидание, вечеринка, гость and гостеприимство.",
  ["vstrecha2","svidanie","vecherinka","gost","gostepriimstvo"], "s:u161",
  "Do not confuse встреча (meeting) with свидание (date)."),
 ("162-social-plans-03","At the table","подарок, цветы, торт, стол and посуда.",
  ["podarok","cvety","tort","stol2","posuda"], "s:u162",
  "Do not confuse посуда (dishes) with подарок (gift)."),
 ("163-social-plans-04","Party","напиток, закуска, музыка, танцевать and песня.",
  ["napitok","zakuska","muzyka2","tancevat","pesnya"], "s:u163",
  "Do not confuse напиток (drink) with закуска (snack)."),
 ("164-social-plans-05","Suggestions","подсказать, например, давай, давайте and может быть.",
  ["podskazat","naprimer","davay","davay2","mozhet"], "s:u164",
  "Do not confuse давай (let's, informal) with давайте (let's, polite)."),
 ("165-social-plans-06","Changes","назад, переносить, отменять, подтверждать and изменять.",
  ["perenesti","otmenit","podtverdit","izmenit","nazad"], "s:u165",
  "Do not confuse отменять (to cancel) with переносить (to postpone)."),
 ("166-social-plans-07","Arrangements","записаться, согласовывать, удобный, анонс and афиша.",
  ["zapisat2","soglasovat","udobnyi","anons","afisha"], "s:u166",
  "Do not confuse анонс (preview) with афиша (poster)."),
 ("167-social-plans-08","Entertainment","развлечение, поход, прогулка, кино and спектакль.",
  ["razvlekatsiya","pohod","progulka","kino2","spektakl"], "s:u167",
  "Do not confuse поход (hike) with прогулка (stroll)."),
 ("168-social-plans-09","Free time","билетик, выход, дома, ждать and забыть.",
  ["bilety3","vyhod","doma","zhdem","zabyt"], "s:u168",
  "Do not confuse выход (day off) with домой (homeward)."),
 ("169-social-plans-10","Remembering","помнить, повторять, согласно, договорить and гостья.",
  ["pomnit","povtorit","soglasno","dogovorit","gostya"], "s:u169",
  "Do not confuse помнить (to remember) with забыть (to forget)."),
]

def unit_yaml(fname, title, summary, words, newitem, fence):
    uid = fname.split("-", 1)[1]
    num = fname[:3]
    lex = [f"ru.lex.socialplans.{w}" for w in words]
    if newitem.startswith("s:"):
        newref = f"ru.sent.a2.{newitem[2:]}"
        allowed_gram = OLD_GRAM
    else:
        newref = newitem[2:]
        allowed_gram = [newref] + OLD_GRAM
    old = ["ru.lex.everyday.eto", "ru.lex.everyday.dom"]
    refs = lex + [newref] + old
    L = []
    L.append('id: "ru.unit.a2.' + uid + '"')
    L.append('goal_id: "ru.goal.a2.social-plans"')
    L.append(f'title: "{title}"')
    L.append(f'summary: "{summary}"')
    L.append("estimated_minutes: 8")
    L.append("activities:")
    L.append(f'  - id: "ru.activity.a2.u{num}-read"')
    L.append('    type: "encounter-read"')
    L.append('    modality: "reading"')
    L.append("    support_level: 1")
    L.append("    content_refs: &v [" + ", ".join(f'"{r}"' for r in refs) + "]")
    L.append(f'  - id: "ru.activity.a2.u{num}-grammar"')
    L.append('    type: "encounter-read"')
    L.append('    modality: "reading"')
    L.append("    support_level: 1")
    L.append("    content_refs: &g [" + ", ".join(f'"{r}"' for r in allowed_gram) + "]")
    if newitem.startswith("s:"):
        L.append(f'  - id: "ru.activity.a2.u{num}-cloze"')
        L.append('    type: "cloze"')
        L.append('    modality: "writing"')
        L.append("    support_level: 1")
        L.append(f'    content_refs: ["{newref}"]')
    L.append(f'  - id: "ru.activity.a2.u{num}-write"')
    L.append('    type: "recall"')
    L.append('    modality: "writing"')
    L.append("    support_level: 0")
    L.append("    content_refs: *v")
    L.append("generation_contract:")
    L.append("  allowed_vocab: *v")
    L.append("  allowed_grammar: *g")
    L.append("  new_item_budget: 6")
    L.append("  register: []")
    L.append(f'  expected_interpretations: ["{title}: social plans with taught forms only."]')
    L.append(f'  prohibited_ambiguity: ["{fence}"]')
    L.append('  target_proficiency: "A2"')
    L.append('  validation_method: "choice"')
    return "\n".join(L) + "\n"

for fname, title, summary, words, newitem, fence in U:
    with open(os.path.join(R, "curriculum", "units", fname + ".yaml"), "w") as f:
        f.write(unit_yaml(fname, title, summary, words, newitem, fence))

print("ru batch 14 written")