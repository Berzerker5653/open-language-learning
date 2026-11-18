# Visual & UI audit — how the majors look and work, and where LTS looks weak

Date: 2026-11-17. Companion to `competitor-systems-deep-dive-2026-11.md`
(that doc compared *learning systems*; this one compares *screens, structure,
and visual language*).

Evidence: official app-store screenshot galleries for 17 apps + live screenshots
of NuanceDeck's product pages, captured 2026-11-17 and committed under
`docs/images/ui-audit-2026-11/` (contact sheets, 4 shots per app). Our own
baseline: `docs/images/app-today.png` (2026-10-13 capture, still current for
layout) plus live desktop captures noted below.

Capture caveats (honest): the Play search for "Russio" returned Mondly's
Russian course instead (Mondly shots kept and labeled); the "NuanceDeck"
search returned a Chinese grammar app — kept as `grammar-chips-cn-grammar-app.jpg`
because its inline grammar-chip pattern is genuinely instructive. NuanceDeck's
real card UI comes from live site captures (`nd_1.png`, `nd_2.png`). Russio's
own screens were not captured (site TLS-blocked from the harness) — its design
is discussed only from written sources.

---

## 1. What the market's screens actually look like (per app)

| App | Structure | Visual language | Signature UI move (copy-worthy) |
|---|---|---|---|
| Duolingo | Hub course list → single-task exercise flow; persistent top bar: X, progress bar, hearts | High-sat primaries, rounded sans, flat cartoon cast, very low density | One task per screen with instant highlight feedback; progress bar turns celebratory at completion |
| Babbel | Home → Unit → Lesson cards → linear exercise | Brand orange + serif display type + real photography (no cartoons) | Chat-bubble exercise with dual-language lines and one giant mic button |
| Busuu | Chapter path with per-lesson status icons; community tab | Cobalt blue + mint highlight, photo+UI mix, moderate density | Speaking compare widget: "Original" vs "You" side by side + instant verdict badge |
| Mondly | 4-tile dashboard (daily lesson/chatbot/AR) → swipe card drill / chat drill | Coral + blue chrome, green=target word | Bilingual chat with "things you can say" suggestion chips + big mic |
| Quizlet | Mode-picker dashboard (flashcards/learn/test/guides) | One saturated color per mode, white floating cards | Rating buttons print the **next interval** on the button ("Easy — back in 1 day") |
| Anki(Droid) | Deck list → focused review → stats tabs | Plain Material; semantic color ONLY on grade buttons | Grade buttons carry interval previews; deck due shown as time budget ("152 due (51 min)"); full stats screens |
| Praktika | Chat-first: tutor card top, fixed mic bar bottom | Violet gradients, 3D avatars, red/green inline correction | Error fix **inside** the transcript: learner's red wrong phrase, tutor's green corrected phrase |
| Speak | Lesson selector dropdown + roleplay list w/ ticks | Ochre+navy brand, calm grey/white UI, royal blue accent | "Speak now" card with target sentence color-segmented (blue=say, grey=context) |
| ELSA | Goal-chip onboarding → generated unit path (CEFR badges) | Dark violet gradient, flat illustration, glowing active item | Chip-cloud onboarding (zero typing); path rows label exercise type + duration |
| LingQ | Library grid → reader → bottom-sheet dictionary; stats screen | Black marketing/white app, green=action, blue=saved words, yellow=lookup | Word-status coloring inline + dictionary sheet that never leaves the text; streak framed as **words read** (52,869) |
| Beelinguapp | One focused parallel-text reader + transport bar | White + single amber accent, flat contextual art | Karaoke: amber pill highlight moves through BOTH language lines in sync with audio |
| Lingopie | Video-first rails (continue/favorites) + overlays | Dark UI, orange=interactive, magenta=quiz | Interactive subtitle card: target word + gloss + audio + difficulty pill fused in one object; quiz bottom-sheets **over** the video |
| LangLeap | Dashboard (units, "X of Y lessons", CEFR pills) → drill/scene/reader | Light Material, blue primary, color word-chips in reading | Speaking drill = one phrase, timer, 0/16 steps, Re-say/Next; interactive illustrated scene with tappable characters |
| Mishka | Tab bar: stories/grammar/conversation/culture; streak+coins top | Terracotta+cream cozy palette, bear mascot | Grammar as "why X not Y?" contrast questions; chat roleplay + vocab recap list |
| MasterRussian | Level cards A1→C1 swipe carousel + quiz flow | Pastel one-hue-per-CEFR-level, very low density | Color-coded CEFR ladder; gender-inference quiz on made-up words (tests rule, not memory) |
| NuanceDeck | Entry card: conjugation → numbered senses → example cards | Cool minimal, **monospace for all grammar metadata**, red=case tag, blue=aspect tag | Stacked micro-tags **under every word** in an example (NOM, ACC, IMPF…); stress = colored vowel; one card = one sense |
| (CN grammar app ref) | Lesson tree w/ breadcrumbs + daily goal card | Teal monochrome, mint cards, coral/teal chips | Grammar words wrapped in colored chips inline in prose and reused in quizzes |

## 2. Cross-cutting patterns the market converged on

1. **Hub + single-task flows.** A calm dashboard names *what to do*; every
   activity is one object per screen. Nobody makes you read a list *during* a
   drill.
2. **In-session chrome everywhere.** A thin progress bar + counters (step n/N,
   time budget) live at the top of every exercise, plus a celebratory terminal
   state (Quizlet results strip, Duolingo burst). Users always know how much
   screen-time is left.
3. **Strict accent semantics.** One accent = interactive/target; green =
   correct/done; red = error — never decorative. Anki restricts its 4 grade
   colors to the grade buttons only. (Several apps still fail: color-only
   feedback with no shape/text redundancy — Praktika red/green, LingQ
   blue/yellow — that's a lesson in what to do *better*, not skip.)
4. **SRS transparency is a selling point.** Quizlet/Anki print "back in 1 day"
   on the buttons; Anki converts dues to minutes; NuanceDeck shows retention
   dashboards. Ours schedules silently.
5. **Word status is visible inside running text** — LingQ (blue saved / yellow
   lookup), LangLeap (multi-color chips), NuanceDeck (grammar micro-tags under
   every word + colored stress vowel). Reading is never plain text + taps only.
6. **Audio is welded to text.** Beelinguapp's moving highlight pill, LingQ's
   karaoke scrubber, Lingopie's subtitle card. Nobody ships story audio without
   word-level sync in 2026.
7. **Vocabulary capture never leaves context.** Dictionary/lookup = bottom
   sheet anchored to the tapped word, one-tap save (+).
8. **Correction lives in the artifact.** Praktika marks the wrong phrase in the
   transcript and shows the fix beside it; Mishka asks "why X not Y?". Nobody
   shows a separate error modal and moves on.
9. **Progress is framed as accumulation, not just completion**: words read
   (LingQ 52,869), X-of-Y per unit (LangLeap), results charts (MasterRussian,
   Anki), multi-currency (Mishka). Micro (prompt), meso (unit), macro (path).
10. **Personality is a deliberate layer.** Warm camp: Mishka's bear, Duolingo's
    cast, Babbel's quirky photos. Cool/engineering camp: NuanceDeck's
    monospace metadata. There is no successful *neutral* product — text-first
    ≠ characterless. NuanceDeck proves you can be austere and still have a
    strong signature (mono type for all grammatical metadata).

## 3. Where LTS's own UI stands (live captures: `state/evidence/UX-PERSONA-001`,
`DEVICE-VERIFY-0.4.3` Nov screenshots, `WALKTHROUGH-2026-10-09` + app-today.png)

Capture caveat: several evidence frames are letterboxed on a black canvas — the
black surround and mid-frame crops are screenshot artifacts, not app styling.
Fine-grained claims below (hairline rules, contrast values) come from full-frame
vision reads and should be re-verified with tight crops before being filed as
bugs; the structural findings are solid.

Good (keep):
- Calm cream+teal palette with a single accent used correctly for
  interactive/selected state — matches pattern #3 already.
- Serif display identity is distinctive; nobody in this market uses serif
  (Babbel only for marketing) — ours is a real signature.
- Low-density, readable, honest copy; no dark patterns; no engagement bait.
- Today-page model (greeting → plan → duration picker → start CTA) is the
  right hub shape and matches pattern #1.
- The per-modality capability roadmap (Progress screen) is conceptually ahead
  of every competitor reviewed — nobody separates reading/listening/speaking
  progress. It just isn't *rendered* like it yet (see below).

Behind (confirmed by live captures):
- **Test fixtures leak into the profile chooser** — 27 profiles including
  `MicTest`, `Witer2` (duplicated twice!), `Offline` shown as real people.
  The chooser is also a ragged auto-width chip cloud with no per-profile
  state (no pack, no last-studied, no progress hint).
- **Dev identifiers leak into user UI**: the Progress screen prints raw
  tokens (`ja:lex.greeting.konnichiwa (recall-meaning → supported)`) and the
  Today screen's activity names ("First look>", "First looks") carry stray
  punctuation and inconsistent naming. (Some of this is the audit copy-hygiene
  tool's domain — `tools/audit_learner_copy.py` — extend it to token leaks.)
- **Progress screen has zero quantitative layer**: everything is prose
  ("not started"), no due counts, no retention, no calendar, no per-goal
  progress bar. The capability model is better than the market's; the
  visualization is worse than Anki's 2012 stats screen.
- **Practice hub is a flat undifferentiated list** — the "is this graded or
  not?" promise (our core honesty value) lives in prose, never in a badge;
  cards have no start affordance; mode names sit in weak pills.
- **Plan items on Today read as plain text**, not tappable activities.
- **Container misalignment** confirmed again on live screens: header, card,
  and list items use three different left insets; the segmented control's
  selected state is nearly invisible.
- **No in-session chrome**: activities open without progress bar / step
  count / time budget (pattern #2). The 5-min picker promises a budget the
  session never shows.
- **Reading text has no word-state layer** (pattern #5; LingQ/LangLeap
  standard), **story audio lacks word-synced highlight** (pattern #6),
  **SRS is silent** (pattern #4), **empty states are bare sentences**.

## 4. Ranked UI upgrade backlog (small → structural; all BUILD-safe)

1. **U1 Container alignment + spacing pass** (half-day): one content width
   token shared by header and body; fix stray bars in screenshots too.
2. **U2 Copy hygiene pass** (day): remove implementation jargon from UI;
   turn the AI-content honesty line into a small monospace badge (NuanceDeck
   idiom) + tooltip with the full policy.
3. **U3 In-session chrome** (1–2 days): thin progress bar + "n of N" + time
   budget on every activity type; session-complete summary card (activities
   done, forms practiced, time spent — no XP/streak by design).
4. **U4 Word-state coloring in the reader** (1–2 days): unseen=plain,
   learning=teal, confirmed=muted; legend toggle; data already exists in the
   confirm ledger. Pairs with READABILITY-GATE-001.
5. **U5 Grammar micro-tags inline** — implementation note for
   GRAMMAR-LABELS-001: render as tiny uppercase monospace under the word,
   case in warm red, aspect in blue, stress as acute mark (test colored-vowel
   variant); abbreviations (gen.sg) with tap-for-full via word card.
6. **U6 SRS transparency** (1 day): next-interval text on review grade buttons
   (FSRS already predicts it); due list header shows "N cards · ~M min".
7. **U7 Memory dashboard** (2–3 days): due today, per-band retention, 12-week
   activity calendar — pure local data, our n=1 honesty fits an
   "instrument, not grade" framing.
8. **U8 Word-synced karaoke highlight in story listen mode** — prioritize the
   open WORD-TIMING cards; Beelinguapp/LingQ show the expected effect
   (moving pill + play/skip transport under the text).
9. **U9 Correction-in-artifact pass** (already half ours): make dictation/
   speech feedback mark the wrong form **in the sentence** with the corrected
   form beside it (Praktika pattern), instead of a separate verdict line —
   this is the visual face of ERR-SRS-LOOP-001.
10. **U10 Designed empty states + a light illustration layer** (day each):
    small line-art glyphs matching the serif identity; greeting-state cards
    ("nothing due — read a story?" style CTAs).
11. **U11 Accumulation meters**: My Words count ("forms confirmed"), worlds
    "X of Y unlocked", story completion — visible in Today header strip.
12. **U12 Scenario scene view**: for key scenarios, an illustrated scene with
    tappable characters (LangLeap pattern) as an alternative to the text
    transcript; reversible default, off until art exists.
13. **U13 Profile chooser overhaul**: archive/hide test fixture profiles,
    dedupe, show each profile as an aligned card with pack, last-studied, and
    a one-line state ("6 cards due · Russian A1"); initial-avatars, no names
    alone. Extend `tools/audit_learner_copy.py` to flag raw ids/tokens
    (`ja:lex.*`) leaking into rendered copy.
14. **U14 Progress = roadmap + instruments**: keep the capability tree, but
    add per-goal modality progress bars, readable labels replacing raw token
    ids, and a stats strip (due today · ~minutes · retention · 12-week
    activity calendar) — U6/U7 data feeds it. This is where our per-dimension
    mastery finally looks as good as it is.

Deliberately NOT copying: hearts/lives (Duolingo), leagues/streak guilt
(Russio's "no streaks, no guilt" validates our stance), 3D avatar tutors
(Praktika uncanny), monetization counters (LangLeap credits, Mishka coins).

## 5. Verification notes

- Contact sheets are official store creatives: they show *chosen* screens and
  marketing overlays; treat exact compositions as representative, not spec.
- MasterRussian's gallery showed no case tables (its reputation comes from the
  web exercise product, not the app screenshots).
- Our own teardown combines the 2026-10-13 README capture with November
  evidence frames from `state/evidence/` (UX-PERSONA-001, DEVICE-VERIFY-0.4.3,
  WALKTHROUGH-2026-10-09) on the 0.4.3 line. Structural verdicts hold; pixel
  details flagged above need tight-crop re-reads before becoming bug reports.
- Russio's own screens were not visually captured (site TLS-blocked from the
  harness; Play search resolves to Mondly for that query) — noted where its
  design is discussed from written sources only.
