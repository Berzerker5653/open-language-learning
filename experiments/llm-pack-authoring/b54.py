#!/usr/bin/env python3
"""ja-JP batch 54: B2 units 580-589 (global-issues)."""
import json, os

R = "languages/ja-JP"
SRC = ["jf-standard", "ai-drafted-extension"]
NOTE = ("Framework-level sourcing only (JF Standard reference, no descriptor text copied); "
        "a dictionary/reviewer source must be added before verified status.")
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-04", "notes": "ai-assisted draft wording; qualified review pending."}

WORDS = [
 ("mushou","free trade","n","free trade"),
 ("zei2","tariff","n","tariff"),
 ("boeki","trade","n","trade"),
 ("kyoutei","agreement","n","agreement"),
 ("kuiki","region","n","region, bloc"),
 ("kokuren","UN","n","UN"),
 ("kyouryoku","authority","n","authority, power"),
 ("choukai2","negotiation","n","negotiation"),
 ("kyousei3","ceasefire","n","ceasefire"),
 ("heiwa","peace","n","peace"),
 ("fukushi2","welfare2","n","public welfare"),
 ("kenkou2","health","n","health"),
 ("byouki","disease","n","disease"),
 ("yobo","vaccination","n","vaccination, prevention"),
 ("pandemic","pandemic","n","pandemic"),
 ("hakken","discovery","n","discovery"),
 ("kaihatsu3","development2","n","development"),
 ("fukyu4","poverty","n","poverty"),
 ("kizon","survival","n","survival, existence"),
 ("koho","information dissemination","n","information, publicity"),
 ("hodo","news reporting","n","news reporting"),
 ("shuppan","publication","n","publication"),
 ("denshin","transmission","n","transmission, broadcasting"),
 ("hatten3","developing","adj-na","developing"),
 ("fukkyuu2","recovery","n","recovery"),
 ("mokuhyou","goal","n","goal, target"),
 ("sanka3","participation2","n","participation"),
 ("kyousai","cooperation2","n","cooperation, mutual aid"),
 ("josei","support","n","financial support"),
 ("bunkou2","exchange","n","cultural exchange"),
 ("ryugaku","study abroad","n","study abroad"),
 ("kouryu","exchange2","n","exchange"),
 ("housou2","broadcast","n","broadcast"),
 ("tsuushin2","communication","n","communication"),
 ("chousei","adjustment","n","adjustment, reconciliation"),
 ("aisou","conflict","n","conflict"),
 ("kaitai","resolution","n","resolution"),
 ("nanmin","refugee","n","refugee"),
 ("juutaku","residence","n","residence, asylum"),
 ("nyukan","entry","n","entry, admission"),
 ("ryuukou","travel","n","travel"),
 ("tsuuka","currency","n","currency"),
 ("kokumin","citizen","n","citizen"),
 ("kyoudou","joint","adj-na","joint, common"),
 ("gijutsu2","technology","n","technology"),
 ("yusei","priority","n","priority"),
 ("kangae","idea","n","idea, thought"),
 ("kankaku","sensitivity","n","sensitivity, awareness"),
 ("gaikoku","foreign country","n","foreign country"),
 ("katei2","household2","n","household"),
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

with open(os.path.join(R, "lexicon", "global.jsonl"), "w") as f:
    for rid, kana, pos, gloss in WORDS:
        f.write(json.dumps(entry("global", rid, kana, pos, gloss, "global"), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ja.grammar.b2.ni-jou-shite", "name": "〜において (in, with respect to)", "category": "syntax",
  "definition": "において marks a domain: せかい において けいざい が かわれた. Draft definition pending review."},
 {"id": "ja.grammar.b2.dake-no-hanwa", "name": "〜はもちろん (let alone)", "category": "syntax",
  "definition": "はもちろん scales from obvious to extreme: えいご はもちろん にほんご も べんきょう した. Draft definition pending review."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("globalization-debate","ぼうえき の きじ を よみました。","boeki no kiji wo yomimashita.","I read the trade article.",["ぼうえき"]),
 ("trade-systems","こうりゅう の きじ を よみました。","kouryu no kiji wo yomimashita.","I read the exchange article.",["こうりゅう"]),
 ("migration-global","りゅうこう の じょうほう を あつめました。","ryuukou no jouhou wo atsumemashita.","I gathered travel information.",["りゅうこう"]),
 ("climate-diplomacy","へいわ の ぎろん を べんきょう しました。","heiwa no giron wo benkyou shimashita.","I studied the peace debate.",["へいわ"]),
 ("global-health","けんこう の べんきょう を しました。","kenkou no benkyou wo shimashita.","I studied health.",["けんこう"]),
 ("development-goals","もくひょう について かきました。","mokuhyou ni tsuite kakimashita.","I wrote about the goals.",["もくひょう"]),
 ("cultural-exchange","りゅうがく の はなし を ききました。","ryugaku no hanashi wo kikimashita.","I heard the study-abroad talk.",["りゅうがく"]),
 ("conflict-resolution","こうしょう の ほうほう を べんきょう しました。","koushou no houhou wo benkyou shimashita.","I studied the negotiation method.",["こうしょう"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, romaji, gloss, cloze in SENTS:
        e = {"id": f"ja.sent.{sid}", "status": "draft", "text": text, "reading": text,
             "romaji": romaji, "gloss": gloss, "cloze_targets": cloze,
             "sources": SRC, "notes": "ai-assisted draft sentence; qualified review required before verified.",
             "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

ASSESS = {"id": "ja.assess.global-issues", "goal_id": "ja.goal.b2.global-issues",
          "kind": "transfer", "modality": "interaction",
          "rubric": {"scale": "observed", "criteria": [
              "discuss trade, diplomacy, health, and migration with precise vocabulary",
              "describe a global issue and a proposed response without blocking errors"]},
          "review_status": "draft"}
with open(os.path.join(R, "assessments", "definitions.jsonl"), "a") as f:
    f.write(json.dumps(ASSESS, ensure_ascii=False) + "\n")

GOAL_YAML = """  - id: ja.goal.b2.global-issues
    description: 'Discuss global issues: trade, diplomacy, health, migration, and exchange.'
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
    - target: ja.goal.b2.society-change
      dimension: grammar-controlled
      required_state: independent
      strength: hard
    required_concepts:
    - ja.lex.global.boeki
    - ja.lex.global.kokuren
    assessment_ids:
    - ja.assess.global-issues
    transfer_required: true
    sources:
    - jf-standard
    - ai-drafted-extension
    review_status: draft
    generation:
      method: ai-assisted
      tool: omp
      model: strata/qwen3.8-flash-next-iq3_s
      date: '2026-10-04'
"""
with open(os.path.join(R, "curriculum", "goals.yaml"), "a") as f:
    f.write(GOAL_YAML)

DEP = """- from: ja.goal.b2.global-issues
  to: ja.goal.b2.society-change
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

U = [
 ("580-globalization-debate","globalization debate","globalization-debate",
  ["mushou","zei2","boeki","kyoutei","kuiki"], "s:globalization-debate"),
 ("581-trade-systems","trade systems","trade-systems",
  ["tsuuka","kouryu","josei","hatten3","fukkyuu2"], "s:trade-systems"),
 ("582-migration-global","global migration","migration-global",
  ["nanmin","juutaku","nyukan","ryuukou","kokumin"], "s:migration-global"),
 ("583-climate-diplomacy","climate diplomacy","climate-diplomacy",
  ["kokuren","kyouryoku","chousei","heiwa","kyoudou"], "s:climate-diplomacy"),
 ("584-global-health","global health","global-health",
  ["kenkou2","byouki","yobo","pandemic","kaihatsu3"], "s:global-health"),
 ("585-development-goals","development goals","development-goals",
  ["mokuhyou","fukyu4","kizon","katei2","kyousai"], "s:development-goals"),
 ("586-cultural-exchange","cultural exchange","cultural-exchange",
  ["bunkou2","ryugaku","kangae","sanka3","gaikoku"], "s:cultural-exchange"),
 ("587-media-global","global media","media-global",
  ["koho","hodo","shuppan","denshin","housou2"], "g:ja.grammar.b2.ni-jou-shite"),
 ("588-conflict-resolution","conflict resolution","conflict-resolution",
  ["choukai2","kyousei3","aisou","kaitai","tsuushin2"], "s:conflict-resolution"),
 ("589-refugee-policy","refugee policy","refugee-policy",
  ["hakken","fukushi2","gijutsu2","yusei","kankaku"], "g:ja.grammar.b2.dake-no-hanwa"),
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
        f.write(unit_yaml(topic, uid, "ja.goal.b2.global-issues", "global", words, newitem))

print("batch54 written")
