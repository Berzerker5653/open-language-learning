#!/usr/bin/env python3
"""ja-JP batch 49: B2 units 530-539 (history-critical tail + society-change start)."""
import json, os

R = "languages/ja-JP"
SRC = ["jf-standard", "ai-drafted-extension"]
NOTE = ("Framework-level sourcing only (JF Standard reference, no descriptor text copied); "
        "a dictionary/reviewer source must be added before verified status.")
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-04", "notes": "ai-assisted draft wording; qualified review pending."}

WORDS = [
 ("taiou","comparison","n","comparison"),
 ("jikkou","implementation","n","implementation"),
 ("hyouka","evaluation","n","evaluation"),
 ("rondai","agenda","n","agenda, topic for debate"),
 ("bunkyou","local culture","n","local culture"),
 ("denshou2","legacy","n","legacy, heritage"),
 ("shimei","clarification","n","clarification"),
 ("kaisai","disclosure","n","disclosure"),
 ("sekinin","responsibility","n","responsibility"),
 ("mondai","problem","n","problem"),
 ("jinkou","population","n","population"),
 ("genkou","decrease","n","decrease"),
 ("zouka","increase","n","increase"),
 ("noureka","aging","n","aging"),
 ("kodomo","child","n","child"),
 ("hakushou","birth rate","n","birth rate"),
 ("shoushou","shrinking","n","shrinking"),
 ("roojin","elderly","n","elderly"),
 ("yobikou","reserve","n","reserve, preparation"),
 ("fuyou","support","n","support"),
 ("kaigo","nursing care","n","nursing care"),
 ("yaku","role","n","role"),
 ("tanshuku","commute","n","commute"),
 ("koyou","employment","n","employment"),
 ("shitsugyou","unemployment","n","unemployment"),
 ("yuumu","overtime","n","overtime"),
 ("yuukou","effective","adj-na","effective"),
 ("seido","institution","n","institution, system"),
 ("kaikaku","reform","n","reform"),
 ("nyuugaku","school admission","n","school admission"),
 ("jugyou","class","n","class, lesson"),
 ("senmon","expertise","n","expertise"),
 ("jitsugyou","practical","adj-na","practical"),
 ("toshi","city","n","city"),
 ("inaka","countryside","n","countryside"),
 ("kensetsu","construction","n","construction"),
 ("iju","relocation","n","relocation"),
 ("ikei","shift","n","shift"),
 ("henkou","change","n","change"),
 ("danjyo","gender","n","gender"),
 ("heikin","average","n","average"),
 ("wari","ratio","n","ratio, percentage"),
 ("toukei","statistics","n","statistics"),
 ("sanka","participation","n","participation"),
 ("komei","public","adj-na","public"),
 ("hoken","insurance","n","insurance"),
 ("nenkin","pension","n","pension"),
 ("zei","tax","n","tax"),
 ("fukushi","welfare","n","welfare"),
 ("boushi","prevention","n","prevention"),
]
assert len(WORDS) == 50, len(WORDS)

HIST_IDS = ["taiou","jikkou","hyouka","rondai","bunkyou","denshou2","shimei","kaisai","sekinin","mondai"]

def entry(shard, rid, kana, pos, gloss, tag):
    return {"id": f"ja.lex.{shard}.{rid}", "status": "draft",
            "forms": [{"text": kana, "script": "hiragana", "is_primary": True}],
            "readings": [{"text": kana, "script": "hiragana"},
                         {"text": rid, "transliteration_system": "modified-hepburn"}],
            "glosses": {"en-US": [gloss]}, "part_of_speech": pos,
            "registers": ["ja.register.neutral-common"], "semantic_tags": [tag],
            "sources": SRC, "notes": NOTE, "generation": GEN}

with open(os.path.join(R, "lexicon", "history3.jsonl"), "w") as f:
    for rid, kana, pos, gloss in WORDS:
        if rid in HIST_IDS:
            f.write(json.dumps(entry("history3", rid, kana, pos, gloss, "history"), ensure_ascii=False) + "\n")
with open(os.path.join(R, "lexicon", "society3.jsonl"), "w") as f:
    for rid, kana, pos, gloss in WORDS:
        if rid not in HIST_IDS:
            f.write(json.dumps(entry("society3", rid, kana, pos, gloss, "society"), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ja.grammar.b2.ni-yosure", "name": "〜傾向に (tend to)", "category": "syntax",
  "definition": "傾向に marks tendency: ひと は へいあん に よしやすい. Draft definition pending review."},
 {"id": "ja.grammar.b2.dake-naraba", "name": "〜だけならば (if only)", "category": "syntax",
  "definition": "だけならば marks a limiting condition: じょうほう だけ なれば けってい できない. Draft definition pending review."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("history-comparison","たいおう の きじ を よみました。","taiou no kiji wo yomimashita.","I read the comparison article.",["たいおう"]),
 ("history-essay","れきし の せきにん について かきました。","rekishi no sekinin ni tsuite kakimashita.","I wrote about historical responsibility.",["せきにん"]),
 ("demographic-shift","じんこう の げんこう について かきました。","jinkou no genkou ni tsuite kakimashita.","I wrote about population decline.",["じんこう"]),
 ("aging-society","かいご の もんだい を べんきょう しました。","kaigo no mondai wo benkyou shimashita.","I studied the nursing care problem.",["かいご"]),
 ("family-change","こどもの じょうほう を あつめました。","kodomo no jouhou wo atsumemashita.","I gathered information about children.",["こども"]),
 ("urbanization","とし の とうけい を みました。","toshi no toukei wo mimashita.","I looked at city statistics.",["とうけい"]),
 ("migration-debate","さんか の ちゅうし を かきました。","sanka no chuuji wo kakimashita.","I wrote the gist of participation.",["さんか"]),
 ("work-culture-change","こうよう の じょうほう を よみました。","koyou no jouhou wo yomimashita.","I read the employment information.",["こうよう"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, romaji, gloss, cloze in SENTS:
        e = {"id": f"ja.sent.{sid}", "status": "draft", "text": text, "reading": text,
             "romaji": romaji, "gloss": gloss, "cloze_targets": cloze,
             "sources": SRC, "notes": "ai-assisted draft sentence; qualified review required before verified.",
             "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

ASSESS = {"id": "ja.assess.society-change", "goal_id": "ja.goal.b2.society-change",
          "kind": "transfer", "modality": "interaction",
          "rubric": {"scale": "observed", "criteria": [
              "discuss demographic, work, and family change with precise vocabulary",
              "describe a social trend and its effects without blocking errors"]},
          "review_status": "draft"}
with open(os.path.join(R, "assessments", "definitions.jsonl"), "a") as f:
    f.write(json.dumps(ASSESS, ensure_ascii=False) + "\n")

GOAL_YAML = """  - id: ja.goal.b2.society-change
    description: 'Discuss social change: demographics, work culture, family, and public systems.'
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
    - target: ja.goal.b2.history-critical
      dimension: grammar-controlled
      required_state: independent
      strength: hard
    required_concepts:
    - ja.lex.society3.jinkou
    - ja.lex.society3.koyou
    assessment_ids:
    - ja.assess.society-change
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

DEP = """- from: ja.goal.b2.society-change
  to: ja.goal.b2.history-critical
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
 ("530-history-comparison","history comparison","history-comparison","history3",
  ["taiou","hyouka","rondai","bunkyou","denshou2"], "s:history-comparison"),
 ("531-history-essay","history essay","history-essay","history3",
  ["jikkou","shimei","kaisai","sekinin","mondai"], "s:history-essay"),
 ("532-demographic-shift","demographic shift","demographic-shift","society3",
  ["jinkou","genkou","zouka","heikin","wari"], "s:demographic-shift"),
 ("533-aging-society","aging society","aging-society","society3",
  ["noureka","roojin","kaigo","hoken","nenkin"], "s:aging-society"),
 ("534-family-change","family change","family-change","society3",
  ["kodomo","hakushou","shoushou","fuyou","danjyo"], "s:family-change"),
 ("535-urbanization","urbanization","urbanization","society3",
  ["toshi","inaka","kensetsu","iju","toukei"], "s:urbanization"),
 ("536-migration-debate","migration debate","migration-debate","society3",
  ["ikei","henkou","sanka","komei","zei"], "s:migration-debate"),
 ("537-work-culture-change","work culture change","work-culture-change","society3",
  ["koyou","shitsugyou","yuumu","tanshuku","yaku"], "s:work-culture-change"),
 ("538-education-reform","education reform","education-reform","society3",
  ["seido","kaikaku","nyuugaku","jugyou","senmon"], "g:ja.grammar.b2.ni-yosure"),
 ("539-gender-studies","gender studies","gender-studies","society3",
  ["jitsugyou","yuukou","boushi","yobikou","fukushi"], "g:ja.grammar.b2.dake-naraba"),
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

for fname, topic, uid, shard, words, newitem in U:
    goal = "ja.goal.b2.history-critical" if shard == "history3" else "ja.goal.b2.society-change"
    with open(os.path.join(R, "curriculum", "units", fname + ".yaml"), "w") as f:
        f.write(unit_yaml(topic, uid, goal, shard, words, newitem))

print("batch49 written")
