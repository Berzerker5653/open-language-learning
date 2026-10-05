#!/usr/bin/env python3
"""ja-JP batch 62: B2 units 660-669 (psychology-mind)."""
import json, os

R = "languages/ja-JP"
SRC = ["jf-standard", "ai-drafted-extension"]
NOTE = ("Framework-level sourcing only (JF Standard reference, no descriptor text copied); "
        "a dictionary/reviewer source must be added before verified status.")
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-05", "notes": "ai-assisted draft wording; qualified review pending."}

WORDS = [
 ("douki","どうき","noun","motivation, impulse"),
 ("mokuteki","もくてき","noun","goal, aim"),
 ("yuuki","ゆうき","noun","courage, nerve"),
 ("riyuu2","りゆう","noun","reason"),
 ("chikara","ちから","noun","power, strength"),
 ("kosei","こせい","noun","individuality"),
 ("ansei","あんせい","noun","calmness, composure"),
 ("shoujiki","しょうじき","na-adjective","honest, frank"),
 ("kyoumi","きょうみ","noun","interest, curiosity"),
 ("senmon","せんもん","noun","specialty, field"),
 ("hatsusei","はっせい","noun","adolescence"),
 ("shounen","しょうねん","noun","boy, youth"),
 ("seinen","せいねん","noun","young adult"),
 ("otona","おとな","noun","adult"),
 ("rounen","ろうねん","noun","old age"),
 ("shuudan","しゅうだん","noun","group, crowd"),
 ("shuukou","しゅうこう","noun","conformity, herd behavior"),
 ("enryo","えんりょ","noun","restraint, reserve"),
 ("shinrai","しんらい","noun","trust, confidence"),
 ("hiyou","ひよう","noun","criticism, censure"),
 ("kibun","きぶん","noun","mood, feeling"),
 ("fuan","ふあん","noun","anxiety, unease"),
 ("wakuwaku","わくわく","noun","excitement, anticipation"),
 ("tanoshii","たのしい","i-adjective","enjoyable, fun"),
 ("kanashii","かなしい","i-adjective","sad"),
 ("sutoresu","すとれす","noun","stress"),
 ("iradachi","いらだち","noun","irritation, frustration"),
 ("nemuri","ねむり","noun","sleep"),
 ("yuutsu","ゆううつ","na-adjective","depressed, low"),
 ("taisetsu","たいせつ","na-adjective","important, precious"),
 ("shiawase","しあわせ","na-adjective","happy, fortunate"),
 ("genki","げんき","na-adjective","energetic, healthy"),
 ("shinpai","しんぱい","noun","worry, concern"),
 ("hougoku2","ほうこく","noun","report"),
 ("danran","だんらん","noun","togetherness, family chat"),
 ("koudou","こうどう","noun","conduct, behavior"),
 ("kaizen","かいぜん","noun","improvement, betterment"),
 ("mokuhyou","もくひょう","noun","target, objective"),
 ("jissen","じっせん","noun","practice, putting into practice"),
 ("kizuna","きずな","noun","bond, connection"),
 ("kakunin","かくにん","noun","confirmation, verification"),
 ("kankaku","かんかく","noun","sensation, perception"),
 ("shinjitsu","しんじつ","noun","truth, reality"),
 ("chiteki","ちてき","na-adjective","intellectual"),
 ("ninchi","にんち","noun","cognition, recognition"),
 ("kotoba","ことば","noun","word, language"),
 ("shikou","しこう","noun","thought, thinking"),
 ("omoi","おもい","noun","feeling, thought"),
 ("kaiwa2","かいわ","noun","conversation"),
 ("imi","いみ","noun","meaning"),
]

def entry(rid, kana, pos, gloss):
    return {"id": f"ja.lex.psych.{rid}", "status": "draft",
            "forms": [{"text": kana, "script": "hiragana", "is_primary": True}],
            "readings": [{"text": kana, "script": "hiragana"},
                         {"text": rid, "transliteration_system": "modified-hepburn"}],
            "glosses": {"en-US": [gloss]}, "part_of_speech": pos,
            "registers": ["ja.register.neutral-common"], "semantic_tags": ["psychology"],
            "sources": SRC, "notes": NOTE, "generation": GEN}

with open(os.path.join(R, "lexicon", "psych.jsonl"), "w") as f:
    for rid, kana, pos, gloss in WORDS:
        f.write(json.dumps(entry(rid, kana, pos, gloss), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ja.grammar.b2-ni-hikurabete", "name": "〜に比べて (compared to)", "category": "syntax",
  "definition": "に比べて marks a standard of comparison: ねむり に ひてして すとれす が ふえる. Draft definition pending review."},
 {"id": "ja.grammar.b2-ni-tsurezuru", "name": "〜に伴う (accompanying)", "category": "syntax",
  "definition": "に伴う marks accompaniment: しゅうだん に ともなう えんりょ. Draft definition pending review."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("motivation-theory","どうき の じっけん を べんきょう しました。","douki no jikken wo benkyou shimashita.","I studied the motivation experiment.",["どうき"]),
 ("personality-psychology","こせい の ちがい を ぎろん しました。","kosei no chigai wo giron shimashita.","We discussed differences in individuality.",["こせい"]),
 ("development-stages","はっせい の き の しんちょう を はなしました。","hatsusei no ki no shinchou wo hanashimashita.","We talked about growth in adolescence.",["はっせい"]),
 ("social-psychology","しゅうこう の けんきゅう を よみました。","shuukou no kenkyuu wo yomimashita.","I read a study on conformity.",["しゅうこう"]),
 ("emotion-theory","きぶん と ふあん の かんけい を はなしました。","kibun to fuan no kankei wo hanashimashita.","We talked about the link between mood and anxiety.",["きぶん"]),
 ("wellbeing-research","しあわせ の けんきゅう に きょうみ が あります。","shiawase no kenkyuu ni kyoumi ga arimasu.","I am interested in happiness research.",["しあわせ"]),
 ("behavior-change","こうどう を かえる ほうほう を べんきょう しました。","koudou wo kaeru houhou wo benkyou shimashita.","I studied ways to change behavior.",["こうどう"]),
 ("language-and-mind","ことば と しこう の かんけい を べんきょう しました。","kotoba to shikou no kankei wo benkyou shimashita.","I studied the relationship between language and thought.",["ことば"]),
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

G = "ja.goal.b2.psychology-mind"
U = [
 ("660-motivation-theory","motivation theory","660-motivation-theory",G,
  ["douki","mokuteki","yuuki","riyuu2","chikara"], "s:motivation-theory"),
 ("661-personality-psychology","personality psychology","661-personality-psychology",G,
  ["kosei","ansei","shoujiki","kyoumi","senmon"], "s:personality-psychology"),
 ("662-development-stages","development stages","662-development-stages",G,
  ["hatsusei","shounen","seinen","otona","rounen"], "s:development-stages"),
 ("663-social-psychology","social psychology","663-social-psychology",G,
  ["shuudan","shuukou","enryo","shinrai","hiyou"], "s:social-psychology"),
 ("664-emotion-theory","emotion theory","664-emotion-theory",G,
  ["kibun","fuan","wakuwaku","tanoshii","kanashii"], "s:emotion-theory"),
 ("665-stress-science","stress science","665-stress-science",G,
  ["sutoresu","iradachi","nemuri","yuutsu","taisetsu"], "g:ja.grammar.b2-ni-hikurabete"),
 ("666-wellbeing-research","wellbeing research","666-wellbeing-research",G,
  ["shiawase","genki","shinpai","hougoku2","danran"], "s:wellbeing-research"),
 ("667-behavior-change","behavior change","667-behavior-change",G,
  ["koudou","kaizen","mokuhyou","jissen","kizuna"], "s:behavior-change"),
 ("668-perception-study","perception study","668-perception-study",G,
  ["kakunin","kankaku","shinjitsu","chiteki","ninchi"], "g:ja.grammar.b2-ni-tsurezuru"),
 ("669-language-and-mind","language and mind","669-language-and-mind",G,
  ["kotoba","shikou","omoi","kaiwa2","imi"], "s:language-and-mind"),
]

def unit_yaml(topic, uid, goal, words, newitem):
    lex = [f"ja.lex.psych.{w}" for w in words]
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

print("batch62 written")
assert len(WORDS) == 50, len(WORDS)
