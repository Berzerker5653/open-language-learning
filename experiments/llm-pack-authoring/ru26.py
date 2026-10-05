#!/usr/bin/env python3
"""ru-RU batch 26: B1 units 280-289 (work processes, experience, aims)."""
import json, os

R = "experiments/llm-pack-authoring/candidates/ru-fullkit-v1"
SRC = ["ru-original"]
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-05", "notes": "ai-drafted; needs dictionary sourcing and human review"}

WORDS = [
 ("protsess","процесс","проце́сс","process"),
 ("etap","этап","эта́п","stage"),
 ("oborudovanie","оборудование","оборудова́ние","equipment"),
 ("stanok","станок","стано́к","machine tool"),
 ("sborka","сборка","сбо́рка","assembly"),
 ("brak","брак","брак","defective goods"),
 ("smena","смена","сме́на","shift"),
 ("pererabotka","переработка","перерабо́тка","overtime, reprocessing"),
 ("premiya","премия","пре́мия","bonus"),
 ("zarplata","зарплата","зарпла́та","salary"),
 ("oklad","оклад","окла́д","base salary"),
 ("nastavnik","наставник","наста́вник","mentor"),
 ("stazh","стаж","стаж","length of service"),
 ("obyazannosti","обязанности","обяза́нности","duties"),
 ("kollektiv","коллектив","коллекти́в","team"),
 ("soveshchanie","совещание","совеща́ние","work meeting"),
 ("sroki","сроки","сро́ки","deadlines (pl)"),
 ("dedlayn","дедлайн","де́длайн","deadline"),
 ("prioritet","приоритет","приорите́т","priority"),
 ("vnimanie","внимание","внима́ние","attention"),
 ("koncentraciya","концентрация","концентра́ция","concentration"),
 ("effektivnost","эффективность","эффективно́сть","efficiency"),
 ("kachestvo","качество","ка́чество","quality"),
 ("standart","стандарт","ста́ндарт","standard"),
 ("norma","норма","но́рма","norm, quota"),
 ("peremena","перемена","переме́на","break"),
 ("pereryv","перерыв","пере́рыв","break, pause"),
 ("instruktazh","инструктаж","инструкта́ж","briefing"),
 ("kompetenciya","компетенция","компете́нция","competence"),
 ("portfolio","портфолио","портфо́лио","portfolio"),
 ("sertifikat","сертификат","сертифика́т","certificate"),
 ("attestaciya","аттестация","аттеста́ция","performance review"),
 ("povyshenie","повышение","повыше́ние","promotion, increase"),
 ("rost","рост","рост","growth"),
 ("strategiya","стратегия","страте́гия","strategy"),
 ("taktika","тактика","та́ктика","tactics"),
 ("rashod","расход","расхо́д","expense"),
 ("pribyl","прибыль","при́быль","profit"),
 ("ubytok","убыток","убыток","loss"),
 ("ceh","цех","цех","workshop"),
 ("konveyer","конвейер","конве́йер","conveyor"),
 ("defekt","дефект","дефе́кт","defect"),
 ("naladka","наладка","нала́дка","tuning, setup"),
 ("vypusk","выпуск","вы́пуск","output, release"),
 ("partiya","партия","па́ртия","batch"),
 ("sklad","склад","склад","warehouse"),
 ("tovar","товар","това́р","goods"),
 ("syrjo","сырьё","сырьё","raw material"),
 ("obrabotka","обработка","обрабо́тка","processing"),
 ("masterskaya","мастерская","масте́рская","workshop (small)"),
]

def entry(rid, text, stress, gloss):
    return {"id": f"ru.lex.work.{rid}", "status": "draft",
            "forms": [{"text": text}], "readings": [{"text": stress}],
            "glosses": {"en-US": [gloss]}, "sources": SRC, "generation": GEN}

with open(os.path.join(R, "lexicon", "work.jsonl"), "w") as f:
    for rid, text, stress, gloss in WORDS:
        f.write(json.dumps(entry(rid, text, stress, gloss), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ru.grammar.b1.dlya-dostizheniya", "name": "Для + genitive (aim)", "category": "syntax",
  "definition": "Aims use для + genitive: для роста, для качества. Learn the supplied chunks as given."},
 {"id": "ru.grammar.b1.prioritetnyj-konstruktsii", "name": "Priority constructions", "category": "syntax",
  "definition": "Priority uses сначала/потом with infinitives: сначала собрать, потом наладить. Learn the supplied chunks."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("u280","Это процесс.","This is a process.",["процесс"]),
 ("u281","Это этап.","This is a stage.",["этап"]),
 ("u282","Это сборка.","This is assembly.",["сборка"]),
 ("u283","Это брак.","This is defective goods.",["брак"]),
 ("u284","Это смена.","This is a shift.",["смена"]),
 ("u285","Это зарплата.","This is a salary.",["зарплата"]),
 ("u286","Это наставник.","This is a mentor.",["наставник"]),
 ("u287","Это совещание.","This is a work meeting.",["совещание"]),
 ("u288","Это качество.","This is quality.",["качество"]),
 ("u289","Это склад.","This is a warehouse.",["склад"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, gloss, cloze in SENTS:
        e = {"id": f"ru.sent.b1.{sid}", "status": "draft", "text": text, "gloss": gloss,
             "cloze_targets": cloze, "sources": SRC, "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

OLD_GRAM = ["ru.grammar.on-ramp.eto-identification", "ru.grammar.on-ramp.zero-present-copula"]

U = [
 ("280-work-processes-01","Process","процесс, этап, сборка, обработка and выпуск.",
  ["protsess","etap","sborka","obrabotka","vypusk"], "s:u280",
  "Do not confuse этап (stage) with процесс (process)."),
 ("281-work-processes-02","Equipment","оборудование, станок, конвейер, наладка and цех.",
  ["oborudovanie","stanok","konveyer","naladka","ceh"], "s:u281",
  "Do not confuse станок (machine tool) with конвейер (conveyor)."),
 ("282-work-processes-03","Defects","брак, дефект, качество, стандарт and норма.",
  ["brak","defekt","kachestvo","standart","norma"], "s:u282",
  "Do not confuse брак (defective goods) with дефект (defect)."),
 ("283-work-processes-04","Shifts","смена, перемена, перерыв, переработка and стаж.",
  ["smena","peremena","pereryv","pererabotka","stazh"], "s:u283",
  "Do not confuse перемена (break) with переработка (overtime)."),
 ("284-work-processes-05","Pay","зарплата, оклад, премия, расход and прибыль.",
  ["zarplata","oklad","premiya","rashod","pribyl"], "s:u284",
  "Do not confuse оклад (base salary) with премия (bonus)."),
 ("285-work-processes-06","Mentor","наставник, коллектив, обязанности, инструктаж and компетенция.",
  ["nastavnik","kollektiv","obyazannosti","instruktazh","kompetenciya"], "s:u285",
  "Do not confuse наставник (mentor) with коллектив (team)."),
 ("286-work-processes-07","Meetings","совещание, приоритет, сроки, дедлайн and внимание.",
  ["soveshchanie","prioritet","sroki","dedlayn","vnimanie"], "s:u286",
  "Do not confuse сроки (deadlines) with дедлайн (deadline)."),
 ("287-work-processes-08","Quality","качество, концентрация, эффективность, стандарт and норма.",
  ["kachestvo","koncentraciya","effektivnost","standart","norma"], "s:u287",
  "Do not confuse эффективность (efficiency) with качество (quality)."),
 ("288-work-processes-09","Growth","повышение, рост, стратегия, тактика and аттестация.",
  ["povyshenie","rost","strategiya","taktika","attestaciya"], "s:u288",
  "Do not confuse стратегия (strategy) with тактика (tactics)."),
 ("289-work-processes-10","Warehouse","склад, товар, сырьё, партия and мастерская.",
  ["sklad","tovar","syrjo","partiya","masterskaya"], "s:u289",
  "Do not confuse товар (goods) with сырьё (raw material)."),
]

def unit_yaml(fname, title, summary, words, newitem, fence):
    uid = fname.split("-", 1)[1]
    num = fname[:3]
    lex = [w if w.startswith("ru.lex.") else f"ru.lex.work.{w}" for w in words]
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
    L.append('goal_id: "ru.goal.b1.learning-work"')
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
    L.append(f'  expected_interpretations: ["{title}: work processes with taught forms only."]')
    L.append(f'  prohibited_ambiguity: ["{fence}"]')
    L.append('  target_proficiency: "B1"')
    L.append('  validation_method: "choice"')
    return "\n".join(L) + "\n"

for fname, title, summary, words, newitem, fence in U:
    with open(os.path.join(R, "curriculum", "units", fname + ".yaml"), "w") as f:
        f.write(unit_yaml(fname, title, summary, words, newitem, fence))

print("ru batch 26 written")
assert len(WORDS) == 50, len(WORDS)
