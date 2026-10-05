#!/usr/bin/env python3
"""ja-JP batch 63: B2 units 670-679 (psych tail + medicine-society start)."""
import json, os

R = "languages/ja-JP"
SRC = ["jf-standard", "ai-drafted-extension"]
NOTE = ("Framework-level sourcing only (JF Standard reference, no descriptor text copied); "
        "a dictionary/reviewer source must be added before verified status.")
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-05", "notes": "ai-assisted draft wording; qualified review pending."}

WORDS = [
 ("kettei","けってい","noun","decision"),
 ("sentaku","せんたく","noun","choice, selection"),
 ("risuku","りすく","noun","risk"),
 ("kouka","こうか","noun","effect, result"),
 ("koushou","こうしょう","noun","trade-off, concession"),
 ("seishin","せいしん","noun","mind, spirit"),
 ("hoken","ほうけん","noun","health insurance"),
 ("byouin","びょういん","noun","hospital"),
 ("kusuri","くすり","noun","medicine, drug"),
 ("kanja","かんじゃ","noun","patient"),
 ("kenkyuu","けんきゅう","noun","research, study"),
 ("data","でーた","noun","data"),
 ("shouko","しょうこ","noun","evidence, proof"),
 ("ronbun","ろんぶん","noun","essay, paper"),
 ("teian","ていあん","noun","proposal, suggestion"),
 ("eisei","えいせい","noun","hygiene, public health"),
 ("yobou","よぼう","noun","prevention"),
 ("wakuchin","わくちん","noun","vaccine"),
 ("kansen","かんせん","noun","infection"),
 ("hassen","はっせん","noun","outbreak"),
 ("denkan","でんかん","noun","contagion, transmission"),
 ("chousa","ちょうさ","noun","investigation, survey"),
 ("kanren","かんれん","noun","relation, connection"),
 ("toukei","とうけい","noun","statistics"),
 ("happyou","はっぴょう","noun","announcement, presentation"),
 ("seido","せいど","noun","system, institution"),
 ("houkenryou","ほうけんりょう","noun","insurance premium"),
 ("kyoukai","きょうかい","noun","association, society"),
 ("kanri","かんり","noun","management, control"),
 ("shien","しえん","noun","support, assistance"),
 ("kenkou","けんこう","noun","health"),
 ("undou","うんどう","noun","exercise"),
 ("shokujou","しょくじょう","noun","diet, eating habits"),
 ("seikatsu","せいかつ","noun","daily life, lifestyle"),
 ("yukou","ゆうこう","na-adjective","effective"),
 ("setsumei","せつめい","noun","explanation"),
 ("shitsumon","しつもん","noun","question"),
 ("shinryou","しんりょう","noun","medical consultation"),
 ("kizuki","きづき","noun","awareness, noticing"),
 ("kotae","こたえ","noun","answer, reply"),
 ("iyaku","いやく","noun","medicine, pharmaceutical"),
 ("jikken","じっけん","noun","experiment"),
 ("katsuyou","かつよう","noun","application, practical use"),
 ("shinkou","しんこう","noun","progress, advance"),
 ("seika","せいか","noun","result, achievement"),
 ("seiyaku","せいやく","noun","pharmaceutical medicine"),
 ("fukusayou","ふくさよう","noun","side effect"),
 ("kouchou","こうちょう","noun","benefit, profit"),
 ("taisaku","たいさく","noun","measure, countermeasure"),
 ("kachi","かち","noun","value, worth"),
]

def entry(rid, kana, pos, gloss):
    return {"id": f"ja.lex.med.{rid}", "status": "draft",
            "forms": [{"text": kana, "script": "hiragana", "is_primary": True}],
            "readings": [{"text": kana, "script": "hiragana"},
                         {"text": rid, "transliteration_system": "modified-hepburn"}],
            "glosses": {"en-US": [gloss]}, "part_of_speech": pos,
            "registers": ["ja.register.neutral-common"], "semantic_tags": ["medicine"],
            "sources": SRC, "notes": NOTE, "generation": GEN}

with open(os.path.join(R, "lexicon", "med.jsonl"), "w") as f:
    for rid, kana, pos, gloss in WORDS:
        f.write(json.dumps(entry(rid, kana, pos, gloss), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ja.grammar.b2-ni-wakat-te", "name": "〜にしては (considering)", "category": "syntax",
  "definition": "にしては sets a standard for surprise: けんきゅう に しては りょう が たかい. Draft definition pending review."},
 {"id": "ja.grammar.b2-ppoi", "name": "〜っぽい (seemish)", "category": "syntax",
  "definition": "っぽい adds a tendency: ふくさよう が っぽい. Draft definition pending review."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("decision-science","けってい の じっけん を べんきょう しました。","kettei no jikken wo benkyou shimashita.","I studied the decision experiment.",["けってい"]),
 ("mental-health-policy","ほうけん の せいど を ぎろん しました。","hoken no seido wo giron shimashita.","We discussed the insurance system.",["ほうけん"]),
 ("public-health","えいせい の かつどう を おこないました。","eisei no katsudou wo okonaimashita.","We carried out a public-health activity.",["えいせい"]),
 ("epidemiology-basics","かんせん の ちょうさ を おこないました。","kansen no chousa wo okonaimashita.","We conducted an infection survey.",["かんせん"]),
 ("healthcare-systems","びょういん の かんり について はなしました。","byouin no kanri ni tsuite hanashimashita.","We talked about hospital management.",["びょういん"]),
 ("preventive-medicine","けんこう の ために うんどう を しました。","kenkou no tame ni undou wo shimashita.","I exercised for health.",["けんこう"]),
 ("patient-communication","しんりょう の せつめい を ききました。","shinryou no setsumei wo kikimashita.","I listened to the consultation explanation.",["しんりょう"]),
 ("medical-research","いやく の じっけん の けっか を よみました。","iyaku no jikken no kekka wo yomimashita.","I read the results of the drug trial.",["じっけん"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, romaji, gloss, cloze in SENTS:
        e = {"id": f"ja.sent.{sid}", "status": "draft", "text": text, "reading": text,
             "romaji": romaji, "gloss": gloss, "cloze_targets": cloze,
             "sources": SRC, "notes": "ai-assisted draft sentence; qualified review required before verified.",
             "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

ASSESS = {"id": "ja.assess.medicine-society", "goal_id": "ja.goal.b2.medicine-society",
          "kind": "transfer", "modality": "interaction",
          "rubric": {"scale": "observed", "criteria": [
              "discuss a public-health issue using taught medicine vocabulary",
              "explain a health measure or risk without blocking errors"]},
          "review_status": "draft"}
with open(os.path.join(R, "assessments", "definitions.jsonl"), "a") as f:
    f.write(json.dumps(ASSESS, ensure_ascii=False) + "\n")

GOAL_YAML = """  - id: ja.goal.b2.medicine-society
    description: 'Discuss medicine and public health: prevention, systems, and research.'
    band: B2
    framework_refs: []
    contexts:
    - ja.situation.classroom
    modalities:
    - listening
    - speaking
    - reading
    - writing
    prerequisites:
    - target: ja.goal.b2.science-tech-ethics
      dimension: grammar-controlled
      required_state: independent
      strength: hard
    required_concepts:
    - ja.lex.med.eisei
    - ja.lex.med.kenkou
    assessment_ids:
    - ja.assess.medicine-society
    transfer_required: true
    sources:
    - jf-standard
    - ai-drafted-extension
    review_status: draft
    generation:
      method: ai-assisted
      tool: omp
      model: strata/qwen3.8-flash-next-iq3_s
      date: '2026-10-05'
"""
with open(os.path.join(R, "curriculum", "goals.yaml"), "a") as f:
    f.write(GOAL_YAML)

DEP = """- from: ja.goal.b2.medicine-society
  to: ja.goal.b2.science-tech-ethics
  dimension: grammar-controlled
  required_state: independent
  strength: hard
"""
dp = os.path.join(R, "grammar", "dependencies.yaml")
with open(dp) as f:
    dep = f.read()
dep = dep.replace("notes:", DEP + "notes:", 1)
with open(dp, "w") as f:
    f.write(dep)
assert len(WORDS) == 50, len(WORDS)

OLD_SENTS = ["ja.sent.meeting-starts","ja.sent.reply-email","ja.sent.report-address",
             "ja.sent.work-company","ja.sent.interview-prep"]

PSY = "ja.goal.b2.psychology-mind"
MED = "ja.goal.b2.medicine-society"
U = [
 ("670-decision-science","decision science","670-decision-science",PSY,
  ["kettei","sentaku","risuku","kouka","koushou"], "s:decision-science"),
 ("671-mental-health-policy","mental health policy","671-mental-health-policy",PSY,
  ["seishin","hoken","byouin","kusuri","kanja"], "s:mental-health-policy"),
 ("672-psychology-essay","psychology essay","672-psychology-essay",PSY,
  ["kenkyuu","data","shouko","ronbun","teian"], "g:ja.grammar.b2-ni-wakat-te"),
 ("673-public-health","public health","673-public-health",MED,
  ["eisei","yobou","wakuchin","kansen","hassen"], "s:public-health"),
 ("674-epidemiology-basics","epidemiology basics","674-epidemiology-basics",MED,
  ["denkan","chousa","kanren","toukei","happyou"], "s:epidemiology-basics"),
 ("675-healthcare-systems","healthcare systems","675-healthcare-systems",MED,
  ["seido","houkenryou","kyoukai","kanri","shien"], "s:healthcare-systems"),
 ("676-preventive-medicine","preventive medicine","676-preventive-medicine",MED,
  ["kenkou","undou","shokujou","seikatsu","yukou"], "s:preventive-medicine"),
 ("677-patient-communication","patient communication","677-patient-communication",MED,
  ["setsumei","shitsumon","shinryou","kizuki","kotae"], "s:patient-communication"),
 ("678-medical-research","medical research","678-medical-research",MED,
  ["iyaku","jikken","katsuyou","shinkou","seika"], "s:medical-research"),
 ("679-pharma-debate","pharma debate","679-pharma-debate",MED,
  ["seiyaku","fukusayou","kouchou","taisaku","kachi"], "g:ja.grammar.b2-ppoi"),
]

def unit_yaml(topic, uid, goal, words, newitem):
    lex = [f"ja.lex.med.{w}" for w in words]
    if newitem.startswith("s:"):
        newref = f"ja.sent.{newitem[2:]}"
        allowed_gram = ["ja.grammar.particle.object-wo"]
    else:
        newref = newitem[2:]
        allowed_gram = [newref, "ja.grammar.particle.object-wo"]
    old = [s for s in OLD_SENTS if s != newref][:2]
    refs = lex + [newref] + old
    lines = ["# ai-assisted draft unit (Mode B B2); content refs are pack data; qualified review pending.",
             f"id: ja.unit.{uid}", f"goal_id: {goal}",
             f"title: {topic}", f"summary: B2 language for {topic}.",
             "estimated_minutes: 6", "generation_contract:", "  allowed_vocab:"]
    for r in lex + [x for x in refs if x.startswith("ja.sent.")]: lines.append(f"  - {r}")
    lines.append("  allowed_grammar:")
    for g in allowed_gram: lines.append(f"  - {g}")
    lines += ["  new_item_budget: 6", "  validation_method: choice", "activities:"]
    acts = [("enc","encounter-read","reading",5),("listen","listen-and-choose","listening",3),
            ("match","match","reading",2),("speak","recall-choice","speaking",2)]
    for aid, atype, mod, sup in acts:
        lines += [f"- id: ja.activity.{uid}-{aid}", f"  type: {atype}", f"  modality: {mod}",
                  f"  support_level: {sup}", "  content_refs:"]
        for r in refs: lines.append(f"  - {r}")
    cloze_refs = [r for r in refs if r.startswith("ja.sent.")][:2]
    for i, cr in enumerate(cloze_refs):
        lines += [f"- id: ja.activity.{uid}-cloze{i}", "  type: cloze", "  modality: writing",
                  "  support_level: 2", "  content_refs:", f"  - {cr}"]
    return "\n".join(lines) + "\n"

for fname, topic, uid, goal, words, newitem in U:
    with open(os.path.join(R, "curriculum", "units", fname + ".yaml"), "w") as f:
        f.write(unit_yaml(topic, uid, goal, words, newitem))

print("batch63 written")
