#!/usr/bin/env python3
"""ja-JP batch 50: B2 units 540-549 (society-change tail)."""
import json, os

R = "languages/ja-JP"
SRC = ["jf-standard", "ai-drafted-extension"]
NOTE = ("Framework-level sourcing only (JF Standard reference, no descriptor text copied); "
        "a dictionary/reviewer source must be added before verified status.")
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-04", "notes": "ai-assisted draft wording; qualified review pending."}

WORDS = [
 ("keieki","management","n","management"),
 ("kigyo","business","n","business, company"),
 ("hataraki","way of working","n","way of working"),
 ("taido","attitude","n","attitude"),
 ("kizuna","bond","n","bond"),
 ("kakushin","innovation","n","innovation"),
 ("fukkyuu","restoration","n","restoration, recovery"),
 ("jichitsu","self-reliance","n","self-reliance"),
 ("kyousou","competition","n","competition"),
 ("kyouchou","cooperation","n","cooperation"),
 ("rentai","solidarity","n","solidarity"),
 ("shigen","resource","n","resource"),
 ("saishi","recycling","n","recycling"),
 ("ene","energy","n","energy"),
 ("kiki","crisis","n","crisis"),
 ("taisho","measure","n","measure, countermeasure"),
 ("yosan","budget","n","budget"),
 ("aisan","allocation","n","allocation"),
 ("kurashi","living","n","living, daily life"),
 ("shuumatsu","weekend","n","weekend"),
 ("kozou","structure","n","structure"),
 ("kaihyou","disappearance","n","disappearance"),
 ("soutou","equality","n","equality"),
 ("fukyu","inequality","n","inequality"),
 ("saisu","gap","n","gap"),
 ("kyousei","compulsory","adj-na","compulsory"),
 ("jiyuu","freedom","n","freedom"),
 ("kenri","right","n","right"),
 ("gimu","duty","n","duty"),
 ("hoshou","guarantee","n","guarantee"),
 ("unyou","operation","n","operation"),
 ("suisin","progress","n","progress"),
 ("totsunyuu","investment","n","investment"),
 ("kakyu","supply","n","supply"),
 ("juyou","demand","n","demand"),
 ("shihai","domination","n","domination"),
 ("tousei","governance","n","governance"),
 ("komyuniti","community","n","community"),
 ("jogai","volunteer","n","volunteer"),
 ("noutoku","acquisition","n","acquisition"),
 ("jichikai","neighborhood association","n","neighborhood association"),
 ("kaihatsu","development","n","development"),
 ("shinkou","promotion","n","promotion"),
 ("senyuu","leading","n","leading, advance"),
 ("mirai","future","n","future"),
 ("yoiron","public opinion","n","public opinion"),
 ("touhyou","vote","n","vote"),
 ("hatsugen","statement","n","statement"),
 ("kaikei","accounting","n","accounting"),
 ("kouritsu","efficiency","n","efficiency"),
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

with open(os.path.join(R, "lexicon", "society4.jsonl"), "w") as f:
    for rid, kana, pos, gloss in WORDS:
        f.write(json.dumps(entry("society4", rid, kana, pos, gloss, "society"), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ja.grammar.b2.ni-kagitte", "name": "〜に限って (only in the case of)", "category": "syntax",
  "definition": "に限って restricts to a special case: きき に かぎって たいさく が はっしょう した. Draft definition pending review."},
 {"id": "ja.grammar.b2.bakari-ka", "name": "〜ばかりか (not only)", "category": "syntax",
  "definition": "ばかりか adds an unexpected item: かいしゃ は じんこう ばかりか じかん も うしなった. Draft definition pending review."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("work-management","はたらきかた の ちゅうし を かきました。","hatarakikata no chuuji wo kakimashita.","I wrote the gist of the way of working.",["はたらきかた"]),
 ("social-innovation","かくしん の はなし を ききました。","kakushin no hanashi wo kikimashita.","I heard the innovation story.",["かくしん"]),
 ("community-bonds","きょうどう の じょうほう を あつめました。","kyouchou no jouhou wo atsumemashita.","I gathered information on cooperation.",["きょうどう"]),
 ("energy-future","きき の たいさく について かきました。","kiki no taisaku ni tsuite kakimashita.","I wrote about crisis measures.",["たいさく"]),
 ("public-budget","よさん の きじ を よみました。","yosan no kiji wo yomimashita.","I read the budget article.",["よさん"]),
 ("lifestyle-change","せいかつ の こうぞう が かわりました。","seikatsu no kozou ga kawarimashita.","The structure of life changed.",["こうぞう"]),
 ("rights-freedom","けんり の べんきょう を しました。","kenri no benkyou wo shimashita.","I studied rights.",["けんり"]),
 ("equality-gap","びょうどう の もんだい を ぎろん しました。","byoudou no mondai wo giron shimashita.","We debated the equality problem.",["びょうどう"]),
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

U = [
 ("540-work-management","work management","work-management",
  ["keieki","kigyo","hataraki","taido","kizuna"], "s:work-management"),
 ("541-social-innovation","social innovation","social-innovation",
  ["kakushin","fukkyuu","jichitsu","kyousou","kyouchou"], "s:social-innovation"),
 ("542-community-bonds","community bonds","community-bonds",
  ["rentai","komyuniti","jogai","noutoku","jichikai"], "s:community-bonds"),
 ("543-energy-future","energy and crisis","energy-future",
  ["ene","kiki","taisho","shigen","saishi"], "s:energy-future"),
 ("544-public-budget","public budget","public-budget",
  ["yosan","aisan","kouritsu","kaikei","totsunyuu"], "s:public-budget"),
 ("545-lifestyle-change","lifestyle change","lifestyle-change",
  ["kurashi","shuumatsu","kozou","kaihyou","suisin"], "s:lifestyle-change"),
 ("546-rights-freedom","rights and freedom","rights-freedom",
  ["jiyuu","kenri","gimu","hoshou","kyousei"], "s:rights-freedom"),
 ("547-equality-gap","equality and gap","equality-gap",
  ["soutou","fukyu","saisu","shihai","tousei"], "s:equality-gap"),
 ("548-supply-demand","supply and development","supply-development",
  ["kakyu","juyou","kaihatsu","shinkou","senyuu"], "g:ja.grammar.b2.ni-kagitte"),
 ("549-future-opinion","future and opinion","future-opinion",
  ["mirai","yoiron","touhyou","hatsugen","unyou"], "g:ja.grammar.b2.bakari-ka"),
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

for fname, topic, uid, words, newitem in U:
    with open(os.path.join(R, "curriculum", "units", fname + ".yaml"), "w") as f:
        f.write(unit_yaml(topic, uid, "ja.goal.b2.society-change", "society4", words, newitem))

print("batch50 written")
