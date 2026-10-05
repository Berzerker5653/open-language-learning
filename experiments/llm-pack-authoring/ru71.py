#!/usr/bin/env python3
"""ru-RU batch 71: B2 units 730-739 (literary extracts and interpretive responses)."""
import json, os

R = "experiments/llm-pack-authoring/candidates/ru-fullkit-v1"
SRC = ["ru-original"]
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-05", "notes": "ai-drafted; needs dictionary sourcing and human review"}

WORDS = [
 ("mnogoznachnyy","многозначный","многознáчный","polysemous, multifaceted"),
 ("otkrovenie","откровение","откровéние","revelation"),
 ("novatorskiy","новаторский","новáторский","innovative"),
 ("novator","новатор","новáтор","innovator"),
 ("otzvuk","отзвук","óтзвук","echo, reverberation"),
 ("stilizaciya","стилизация","стилизáция","stylization"),
 ("obraznost","образность","обрáзность","imagery"),
 ("poetika","поэтика","поэ́тика","poetics"),
 ("cenitel","ценитель","ценúтель","connoisseur"),
 ("znatok","знаток","знатóк","expert, connoisseur"),
 ("postmodern","постмодерн","постмóдерн","postmodernism"),
 ("siurrealizm","сюрреализм","сюрреалúзм","surrealism"),
 ("siuzhetnyy","сюжетный","сюжéтный","plot (adj.)"),
 ("protagonist","протагонист","протагонúст","protagonist"),
 ("antigeroy","антигерой","антигéрой","antihero"),
 ("povestvovatelnyy","повествовательный","повествовáтельный","narrative (adj.)"),
 ("ironicheskiy","иронический","иронúческий","ironic"),
 ("pamflet","памфлет","памфлéт","pamphlet"),
 ("predanie","предание","предáние","legend, lore"),
 ("epigramma","эпиграмма","эпигрáмма","epigram"),
 ("chitatelskiy","читательский","читáтельский","reader (adj.)"),
 ("kinematograf","кинематограф","кинематóграф","cinema"),
 ("mzanscena","мизансцена","мизансцéна","mise-en-scène"),
 ("pripev","припев","припéв","chorus, refrain"),
 ("antiutopiya","антиутопия","антиутопúя","dystopia"),
 ("virtuoz","виртуоз","виртуóз","virtuoso"),
 ("satiricheskiy","сатирический","сатири́ческий","satirical"),
 ("jumoristicheskiy","юмористический","юморúстический","humorous"),
 ("komicheskiy","комический","комúческий","comic"),
 ("tragicheskiy","трагический","трагúческий","tragic"),
 ("dramatizm","драматизм","драматúзм","dramatism"),
 ("sarkasticheskiy","саркастический","саркастúческий","sarcastic"),
 ("sochuvestvie","сочувствие","сочúвствие","sympathy"),
 ("sostradanie","сострадание","сострадáние","compassion"),
 ("umilenie","умиление","умилéние","tender delight"),
 ("komizm","комизм","комúзм","comicality"),
 ("tragizm","трагизм","трагúзм","tragicness"),
 ("patos","пафос","пáфос","pathos"),
 ("sentimentalnost","сентиментальность","сентиментáльность","sentimentality"),
 ("idilliya","идиллия","идúллия","idyll"),
 ("pastoral","пастораль","пасторáль","pastoral"),
 ("lirizm","лиризм","лирúзм","lyricism"),
 ("nadyrv","надрыв","надýрв","torn anguish"),
 ("epilog","эпилог","эпилóг","epilogue"),
 ("prolog","пролог","пролóг","prologue"),
 ("koda","кода","кóда","coda"),
 ("leitmotiv","лейтмотив","лейтмотúв","leitmotif"),
 ("refrain","рефрен","рефрéн","refrain"),
 ("almanah","альманах","альмáнах","almanac"),
 ("epopeya","эпопея","эпопéя","epic"),
]

def entry(rid, text, stress, gloss):
    return {"id": f"ru.lex.cult.{rid}", "status": "draft",
            "forms": [{"text": text}], "readings": [{"text": stress}],
            "glosses": {"en-US": [gloss]}, "sources": SRC, "generation": GEN}

with open(os.path.join(R, "lexicon", "cult.jsonl"), "w") as f:
    for rid, text, stress, gloss in WORDS:
        f.write(json.dumps(entry(rid, text, stress, gloss), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ru.grammar.b2-na-moy-vzglyad", "name": "На мой взгляд", "category": "syntax",
  "definition": "Interpretive responses use на мой взгляд: на мой взгляд, герой прав. Learn the supplied chunks as given."},
 {"id": "ru.grammar.b2-skvoz", "name": "Сквозь + acc", "category": "syntax",
  "definition": "Interpretation uses сквозь: сквозь призму иронии. Learn the supplied chunks as given."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("u730","Это протагонист.","This is the protagonist.",["протагонист"]),
 ("u731","Это стилизация.","This is a stylization.",["стилизация"]),
 ("u732","Это знаток.","This is a connoisseur.",["знаток"]),
 ("u733","Это антиутопия.","This is a dystopia.",["антиутопия"]),
 ("u734","Это памфлет.","This is a pamphlet.",["памфлет"]),
 ("u735","Это трагизм.","This is tragicness.",["трагизм"]),
 ("u736","Это идиллия.","This is an idyll.",["идиллия"]),
 ("u737","Это эпилог.","This is an epilogue.",["эпилог"]),
 ("u738","Это мизансцена.","This is a mise-en-scène.",["мизансцена"]),
 ("u739","Это лейтмотив.","This is a leitmotif.",["лейтмотив"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, gloss, cloze in SENTS:
        e = {"id": f"ru.sent.b2.{sid}", "status": "draft", "text": text, "gloss": gloss,
             "cloze_targets": cloze, "sources": SRC, "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

ASSESS = [
 {"id": "ru.assess.b2.culture-perspectives-reading", "goal_id": "ru.goal.b2.culture-perspectives",
  "kind": "recognition", "modality": "reading",
  "rubric": {"scale": "observed", "criteria": [
      "Identify structure words (эпилог, пролог) in a supplied extract.",
      "Match на мой взгляд chunks to their interpretation.",
      "Distinguish ironic (иронический) from sarcastic (саркастический) tone."]},
  "review_status": "draft"},
 {"id": "ru.assess.b2.culture-perspectives-writing", "goal_id": "ru.goal.b2.culture-perspectives",
  "kind": "production", "modality": "writing",
  "rubric": {"scale": "observed", "criteria": [
      "Give a response with the supplied на мой взгляд chunk.",
      "Frame reading with the supplied сквозь призму chunk.",
      "Use taught forms only."]},
  "review_status": "draft"},
]
with open(os.path.join(R, "assessments", "definitions.jsonl"), "a") as f:
    for a in ASSESS:
        f.write(json.dumps(a, ensure_ascii=False) + "\n")

GOAL_YAML = """  - id: "ru.goal.b2.culture-perspectives"
    description: "Respond interpretively to literary extracts from different perspectives."
    band: "B2"
    modalities: ["reading", "writing"]
    prerequisites:
      - {target: "ru.goal.b1.culture-media", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.a2.services", dimension: "comprehension-reading", required_state: "independent", strength: "hard"}
      - {target: "ru.goal.on-ramp.everyday", dimension: "recall-meaning", required_state: "independent", strength: "hard"}
    required_concepts: ["ru.grammar.b2-na-moy-vzglyad", "ru.grammar.b2-skvoz", "ru.grammar.on-ramp.zero-present-copula"]
    assessment_ids: ["ru.assess.b2.culture-perspectives-reading", "ru.assess.b2.culture-perspectives-writing"]
    transfer_required: false
    sources: ["ru-original"]
    review_status: "draft"
    generation:
      method: "ai-assisted"
      tool: "omp"
      model: "strata/qwen3.8-flash-next-iq3_s"
      date: "2026-10-05"
      notes: "ai-drafted; needs dictionary sourcing and human review"
"""
with open(os.path.join(R, "curriculum", "goals.yaml"), "a") as f:
    f.write(GOAL_YAML)

OLD_GRAM = ["ru.grammar.on-ramp.eto-identification", "ru.grammar.on-ramp.zero-present-copula"]

U = [
 ("730-lit-01","Narrative","сюжетный, повествовательный, протагонист, антигерой and отзвук.",
  ["siuzhetnyy","povestvovatelnyy","protagonist","antigeroy","otzvuk"], "s:u730",
  "Do not confuse протагонист (protagonist) with антигерой (antihero)."),
 ("731-lit-02","Interpretation","многозначный, откровение, новаторский, новатор and стилизация.",
  ["mnogoznachnyy","otkrovenie","novatorskiy","novator","stilizaciya"], "s:u731",
  "Do not confuse стилизация (stylization) with подражание (imitation)."),
 ("732-lit-03","Imagery","образность, поэтика, ценитель, знаток and альманах.",
  ["obraznost","poetika","cenitel","znatok","almanah"], "s:u732",
  "Do not confuse ценитель (connoisseur) with знаток (expert)."),
 ("733-lit-04","Tradition and modern","постмодерн, сюрреализм, антиутопия, эпопея and предание.",
  ["postmodern","siurrealizm","antiutopiya","epopeya","predanie"], "s:u733",
  "Do not confuse эпопея (epic) with предание (legend)."),
 ("734-lit-05","Tone","иронический, саркастический, сатирический, юмористический and комический.",
  ["ironicheskiy","sarkasticheskiy","satiricheskiy","jumoristicheskiy","komicheskiy"], "s:u734",
  "Do not confuse иронический (ironic) with саркастический (sarcastic)."),
 ("735-lit-06","Tragedy","трагический, драматизм, трагизм, пафос and надрыв.",
  ["tragicheskiy","dramatizm","tragizm","patos","nadyrv"], "s:u735",
  "Do not confuse трагизм (tragicness) with драматизм (dramatism)."),
 ("736-lit-07","Feeling","сочувствие, сострадание, умиление, сентиментальность and идиллия.",
  ["sochuvestvie","sostradanie","umilenie","sentimentalnost","idilliya"], "s:u736",
  "Do not confuse сочувствие (sympathy) with сострадание (compassion)."),
 ("737-lit-08","Structure","эпилог, пролог, кода, рефрен and лейтмотив.",
  ["epilog","prolog","koda","refrain","leitmotiv"], "s:u737",
  "Do not confuse эпилог (epilogue) with пролог (prologue)."),
 ("738-lit-09","Stage","кинематограф, мизансцена, припев, читательский and комизм.",
  ["kinematograf","mzanscena","pripev","chitatelskiy","komizm"], "s:u738",
  "Do not confuse кинематограф (cinema) with театр (theatre)."),
 ("739-lit-10","Forms","памфлет, эпиграмма, пастораль, лиризм and виртуоз.",
  ["pamflet","epigramma","pastoral","lirizm","virtuoz"], "s:u739",
  "Do not confuse памфлет (pamphlet) with эпиграмма (epigram)."),
]

def unit_yaml(fname, title, summary, words, newitem, fence):
    uid = fname.split("-", 1)[1]
    num = fname[:3]
    lex = [w if w.startswith("ru.lex.") else f"ru.lex.cult.{w}" for w in words]
    if newitem.startswith("s:"):
        newref = f"ru.sent.b2.{newitem[2:]}"
        allowed_gram = OLD_GRAM
    else:
        newref = newitem[2:]
        allowed_gram = [newref] + OLD_GRAM
    old = ["ru.lex.everyday.eto", "ru.lex.everyday.dom"]
    refs = lex + [newref] + old
    L = []
    L.append('id: "ru.unit.b2.' + uid + '"')
    L.append('goal_id: "ru.goal.b2.culture-perspectives"')
    L.append(f'title: "{title}"')
    L.append(f'summary: "{summary}"')
    L.append("estimated_minutes: 8")
    L.append("activities:")
    L.append(f'  - id: "ru.activity.b2.u{num}-read"')
    L.append('    type: "encounter-read"')
    L.append('    modality: "reading"')
    L.append("    support_level: 1")
    L.append("    content_refs: &v [" + ", ".join(f'"{r}"' for r in refs) + "]")
    L.append(f'  - id: "ru.activity.b2.u{num}-grammar"')
    L.append('    type: "encounter-read"')
    L.append('    modality: "reading"')
    L.append("    support_level: 1")
    L.append("    content_refs: &g [" + ", ".join(f'"{r}"' for r in allowed_gram) + "]")
    if newitem.startswith("s:"):
        L.append(f'  - id: "ru.activity.b2.u{num}-cloze"')
        L.append('    type: "cloze"')
        L.append('    modality: "writing"')
        L.append("    support_level: 1")
        L.append(f'    content_refs: ["{newref}"]')
    L.append(f'  - id: "ru.activity.b2.u{num}-write"')
    L.append('    type: "recall"')
    L.append('    modality: "writing"')
    L.append("    support_level: 0")
    L.append("    content_refs: *v")
    L.append("generation_contract:")
    L.append("  allowed_vocab: *v")
    L.append("  allowed_grammar: *g")
    L.append("  new_item_budget: 6")
    L.append("  register: []")
    L.append(f'  expected_interpretations: ["{title}: literary response with taught forms only."]')
    L.append(f'  prohibited_ambiguity: ["{fence}"]')
    L.append('  target_proficiency: "B2"')
    L.append('  validation_method: "choice"')
    return "\n".join(L) + "\n"

for fname, title, summary, words, newitem, fence in U:
    with open(os.path.join(R, "curriculum", "units", fname + ".yaml"), "w") as f:
        f.write(unit_yaml(fname, title, summary, words, newitem, fence))

print("ru batch 71 written")
assert len(WORDS) == 50, len(WORDS)
