#!/usr/bin/env python3
"""ja-JP batch 65: B2 units 690-699 (urban-life)."""
import json, os

R = "languages/ja-JP"
SRC = ["jf-standard", "ai-drafted-extension"]
NOTE = ("Framework-level sourcing only (JF Standard reference, no descriptor text copied); "
        "a dictionary/reviewer source must be added before verified status.")
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-05", "notes": "ai-assisted draft wording; qualified review pending."}

WORDS = [
 ("juumin","じゅうみん","noun","resident"),
 ("koudan","こうだん","noun","public housing"),
 ("kachiku","かちく","noun","land price"),
 ("zei","ぜい","noun","tax"),
 ("saabisu","さーびす","noun","service"),
 ("hiroba","ひろば","noun","plaza, open space"),
 ("puratsu","ぷらつ","noun","plaza"),
 ("shotengai","しょうてんがい","noun","shopping street"),
 ("paaku","ぱーく","noun","park"),
 ("kissa","きっさ","noun","café"),
 ("kogyo","こうぎょう","noun","industry"),
 ("shoten","しょうてん","noun","store, shop"),
 ("sangyo","さんぎょう","noun","industry, business"),
 ("kaihatsu","かいはつ","noun","development"),
 ("fukko","ふっこう","noun","revival, reconstruction"),
 ("senso","せんそー","noun","sensor"),
 ("shisutemu","しすてむ","noun","system"),
 ("ai","えーあい","noun","AI"),
 ("sosa","そうさ","noun","operation, control"),
 ("kufuu","くふう","noun","ingenuity, device"),
 ("ryoiki","りょういき","noun","area, region"),
 ("ki","き","noun","tree"),
 ("hana","はな","noun","flower"),
 ("suiiki","すいいき","noun","waterside, water area"),
 ("kuuki","くうき","noun","air"),
 ("jichikai","じちかい","noun","neighborhood association"),
 ("kaigo3","かいごう","noun","meeting, assembly"),
 ("renraku","れんらく","noun","contact, notice"),
 ("kyousou","きょうそう","noun","cooperation, collaboration"),
 ("aijou","あいじょう","noun","affection, fondness"),
 ("shiryou","しりょう","noun","historical materials"),
 ("kinen","きねん","noun","commemoration"),
 ("yakan","やかん","noun","night view"),
 ("fuukei","ふうけい","noun","scenery, landscape"),
 ("kairou","かいろう","noun","arcade, corridor"),
 ("osen","おせん","noun","pollution"),
 ("risou","りそう","noun","ideal"),
 ("mirai","みらい","noun","future"),
 ("genzai","げんざい","noun","current state"),
 ("tennen","てんねん","noun","nature"),
 ("mobiriti","もびりてぃ","noun","mobility"),
 ("jidousha","じどうしゃ","noun","automobile"),
 ("koukou2","こうこう","noun","walking"),
 ("shuppatsu","しゅっぱつ","noun","departure"),
 ("touchaku","とうちゃく","noun","arrival"),
 ("bouhan","ぼうはん","noun","crime prevention"),
 ("keibi","けいび","noun","security, guard"),
 ("touban","とうばん","noun","night watch"),
 ("mimamori","みまもり","noun","watching over, lookout"),
 ("youjin","ようじん","noun","caution, prudence"),
]
assert len(WORDS) == 50, len(WORDS)

def entry(rid, kana, pos, gloss):
    return {"id": f"ja.lex.urban2.{rid}", "status": "draft",
            "forms": [{"text": kana, "script": "hiragana", "is_primary": True}],
            "readings": [{"text": kana, "script": "hiragana"},
                         {"text": rid, "transliteration_system": "modified-hepburn"}],
            "glosses": {"en-US": [gloss]}, "part_of_speech": pos,
            "registers": ["ja.register.neutral-common"], "semantic_tags": ["urban"],
            "sources": SRC, "notes": NOTE, "generation": GEN}

with open(os.path.join(R, "lexicon", "urban2.jsonl"), "w") as f:
    for rid, kana, pos, gloss in WORDS:
        f.write(json.dumps(entry(rid, kana, pos, gloss), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ja.grammar.b2-wake-ka", "name": "〜わけか (so that's why)", "category": "syntax",
  "definition": "わけか marks sudden understanding: しすてむ の わけ か. Draft definition pending review."},
 {"id": "ja.grammar.b2-to-itte", "name": "〜と言って (saying that)", "category": "syntax",
  "definition": "と言って reports a reason or quote: べんり と言って つかう. Draft definition pending review."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("housing-policy","じゅうみん の ぎろん を ききました。","juumin no giron wo kikimashita.","I listened to the residents' debate.",["じゅうみん"]),
 ("public-spaces","ひろば の けいかく を べんきょう しました。","hiroba no keikaku wo benkyou shimashita.","I studied the plaza plan.",["ひろば"]),
 ("urban-economy","しょうてん の げんじょう を はなしました。","shoten no genjou wo hanashimashita.","We talked about the state of shops.",["しょうてん"]),
 ("green-urban","みらい の みどり を ぎろん しました。","mirai no midori wo giron shimashita.","We discussed future greenery.",["みらい"]),
 ("urban-community","じちかい の かいごう に いきました。","jichikai no kaigou ni ikimashita.","I went to the neighborhood meeting.",["じちかい"]),
 ("city-history","しりょう を みながら れきし を よみました。","shiryou wo minagara rekishi wo yomimashita.","I read history while looking at materials.",["しりょう"]),
 ("urban-environment","おせん の もんだい を べんきょう しました。","osen no mondai wo benkyou shimashita.","I studied the pollution problem.",["おせん"]),
 ("public-safety","ぼうはん の かつどう を おこないました。","bouhan no katsudou wo okonaimashita.","We carried out a crime-prevention activity.",["ぼうはん"]),
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

G = "ja.goal.b2.urban-life"
U = [
 ("690-housing-policy","housing policy","690-housing-policy",G,
  ["juumin","koudan","kachiku","zei","saabisu"], "s:housing-policy"),
 ("691-public-spaces","public spaces","691-public-spaces",G,
  ["hiroba","puratsu","shotengai","paaku","kissa"], "s:public-spaces"),
 ("692-urban-economy","urban economy","692-urban-economy",G,
  ["kogyo","shoten","sangyo","kaihatsu","fukko"], "s:urban-economy"),
 ("693-smart-cities","smart cities","693-smart-cities",G,
  ["senso","shisutemu","ai","sosa","kufuu"], "g:ja.grammar.b2-wake-ka"),
 ("694-green-urban","green urban","694-green-urban",G,
  ["ryoiki","ki","hana","suiiki","kuuki"], "s:green-urban"),
 ("695-urban-community","urban community","695-urban-community",G,
  ["jichikai","kaigo3","renraku","kyousou","aijou"], "s:urban-community"),
 ("696-city-history","city history","696-city-history",G,
  ["shiryou","kinen","yakan","fuukei","kairou"], "s:city-history"),
 ("697-urban-environment","urban environment","697-urban-environment",G,
  ["osen","risou","mirai","genzai","tennen"], "s:urban-environment"),
 ("698-mobility-debate","mobility debate","698-mobility-debate",G,
  ["mobiriti","jidousha","koukou2","shuppatsu","touchaku"], "g:ja.grammar.b2-to-itte"),
 ("699-public-safety","public safety","699-public-safety",G,
  ["bouhan","keibi","touban","mimamori","youjin"], "s:public-safety"),
]

def unit_yaml(topic, uid, goal, words, newitem):
    lex = [f"ja.lex.urban2.{w}" for w in words]
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

print("batch65 written")
