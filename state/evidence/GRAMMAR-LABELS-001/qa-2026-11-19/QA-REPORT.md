# Interactive QA pass — GRAMMAR-LABELS-001 + content pipeline (2026-11-19, 10:00-10:35 MST)

Real Tauri dev build on private Xvfb :97 (worktree, isolated qa-data store; owner's
desktop untouched). 0.4.4 pack staged into the QA data dir from dist/preview lpk.
All claims below are backed by the PNGs in this directory, double-capture liveness
checked, and visually read by the controller.

VERIFIED END-TO-END:
1. Hub -> profile -> language setup flow works; honest empty states when unconfigured.
2. Pack lifecycle: 0.4.3 shown as installed, update banner appeared for 0.4.4; after
   staging 0.4.4, app reports the new pack and its fresh-SRS consequence honestly.
3. Reading library lists the full new slate: A1+A2+B1+B2 stories (25 titles incl.
   tonight's «Ночь в поезде», «Два билета», «Спор о будущем», «Город без карты»,
   «Аукцион одной картины», «Ключ от дачи»).
4. READER WITH GRAMMAR LABELS: every inflected word carries an inline case/number tag
   (reader-labels-zoom.png). GRAMMAR-LABELS-001 renders end-to-end in the real UI.
5. WORD-CARD CONTRACT (word-card-cheloveku.jpg): tapped «человеку» -> headword
   человек + stress + "masc. noun" + gloss "person" + grammar line
   "dative singular of человек" + «Добавить в мои слова» button. Matches the
   locked WORD-CARD-AUDIO-001 shape exactly.
6. Grammar-labels toggle in Settings controls label rendering (off -> labels vanish,
   labels-off-zoom.png; restored on afterwards).

NOT TESTED / CAVEATS (honest gaps):
- Word-card audio PLAY control not seen in the QA data dir (media for new stories
  exists in the pack; playback path unverified in this pass).
- Pronunciation/Speaking mic features render but need a real mic — untestable under Xvfb.
- UI state can desync under fast synthetic clicks (stale-coordinate clicks changed
  screens); no crash observed, but a human should confirm interaction smoothness.

NEXT: word-card audio playback verification + the labels-coverage tail
(labels.jsonl covers 937/945 sentences; some story words unlabeled).
