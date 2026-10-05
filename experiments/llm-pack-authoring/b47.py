#!/usr/bin/env python3
"""ja-JP batch 47: B2 units 510-519 (film-analysis tail + history-critical start)."""
import json, os

R = "languages/ja-JP"
SRC = ["jf-standard", "ai-drafted-extension"]
NOTE = ("Framework-level sourcing only (JF Standard reference, no descriptor text copied); "
        "a dictionary/reviewer source must be added before verified status.")
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-04", "notes": "ai-assisted draft wording; qualified review pending."}

FILM2 = [
 ("joukei","scene","n","scene"),
 ("iro","color","n","color"),
 ("hikari","light","n","light"),
 ("on","sound","n","sound"),
 ("ongaku","music","n","music"),
 ("fukushoku","clothing","n","clothing, costume"),
 ("bakuhatsu","explosion","n","explosion"),
 ("tatakai","battle","n","battle"),
 ("shippai","failure","n","failure"),
 ("ketsui","resolve","n","resolve"),
 ("taifu","richness","n","richness, depth"),
 ("shizuka","quiet","adj-na","quiet"),
 ("kaze","wind","n","wind"),
 ("ame","rain","n","rain"),
 ("yuki","snow","n","snow"),
 ("yoru","night","n","night"),
 ("asa","morning","n","morning"),
 ("umi","sea","n","sea"),
 ("sora","sky","n","sky"),
 ("tori","bird","n","bird"),
 ("sakana","fish","n","fish"),
 ("ki","tree","n","tree"),
 ("hana","flower","n","flower"),
 ("tsuki","moon","n","moon"),
 ("hoshi","star","n","star"),
 ("yama","mountain","n","mountain"),
 ("mado","window","n","window"),
 ("kagayaki","brightness","n","brightness, glow"),
 ("inbou","conspiracy","n","conspiracy"),
 ("hantai","opposition","n","opposition"),
]
assert len(FILM2) == 30, len(FILM2)

HISTORY = [
 ("shiryou","source material","n","source material, document"),
 ("genbun","original text","n","original text"),
 ("shoko","evidence","n","evidence"),
 ("shogen","testimony","n","testimony"),
 ("hakukutsu","excavation","n","excavation"),
 ("shakusha","scholar","n","scholar"),
 ("kijutsu","description","n","description, account"),
 ("kaishaku","interpretation","n","interpretation"),
 ("hikaku","comparison","n","comparison"),
 ("shinwa","myth","n","myth"),
 ("sensou","war","n","war"),
 ("kakumei","revolution","n","revolution"),
 ("joyaku","treaty","n","treaty"),
 ("kenpou","constitution","n","constitution"),
 ("dekigoto","event","n","event"),
 ("genin","cause","n","cause"),
 ("eikyou","influence","n","influence"),
 ("kodai","ancient era","n","ancient era"),
 ("kindai","modern era","n","modern era"),
 ("hakubutsukan","museum","n","museum"),
]
assert len(HISTORY) == 20, len(HISTORY)

def entry(shard, rid, kana, pos, gloss, tag):
    return {"id": f"ja.lex.{shard}.{rid}", "status": "draft",
            "forms": [{"text": kana, "script": "hiragana", "is_primary": True}],
            "readings": [{"text": kana, "script": "hiragana"},
                         {"text": rid, "transliteration_system": "modified-hepburn"}],
            "glosses": {"en-US": [gloss]}, "part_of_speech": pos,
            "registers": ["ja.register.neutral-common"], "semantic_tags": [tag],
            "sources": SRC, "notes": NOTE, "generation": GEN}

with open(os.path.join(R, "lexicon", "film2.jsonl"), "w") as f:
    for rid, kana, pos, gloss in FILM2:
        f.write(json.dumps(entry("film2", rid, kana, pos, gloss, "film"), ensure_ascii=False) + "\n")
with open(os.path.join(R, "lexicon", "history.jsonl"), "w") as f:
    for rid, kana, pos, gloss in HISTORY:
        f.write(json.dumps(entry("history", rid, kana, pos, gloss, "history"), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ja.grammar.b2.ni-oujite", "name": "〜に応じて (in accordance with)", "category": "syntax",
  "definition": "に応じて marks correspondence: じだい に おうじて かいしゃく が かわる. Draft definition pending review."},
 {"id": "ja.grammar.b2.ni-tomonai", "name": "〜に伴ない (along with)", "category": "syntax",
  "definition": "に伴ない marks accompaniment: かくめい に ともない けんぽう が かわった. Draft definition pending review."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("scene-analysis","えいが の じょうけい を ぶんせき しました。","eiga no joukei wo bunseki shimashita.","I analyzed a film scene.",["じょうけい"]),
 ("cultural-film","にほん の ふくしょく を べんきょう しました。","nihon no fukushoku wo benkyou shimashita.","I studied Japanese clothing.",["ふくしょく"]),
 ("festival-culture","まつり の うみ を べんきょう しました。","matsuri no umi wo benkyou shimashita.","I studied the festival sea.",["うみ"]),
 ("viewer-response","えいが の いろ を おぼえました。","eiga no iro wo oboemashita.","I learned the colors of the film.",["いろ"]),
 ("film-ethics","えいが の はんたい を よみました。","eiga no hantai wo yomimashita.","I read the opposition to the film.",["はんたい"]),
 ("primary-sources","しりょう を よみました。","shiryou wo yomimashita.","I read the source material.",["しりょう"]),
 ("historiography-basics","がくしゃ の はなし を よみました。","gakusha no hanashi wo yomimashita.","I read the scholar's account.",["がくしゃ"]),
 ("war-memory","できごと の きじゅつ を よみました。","dekigoto no kijutsu wo yomimashita.","I read the account of the event.",["できごと"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, romaji, gloss, cloze in SENTS:
        e = {"id": f"ja.sent.{sid}", "status": "draft", "text": text, "reading": text,
             "romaji": romaji, "gloss": gloss, "cloze_targets": cloze,
             "sources": SRC, "notes": "ai-assisted draft sentence; qualified review required before verified.",
             "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

ASSESS = {"id": "ja.assess.history-critical", "goal_id": "ja.goal.b2.history-critical",
          "kind": "transfer", "modality": "interaction",
          "rubric": {"scale": "observed", "criteria": [
              "discuss sources, evidence, and interpretation with precise vocabulary",
              "describe a historical event and its influence without blocking errors"]},
          "review_status": "draft"}
with open(os.path.join(R, "assessments", "definitions.jsonl"), "a") as f:
    f.write(json.dumps(ASSESS, ensure_ascii=False) + "\n")

GOAL_YAML = """  - id: ja.goal.b2.history-critical
    description: 'Discuss history critically: sources, evidence, interpretation, and memory.'
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
    - target: ja.goal.b2.film-analysis
      dimension: grammar-controlled
      required_state: independent
      strength: hard
    required_concepts:
    - ja.lex.history.shiryou
    - ja.lex.history.genbun
    assessment_ids:
    - ja.assess.history-critical
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

DEP = """- from: ja.goal.b2.history-critical
  to: ja.goal.b2.film-analysis
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
 ("510-scene-analysis","scene analysis","scene-analysis","film2",
  ["joukei","iro","hikari","on","ongaku"], "s:scene-analysis"),
 ("511-cultural-film","cultural film","cultural-film","film2",
  ["fukushoku","kaze","ame","yuki","yoru"], "s:cultural-film"),
 ("512-festival-culture","festival culture","festival-culture","film2",
  ["umi","sora","tori","sakana","ki"], "s:festival-culture"),
 ("513-viewer-response","viewer response","viewer-response","film2",
  ["hana","tsuki","hoshi","yama","kagayaki"], "s:viewer-response"),
 ("514-film-ethics","film ethics","film-ethics","film2",
  ["bakuhatsu","tatakai","inbou","hantai","shippai"], "s:film-ethics"),
 ("515-analysis-essay","analysis essay","analysis-essay","film2",
  ["ketsui","taifu","shizuka","mado","asa"], "g:ja.grammar.b2.ni-oujite"),
 ("516-primary-sources","primary sources","primary-sources","history",
  ["shiryou","genbun","shoko","shogen","hakukutsu"], "s:primary-sources"),
 ("517-historiography-basics","historiography basics","historiography-basics","history",
  ["shakusha","kijutsu","kaishaku","hikaku","shinwa"], "s:historiography-basics"),
 ("518-meiji-modernization","modernization","meiji-modernization","history",
  ["sensou","kakumei","joyaku","kenpou","kindai"], "g:ja.grammar.b2.ni-tomonai"),
 ("519-war-memory","war memory","war-memory","history",
  ["dekigoto","genin","eikyou","kodai","hakubutsukan"], "s:war-memory"),
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
    goal = "ja.goal.b2.film-analysis" if shard == "film2" else "ja.goal.b2.history-critical"
    with open(os.path.join(R, "curriculum", "units", fname + ".yaml"), "w") as f:
        f.write(unit_yaml(topic, uid, goal, shard, words, newitem))

print("batch47 written")
