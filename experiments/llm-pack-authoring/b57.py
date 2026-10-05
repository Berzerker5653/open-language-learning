#!/usr/bin/env python3
"""ja-JP batch 57: B2 units 610-619 (academic-writing + formal-correspondence start)."""
import json, os

R = "languages/ja-JP"
SRC = ["jf-standard", "ai-drafted-extension"]
NOTE = ("Framework-level sourcing only (JF Standard reference, no descriptor text copied); "
        "a dictionary/reviewer source must be added before verified status.")
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-05", "notes": "ai-assisted draft wording; qualified review pending."}

WORDS = [
 ("bouei","ぼうえい","noun","defense"),
 ("kaihen","かいへん","noun","reply, response"),
 ("shinpan","しんぱん","noun","judgment, review"),
 ("tsuuchou","ふうとう","noun","envelope"),
 ("shokan","しょかん","noun","letter, epistle"),
 ("jimusho","じむしょ","noun","office"),
 ("juusho","じゅうしょ","noun","address"),
 ("moushikomi","もうしこみ","noun","application"),
 ("rireki","りれき","noun","résumé, history"),
 ("shikaku","しかく","noun","qualification"),
 ("toujyou","とうじょう","noun","attendance"),
 ("kisai","きさい","noun","listing, entry"),
 ("tsuuchi","つうち","noun","notice"),
 ("kokuho","こうほ","noun","public announcement"),
 ("kiji","きじ","noun","article"),
 ("teikou","ていこう","noun","submission"),
 ("wabi","わび","noun","apology"),
 ("fuman","ふまん","noun","dissatisfaction"),
 ("danwa","だんわ","noun","talk, statement"),
 ("koutei","こうてい","noun","process"),
 ("ketsuron","けつろん","noun","conclusion"),
 ("iken","いけん","noun","opinion"),
 ("koushou","こうしょう","noun","negotiation"),
 ("jouken","じょうけん","noun","condition"),
 ("kakaku","かかく","noun","price"),
 ("torihiki","とりひき","noun","transaction"),
 ("keiyaku","けいやく","noun","contract"),
 ("houshou","ほうしょう","noun","guarantee"),
 ("sonai","そんがい","noun","damage"),
 ("baishou","ばいしょう","noun","compensation"),
 ("seikyu","せいきゅう","noun","claim, billing"),
 ("hanbai","はんばい","noun","sale"),
 ("kyoukyuu","きょうきゅう","noun","supply"),
 ("seihin","せいひん","noun","product"),
 ("shouhin","しょうひん","noun","goods"),
 ("okure","おくれ","noun","delay"),
 ("genin","げんいん","noun","cause"),
 ("kekka","けっか","noun","result"),
 ("nouhin","のうひん","noun","delivery"),
 ("shoukai2","しょうかい","noun","introduction"),
 ("onrei","おれい","noun","thanks"),
 ("guchou","ぐちょう","noun","greeting words"),
 ("aisatsu","あいさつ","noun","greeting"),
 ("irei","れい","noun","etiquette, custom"),
 ("kizukai","きづかい","noun","consideration, thoughtfulness"),
 ("hatsuu","はつゆう","noun","mailing, sending mail"),
 ("mimai","みまい","noun","condolence, inquiry after health"),
 ("gankou","がんこう","noun","year-end"),
 ("chuu","ちゅう","noun","middle, mid-year"),
 ("kaiwa","かいわ","noun","conversation"),
]
assert len(WORDS) == 50, len(WORDS)

def entry(rid, kana, pos, gloss):
    return {"id": f"ja.lex.formal.{rid}", "status": "draft",
            "forms": [{"text": kana, "script": "hiragana", "is_primary": True}],
            "readings": [{"text": kana, "script": "hiragana"},
                         {"text": rid, "transliteration_system": "modified-hepburn"}],
            "glosses": {"en-US": [gloss]}, "part_of_speech": pos,
            "registers": ["ja.register.neutral-common"], "semantic_tags": ["formal"],
            "sources": SRC, "notes": NOTE, "generation": GEN}

with open(os.path.join(R, "lexicon", "formal.jsonl"), "w") as f:
    for rid, kana, pos, gloss in WORDS:
        f.write(json.dumps(entry(rid, kana, pos, gloss), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ja.grammar.b2.moushi-agemasu", "name": "申し上げます (humble say)", "category": "pragmatics",
  "definition": "申し上げます is the humble form used in formal writing: けつろん を もうし あげます. Draft definition pending review."},
 {"id": "ja.grammar.b2-yoroshiku", "name": "よろしくお願いいたします (kind regards)", "category": "pragmatics",
  "definition": "よろしくお願いいたします closes formal letters and emails as a request for continued goodwill. Draft definition pending review."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("thesis-defense","ぼうえい の じゅんび を しました。","bouei no junbi wo shimashita.","I prepared the defense.",["ぼうえい"]),
 ("publication-basics","こうほ の きじ を かきました。","kouho no kiji wo kakimashita.","I wrote the announcement article.",["こうほ"]),
 ("business-letters","しょかん を かきました。","shokan wo kakimashita.","I wrote the letter.",["しょかん"]),
 ("official-notices","つうち を よみました。","tsuuchi wo yomimashita.","I read the notice.",["つうち"]),
 ("application-letters","もうしこみ を だしました。","moushikomi wo dashimashita.","I submitted the application.",["もうしこみ"]),
 ("apology-formal","わび の しょかん を かきました。","wabi no shokan wo kakimashita.","I wrote the apology letter.",["わび"]),
 ("complaint-formal","ふまん を つたえました。","fuman wo tsutaemashita.","I conveyed the dissatisfaction.",["ふまん"]),
 ("negotiation-writing","こうしょう の じょうけん を かきました。","koushou no jouken wo kakimashita.","I wrote the negotiation conditions.",["こうしょう"]),
 ("invitation-formal","ねんじ の みまい を しました。","nenji no mimai wo shimashita.","I made the seasonal greeting visit.",["みまい"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, romaji, gloss, cloze in SENTS:
        e = {"id": f"ja.sent.{sid}", "status": "draft", "text": text, "reading": text,
             "romaji": romaji, "gloss": gloss, "cloze_targets": cloze,
             "sources": SRC, "notes": "ai-assisted draft sentence; qualified review required before verified.",
             "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

ASSESS = [
 {"id": "ja.assess.academic-writing", "goal_id": "ja.goal.b2.academic-writing",
  "kind": "transfer", "modality": "interaction",
  "rubric": {"scale": "observed", "criteria": [
      "defend or summarize a written argument answering supplied questions",
      "describe publication or submission steps without blocking errors"]},
  "review_status": "draft"},
 {"id": "ja.assess.formal-correspondence", "goal_id": "ja.goal.b2.formal-correspondence",
  "kind": "transfer", "modality": "interaction",
  "rubric": {"scale": "observed", "criteria": [
      "write a formal letter (request, apology, or complaint) with taught set phrases",
      "identify notice and application vocabulary in supplied documents"]},
  "review_status": "draft"},
]
with open(os.path.join(R, "assessments", "definitions.jsonl"), "a") as f:
    for a in ASSESS:
        f.write(json.dumps(a, ensure_ascii=False) + "\n")

def goal_yaml(gid, desc, prereq, concepts, assess):
    return ("  - id: ja.goal.b2." + gid + "\n"
            "    description: '" + desc + "'\n"
            "    band: B2\n    framework_refs: []\n    contexts:\n    - ja.situation.classroom\n"
            "    modalities:\n    - listening\n    - speaking\n    - reading\n    - writing\n"
            "    prerequisites:\n    - target: " + prereq + "\n"
            "      dimension: grammar-controlled\n      required_state: independent\n      strength: hard\n"
            "    required_concepts:\n" + "\n".join("    - " + c for c in concepts) + "\n"
            "    assessment_ids:\n    - ja.assess." + assess + "\n"
            "    transfer_required: true\n    sources:\n    - jf-standard\n    - ai-drafted-extension\n"
            "    review_status: draft\n    generation:\n      method: ai-assisted\n      tool: omp\n"
            "      model: strata/qwen3.8-flash-next-iq3_s\n      date: '2026-10-05'\n")

with open(os.path.join(R, "curriculum", "goals.yaml"), "a") as f:
    f.write(goal_yaml("academic-writing",
        "Academic writing in practice: thesis defense and publication basics.",
        "ja.goal.b2.academic-skills", ["ja.lex.formal.bouei", "ja.lex.formal.ketsuron"], "academic-writing"))
    f.write(goal_yaml("formal-correspondence",
        "Formal Japanese correspondence: letters, notices, applications, apologies, complaints, negotiations.",
        "ja.goal.b1.work-professional", ["ja.lex.formal.shokan", "ja.lex.formal.moushikomi"], "formal-correspondence"))

DEP = """- from: ja.goal.b2.academic-writing
  to: ja.goal.b2.academic-skills
  dimension: grammar-controlled
  required_state: independent
  strength: hard
- from: ja.goal.b2.formal-correspondence
  to: ja.goal.b1.work-professional
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
 ("610-thesis-defense","thesis defense","thesis-defense","ja.goal.b2.academic-writing",
  ["bouei","kaihen","shinpan","ketsuron","iken"], "s:thesis-defense"),
 ("611-publication-basics","publication basics","publication-basics","ja.goal.b2.academic-writing",
  ["kokuho","kiji","teikou","koutei","kekka"], "s:publication-basics"),
 ("612-business-letters","business letters","business-letters","ja.goal.b2.formal-correspondence",
  ["shokan","tsuuchou","guchou","aisatsu","onrei"], "s:business-letters"),
 ("613-formal-email-register","formal email register","formal-email-register","ja.goal.b2.formal-correspondence",
  ["kizukai","irei","kaiwa","shoukai2","hatsuu"], "g:ja.grammar.b2-yoroshiku"),
 ("614-official-notices","official notices","official-notices","ja.goal.b2.formal-correspondence",
  ["tsuuchi","kisai","juusho","jimusho","toujyou"], "s:official-notices"),
 ("615-application-letters","application letters","application-letters","ja.goal.b2.formal-correspondence",
  ["moushikomi","rireki","shikaku","jouken","keiyaku"], "s:application-letters"),
 ("616-invitation-formal","formal invitation","invitation-formal","ja.goal.b2.formal-correspondence",
  ["mimai","gankou","chuu","seihin","shouhin"], "s:invitation-formal"),
 ("617-apology-formal","formal apology","apology-formal","ja.goal.b2.formal-correspondence",
  ["wabi","sonai","baishou","genin","okure"], "s:apology-formal"),
 ("618-complaint-formal","formal complaint","complaint-formal","ja.goal.b2.formal-correspondence",
  ["fuman","seikyu","houshou","torihiki","kyoukyuu"], "s:complaint-formal"),
 ("619-negotiation-writing","negotiation writing","negotiation-writing","ja.goal.b2.formal-correspondence",
  ["koushou","kakaku","danwa","nouhin","hanbai"], "g:ja.grammar.b2.moushi-agemasu"),
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

for fname, topic, uid, goal, words, newitem in U:
    with open(os.path.join(R, "curriculum", "units", fname + ".yaml"), "w") as f:
        f.write(unit_yaml(topic, uid, goal, "formal", words, newitem))

print("batch57 written")
