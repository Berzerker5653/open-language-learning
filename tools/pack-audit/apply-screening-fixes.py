#!/usr/bin/env python3
"""Apply screening-verified fixes to ja-JP / ru-RU packs. Deterministic only.

Authorities: JMdict (tmp/jmdict), Zaliznyak 6th ed. (tmp/zaliznyak).
Policy (safe-by-default; gloss is intent, reading drifts):
  A. ja entries whose kana reading is not in JMdict, or whose gloss has zero token
     overlap with every JMdict sense of the reading: replace the reading with the
     JMdict reading whose glosses match the entry gloss AND is within 2 kana edits
     of the current reading (unique best only). Update romaji. Else log unresolved.
     Glosses are NEVER rewritten.
  B. ru readings: whole-lexicon stress re-check against Zaliznyak (single-stress
     headwords only); fix mismatches.
All changes logged to docs/review/ai-screening-2026-10-05/applied.jsonl.
"""
import json, glob, os, re, unicodedata

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
AUX = os.path.join(ROOT, "docs/review/ai-screening-2026-10-05")
def to_hira(s):
    return unicodedata.normalize('NFKC', ''.join(
        chr(ord(c) - 0x60) if '\u30a1' <= c <= '\u30fa' else
        ('\u30fc' if c == '\u301c' else c)
        for c in s))

def gloss_tokens(g):
    return set(re.findall(r"[a-z]{3,}", g.lower()))

# ---------- dictionaries ----------
jm = json.load(open(os.path.join(ROOT, "tmp/jmdict/jmdict-eng-3.6.2.json")))['words']
kana_gl = {}
for e in jm:
    kana = [to_hira(k['text']) for k in e.get('kana', [])]
    if not kana: continue
    gl = [g['text'] for s in e.get('sense', []) for g in s.get('gloss', []) if g.get('lang') == 'eng']
    for k in kana:
        kana_gl.setdefault(k, []).extend(gl)

tok2kana = {}
rd_tokens = {}
for k, v in kana_gl.items():
    ts = set()
    for g in v:
        for t in gloss_tokens(g):
            tok2kana.setdefault(t, set()).add(k)
            ts.add(t)
    rd_tokens[k] = ts

zal = {}
for sub in ["Нарицательные", "Глаголы"]:
    d = os.path.join(ROOT, "tmp/zaliznyak/dictionary", sub)
    for fn in sorted(os.listdir(d)):
        for line in open(os.path.join(d, fn), encoding='utf-8'):
            line = line.strip()
            if not line: continue
            w = line.split()[0]
            if w.count('\u0301') != 1: continue
            base = w.replace('\u0301', '').replace('ё', 'е').replace('Ё', 'Е').lower()
            if base not in zal: zal[base] = w

# ---------- Hepburn (long vowels ou/uu per pack style) ----------
_DAK = {"が":"ga","ぎ":"gi","ぐ":"gu","げ":"ge","ご":"go","ざ":"za","じ":"ji","ず":"zu","ぜ":"ze","ぞ":"zo",
        "だ":"da","ぢ":"ji","づ":"zu","で":"de","ど":"do","ば":"ba","び":"bi","ぶ":"bu","べ":"be","ぼ":"bo",
        "ぱ":"pa","ぴ":"pi","ぷ":"pu","ぺ":"pe","ぽ":"po"}
_KI = {"か":"ka","き":"ki","く":"ku","け":"ke","こ":"ko","さ":"sa","し":"shi","す":"su","せ":"se","そ":"so",
       "た":"ta","ち":"chi","つ":"tsu","て":"te","と":"to","な":"na","に":"ni","ぬ":"nu","ね":"ne","の":"no",
       "は":"ha","ひ":"hi","ふ":"fu","へ":"he","ほ":"ho","ま":"ma","み":"mi","む":"mu","め":"me","も":"mo",
       "や":"ya","ゆ":"yu","よ":"yo","ら":"ra","り":"ri","る":"ru","れ":"re","ろ":"ro","わ":"wa","を":"wo",
       "ん":"n"}
def hepburn(kana):
    out=[]; i=0
    while i < len(kana):
        c=kana[i]
        if c in _DAK: out.append(_DAK[c]); i+=1; continue
        if c in _KI:
            r=_KI[c]
            if i+1 < len(kana):
                nxt=kana[i+1]
                cv=next((v for v in "aiueo" if r.endswith(v)), None)
                if cv and nxt==cv:
                    r = (r[:-1]+{"e":"ou","o":"ou"}[cv]) if cv in "eo" else r+"u"
                    i+=1
            out.append(r); i+=1; continue
        if c=="っ": out.append(""); i+=1; continue
        out.append(c); i+=1
    return "".join(out)

def kana_lev(a,b):
    m,n=len(a),len(b)
    dp=list(range(n+1))
    for i in range(1,m+1):
        prev=dp[0]; dp[0]=i
        for j in range(1,n+1):
            cur=dp[j]
            dp[j]=min(dp[j]+1,dp[j-1]+1,prev+(a[i-1]!=b[j-1]))
            prev=cur
    return dp[n]

log = open(os.path.join(AUX, "applied.jsonl"), "w")
def logit(eid, action, before, after, why):
    log.write(json.dumps({"id": eid, "action": action, "before": before, "after": after, "why": why}, ensure_ascii=False) + "\n")

stats = {}
def bump(k): stats[k] = stats.get(k, 0) + 1

# ---------- A: ja lexicon reading fixes ----------
for path in sorted(glob.glob(os.path.join(ROOT, "languages/ja-JP/lexicon/*.jsonl"))):
    lines = open(path, encoding="utf-8").read().splitlines()
    out = []
    for line in lines:
        e = json.loads(line)
        kana = to_hira(e["readings"][0]["text"])
        gloss = e["glosses"]["en-US"][0]
        before = json.dumps(e, ensure_ascii=False, sort_keys=True)
        known = kana in kana_gl
        if not known or not (gloss_tokens(gloss) & rd_tokens.get(kana, set())):
            toks = gloss_tokens(gloss)
            cands = None
            for t in toks:
                s = tok2kana.get(t)
                if not s: cands = set(); break
                cands = s if cands is None else (cands & s)
            scored = sorted((kana_lev(kana, c), c) for c in (cands or ()))
            if scored and scored[0][0] <= 2 and (len(scored) < 2 or scored[0][0] < scored[1][0]):
                new = scored[0][1]
                e["forms"][0]["text"] = new
                e["readings"][0]["text"] = new
                for r in e["readings"]:
                    if "transliteration_system" in r:
                        r["text"] = hepburn(new)
                logit(e["id"], "fix_reading", kana, new,
                      ("reading not in JMdict; " if not known else "gloss matched no sense of reading; ")
                      + f"intended word recovered within {scored[0][0]} kana edits")
                bump("ja_fix_reading")
            else:
                logit(e["id"], "unresolved", kana, "", "no unique dictionary reading within 2 edits of gloss")
                bump("ja_unresolved")
        out.append(json.dumps(e, ensure_ascii=False) if json.dumps(e, ensure_ascii=False, sort_keys=True) != before else line)
    open(path, "w", encoding="utf-8").write("\n".join(out) + "\n")

# ---------- B: ru stress whole-lexicon ----------
for path in sorted(glob.glob(os.path.join(ROOT, "languages/ru-RU/lexicon/*.jsonl"))):
    lines = open(path, encoding="utf-8").read().splitlines()
    out = []
    for line in lines:
        e = json.loads(line)
        form = e["forms"][0]["text"]
        base = form.replace("\u0301", "").replace("ё", "е").replace("Ё", "Е").lower()
        before = json.dumps(e, ensure_ascii=False, sort_keys=True)
        if base in zal:
            want = zal[base]
            for r in e["readings"]:
                if r["text"].replace("\u0301", "").lower() == base and r["text"] != want:
                    old = r["text"]; r["text"] = want
                    logit(e["id"], "fix_stress", old, want, "Zaliznyak headword stress")
                    bump("ru_fix_stress")
        out.append(json.dumps(e, ensure_ascii=False) if json.dumps(e, ensure_ascii=False, sort_keys=True) != before else line)
    open(path, "w", encoding="utf-8").write("\n".join(out) + "\n")

log.close()
print(stats)
