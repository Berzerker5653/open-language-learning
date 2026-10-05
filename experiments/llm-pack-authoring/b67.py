#!/usr/bin/env python3
"""ja-JP batch 67: B2 units 710-719 (environment tail + language-linguistics start)."""
import json, os

R = "languages/ja-JP"
SRC = ["jf-standard", "ai-drafted-extension"]
NOTE = ("Framework-level sourcing only (JF Standard reference, no descriptor text copied); "
        "a dictionary/reviewer source must be added before verified status.")
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-05", "notes": "ai-assisted draft wording; qualified review pending."}

ENV = [
 ("shakai-kinou","しゃかいきのう","noun","social responsibility"),
 ("jigyounushi","じぎょうぬし","noun","business owner"),
 ("kessan2","けっさん","noun","settlement, accounts"),
 ("fuyou","ふよう","noun","need, necessity"),
 ("kyousei2","きょうせい","noun","compulsion, obligation"),
 ("kokusai-kyoutei","こくさいきょうてい","noun","international agreement"),
 ("kansa2","かんさ","noun","observation, monitoring"),
 ("jissou","じっそう","noun","implementation"),
 ("sonohoka","そのほか","noun","others, the rest"),
 ("chiiki","ちいき","noun","region, district"),
 ("kankyou-mondai","かんきょうもんだい","noun","environmental problem"),
 ("seikatsu-fushuu","せいかつふしゅう","noun","living expenses"),
 ("kenso","けんそ","noun","modesty, humility"),
 ("heiki","へいき","na-adjective","indifferent, unconcerned"),
 ("ikou","いこう","noun","conduct, behavior"),
 ("yoho","ようほう","noun","method, way of doing"),
 ("keikai","けいかい","noun","alarm, vigilance"),
 ("yoka","ようか","noun","effect, influence"),
 ("muda","むだ","noun","futility, waste"),
 ("hosei","ほうせい","noun","regulation, correction"),
 ("koyou","こよう","noun","employment"),
 ("unnei","うんえい","noun","operation, running"),
 ("moto","もと","noun","origin, source"),
 ("yueki","ゆうえき","noun","profit, benefit"),
 ("shouhi","しょうひ","noun","consumption"),
 ("kyougi","きょうぎ","noun","opposition"),
 ("tadashii","ただしい","i-adjective","correct, just"),
 ("kenpou","けんぽう","noun","constitution"),
 ("kyotsuu","きょうつう","na-adjective","common, shared"),
 ("shiji","しじ","noun","support"),
 ("kison","きそん","noun","respect"),
 ("gensoku","げんそく","noun","principle, rule"),
 ("fuhou","ふほう","noun","unfairness"),
 ("seigi","せいぎ","noun","justice"),
 ("gimu","ぎむ","noun","duty, obligation"),
 ("yosei","ようせい","noun","request, petition"),
 ("gijutsu2","ぎじゅつ","noun","technology, technique"),
 ("kaken","かけん","noun","danger, risk"),
 ("sonae","そなえ","noun","preparation, readiness"),
 ("zeikin","ぜいきん","noun","tax, duty"),
]
LING = [
 ("gengogaku","げんごがく","noun","linguistics"),
 ("goin","ごい","noun","vocabulary, words"),
 ("onin","おんいん","noun","sound, phoneme"),
 ("shiteki","してき","noun","point, mark"),
 ("inron","いんろん","noun","phonology, sound theory"),
 ("bunpou2","ぶんぽう","noun","grammar"),
 ("goihon","ごほん","noun","dictionary, vocabulary book"),
 ("hatsuon","はつおん","noun","pronunciation"),
 ("akusento","あくせんと","noun","accent"),
 ("hoki","ほうき","noun","writing system, notation"),
]
assert len(ENV) == 40 and len(LING) == 10

def entry(shard, rid, kana, pos, gloss, tag):
    return {"id": f"ja.lex.{shard}.{rid}", "status": "draft",
            "forms": [{"text": kana, "script": "hiragana", "is_primary": True}],
            "readings": [{"text": kana, "script": "hiragana"},
                         {"text": rid, "transliteration_system": "modified-hepburn"}],
            "glosses": {"en-US": [gloss]}, "part_of_speech": pos,
            "registers": ["ja.register.neutral-common"], "semantic_tags": [tag],
            "sources": SRC, "notes": NOTE, "generation": GEN}

with open(os.path.join(R, "lexicon", "env4.jsonl"), "w") as f:
    for rid, kana, pos, gloss in ENV:
        f.write(json.dumps(entry("env4", rid, kana, pos, gloss, "environment"), ensure_ascii=False) + "\n")
with open(os.path.join(R, "lexicon", "ling.jsonl"), "w") as f:
    for rid, kana, pos, gloss in LING:
        f.write(json.dumps(entry("ling", rid, kana, pos, gloss, "language"), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ja.grammar.b2-hazu-da", "name": "〜はずだ (should be, expected)", "category": "syntax",
  "definition": "はずだ marks expectation: じっそう の はず だ. Draft definition pending review."},
 {"id": "ja.grammar.b2-to-naruto", "name": "〜となると (when it comes to)", "category": "syntax",
  "definition": "となると narrows to a topic: はつおん と となると べんきょう が ひつよう. Draft definition pending review."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("corporate-responsibility","しゃかい きのう の ぎろん を しました。","shakai kinou no giron wo shimashita.","We discussed social responsibility.",["きのう"]),
 ("international-agreements","こくさい きょうてい の じっそう を はなしました。","kokusai kyoutei no jissou wo hanashimashita.","We talked about implementing the international agreement.",["きょうてい"]),
 ("local-environment","ちいき の かんきょう もんだい を ぎろん しました。","chiiki no kankyou mondai wo giron shimashita.","We discussed a local environmental problem.",["ちいき"]),
 ("environmental-justice","せいぎ の もんだい を べんきょう しました。","seigi no mondai wo benkyou shimashita.","I studied the problem of justice.",["せいぎ"]),
 ("risk-and-precaution","かけん の べんきょう を しました。","kaken no benkyou wo shimashita.","I studied the risk.",["かけん"]),
 ("sustainable-business","ぎじゅつ の ゆうえき を ぎろん しました。","gijutsu no yueki wo giron shimashita.","We discussed the benefits of technology.",["ゆうえき"]),
 ("consumption-debate","しょうひ の もんだい を べんきょう しました。","shouhi no mondai wo benkyou shimashita.","I studied the consumption problem.",["しょうひ"]),
 ("language-structure","ぶんぽう の べんきょう を しました。","bunpou no benkyou wo shimashita.","I studied grammar.",["ぶんぽう"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, romaji, gloss, cloze in SENTS:
        e = {"id": f"ja.sent.{sid}", "status": "draft", "text": text, "reading": text,
             "romaji": romaji, "gloss": gloss, "cloze_targets": cloze,
             "sources": SRC, "notes": "ai-assisted draft sentence; qualified review required before verified.",
             "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

ASSESS = {"id": "ja.assess.language-linguistics", "goal_id": "ja.goal.b2.language-linguistics",
          "kind": "transfer", "modality": "interaction",
          "rubric": {"scale": "observed", "criteria": [
              "talk about language structure using taught linguistics vocabulary",
              "discuss pronunciation or grammar without blocking errors"]},
          "review_status": "draft"}
with open(os.path.join(R, "assessments", "definitions.jsonl"), "a") as f:
    f.write(json.dumps(ASSESS, ensure_ascii=False) + "\n")

GOAL_YAML = """  - id: ja.goal.b2.language-linguistics
    description: 'Discuss language itself: grammar, sounds, vocabulary, and writing.'
    band: B2
    framework_refs: []
    contexts:
    - ja.situation.classroom
    modalities:
    - listening
    - speaking
    - reading
    - writing
    prerequisites:
    - target: ja.goal.b2.academic-skills
      dimension: grammar-controlled
      required_state: independent
      strength: hard
    required_concepts:
    - ja.lex.ling.gengogaku
    - ja.lex.ling.bunpou2
    assessment_ids:
    - ja.assess.language-linguistics
    transfer_required: true
    sources:
    - jf-standard
    - ai-drafted-extension
    review_status: draft
    generation:
      method: ai-assisted
      tool: omp
      model: strata/qwen3.8-flash-next-iq3_s
      date: '2026-10-05'
"""
with open(os.path.join(R, "curriculum", "goals.yaml"), "a") as f:
    f.write(GOAL_YAML)

DEP = """- from: ja.goal.b2.language-linguistics
  to: ja.goal.b2.academic-skills
  dimension: grammar-controlled
  required_state: independent
  strength: hard
"""
dp = os.path.join(R, "grammar", "dependencies.yaml")
with open(dp) as f:
    dep = f.read()
dep = dep.replace("notes:", DEP + "notes:", 1)
with open(dp, "w") as f:
    f.write(dep)

OLD_SENTS = ["ja.sent.meeting-starts","ja.sent.reply-email","ja.sent.report-address",
             "ja.sent.work-company","ja.sent.interview-prep"]

ENVG = "ja.goal.b2.environment-policy"
LINGG = "ja.goal.b2.language-linguistics"
U = [
 ("710-corporate-responsibility","corporate responsibility","710-corporate-responsibility",ENVG,"env4",
  ["shakai-kinou","jigyounushi","kessan2","fuyou","kyousei2"], "s:corporate-responsibility"),
 ("711-international-agreements","international agreements","711-international-agreements",ENVG,"env4",
  ["kokusai-kyoutei","kansa2","jissou","sonohoka","chiiki"], "s:international-agreements"),
 ("712-local-environment","local environment","712-local-environment",ENVG,"env4",
  ["kankyou-mondai","seikatsu-fushuu","kenso","heiki","ikou"], "s:local-environment"),
 ("713-environmental-justice","environmental justice","713-environmental-justice",ENVG,"env4",
  ["yoho","keikai","yoka","zeikin","hosei"], "s:environmental-justice"),
 ("714-risk-and-precaution","risk and precaution","714-risk-and-precaution",ENVG,"env4",
  ["koyou","unnei","moto","yueki","shouhi"], "s:risk-and-precaution"),
 ("715-sustainable-business","sustainable business","715-sustainable-business",ENVG,"env4",
  ["kyougi","tadashii","kenpou","kyotsuu","shiji"], "s:sustainable-business"),
 ("716-consumption-debate","consumption debate","716-consumption-debate",ENVG,"env4",
  ["kison","gensoku","fuhou","seigi","gimu"], "s:consumption-debate"),
 ("717-policy-essay","policy essay","717-policy-essay",ENVG,"env4",
  ["yosei","gijutsu2","kaken","sonae","zeikin"], "g:ja.grammar.b2-hazu-da"),
 ("718-language-structure","language structure","718-language-structure",LINGG,"ling",
  ["gengogaku","goin","bunpou2","goihon","hoki"], "s:language-structure"),
 ("719-sound-systems","sound systems","719-sound-systems",LINGG,"ling",
  ["onin","shiteki","inron","hatsuon","akusento"], "g:ja.grammar.b2-to-naruto"),
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

print("batch67 written")
