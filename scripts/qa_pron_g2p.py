#!/usr/bin/env python3
"""Expected-phone derivation for the phoneme QA gate (scripts/qa-pron.py).

Turns the manifest `text` (the exact string fed to the TTS engine) into an
IPA phone sequence for that language. Stdlib only, deterministic.

Languages with G2P here: ja (kana text), ru (Cyrillic text with U+0301
stress marks). Every other language returns None => the caller must ABSTAIN
explicitly ("no G2P"), never silently pass.

These are approximations of surface phonetics, not a phonologist's G2P:
ru vowel reduction and ja sandhi are simplified (see README "G2P
approximations"). The gate is calibrated so that the approximations land
inside the tolerance on known-good clips; what it certifies is that the
phone *sequence* matches, not that the accent is native.
"""
from __future__ import annotations

import unicodedata

# --------------------------------------------------------------------------
# dispatch
# --------------------------------------------------------------------------

def espeak_g2p(text: str, lang: str) -> list[str] | None:
    """espeak-ng IPA output — the symbol space the recognizer
    (wav2vec2-xlsr-53-**espeak**-cv-ft) was trained on, so convention
    noise cancels. Returns phones, or None when the voice is unknown /
    output empty."""
    import shutil
    import subprocess
    if not shutil.which("espeak-ng"):
        return None
    try:
        r = subprocess.run(["espeak-ng", "-v", lang, "--ipa", text],
                           capture_output=True, text=True, timeout=10)
    except Exception:
        return None
    s = r.stdout.strip()
    if not s:
        return None
    return [ch for ch in unicodedata.normalize("NFC", s)
            if ch not in " \tˈˌ'ˌ,;:"]


def g2p(text: str, lang: str) -> list[str] | None:
    """Expected phones for `text` in `lang` ('ja'|'ru'); None = no G2P.
    espeak-ng first (recognizer-native IPA space); the module's own
    ja/ru tables as fallback when espeak-ng is absent."""
    base = lang.split("-")[0].lower()
    e = espeak_g2p(text, base)
    if e:
        return e
    if base == "ja":
        return japanese(text)
    if base == "ru":
        return russian(text)
    return None


def lang_from_pack_dir(name: str) -> str:
    """languages/ja-JP -> 'ja'. Unknown dirs yield the raw name (=> abstain)."""
    return name.split("-")[0].lower()


# --------------------------------------------------------------------------
# Japanese: kana (hiragana or katakana) -> mora -> IPA
# --------------------------------------------------------------------------

_KATA_OFF = 0x60  # katakana codepoints are hiragana + 0x60 for the main block

# mora -> (onset, vowel). Empty onset/vowel handled per row.
_JA_MORA: dict[str, tuple[str, str]] = {}

def _m(series: list[str], onsets: list[str]) -> None:
    for kana, (o, v) in zip(series, zip(onsets, "aeiou")):
        _JA_MORA[kana] = (o, v)

_m(["あ", "い", "う", "え", "お"], ["", "", "", "", ""])
_m(["か", "き", "く", "け", "こ"], ["k"] * 5)
_m(["さ", "し", "す", "せ", "そ"], ["s", "ɕ", "s", "s", "s"])
_m(["た", "ち", "つ", "て", "と"], ["t", "tɕ", "ts", "t", "t"])
_m(["な", "に", "ぬ", "ね", "の"], ["n"] * 5)
_m(["は", "ひ", "ふ", "へ", "ほ"], ["h", "ç", "ɸ", "h", "h"])
_m(["ま", "み", "む", "め", "も"], ["m"] * 5)
_m(["や", "ゆ", "よ"], ["j", "j", "j"])
_m(["ら", "り", "る", "れ", "ろ"], ["ɾ"] * 5)
_m(["わ"], ["w"])
_m(["を"], ["w"])  # particle を = wo; keep onset w, vowel handled below
_JA_MORA["を"] = ("w", "o")
# dakuten
_m(["が", "ぎ", "ぐ", "げ", "ご"], ["ɡ"] * 5)
_m(["ざ", "じ", "ず", "ぜ", "ぞ"], ["z", "ʑ", "z", "z", "z"])
_m(["だ", "ぢ", "づ", "で", "ど"], ["d", "dʑ", "dz", "d", "d"])
_m(["ば", "び", "ぶ", "べ", "ぼ"], ["b"] * 5)
# handakuten
_m(["ぱ", "ぴ", "ぷ", "ぺ", "ぽ"], ["p"] * 5)
# small kana standalone (rare outside combos)
for _k, _v in (("ゃ", ("j", "a")), ("ゅ", ("j", "u")), ("ょ", ("j", "o")),
               ("ァ", None)):
    if _v is not None:
        _JA_MORA[_k] = _v
# small combo kana: palatalized onset on the base row
for _base, _sm in (("か", "ゃ"), ("き", "ゃ"), ("ひ", "ゃ"), ("み", "ゃ"),
                   ("り", "ゃ"), ("ぎ", "ゃ"), ("び", "ゃ"), ("ぴ", "ゃ"),
                   ("し", "ゃ"), ("ち", "ゃ")):
    pass  # combos handled inline in the scan loop below
_JA_COMBO_VOWEL = {"ゃ": "a", "ゅ": "u", "ょ": "o"}


def _kana_to_hira(c: str) -> str:
    o = ord(c)
    if 0x30A1 <= o <= 0x30FA:   # katakana main block
        return chr(o - _KATA_OFF)
    return c


def japanese(text: str) -> list[str]:
    """kana-only text -> IPA phones (documented simplifications):
      * long vowels: ー after a vowel, or a repeat of the same vowel mora,
        or o+う / e+い spellings -> vowel + 'ː'
      * っ/ッ (sokuon): doubles the onset of the next mora ('geminate')
      * ん/ン (moraic n): m before b/m/p, else n
      * combos きゃ etc.: onset + 'ʲ' + vowel
    """
    text = unicodedata.normalize("NFC", text)
    phones: list[str] = []
    pending_geminate = False
    i = 0
    last_vowel = ""
    while i < len(text):
        c = _kana_to_hira(text[i])
        nxt = text[i + 1] if i + 1 < len(text) else ""
        if c in "っー〜":
            if c == "っ":
                pending_geminate = True
            else:  # ー / 〜 extend the previous vowel
                if last_vowel and phones:
                    _extend_length(phones, last_vowel)
            i += 1
            continue
        if c in "ん":
            phones.append("n")  # refined below once we see the next onset
            i += 1
            continue
        m = _JA_MORA.get(c)
        if m is None:
            if c in _JA_COMBO_VOWEL:
                # stray small kana without a base: treat as plain mora
                o, v = "j", _JA_COMBO_VOWEL[c]
            else:
                i += 1  # spaces, punctuation, kanji (pack text is kana)
                continue
            i += 1
        else:
            o, v = m
            i += 1
            if nxt and _kana_to_hira(nxt) in _JA_COMBO_VOWEL:
                if v == "i" and o in ("s", "ɕ", "t", "tɕ", "h", "ç", "ɡ", "b", "p", "ɾ", "z", "ʑ", "n", "m", "j"):
                    o = o + "ʲ"
                v = _JA_COMBO_VOWEL[_kana_to_hira(nxt)]
                i += 1
        # long-vowel spelling rules: おう / えい (and おお/いい/うえ->none)
        if v == "o" and nxt and _kana_to_hira(nxt) == "う":
            v = "oː"
            i += 1
        elif v == "e" and nxt and _kana_to_hira(nxt) == "い":
            v = "eː"
            i += 1
        elif last_vowel == v and v and phones:
            # same vowel twice in a row -> long (おばあさん = obaasan)
            _extend_length(phones, v)
        if pending_geminate:
            if o:
                phones.append(o)  # first copy of the geminate onset
            pending_geminate = False
        if o:
            phones.append(o)
        if v:
            phones.append(v)
            last_vowel = v
        else:
            last_vowel = ""
    # moraic n assimilation: n -> m before b/m/p onsets
    for k, p in enumerate(phones):
        if p == "n" and k + 1 < len(phones) and phones[k + 1] in ("b", "m", "p"):
            phones[k] = "m"
    return phones


def _extend_length(phones: list[str], v: str) -> None:
    # merge a following identical vowel into the previous vowel as long
    if phones and phones[-1] == v:
        phones[-1] = v + "ː"
    else:
        phones.append(v + "ː")


# --------------------------------------------------------------------------
# Russian: Cyrillic -> IPA. Stress is U+0301 (pack convention); monosyllabic
# words are stressed by default. Approximate reduction rules, documented:
#   * stressed: а→a о→o е/э→ɛ и→i ы→ɨ у→u е→ɛ ё→jo я→ja ю→ju
#   * unstressed о→a (always); е→i (okanye); а→i word-finally or >=2
#     syllables before stress, else ɐ; я→(j)i; ё→(j)o→u with stress on ё.
#   * consonant clusters for ц→ts, ч→tɕ, щ→ɕː kept simple.
#   * ь softens the preceding consonant (adds ʲ); ъ deleted.
# --------------------------------------------------------------------------

_RU_SIMPLE: dict[str, str] = {
    "а": "a", "б": "b", "в": "v", "г": "ɡ", "д": "d", "ж": "ʐ", "з": "z",
    "и": "i", "й": "j", "к": "k", "л": "l", "м": "m", "н": "n", "о": "o",
    "п": "p", "р": "r", "с": "s", "т": "t", "у": "u", "ф": "f", "х": "x",
    "ы": "ɨ", "ь": "", "ъ": "", "э": "ɛ",
}
_RU_VOICED = set("бгджзйлмнр")
_RU_FRONT = set("еёиyuя".replace("u", "ю"))  # е ё и ю я palatalize
_RU_FRONT = set("еёиюя")


def russian(text: str) -> list[str]:
    s = unicodedata.normalize("NFC", text.lower())
    # 1. mark stress: vowel followed by U+0301; ё is always stressed
    stressed: set[int] = set()
    chars: list[str] = []
    k = 0
    for ch in s:
        if ch == "́":
            if chars and chars[-1] in "аеёиоуыэюя":
                stressed.add(len(chars) - 1)
            continue
        if ch == "ё":
            stressed.add(k)
        chars.append(ch)
        k += 1
    # 2. monosyllabic => that vowel carries the stress
    vowel_idx = [i for i, c in enumerate(chars) if c in "аеёиоуыэюя"]
    if vowel_idx and not (stressed & set(vowel_idx)):
        stressed.add(vowel_idx[-1] if len(vowel_idx) == 1 else len(vowel_idx) - 1)
    # distance (in syllables) from each vowel to the next stressed vowel
    next_stress_dist: dict[int, int] = {}
    nxt = None
    for i in range(len(chars) - 1, -1, -1):
        if chars[i] in "аеёиоуыэюя":
            if i in stressed:
                nxt = 0
            elif nxt is not None:
                nxt += 1
            next_stress_dist[i] = nxt if nxt is not None else 99
    # 3. walk
    phones: list[str] = []
    i = 0
    n = len(chars)
    soft_next = False
    while i < n:
        c = chars[i]
        if c in "аеёиоуыэюя":
            st = i in stressed
            d = next_stress_dist.get(i, 99)
            if c == "а":
                phones.append("a" if st else ("i" if d >= 2 or d == 99 else "ɐ"))
            elif c == "о":
                phones.append("o" if st else "a")
            elif c == "е":
                if st:
                    phones.append("ɛ")
                else:
                    phones.append("i")
            elif c == "ё":
                phones.append("jo" if st else "jo")
            elif c == "э":
                phones.append("ɛ")
            elif c == "ю":
                phones.append("j" + ("u" if st else "ə"))
            elif c == "я":
                phones.append("j" + ("a" if st else ("i" if d >= 2 or d == 99 else "ɐ")))
            elif c == "и":
                phones.append("i")
            elif c == "у":
                phones.append("u")
            elif c == "ы":
                phones.append("ɨ")
            soft_next = False
            i += 1
            continue
        if c == "ц":
            ph = "ts"
        elif c == "ч":
            ph = "tɕ"
        elif c == "щ":
            ph = "ɕː"
        elif c == "й":
            phones.append("j")
            i += 1
            continue
        else:
            ph = _RU_SIMPLE.get(c, "")
        if ph:
            # front vowel palatalizes a preceding plain consonant marker:
            # handle here by peeking: if the NEXT char palatalizes, add ʲ
            nxtc = chars[i + 1] if i + 1 < n else ""
            if nxtc in _RU_FRONT or nxtc == "ь":
                if ph == "ts":
                    phones.append("tɕ")
                elif ph == "tɕ" or ph == "ɕː":
                    phones.append(ph)
                else:
                    phones.append(ph + "ʲ")
            elif ph == "х" and nxtc in "еёиюяэ":
                phones.append("x")
            else:
                phones.append(ph)
            # final obstruent devoicing (documented approximation)
            if i + 1 == n and ph in "bdɡzʐ":
                phones[-1] = {"b": "p", "d": "t", "ɡ": "k", "z": "s", "ʐ": "ʂ"}[ph]
        elif c == "ь":
            if phones and phones[-1].rstrip("ʲ") not in "aeiouɐɛɨjɕː" \
                    and not phones[-1].endswith("ʲ"):
                phones[-1] = phones[-1] + "ʲ"
        i += 1
    return [p for p in phones if p]
