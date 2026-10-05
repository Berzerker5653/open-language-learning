#!/usr/bin/env python3
"""ja-JP batch 68: B2 units 720-729 (language-linguistics)."""
import json, os

R = "languages/ja-JP"
SRC = ["jf-standard", "ai-drafted-extension"]
NOTE = ("Framework-level sourcing only (JF Standard reference, no descriptor text copied); "
        "a dictionary/reviewer source must be added before verified status.")
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-05", "notes": "ai-assisted draft wording; qualified review pending."}

WORDS = [
 ("go","ご","noun","word"),
 ("boshi","ぼし","noun","suffix"),
 ("hasei","はせい","noun","derivation"),
 ("genin","げんにん","noun","origin, etymology"),
 ("bunsetsu","ぶんせつ","noun","word group, phrase"),
 ("bun","ぶん","noun","sentence"),
 ("kansetsu","かんせつ","noun","clause, passage"),
 ("shugo","しゅご","noun","subject (grammar)"),
 ("jutsugo","じゅつご","noun","predicate"),
 ("keishiki","けいしき","noun","form, format"),
 ("imi2","いみ","noun","meaning"),
 ("bunmyaku","ぶんみゃく","noun","context"),
 ("hatsuwa","はつわ","noun","utterance"),
 ("taishou","たいしょう","noun","choice, option"),
 ("kotae2","こたえ","noun","answer, response"),
 ("keigo","けいご","noun","honorific language"),
 ("reigi","れいぎ","noun","manners, etiquette"),
 ("kizukai","きづかい","noun","consideration, tact"),
 ("hyougen","ひょうげん","noun","expression, wording"),
 ("iimawashi","いいまわし","noun","phrasing, way of saying"),
 ("houden","ほうげん","noun","dialect"),
 ("namari","なまり","noun","regional accent"),
 ("gengo","げんご","noun","language"),
 ("kokugo","こくご","noun","national language"),
 ("kyoutsuugo","きょうつうご","noun","standard language"),
 ("henka","へんか","noun","change"),
 ("henyou","へんよう","noun","usage shift"),
 ("jidai","じだい","noun","era, period"),
 ("kindai","きんだい","noun","modern era"),
 ("bogo","ぼご","noun","mother tongue"),
 ("moji","もじ","noun","character, letter"),
 ("shiyou","しよう","noun","use, usage"),
 ("gakushuu","がくしゅう","noun","learning, study"),
 ("kakikata","かきかた","noun","way of writing"),
 ("hyouki","ひょうき","noun","notation"),
 ("shutoku","しゅとく","noun","acquisition"),
 ("gikou","ぎこう","noun","device, ingenuity"),
 ("fuyuukyo","ふゆうきょう","noun","foreign language education"),
 ("kouzou","こうぞう","noun","structure"),
 ("gendai","げんだい","noun","present day"),
 ("bilingual","ばいりんがる","na-adjective","bilingual"),
 ("nikokugo","にこくご","noun","two languages"),
 ("tsuuyaku","つうやく","noun","interpretation, oral translation"),
 ("honyaku","ほんやく","noun","translation"),
 ("yakusha","やくしゃ","noun","interpreter"),
 ("honyakusha","ほんやくしゃ","noun","translator"),
 ("kanji2","かんじ","noun","kanji character"),
 ("taiou","たいおう","na-adjective","corresponding"),
 ("kana2","かな","noun","kana script"),
 ("koutei","こうてい","noun","process, course"),
]
assert len(WORDS) == 50, len(WORDS)

def entry(rid, kana, pos, gloss):
    return {"id": f"ja.lex.ling2.{rid}", "status": "draft",
            "forms": [{"text": kana, "script": "hiragana", "is_primary": True}],
            "readings": [{"text": kana, "script": "hiragana"},
                         {"text": rid, "transliteration_system": "modified-hepburn"}],
            "glosses": {"en-US": [gloss]}, "part_of_speech": pos,
            "registers": ["ja.register.neutral-common"], "semantic_tags": ["language"],
            "sources": SRC, "notes": NOTE, "generation": GEN}

with open(os.path.join(R, "lexicon", "ling2.jsonl"), "w") as f:
    for rid, kana, pos, gloss in WORDS:
        f.write(json.dumps(entry(rid, kana, pos, gloss), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ja.grammar.b2-darou", "name": "〜だろう (probably)", "category": "syntax",
  "definition": "だろう marks conjecture: ほうげん が かわる だろう. Draft definition pending review."},
 {"id": "ja.grammar.b2-to-omo-u", "name": "〜と思う (I think)", "category": "syntax",
  "definition": "と思う softens an opinion: たしか だと おもう. Draft definition pending review."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("word-formation","ご の せいぞう を べんきょう しました。","go no seizou wo benkyou shimashita.","I studied word formation.",["ご"]),
 ("sentence-variation","ぶん の かんけい を べんきょう しました。","bun no kankei wo benkyou shimashita.","I studied sentence relations.",["ぶん"]),
 ("meaning-context","ぶんみゃく の だい について はなしました。","bunmyaku no dai ni tsuite hanashimashita.","We talked about the role of context.",["ぶんみゃく"]),
 ("pragmatics-politeness","けいご の べんきょう を しました。","keigo no benkyou wo shimashita.","I studied honorific language.",["けいご"]),
 ("language-change","ことば の へんか を べんきょう しました。","kotoba no henka wo benkyou shimashita.","I studied language change.",["へんか"]),
 ("writing-systems","もじ の かきかた を べんきょう しました。","moji no kakikata wo benkyou shimashita.","I studied ways of writing characters.",["もじ"]),
 ("acquisition-study","しゅとく の けんきゅう を よみました。","shutoku no kenkyuu wo yomimashita.","I read a study on acquisition.",["しゅとく"]),
 ("bilingualism","ほんやく の ぎもん を ぎろん しました。","honyaku no gimon wo giron shimashita.","We discussed questions about translation.",["ほんやく"]),
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

G = "ja.goal.b2.language-linguistics"
U = [
 ("720-word-formation","word formation","720-word-formation",G,
  ["go","boshi","hasei","genin","bunsetsu"], "s:word-formation"),
 ("721-sentence-variation","sentence variation","721-sentence-variation",G,
  ["bun","kansetsu","shugo","jutsugo","keishiki"], "s:sentence-variation"),
 ("722-meaning-context","meaning context","722-meaning-context",G,
  ["imi2","bunmyaku","hatsuwa","taishou","kotae2"], "s:meaning-context"),
 ("723-pragmatics-politeness","pragmatics politeness","723-pragmatics-politeness",G,
  ["keigo","reigi","kizukai","hyougen","iimawashi"], "s:pragmatics-politeness"),
 ("724-dialect-variation","dialect variation","724-dialect-variation",G,
  ["houden","namari","gengo","kokugo","kyoutsuugo"], "g:ja.grammar.b2-darou"),
 ("725-language-change","language change","725-language-change",G,
  ["henka","henyou","jidai","kindai","gendai"], "s:language-change"),
 ("726-writing-systems","writing systems","726-writing-systems",G,
  ["moji","kanji2","kana2","kakikata","hyouki"], "s:writing-systems"),
 ("727-language-acquisition","language acquisition","727-language-acquisition",G,
  ["shutoku","bogo","fuyuukyo","gakushuu","shiyou"], "s:acquisition-study"),
 ("728-bilingualism","bilingualism","728-bilingualism",G,
  ["bilingual","nikokugo","tsuuyaku","honyaku","yakusha"], "s:bilingualism"),
 ("729-translation-theory","translation theory","729-translation-theory",G,
  ["honyakusha","taiou","kouzou","gikou","koutei"], "g:ja.grammar.b2-to-omo-u"),
]

def unit_yaml(topic, uid, goal, words, newitem):
    lex = [f"ja.lex.ling2.{w}" for w in words]
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

print("batch68 written")
