#!/usr/bin/env python3
"""ja-JP batch 76: B2 units 800-807 (relationships-deep tail; plan end)."""
import json, os

R = "languages/ja-JP"
SRC = ["jf-standard", "ai-drafted-extension"]
NOTE = ("Framework-level sourcing only (JF Standard reference, no descriptor text copied); "
        "a dictionary/reviewer source must be added before verified status.")
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-05", "notes": "ai-assisted draft wording; qualified review pending."}

W = [
 ("yuuutsu","ゆううつ","na-adjective","dejected"),
 ("hankan","はんかん","noun","regret"),
 ("fukki","ふっき","noun","resolution"),
 ("kesshin","けっしん","noun","determination"),
 ("akirame","あきらめ","noun","resignation"),
 ("tsuige","つげ","noun","sorrow"),
 ("namida","なみだ","noun","tears"),
 ("kao2","かお","noun","face"),
 ("kaisi","かいし","noun","reflection"),
 ("hokai","ほうかい","noun","embrace"),
 ("iyashi","いやし","noun","healing"),
 ("omoide2","おもいで","noun","memory"),
 ("sabishii","さびしい","i-adjective","lonely"),
 ("yasashii","やさしい","i-adjective","gentle"),
 ("takai2","たかい","i-adjective","high"),
 ("hikui","ひくい","i-adjective","low"),
 ("fukai2","ふかい","i-adjective","deep"),
 ("asai","あさい","i-adjective","shallow"),
 ("mijikai","みじかい","i-adjective","short"),
 ("nagai","ながい","i-adjective","long"),
 ("hayai","はやい","i-adjective","fast, early"),
 ("osoi","おそい","i-adjective","slow, late"),
 ("tsuyoi","つよい","i-adjective","strong"),
 ("yowai","よわい","i-adjective","weak"),
 ("omoshiroi2","おもしろい","i-adjective","funny"),
 ("tsumaranai","つまらない","i-adjective","boring"),
 ("ureshii","うれしい","i-adjective","glad"),
 ("kanashii","かなしい","i-adjective","sad"),
 ("tanoshii","たのしい","i-adjective","enjoyable"),
 ("kurushii","くるしい","i-adjective","painful"),
 ("kokochiyoi","ここちよい","i-adjective","pleasant"),
 ("kimochi","きもち","noun","feeling"),
 ("kokoro","こころ","noun","heart, mind"),
 ("koryu6","こうりゅう","noun","exchange"),
 ("shinko2","しんこう","noun","trust"),
 ("kaitaku2","かいたく","noun","relief"),
 ("sogo","そうごう","noun","mutual"),
 ("egao","えがお","noun","smile"),
 ("kokan2","こうかん","noun","exchange"),
 ("te3","て","noun","hand"),
 ("ashi2","あし","noun","leg"),
 ("mune2","むね","noun","chest"),
 ("inochi","いのち","noun","life"),
 ("sekai","せかい","noun","world"),
 ("chiiki","ちいき","noun","community"),
 ("taiwa2","たいわ","noun","dialogue"),
 ("rikai2","りかい","noun","understanding"),
 ("shimpei","しんぺい","na-adjective","fair, equitable"),
 ("yujo2","ゆうじょう","noun","friendship"),
 ("chieki","ちえき","noun","wisdom"),
]
assert len(W) == 50

def entry(rid, kana, pos, gloss):
    return {"id": f"ja.lex.rel2.{rid}", "status": "draft",
            "forms": [{"text": kana, "script": "hiragana", "is_primary": True}],
            "readings": [{"text": kana, "script": "hiragana"},
                         {"text": rid, "transliteration_system": "modified-hepburn"}],
            "glosses": {"en-US": [gloss]}, "part_of_speech": pos,
            "registers": ["ja.register.neutral-common"], "semantic_tags": ["relationships"],
            "sources": SRC, "notes": NOTE, "generation": GEN}

with open(os.path.join(R, "lexicon", "rel2.jsonl"), "w") as f:
    for rid, kana, pos, gloss in W:
        f.write(json.dumps(entry(rid, kana, pos, gloss), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ja.grammar.b2-ni-oujite-iru", "name": "〜に応じている (responding to)", "category": "syntax",
  "definition": "に応じている responds to a situation: じょうきょう に 応じて かえる. Draft definition pending review."},
 {"id": "ja.grammar.b2-wake-ni-wa-ikenai2", "name": "〜わけにはいかない2 (cannot)", "category": "syntax",
  "definition": "わけにはいかない2 marks social impossibility: わすれる わけ には いかない. Draft definition pending review."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("vulnerability-trust","しんこう は ちいさな きもち から はじまります。","shinkou wa chiisana kimochi kara hajimarimasu.","Trust begins with small feelings.",["しんこう"]),
 ("forgiveness-process","はんかん を はなす のは くるしい です。","hankan wo hanasu no wa kurushii desu.","Speaking of regret is painful.",["はんかん"]),
 ("relationship-transitions","いのち の なか で かんけい が かわります。","inochi no naka de kankei ga kawarimasu.","Relationships change within a life.",["いのち"]),
 ("loss-and-grief","なみだ が でる とき が あります。","namida ga deru toki ga arimasu.","There are times when tears come.",["なみだ"]),
 ("community-belonging","ちいき の なか で きもち が やすらぎます。","chiiki no naka de kimochi ga yasuragimasu.","Inside the community my heart settles.",["ちいき"]),
 ("cross-cultural-friendship","こくさい の ともだち と こうりゅう を します。","kokusai no tomodachi to kouryuu wo shimasu.","I exchange with international friends.",["こうりゅう"]),
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

RELG = "ja.goal.b2.relationships-deep"
U = [
 ("800-vulnerability-trust","vulnerability trust","800-vulnerability-trust",RELG,"rel2",
  ["shinko2","kimochi","kokoro","sabishii","yasashii"], "s:vulnerability-trust"),
 ("801-forgiveness-process","forgiveness process","801-forgiveness-process",RELG,"rel2",
  ["hankan","fukki","kesshin","akirame","tsuige"], "s:forgiveness-process"),
 ("802-relationship-transitions","relationship transitions","802-relationship-transitions",RELG,"rel2",
  ["kaisi","hokai","iyashi","inochi","sekai"], "s:relationship-transitions"),
 ("803-loss-and-grief","loss and grief","803-loss-and-grief",RELG,"rel2",
  ["namida","egao","kao2","te3","ashi2"], "s:loss-and-grief"),
 ("804-community-belonging","community belonging","804-community-belonging",RELG,"rel2",
  ["chiiki","koryu6","sogo","taiwa2","kokan2"], "s:community-belonging"),
 ("805-cross-cultural-friendship","cross-cultural friendship","805-cross-cultural-friendship",RELG,"rel2",
  ["rikai2","shimpei","yujo2","kaitaku2","mune2"], "s:cross-cultural-friendship"),
 ("806-relationship-reflection","relationship reflection","806-relationship-reflection",RELG,"rel2",
  ["ureshii","kanashii","tanoshii","kurushii","kokochiyoi"], "g:ja.grammar.b2-ni-oujite-iru"),
 ("807-wisdom-essay","wisdom essay","807-wisdom-essay",RELG,"rel2",
  ["chieki","fukai2","asai","nagai","hayai"], "g:ja.grammar.b2-wake-ni-wa-ikenai2"),
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

print("batch76 written")
