#!/usr/bin/env python3
"""ru-RU batch 22: B1 units 240-249 (travel experiences and lessons learned)."""
import json, os

R = "experiments/llm-pack-authoring/candidates/ru-fullkit-v1"
SRC = ["ru-original"]
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-05", "notes": "ai-drafted; needs dictionary sourcing and human review"}

WORDS = [
 ("ekskursiya","экскурсия","экску́рсия","excursion, tour"),
 ("gid","гид","гид","guide"),
 ("pamyatnik","памятник","па́мятник","monument"),
 ("turist","турист","тури́ст","tourist"),
 ("fotoografiya","фотография","фотогра́фия","photograph"),
 ("foto","фото","фо́то","photo"),
 ("karta","карта","ка́рта","map"),
 ("navigator","навигатор","навига́тор","navigator, GPS"),
 ("ukazatel","указатель","указа́тель","signpost, index"),
 ("zabludit","заблудиться","заблуди́ться","to get lost"),
 ("poteryatsya","потеряться","потеря́ться","to get lost, disappear"),
 ("nayti","найти","найди́","to find"),
 ("napravlenie","направление","направле́ние","direction"),
 ("orientir","ориентир","ориенти́р","landmark, bearing"),
 ("predupredit","предупредить","предупреди́ть","to warn"),
 ("rekomendovat","рекомендовать","рекомендова́ть","to recommend"),
 ("zabota","забота","забо́та","care, concern"),
 ("nauchitsya","научиться","научи́ться","to learn (a skill)"),
 ("privyknut","привыкнуть","привы́кнуть","to get used to"),
 ("spravitsya","справиться","справи́ться","to cope, manage"),
 ("osvoitsya","освоиться","освои́ться","to settle in, get the hang of"),
 ("preodolet","преодолеть","преодоле́ть","to overcome"),
 ("udivitsya","удивиться","удиви́ться","to be surprised"),
 ("razocharovatsya","разочароваться","разоча́роваться","to be disappointed"),
 ("voshititsya","восхититься","восхити́ться","to be delighted"),
 ("rasstroitsya","расстроиться","расстро́иться","to be upset"),
 ("zapomnitsya","запомниться","запо́мниться","to be remembered"),
 ("nasledie","наследие","насле́дие","heritage, legacy"),
 ("traditsiya","традиция","тради́ция","tradition"),
 ("obychai","обычай","обыча́й","custom"),
 ("kultura","культура","культу́ра","culture"),
 ("yazyk","язык","язы́к","language"),
 ("perevod","перевод","перево́д","translation"),
 ("inostranets","иностранец","иностране́ц","foreigner"),
 ("kruiz","круиз","круи́з","cruise"),
 ("puteshestvennik","путешественник","путеше́ственник","traveler"),
 ("puteshestvovat","путешествовать","путешествова́ть","to travel"),
 ("komandirovka","командировка","командиро́вка","business trip"),
 ("kanikuly","каникулы","кани́кулы","holidays, vacation"),
 ("granitsa","граница","граница́","border"),
 ("valyuta","валюта","валю́та","currency"),
 ("kurs","курс","курс","exchange rate, course"),
 ("bankomat","банкомат","банкома́т","ATM"),
 ("pochta2","почта","по́чта","post, mail"),
 ("vpechatleniya","впечатления","впеча́тления","impressions (pl)"),
 ("urok","урок","уро́к","lesson"),
 ("ponravilos","понравилось","понра́вилось","liked it"),
 ("zabylos","забылось","забы́лось","was forgotten"),
 ("zhalko","жалко","жа́лко","a pity, sorry"),
 ("spasibo2","спасибо","спа́сибо","thank you"),
]

def entry(rid, form, reading, gloss):
    return {"id": f"ru.lex.travel2.{rid}", "status": "draft",
            "forms": [{"text": form, "is_primary": True}],
            "readings": [{"text": reading, "script": "cyrillic"}],
            "glosses": {"en-US": [gloss]}, "sources": SRC, "generation": GEN}

with open(os.path.join(R, "lexicon", "travel2.jsonl"), "w") as f:
    for rid, form, reading, gloss in WORDS:
        f.write(json.dumps(entry(rid, form, reading, gloss), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ru.grammar.b1.travel-reflexives", "name": "Reflexive travel verbs", "category": "syntax",
  "definition": "Travel mishaps use reflexives: заблудиться, потеряться in supplied chunks: я заблудился. Learn the supplied forms as given."},
 {"id": "ru.grammar.b1.lessons-perfective", "name": "Lessons: perfective infinitives", "category": "syntax",
  "definition": "Lessons learned use perfective infinitives: научиться, привыкнуть, справиться with supplied objects. Learn the supplied chunks."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("u240","Это экскурсия.","This is a tour.",["экскурсия"]),
 ("u241","Это карта.","This is a map.",["карта"]),
 ("u242","Это направление.","This is the direction.",["направление"]),
 ("u243","Это забота.","This is care.",["забота"]),
 ("u244","Это урок.","This is a lesson.",["урок"]),
 ("u245","Это традиция.","This is a tradition.",["традиция"]),
 ("u246","Это наследие.","This is heritage.",["наследие"]),
 ("u247","Это язык.","This is the language.",["язык"]),
 ("u248","Это граница.","This is the border.",["граница"]),
 ("u249","Это валюта.","This is the currency.",["валюта"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, gloss, cloze in SENTS:
        e = {"id": f"ru.sent.b1.{sid}", "status": "draft", "text": text, "gloss": gloss,
             "cloze_targets": cloze, "sources": SRC, "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

OLD_GRAM = ["ru.grammar.on-ramp.eto-identification", "ru.grammar.on-ramp.zero-present-copula"]

U = [
 ("240-travel-experiences-01","Tours","экскурсия, гид, памятник, турист and фотография.",
  ["ekskursiya","gid","pamyatnik","turist","fotoografiya"], "s:u240",
  "Do not confuse гид (guide) with турист (tourist)."),
 ("241-travel-experiences-02","Finding the way","фото, карта, навигатор, указатель and направление.",
  ["foto","karta","navigator","ukazatel","napravlenie"], "s:u241",
  "Do not confuse карта (map) with навигатор (GPS)."),
 ("242-travel-experiences-03","Getting lost","заблудиться, потеряться, найти, ориентир and круиз.",
  ["zabludit","poteryatsya","nayti","orientir","kruiz"], "s:u242",
  "Do not confuse заблудиться (get lost) with найти (find)."),
 ("243-travel-experiences-04","Warnings","предупредить, рекомендовать, забота, почта and курс.",
  ["predupredit","rekomendovat","zabota","pochta2","spasibo2"], "s:u243",
  "Do not confuse предупредить (warn) with рекомендовать (recommend)."),
 ("244-travel-experiences-05","Learning","научиться, привыкнуть, справиться, освоиться and преодолеть.",
  ["nauchitsya","privyknut","spravitsya","osvoitsya","preodolet"], "s:u244",
  "Do not confuse научиться (learn) with привыкнуть (get used to)."),
 ("245-travel-experiences-06","Reactions","удивиться, разочароваться, восхититься, расстроиться and запомниться.",
  ["udivitsya","razocharovatsya","voshititsya","rasstroitsya","zapomnitsya"], "s:u245",
  "Do not confuse восхититься (delight) with разочароваться (disappoint)."),
 ("246-travel-experiences-07","Heritage","наследие, традиция, обычай, культура and впечатления.",
  ["nasledie","traditsiya","obychai","kultura","vpechatleniya"], "s:u246",
  "Do not confuse традиция (tradition) with обычай (custom)."),
 ("247-travel-experiences-08","Language","язык, перевод, иностранец, путешественник and путешествовать.",
  ["yazyk","perevod","inostranets","puteshestvennik","puteshestvovat"], "s:u247",
  "Do not confuse перевод (translation) with язык (language)."),
 ("248-travel-experiences-09","Trips","командировка, каникулы, граница, банкомат and урок.",
  ["komandirovka","kanikuly","granitsa","bankomat","urok"], "s:u248",
  "Do not confuse командировка (business trip) with каникулы (vacation)."),
 ("249-travel-experiences-10","Money and thanks","валюта, курс, понравилось, забылось and жалко.",
  ["valyuta","kurs","ponravilos","zabylos","zhalko"], "s:u249",
  "Do not confuse жалко (a pity) with понравилось (liked)."),
]

def unit_yaml(fname, title, summary, words, newitem, fence):
    uid = fname.split("-", 1)[1]
    num = fname[:3]
    lex = [w if w.startswith("ru.lex.") else f"ru.lex.travel2.{w}" for w in words]
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
    L.append(f'  expected_interpretations: ["{title}: travel with taught forms only."]')
    L.append(f'  prohibited_ambiguity: ["{fence}"]')
    L.append('  target_proficiency: "B1"')
    L.append('  validation_method: "choice"')
    return "\n".join(L) + "\n"

for fname, title, summary, words, newitem, fence in U:
    with open(os.path.join(R, "curriculum", "units", fname + ".yaml"), "w") as f:
        f.write(unit_yaml(fname, title, summary, words, newitem, fence))

print("ru batch 22 written")
assert len(WORDS) == 50, len(WORDS)
