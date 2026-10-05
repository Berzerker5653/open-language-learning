#!/usr/bin/env python3
"""ja-JP batch 42: B2 units 470-479 (philosophy-ethics cont)."""
import json, os

R = "languages/ja-JP"
SRC = ["jf-standard", "ai-drafted-extension"]
NOTE = ("Framework-level sourcing only (JF Standard reference, no descriptor text copied); "
        "a dictionary/reviewer source must be added before verified status.")
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-04", "notes": "ai-assisted draft wording; qualified review pending."}

WORDS = [
 ("kojin","こじん","noun","individual"),
 ("honshitsu","ほんしつ","noun","essence"),
 ("shinjitsu","しんじつ","noun","truth"),
 ("uso","うそ","noun","lie"),
 ("shinjin","しんじん","noun","trust"),
 ("seigi","せいぎ","noun","justice"),
 ("kousei","こうせい","noun","fairness"),
 ("zennyaku","ぜんあく","noun","good and evil"),
 ("jikukettei","じこけってい","noun","self-determination"),
 ("shiawase","しあわせ","noun","happiness"),
 ("jitsugen","じつげん","noun","realization"),
 ("kikai","きかい","noun","machine"),
 ("izen","いぜん","noun","previous generation"),
 ("inou","いけん","noun","opinion"),
 ("iryou","いりょう","noun","medical care"),
 ("makoto","まこと","noun","sincerity"),
 ("bigaku","びがく","noun","aesthetics"),
 ("biishiki","びかん","noun","aesthetic sense"),
 ("geijutsu","げいじゅつ","noun","art"),
 ("zense","ぜんせい","noun","goodness"),
 ("dousei","どうせい","noun","shared life"),
 ("chouwa","ちょうわ","noun","harmony"),
 ("bi","び","noun","beauty"),
 ("kokoro-bazashi","こころづかい","noun","thoughtfulness"),
 ("kantei","かんてい","noun","appraisal"),
 ("handan","はんだん","noun","judgment"),
 ("urei","ゆうれい","noun","concern"),
 ("tsuyosa","つよさ","noun","strength"),
 ("yowasa","よわさ","noun","weakness"),
 ("omoi-yari","おもいやり","noun","consideration"),
 ("shinro","しんり","noun","psychology"),
 ("kyoi","きょうい","noun","consensus"),
 ("kyokou","きょこう","noun","holding of a ceremony"),
 ("jiyu-ishiki","じゆういしき","noun","sense of free will"),
 ("sekinin-kan","せきにんかん","noun","sense of responsibility"),
 ("nenrei","ねんれい","noun","era"),
 ("jinsei","じんせい","noun","life"),
 ("jinsei-kan","じんせいかん","noun","view of life"),
 ("sekai-kan","せいかいかん","noun","worldview"),
 ("kachi-kan","かちかん","noun","sense of values"),
 ("kiso-chishiki","きそちしき","noun","basic knowledge"),
 ("chie","ちえ","noun","wisdom"),
 ("kensho","けんしょう","noun","verification"),
 ("hantei","はんてい","noun","verdict"),
 ("hyomei","ひょうめい","noun","expression"),
 ("meiyo-kan","めいよかん","noun","sense of honor"),
 ("jiko-kan","じこかん","noun","sense of self"),
 ("kanshou","かんしょう","noun","sentiment"),
 ("kansyou","かんしょう","noun","appreciation"),
 ("yuuai","ゆうあい","noun","benevolence"),
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

with open(os.path.join(R, "lexicon", "philosophy2.jsonl"), "w") as f:
    for rid, kana, pos, gloss in WORDS:
        f.write(json.dumps(entry("philosophy2", rid, kana, pos, gloss, "philosophy"), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ja.grammar.b2.toiu-mono", "name": "〜というもの (the very notion)", "category": "semantics",
  "definition": "というもの emphasizes the notion itself: しんじつ と いう もの は ふくざつ だ. Draft definition pending review."},
 {"id": "ja.grammar.b2.mono-ka", "name": "〜ものか (no way)", "category": "pragmatics",
  "definition": "ものか expresses strong denial: せいぎ を すてる ものか. Draft definition pending review."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("free-will-debate","せいぎ の ろんぶん を べんきょう しました。","seigi no ronbun wo benkyou shimashita.","I studied an essay on justice.",["せいぎ"]),
 ("justice-theory","ぜんあく の ちてき を はなしました。","zennyaku no chiteki wo hanashimashita.","I talked about the wisdom of good and evil.",["ぜんあく"]),
 ("happiness-philosophy","じんせいの きょり を かんがえました。","jinsei no kyori wo kangaemashita.","I thought about the distance of life.",["じんせい"]),
 ("duty-versus-good","おもいやり の たいど を しめしました。","omoiyari no taido wo shime shimashita.","I showed an attitude of consideration.",["おもいやり"]),
 ("technology-ethics","きかい の のうりょく が あがりました。","kikai no nouryoku ga agarimashita.","The capability of machines has increased.",["きかい"]),
 ("environmental-ethics","ちえ の ゆつう を べんきょう しました。","chie no yutsuu wo benkyou shimashita.","I studied the transmission of wisdom.",["ちえ"]),
 ("medical-ethics","いけん の しゅうごう を おこないました。","iken no shuugou wo okonaimashita.","I carried out a collection of opinions.",["いけん"]),
 ("truth-and-lies","しんじつ の かくにん を しました。","shinjitsu no kakunin wo shimashita.","I confirmed the truth.",["しんじつ"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, romaji, gloss, cloze in SENTS:
        e = {"id": f"ja.sent.{sid}", "status": "draft", "text": text, "reading": text,
             "romaji": romaji, "gloss": gloss, "cloze_targets": cloze,
             "sources": SRC, "notes": "ai-assisted draft sentence; qualified review required before verified.",
             "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

U = [
 ("470-free-will-debate","free will debate","free-will-debate","ja.goal.b2.philosophy-ethics",
  ["jikukettei","jiyu-ishiki","seigi","kousei","handan"], "s:free-will-debate"),
 ("471-justice-theory","justice theory","justice-theory","ja.goal.b2.philosophy-ethics",
  ["zennyaku","meiyo-kan","sekinin-kan","hantei","chouwa"], "s:justice-theory"),
 ("472-happiness-philosophy","happiness philosophy","happiness-philosophy","ja.goal.b2.philosophy-ethics",
  ["shiawase","jinsei","jinsei-kan","tsuyosa","yowasa"], "s:happiness-philosophy"),
 ("473-duty-versus-good","duty versus good","duty-versus-good","ja.goal.b2.philosophy-ethics",
  ["zense","makoto","urei","omoi-yari","kokoro-bazashi"], "s:duty-versus-good"),
 ("474-technology-ethics","technology ethics","technology-ethics","ja.goal.b2.philosophy-ethics",
  ["kikai","kyoi","kyokou","kiso-chishiki","kensho"], "s:technology-ethics"),
 ("475-environmental-ethics","environmental ethics","environmental-ethics","ja.goal.b2.philosophy-ethics",
  ["izen","nenrei","dousei","yuuai","chie"], "s:environmental-ethics"),
 ("476-medical-ethics","medical ethics","medical-ethics","ja.goal.b2.philosophy-ethics",
  ["iryou","inou","jiko-kan","shinro","kantei"], "s:medical-ethics"),
 ("477-truth-and-lies","truth and lies","truth-and-lies","ja.goal.b2.philosophy-ethics",
  ["shinjitsu","uso","shinjin","honshitsu","hyomei"], "s:truth-and-lies"),
 ("478-responsibility-concepts","responsibility concepts","responsibility-concepts","ja.goal.b2.philosophy-ethics",
  ["kojin","kachi-kan","sekai-kan","kanshou","kansyou"], "g:ja.grammar.b2.toiu-mono"),
 ("479-aesthetics-ideas","aesthetics ideas","aesthetics-ideas","ja.goal.b2.philosophy-ethics",
  ["bigaku","biishiki","geijutsu","bi","jitsugen"], "g:ja.grammar.b2.mono-ka"),
]
OLD_SENTS = ["ja.sent.meeting-starts","ja.sent.reply-email","ja.sent.report-address",
             "ja.sent.work-company","ja.sent.interview-prep"]

def unit_yaml(topic, uid, goal, words, newitem):
    lex = [f"ja.lex.philosophy2.{w}" for w in words]
    if newitem.startswith("s:"):
        newref = f"ja.sent.{newitem[2:]}"
        allowed_gram = ["ja.grammar.particle.object-wo"]
    else:
        newref = newitem[2:]
        allowed_gram = [newref, "ja.grammar.particle.object-wo"]
    old = [s for s in OLD_SENTS if s != newref][:2]
    refs = lex + [newref] + old
    lines = [f"# ai-assisted draft unit (Mode B B2); content refs are pack data; qualified review pending.",
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

print("batch42 written")
