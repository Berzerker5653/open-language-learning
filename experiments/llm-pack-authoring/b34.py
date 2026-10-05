#!/usr/bin/env python3
"""ja-JP batch 34: B1 units 390-399 (storytelling complete)."""
import json, os

R = "languages/ja-JP"
SRC = ["jf-standard", "ai-drafted-extension"]
NOTE = ("Framework-level sourcing only (JF Standard reference, no descriptor text copied); "
        "a dictionary/reviewer source must be added before verified status.")
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-04", "notes": "ai-assisted draft wording; qualified review pending."}

WORDS = [
 ("kyomu","きょうみ","noun","interest"),
 ("hara-hara","はらはら","noun","suspense"),
 ("kikkai","きっかい","noun","opportunity"),
 ("tenkan2","てんかん","noun","turn"),
 ("fukkyaku","ふっきゃく","noun","revival"),
 ("dokugeki","どくげき","noun","monologue"),
 ("mimi","みみ","noun","ear"),
 ("oto","おと","noun","sound"),
 ("uta","うた","noun","song"),
 ("kuchi2","くち","noun","mouth"),
 ("shisen","しせん","noun","perspective"),
 ("kao2","かお","noun","face"),
 ("me2","め","noun","eye"),
 ("te2","て","noun","hand"),
 ("ashi2","あし","noun","foot"),
 ("hairon","はいろん","noun","plagiarism"),
 ("shuwei","しゅうい","noun","habit"),
 ("kaiso","かいそ","noun","recollection"),
 ("atama2","あたま","noun","head"),
 ("mura2","むら","noun","village"),
 ("sato","さと","noun","hometown"),
 ("otogi","おとぎ","noun","old tale"),
 ("shinwa","しんわ","noun","myth"),
 ("yokai","ようかい","noun","spirit"),
 ("bakemono","ばけもの","noun","monster"),
 ("kitsune","きつね","noun","fox"),
 ("tanuki","たぬき","noun","raccoon dog"),
 ("tsuru","つる","noun","crane"),
 ("kari","かり","noun","hunt"),
 ("uma","うま","noun","horse"),
 ("inu","いぬ","noun","dog"),
 ("neko","ねこ","noun","cat"),
 ("tori","とり","noun","bird"),
 ("sakana2","さかな","noun","fish"),
 ("mazui","まずい","i-adjective","bad-tasting"),
 ("shiroi","しろい","i-adjective","white"),
 ("kuroi","くろい","i-adjective","black"),
 ("akai","あかい","i-adjective","red"),
 ("aoi","あおい","i-adjective","blue"),
 ("kiiroi","きいろい","i-adjective","yellow"),
 ("murasaki","むらさき","noun","purple"),
 ("kin","きん","noun","gold"),
 ("gin","ぎん","noun","silver"),
 ("ookii2","おおきい","i-adjective","big"),
 ("chiisai2","ちいさい","i-adjective","small"),
 ("takai2","たかい","i-adjective","expensive"),
 ("mijikai2","みじかい","i-adjective","short"),
 ("oishii2","おいしい","i-adjective","delicious"),
 ("ongaku2","おんがく","noun","music"),
 ("odori2","おどり","noun","dance"),
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

with open(os.path.join(R, "lexicon", "story2.jsonl"), "w") as f:
    for rid, kana, pos, gloss in WORDS:
        f.write(json.dumps(entry("story2", rid, kana, pos, gloss, "narrative"), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ja.grammar.b1.dakara", "name": "だから (casual because)", "category": "syntax",
  "definition": "だから gives a casual reason: おもしろかった から、みんな わらった. Draft definition pending review."},
 {"id": "ja.grammar.b1.sou-da", "name": "〜そうだ (hearsay)", "category": "semantics",
  "definition": "そうだ reports hearsay: むかし、つる が おんがく を おどった そうだ. Draft definition pending review."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("suspense-build","きょうみ の ある じょうめん で はらはら しました。","kyomu no aru joumen de harahara shimashita.","I was suspenseful in an interesting scene.",["きょうみ"]),
 ("write-dialogue","だんわ の ことば を みみ で ききました。","danwa no kotoba wo mimi de kikimashita.","I heard the dialogue words with my ears.",["みみ"]),
 ("perspective-shift","かお の え を かきました。","kao no e wo kakimashita.","I drew a picture of a face.",["かお"]),
 ("write-ending","けいまつ を かいそう で きめました。","keimatsu wo kaisou de kimemashita.","I decided the ending in a brainstorm.",["けいまつ"]),
 ("story-revision","おとぎ ばなし を なおしました。","otogi banashi wo naoshimashita.","I revised the old tale.",["おとぎ"]),
 ("anecdote","きつね の こと を はなしました。","kitsune no koto wo hanashimashita.","I told about the fox.",["きつね"]),
 ("polite-humor","ねこ が おどり を おどりました。","neko ga odori wo odotrimashita.","The cat performed a dance.",["ねこ"]),
 ("personal-essay","おんがく の ことが で だいすき です。","ongaku no koto ga de daisuki desu.","I love music.",["おんがく"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, romaji, gloss, cloze in SENTS:
        e = {"id": f"ja.sent.{sid}", "status": "draft", "text": text, "reading": text,
             "romaji": romaji, "gloss": gloss, "cloze_targets": cloze,
             "sources": SRC, "notes": "ai-assisted draft sentence; qualified review required before verified.",
             "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

U = [
 ("390-building-suspense","building suspense","building-suspense","ja.goal.b1.storytelling",
  ["kyomu","hara-hara","kikkai","tenkan2","fukkyaku"], "s:suspense-build"),
 ("391-writing-dialogue","writing dialogue","writing-dialogue","ja.goal.b1.storytelling",
  ["dokugeki","mimi","oto","uta","kuchi2"], "s:write-dialogue"),
 ("392-perspective-shifts","perspective shifts","perspective-shifts","ja.goal.b1.storytelling",
  ["shisen","kao2","me2","te2","ashi2"], "s:perspective-shift"),
 ("393-writing-endings","writing endings","writing-endings","ja.goal.b1.storytelling",
  ["hairon","shuwei","kaiso","atama2","mura2"], "s:write-ending"),
 ("394-story-revision","story revision","story-revision","ja.goal.b1.storytelling",
  ["sato","otogi","shinwa","yokai","bakemono"], "s:story-revision"),
 ("395-anecdote-telling","anecdote telling","anecdote-telling","ja.goal.b1.storytelling",
  ["kitsune","tanuki","tsuru","kari","uma"], "s:anecdote"),
 ("396-polite-humor","polite humor","polite-humor","ja.goal.b1.storytelling",
  ["inu","neko","tori","sakana2","mazui"], "g:ja.grammar.b1.dakara"),
 ("397-folktale-reading","folktale reading","folktale-reading","ja.goal.b1.storytelling",
  ["shiroi","kuroi","akai","aoi","kiiroi"], "s:polite-humor"),
 ("398-story-retelling","story retelling","story-retelling","ja.goal.b1.storytelling",
  ["murasaki","kin","gin","ookii2","chiisai2"], "g:ja.grammar.b1.sou-da"),
 ("399-personal-essay","personal essay","personal-essay","ja.goal.b1.storytelling",
  ["takai2","mijikai2","oishii2","ongaku2","odori2"], "s:personal-essay"),
]
OLD_SENTS = ["ja.sent.meeting-starts","ja.sent.reply-email","ja.sent.report-address",
             "ja.sent.work-company","ja.sent.interview-prep"]

def unit_yaml(topic, uid, goal, words, newitem):
    lex = [f"ja.lex.story2.{w}" for w in words]
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

print("batch34 written")
