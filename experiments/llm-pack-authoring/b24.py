#!/usr/bin/env python3
"""Batch 24: ja-JP B1 units 290-299 (culture-tradition part 2 + society-rules part 1)."""
import json, os

R = "/home/hunter/game-dev/LTS/languages/ja-JP"
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-04", "notes": "ai-assisted draft wording; qualified review pending."}
SRC = ["jf-standard", "ai-drafted-extension"]
NOTE = ("Framework-level sourcing only (JF Standard reference, no descriptor text copied); "
        "a dictionary/reviewer source must be added before verified status.")

WORDS = [
 ("tsukiai","つきあい","noun","socializing"),
 ("homonsha","ほうもんしゃ","noun","visitor"),
 ("zashiki","ざしき","noun","seat; room"),
 ("omiyage","おみやげ","noun","souvenir gift"),
 ("douhankai","どうかんかい","noun","drinking party"),
 ("okurimono","おくりもの","noun","gift"),
 ("kansen","かんせん","noun","greeting card"),
 ("tsutsumi","つつみ","noun","wrapping"),
 ("noshi","のし","noun","gift label"),
 ("fukuro","ふくろ","noun","bag"),
 ("kinshi","きんし","noun","prohibition"),
 ("taboo","タブー","noun","taboo"),
 ("haji","はじ","noun","shame"),
 ("shitsurei","しつれい","noun","rudeness"),
 ("hazukashii","はずかしい","i-adjective","embarrassing"),
 ("shugo","しゅごう","noun","congratulation"),
 ("engi","えんぎ","noun","engagement"),
 ("sosai","そうさい","noun","funeral"),
 ("hanayome","はなよめ","noun","bride"),
 ("hanamuko","はなむこ","noun","groom"),
 ("bunkaron","ぶんかろん","noun","cultural theory"),
 ("hassou","はっそう","noun","interpretation"),
 ("kousatsu","こうさつ","noun","observation"),
 ("tsuyaku","つうやく","noun","interpretation (language)"),
 ("kijutsu","きじゅつ","noun","description"),
 ("horitsu","ほうりつ","noun","law"),
 ("horei","ほうれい","noun","ordinance"),
 ("kotsukisoku","こうつうきそく","noun","traffic rules"),
 ("kinben","きんべん","noun","abstinence"),
 ("mafusa","めいわく","noun","nuisance"),
 ("kenri","けんり","noun","right"),
 ("gimu","ぎむ","noun","duty"),
 ("yimu","いむ","noun","obligation"),
 ("youmu","ようむ","noun","duty; task"),
 ("koeki","こうえき","noun","public interest"),
 ("katsuyaku","かつやく","noun","activity"),
 ("shokumu","しょくむ","noun","duties"),
 ("keisatsu","けいさつ","noun","police"),
 ("chounakai","ちょうないかい","noun","local association"),
 ("kokyo","こうきょう","noun","public"),
 ("doutoku","どうとく","noun","morals"),
 ("jichikai","じちかい","noun","neighborhood association"),
 ("soji","そうじ","noun","cleaning"),
 ("riso","りぞ","noun","neighbor"),
 ("kyosei","きょうせい","noun","coexistence"),
 ("yuwa","ゆわ","noun","harmony"),
 ("boryuntia","ぼりゅんてぃあ","noun","volunteer"),
 ("fukushi","ふくし","noun","welfare"),
 ("kankyou","かんきょう","noun","environment"),
 ("hatsuyaku","はつやく","noun","role"),
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

with open(os.path.join(R, "lexicon", "culture2.jsonl"), "w") as f:
    for rid, kana, pos, gloss in WORDS[:25]:
        f.write(json.dumps(entry("culture2", rid, kana, pos, gloss, "culture"), ensure_ascii=False) + "\n")
with open(os.path.join(R, "lexicon", "society.jsonl"), "w") as f:
    for rid, kana, pos, gloss in WORDS[25:]:
        f.write(json.dumps(entry("society", rid, kana, pos, gloss, "society"), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ja.grammar.b1.ukemi-indirect", "name": "indirect passive (adversarial)", "category": "morphology",
  "definition": "The adversarial passive marks harm: となり の ひと に ばん を すわられました (someone took the seat on my side). The subject is the affected person. Draft definition pending review."},
 {"id": "ja.grammar.b1.dake-bakari-shika", "name": "だけ/ばかり/しか (limits)", "category": "semantics",
  "definition": "だけ marks a limit: 1まい だけ; ばかり marks excess: だんばり して いないで ください; しか+negative marks exclusivity: 1まい しか ありません. Draft definition pending review."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("guest-host","ほうもんしゃ に ざしき を ゆずりました。","homonsha ni zashiki wo yuzurimashita.","I gave up my seat to the visitor.",["ほうもんしゃ"]),
 ("gift-wrapping","のし と つつみ で おくりもの を かざりました。","noshi to tsutsumi de okurimono wo kazurimashita.","I decorated the gift with noshi and wrapping.",["おくりもの"]),
 ("taboo-rule","その ばしょ では しゃしん を とる のが タブー です。","sono basho de wa shashin wo toru no ga taboo desu.","Taking photos is taboo in that place.",["タブー"]),
 ("ceremony-congrats","しゅごう の かい で はなよめ に いろが ふえました。","shugo no kai de hanayome ni iro ga fuemashita.","At the celebration the bride grew more colorful.",["しゅごう"]),
 ("essay-observation","こうさつ と きじゅつ で ぶんか を あらわします。","kousatsu to kijutsu de bunka wo arawashimasu.","We express culture through observation and description.",["こうさつ"]),
 ("law-everyday","ほうりつ と ほうれい で しゃかい が まもられます。","horitsu to horei de shakai ga mamoraremasu.","Society is protected by laws and ordinances.",["ほうりつ"]),
 ("rights-duties","けんり と ぎむ は いっしょ に あります。","kenri to gimu wa issho ni arimasu.","Rights and duties exist together.",["けんり"]),
 ("neighbor-clean","ちょうないかい の そうじ に さんか しました。","chounakai no soji ni sanka shimashita.","I joined the local association's cleaning.",["ちょうないかい"]),
 ("volunteer-role","ぼりゅんてぃあ で かつやく を はたしました。","boryuntia de katsuyaku wo hatashimashita.","I fulfilled my role as a volunteer.",["ぼりゅんてぃあ"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, romaji, gloss, cloze in SENTS:
        e = {"id": f"ja.sent.{sid}", "status": "draft", "text": text, "reading": text,
             "romaji": romaji, "gloss": gloss, "cloze_targets": cloze,
             "sources": SRC, "notes": "ai-assisted draft sentence; qualified review required before verified.",
             "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

ASSESS = {"id": "ja.assess.society-rules", "goal_id": "ja.goal.b1.society-rules",
          "kind": "transfer", "modality": "interaction",
          "rubric": {"scale": "observed", "criteria": [
              "describe a law, rule, or right and its duty using society vocabulary",
              "discuss volunteering or public manners without blocking errors"]},
          "review_status": "draft"}
with open(os.path.join(R, "assessments", "definitions.jsonl"), "a") as f:
    f.write(json.dumps(ASSESS, ensure_ascii=False) + "\n")

U = [
 ("290-host-and-guest","host and guest","host-and-guest","ja.goal.b1.culture-tradition",
  ["tsukiai","homonsha","zashiki","omiyage","douhankai"], "s:guest-host"),
 ("291-gift-customs","gift customs","gift-customs","ja.goal.b1.culture-tradition",
  ["okurimono","kansen","tsutsumi","noshi","fukuro"], "s:gift-wrapping"),
 ("292-polite-taboos","polite taboos","polite-taboos","ja.goal.b1.culture-tradition",
  ["kinshi","taboo","haji","shitsurei","hazukashii"], "s:taboo-rule"),
 ("293-attending-ceremonies","attending ceremonies","attending-ceremonies","ja.goal.b1.culture-tradition",
  ["shugo","engi","sosai","hanayome","hanamuko"], "s:ceremony-congrats"),
 ("294-culture-essay","culture essay","culture-essay","ja.goal.b1.culture-tradition",
  ["bunkaron","hassou","kousatsu","tsuyaku","kijutsu"], "s:essay-observation"),
 ("295-everyday-laws","everyday laws","everyday-laws","ja.goal.b1.society-rules",
  ["horitsu","horei","kotsukisoku","kinben","keisatsu"], "s:law-everyday"),
 ("296-rights-and-duties","rights and duties","rights-duties","ja.goal.b1.society-rules",
  ["kenri","gimu","yimu","youmu","koeki"], "g:ja.grammar.b1.ukemi-indirect"),
 ("297-neighborhood-rules","neighborhood rules","neighborhood-rules","ja.goal.b1.society-rules",
  ["jichikai","soji","riso","chounakai","mafusa"], "s:neighbor-clean"),
 ("298-public-ethics","public ethics","public-ethics","ja.goal.b1.society-rules",
  ["kokyo","doutoku","kyosei","yuwa","kankyou"], "g:ja.grammar.b1.dake-bakari-shika"),
 ("299-volunteering","volunteering","volunteering","ja.goal.b1.society-rules",
  ["boryuntia","fukushi","hatsuyaku","katsuyaku","shokumu"], "s:volunteer-role"),
]
OLD_SENTS = ["ja.sent.meeting-starts","ja.sent.reply-email","ja.sent.report-address",
             "ja.sent.work-company","ja.sent.interview-prep"]

def unit_yaml(topic, uid, goal, words, newitem):
    shard = "culture2" if "culture-tradition" in goal else "society"
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

print("batch24 written")
