#!/usr/bin/env python3
"""ja-JP batch 53: B2 units 570-579 (education-pedagogy tail)."""
import json, os

R = "languages/ja-JP"
SRC = ["jf-standard", "ai-drafted-extension"]
NOTE = ("Framework-level sourcing only (JF Standard reference, no descriptor text copied); "
        "a dictionary/reviewer source must be added before verified status.")
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-04", "notes": "ai-assisted draft wording; qualified review pending."}

WORDS = [
 ("gijutsu-kyouiku","tech in education","n","educational technology"),
 ("taburetto","tablet","n","tablet"),
 ("onrain","online","adj-na","online"),
 ("digital","digital","adj-na","digital"),
 ("anzen","safety","n","safety"),
 ("shokubun","professionalism","n","professionalism"),
 ("kyoushoku","teaching profession","n","teaching profession"),
 ("shumoku","vocation","n","vocation, occupation"),
 ("jitsuryoku","practical ability","n","practical ability"),
 ("saishin","latest","adj-na","latest"),
 ("jiritsu","autonomy","n","autonomy"),
 ("jikaku","awareness","n","awareness"),
 ("senkousei","priorities","n","priorities"),
 ("tokucho","characteristics","n","characteristics"),
 ("saisei","rebirth","n","rebirth, renewal"),
 ("youji","infancy","n","infancy"),
 ("hoiku","childcare","n","childcare"),
 ("enji","kindergarten","n","kindergarten"),
 ("shogaigaku","elementary school","n","elementary school"),
 ("koutou-gakko","high school","n","high school"),
 ("kenkyusei","graduate student","n","graduate student"),
 ("shakaijin","working adult","n","working adult"),
 ("shuushoku","employment","n","employment, job hunting"),
 ("kunren","training","n","training"),
 ("jitsugyo","practicum","n","practicum"),
 ("menta","mentor","n","mentor"),
 ("byoudou","equity","n","equity"),
 ("kyousei2","disadvantage","n","disadvantage"),
 ("hogosha","guardian","n","guardian"),
 ("oya","parent","n","parent"),
 ("kokusai","international","adj-na","international"),
 ("bunkachi","cultural value","n","cultural value"),
 ("koutei","process","n","process, curriculum"),
 ("kuni","nation","n","nation"),
 ("seisaku","policy","n","policy"),
 ("hiyou","expenditure","n","expenditure"),
 ("zentai","overall","adj-na","overall"),
 ("koudou","behavior","n","behavior"),
 ("kokugo","national language","n","national language"),
 ("gaikokugo","foreign language","n","foreign language"),
 ("eigo","English","n","English"),
 ("gakai","outside school","n","outside school"),
 ("nai","inside","n","inside"),
 ("seikyu","demand","n","demand, request"),
 ("kibou","expectation","n","expectation, hope"),
 ("yakuwari","role","n","role, part"),
 ("tantousha","person in charge","n","person in charge"),
 ("kyouiku-houritsu","education law","n","education law"),
 ("kurabu","club","n","club"),
 ("chugaku","middle school","n","middle school"),
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

with open(os.path.join(R, "lexicon", "edu4.jsonl"), "w") as f:
    for rid, kana, pos, gloss in WORDS:
        f.write(json.dumps(entry("edu4", rid, kana, pos, gloss, "education"), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ja.grammar.b2.ni-kanren-shite", "name": "〜に関連して (in relation to)", "category": "syntax",
  "definition": "に関連して marks relation: ぶんか にかんして とうろん した. Draft definition pending review."},
 {"id": "ja.grammar.b2.ni-kagiri", "name": "〜に限る (as far as, limited to)", "category": "syntax",
  "definition": "に限る bounds a scope: べんきょう に かぎって じかん を つかう. Draft definition pending review."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("technology-in-class","おんらいんの べんきょう を しました。","onrain no benkyou wo shimashita.","I studied online.",["おんらいん"]),
 ("teacher-roles","しょくぶんの はなし を ききました。","shokubun no hanashi wo kikimashita.","I heard the professionalism talk.",["しょくぶん"]),
 ("student-agency","じりつの たいど を べんきょう しました。","jiritsu no taido wo benkyou shimashita.","I studied the autonomy attitude.",["じりつ"]),
 ("early-childhood","ようじ の じょうほう を あつめました。","youji no jouhou wo atsumemashita.","I gathered information on infancy.",["ようじ"]),
 ("higher-education-future","しゅうしょく の べんきょう を しました。","shuushoku no benkyou wo shimashita.","I studied employment.",["しゅうしょく"]),
 ("vocational-training","くんれん の ほうほう を べんきょう しました。","kunren no houhou wo benkyou shimashita.","I studied the training method.",["くんれん"]),
 ("equity-in-schools","びょうどう の もんだい を ぎろん しました。","byoudou no mondai wo giron shimashita.","We debated the equity problem.",["びょうどう"]),
 ("parent-involvement","ほごしゃ の かいぎ に でました。","hogosha no kaigi ni demashita.","I attended the guardians' meeting.",["ほごしゃ"]),
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
 ("570-technology-in-class","technology in class","technology-in-class",
  ["gijutsu-kyouiku","taburetto","onrain","digital","anzen"], "s:technology-in-class"),
 ("571-teacher-roles","teacher roles","teacher-roles",
  ["shokubun","kyoushoku","shumoku","menta","yakuwari"], "s:teacher-roles"),
 ("572-student-agency","student agency","student-agency",
  ["jiritsu","jikaku","senkousei","koudou","kibou"], "s:student-agency"),
 ("573-early-childhood","early childhood","early-childhood",
  ["youji","hoiku","enji","shogaigaku","chugaku"], "s:early-childhood"),
 ("574-higher-education-future","higher education future","higher-education-future",
  ["koutou-gakko","kenkyusei","shakaijin","shuushoku","saishin"], "s:higher-education-future"),
 ("575-vocational-training","vocational training","vocational-training",
  ["kunren","jitsugyo","jitsuryoku","koutei","tokucho"], "s:vocational-training"),
 ("576-equity-in-schools","equity in schools","equity-in-schools",
  ["byoudou","kyousei2","seikyu","zentai","kuni"], "s:equity-in-schools"),
 ("577-parent-involvement","parent involvement","parent-involvement",
  ["hogosha","oya","gakai","nai","tantousha"], "s:parent-involvement"),
 ("578-global-comparison","global comparison","global-comparison",
  ["kokusai","bunkachi","kokugo","gaikokugo","eigo"], "g:ja.grammar.b2.ni-kanren-shite"),
 ("579-education-essay","education essay","education-essay",
  ["seisaku","hiyou","kyouiku-houritsu","kurabu","saisei"], "g:ja.grammar.b2.ni-kagiri"),
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
        f.write(unit_yaml(topic, uid, "ja.goal.b2.education-pedagogy", "edu4", words, newitem))

print("batch53 written")
