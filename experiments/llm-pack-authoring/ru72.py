#!/usr/bin/env python3
"""ru-RU batch 72: B2 units 740-749 (historical perspectives in supplied cultural texts)."""
import json, os

R = "experiments/llm-pack-authoring/candidates/ru-fullkit-v1"
SRC = ["ru-original"]
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-05", "notes": "ai-drafted; needs dictionary sourcing and human review"}

WORDS = [
 ("rubezh","рубеж","рубе́ж","boundary, turning point"),
 ("zhizneopisanie","жизнеописание","жизнеопúсание","biography, life account"),
 ("samosoznanie","самосознание","самосознáние","self-consciousness, self-awareness"),
 ("memuarist","мемуарист","мемуарúст","memoirist"),
 ("potomki","потомки","потóмки","descendants"),
 ("obryad","обряд","обрýд","ritual, rite"),
 ("verovanie","верование","веровáние","belief, creed"),
 ("sueverie","суеверие","суевéрие","superstition"),
 ("drevnost","древность","дрéвность","antiquity, ancient times"),
 ("antichnost","античность","анти́чность","classical antiquity"),
 ("srednevekovye","средневековье","средневекóвье","Middle Ages"),
 ("prosveschenie","просвещение","просвещéние","Enlightenment"),
 ("emigraciya","эмиграция","эмигрáция","emigration"),
 ("diaspora","диаспора","диáспора","diaspora"),
 ("assimilyaciya","ассимиляция","ассимиля́ция","assimilation"),
 ("integraciya","интеграция","интегрáция","integration"),
 ("soslovie","сословие","сослóвие","estate, social class"),
 ("aristokratiya","аристократия","аристокрáтия","aristocracy"),
 ("dvoryanstvo","дворянство","дворя́нство","nobility"),
 ("krestyanstvo","крестьянство","крестья́нство","peasantry"),
 ("kupec","купец","купéц","merchant"),
 ("remeslennik","ремесленник","ремéсленник","artisan, craftsman"),
 ("krepostnoy","крепостной","крепостнóй","serf (adj./noun)"),
 ("vosstanie","восстание","восстáние","uprising, revolt"),
 ("bunt","бунт","бýнт","riot, rebellion"),
 ("osada","осада","осáда","siege"),
 ("kampaniya","кампания","кампáния","campaign"),
 ("tyl","тыл","ты\u0301л","home front, rear"),
 ("okkupaciya","оккупация","оккупáция","occupation"),
 ("osvobozhdenie","освобождение","освобождéние","liberation"),
 ("nezavisimost","независимость","независúмость","independence"),
 ("derzhava","держава","держáва","great power, state"),
 ("prestol","престол","престóл","throne"),
 ("korona","корона","корóна","crown"),
 ("dinastiya","династия","динáстия","dynasty"),
 ("pravitel","правитель","правúтель","ruler"),
 ("monarh","монарх","мона́рх","monarch"),
 ("konstituciya","конституция","конститу́ция","constitution"),
 ("volnosti","вольности","вóльности","liberties, franchises"),
 ("druzhina","дружина","дружúна","retinue, druzhina"),
 ("opolchenie","ополчение","ополчéние","militia, volunteer corps"),
 ("dospeh","доспех","доспéх","armor"),
 ("kolchuga","кольчуга","кольчúга","chainmail"),
 ("shlem","шлем","шле\u0301м","helmet"),
 ("krepost","крепость","крепóсть","fortress"),
 ("zamok","замок","замóк","castle"),
 ("citadel","цитадель","цитáдель","citadel"),
 ("bastion","бастион","бастиóн","bastion"),
 ("rodoslavnye","родословная","родослóвная","genealogy"),
 ("genealogiya","генеалогия","генеалóгия","genealogy, genealogy study"),
]

def entry(rid, text, stress, gloss):
    return {"id": f"ru.lex.cult.{rid}", "status": "draft",
            "forms": [{"text": text}], "readings": [{"text": stress}],
            "glosses": {"en-US": [gloss]}, "sources": SRC, "generation": GEN}

with open(os.path.join(R, "lexicon", "cult2.jsonl"), "w") as f:
    for rid, text, stress, gloss in WORDS:
        f.write(json.dumps(entry(rid, text, stress, gloss), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ru.grammar.b2-v-epokhu", "name": "В эпоху + gen", "category": "syntax",
  "definition": "Historical framing uses в эпоху: в эпоху просвещения. Learn the supplied chunks as given."},
 {"id": "ru.grammar.b2-v-opposition", "name": "В отличие от + gen", "category": "syntax",
  "definition": "Perspective contrast uses в отличие от: в отличие от предков. Learn the supplied chunks as given."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("u740","Это рубеж.","This is a turning point.",["рубеж"]),
 ("u741","Это потомки.","These are descendants.",["потомки"]),
 ("u742","Это обряд.","This is a ritual.",["обряд"]),
 ("u743","Это сословие.","This is an estate.",["сословие"]),
 ("u744","Это купец.","This is a merchant.",["купец"]),
 ("u745","Это осада.","This is a siege.",["осада"]),
 ("u746","Это держава.","This is a great power.",["держава"]),
 ("u747","Это корона.","This is a crown.",["корона"]),
 ("u748","Это дружина.","This is a retinue.",["дружина"]),
 ("u749","Это крепость.","This is a fortress.",["крепость"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, gloss, cloze in SENTS:
        e = {"id": f"ru.sent.b2.{sid}", "status": "draft", "text": text, "gloss": gloss,
             "cloze_targets": cloze, "sources": SRC, "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

OLD_GRAM = ["ru.grammar.on-ramp.eto-identification", "ru.grammar.on-ramp.zero-present-copula"]

U = [
 ("740-his-01","Periods","рубеж, древность, античность, средневековье and просвещение.",
  ["rubezh","drevnost","antichnost","srednevekovye","prosveschenie"], "s:u740",
  "Do not confuse древность (antiquity) with античность (classical antiquity)."),
 ("741-his-02","Memory","жизнеописание, самосознание, мемуарист, потомки and родословная.",
  ["zhizneopisanie","samosoznanie","memuarist","potomki","rodoslavnye"], "s:u741",
  "Do not confuse мемуарист (memoirist) with историк (historian)."),
 ("742-his-03","Beliefs","обряд, верование, суеверие, генеалогия and диаспора.",
  ["obryad","verovanie","sueverie","genealogiya","diaspora"], "s:u742",
  "Do not confuse верование (belief) with суеверие (superstition)."),
 ("743-his-04","Movement","ассимиляция, интеграция, эмиграция, сословие and аристократия.",
  ["assimilyaciya","integraciya","emigraciya","soslovie","aristokratiya"], "s:u743",
  "Do not confuse ассимиляция (assimilation) with интеграция (integration)."),
 ("744-his-05","Estates","дворянство, крестьянство, купец, ремесленник and крепостной.",
  ["dvoryanstvo","krestyanstvo","kupec","remeslennik","krepostnoy"], "s:u744",
  "Do not confuse купец (merchant) with ремесленник (artisan)."),
 ("745-his-06","Unrest","восстание, бунт, осада, кампания and тыл.",
  ["vosstanie","bunt","osada","kampaniya","tyl"], "s:u745",
  "Do not confuse восстание (uprising) with бунт (riot)."),
 ("746-his-07","War","оккупация, освобождение, независимость, держава and престол.",
  ["okkupaciya","osvobozhdenie","nezavisimost","derzhava","prestol"], "s:u746",
  "Do not confuse оккупация (occupation) with освобождение (liberation)."),
 ("747-his-08","Rule","корона, династия, правитель, монарх and конституция.",
  ["korona","dinastiya","pravitel","monarh","konstituciya"], "s:u747",
  "Do not confuse правитель (ruler) with монарх (monarch)."),
 ("748-his-09","Liberties","вольности, дружина, ополчение, доспех and кольчуга.",
  ["volnosti","druzhina","opolchenie","dospeh","kolchuga"], "s:u748",
  "Do not confuse дружина (retinue) with ополчение (militia)."),
 ("749-his-10","Fortress","шлем, крепость, замок, цитадель and бастион.",
  ["shlem","krepost","zamok","citadel","bastion"], "s:u749",
  "Do not confuse крепость (fortress) with замок (castle)."),
]

def unit_yaml(fname, title, summary, words, newitem, fence):
    uid = fname.split("-", 1)[1]
    num = fname[:3]
    lex = [w if w.startswith("ru.lex.") else f"ru.lex.cult.{w}" for w in words]
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
    L.append('goal_id: "ru.goal.b2.culture-perspectives"')
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
    L.append(f'  expected_interpretations: ["{title}: literary response with taught forms only."]')
    L.append(f'  prohibited_ambiguity: ["{fence}"]')
    L.append('  target_proficiency: "B2"')
    L.append('  validation_method: "choice"')
    return "\n".join(L) + "\n"

for fname, title, summary, words, newitem, fence in U:
    with open(os.path.join(R, "curriculum", "units", fname + ".yaml"), "w") as f:
        f.write(unit_yaml(fname, title, summary, words, newitem, fence))

print("ru batch 72 written")
assert len(WORDS) == 50, len(WORDS)
