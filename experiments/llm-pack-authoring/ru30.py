#!/usr/bin/env python3
"""ru-RU batch 30: B1 units 320-329 (media accounts, reviews, reactions)."""
import json, os

R = "experiments/llm-pack-authoring/candidates/ru-fullkit-v1"
SRC = ["ru-original"]
GEN = {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s",
       "date": "2026-10-05", "notes": "ai-drafted; needs dictionary sourcing and human review"}

WORDS = [
 ("set2","сеть","сеть","network"),
 ("akkaunt","аккаунт","акка́унт","account"),
 ("profil","профиль","профи́ль","profile"),
 ("podpiska","подписка","подпи́ска","subscription"),
 ("podchik","подписчик","подпи́счик","subscriber"),
 ("layk","лайк","лайк","like"),
 ("kommentarij","комментарий","коммента́рий","comment"),
 ("post","пост","пост","post"),
 ("novost","новость","но́вость","news item"),
 ("kanal","канал","ка́нал","channel"),
 ("peredacha","передача","переда́ча","broadcast"),
 ("repotazh","репортаж","репорта́ж","report"),
 ("intervyu","интервью","интервью́","interview"),
 ("opros","опрос","о́прос","poll"),
 ("reyting","рейтинг","ре́йтинг","rating"),
 ("banner","баннер","ба́ннер","banner ad"),
 ("sponsor","спонсор","спо́нсор","sponsor"),
 ("brend","бренд","бренд","brand"),
 ("auditoriya","аудитория","аудито́рия","audience"),
 ("ohvat","охват","охва́т","reach"),
 ("trend","тренд","тренд","trend"),
 ("hashteg","хештег","хеште́г","hashtag"),
 ("skandal","скандал","ска́ндал","scandal"),
 ("sluh","слух","слух","rumor"),
 ("spletnya","сплетня","спле́тня","gossip"),
 ("lozh","ложь","ложь","lie"),
 ("istochnik","источник","исто́чник","source"),
 ("redaktor","редактор","реда́ктор","editor"),
 ("zhurnalists","журналист","журнали́ст","journalist"),
 ("reporter","репортёр","репортёр","reporter"),
 ("blog","блог","бло́г","blog"),
 ("bloger","блогер","бло́гер","blogger"),
 ("strim","стрим","стрим","stream"),
 ("podkast","подкаст","подка́ст","podcast"),
 ("seriya","серия","се́рия","series"),
 ("sezon","сезон","се́зон","season"),
 ("treyler","трейлер","тре́йлер","trailer"),
 ("tizer","тизер","ти́зер","teaser"),
 ("print","принт","принт","print"),
 ("gazeta","газета","газе́та","newspaper"),
 ("zhurnal","журнал","журна́л","magazine"),
 ("chitatel","читатель","чита́тель","reader"),
 ("radio","радио","ра́дио","radio"),
 ("televidenie","телевидение","телеве́дение","television"),
 ("svodka","сводка","сво́дка","news digest"),
 ("zametka","заметка","заме́тка","short article"),
 ("ocherk","очерк","о́черк","feature article"),
 ("klik","клик","клик","click"),
 ("diskussiya","дискуссия","диску́ссия","discussion"),
 ("istina","истина","и́стина","truth"),
]

def entry(rid, text, stress, gloss):
    return {"id": f"ru.lex.media.{rid}", "status": "draft",
            "forms": [{"text": text}], "readings": [{"text": stress}],
            "glosses": {"en-US": [gloss]}, "sources": SRC, "generation": GEN}

with open(os.path.join(R, "lexicon", "media.jsonl"), "w") as f:
    for rid, text, stress, gloss in WORDS:
        f.write(json.dumps(entry(rid, text, stress, gloss), ensure_ascii=False) + "\n")

GRAMMAR = [
 {"id": "ru.grammar.b1.podpisatsya-na", "name": "Подписаться на + acc", "category": "syntax",
  "definition": "Subscribing uses подписаться на + accusative: подписаться на канал. Learn the supplied chunks as given."},
 {"id": "ru.grammar.b1.po-mneniyu", "name": "По мнению + gen", "category": "syntax",
  "definition": "Attribution uses по мнению + genitive: по мнению критика. Learn the supplied chunks as given."},
]
for g in GRAMMAR:
    g.update({"status": "draft", "sources": SRC, "generation": GEN})
with open(os.path.join(R, "grammar", "concepts.jsonl"), "a") as f:
    for g in GRAMMAR:
        f.write(json.dumps(g, ensure_ascii=False) + "\n")

SENTS = [
 ("u320","Это аккаунт.","This is an account.",["аккаунт"]),
 ("u321","Это пост.","This is a post.",["пост"]),
 ("u322","Это канал.","This is a channel.",["канал"]),
 ("u323","Это интервью.","This is an interview.",["интервью"]),
 ("u324","Это опрос.","This is a poll.",["опрос"]),
 ("u325","Это слух.","This is a rumor.",["слух"]),
 ("u326","Это источник.","This is a source.",["источник"]),
 ("u327","Это блог.","This is a blog.",["блог"]),
 ("u328","Это подкаст.","This is a podcast.",["подкаст"]),
 ("u329","Это газета.","This is a newspaper.",["газета"]),
]
with open(os.path.join(R, "sentences", "entries.jsonl"), "a") as f:
    for sid, text, gloss, cloze in SENTS:
        e = {"id": f"ru.sent.b1.{sid}", "status": "draft", "text": text, "gloss": gloss,
             "cloze_targets": cloze, "sources": SRC, "generation": GEN}
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

OLD_GRAM = ["ru.grammar.on-ramp.eto-identification", "ru.grammar.on-ramp.zero-present-copula"]

U = [
 ("320-media-01","Account","аккаунт, профиль, сеть, подписка and подписчик.",
  ["akkaunt","profil","set2","podpiska","podchik"], "s:u320",
  "Do not confuse подписка (subscription) with подписчик (subscriber)."),
 ("321-media-02","Post","пост, лайк, комментарий, хештег and клик.",
  ["post","layk","kommentarij","hashteg","klik"], "s:u321",
  "Do not confuse лайк (like) with комментарий (comment)."),
 ("322-media-03","Channel","канал, передача, охват, аудитория and тренд.",
  ["kanal","peredacha","ohvat","auditoriya","trend"], "s:u322",
  "Do not confuse аудитория (audience) with охват (reach)."),
 ("323-media-04","Interview","интервью, репортаж, репортёр, журналист and редактор.",
  ["intervyu","repotazh","reporter","zhurnalists","redaktor"], "s:u323",
  "Do not confuse репортёр (reporter) with редактор (editor)."),
 ("324-media-05","Poll","опрос, рейтинг, дискуссия, спонсор and бренд.",
  ["opros","reyting","diskussiya","sponsor","brend"], "s:u324",
  "Do not confuse рейтинг (rating) with опрос (poll)."),
 ("325-media-06","Rumor","слух, сплетня, скандал, ложь and истина.",
  ["sluh","spletnya","skandal","lozh","istina"], "s:u325",
  "Do not confuse слух (rumor) with сплетня (gossip)."),
 ("326-media-07","Source","источник, истина, заметка, очерк and сводка.",
  ["istochnik","istina","zametka","ocherk","svodka"], "s:u326",
  "Do not confuse заметка (short article) with очерк (feature)."),
 ("327-media-08","Blog","блог, блогер, стрим, подкаст and серия.",
  ["blog","bloger","strim","podkast","seriya"], "s:u327",
  "Do not confuse блогер (blogger) with читатель (reader)."),
 ("328-media-09","Podcast","подкаст, сезон, трейлер, тизер and принт.",
  ["podkast","sezon","treyler","tizer","print"], "s:u328",
  "Do not confuse трейлер (trailer) with тизер (teaser)."),
 ("329-media-10","Newspaper","газета, журнал, читатель, радио and телевидение.",
  ["gazeta","zhurnal","chitatel","radio","televidenie"], "s:u329",
  "Do not confuse журнал (magazine) with газета (newspaper)."),
]

def unit_yaml(fname, title, summary, words, newitem, fence):
    uid = fname.split("-", 1)[1]
    num = fname[:3]
    lex = [w if w.startswith("ru.lex.") else f"ru.lex.media.{w}" for w in words]
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
    L.append('goal_id: "ru.goal.b1.culture-media"')
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
    L.append(f'  expected_interpretations: ["{title}: media with taught forms only."]')
    L.append(f'  prohibited_ambiguity: ["{fence}"]')
    L.append('  target_proficiency: "B1"')
    L.append('  validation_method: "choice"')
    return "\n".join(L) + "\n"

for fname, title, summary, words, newitem, fence in U:
    with open(os.path.join(R, "curriculum", "units", fname + ".yaml"), "w") as f:
        f.write(unit_yaml(fname, title, summary, words, newitem, fence))

print("ru batch 30 written")
assert len(WORDS) == 50, len(WORDS)
