#!/usr/bin/env python3
"""ru-RU batch 21: B1 units 230-239 (life experiences and reactions)."""
import json, os

R = "experiments/llm-pack-authoring/candidates/ru-fullkit-v1"
SRC = ["ru-original"]
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-05", "notes": "ai-drafted; needs dictionary sourcing and human review"}

WORDS = [
 ("perezivanie","переживание","пережива́ние","experience, ordeal"),
 ("vospominanie","воспоминание","воспомина́ние","memory, recollection"),
 ("prezhde","прежде","пре́жде","before, formerly"),
 ("vpervye","впервые","впе́рвые","for the first time"),
 ("ni-razu","ни разу","ни ра́зу","not once, never"),
 ("interesno","интересно","интере́сно","interesting"),
 ("skuchno","скучно","ску́чно","boring"),
 ("veselo","весело","весе́ло","fun, cheerfully"),
 ("strashno","страшно","стра́шно","scary, terribly"),
 ("trudno","трудно","тру́дно","difficult (predicative)"),
 ("legko","легко","легко́","easy (predicative)"),
 ("privychno","привычно","при́вычно","habitual, familiar"),
 ("neprivychno","непривычно","непри́вычно","unfamiliar"),
 ("prosto","просто","про́сто","simply, just"),
 ("slozhno","сложно","сло́жно","complicated (predicative)"),
 ("probovat","пробовать","пробовать","to try, attempt"),
 ("pytatsya","пытаться","пы́таться","to try hard, attempt"),
 ("riskovat","рисковать","рискова́ть","to risk"),
 ("smelyi","смелый","сме́лый","brave"),
 ("truslivyi","трусливый","тру́сливый","timid, cowardly"),
 ("boyatsya","бояться","боя́ться","to be afraid"),
 ("bespokoitsya","беспокоиться","беспоко́иться","to worry"),
 ("volnovatsya","волноваться","волнова́ться","to be nervous, stirred"),
 ("uspokaivatsya","успокаиваться","успока́иваться","to calm down"),
 ("nervnichat","нервничать","не́рвничать","to be nervous"),
 ("neudacha","неудача","неуда́ча","failure, mishap"),
 ("dostizhenie","достижение","достиже́ние","achievement"),
 ("useshno","успешно","успе́шно","successfully"),
 ("neudachnyi","неудачный","неуда́чный","unsuccessful"),
 ("proryv","прорыв","про́рыв","breakthrough"),
 ("novichok","новичок","новичо́к","newcomer, beginner"),
 ("uchenik","ученик","уче́ник","pupil, student"),
 ("umenie","умение","уме́ние","skill, ability"),
 ("masterstvo","мастерство","мастерство́","mastery, craftsmanship"),
 ("iskusstvo","искусство","иску́сство","art"),
 ("reshatsya","решаться","реша́ться","to venture, dare"),
 ("otvaga","отвага","отва́га","boldness, daring"),
 ("smelost","смелость","сме́лость","courage, bravery"),
 ("volnenie","волнение","волне́ние","excitement, agitation"),
 ("robost","робость","ро́бость","shyness, timidity"),
 ("podskazka","подсказка","подска́зка","hint, tip"),
 ("rekomodatsiya","рекомендация","рекоменда́ция","recommendation"),
 ("podderzhka","поддержка","подде́ржка","support"),
 ("odobrenie","одобрение","одо́брение","approval"),
 ("pokhvala","похвала","похва́ла","praise"),
 ("sozhalenie","сожаление","сожале́ние","regret"),
 ("gordost","гордость","го́рдость","pride"),
 ("blagodarnyi","благодарный","благда́рный","grateful"),
 ("gorditsya","гордиться","го́рдиться","to be proud of"),
 ("sovest","совесть","со́весть","conscience"),
]

def entry(rid, form, reading, gloss):
    return {"id": f"ru.lex.experiences.{rid}", "status": "draft",
            "forms": [{"text": form, "is_primary": True}],
            "readings": [{"text": reading, "script": "cyrillic"}],
            "glosses": {"en-US": [gloss]}, "sources": SRC, "generation": GEN}

with open(os.path.join(R, "lexicon", "experiences.jsonl"), "w") as f:
    for rid, form, reading, gloss in WORDS:
        f.write(json.dumps(entry(rid, form, reading, gloss), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ru.grammar.b1.experience-negation", "name": "ни разу не + past", "category": "syntax",
  "definition": "Life-experience negation uses ни разу не with a past verb: я ни разу не летал. Learn the supplied chunks; do not add new verbs."},
 {"id": "ru.grammar.b1.reaction-predicatives", "name": "Reaction predicatives + dative", "category": "syntax",
  "definition": "Reaction words like интересно and скучno pair with a dative: мне интересно. Learn the supplied forms as given."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("u230","Это воспоминание.","This is a memory.",["воспоминание"]),
 ("u231","Это интересно.","This is interesting.",["интересно"]),
 ("u232","Это просто.","This is simple.",["просто"]),
 ("u233","Он любит пробовать.","He likes to try.",["пробовать"]),
 ("u234","Это страх.","This is fear.",["страх"]),
 ("u235","Это неудача.","This is a failure.",["неудача"]),
 ("u236","Это новичок.","This is a newcomer.",["новичок"]),
 ("u237","Это отвага.","This is boldness.",["отвага"]),
 ("u238","Это поддержка.","This is support.",["поддержка"]),
 ("u239","Это гордость.","This is pride.",["гордость"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, gloss, cloze in SENTS:
        e = {"id": f"ru.sent.b1.{sid}", "status": "draft", "text": text, "gloss": gloss,
             "cloze_targets": cloze, "sources": SRC, "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

ASSESS = [
 {"id": "ru.assess.b1.experiences-reading", "goal_id": "ru.goal.b1.experiences",
  "kind": "recognition", "modality": "reading",
  "rubric": {"scale": "observed", "criteria": [
      "Identify reaction words (интересно, скучно, страшно) in a supplied note.",
      "Match ни разу не chunks to their meaning.",
      "Distinguish новичок (newcomer) from ученик (pupil)."]},
  "review_status": "draft"},
 {"id": "ru.assess.b1.experiences-writing", "goal_id": "ru.goal.b1.experiences",
  "kind": "production", "modality": "writing",
  "rubric": {"scale": "observed", "criteria": [
      "State a reaction with a supplied predicative and dative chunk.",
      "Say you never did something with the supplied ни разу не chunk.",
      "Give a short evaluation with the supplied просто chunk."]},
  "review_status": "draft"},
]
with open(os.path.join(R, "assessments", "definitions.jsonl"), "a") as f:
    for a in ASSESS:
        f.write(json.dumps(a, ensure_ascii=False) + "\n")

GOAL_YAML = """  - id: "ru.goal.b1.experiences"
    description: "Talk about life experiences and react to them."
    band: "B1"
    modalities: ["reading", "writing"]
    prerequisites:
      - {target: "ru.goal.b1.narration", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.a2.connected-messages", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.on-ramp.everyday", dimension: "recall-meaning", required_state: "independent", strength: "hard"}
    required_concepts: ["ru.grammar.b1.experience-negation", "ru.grammar.b1.reaction-predicatives", "ru.grammar.on-ramp.zero-present-copula"]
    assessment_ids: ["ru.assess.b1.experiences-reading", "ru.assess.b1.experiences-writing"]
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
assert len(WORDS) == 50, len(WORDS)

OLD_GRAM = ["ru.grammar.on-ramp.eto-identification", "ru.grammar.on-ramp.zero-present-copula"]

U = [
 ("230-life-experiences-01","Experiences","переживание, воспоминание, прежде, впервые and ни разу.",
  ["perezivanie","vospominanie","prezhde","vpervye","ni-razu"], "s:u230",
  "Do not confuse впервые (for the first time) with ни разу (never)."),
 ("231-life-experiences-02","Reactions","интересно, скучно, весело, страшно and трудно.",
  ["interesno","skuchno","veselo","strashno","trudno"], "s:u231",
  "Do not confuse интересно (interesting) with скучно (boring)."),
 ("232-life-experiences-03","Ease","легко, привычно, непривычно, просто and сложно.",
  ["legko","privychno","neprivychno","prosto","slozhno"], "s:u232",
  "Do not confuse привычно (familiar) with непривычно (unfamiliar)."),
 ("233-life-experiences-04","Trying","пробовать, пытаться, рисковать, смелый and трусливый.",
  ["probovat","pytatsya","riskovat","smelyi","truslivyi"], "s:u233",
  "Do not confuse смелый (brave) with трусливый (timid)."),
 ("234-life-experiences-05","Worry","бояться, беспокоиться, волноваться, успокаиваться and нервничать.",
  ["boyatsya","bespokoitsya","volnovatsya","uspokaivatsya","nervnichat"], "s:u234",
  "Do not confuse бояться (fear) with волноваться (be nervous)."),
 ("235-life-experiences-06","Success","неудача, достижение, успешно, неудачный and прорыв.",
  ["neudacha","dostizhenie","useshno","neudachnyi","proryv"], "s:u235",
  "Do not confuse неудача (failure) with прорыв (breakthrough)."),
 ("236-life-experiences-07","Learning","новичок, ученик, умение, мастерство and искусство.",
  ["novichok","uchenik","umenie","masterstvo","iskusstvo"], "s:u236",
  "Do not confuse умение (skill) with мастерство (mastery)."),
 ("237-life-experiences-08","Courage","решаться, отвага, смелость, волнение and робость.",
  ["reshatsya","otvaga","smelost","volnenie","robost"], "s:u237",
  "Do not confuse отвага (boldness) with робость (shyness)."),
 ("238-life-experiences-09","Feedback","подсказка, рекомендация, поддержка, одобрение and похвала.",
  ["podskazka","rekomodatsiya","podderzhka","odobrenie","pokhvala"], "s:u238",
  "Do not confuse подсказка (tip) with рекомендация (recommendation)."),
 ("239-life-experiences-10","Reflection","сожаление, гордость, благодарный, гордиться and совесть.",
  ["sozhalenie","gordost","blagodarnyi","gorditsya","sovest"], "s:u239",
  "Do not confuse сожаление (regret) with гордость (pride)."),
]

def unit_yaml(fname, title, summary, words, newitem, fence):
    uid = fname.split("-", 1)[1]
    num = fname[:3]
    lex = [f"ru.lex.experiences.{w}" for w in words]
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
    L.append('goal_id: "ru.goal.b1.experiences"')
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
    L.append(f'  expected_interpretations: ["{title}: experiences with taught forms only."]')
    L.append(f'  prohibited_ambiguity: ["{fence}"]')
    L.append('  target_proficiency: "B1"')
    L.append('  validation_method: "choice"')
    return "\n".join(L) + "\n"

for fname, title, summary, words, newitem, fence in U:
    with open(os.path.join(R, "curriculum", "units", fname + ".yaml"), "w") as f:
        f.write(unit_yaml(fname, title, summary, words, newitem, fence))

print("ru batch 21 written")
