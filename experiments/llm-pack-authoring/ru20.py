#!/usr/bin/env python3
"""ru-RU batch 20: B1 units 220-229 (narrative background and viewpoint)."""
import json, os

R = "experiments/llm-pack-authoring/candidates/ru-fullkit-v1"
SRC = ["ru-original"]
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-05", "notes": "ai-drafted; needs dictionary sourcing and human review"}

WORDS = [
 ("vo-vremya","во время","во вре́мя","during"),
 ("vokrug","вокруг","вокру́г","around"),
 ("ryadom","рядом","ря́дом","nearby"),
 ("v-to-vremya","в то время","в то вре́мя","at that time"),
 ("ves-vecher","весь вечер","весь ве́чер","the whole evening"),
 ("vzglyad","взгляд","взгля́д","glance, viewpoint"),
 ("tochka-zreniya","точка зрения","то́чка зре́ния","point of view"),
 ("sudba","судьба","судьба́","fate, destiny"),
 ("pozitsiya","позиция","пози́ция","position, stance"),
 ("vpechatlenie","впечатление","впеча́тление","impression"),
 ("pogoda","погода","пого́да","weather"),
 ("dozd","дождь","дождь","rain"),
 ("sneg","снег","снег","snow"),
 ("veter","ветер","ве́тер","wind"),
 ("solntse","солнце","со́лнце","sun"),
 ("otezd","отъезд","отъе́зд","departure"),
 ("priezd","приезд","прие́зд","arrival"),
 ("nomer","номер","но́мер","number, room"),
 ("devushka","девушка","де́вушка","girl, young woman"),
 ("paren","парень","па́рень","guy, fellow"),
 ("priyatel","приятель","прия́тель","friend, buddy"),
 ("neznakomy","незнакомый","незна́комый","stranger, unfamiliar"),
 ("krasivy","красивый","краси́вый","beautiful"),
 ("vysokii","высокий","высо́кий","tall, high"),
 ("tyomnyi","тёмный","тёмный","dark"),
 ("svetly","светлый","се́тлый","light, bright"),
 ("stroiny","стройный","стро́йный","slim, well-built"),
 ("odezhda","одежда","оде́жда","clothing"),
 ("shlyapa","шляпа","шля́па","hat"),
 ("zont","зонт","зонт","umbrella"),
 ("chuvstvo","чувство","чу́вство","feeling"),
 ("radost","радость","ра́дость","joy"),
 ("grust","грусть","грусть","sadness"),
 ("strakh","страх","страх","fear"),
 ("lyubov","любовь","любо́вь","love"),
 ("mysl","мысль","мы́сль","thought"),
 ("dumat","думать","ду́мать","to think"),
 ("ponimat","понимать","понима́ть","to understand"),
 ("soobrazhat","соображать","сообража́ть","to reason, figure out"),
 ("dogadyvatsya","догадываться","дога́дываться","to guess, suspect"),
 ("polden","полдень","по́лдень","noon"),
 ("polnoch","полночь","по́лночь","midnight"),
 ("rassvet","рассвет","рассве́т","dawn"),
 ("zakat","закат","зака́т","sunset"),
 ("vremena","времена","времена́","times, era"),
 ("tishina","тишина","тишина́","silence, quiet"),
 ("zvuk","звук","звук","sound"),
 ("golos","голос","го́лос","voice"),
 ("sled","след","след","trace, footstep"),
 ("ten","тень","тень","shadow"),
]
assert len(WORDS) == 50, len(WORDS)

def entry(rid, form, reading, gloss):
    return {"id": f"ru.lex.narration2.{rid}", "status": "draft",
            "forms": [{"text": form, "is_primary": True}],
            "readings": [{"text": reading, "script": "cyrillic"}],
            "glosses": {"en-US": [gloss]}, "sources": SRC, "generation": GEN}

with open(os.path.join(R, "lexicon", "narration2.jsonl"), "w") as f:
    for rid, form, reading, gloss in WORDS:
        f.write(json.dumps(entry(rid, form, reading, gloss), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ru.grammar.b1.imperfective-background", "name": "пока + imperfective", "category": "syntax",
  "definition": "Background uses пока with an imperfective verb: пока ждали, шли дождь. Learn the supplied chunks; do not add new verbs."},
 {"id": "ru.grammar.b1.viewpoint-markers", "name": "Viewpoint markers", "category": "syntax",
  "definition": "Viewpoint uses точка зрения and взгляд in supplied chunks: с точки зрения погоды. Learn the supplied forms as given."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("u220","Мы ждали весь вечер.","We waited the whole evening.",["весь вечер"]),
 ("u221","Это впечатление.","This is an impression.",["впечатление"]),
 ("u222","Погода была плохая.","The weather was bad.",["плохая"]),
 ("u223","Это отъезд.","This is the departure.",["отъезд"]),
 ("u224","Это девушка.","This is the young woman.",["девушка"]),
 ("u225","Он высокий.","He is tall.",["высокий"]),
 ("u226","Это одежда.","This is clothing.",["одежда"]),
 ("u227","Это радость.","This is joy.",["радость"]),
 ("u228","Это мысль.","This is a thought.",["мысль"]),
 ("u229","Наступил полдень.","Noon arrived.",["полдень"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, gloss, cloze in SENTS:
        e = {"id": f"ru.sent.b1.{sid}", "status": "draft", "text": text, "gloss": gloss,
             "cloze_targets": cloze, "sources": SRC, "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

OLD_GRAM = ["ru.grammar.on-ramp.eto-identification", "ru.grammar.on-ramp.zero-present-copula"]

U = [
 ("220-narration-background-01","Background","во время, вокруг, рядом, в то время and весь вечер.",
  ["vo-vremya","vokrug","ryadom","v-to-vremya","ves-vecher"], "s:u220",
  "Do not confuse во время (during) with в то время (at that time)."),
 ("221-narration-background-02","Viewpoint","взгляд, точка зрения, судьба, позиция and впечатление.",
  ["vzglyad","tochka-zreniya","sudba","pozitsiya","vpechatlenie"], "s:u221",
  "Do not confuse взгляд (glance) with точка зрения (point of view)."),
 ("222-narration-background-03","Weather","погода, дождь, снег, ветер and солнце.",
  ["pogoda","dozd","sneg","veter","solntse"], "s:u222",
  "Do not confuse дождь (rain) with снег (snow)."),
 ("223-narration-background-04","Arrival and departure","отъезд, приезд, номер, девушка and парень.",
  ["otezd","priezd","nomer","devushka","paren"], "s:u223",
  "Do not confuse отъезд (departure) with приезд (arrival)."),
 ("224-narration-background-05","People","приятель, незнакомый, парень, девушка and человек.",
  ["priyatel","neznakomy","paren","devushka","ru.lex.family.chelovek"], "s:u224",
  "Do not confuse приятель (buddy) with незнакомый (stranger)."),
 ("225-narration-background-06","Descriptions","красивый, высокий, тёмный, светлый and стройный.",
  ["krasivy","vysokii","tyomnyi","svetly","stroiny"], "s:u225",
  "Do not confuse тёмный (dark) with светлый (light)."),
 ("226-narration-background-07","Clothes","одежда, шляпа, зонт, пальто and шапка.",
  ["odezhda","shlyapa","zont","ru.lex.home.palto","ru.lex.shopping.shapka"], "s:u226",
  "Do not confuse шляпа (hat) with шапка (winter cap)."),
 ("227-narration-background-08","Feelings","чувство, радость, грусть, страх and любовь.",
  ["chuvstvo","radost","grust","strakh","lyubov"], "s:u227",
  "Do not confuse радость (joy) with грусть (sadness)."),
 ("228-narration-background-09","Thinking","мысль, думать, понимать, соображать and догадываться.",
  ["mysl","dumat","ponimat","soobrazhat","dogadyvatsya"], "s:u228",
  "Do not confuse понимать (understand) with догадываться (suspect)."),
 ("229-narration-background-10","Times of day","полдень, полночь, рассвет, закат and времена.",
  ["polden","polnoch","rassvet","zakat","vremena"], "s:u229",
  "Do not confuse рассвет (dawn) with закат (sunset)."),
]

def unit_yaml(fname, title, summary, words, newitem, fence):
    uid = fname.split("-", 1)[1]
    num = fname[:3]
    lex = [w if w.startswith("ru.lex.") else f"ru.lex.narration2.{w}" for w in words]
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
    L.append('goal_id: "ru.goal.b1.narration"')
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
    L.append(f'  expected_interpretations: ["{title}: background with taught forms only."]')
    L.append(f'  prohibited_ambiguity: ["{fence}"]')
    L.append('  target_proficiency: "B1"')
    L.append('  validation_method: "choice"')
    return "\n".join(L) + "\n"

for fname, title, summary, words, newitem, fence in U:
    with open(os.path.join(R, "curriculum", "units", fname + ".yaml"), "w") as f:
        f.write(unit_yaml(fname, title, summary, words, newitem, fence))

print("ru batch 20 written")
