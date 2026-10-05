#!/usr/bin/env python3
"""ja-JP batch 28: B1 units 330-339 (travel-extended goal complete)."""
import json, os

R = "languages/ja-JP"
SRC = ["jf-standard", "ai-drafted-extension"]
NOTE = ("Framework-level sourcing only (JF Standard reference, no descriptor text copied); "
        "a dictionary/reviewer source must be added before verified status.")
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-04", "notes": "ai-assisted draft wording; qualified review pending."}

WORDS = [
 ("hikou-min","ひこうみん","noun","evacuee"),
 ("bouhan","ぼうはん","noun","crime prevention"),
 ("chui","ちゅうい","noun","caution"),
 ("kiki","きき","noun","danger"),
 ("tenkan","てんかん","noun","transfer"),
 ("nyuukoku","にゅうこく","noun","entry (country)"),
 ("shoumeisho","しょうめいしょ","noun","certificate"),
 ("kyoka-sho","きょうかしょ","noun","permission slip"),
 ("gengo","げんご","noun","language"),
 ("mimai","みまい","noun","inquiry visit"),
 ("kangae","かんがえ","noun","thought"),
 ("yakusoku","やくそく","noun","promise"),
 ("issho","いっしょ","noun","togetherness"),
 ("deai","であい","noun","meeting"),
 ("jibun","じぶん","noun","oneself"),
 ("gaido","がいどう","noun","guided tour"),
 ("meguri","めぐり","noun","sightseeing circuit"),
 ("fuu-kei","ふうけい","noun","scenery"),
 ("kairou","かいろう","noun","corridor"),
 ("daihyou","だいひょう","noun","representative"),
 ("dekake","でかけ","noun","outing"),
 ("sanin","さにん","noun","three people"),
 ("chotto","ちょっと","noun","a little"),
 ("keihaku","けいはく","noun","stay"),
 ("hansei","はんせい","noun","self-reflection"),
 ("wasuremono","わすれもの","noun","forgotten item"),
 ("otoiawase","おといあわせ","noun","inquiry"),
 ("saifu","さいふ","noun","wallet"),
 ("kagi","かぎ","noun","key"),
 ("ochimono","おちもの","noun","lost item"),
 ("ryougae","りょうがえ","noun","currency exchange"),
 ("ryoukin","りょうきん","noun","fare"),
 ("kakaku","かくかく","noun","price"),
 ("nyuuryoku","にゅうりょく","noun","income"),
 ("shishutsu","ししゅつ","noun","expenditure"),
 ("okure","おくれ","noun","delay"),
 ("keikou","けいこう","noun","route"),
 ("teishi","ていし","noun","stop"),
 ("engaki","えんがき","noun","round-trip ticket"),
 ("shuhiki","しゅひき","noun","withdrawal"),
 ("kaisou","かいそう","noun","reflection"),
 ("yaruki","やるき","noun","motivation"),
 ("seichou","せいちょう","noun","growth"),
 ("kaizen","かいぜん","noun","improvement"),
 ("hatsuken","はつけん","noun","discovery"),
 ("hagaki","はがき","noun","postcard"),
 ("egaku","えがく","verb","to draw"),
 ("ryouga","りょうが","noun","currency"),
 ("futsuu","ふつう","noun","normal"),
 ("shirabe","しらべ","noun","investigation"),
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

with open(os.path.join(R, "lexicon", "travel2.jsonl"), "w") as f:
    for rid, kana, pos, gloss in WORDS:
        f.write(json.dumps(entry("travel2", rid, kana, pos, gloss, "travel"), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ja.grammar.b1.te-shimau", "name": "〜てしまう (completion; regret)", "category": "syntax",
  "definition": "てしまう marks completion, often with regret: きップ を なくして しまいました. Draft definition pending review."},
 {"id": "ja.grammar.b1.darou", "name": "〜だろう (conjecture)", "category": "semantics",
  "definition": "だろう is plain conjecture: じょほ は 3じ ごろ につく だろう. Draft definition pending review."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("travel-safety","ぼうはん の ため、まち の ちゅうい を ならいました。","bouhan no tame, machi no chui wo naraimashita.","For crime prevention I learned town safety.",["ちゅうい"]),
 ("border-docs","にゅうこく しょうめいしょ を しゅっしょく しました。","nyuukoku shoumeisho wo shusshoku shimashita.","I presented my entry certificate.",["しょうめいしょ"]),
 ("homestay-letter","ホームステイ の かんがえ を てがみに かきました。","hoomusutei no kangae wo tegami ni kakimashita.","I wrote my homestay thoughts in a letter.",["かんがえ"]),
 ("guided-tour","がいどう で ふうけい を たのしみました。","gaido de fuukei wo tanoshimimashita.","On the guided tour I enjoyed the scenery.",["ふうけい"]),
 ("lost-belongings","さいふ の おちもの は おといあせ で みつかりました。","saifu no ochimono wa otoiase de mitsakarimashita.","The lost wallet was found via the inquiry desk.",["おちもの"]),
 ("travel-budget","りょうがえ で りょうきん を はらいました。","ryougae de ryoukin wo haraimashita.","I paid the fare after currency exchange.",["りょうきん"]),
 ("route-change","でんしゃ の おくれ で きこう が かわりました。","densha no okure de kikou ga kawarimashita.","The route changed due to the train delay.",["おくれ"]),
 ("postcard","はがき に え を かいて だしました。","hagaki ni e wo kaite dashimashita.","I drew on a postcard and sent it.",["はがき"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, romaji, gloss, cloze in SENTS:
        e = {"id": f"ja.sent.{sid}", "status": "draft", "text": text, "reading": text,
             "romaji": romaji, "gloss": gloss, "cloze_targets": cloze,
             "sources": SRC, "notes": "ai-assisted draft sentence; qualified review required before verified.",
             "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

U = [
 ("330-travel-safety","travel safety","travel-safety","ja.goal.b1.travel-extended",
  ["hikou-min","bouhan","chui","kiki","tenkan"], "s:travel-safety"),
 ("331-border-documentation","border documentation","border-documentation","ja.goal.b1.travel-extended",
  ["nyuukoku","shoumeisho","kyoka-sho","gengo","mimai"], "s:border-docs"),
 ("332-homestay-letters","homestay letters","homestay-letters","ja.goal.b1.travel-extended",
  ["kangae","yakusoku","issho","deai","jibun"], "s:homestay-letter"),
 ("333-guided-tours","guided tours","guided-tours","ja.goal.b1.travel-extended",
  ["gaido","meguri","fuu-kei","kairou","daihyou"], "s:guided-tour"),
 ("334-travel-companions","travel companions","travel-companions","ja.goal.b1.travel-extended",
  ["dekake","sanin","chotto","keihaku","hansei"], "g:ja.grammar.b1.te-shimau"),
 ("335-lost-belongings","lost belongings","lost-belongings","ja.goal.b1.travel-extended",
  ["wasuremono","otoiawase","saifu","kagi","ochimono"], "s:lost-belongings"),
 ("336-travel-budgeting","travel budgeting","travel-budgeting","ja.goal.b1.travel-extended",
  ["ryougae","ryoukin","kakaku","nyuuryoku","shishutsu"], "s:travel-budget"),
 ("337-route-changes","route changes","route-changes","ja.goal.b1.travel-extended",
  ["okure","keikou","teishi","engaki","shuhiki"], "s:route-change"),
 ("338-travel-reflection","travel reflection","travel-reflection","ja.goal.b1.travel-extended",
  ["kaisou","yaruki","seichou","kaizen","hatsuken"], "g:ja.grammar.b1.darou"),
 ("339-postcard-writing","postcard writing","postcard-writing","ja.goal.b1.travel-extended",
  ["hagaki","egaku","ryouga","futsuu","shirabe"], "s:postcard"),
]
OLD_SENTS = ["ja.sent.meeting-starts","ja.sent.reply-email","ja.sent.report-address",
             "ja.sent.work-company","ja.sent.interview-prep"]

def unit_yaml(topic, uid, goal, words, newitem):
    lex = [f"ja.lex.travel2.{w}" for w in words]
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

print("batch28 written")
