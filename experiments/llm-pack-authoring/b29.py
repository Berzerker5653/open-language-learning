#!/usr/bin/env python3
"""ja-JP batch 29: B1 units 340-349 (emotions-personality part 1)."""
import json, os

R = "languages/ja-JP"
SRC = ["jf-standard", "ai-drafted-extension"]
NOTE = ("Framework-level sourcing only (JF Standard reference, no descriptor text copied); "
        "a dictionary/reviewer source must be added before verified status.")
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-04", "notes": "ai-assisted draft wording; qualified review pending."}

WORDS = [
 ("seikaku","せいかく","noun","personality"),
 ("majime","まじめ","na-adjective","diligent"),
 ("sunao","すなお","na-adjective","docile"),
 ("ousetsu","おうせつ","na-adjective","gregarious"),
 ("kenmei","けんめい","na-adjective","conscientious"),
 ("kanjou","かんじょう","noun","emotion"),
 ("ki-bun","きぶん","noun","mood"),
 ("ki-mochi","きもち","noun","feeling"),
 ("ki-kokochi","きごこち","noun","sensation"),
 ("yorokobi","よろこび","noun","joy"),
 ("wakuwaku","わくわく","noun","excitement"),
 ("iraira","いらいら","noun","irritation"),
 ("dokidoki","どきどき","noun","palpitation"),
 ("ki-gamae","きまえ","noun","mental readiness"),
 ("ki-ryoku","きりょく","noun","willpower"),
 ("ki-oku","きおく","noun","consideration"),
 ("ki-magu","きまぐれ","noun","moodiness"),
 ("chikara-zuku","ちからづよい","i-adjective","encouraging"),
 ("yasashisa","やさしさ","noun","kindness"),
 ("kizukai","きづかい","noun","thoughtfulness"),
 ("okoru","おこる","verb","to get angry"),
 ("akire","あきれ","noun","exasperation"),
 ("zannin","ざんねん","na-adjective","disappointing"),
 ("akeppashi","あけっぴろげ","na-adjective","candid"),
 ("genkotsu","げんこつ","noun","scolding"),
 ("shougi","しょうぎ","noun","apology"),
 ("houbi","ほうび","noun","reward"),
 ("mottai","もったい","noun","cherishing"),
 ("yamashii","やましい","i-adjective","ashamed"),
 ("joutou","じょうとう","noun","running account"),
 ("aijou","あいじょう","noun","affection"),
 ("yui","ゆい","noun","bond"),
 ("wa2","わ","noun","harmony"),
 ("chikara","ちから","noun","strength"),
 ("shouki","しょうき","noun","encouragement"),
 ("shoujin","しょうじん","noun","exhortation"),
 ("omoikiri","おもいきり","noun","decisiveness"),
 ("jouzu","じょうず","na-adjective","skilled"),
 ("kawaii","かわいい","i-adjective","cute"),
 ("akui","あくい","noun","ulterior motive"),
 ("fukuzatsu","ふくざつ","na-adjective","complex"),
 ("tenko","てんこう","noun","turning point"),
 ("takusan","たくさん","noun","many"),
 ("nakanaka","なかなか","adverb","quite"),
 ("sara-ni","さらに","adverb","further"),
 ("subete","すべて","noun","everything"),
 ("sukunaku","すくなく","adverb","at least"),
 ("ooku","おおく","noun","much"),
 ("kokuhaku","こくはく","noun","confession"),
 ("gaman","がまん","noun","patience"),
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

with open(os.path.join(R, "lexicon", "emotion.jsonl"), "w") as f:
    for rid, kana, pos, gloss in WORDS:
        f.write(json.dumps(entry("emotion", rid, kana, pos, gloss, "emotion"), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ja.grammar.b1.ni-kuru", "name": "〜に来る (sudden feeling)", "category": "syntax",
  "definition": "に来る describes a feeling that comes over one: なつかしさが きて、なみだが でました. Draft definition pending review."},
 {"id": "ja.grammar.b1.wake-da", "name": "〜わけだ (that explains it)", "category": "semantics",
  "definition": "わけだ marks a concluded reason: ねむい わけだ、やすみが なかった のだ. Draft definition pending review."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("personality-desc","かれ の せいかく は まじめ で すなお です。","kare no seikaku wa majime de sunao desu.","His personality is diligent and docile.",["せいかく"]),
 ("emotion-vocab","かんじょう を ことば で つたえます。","kanjou wo kotoba de tsutaemasu.","I convey emotions in words.",["かんじょう"]),
 ("mood-chat","こんや は わくわく して、いらいら も しました。","kon'ya wa wakuwaku shite, iraira mo shimashita.","Tonight I was excited and also irritated.",["わくわく"]),
 ("empathy","きおく を こころがけて ことば を えらびました。","kioku wo kokorogakete kotoba wo erabimashita.","I chose words with consideration.",["きおく"]),
 ("apology","じこ の しょうぎ を まじめ に かきました。","jiko no shougi wo majime ni kakimashita.","I wrote the apology for the accident earnestly.",["しょうぎ"]),
 ("gratitude","あいじょう と ゆい を かんじました。","aijou to yui wo kanjimashita.","I felt affection and bond.",["あいじょう"]),
 ("encouragement","しょうじん の ことば で ちから が でました。","shoujin no kotoba de chikara ga demashita.","The words of exhortation gave me strength.",["しょうじん"]),
 ("coping","がまん する ために すこしずつ べんきょう します。","gaman suru tame ni sukoshizutsu benkyou shimasu.","I study little by little to build patience.",["がまん"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, romaji, gloss, cloze in SENTS:
        e = {"id": f"ja.sent.{sid}", "status": "draft", "text": text, "reading": text,
             "romaji": romaji, "gloss": gloss, "cloze_targets": cloze,
             "sources": SRC, "notes": "ai-assisted draft sentence; qualified review required before verified.",
             "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

ASSESS = {"id": "ja.assess.emotions-personality", "goal_id": "ja.goal.b1.emotions-personality",
          "kind": "transfer", "modality": "interaction",
          "rubric": {"scale": "observed", "criteria": [
              "describe personality and emotions, and express empathy or apology appropriately",
              "discuss stress and coping habits without blocking errors"]},
          "review_status": "draft"}
with open(os.path.join(R, "assessments", "definitions.jsonl"), "a") as f:
    f.write(json.dumps(ASSESS, ensure_ascii=False) + "\n")

U = [
 ("340-personality-description","personality description","personality-description","ja.goal.b1.emotions-personality",
  ["seikaku","majime","sunao","ousetsu","kenmei"], "s:personality-desc"),
 ("341-emotion-vocabulary","emotion vocabulary","emotion-vocabulary","ja.goal.b1.emotions-personality",
  ["kanjou","ki-bun","ki-mochi","ki-kokochi","yorokobi"], "s:emotion-vocab"),
 ("342-mood-conversation","mood conversation","mood-conversation","ja.goal.b1.emotions-personality",
  ["wakuwaku","iraira","dokidoki","ki-gamae","ki-ryoku"], "s:mood-chat"),
 ("343-expressing-empathy","expressing empathy","expressing-empathy","ja.goal.b1.emotions-personality",
  ["ki-oku","ki-magu","chikara-zuku","yasashisa","kizukai"], "s:empathy"),
 ("344-conflict-feelings","conflict feelings","conflict-feelings","ja.goal.b1.emotions-personality",
  ["okoru","akire","zannin","akeppashi","genkotsu"], "g:ja.grammar.b1.ni-kuru"),
 ("345-sincere-apology","sincere apology","sincere-apology","ja.goal.b1.emotions-personality",
  ["shougi","houbi","mottai","yamashii","joutou"], "s:apology"),
 ("346-deepened-gratitude","deepened gratitude","deepened-gratitude","ja.goal.b1.emotions-personality",
  ["aijou","yui","wa2","chikara","shouki"], "s:gratitude"),
 ("347-encouragement-words","encouragement words","encouragement-words","ja.goal.b1.emotions-personality",
  ["shoujin","omoikiri","jouzu","kawaii","akui"], "s:encouragement"),
 ("348-stress-discussion","stress discussion","stress-discussion","ja.goal.b1.emotions-personality",
  ["fukuzatsu","tenko","takusan","nakanaka","sara-ni"], "g:ja.grammar.b1.wake-da"),
 ("349-coping-habits","coping habits","coping-habits","ja.goal.b1.emotions-personality",
  ["subete","sukunaku","ooku","kokuhaku","gaman"], "s:coping"),
]
OLD_SENTS = ["ja.sent.meeting-starts","ja.sent.reply-email","ja.sent.report-address",
             "ja.sent.work-company","ja.sent.interview-prep"]

def unit_yaml(topic, uid, goal, words, newitem):
    lex = [f"ja.lex.emotion.{w}" for w in words]
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

print("batch29 written")
