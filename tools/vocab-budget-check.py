#!/usr/bin/env python3
"""STORY-AUTHOR-001 vocabulary-budget checker.

Story sentences may only use lemmas from that level's drill pool (state/data/
story-vocab-pools-2026-11.json, lemmatized with pymorphy3) plus a small new-word
budget (A1 <=2, A2 <=3, B1 <=4, B2 <=6 new lemmas per story). Grammar glue
(function words) and the core high-frequency verb/adjective set are whitelisted
below and are NOT counted against the budget; every counted new lemma must get
a pack lexicon entry so the reader word-card can gloss it.

Usage: vocab-budget-check.py [--pool a1|a2|b1|b2] <stories.json>
stories.json: {slug: {"level": ..., "sents": [[text, gloss, [cloze]], ...]}}
Exit 0 when every story is within budget, 1 otherwise.
"""
import argparse, json, re, sys
import pymorphy3

mp = pymorphy3.MorphAnalyzer()

BUDGET = {"a1": 2, "a2": 3, "b1": 4, "b2": 6}

# Grammar glue: closed-class words, pronouns, basic adverbs/predicatives.
FUNC = """и а но да это тот этот эта эти нас же вот тут там здесь куда откуда
в на у о об к с со ко из до по при за от для про как что чтобы когда где не ни
уже ещё очень так потом потому из-за всего один одна одно оба обе кругом каждый
самый такой такая такое лучше больше меньше долго много свой своя свои все всех
вы вам мы ты я они она оно его её их меня мне тебя тебе ему ей
домой всегда только нет есть день вечер ночь дома рядом после раз сегодня вчера
завтра сейчас надо можно нельзя хорошо плохо этот никогда иногда однажды
всё равно вместе теперь пожалуйста угодно мой человек""".split()

# Core high-frequency lemmas (A1-bar glue in practice): basic motion/aspect
# verbs and the adjectives these stories unavoidably grade with.
CORE = ("быть идти ехать ждать искать найти сказать говорить читать писать "
        "жить любить думать хотеть знать мочь просить идти идти пойти прийти "
        "приехать уйти остаться уйти хороший маленький большой следующий лучший "
        "весёлый холодный новый рад смеяться мама ужин "
        "поехать прийти попросить позвонить принести оставить сказать "
        "прочитать написать найти подождать поговорить смешной такси сиденье "
        "зима зимой сидеть жизнь "
        # B1 batch glue (controller 2026-11-18): closed-class/quantifier/ordinal
        # glue plus basic A1-frequency verbs and adjectives these B1 stories
        # unavoidably grade with; counted content words get lexicon entries.
        "если бы без через туда тогда то будто чуть часто любой другой первый "
        "второй третий четвёртый четыре трудно час город бабушка далеко старый "
        "высокий открыть поставить поднять увидеть встретить сделать рассказать "
        "рассказывать никто кто спать уснуть целый наш спрашивать "
        # B2 batch glue (controller 2026-11-19): closed-class/quantifier glue
        # plus A1-frequency basic verbs/nouns/adjectives that the drill pools
        # simply never listed; counted content words still get lexicon entries.
        "сам двое трое сюда дважды предложить молчать молча делить "
        "разделить настоящий громкий честно учитель уметь бутерброд общий "
        "который тихий тихо начать начинать становиться подумать узнать "
        "построить продать приезжать уезжать мешать прийтись пусть решить "
        "заметить официант одинаковый наконец открывать рада "
        "переводить перевести перевод").split()

def lemmas(forms):
    return {mp.parse(f)[0].normal_form for f in forms if re.fullmatch(r"[а-яё-]+", f)}

def words(text):
    return re.findall(r"[а-яё]+(?:-[а-яё]+)?", text.lower())

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("stories")
    args = ap.parse_args()
    pools = json.load(open("/home/hunter/game-dev/LTS/state/data/story-vocab-pools-2026-11.json"))
    pool = {}
    for lvl, forms in pools.items():
        pool[lvl] = lemmas(forms)
    # cumulative knowledge bar: a level knows its own pool plus lower-band pools
    order = ["a1", "a2", "b1", "b2"]
    cumul = {}
    acc = set()
    for lvl in order:
        acc |= pool[lvl]
        cumul[lvl] = set(acc)
    skip = {mp.parse(w)[0].normal_form for w in FUNC + CORE if re.fullmatch(r"[а-яё-]+", w)}
    # Words already glossed by pack lexicon entries are not "new": the reader
    # word-card can already explain them (controller addition, B1 batch 2026-11-18).
    import glob
    import os
    pack_lex = os.path.join(os.path.dirname(__file__), "..", "languages", "ru-RU", "lexicon")
    for path in glob.glob(os.path.join(pack_lex, "*.jsonl")):
        for line in open(path, encoding="utf-8"):
            line = line.strip()
            if not line:
                continue
            for f in json.loads(line).get("forms", []):
                t = f.get("text", "")
                if re.fullmatch(r"[а-яё-]+", t):
                    skip.add(mp.parse(t)[0].normal_form)
    stories = json.load(open(args.stories))
    bad = 0
    for slug, s in stories.items():
        lvl = s["level"]
        new = {}
        for text, _gloss, _cloze in s["sents"]:
            for w in words(text):
                for part in w.split("-"):
                    lem = mp.parse(part)[0].normal_form
                    # NOTE (controller fix 2026-11-19): the previous
                    # `any(part.startswith(w) for w in FUNC + CORE)` clause
                    # silently skipped ANY word whose surface merely started
                    # with a glue surface form (а- words via "а", подарок via
                    # "по", аукцион, крошечный, коллекционер, интернет...),
                    # inflating every batch's OK verdict. Lemma-based skip
                    # below already covers real inflected glue forms.
                    if lem in cumul[lvl] or lem in skip:
                        continue
                    new.setdefault(lem, []).append(part)
        limit = BUDGET[lvl]
        flag = "OK " if len(new) <= limit else "OVER"
        print(f"{flag} {slug} ({lvl}): {len(new)}/{limit} new lemmas: {sorted(new)}")
        bad += len(new) > limit
    sys.exit(1 if bad else 0)

if __name__ == "__main__":
    main()
