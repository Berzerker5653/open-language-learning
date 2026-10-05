#!/usr/bin/env python3
"""ru-RU batch 24: B1 units 260-269 (housing and community problems)."""
import json, os

R = "experiments/llm-pack-authoring/candidates/ru-fullkit-v1"
SRC = ["ru-original"]
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-05", "notes": "ai-drafted; needs dictionary sourcing and human review"}

WORDS = [
 ("kvartira","квартира","кварти́ра","apartment"),
 ("arenda","аренда","аре́нда","rent (noun)"),
 ("arendator","арендатор","аренда́тор","tenant"),
 ("hozyain","хозяин","хозя́ин","owner, landlord"),
 ("mebel","мебель","ме́бель","furniture"),
 ("stul","стул","стул","chair"),
 ("kran","кран","кран","tap, faucet"),
 ("truba","труба","труба́","pipe"),
 ("skvoznyak","сквозняк","сквозня́к","draught"),
 ("teplo","тепло","тепло́","heat"),
 ("svet","свет","свет","light"),
 ("otoplenie","отопление","отопле́ние","heating"),
 ("domofon","домофон","домо́фон","intercom"),
 ("sobranie","собрание","собра́ние","meeting"),
 ("shum","шум","шум","noise"),
 ("sosedstvo","соседство","сосе́дство","neighborhood"),
 ("ssora","ссора","ссо́ра","quarrel"),
 ("korobka","коробка","ко́робка","box"),
 ("zatopit","затопить","затопи́ть","to flood (below)"),
 ("potop","потоп","пото́п","flood"),
 ("protichka","протечка","проте́чка","leak"),
 ("uborka","уборка","убо́рка","cleaning"),
 ("pyl","пыль","пыль","dust"),
 ("musor","мусор","мо́сор","garbage"),
 ("konteyner","контейнер","контейне́р","bin, container"),
 ("kust","куст","куст","bush"),
 ("gaz","газ","газ","gas"),
 ("schetchik","счётчик","счётчик","meter"),
 ("snyat","снять","снять","to rent, take off"),
 ("koridor","коридор","коридо́р","corridor"),
 ("rakovina","раковина","ракови́на","sink"),
 ("dacha","дача","да́ча","country house"),
 ("uchastok","участок","уча́сток","plot"),
 ("vorota","ворота","воро́та","gate"),
 ("besedka","беседка","бесе́дка","gazebo"),
 ("klumba","клумба","клу́мба","flower bed"),
 ("urozhay","урожай","урожа́й","harvest"),
 ("ogorod","огород","огоро́д","vegetable garden"),
 ("leika","лейка","ле́йка","watering can"),
 ("lopata","лопата","лопа́та","shovel"),
 ("shlang","шланг","шланг","hose"),
 ("vedro","ведро","ведро́","bucket"),
 ("bochka","бочка","бо́чка","barrel"),
 ("shvabra","швабра","швабра́","mop"),
 ("polotenze","полотенце","полоте́нце","towel"),
 ("prostynya","простыня","простыня́","bedsheet"),
 ("odeyalo","одеяло","одея́ло","blanket"),
 ("podushka","подушка","поду́шка","pillow"),
 ("kovrik","коврик","ко́врик","small rug"),
 ("polovik","половик","полови́к","rug"),
]

def entry(rid, text, stress, gloss):
    return {"id": f"ru.lex.housing.{rid}", "status": "draft",
            "forms": [{"text": text}], "readings": [{"text": stress}],
            "glosses": {"en-US": [gloss]}, "sources": SRC, "generation": GEN}

with open(os.path.join(R, "lexicon", "housing.jsonl"), "w") as f:
    for rid, text, stress, gloss in WORDS:
        f.write(json.dumps(entry(rid, text, stress, gloss), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ru.grammar.b1.net-genitive", "name": "Нет + genitive", "category": "syntax",
  "definition": "Absence uses нет + genitive: нет шума, нет воды. Learn the supplied chunks as given."},
 {"id": "ru.grammar.b1.instrumental-tools", "name": "Instrumental of tool", "category": "syntax",
  "definition": "Tools take instrumental: убирать шваброй, резать ножом. Learn the supplied chunks as given."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("u260","Это квартира.","This is an apartment.",["квартира"]),
 ("u261","Это аренда.","This is rent.",["аренда"]),
 ("u262","Это хозяин.","This is the landlord.",["хозяин"]),
 ("u263","Это шум.","This is noise.",["шум"]),
 ("u264","Это ссора.","This is a quarrel.",["ссора"]),
 ("u265","Это потоп.","This is a flood.",["потоп"]),
 ("u266","Это уборка.","This is cleaning.",["уборка"]),
 ("u267","Это мусор.","This is garbage.",["мусор"]),
 ("u268","Это собрание.","This is a meeting.",["собрание"]),
 ("u269","Это коврик.","This is a small rug.",["коврик"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, gloss, cloze in SENTS:
        e = {"id": f"ru.sent.b1.{sid}", "status": "draft", "text": text, "gloss": gloss,
             "cloze_targets": cloze, "sources": SRC, "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

OLD_GRAM = ["ru.grammar.on-ramp.eto-identification", "ru.grammar.on-ramp.zero-present-copula"]

U = [
 ("260-housing-problems-01","Apartment","квартира, снять, хозяин, аренда and участок.",
  ["kvartira","snyat","hozyain","arenda","uchastok"], "s:u260",
  "Do not confuse хозяин (owner) with арендатор (tenant)."),
 ("261-housing-problems-02","Rent","аренда, арендатор, квартира, счётчик and газ.",
  ["arenda","arendator","kvartira","schetchik","gaz"], "s:u261",
  "Do not confuse аренда (rent) with хозяин (owner)."),
 ("262-housing-problems-03","Heat and light","отопление, тепло, свет, кран and труба.",
  ["otoplenie","teplo","svet","kran","truba"], "s:u262",
  "Do not confuse отопление (heating) with свет (light)."),
 ("263-housing-problems-04","Noise","шум, соседство, ссора, домофон and собрание.",
  ["shum","sosedstvo","ssora","domofon","sobranie"], "s:u263",
  "Do not confuse шум (noise) with ссора (quarrel)."),
 ("264-housing-problems-05","Quarrels","ссора, собрание, шум, соседство and коридор.",
  ["ssora","sobranie","shum","sosedstvo","koridor"], "s:u264",
  "Do not confuse собрание (meeting) with ссора (quarrel)."),
 ("265-housing-problems-06","Flooding","потоп, протечка, затопить, раковина and кран.",
  ["potop","protichka","zatopit","rakovina","kran"], "s:u265",
  "Do not confuse протечка (leak) with потоп (flood)."),
 ("266-housing-problems-07","Cleaning","уборка, пыль, швабра, ведро and полотенце.",
  ["uborka","pyl","shvabra","vedro","polotenze"], "s:u266",
  "Do not confuse швабра (mop) with ведро (bucket)."),
 ("267-housing-problems-08","Garbage","мусор, контейнер, коробка, коврик and половик.",
  ["musor","konteyner","korobka","kovrik","polovik"], "s:u267",
  "Do not confuse коврик (small rug) with половик (rug)."),
 ("268-housing-problems-09","Building meeting","собрание, соседство, участок, ворота and беседка.",
  ["sobranie","sosedstvo","uchastok","vorota","besedka"], "s:u268",
  "Do not confuse ворота (gate) with беседка (gazebo)."),
 ("269-housing-problems-10","Bedroom","подушка, одеяло, простыня, мебель and стул.",
  ["podushka","odeyalo","prostynya","mebel","stul"], "s:u269",
  "Do not confuse подушка (pillow) with одеяло (blanket)."),
]

def unit_yaml(fname, title, summary, words, newitem, fence):
    uid = fname.split("-", 1)[1]
    num = fname[:3]
    lex = [w if w.startswith("ru.lex.") else f"ru.lex.housing.{w}" for w in words]
    if newitem.startswith("s:"):
        newref = f"ru.sent.b1.{newitem[2:]}"
        allowed_gram = OLD_GRAM
    else:
        newref = newitem[2:]
        allowed_gram = [newref] + OLD_GRAM
    old = ["ru.lex.everyday.eto", "ru.lex.everyday.dom"]
    refs = lex + [newref] + old
    L = []
    L.append('id: "ru.unit.b1.' + uid + '"')
    L.append('goal_id: "ru.goal.b1.practical-problems"')
    L.append(f'title: "{title}"')
    L.append(f'summary: "{summary}"')
    L.append("estimated_minutes: 8")
    L.append("activities:")
    L.append(f'  - id: "ru.activity.b1.u{num}-read"')
    L.append('    type: "encounter-read"')
    L.append('    modality: "reading"')
    L.append("    support_level: 1")
    L.append("    content_refs: &v [" + ", ".join(f'"{r}"' for r in refs) + "]")
    L.append(f'  - id: "ru.activity.b1.u{num}-grammar"')
    L.append('    type: "encounter-read"')
    L.append('    modality: "reading"')
    L.append("    support_level: 1")
    L.append("    content_refs: &g [" + ", ".join(f'"{r}"' for r in allowed_gram) + "]")
    if newitem.startswith("s:"):
        L.append(f'  - id: "ru.activity.b1.u{num}-cloze"')
        L.append('    type: "cloze"')
        L.append('    modality: "writing"')
        L.append("    support_level: 1")
        L.append(f'    content_refs: ["{newref}"]')
    L.append(f'  - id: "ru.activity.b1.u{num}-write"')
    L.append('    type: "recall"')
    L.append('    modality: "writing"')
    L.append("    support_level: 0")
    L.append("    content_refs: *v")
    L.append("generation_contract:")
    L.append("  allowed_vocab: *v")
    L.append("  allowed_grammar: *g")
    L.append("  new_item_budget: 6")
    L.append("  register: []")
    L.append(f'  expected_interpretations: ["{title}: housing with taught forms only."]')
    L.append(f'  prohibited_ambiguity: ["{fence}"]')
    L.append('  target_proficiency: "B1"')
    L.append('  validation_method: "choice"')
    return "\n".join(L) + "\n"

for fname, title, summary, words, newitem, fence in U:
    with open(os.path.join(R, "curriculum", "units", fname + ".yaml"), "w") as f:
        f.write(unit_yaml(fname, title, summary, words, newitem, fence))

print("ru batch 24 written")
assert len(WORDS) == 50, len(WORDS)
