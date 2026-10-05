#!/usr/bin/env python3
"""ja-JP batch 31: B1 units 360-369 (advice-opinion complete)."""
import json, os

R = "languages/ja-JP"
SRC = ["jf-standard", "ai-drafted-extension"]
NOTE = ("Framework-level sourcing only (JF Standard reference, no descriptor text copied); "
        "a dictionary/reviewer source must be added before verified status.")
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-04", "notes": "ai-assisted draft wording; qualified review pending."}

WORDS = [
 ("suusei","すうせい","noun","persuasion"),
 ("ikou","いこう","noun","intention"),
 ("youchuu","ようちょう","noun","negotiation"),
 ("kokuhan","こくはん","noun","warning"),
 ("kibou","きぼう","noun","hope"),
 ("sengaku","せんがく","noun","preference"),
 ("yuusen","ゆうせん","noun","priority"),
 ("kyoushou","きょうしょう","noun","compromise"),
 ("hansei2","はんせい","noun","regret"),
 ("mouichido","もういちど","adverb","once more"),
 ("dankai","だんかい","noun","stage"),
 ("iikae","いいかえ","noun","rephrasing"),
 ("nagai2","ながい","i-adjective","long"),
 ("hayai2","はやい","i-adjective","fast"),
 ("osoi2","おそい","i-adjective","slow"),
 ("kawa2","かわ","noun","river"),
 ("yama2","やま","noun","mountain"),
 ("sora2","そら","noun","sky"),
 ("tsuchi2","つち","noun","soil"),
 ("kaze2","かぜ","noun","wind"),
 ("hito2","ひと","noun","person"),
 ("mono2","もの","noun","thing"),
 ("koto2","こと","noun","matter"),
 ("basho2","ばしょ","noun","place"),
 ("toki2","とき","noun","time"),
 ("michi2","みち","noun","street"),
 ("ie2","いえ","noun","house"),
 ("mado2","まど","noun","window"),
 ("tsukue2","つくえ","noun","desk"),
 ("isu2","いす","noun","chair"),
 ("tana2","たな","noun","shelf"),
 ("yuka2","ゆか","noun","floor"),
 ("kabe2","かべ","noun","wall"),
 ("yane2","やね","noun","roof"),
 ("hashi2","はし","noun","bridge"),
 ("tsubo2","つぼ","noun","garden pot"),
 ("niwa2","にわ","noun","garden"),
 ("mori2","もり","noun","forest"),
 ("umi2","うみ","noun","sea"),
 ("suna2","すな","noun","sand"),
 ("ishi2","いし","noun","stone"),
 ("ki2","き","noun","tree"),
 ("hana2","はな","noun","flower"),
 ("inoko2","いのこ","noun","child"),
 ("otona2","おとな","noun","adult"),
 ("tomodachi2","ともだち","noun","friend"),
 ("tetsudo","てつどう","verb","to help out"),
 ("hikaku","ひかく","noun","comparison"),
 ("take","たけ","noun","height"),
 ("mijika","みじか","i-adjective","short"),
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

with open(os.path.join(R, "lexicon", "advice2.jsonl"), "w") as f:
    for rid, kana, pos, gloss in WORDS:
        f.write(json.dumps(entry("advice2", rid, kana, pos, gloss, "opinion"), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ja.grammar.b1.to-itara-domo", "name": "〜といい but 〜とも (advice; concession)", "category": "syntax",
  "definition": "といい advises; とも concedes: そう すると いい です; むり でも そう します. Draft definition pending review."},
 {"id": "ja.grammar.b1.ni-chuui", "name": "〜に注意 (caution)", "category": "pragmatics",
  "definition": "に注意 cautions: みち に ちゅうい して ください. Draft definition pending review."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("gentle-persuade","すうせい は やさしく しました。","suusei wa yasashiku shimashita.","I persuaded gently.",["すうせい"]),
 ("suggestion-form","もういちど ぜんあん を だしました。","mouichido zen'an wo dashimashita.","I made the proposal once more.",["もういちど"]),
 ("polite-warning","みち に ちゅうい して ください。","michi ni chui shite kudasai.","Please be careful of the street.",["みち"]),
 ("regret","はんせい の てがみ を かきました。","hansei no tegami wo kakimashita.","I wrote a letter of regret.",["はんせい"]),
 ("hope","きぼう の はなし を しました。","kibou no hanashi wo shimashita.","I talked about hope.",["きぼう"]),
 ("preference","せんがく は ながい もの です。","sengaku wa nagai mono desu.","My preference is the long one.",["せんがく"]),
 ("priorities","ゆうせん の じゅんじょ を かきました。","yuusen no junjo wo kakimashita.","I wrote the order of priorities.",["ゆうせん"]),
 ("compromise-write","きょうしょう の ぶんしょう を かきました。","kyoushou no bunshou wo kakimashita.","I wrote the compromise text.",["きょうしょう"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, romaji, gloss, cloze in SENTS:
        e = {"id": f"ja.sent.{sid}", "status": "draft", "text": text, "reading": text,
             "romaji": romaji, "gloss": gloss, "cloze_targets": cloze,
             "sources": SRC, "notes": "ai-assisted draft sentence; qualified review required before verified.",
             "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

U = [
 ("360-gentle-persuasion","gentle persuasion","gentle-persuasion","ja.goal.b1.advice-opinion",
  ["suusei","ikou","youchuu","kokuhan","kibou"], "s:gentle-persuade"),
 ("361-suggestion-forms","suggestion forms","suggestion-forms","ja.goal.b1.advice-opinion",
  ["sengaku","yuusen","kyoushou","hansei2","mouichido"], "s:suggestion-form"),
 ("362-polite-warnings","polite warnings","polite-warnings","ja.goal.b1.advice-opinion",
  ["dankai","iikae","tetsudo","hikaku","take"], "s:polite-warning"),
 ("363-expressing-regret","expressing regret","expressing-regret","ja.goal.b1.advice-opinion",
  ["mijika","nagai2","hayai2","osoi2","kawa2"], "s:regret"),
 ("364-expressing-hope","expressing hope","expressing-hope","ja.goal.b1.advice-opinion",
  ["yama2","sora2","tsuchi2","kaze2","hito2"], "s:hope"),
 ("365-explaining-preference","explaining preference","explaining-preference","ja.goal.b1.advice-opinion",
  ["mono2","koto2","basho2","toki2","michi2"], "g:ja.grammar.b1.to-itara-domo"),
 ("366-stating-priorities","stating priorities","stating-priorities","ja.goal.b1.advice-opinion",
  ["ie2","mado2","tsukue2","isu2","tana2"], "s:priorities"),
 ("367-compromise-writing","compromise writing","compromise-writing","ja.goal.b1.advice-opinion",
  ["yuka2","kabe2","yane2","hashi2","tsubo2"], "s:compromise-write"),
 ("368-decision-talk","decision talk","decision-talk","ja.goal.b1.advice-opinion",
  ["niwa2","mori2","umi2","suna2","ishi2"], "g:ja.grammar.b1.ni-chuui"),
 ("369-reflection-essay","reflection essay","reflection-essay","ja.goal.b1.advice-opinion",
  ["ki2","hana2","inoko2","otona2","tomodachi2"], "s:regret"),
]
OLD_SENTS = ["ja.sent.meeting-starts","ja.sent.reply-email","ja.sent.report-address",
             "ja.sent.work-company","ja.sent.interview-prep"]

def unit_yaml(topic, uid, goal, words, newitem):
    lex = [f"ja.lex.advice2.{w}" for w in words]
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

print("batch31 written")
