#!/usr/bin/env python3
"""ja-JP batch 74: B2 units 780-789 (humor-wordplay: comedy, satire, manga)."""
import json, os

R = "languages/ja-JP"
SRC = ["jf-standard", "ai-drafted-extension"]
NOTE = ("Framework-level sourcing only (JF Standard reference, no descriptor text copied); "
        "a dictionary/reviewer source must be added before verified status.")
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-05", "notes": "ai-assisted draft wording; qualified review pending."}

W = [
 ("taiming","タイミング","noun","timing"),
 ("ma","ま","noun","pause, beat"),
 ("komi","こみ","noun","buildup"),
 ("age","あげ","noun","punchline delivery"),
 ("saji","さじ","noun","spoon (idiom)"),
 ("furi","ふり","noun","pretense"),
 ("kabe","かべ","noun","wall"),
 ("ai","あい","noun","love"),
 ("sachi","さち","noun","happiness"),
 ("kin","きん","noun","gold"),
 ("gin","ぎん","noun","silver"),
 ("tsubo","つぼ","noun","jar"),
 ("yane","やね","noun","roof"),
 ("hashi","はし","noun","chopstick, bridge, edge"),
 ("sora","そら","noun","sky"),
 ("tori","とり","noun","bird"),
 ("inaka","いなか","noun","countryside"),
 ("mura","むら","noun","village"),
 ("akito","あきと","noun","autumn fields"),
 ("haru","はる","noun","spring"),
 ("natsu","なつ","noun","summer"),
 ("fuyu","ふゆ","noun","winter"),
 ("ame","あめ","noun","rain, candy"),
 ("hoshi","ほし","noun","star"),
 ("tsuki","つき","noun","moon, month"),
 ("hi","ひ","noun","sun, day, fire"),
 ("kaze","かぜ","noun","wind, cold"),
 ("yuki","ゆき","noun","snow"),
 ("hana","はな","noun","flower, nose"),
 ("ne","ね","noun","root, sleep"),
 ("kusa","くさ","noun","grass"),
 ("ki","き","noun","tree, spirit"),
 ("umi","うみ","noun","sea"),
 ("yama","やま","noun","mountain"),
 ("kawa","かわ","noun","river, skin"),
 ("ishi","いし","noun","stone"),
 ("suna","すな","noun","sand"),
 ("mori","もり","noun","forest, heap"),
 ("hara","はら","noun","field, belly"),
 ("oka","おか","noun","hill"),
 ("tani","たに","noun","valley"),
 ("iro2","いろ","noun","color"),
 ("oto","おと","noun","sound"),
 ("koe","こえ","noun","voice"),
 ("uchi","うち","noun","inside, home"),
 ("soto","そと","noun","outside"),
 ("mae","まえ","noun","front"),
 ("ushiro","うしろ","noun","back"),
 ("naka","なか","noun","inside"),
 ("soba","そば","noun","nearby, soba"),
]
assert len(W) == 50

def entry(rid, kana, pos, gloss):
    return {"id": f"ja.lex.play2.{rid}", "status": "draft",
            "forms": [{"text": kana, "script": "hiragana", "is_primary": True}],
            "readings": [{"text": kana, "script": "hiragana"},
                         {"text": rid, "transliteration_system": "modified-hepburn"}],
            "glosses": {"en-US": [gloss]}, "part_of_speech": pos,
            "registers": ["ja.register.neutral-common"], "semantic_tags": ["humor"],
            "sources": SRC, "notes": NOTE, "generation": GEN}

with open(os.path.join(R, "lexicon", "play2.jsonl"), "w") as f:
    for rid, kana, pos, gloss in W:
        f.write(json.dumps(entry(rid, kana, pos, gloss), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ja.grammar.b2-ni-totte-iru", "name": "〜にとっている (taking for)", "category": "syntax",
  "definition": "にとっている takes something as a basis for a joke: はし を みて とっている. Draft definition pending review."},
 {"id": "ja.grammar.b2-wake-deshou", "name": "〜わけでしょう (it stands to reason)", "category": "syntax",
  "definition": "わけでしょう infers a shared reason: じょうず な はなし だ わけ でしょう. Draft definition pending review."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("comedy-timing","まんざい の ま が じょうず です。","manzai no ma ga jouzu desu.","The manzai pause is skillful.",["まんざい"]),
 ("satire-reading","いなか の はなし を よみました。","inaka no hanashi wo yomimashita.","I read the countryside story.",["いなか"]),
 ("irony-detection","ほんとう の いみ は ちがう と きづきました。","hontou no imi wa chigau to kizukimashita.","I noticed the real meaning differs.",["いみ"]),
 ("wordplay-creation","はし と はし を かけた だじゃれ を しました。","hashi to hashi wo kaketa dajare wo shimashita.","I made a pun playing on hashi.",["はし"]),
 ("joke-ethics","その ことば で みんな の わらい が さめました。","sono kotoba de minna no warai ga samemashita.","The laughter cooled with those words.",["わらい"]),
 ("manga-humor","まんが の なか の ことば を べんきょう しました。","manga no naka no kotoba wo benkyou shimashita.","I studied the words inside the manga.",["まんが"]),
 ("comic-reading","よんこま を さんまい よみました。","yonkoma wo sanmai yomimashita.","I read three four-panel comics.",["よんこま"]),
 ("humor-translation","だじゃれ を えいご に する のは むずかしいです。","dajare wo eigo ni suru no wa muzukashii desu.","Turning puns into English is hard.",["だじゃれ"]),
 ("witty-replies","その こたえ の おもむき が すぐれて いました。","sono kotae no omomuki ga sugurete imashita.","The nuance of that reply was excellent.",["おもむき"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, romaji, gloss, cloze in SENTS:
        e = {"id": f"ja.sent.{sid}", "status": "draft", "text": text, "reading": text,
             "romaji": romaji, "gloss": gloss, "cloze_targets": cloze,
             "sources": SRC, "notes": "ai-assisted draft sentence; qualified review required before verified.",
             "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

OLD_SENTS = ["ja.sent.meeting-starts","ja.sent.reply-email","ja.sent.report-address",
             "ja.sent.work-company","ja.sent.interview-prep"]

PLAYG = "ja.goal.b2.humor-wordplay"
U = [
 ("780-comedy-timing","comedy timing","780-comedy-timing",PLAYG,"play2",
  ["taiming","ma","komi","age","furi"], "s:comedy-timing"),
 ("781-satire-reading","satire reading","781-satire-reading",PLAYG,"play2",
  ["inaka","mura","akito","haru","natsu"], "s:satire-reading"),
 ("782-irony-detection","irony detection","782-irony-detection",PLAYG,"play2",
  ["fuyu","ame","hoshi","tsuki","hi"], "s:irony-detection"),
 ("783-wordplay-creation","wordplay creation","783-wordplay-creation",PLAYG,"play2",
  ["kaze","yuki","hana","ne","kusa"], "s:wordplay-creation"),
 ("784-joke-ethics","joke ethics","784-joke-ethics",PLAYG,"play2",
  ["ki","umi","yama","kawa","ishi"], "s:joke-ethics"),
 ("785-manga-humor","manga humor","785-manga-humor",PLAYG,"play2",
  ["suna","mori","hara","oka","tani"], "s:manga-humor"),
 ("786-comic-reading","comic reading","786-comic-reading",PLAYG,"play2",
  ["iro2","oto","koe","uchi","soto"], "s:comic-reading"),
 ("787-humor-translation","humor translation","787-humor-translation",PLAYG,"play2",
  ["mae","ushiro","naka","soba","ai"], "s:humor-translation"),
 ("788-witty-replies","witty replies","788-witty-replies",PLAYG,"play2",
  ["sachi","kin","gin","tsubo","yane"], "s:witty-replies"),
 ("789-parody-writing","parody writing","789-parody-writing",PLAYG,"play2",
  ["sora","tori","hashi","tsuki","hana"], "g:ja.grammar.b2-wake-deshou"),
]

def unit_yaml(topic, uid, goal, shard, words, newitem):
    lex = [f"ja.lex.{shard}.{w}" for w in words]
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

for fname, topic, uid, goal, shard, words, newitem in U:
    with open(os.path.join(R, "curriculum", "units", fname + ".yaml"), "w") as f:
        f.write(unit_yaml(topic, uid, goal, shard, words, newitem))

print("batch74 written")
