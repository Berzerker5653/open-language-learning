#!/usr/bin/env python3
"""ja-JP batch 30: B1 units 350-359 (emotions-personality complete, advice-opinion start)."""
import json, os

R = "languages/ja-JP"
SRC = ["jf-standard", "ai-drafted-extension"]
NOTE = ("Framework-level sourcing only (JF Standard reference, no descriptor text copied); "
        "a dictionary/reviewer source must be added before verified status.")
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-04", "notes": "ai-assisted draft wording; qualified review pending."}

WORDS = [
 ("taipu","タイプ","noun","type"),
 ("kibune","きぶね","noun","temperament"),
 ("fuan","ふあん","noun","anxiety"),
 ("anshin","あんしん","noun","relief"),
 ("waku","わく","noun","excitement"),
 ("odoroki","おどろき","noun","surprise"),
 ("uragiri","うらぎり","noun","betrayal"),
 ("shippai","しっぱい","noun","failure"),
 ("seika","せいか","noun","success"),
 ("nukumori","ぬくもり","noun","warmth"),
 ("setsunai","せつない","i-adjective","bittersweet"),
 ("koto","こと","noun","matter"),
 ("honto","ほんとう","noun","truth"),
 ("tashika","たしか","na-adjective","certain"),
 ("hakkiri","はっきり","adverb","clearly"),
 ("yukkuri","ゆっくり","adverb","slowly"),
 ("jikkuri","じっくり","adverb","closely"),
 ("kirakira","きらきら","noun","sparkle"),
 ("tsuzuki","つづき","noun","continuation"),
 ("shoutai","しょうたい","noun","invitation"),
 ("namida","なみだ","noun","tears"),
 ("kagayaki","かがやき","noun","glitter"),
 ("risou","りそう","noun","ideal"),
 ("mokuteki","もくてき","noun","purpose"),
 ("karami","からみ","noun","entanglement"),
 ("sagen","さげん","noun","advice"),
 ("sansei","さんせい","noun","approval"),
 ("hanbun","はんぶん","noun","half"),
 ("ichibun","いちぶん","noun","share"),
 ("taido","たいど","noun","attitude"),
 ("kouryu","こうりゅう","noun","exchange"),
 ("ronri","ろんり","noun","logic"),
 ("risei","りせい","noun","reason"),
 ("junjo","じゅんじょ","noun","order"),
 ("ato","あと","noun","after"),
 ("fumei","ふめい","noun","obscurity"),
 ("fukami","ふかみ","noun","depth"),
 ("mei","めい","noun","name"),
 ("touron","とうろん","noun","debate"),
 ("koutai","こうたい","noun","alternative"),
 ("houhou","ほうほう","noun","method"),
 ("betsu","べつ","noun","separate"),
 ("dareka","だれか","noun","someone"),
 ("hatsu","はつ","noun","utterance"),
 ("shouko","しょうこう","noun","reference"),
 ("koudou","こうどう","noun","action"),
 ("koudan","こうたん","noun","assertion"),
 ("soutou","そうとう","adverb","quite"),
 ("ketai","けたい","na-adjective","undignified"),
 ("iikata","いいかた","noun","way of saying"),
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

with open(os.path.join(R, "lexicon", "emotion2.jsonl"), "w") as f:
    for rid, kana, pos, gloss in WORDS[:25]:
        f.write(json.dumps(entry("emotion2", rid, kana, pos, gloss, "emotion"), ensure_ascii=False) + "\n")
with open(os.path.join(R, "lexicon", "advice.jsonl"), "w") as f:
    for rid, kana, pos, gloss in WORDS[25:]:
        f.write(json.dumps(entry("advice", rid, kana, pos, gloss, "opinion"), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ja.grammar.b1.hou-ga-yoi", "name": "〜方がいい (advisability)", "category": "syntax",
  "definition": "方がいい gives advice: やすんだ ほうが いい です. Draft definition pending review."},
 {"id": "ja.grammar.b1.to-omoimasu", "name": "〜と思います (opinion)", "category": "semantics",
  "definition": "と思います softens an opinion: そう おもう. Draft definition pending review."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("temperament-compare","ふたりの タイプ は ちがって います。","futari no taipu wa chigatte imasu.","The two people's types differ.",["タイプ"]),
 ("emotional-story","じこ の しょうかい で しっぱい を かきました。","jiko no shoukai de shippai wo kakimashita.","I wrote about a failure in my introduction.",["しっぱい"]),
 ("reconciliation","ゆっくり あやまって、つづき を まちました。","yukkuri ayamaratte, tsuzuki wo machimashita.","I apologized slowly and waited for the continuation.",["ゆっくり"]),
 ("self-reflect","みらい の りそう を かんがえました。","mirai no risou wo kangaemashita.","I thought about my future ideal.",["りそう"]),
 ("give-advice","ともだち に さげん を はなしました。","tomodachi ni sagen wo hanashimashita.","I spoke advice to my friend.",["さげん"]),
 ("soft-advice","やわらか こうりゅう が できました。","yawarakai kouryu ga dekimashita.","We had a gentle exchange.",["こうりゅう"]),
 ("partial-agree","はんぶん そうい しました。","hanbun soui shimashita.","I agreed halfway.",["はんぶん"]),
 ("polite-disagree","こうたん する とき ことば を えらびます。","koutai suru toki kotoba wo erabimasu.","When asserting, I choose words.",["こうたん"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, romaji, gloss, cloze in SENTS:
        e = {"id": f"ja.sent.{sid}", "status": "draft", "text": text, "reading": text,
             "romaji": romaji, "gloss": gloss, "cloze_targets": cloze,
             "sources": SRC, "notes": "ai-assisted draft sentence; qualified review required before verified.",
             "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

ASSESS = {"id": "ja.assess.advice-opinion", "goal_id": "ja.goal.b1.advice-opinion",
          "kind": "transfer", "modality": "interaction",
          "rubric": {"scale": "observed", "criteria": [
              "give advice softly and structure an opinion with reasons",
              "express partial agreement and polite disagreement without blocking errors"]},
          "review_status": "draft"}
with open(os.path.join(R, "assessments", "definitions.jsonl"), "a") as f:
    f.write(json.dumps(ASSESS, ensure_ascii=False) + "\n")

U = [
 ("350-temperament-comparison","temperament comparison","temperament-comparison","ja.goal.b1.emotions-personality",
  ["taipu","kibune","fuan","anshin","waku"], "s:temperament-compare"),
 ("351-emotional-story","emotional story","emotional-story","ja.goal.b1.emotions-personality",
  ["odoroki","uragiri","shippai","seika","nukumori"], "s:emotional-story"),
 ("352-emotional-advice","emotional advice","emotional-advice","ja.goal.b1.emotions-personality",
  ["setsunai","koto","honto","tashika","hakkiri"], "g:ja.grammar.b1.hou-ga-yoi"),
 ("353-reconciliation","reconciliation","reconciliation","ja.goal.b1.emotions-personality",
  ["yukkuri","jikkuri","kirakira","tsuzuki","shoutai"], "s:reconciliation"),
 ("354-self-reflection","self reflection","self-reflection","ja.goal.b1.emotions-personality",
  ["namida","kagayaki","risou","mokuteki","karami"], "s:self-reflect"),
 ("355-giving-advice","giving advice","giving-advice","ja.goal.b1.advice-opinion",
  ["sagen","sansei","hanbun","ichibun","taido"], "s:give-advice"),
 ("356-soft-advice","soft advice","soft-advice","ja.goal.b1.advice-opinion",
  ["kouryu","ronri","risei","junjo","ato"], "s:soft-advice"),
 ("357-opinion-structure","opinion structure","opinion-structure","ja.goal.b1.advice-opinion",
  ["fumei","fukami","mei","touron","koutai"], "g:ja.grammar.b1.to-omoimasu"),
 ("358-partial-agreement","partial agreement","partial-agreement","ja.goal.b1.advice-opinion",
  ["houhou","betsu","dareka","hatsu","shouko"], "s:partial-agree"),
 ("359-polite-disagreement","polite disagreement","polite-disagreement","ja.goal.b1.advice-opinion",
  ["koudou","koudan","soutou","ketai","iikata"], "s:polite-disagree"),
]
OLD_SENTS = ["ja.sent.meeting-starts","ja.sent.reply-email","ja.sent.report-address",
             "ja.sent.work-company","ja.sent.interview-prep"]

def unit_yaml(topic, uid, goal, words, newitem):
    shard = "emotion2" if "emotions" in goal else "advice"
    lex = [f"ja.lex.{shard}.{w}" for w in words]
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

print("batch30 written")
