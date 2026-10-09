# UI structure & navigation patterns in language-teaching apps (2026-10-09)

Question from the owner: has anyone studied how other language-teaching applications
handle UI design and structure, so our own structure rests on evidence rather than
invention? Answer before this note: the only prior research was
`2026-10-09-todays-work-and-onboarding.md` (daily-work mechanics and onboarding
flows — not information architecture). This note fills that gap: three parallel
research slices, 46 sources, every claim tagged FACT (observed in the cited source
text), `[INFERENCE]` (our reasoning from cited facts), or `[UNCERTAIN]`
(contested/marketing/snippet-only — needs human verification in-app).

Scope discipline: UI STRUCTURE and navigation only. Pedagogy mechanics live in the
companion note. Nothing here is implemented; §5 lists candidate follow-ups for the
owner to card or discard.

Our baseline surfaces being compared against (as shipped 2026-10-09): twelve nav
tabs — Practice(Today), Progress, Pronunciation, Speaking, Writing, Scenarios,
Shadowing, Reading, My Words, Placement, Kanji, Settings. Settings now carries
pack management, microphone, romaji mode, profile data, and ONE Speech card
(model picker + downloads + runtime status) after the K-77 fold.

---

## 1. Headline findings

1. **Four-to-six top-level destinations is the field norm; we have twelve.**
   Babbel's app ships exactly four bottom tabs (Learn / Practice / Speak /
   Progress, official help text enumerates them); Memrise ~4 (Home, Lessons,
   My Words, Profile); Duolingo ~5–6; Bunpro splits Decks / Reviews / Cram as
   named flows inside one app shell. NN/g guidance (full article read):
   "If your site has more than 5 options, it's hard to fit them in a tab or
   navigation bar and still keep an optimum touch-target size" — that ceiling is
   from mobile touch constraints, so the transfer to a desktop sidebar is
   `[INFERENCE]`, but every observed peer groups practice modalities under one
   hub rather than tabbing each. Our Pronunciation/Speaking/Writing/Shadowing/
   Reading quintet are modalities of one activity; no peer gives modality a
   top-level tab. (S1-12, S1-17, S3-1, S2-1/2)
2. **Settings placement is unanimous across products: settings hang off a
   profile/"Me" destination, never a primary learning tab — and language,
   script/romanisation, and sound settings live inside those settings** (Busuu:
   interface language + placement retake under Me→Settings; Memrise: romanisation
   toggle + "Learning & sound" under Profile→gear; Bunpro: General / Review
   Settings / integration grouping under Account). Today's K-77 fold of
   Languages into Settings matches the incumbents' IA; keeping romaji-mode and
   speech setup there is consistent. (S1-5/9/17, S2-1/4)
3. **Learn-queue vs review-queue separation is the SRS norm, landed on one
   landing screen.** Bunpro: Decks (new) vs Reviews (SRS) vs Cram (burst),
   separate named flows; WaniKani: one-button Reviews entry with a due count on
   the landing dashboard, new material gated by level. Neither merges new +
   review into one undifferentiated list. Our Practice(Today) mixes them —
   label-separating them on the same screen is the observed pattern. (S2-1/3/5/6)
4. **Two-tier due counts (total pile vs priority subset) are documented, not
   folk practice:** WaniKani's Reviews widget offers an opt-in second
   "priority Reviews" count (Apprentice-stage items) with the explicit
   rationale "for those of us with limited time… choose how to spend the time
   that you do have." Directly applicable to our Home/Practice queue IF the
   scheduler can rank by stage — otherwise the count would be a fabricated
   capability (honesty rule). (S2-6)
5. **Offline/download state is a visible per-unit affordance, with honest
   sync semantics stated up front:** Babbel icon→checkmark per unit, Busuu
   per-chapter/per-lesson downloads, and explicit disclosures ("offline activity
   counts toward streak only after sync", Memrise's "the app won't appear in
   your OS mic list until the feature has launched once"). Our Settings-based
   pack management is desktop-natural; the *checkmark-replaces-icon* progress
   receipt and point-of-surprise copy are worth copying. (S1-5/10, S1-17)
6. **Empty/loading/error are designed states, not copy afterthoughts** (NN/g,
   full articles read): never show "no records" while loading ("trigger-happy
   users… never see the relevant content" — the exact failure class of W-08);
   never leave a container totally empty — state what it means and link the
   action that populates it; error copy: human-readable, precise, constructive,
   non-blaming, never color-only, preserve input. Waits >10 s need percent-done
   or a named step list (K-73's byte progress already meets this; the
   pack-install indeterminate stage text too). This validates the K-76/78
   state work as the correct direction and gives the audit rubric for the rest.
   (S3-5/6/7/19)
7. **Streak/loss-aversion evidence is weaker than the marketing, and the field
   contains real counter-evidence** — directly relevant to our product bar
   ("enjoyable because capability unlocks, not because loss aversion forces
   daily activity"): the only randomized field experiment found streak-HIGHLIGHTING
   increased use and learning on the intensive margin (NBER 34173 / Economic
   of Education Review 2025, 60k students); a classroom gamification study
   found intrinsic motivation DECREASED over a semester (Hanus & Fox 2015);
   the gamification meta-analysis finds small, heterogeneous, motivationally
   UNSTABLE effects (Sailer & Homner 2020); and a systematic review of learning
   dashboards found no reliable achievement/motivation gains but substantial
   participation effects (Kaliisa et al., LAK '24). Duolingo's "2.4× retention"
   streak claim is vendor copy with no methodology `[UNCERTAIN]`. We currently
   run no streaks/XP — the evidence does not ask us to add them, and warns
   against leaderboard-style chrome. (S3-10/16/17/21/8)
8. **Accessibility of progress and timing is checkable against standards:**
   WCAG 4.1.3 (status messages announced without focus; progress bars in live
   regions), ARIA APG range-widget rules (omit `aria-valuenow` when the
   percentage is genuinely unknown — exactly our honest-indeterminate rule),
   WCAG 2.2.1 timing adjustable (any future timed exercise needs off/extend
   paths). (S3-11/18/22)

---

## 2. Where our shipped structure already matches the field

| Our surface (shipped) | Field precedent | Verdict |
|---|---|---|
| K-77: one Settings destination incl. packs, mic, romaji, speech | Busuu Me→Settings; Memrise Learning & sound; Bunpro Account grouping | matches |
| K-76: load-failure ≠ empty pack; Retry + setup on error; loading stated | NN/g empty-state guideline 1 verbatim | matches |
| K-78: audio failure names the missing component; setup jump only when fixable | Babbel's enumerated speech failure states; NN/g error guidelines | matches |
| K-73: byte-level honest percent, never fake numbers | NN/g >10 s rule; APG indeterminate handling | matches |
| K-79: per-goal prerequisite state + status chips | Busuu checkpoint gating; WaniKani level progression | directionally matches (no peer observed showing full per-card prereq lists; `[INFERENCE]` this is ahead, not behind) |
| Romaji mode as a Settings card, content stays in script | Memrise romanisation toggle in Learning Settings | matches |
| Placement as first-run path-setting | Busuu placement sets entry level, retake from settings | matches |

## 3. Divergences the field flags as risky

| Ours | Field evidence | Risk / certainty |
|---|---|---|
| 12 top-level nav tabs | every observed peer 4–6; NN/g tab-bar guidance | high perceived-complexity risk on first run `[INFERENCE]` (desktop transfer not directly studied) |
| Five modality tabs (Pronunciation/Speaking/Writing/Shadowing/Reading) | Babbel folds drills incl. review under one Practice tab; Duolingo embeds practice in-path | group-under-hub is the norm |
| Today mixes new-unit work and SRS reviews unlabeled | Bunpro Decks vs Reviews; WaniKani separate queues | mental-model mismatch `[INFERENCE]` |
| No manual-override affordances ("already know this", "drill now") | Bunpro: mark known, set SRS level, add to queue — prominent help features | users arriving from SRS apps expect the escape hatch |
| Progress tab is engine-reported goal map only | WaniKani's 10-widget dashboard catalogue (heat map, recent mistakes, correct %, level progress) | participation-value opportunity; dashboards NOT proven for achievement (S3-21) — keep it informational, no vanity metrics |

## 4. Dead ends and honesty log (do not cite these as facts)

- Duolingo Help Center is a JS shell; the microphone-troubleshooting article was
  never read. Duolingo's current 2026 tab SET is known only from a blog image
  caption.
- Mondly's FAQ and Zendesk both return HTTP 403; five-section structure is
  snippet-level `[UNCERTAIN]`.
- Bunpro help bodies are JS-rendered: course-unlock UI and exact romaji-toggle
  placement were NOT observed. "Bunpro unlocks courses with checkpoints" stayed
  `[UNCERTAIN]`.
- LingoDeer official web is marketing-only; all LingoDeer IA claims `[UNCERTAIN]`.
- Busuu's full mobile bottom-tab set never enumerated officially (the handbook
  PDF is image-heavy on the nav pages).
- No official multi-tab DESKTOP sidebar-density study exists; the 4–6 finding is
  cross-product observation + mobile NN/g guidance, transfer to desktop is
  `[INFERENCE]`.
- End-of-session summary screens: no official source documented for any product;
  needs a human with the apps installed.
- Duolingo off-days habit study: vendor never identifies the UPenn/UCLA paper;
  untraceable, `[UNCERTAIN]`.

## 5. Candidate follow-ups (owner decision; NOTHING here is approved work)

1. **Nav consolidation study**: model a 5–7 destination structure (e.g. Today,
   Practice-modes hub, Words, Progress, Settings) against current tabs and the
   smoke/nav semantics; decide with the owner before any code. (findings 1)
2. **Two-tier due counts on Today** IF the scheduler exposes stage/urgency
   ranking; copy must state the basis honestly. (finding 4)
3. **My Words manual overrides** ("mark known" / "drill this now") — Bunpro's
   documented escape hatches.
4. **Empty/loading/error audit of every surface against the NN/g rubric**
   (K-76/78 fixed the audio family; dictation history, story list, catalog
   empty states are next in line).
5. **Downloaded-state checkmark receipt in the pack list** (Babbel pattern).
6. **a11y pass**: `role="status"` coverage, indeterminate progressbars omit
   `aria-valuenow`, any future timed activity gets 2.2.1 paths.

## 6. Source register (46 sources; access date 2026-10-09 for all)

Slice A — gamified general apps (Duolingo, Busuu, Babbel, Mondly, Memrise):
1. Duolingo Blog — "Elevating craft: How we refreshed our core tabs" —
   https://blog.duolingo.com/core-tabs-redesign/ — official design blog, full read.
2. Duolingo Blog — "Introducing the new Duolingo learning path" —
   https://blog.duolingo.com/new-duolingo-home-screen-design/ — official, full read.
3. Duolingo — Google Play listing — https://play.google.com/store/apps/details?id=com.duolingo — official store copy (updated 2026-10-06).
4. Duolingo Help Center — https://support.duolingo.com/ — official, JS-shell; article TITLES only via search index.
5. Busuu Support — "Can I learn offline?" — https://help.busuu.com/hc/en-us/articles/16526881245713 — official, full read.
6. Busuu Support — "What are checkpoints and how do they work?" — https://help.busuu.com/hc/en-us/articles/16529628876561 — official, full read.
7. Busuu Support — Review category (Vocabulary + Grammar) — https://help.busuu.com/hc/en-us/categories/12823866527250 — official category map.
8. Busuu — Google Play listing — https://play.google.com/store/apps/details?id=com.busuu.android.enc — official store copy.
9. Busuu — learner handbook PDF (self-paced + Live Lessons) — https://business.busuu.com/hubfs/Admin%20Portal/Learners%20-%20self-paced%20learning%20and%201_1%20and%20group%20Live%20Lessons.pdf — official; some pages image-only.
10. Babbel Help — "Offline mode" — https://support.babbel.com/hc/en-us/articles/19176178120722 — official, full read.
11. Babbel Help — "Speech recognition" — https://support.babbel.com/hc/en-us/articles/19211305815570 — official, full read.
12. Babbel Help — "Using the Babbel app on a mobile device" — https://support.babbel.com/hc/en-us/articles/360029715892 — official, full read (decisive for the 4-tab nav).
13. Babbel Help — "Grammar Guide" — https://support.babbel.com/hc/en-gb/articles/19260489559058 — official, snippet.
14. Mondly — Google Play listing — https://play.google.com/store/apps/details?id=com.atistudios.mondly.languages — official store copy.
15. Mondly FAQ (main-app sections; structure) — https://www.mondly.com/faq/main-app-sections — official, HTTP 403 to fetch; snippets only.
16. Mondly Zendesk help — https://mondly.zendesk.com/hc/en-gb/articles/22119546152988 — official, HTTP 403; existence only.
17. Memrise FAQs — https://explore.memrise.com/help — official, full read (465 lines; richest IA source in slice A).
18. Memrise — "Changes to the Memrise app" + Play listing — https://www.memrise.com/blog/changes-to-the-memrise-app — official, search-level corroboration only.

Slice B — SRS-centric Japanese apps (Bunpro, WaniKani, LingoDeer):
19. Bunpro — Support & FAQ index — https://bunpro.jp/support — official.
20. Bunpro — Using Bunpro index — https://bunpro.jp/support/using-bunpro — official.
21. Bunpro — Getting Started index — https://bunpro.jp/support/getting-started — official.
22. Bunpro — General Settings overview — https://bunpro.jp/support/account/General-Overview — official, JS-rendered, summary only.
23. Bunpro — Brief Overview (Decks) — https://bunpro.jp/support/getting-started/brief-overview — official, summary.
24. WaniKani Knowledge — Reviews widget — https://knowledge.wanikani.com/widgets/reviews/ — official, full read (two-tier due counts; widget behavior).
25. WaniKani Knowledge — index/feed — https://knowledge.wanikani.com/ — official (wanikani.com/faq redirects here); widget catalogue.
26. LingoDeer — homepage — https://www.lingodeer.com/ — official marketing copy only.

Slice C — design guidance, motivation evidence, standards:
27. NN/g — Budiu, "Basic Patterns for Mobile Navigation: A Primer" — https://www.nngroup.com/articles/mobile-navigation-patterns/ — full read.
28. NN/g — Pernice & Budiu, "Hamburger Menus and Hidden Navigation Hurt UX Metrics" — https://www.nngroup.com/articles/hidden-navigation-methodology — official.
29. NN/g — Laubheimer, "Menu-Design Checklist: 17 UX Guidelines" — https://www.nngroup.com/articles/menu-design/ — official, sections observed.
30. NN/g — "How Many Items in a Navigation Menu?" — https://www.nngroup.com/videos/number-items-navigation-menu — video only, no transcript.
31. NN/g — Kaplan, "Designing Empty States in Complex Applications: 3 Guidelines" — https://www.nngroup.com/articles/empty-state-interface-design/ — full read.
32. NN/g — "Error-Message Guidelines" — https://www.nngroup.com/articles/error-message-guidelines/ — full read.
33. NN/g — "An Error Messages Scoring Rubric" — https://www.nngroup.com/articles/error-messages-scoring-rubric — official, existence.
34. Duolingo Blog — "Improving the streak" — http://blog.duolingo.com/improving-the-streak — vendor, methodology undisclosed.
35. Duolingo Blog — "The Duolingo Streak Uses Habit Research…" — https://blog.duolingo.com/how-duolingo-streak-builds-habit — vendor; cited study untraceable.
36. NBER WP 34173 / Aulagnon, Cristia, Cueto & Malamud, "Streaks to success", Economics of Education Review 109 (2025) — https://doi.org/10.3386/w34173 — randomized field experiment, abstract read.
37. Nunes & Drèze, "The Endowed Progress Effect", J. Consumer Research 32(4) — https://doi.org/10.1086/500480 — primary.
38. Kivetz, Urminsky & Zheng, "The Goal-Gradient Hypothesis Resurrected" — PDF as cited in register — primary.
39. Hanus & Fox, "Assessing the effects of gamification in the classroom", Computers & Education 80 (2015) — https://www.sciencedirect.com/science/article/abs/pii/S0360131514002000 — primary, abstract (paywalled).
40. Sailer & Homner, "The Gamification of Learning: A Meta-Analysis", Educational Psychology Review 32(1) (2020) — https://doi.org/10.1007/s10648-019-09498-w — meta-analysis, abstract read.
41. Kaliisa et al., "Have Learning Analytics Dashboards Lived Up to the Hype?", LAK '24 — https://arxiv.org/abs/2312.15042 — systematic review, arXiv abstract (ACM 403).
42. NN/g — Kaplan, "Designing for Long Waits and Interruptions" — https://www.nngroup.com/articles/designing-for-waits-and-interruptions/ — full read.
43. Google web.dev — "Offline UX design guidelines" — https://web.dev/articles/offline-ux-design-guidelines — full read.
44. W3C WAI — "Understanding SC 4.1.3: Status Messages" — https://www.w3.org/WAI/WCAG21/Understanding/status-messages.html — standard, full read.
45. W3C ARIA APG — "Communicating Value and Limits for Range Widgets" — https://www.w3.org/WAI/ARIA/apg/practices/range-related-properties — standard, full read.
46. W3C WAI — "Understanding SC 2.2.1: Timing Adjustable" — https://www.w3.org/WAI/WCAG22/Understanding/timing-adjustable.html — standard, full read.

Third-party streak commentary (trophy.so, Medium design-bootcamp) was reviewed but
is deliberately NOT in the register — anecdotal; retained only as friction signal
in the raw notes.

Method note: three parallel research agents, each writing incrementally to a
session artifact; two were cut off by the 30-minute subagent runtime limit but
survived via incremental writes. Raw slice artifacts (full per-product structure
write-ups, longer than this digest) can be regenerated from this register on
request. Repo-side integration and the certainty tags are mine.
