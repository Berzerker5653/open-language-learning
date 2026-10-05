#!/usr/bin/env python3
"""ja-JP batch 35: B1 units 400-409 (health-wellness part 1)."""
import json, os

R = "languages/ja-JP"
SRC = ["jf-standard", "ai-drafted-extension"]
NOTE = ("Framework-level sourcing only (JF Standard reference, no descriptor text copied); "
        "a dictionary/reviewer source must be added before verified status.")
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-04", "notes": "ai-assisted draft wording; qualified review pending."}

WORDS = [
 ("seikatsu2","せいかつ","noun","lifestyle"),
 ("jousho","じょうしょ","noun","hot water"),
 ("biyou","びよう","noun","beauty"),
 ("kinen","きねん","noun","commemoration"),
 ("taikyuu","たいきゅう","noun","rest"),
 ("nebuki","ねぶき","noun","sleeplessness"),
 ("koku2","こく","noun","meal"),
 ("choushi","ちょうし","noun","condition"),
 ("karada","からだ","noun","body"),
 ("nou","のう","noun","brain"),
 ("tansu","たんす","noun","chest of drawers"),
 ("tanpaku","たんぱく","noun","protein"),
 ("eiyou","えいよう","noun","nutrition"),
 ("karori","カロリー","noun","calorie"),
 ("shio2","しお","noun","salt"),
 ("unsou","うんそう","noun","exercise"),
 ("junou","じゅのう","na-adjective","flexible"),
 ("kinyu","きんゆ","noun","bath"),
 ("kessha","けっしゃ","noun","facility"),
 ("taiken3","たいけん","noun","experience"),
 ("fuka","ふか","noun","depth"),
 ("kankyou2","かんきょう","noun","environment"),
 ("kokoro2","こころ","noun","mind"),
 ("shinryo","しんりょう","noun","treatment"),
 ("fuan2","ふあん","noun","unease"),
 ("zyouhou","じょうほう","noun","information"),
 ("joutai","じょうたい","noun","state"),
 ("shoujou","しょうじょう","noun","symptom"),
 ("byouki2","びょうき","noun","illness"),
 ("shinryou2","しんりょう","noun","counseling"),
 ("shuusei","しゅうせい","noun","correction"),
 ("kessan3","けっさん","noun","accounting"),
 ("kagaku","かがく","noun","science"),
 ("gakkai","がっかい","noun","association"),
 ("igaku","いがく","noun","medicine"),
 ("yakubou","やくぼう","noun","pharmacy"),
 ("abura","あぶら","noun","oil"),
 ("amami","あまみ","noun","sweetness"),
 ("suupu","スープ","noun","soup"),
 ("chouryou","ちょうりょう","noun","portion"),
 ("seka","せか","noun","world (prefix)"),
 ("seka2","せかい","noun","world"),
 ("chishiki","ちしき","noun","knowledge"),
 ("chiryou","ちりょう","noun","therapy"),
 ("ryouki","りょうき","noun","convalescence"),
 ("kenkou2","けんこう","noun","health"),
 ("netsu2","ねつ","noun","fever"),
 ("iyashi","いやし","noun","healing"),
 ("tsuuka2","つうか","noun","communication"),
 ("wakuchin","ワクチン","noun","vaccine"),
]
assert len(WORDS) == 50, len(WORDS)

def entry(shard, rid, kana, pos, gloss, tag):
    return {"id": f"ja.lex.{shard}.{rid}", "status": "draft",
            "forms": [{"text": kana, "script": "hiragana", "is_primary": True}],
            "readings": [{"text": kana, "script": "hiragana"},
                         {"text": rid, "transliteration_system": "modified-hepburn"}],
            "glosses": {"en-US": [gloss]}, "part_of_speech": pos,
            "registers": ["ja.register.neutral-common"], "semantic_tags": [tag],
            "sources": SRC, "notes": NOTE, "generation": GEN}

with open(os.path.join(R, "lexicon", "health2.jsonl"), "w") as f:
    for rid, kana, pos, gloss in WORDS:
        f.write(json.dumps(entry("health2", rid, kana, pos, gloss, "health"), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ja.grammar.b1.nagara", "name": "〜ながら (simultaneous)", "category": "syntax",
  "definition": "ながら does two things at once: おんがく を ききながら うんそう します. Draft definition pending review."},
 {"id": "ja.grammar.b1.mazu", "name": "まず (first of all)", "category": "pragmatics",
  "definition": "まず orders steps: まず ねる じかん を かえます. Draft definition pending review."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("wellness-routine","せいかつ の しゅうかん を かえました。","seikatsu no shuukan wo kaemashita.","I changed my lifestyle habits.",["せいかつ"]),
 ("sleep-habit","ねぶき で からだ の ちょうし が わるかったです。","nebuki de karada no choushi ga warukatta desu.","Sleeplessness made my body condition bad.",["ねぶき"]),
 ("nutrition","たんぱく と えいよう を べんきょう しました。","tanpaku to eiyou wo benkyou shimashita.","We studied protein and nutrition.",["たんぱく"]),
 ("exercise-plan","うんそう の じゅんじょ を かきました。","unsou no junjo wo kakimashita.","I wrote the order of exercises.",["うんそう"]),
 ("stress-manage","こころ の ふかみ を はなしました。","kokoro no fukami wo hanashimashita.","I spoke about the depth of the mind.",["こころ"]),
 ("mental-health","しょうじょう を しんりょう で はなしました。","shoujou wo shinryou de hanashimashita.","I spoke of symptoms in counseling.",["しょうじょう"]),
 ("habit-change","まず ねる じかん を かえました。","mazu neru jikan wo kaemashita.","First I changed my sleep time.",["まず"]),
 ("vaccination","ワクチン の じょうほう を つたえました。","wakuchin no jouhou wo tsutaemashita.","I conveyed vaccine information.",["ワクチン"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, romaji, gloss, cloze in SENTS:
        e = {"id": f"ja.sent.{sid}", "status": "draft", "text": text, "reading": text,
             "romaji": romaji, "gloss": gloss, "cloze_targets": cloze,
             "sources": SRC, "notes": "ai-assisted draft sentence; qualified review required before verified.",
             "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

ASSESS = {"id": "ja.assess.health-wellness", "goal_id": "ja.goal.b1.health-wellness",
          "kind": "transfer", "modality": "interaction",
          "rubric": {"scale": "observed", "criteria": [
              "discuss wellness routines, nutrition, and exercise plans",
              "talk about stress, mental health, and medical information without blocking errors"]},
          "review_status": "draft"}
with open(os.path.join(R, "assessments", "definitions.jsonl"), "a") as f:
    f.write(json.dumps(ASSESS, ensure_ascii=False) + "\n")

U = [
 ("400-wellness-routines","wellness routines","wellness-routines","ja.goal.b1.health-wellness",
  ["seikatsu2","jousho","biyou","kinen","taikyuu"], "s:wellness-routine"),
 ("401-sleep-habits","sleep habits","sleep-habits","ja.goal.b1.health-wellness",
  ["nebuki","koku2","choushi","karada","nou"], "s:sleep-habit"),
 ("402-balanced-nutrition","balanced nutrition","balanced-nutrition","ja.goal.b1.health-wellness",
  ["tansu","tanpaku","eiyou","karori","shio2"], "s:nutrition"),
 ("403-exercise-planning","exercise planning","exercise-planning","ja.goal.b1.health-wellness",
  ["unsou","junou","kinyu","kessha","taiken3"], "s:exercise-plan"),
 ("404-stress-management","stress management","stress-management","ja.goal.b1.health-wellness",
  ["fuka","kankyou2","kokoro2","shinryo","fuan2"], "s:stress-manage"),
 ("405-mental-health-talk","mental health talk","mental-health-talk","ja.goal.b1.health-wellness",
  ["zyouhou","joutai","shoujou","byouki2","shinryou2"], "s:mental-health"),
 ("406-habit-change","habit change","habit-change","ja.goal.b1.health-wellness",
  ["shuusei","kessan3","kagaku","gakkai","igaku"], "s:habit-change"),
 ("407-quitting-habits","quitting habits","quitting-habits","ja.goal.b1.health-wellness",
  ["yakubou","abura","amami","suupu","chouryou"], "g:ja.grammar.b1.nagara"),
 ("408-medical-information","medical information","medical-information","ja.goal.b1.health-wellness",
  ["seka","seka2","chishiki","chiryou","ryouki"], "g:ja.grammar.b1.mazu"),
 ("409-vaccination-discussion","vaccination discussion","vaccination-discussion","ja.goal.b1.health-wellness",
  ["kenkou2","netsu2","iyashi","tsuuka2","wakuchin"], "s:vaccination"),
]
OLD_SENTS = ["ja.sent.meeting-starts","ja.sent.reply-email","ja.sent.report-address",
             "ja.sent.work-company","ja.sent.interview-prep"]

def unit_yaml(topic, uid, goal, words, newitem):
    lex = [f"ja.lex.health2.{w}" for w in words]
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

print("batch35 written")
