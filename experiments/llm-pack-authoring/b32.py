#!/usr/bin/env python3
"""ja-JP batch 32: B1 units 370-379 (comparison-debate part 1)."""
import json, os

R = "languages/ja-JP"
SRC = ["jf-standard", "ai-drafted-extension"]
NOTE = ("Framework-level sourcing only (JF Standard reference, no descriptor text copied); "
        "a dictionary/reviewer source must be added before verified status.")
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-04", "notes": "ai-assisted draft wording; qualified review pending."}

WORDS = [
 ("hyoka","ひょうか","noun","evaluation"),
 ("hiyou","ひよう","noun","cost"),
 ("yoto","よとう","noun","party"),
 ("yuryo","ゆうりょう","na-adjective","excellent"),
 ("koryo","こうりょう","na-adjective","talented"),
 ("kansa","かんさ","noun","observation"),
 ("kenko","けんこう","na-adjective","healthy"),
 ("kenkyu","けんきゅう","noun","study"),
 ("kento","けんと","noun","hardship"),
 ("kaishaku","かいしゃく","noun","interpretation"),
 ("jundo","じゅんどう","noun","order"),
 ("rankingu","ランキング","noun","ranking"),
 ("jissai","じつさい","noun","facts"),
 ("shojitsu","しょうじつ","noun","truth"),
 ("kenbutsu","けんぶつ","noun","sightseeing"),
 ("ronsou","そうさう","noun","discussion"),
 ("hifun","ひふん","noun","criticism"),
 ("fusan","ふさん","noun","negation"),
 ("jiyu","じゆう","na-adjective","free"),
 ("kiso","きそ","noun","base"),
 ("yuui","ゆうい","noun","superiority"),
 ("retsu","れつ","noun","row"),
 ("joretsu","じょれつ","na-adjective","inferior"),
 ("saikou","さいこう","noun","highest"),
 ("saiaku","さいあく","noun","worst"),
 ("ichiban","いちばん","noun","number one"),
 ("goukei","ごうけい","noun","total"),
 ("zenshou","ぜんしょう","noun","previous chapter"),
 ("mottomo","もっとも","adverb","most"),
 ("ruiji","るいじ","noun","similarity"),
 ("hannou","はんのう","noun","reaction"),
 ("taiou","たいおう","noun","correspondence"),
 ("kentei","けんてい","noun","examination"),
 ("kyotsu","きょうつう","noun","commonality"),
 ("tenkai","てんかい","noun","development"),
 ("meiwaku","めいわく","na-adjective","troublesome"),
 ("ronzetsu","ろんせつ","noun","argument"),
 ("shutten","しゅってん","noun","point of discussion"),
 ("gimon","ぎもん","noun","doubt"),
 ("ippan","いっぱん","na-adjective","general"),
 ("tokui","とくい","na-adjective","good at"),
 ("unmei","うんめい","noun","fate"),
 ("kika","きか","noun","mechanism"),
 ("riyuu","りゆう","noun","reason"),
 ("koushin","こうしん","noun","update"),
 ("koukan","こうかん","noun","exchange"),
 ("kairyou2","かいりょう","noun","improvement"),
 ("ketsuron2","けつろん","noun","conclusion"),
 ("saisho2","さいしょ","noun","first"),
 ("saigo2","さいご","noun","last"),
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

with open(os.path.join(R, "lexicon", "debate.jsonl"), "w") as f:
    for rid, kana, pos, gloss in WORDS:
        f.write(json.dumps(entry("debate", rid, kana, pos, gloss, "debate"), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ja.grammar.b1.ni-yori", "name": "〜より (comparison)", "category": "syntax",
  "definition": "より marks the standard of comparison: これ の ほうが あれ より いい. Draft definition pending review."},
 {"id": "ja.grammar.b1.shitsumon-ni-kotae", "name": "質問に答える (answering questions)", "category": "pragmatics",
  "definition": "に答える answers a question or point: しゅってん に こたえます. Draft definition pending review."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("product-review","ひょうか を てがみに かきました。","hyoka wo tegami ni kakimashita.","I wrote the evaluation in a letter.",["ひょうか"]),
 ("service-compare","ひよう を ひかく しました。","hiyou wo hikaku shimashita.","I compared the costs.",["ひよう"]),
 ("pros-cons","ゆうりょう な ところ と けんこう な ところ を かきました。","yuuryou na tokoro to kenkou na tokoro wo kakimashita.","I wrote the excellent and healthy points.",["ゆうりょう"]),
 ("explain-choice","じゆう に えらびました。","jiyuu ni erabimashita.","I chose freely.",["じゆう"]),
 ("ranking-reasons","ランキング の じゅんじょ を おしえました。","rankingu no junjo wo oshiemashita.","I taught the order of the ranking.",["ランキング"]),
 ("debate-basics","ろんせつ を はなしました。","ronsetsu wo hanashimashita.","I spoke the argument.",["ろんせつ"]),
 ("use-evidence","じつさい を しらべました。","jissai wo shirabemashita.","I investigated the facts.",["じつさい"]),
 ("counter-argue","ぎもん を はなしました。","gimon wo hanashimashita.","I voiced the doubt.",["ぎもん"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, romaji, gloss, cloze in SENTS:
        e = {"id": f"ja.sent.{sid}", "status": "draft", "text": text, "reading": text,
             "romaji": romaji, "gloss": gloss, "cloze_targets": cloze,
             "sources": SRC, "notes": "ai-assisted draft sentence; qualified review required before verified.",
             "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

ASSESS = {"id": "ja.assess.comparison-debate", "goal_id": "ja.goal.b1.comparison-debate",
          "kind": "transfer", "modality": "interaction",
          "rubric": {"scale": "observed", "criteria": [
              "compare options with reasons and rank them with justification",
              "present an argument, use evidence, and answer counter-arguments without blocking errors"]},
          "review_status": "draft"}
with open(os.path.join(R, "assessments", "definitions.jsonl"), "a") as f:
    f.write(json.dumps(ASSESS, ensure_ascii=False) + "\n")

U = [
 ("370-product-reviews","product reviews","product-reviews","ja.goal.b1.comparison-debate",
  ["hyoka","hiyou","yoto","yuryo","koryo"], "s:product-review"),
 ("371-service-comparison","service comparison","service-comparison","ja.goal.b1.comparison-debate",
  ["kansa","kenko","kenkyu","kento","kaishaku"], "s:service-compare"),
 ("372-pros-and-cons","pros and cons","pros-and-cons","ja.goal.b1.comparison-debate",
  ["jundo","rankingu","jissai","shojitsu","kenbutsu"], "s:pros-cons"),
 ("373-explaining-choices","explaining choices","explaining-choices","ja.goal.b1.comparison-debate",
  ["ronsou","hifun","fusan","jiyu","kiso"], "s:explain-choice"),
 ("374-ranking-with-reasons","ranking with reasons","ranking-with-reasons","ja.goal.b1.comparison-debate",
  ["yuui","retsu","joretsu","saikou","saiaku"], "s:ranking-reasons"),
 ("375-debate-basics","debate basics","debate-basics","ja.goal.b1.comparison-debate",
  ["ichiban","goukei","zenshou","mottomo","ruiji"], "s:debate-basics"),
 ("376-using-evidence","using evidence","using-evidence","ja.goal.b1.comparison-debate",
  ["hannou","taiou","kentei","kyotsu","tenkai"], "s:use-evidence"),
 ("377-counter-arguments","counter arguments","counter-arguments","ja.goal.b1.comparison-debate",
  ["meiwaku","ronzetsu","shutten","gimon","ippan"], "s:counter-argue"),
 ("378-conceding-points","conceding points","conceding-points","ja.goal.b1.comparison-debate",
  ["tokui","unmei","kika","riyuu","koushin"], "g:ja.grammar.b1.ni-yori"),
 ("379-writing-conclusions","writing conclusions","writing-conclusions","ja.goal.b1.comparison-debate",
  ["koukan","kairyou2","ketsuron2","saisho2","saigo2"], "g:ja.grammar.b1.shitsumon-ni-kotae"),
]
OLD_SENTS = ["ja.sent.meeting-starts","ja.sent.reply-email","ja.sent.report-address",
             "ja.sent.work-company","ja.sent.interview-prep"]

def unit_yaml(topic, uid, goal, words, newitem):
    lex = [f"ja.lex.debate.{w}" for w in words]
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

print("batch32 written")
