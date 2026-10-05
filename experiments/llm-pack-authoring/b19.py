#!/usr/bin/env python3
"""Batch 19: ja-JP B1 units 240-249 (education-academic part 2)."""
import json, os

R = "/home/hunter/game-dev/LTS/languages/ja-JP"
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-04", "notes": "ai-assisted draft wording; qualified review pending."}
SRC = ["jf-standard", "ai-drafted-extension"]
NOTE = ("Framework-level sourcing only (JF Standard reference, no descriptor text copied); "
        "a dictionary/reviewer source must be added before verified status.")

WORDS = [
 ("sentai","せんたい","noun","topic selection"),
 ("mondai","もんだい","noun","problem; question"),
 ("ten","てん","noun","point"),
 ("bunsho","ぶんしょ","noun","document; passage"),
 ("danshaku","だんしゃく","noun","paragraph"),
 ("ronshu","ろんしゅう","noun","argument; reasoning"),
 ("kenji","けんじ","noun","evidence"),
 ("kronji","くろんじ","noun","counter-evidence"),
 ("ketsuron","けつろん","noun","conclusion"),
 ("zensho","ぜんしょ","noun","previous section"),
 ("ryugaku","りゅうがく","noun","studying abroad"),
 ("ryugaku-seikatsu","りゅうがくせいかつ","noun","life abroad"),
 ("shukufuku","しゅくふく","noun","lodging"),
 ("homestay","ほーむすてい","noun","homestay"),
 ("ryuji","りゅうじ","noun","schedule"),
 ("shogakukin","しょうがくきん","noun","scholarship"),
 ("shinsei-hyou","しんせいひょう","noun","application form"),
 ("rissho","りっしょ","noun","document"),
 ("senmon","せんもん","noun","specialty; field"),
 ("shoukaku-shinsei","しょうがくしんせい","noun","scholarship application"),
 ("denja","でんじゃ","noun","email (formal)"),
 ("mouhibiki","もうひき","noun","quotation"),
 ("sanko-bunken","さんこうぶんけん","noun","reference book"),
 ("sakuin","さくいん","noun","index"),
 ("shicho","しちょう","noun","library viewing"),
 ("kashu","かしゅ","noun","lending"),
 ("kashu-sho","かしゅしょう","noun","library card"),
 ("fukushuu","ふくしゅう","noun","review; revision"),
 ("keikaku","けいかく","noun","plan"),
 ("senryaku","せんりゃく","noun","strategy"),
 ("jikan-wari","じかんわり","noun","time allocation"),
 ("yosoku","よそく","noun","prediction"),
 ("jouhou","じょうほう","noun","information"),
 ("kenta","けんた","noun","consideration"),
 ("houtei","ほうてい","noun","definition"),
 ("teigi","ていぎ","noun","definition"),
 ("senkyuu","せんきゅう","noun","area; region"),
 ("bunya","ぶんや","noun","field of study"),
 ("gengou","げんごう","noun","word combination"),
 ("taiwa","たいわ","noun","dialogue"),
 ("yakku","やっく","noun","dictionary"),
 ("yakuseki","やくせき","noun","translation"),
 ("chukai","ちゅうかい","noun","interpretation"),
 ("hyouji","ひょうじ","noun","display; presentation"),
 ("fuyuujunou","ふゆうじゅんのう","noun","popularization"),
 ("koyou","こよう","noun","employment"),
 ("jitsumu","じつむ","noun","practical work"),
 ("jikken","じっけん","noun","experiment"),
 ("houkoku","ほうこく","noun","report; presentation"),
 ("chushi","ちゅうし","noun","note; annotation"),
]
assert len(WORDS) == 50, len(WORDS)

with open(os.path.join(R, "lexicon", "edu2.jsonl"), "w") as f:
    for rid, kana, pos, gloss in WORDS:
        e = {"id": f"ja.lex.edu2.{rid}", "status": "draft",
             "forms": [{"text": kana, "script": "hiragana", "is_primary": True}],
             "readings": [{"text": kana, "script": "hiragana"},
                          {"text": rid, "transliteration_system": "modified-hepburn"}],
             "glosses": {"en-US": [gloss]}, "part_of_speech": pos,
             "registers": ["ja.register.neutral-common"], "semantic_tags": ["education"],
             "sources": SRC, "notes": NOTE, "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ja.grammar.b1.kedo-keredo", "name": "けど/けれど (contrast)", "category": "syntax",
  "definition": "けど/けれど links contrasting clauses more softly than が: けつろん は わかりました けど、けんじ が すくない. Draft definition pending review."},
 {"id": "ja.grammar.b1.rashii-sou-youda", "name": "らしい/そうだ/ようだ (hearsay vs appearance)", "category": "semantics",
  "definition": "らしい marks reported information: きょうじゅ が くる らしい; そうだ (hearsay) and ようだ (appearance) shade certainty differently. Draft definition pending review."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("topic-choice","せんたい を きめる のに 2しゅうかん かかりました。","sentai wo kimeru no ni 2-shuukan kakarimashita.","It took two weeks to choose the topic.",["せんたい"]),
 ("paragraph-point","だんしゃく ごとに てん を ひとつ に します。","danshaku goto ni ten wo hitotsu ni shimasu.","One point per paragraph.",["だんしゃく"]),
 ("evidence-conclusion","けんじ が あれば けつろん が つよいです。","kenji ga areba ketsuron ga tsuyoi desu.","With evidence the conclusion is strong.",["けんじ"]),
 ("abroad-prep","りゅうがく の じゅんび で しゅくふく を さがしています。","ryuugaku no junbi de shukufuku wo sagashiteimasu.","I am looking for lodging while preparing to study abroad.",["しゅくふく"]),
 ("scholarship-form","しょうがくきん の しんせいしょう を かきました。","shougakukin no shinsei-shou wo kakimashita.","I filled out the scholarship application form.",["しょうがくきん"]),
 ("degree-talk","だいがく の せんもん について はなしました。","daigaku no senmon ni tsuite hanashimashita.","We talked about university specialties.",["せんもん"]),
 ("exam-plan","じかんわり を つくって しけんの せんりゃく を たてました。","jikan-wari wo tsukutte shiken no senryaku wo tatemashita.","I made a time plan and set an exam strategy.",["じかんわり"]),
 ("library-card","かしゅしょう で 3ほん まで かりられます。","kashu-shou de 3-hon made kariremasu.","With the library card you can borrow up to three books.",["かしゅしょう"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, romaji, gloss, cloze in SENTS:
        e = {"id": f"ja.sent.{sid}", "status": "draft", "text": text, "reading": text,
             "romaji": romaji, "gloss": gloss, "cloze_targets": cloze,
             "sources": SRC, "notes": "ai-assisted draft sentence; qualified review required before verified.",
             "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

U = [
 ("240-choosing-a-topic","choosing a topic","choosing-topic","ja.goal.b1.education-academic",
  ["sentai","mondai","ten","bunsho","chushi"], "s:topic-choice"),
 ("241-essay-structure","essay structure","essay-structure","ja.goal.b1.education-academic",
  ["danshaku","zensho","yakku","ketsuron","ronshu"], "s:paragraph-point"),
 ("242-argument-paragraphs","argument paragraphs","argument-paragraphs","ja.goal.b1.education-academic",
  ["kenji","kronji","taiwa","houtei","teigi"], "s:evidence-conclusion"),
 ("243-study-abroad-plans","study abroad plans","study-abroad-plans","ja.goal.b1.education-academic",
  ["ryugaku","ryugaku-seikatsu","shukufuku","homestay","ryuji"], "s:abroad-prep"),
 ("244-scholarship-writing","scholarship writing","scholarship-writing","ja.goal.b1.education-academic",
  ["shogakukin","shinsei-hyou","shoukaku-shinsei","rissho","denja"], "s:scholarship-form"),
 ("245-academic-email","academic email","academic-email","ja.goal.b1.education-academic",
  ["mouhibiki","sanko-bunken","sakuin","chukai","yakuseki"], "g:ja.grammar.b1.kedo-keredo"),
 ("246-exam-strategy","exam strategy","exam-strategy","ja.goal.b1.education-academic",
  ["keikaku","senryaku","jikan-wari","yosoku","jouhou"], "s:exam-plan"),
 ("247-library-research","library research","library-research","ja.goal.b1.education-academic",
  ["shicho","kashu","kashu-sho","fukushuu","kenta"], "s:library-card"),
 ("248-academic-presentation","academic presentation","academic-presentation","ja.goal.b1.education-academic",
  ["hyouji","fuyuujunou","houkoku","jikken","jitsumu"], "g:ja.grammar.b1.rashii-sou-youda"),
 ("249-degree-conversations","degree conversations","degree-conversations","ja.goal.b1.education-academic",
  ["koyou","senkyuu","bunya","gengou","senmon"], "s:degree-talk"),
]
OLD_SENTS = ["ja.sent.meeting-starts","ja.sent.reply-email","ja.sent.report-address",
             "ja.sent.work-company","ja.sent.interview-prep"]

def unit_yaml(topic, uid, goal, words, newitem):
    lex = [f"ja.lex.edu2.{w}" for w in words]
    if newitem.startswith("s:"):
        newref = f"ja.sent.{newitem[2:]}"
        allowed_gram = ["ja.grammar.particle.object-wo"]
    else:
        newref = newitem[2:]
        allowed_gram = [newref, "ja.grammar.particle.object-wo"]
    old = [s for s in OLD_SENTS if s != newref][:2]
    refs = lex + [newref] + old
    lines = [f"# ai-assisted draft unit (Mode B B1); content refs are pack data; qualified review pending.",
             f"id: ja.unit.{uid}", f"goal_id: {goal}",
             f"title: {topic}", f"summary: B1 language for {topic}.",
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

print("batch19 written")
