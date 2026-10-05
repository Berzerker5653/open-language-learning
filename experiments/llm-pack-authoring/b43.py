#!/usr/bin/env python3
"""ja-JP batch 43: B2 units 480-489 (philosophy-ethics complete + literature-study start)."""
import json, os

R = "languages/ja-JP"
SRC = ["jf-standard", "ai-drafted-extension"]
NOTE = ("Framework-level sourcing only (JF Standard reference, no descriptor text copied); "
        "a dictionary/reviewer source must be added before verified status.")
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-04", "notes": "ai-assisted draft wording; qualified review pending."}

WORDS = [
 ("mujun","むじゅん","noun","contradiction"),
 ("kaiseki","かいせき","noun","analysis"),
 ("jitsugaku","じつがく","noun","practical learning"),
 ("kouzou","こうぞう","noun","structure"),
 ("gengi","げんぎ","noun","original meaning"),
 ("dotoku","どうとく","noun","morality"),
 ("dotoku-kan","どうとくかん","noun","moral sense"),
 ("rinri-kan","りんりかん","noun","ethical sense"),
 ("shuchou","しゅちょう","noun","claim"),
 ("sekinin-ron","せきにんろん","noun","theory of responsibility"),
 ("jiyu-ison","じゆういし","noun","free will"),
 ("seigi-ron","せいぎろん","noun","theory of justice"),
 ("sonzai-ron","そんざいろん","noun","ontology"),
 ("ishiki-ron","いしきろん","noun","theory of consciousness"),
 ("jiyu-ron","じゆうろん","noun","theory of freedom"),
 ("kyoiku","きょういく","noun","education"),
 ("kyoiku-gaku","きょういくがく","noun","pedagogy"),
 ("kyoiku-ka","きょういくか","noun","educator"),
 ("kyoiku-hou","きょういくほう","noun","education law"),
 ("jikukettei-ron","じこけっていろん","noun","theory of self-determination"),
 ("bungaku","ぶんがく","noun","literature"),
 ("shousetsu","しょうせつ","noun","novel"),
 ("shousetsu-ka","しょうせつか","noun","novelist"),
 ("hyougen","ひょうげん","noun","expression"),
 ("bungaku-ka","ぶんがくか","noun","man of letters"),
 ("kindai","きんだい","noun","modern period"),
 ("kindai-bungaku","きんだいぶんがく","noun","modern literature"),
 ("kindai-ka","きんだいか","noun","modernization"),
 ("kindai-shi","きんだいし","noun","modern history"),
 ("bungaku-ron","ぶんがくろん","noun","theory of literature"),
 ("shi","し","noun","poem"),
 ("shika","しか","noun","poetry"),
 ("shijin","しじん","noun","poet"),
 ("gendai","げんだい","noun","contemporary period"),
 ("gendai-bungaku","げんだいぶんがく","noun","contemporary literature"),
 ("koten","こてん","noun","classic"),
 ("koten-bungaku","こてんぶんがく","noun","classical literature"),
 ("waka","わか","noun","waka poem"),
 ("renga","れんが","noun","linked verse"),
 ("haikai","かいかい","noun","comic linked verse"),
 ("haiku","はいく","noun","haiku"),
 ("tanka","たんか","noun","tanka poem"),
 ("senryuu","せんりゅう","noun","senryu"),
 ("douwa","どうわ","noun","children's story"),
 ("setwa","せつわ","noun","anecdote"),
 ("roman","ろまん","noun","romance"),
 ("roman-shugi","ろまんしゅぎ","noun","romanticism"),
 ("engoki","えんぎき","noun","drama"),
 ("bungaku-shi","ぶんがくし","noun","literary history"),
 ("bungaku-hyou","ぶんがくひょう","noun","literary criticism"),
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

LIT = {"bungaku","shousetsu","shousetsu-ka","hyougen","bungaku-ka","kindai","kindai-bungaku","kindai-ka","kindai-shi","bungaku-ron","shi","shika","shijin","gendai","gendai-bungaku","koten","koten-bungaku","waka","renga","haikai","haiku","tanka","senryuu","douwa","setwa","roman","roman-shugi","engoki","bungaku-shi","bungaku-hyou"}
def shard_of(rid):
    return "lit" if rid in LIT else "philosophy3"

with open(os.path.join(R, "lexicon", "philosophy3.jsonl"), "w") as f:
    for rid, kana, pos, gloss in WORDS:
        if shard_of(rid) == "philosophy3":
            f.write(json.dumps(entry("philosophy3", rid, kana, pos, gloss, "philosophy"), ensure_ascii=False) + "\n")
with open(os.path.join(R, "lexicon", "lit.jsonl"), "w") as f:
    for rid, kana, pos, gloss in WORDS:
        if shard_of(rid) == "lit":
            f.write(json.dumps(entry("lit", rid, kana, pos, gloss, "literature"), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ja.grammar.b2.ni-kagiru", "name": "〜に限る (limited to)", "category": "syntax",
  "definition": "に限る restricts a scope: ぶんがく にかぎる べんきょう はんい. Draft definition pending review."},
 {"id": "ja.grammar.b2.ni-junzuru", "name": "〜に従う (according to)", "category": "syntax",
  "definition": "に従う marks conformity: きじゅん に したがう きそく. Draft definition pending review."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("logic-basics","むじゅん の けんきゅう を しました。","mujun no kenkyuu wo shimashita.","I did research on contradiction.",["むじゅん"]),
 ("fallacy-hunting","どうとく の てんかん を べんきょう しました。","dotoku no tenkan wo benkyou shimashita.","I studied the shift in morality.",["どうとく"]),
 ("philosophy-reading","じゆういし の ろんぶん を よみました。","jiyuison no ronbun wo yomimashita.","I read an essay on free will.",["じゆういし"]),
 ("short-story-analysis","ぶんがく の さくひん を ぶんせき しました。","bungaku no sakuhin wo bunseki shimashita.","I analyzed a literary work.",["ぶんがく"]),
 ("novel-excerpts","きんだい の ぶんがく を べんきょう しました。","kindai no bungaku wo benkyou shimashita.","I studied modern literature.",["きんだい"]),
 ("poetry-modern","げんだい の し を よみました。","gendai no shi wo yomimashita.","I read a contemporary poem.",["げんだい"]),
 ("poetry-classical","こてん の か を べんきょう しました。","koten no ka wo benkyou shimashita.","I studied a classical poem.",["こてん"]),
 ("haiku-tradition","はいく の てきすと を ならべました。","haiku no tekisuto wo narabemashita.","I lined up haiku texts.",["はいく"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, romaji, gloss, cloze in SENTS:
        e = {"id": f"ja.sent.{sid}", "status": "draft", "text": text, "reading": text,
             "romaji": romaji, "gloss": gloss, "cloze_targets": cloze,
             "sources": SRC, "notes": "ai-assisted draft sentence; qualified review required before verified.",
             "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

ASSESS = {"id": "ja.assess.literature-study", "goal_id": "ja.goal.b2.literature-study",
          "kind": "transfer", "modality": "interaction",
          "rubric": {"scale": "observed", "criteria": [
              "discuss novels, poetry, and literary traditions with precise vocabulary",
              "analyze a literary text or motif without blocking errors"]},
          "review_status": "draft"}
with open(os.path.join(R, "assessments", "definitions.jsonl"), "a") as f:
    f.write(json.dumps(ASSESS, ensure_ascii=False) + "\n")

GOAL_YAML = """  - id: ja.goal.b2.literature-study
    description: 'Discuss literature: novels, poetry, classics, and literary analysis.'
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
    - target: ja.goal.b2.philosophy-ethics
      dimension: grammar-controlled
      required_state: independent
      strength: hard
    required_concepts:
    - ja.lex.lit.bungaku
    - ja.lex.lit.shousetsu
    assessment_ids:
    - ja.assess.literature-study
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

U = [
 ("480-logic-basics","logic basics","logic-basics","ja.goal.b2.philosophy-ethics",
  ["mujun","kaiseki","jitsugaku","kouzou","gengi"], "s:logic-basics"),
 ("481-fallacy-hunting","fallacy hunting","fallacy-hunting","ja.goal.b2.philosophy-ethics",
  ["dotoku","dotoku-kan","rinri-kan","shuchou","sekinin-ron"], "s:fallacy-hunting"),
 ("482-philosophy-reading","philosophy reading","philosophy-reading","ja.goal.b2.philosophy-ethics",
  ["jiyu-ison","seigi-ron","sonzai-ron","ishiki-ron","jiyu-ron"], "s:philosophy-reading"),
 ("483-ethics-essay","ethics essay","ethics-essay","ja.goal.b2.philosophy-ethics",
  ["kyoiku","kyoiku-gaku","kyoiku-ka","kyoiku-hou","jikukettei-ron"], "g:ja.grammar.b2.ni-kagiru"),
 ("484-short-story-analysis","short story analysis","short-story-analysis","ja.goal.b2.literature-study",
  ["bungaku","shousetsu","shousetsu-ka","hyougen","bungaku-ka"], "s:short-story-analysis"),
 ("485-novel-excerpts","novel excerpts","novel-excerpts","ja.goal.b2.literature-study",
  ["kindai","kindai-bungaku","kindai-ka","kindai-shi","bungaku-ron"], "s:novel-excerpts"),
 ("486-poetry-modern","poetry modern","poetry-modern","ja.goal.b2.literature-study",
  ["shi","shika","shijin","gendai","gendai-bungaku"], "s:poetry-modern"),
 ("487-poetry-classical","poetry classical","poetry-classical","ja.goal.b2.literature-study",
  ["koten","koten-bungaku","waka","renga","haikai"], "s:poetry-classical"),
 ("488-haiku-tradition","haiku tradition","haiku-tradition","ja.goal.b2.literature-study",
  ["haiku","tanka","senryuu","douwa","setwa"], "s:haiku-tradition"),
 ("489-literary-motifs","literary motifs","literary-motifs","ja.goal.b2.literature-study",
  ["roman","roman-shugi","engoki","bungaku-shi","bungaku-hyou"], "g:ja.grammar.b2.ni-junzuru"),
]
OLD_SENTS = ["ja.sent.meeting-starts","ja.sent.reply-email","ja.sent.report-address",
             "ja.sent.work-company","ja.sent.interview-prep"]

def unit_yaml(topic, uid, goal, words, newitem):
    lex = [f"ja.lex.{shard_of(w)}.{w}" for w in words]
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

for fname, topic, uid, goal, words, newitem in U:
    with open(os.path.join(R, "curriculum", "units", fname + ".yaml"), "w") as f:
        f.write(unit_yaml(topic, uid, goal, words, newitem))

print("batch43 written")
