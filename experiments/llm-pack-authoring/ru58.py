#!/usr/bin/env python3
"""ru-RU batch 58: B2 units 600-609 (applications and professional self-presentation)."""
import json, os

R = "experiments/llm-pack-authoring/candidates/ru-fullkit-v1"
SRC = ["ru-original"]
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-05", "notes": "ai-drafted; needs dictionary sourcing and human review"}

WORDS = [
 ("soiskatel","соискатель","соискáтель","job seeker, applicant"),
 ("pretendent","претендент","претендéнт","candidate, claimant"),
 ("gramota","грамота","грáмота","certificate of merit"),
 ("referens","референс","рéференс","reference"),
 ("rabotodatel","работодатель","работóдатель","employer"),
 ("trudoustroystvo","трудоустройство","трудоустóйство","employment, job placement"),
 ("kadrovik","кадровик","кáдровик","HR officer"),
 ("sprovoditelnyy","сопроводительный","сопроводúтельный","accompanying (adj)"),
 ("samoprezentaciya","самопрезентация","самопрезентáция","self-presentation"),
 ("samoocenka","самооценка","самоóценка","self-assessment"),
 ("stressoustoychivost","стрессоустойчивость","стрессоустóйчивость","stress resistance"),
 ("kommunikabelnost","коммуникабельность","коммуникабéльность","communicability"),
 ("punktualnost","пунктуальность","пунктуáльность","punctuality"),
 ("disciplinirovanost","дисциплинированность","дисциплинирóванность","disciplined (noun)"),
 ("iniciativnost","инициативность","инициатúвность","initiative (noun)"),
 ("kreativnost","креативность","креатúвность","creativity"),
 ("mnogozashechnost","многозадачность","многозáдачность","multitasking"),
 ("adaptivnost","адаптивность","адаптúвность","adaptability"),
 ("mobilnost","мобильность","мобúльность","mobility"),
 ("komandnyy","командный","комáндный","team (adj)"),
 ("nastavnichestvo","наставничество","настáвничество","mentoring"),
 ("stazhirovka","стажировка","стажúровка","internship, training"),
 ("praktikant","практикант","практикáнт","intern, trainee"),
 ("podrabotka","подработка","подрáботка","side job"),
 ("sovmestitelstvo","совместительство","совместúтельство","part-time work"),
 ("frilans","фриланс","фрúланс","freelance"),
 ("frilanser","фрилансер","фрúлансер","freelancer"),
 ("decret","декрет","декрéт","maternity leave"),
 ("dekretnyy","декретный","декрéтный","maternity (adj)"),
 ("prizvan","призван","прúзван","called, destined"),
 ("zanyatost","занятость","зáнятость","employment, busyness"),
 ("professionalizm","профессионализм","профессионалúзм","professionalism"),
 ("trudoustroennyy","трудоустроенный","трудоустóенный","employed"),
 ("shtatnyy","штатный","штáтный","permanent staff (adj)"),
 ("vneshstatnyy","внештатный","внештáтный","freelance, extra-staff"),
 ("sovmestitel","совместитель","совместúтель","part-time worker"),
 ("podrazdelenie","подразделение","подразделéние","subdivision, unit"),
 ("rekruter","рекрутер","рекрýтер","recruiter"),
 ("rekruting","рекрутинг","рекрýтинг","recruiting"),
 ("hedhanter","хедхантер","хéдхантер","headhunter"),
 ("otborochnyy","отборочный","отбóрочный","selection (adj)"),
 ("finalist","финалист","финалúст","finalist"),
 ("laureat","лауреат","лауреáт","laureate"),
 ("magistrant","магистрант","магистрáнт","master's student"),
 ("bakalavr","бакалавр","бакалáвр","bachelor"),
 ("trening","тренинг","трéнинг","training"),
 ("vorkshop","воркшоп","воркшóп","workshop"),
 ("golovnoy","головной","головнóй","head, main"),
 ("kovorking","коворкинг","коворкúнг","coworking"),
 ("autsorsing","аутсорсинг","аутсóрсинг","outsourcing"),
]

def entry(rid, text, stress, gloss):
    return {"id": f"ru.lex.prof.{rid}", "status": "draft",
            "forms": [{"text": text}], "readings": [{"text": stress}],
            "glosses": {"en-US": [gloss]}, "sources": SRC, "generation": GEN}

with open(os.path.join(R, "lexicon", "prof4.jsonl"), "w") as f:
    for rid, text, stress, gloss in WORDS:
        f.write(json.dumps(entry(rid, text, stress, gloss), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ru.grammar.b2-imeyu-opyt", "name": "Имею опыт + gen", "category": "syntax",
  "definition": "Experience claims use имею опыт: имею опыт работы. Learn the supplied chunks as given."},
 {"id": "ru.grammar.b2-gotov-k", "name": "Готов к + dat", "category": "syntax",
  "definition": "Readiness uses готов к: готов к работе. Learn the supplied chunks as given."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("u600","Это соискатель.","This is a job seeker.",["соискатель"]),
 ("u601","Это кадровик.","This is an HR officer.",["кадровик"]),
 ("u602","Это пунктуальность.","This is punctuality.",["пунктуальность"]),
 ("u603","Это мобильность.","This is mobility.",["мобильность"]),
 ("u604","Это стажировка.","This is an internship.",["стажировка"]),
 ("u605","Это фриланс.","This is freelance work.",["фриланс"]),
 ("u606","Это занятость.","This is employment.",["занятость"]),
 ("u607","Это рекрутинг.","This is recruiting.",["рекрутинг"]),
 ("u608","Это бакалавр.","This is a bachelor.",["бакалавр"]),
 ("u609","Это коворкинг.","This is a coworking space.",["коворкинг"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, gloss, cloze in SENTS:
        e = {"id": f"ru.sent.b2.{sid}", "status": "draft", "text": text, "gloss": gloss,
             "cloze_targets": cloze, "sources": SRC, "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

OLD_GRAM = ["ru.grammar.on-ramp.eto-identification", "ru.grammar.on-ramp.zero-present-copula"]

U = [
 ("600-app-01","Applicants","соискатель, претендент, грамота, референс and работодатель.",
  ["soiskatel","pretendent","gramota","referens","rabotodatel"], "s:u600",
  "Do not confuse соискатель (job seeker) with претендент (candidate)."),
 ("601-app-02","Getting hired","трудоустройство, кадровик, сопроводительный, самопрезентация and самооценка.",
  ["trudoustroystvo","kadrovik","sprovoditelnyy","samoprezentaciya","samoocenka"], "s:u601",
  "Do not confuse трудоустройство (job placement) with рекрутинг (recruiting)."),
 ("602-app-03","Soft skills","стрессоустойчивость, коммуникабельность, пунктуальность, дисциплинированность and инициативность.",
  ["stressoustoychivost","kommunikabelnost","punktualnost","disciplinirovanost","iniciativnost"], "s:u602",
  "Do not confuse пунктуальность (punctuality) with дисциплинированность (discipline)."),
 ("603-app-04","Work style","креативность, многозадачность, адаптивность, мобильность and командный.",
  ["kreativnost","mnogozashechnost","adaptivnost","mobilnost","komandnyy"], "s:u603",
  "Do not confuse адаптивность (adaptability) with мобильность (mobility)."),
 ("604-app-05","Training","наставничество, стажировка, практикант, подработка and совместительство.",
  ["nastavnichestvo","stazhirovka","praktikant","podrabotka","sovmestitelstvo"], "s:u604",
  "Do not confuse стажировка (internship) with подработка (side job)."),
 ("605-app-06","Work arrangements","фриланс, фрилансер, декрет, декретный and призван.",
  ["frilans","frilanser","decret","dekretnyy","prizvan"], "s:u605",
  "Do not confuse фриланс (freelance) with совместительство (part-time work)."),
 ("606-app-07","Employment status","занятость, трудоустроенный, штатный, внештатный and совместитель.",
  ["zanyatost","trudoustroennyy","shtatnyy","vneshstatnyy","sovmestitel"], "s:u606",
  "Do not confuse штатный (permanent staff) with внештатный (extra-staff)."),
 ("607-app-08","Recruiting","подразделение, рекрутер, рекрутинг, хедхантер and отборочный.",
  ["podrazdelenie","rekruter","rekruting","hedhanter","otborochnyy"], "s:u607",
  "Do not confuse рекрутер (recruiter) with хедхантер (headhunter)."),
 ("608-app-09","Qualifications","финалист, лауреат, магистрант, бакалавр and тренинг.",
  ["finalist","laureat","magistrant","bakalavr","trening"], "s:u608",
  "Do not confuse магистрант (master's student) with бакалавр (bachelor)."),
 ("609-app-10","Work settings","воркшоп, головной, коворкинг, аутсорсинг and профессионализм.",
  ["vorkshop","golovnoy","kovorking","autsorsing","professionalizm"], "s:u609",
  "Do not confuse коворкинг (coworking) with аутсорсинг (outsourcing)."),
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

print("ru batch 58 written")
assert len(WORDS) == 50, len(WORDS)
