#!/usr/bin/env python3
# JA-B1-003-JOURNEYS-001: per-goal de-scaffold + re-journey transform.
# Usage: j001_transform.py <goal-short> [--apply]
# goal-short e.g. education-academic. Operates on repo main tree unit files.
import sys, re, glob, json, collections

REPO='/home/hunter/game-dev/LTS'
PACK=REPO+'/languages/ja-JP'

# ---------- sentence rows ----------
SENT={}
for f in glob.glob(PACK+'/sentences/*.jsonl'):
    for line in open(f):
        if line.strip():
            r=json.loads(line); SENT[r['id']]=r

# ---------- conservative grammar detector (romaji token patterns) ----------
TIME_WORDS=set(["jikan","ji","mainichi","maiasa","maihiichi","asa","yoru","toki","ban","getsuyoubi","kayoubi","suyoubi","mokuyoubi","kinyoubi","doyoubi","nichiyoubi","nemuki","nebuki","ashita","kinou","asatte","kon'ya","ima","gensai"])
def detect(romaji):
    r=romaji.lower().replace(',',' ')
    toks=r.split()
    out=[]
    def has(rx): return re.search(rx,r)
    if has(r'\bga\b'): out.append('ja.grammar.particle.subject-ga')
    if has(r'\bwa\b'): out.append('ja.grammar.particle.topic-wa')
    if has(r'\bwo\b'): out.append('ja.grammar.particle.object-wo')
    # possessive no, but not the nominaliser "no ni" / "no ga taboo"-style? nominaliser detection crude: skip when prev token ends in a verb-ish vowel+ru/su? keep simple: exclude 'no ni'
    if re.search(r'\bno\b(?! ni)',r): out.append('ja.grammar.particle.possessive-no')
    if has(r'\bni\b'):
        # classify: time-ni if adjacent to a time noun, else ni-destination
        idx=[i for i,t in enumerate(toks) if t=='ni']
        is_time=any((i+1<len(toks) and toks[i+1] in TIME_WORDS) or (i>0 and toks[i-1] in TIME_WORDS) for i in idx)
        out.append('ja.grammar.particle.time-ni' if is_time else 'ja.grammar.particle.ni-destination')
    if has(r'\bde\b'): out.append('ja.grammar.particle.de-means')
    if has(r'\bto\b'): out.append('ja.grammar.particle.companion-to')
    if has(r'\bmo\b'): out.append('ja.grammar.particle.addition-mo')
    if has(r'\be ni\b'): out.append('ja.grammar.particle.goal-e')
    if has(r'\bkara\b|\bmade\b'): out.append('ja.grammar.range.kara-made')
    if has(r'masu\b|mashita\b|masen|masu,|mashou'): out.append('ja.grammar.verb.polite-masu')
    if has(r'\bdesu\b|\bdeshita\b'): out.append('ja.grammar.copula.polite-desu')
    if has(r'\btai\b|\btai desu'): out.append('ja.grammar.verb.tai-desu')
    if has(r'\bka\.|\bka\b'): out.append('ja.grammar.particle.question-ka')
    if has(r'\b\d'): out.append('ja.grammar.counters.basic')
    if has(r'\bkono\b|\bsono\b|\bano\b'): out.append('ja.grammar.demonstratives.kore-sore-are')
    if has(r'\bsuki\b'): out.append('ja.grammar.adjectives.suki-na')
    if has(r"\b[a-zà-ž']+ na [a-zà-ž']+"): out.append('ja.grammar.adjectives.na-attributive')
    if has(r'\booi desu\b|\bhayai\b|\byasashii\b|\bkirei desu\b'): out.append('ja.grammar.adjectives.i-inflection')
    # te-form: any verb token ending in 'te' (exclude bare noun 'te'), sentence has a masu-verb
    te_tokens=[t for t in toks if len(t)>2 and t.endswith('te') and not t.endswith('sate')]
    if te_tokens and has(r'masu|mashita|masen|kudasai'):
        out.append('ja.grammar.verb.te-form-connect')
    if has(r'\bkudasai\b|\bitashimasu\b|\bitadakemasu\b|\bitadaki\b|\bosirase\b|\botazune\b'):
        out.append('ja.grammar.politeness.register')
    if has(r'\bmaiasa\b|\bmaihiichi\b|\bashita\b|kon\'ya\b|\bima\b|\bgensai\b|\bmai-'):
        out.append('ja.grammar.time.expressions')
    return out

# ---------- goal selection ----------
GOAL_SHORT=sys.argv[1]
APPLY='--apply' in sys.argv
GOAL='ja.goal.b1.'+GOAL_SHORT
units=[]
for f in sorted(glob.glob(PACK+'/curriculum/units/*.yaml')):
    txt=open(f).read()
    m=re.search(r'^goal_id: (\S+)',txt,re.M)
    if m and m.group(1)==GOAL:
        num=int(re.search(r'/(\d+)-',f).group(1))
        if 'task_sequence' not in txt:
            units.append((num,f,txt))
units.sort()
assert units, 'no legacy units for '+GOAL
N=len(units)
print(f'GOAL {GOAL}: {N} legacy units: {[u[0] for u in units]}')

# revision file numbering: media=831, storytelling=832 -> next free 833+
taken={int(re.search(r'/(\d+)-',f).group(1)) for f in glob.glob(PACK+'/curriculum/units/*.yaml')}
rev_num=833
while rev_num in taken: rev_num+=1

# revision prefix (activity slug prefix) — collision-checked
def prefix_candidates():
    words=GOAL_SHORT.split('-')
    for w in reversed(words): yield w
    yield words[0][:4]
PREFIX=None
for cand in prefix_candidates():
    ids=[f'ja.activity.{cand}-rev-listen',f'ja.activity.{cand}-rev-cloze',f'ja.activity.{cand}-rev-write']
    clash=any(any(id_ in open(f).read() for f in glob.glob(PACK+'/curriculum/units/*.yaml')) for id_ in ids)
    if not clash: PREFIX=cand; break
assert PREFIX, 'no free rev prefix'
REV_UNIT_ID=f'ja.unit.{GOAL_SHORT}-revision'
rev_ids={r:f'ja.activity.{PREFIX}-rev-{r}' for r in ('listen','cloze','write')}
print(f'revision unit: {rev_num}-{GOAL_SHORT}-revision.yaml  id={REV_UNIT_ID}  prefix={PREFIX}')

# ---------- per-unit data extraction ----------
import yaml
unit_data=[]
for num,f,txt in units:
    d=yaml.safe_load(txt)
    acts=d.get('activities',[])
    enc=[a for a in acts if a['type']=='encounter-read']
    clozes=[a for a in acts if a['type']=='cloze']
    listens=[a for a in acts if a['type']=='listen-and-choose']
    assert len(enc)==1 and len(clozes)>=1 and len(listens)==1, (f, 'shape')
    lv5=[a for a in acts if a.get('support_level')==5]
    assert len(lv5)==1 and lv5[0]['id']==enc[0]['id'], (f,'lv5 shape')
    sents=[v for v in d['generation_contract']['allowed_vocab'] if v.startswith('ja.sent.')]
    unit_data.append(dict(num=num,path=f,txt=txt,d=d,enc=enc[0],cloze0=clozes[0],
        listen=listens[0],sents=sents,uid=d['id'],
        gramrefs={a['id']:r for a in acts for r in a.get('content_refs',[]) if r.startswith('ja.grammar.')}))

# every unit must carry the goal's shared sentence pair (transfer proof)
for u in unit_data:
    assert 'ja.sent.meeting-starts' in u['sents'] and 'ja.sent.reply-email' in u['sents'], (u['path'],'missing shared sentence pair')

# ---------- grammar adjudication ----------
for u in unit_data:
    det=[]
    for s in u['sents']:
        for c in detect(SENT[s]['romaji']):
            if c not in det: det.append(c)
    u['allowed_grammar']=det
# bogus activity grammar refs -> subject-ga (goal-1 precedent: meeting-starts 'kaigi ga hajimarimasu' uses ga)
for u in unit_data:
    for aid,g in u['gramrefs'].items():
        if g not in u['allowed_grammar']:
            assert 'ja.grammar.particle.subject-ga' in u['allowed_grammar'], u['path']
            u.setdefault('replace_gram',[]).append(g)

# ---------- text rewrites ----------
results=[]
for i,u in enumerate(unit_data):
    txt=u['txt']
    slug_enc=u['enc']['id'].replace('ja.activity.','')          # e.g. university-system-enc
    new_write_id='ja.activity.'+slug_enc+'-write'
    # collision check
    assert not any(new_write_id in open(g).read() for g in glob.glob(PACK+'/curriculum/units/*.yaml')), new_write_id+' collides'
    if i < N-1:
        transfer=unit_data[i+1]['listen']['id']
    else:
        transfer=rev_ids['listen']
    ts_block=(
f"""# ADR-0037 task journey (JA-B1-003-JOURNEYS-001): input/scaffolded/independent
# are this unit's stages; transfer is the next unit's listening check (context
# change proven by the sentences this goal's units share); reuse is the goal's
# phase-gated revision unit {rev_num}.
task_sequence:
  input: {u['enc']['id']}
  scaffolded: {u['cloze0']['id']}
  independent: {new_write_id}
  transfer: {transfer}
  reuse: {rev_ids['write']}
""")
    req_block=''
    if i>0:
        req_block=(f"# ADR-0022 phase gate: this unit's lesson surfaces after the previous\n"
                   f"# journey unit's content reached `supported`.\n"
                   f"requires_unit:\n- unit: {unit_data[i-1]['uid']}\n  state: supported\n")
    # insert after estimated_minutes line
    m=re.search(r'^(estimated_minutes: \d+\n)',txt,re.M)
    assert m,u['path']
    txt=txt[:m.end()]+ts_block+req_block+txt[m.end():]
    # support_level 5 -> 2 on the encounter activity block
    def demote(mo):
        blk=mo.group(0)
        return blk.replace('support_level: 5','support_level: 2')
    enc_re=re.compile(r'- id: '+re.escape(u['enc']['id'])+r'\n(?:.*\n)*?  support_level: 5')
    assert len(enc_re.findall(txt))==1,u['path']
    txt=enc_re.sub(demote,txt,count=1)
    # allowed_grammar list replace (legacy is exactly object-wo)
    ag_re=re.compile(r'^  allowed_grammar:\n(?:  - ja\.grammar\.\S+\n)+',re.M)
    assert len(ag_re.findall(txt))==1,u['path']
    ag='  allowed_grammar:\n'+''.join('  - '+c+'\n' for c in u['allowed_grammar'])
    txt=ag_re.sub(lambda mo: ag.replace('\\','\\\\'),txt,count=1)
    # bogus grammar refs replace
    for g in u.get('replace_gram',[]):
        txt=txt.replace(g,'ja.grammar.particle.subject-ga')
    # append new write activity at end (activities block is last)
    refs=''.join('  - '+s+'\n' for s in u['sents'])
    if not txt.endswith('\n'): txt+='\n'
    txt+=(f"- id: {new_write_id}\n  type: recall\n  modality: writing\n  support_level: 0\n"
          f"  content_refs:\n"+refs)
    u['new']=txt
    results.append(u)

# shared-pair sentences for revision refs
rev_refs=['ja.sent.meeting-starts','ja.sent.reply-email']
# two recurring unit-specific sentences (appear in >=3 units, excluding shared pair)
cnt=collections.Counter(s for u in unit_data for s in u['sents'] if s not in rev_refs)
extras=[s for s,c in sorted(cnt.items(), key=lambda kv:(-kv[1],kv[0])) if c>=3][:2]
rev_all=rev_refs+extras
rev_grammar=[]
for s in rev_all:
    for c in detect(SENT[s]['romaji']):
        if c not in rev_grammar: rev_grammar.append(c)
first_unit_vocab=[v for v in unit_data[0]['d']['generation_contract']['allowed_vocab']]
rev_vocab=rev_all+extras[:1] and list(dict.fromkeys(rev_all+[v for v in first_unit_vocab if v.startswith('ja.lex.')][:2]))
rev_yaml=(
f"""# ai-assisted draft unit (JA-B1-003-JOURNEYS-001: delayed-reuse stage closing the legacy B1
# {GOAL_SHORT} journey family {unit_data[0]['num']}-{unit_data[-1]['num']}); content refs are existing pack data; qualified
# review pending.
id: {REV_UNIT_ID}
goal_id: {GOAL}
title: "Review: {GOAL_SHORT.replace('-',' ')} language"
summary: Delayed reuse of the sentences shared across the {GOAL_SHORT.replace('-',' ')} journey units, plus unit sentences.
estimated_minutes: 7
# K-70/ADR-0022 phase gate: the revision surfaces only after the journey units' content
# reached `supported`; this is the reuse stage named by every unit's task_sequence, and the
# transfer target for the last unit.
requires_unit:
"""+''.join(f"- unit: {u['uid']}\n  state: supported\n" for u in unit_data)+
f"""activities:
- id: {rev_ids['listen']}
  type: listen-and-choose
  modality: listening
  support_level: 2
  content_refs:
  - ja.sent.meeting-starts
  - ja.sent.reply-email
- id: {rev_ids['cloze']}
  type: cloze
  modality: writing
  support_level: 1
  content_refs:
  - ja.sent.meeting-starts
  - ja.sent.reply-email
- id: {rev_ids['write']}
  type: recall
  modality: writing
  support_level: 0
  content_refs:
"""+''.join('  - '+r+'\n' for r in rev_all)+
f"""generation_contract:
  allowed_vocab:
"""+''.join('  - '+v+'\n' for v in rev_vocab)+
f"""  allowed_grammar:
"""+''.join('  - '+c+'\n' for c in rev_grammar)+
f"""  new_item_budget: 2
  validation_method: choice
"""
)
rev_path=f'{PACK}/curriculum/units/{rev_num}-{GOAL_SHORT}-revision.yaml'
# revision unit must reference each unit's refs? gate check: intersection of rev refs with each unit non-empty
for u in unit_data:
    assert set(rev_refs) & set(u['sents']), u['path']

if not APPLY:
    print('DRY RUN. sample diff unit1 vs unitN and revision:')
    import difflib
    for l in list(difflib.unified_diff(unit_data[0]['txt'].splitlines(),unit_data[0]['new'].splitlines(),lineterm=''))[:60]: print(l)
    print('...REVISION FILE:')
    print(rev_yaml)
else:
    for u in unit_data:
        open(u['path'],'w').write(u['new'])
    open(rev_path,'w').write(rev_yaml)
    print('APPLIED', N, 'units +', rev_path)
    # per-goal metrics line
    lv5=sum(1 for u in unit_data for a in u['d']['activities'] if a.get('support_level')==5)
    print(f'METRICS goal={GOAL_SHORT} units={N} lv5_before={lv5} lv5_after=0 contracts_now={N+1} new_write_acts={N}')
    for u in unit_data:
        print('GRAM', u['num'], ','.join(c.replace('ja.grammar.','') for c in u['allowed_grammar']),
              '| replaced:', ','.join(g.replace('ja.grammar.','') for g in u.get('replace_gram',[])) or '-')
