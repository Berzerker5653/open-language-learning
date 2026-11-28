// PATH-VIEW-001 (PROGRESS-PATH-DESIGN-001.md phase 1): the Today tab's unit
// path. The view renders engine state and derives nothing — these tests pin
// the visible contract: attendance-shaped nodes are never done, locked units
// are visible with their unlock hint, done units re-light when reviews are
// due, and sections carry friendly names with CEFR as the small subtitle.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import {
  PATH_FUTURE_WINDOW,
  PathView,
  pathNodeState,
  pathSections,
  pathTailCutoff,
  pathTypedLetterGlyph,
  type UnitPathNode,
} from "./home";

const node = (over: Partial<UnitPathNode>): UnitPathNode => ({
  pack_id: "org.openlanguage.ru-ru.reference",
  unit_id: "ru.unit.x",
  title: "Some unit",
  summary: "",
  band: "on-ramp",
  locked: false,
  done: false,
  current: false,
  review_due: false,
  due_count: 0,
  in_progress: false,
  refs_done: 0,
  refs_total: 4,
  unlock_hint: null,
  kind: "words",
  ...over,
});

describe("unit path (PATH-VIEW-001)", () => {
  it("never marks an attendance-only unit done", () => {
    // Today's plan schedules this unit (current = attendance-shaped
    // state), but the engine reports done=false because no evidence
    // backs it. The rendered node must not read as done.
    const html = renderToStaticMarkup(
      <PathView nodes={[node({ unit_id: "ru.unit.on-ramp.greetings-01", current: true })]} />,
    );
    expect(html).toContain('data-state="current"');
    expect(html).not.toContain('data-state="done"');
    expect(html).not.toContain("✓");
    expect(html).toContain("You are here");
  });

  it("re-lights a done unit whose reviews are due", () => {
    const html = renderToStaticMarkup(
      <PathView
        nodes={[node({ unit_id: "u-done", done: true, review_due: true, due_count: 4 })]}
      />,
    );
    expect(html).toContain('data-state="review-due"');
    expect(html).toContain("Review due (4)");
    // PATH-NODE-TYPES-001: the text ⟳ gave way to the drawn refresh
    // pictogram — the caption still carries the signal in words.
    expect(html).toContain('data-glyph="review"');
    expect(html).not.toContain("⟳");
  });

  it("shows locked-ahead units visible-dim with what unlocks them", () => {
    const html = renderToStaticMarkup(
      <PathView
        nodes={[
          node({
            unit_id: "ru.unit.b2.deep",
            band: "B2",
            locked: true,
            unlock_hint: 'finish "complex text, argument, fluent interaction"',
          }),
        ]}
      />,
    );
    expect(html).toContain("path-node--locked");
    // Collapsed default opens on the first section anyway: the deep band
    // is the only one here, so its node renders dim with the hint.
    expect(html).toContain("finish &quot;complex text");
  });

  it("opens the pinned section and collapses the rest to friendly headers with a CEFR subtitle", () => {
    const html = renderToStaticMarkup(
      <PathView
        nodes={[
          node({ unit_id: "ru.unit.on-ramp.now", current: true }),
          node({ unit_id: "ru.unit.a1.later", band: "A1" }),
        ]}
      />,
    );
    // Pinned section open...
    expect(html).toContain('data-testid="path-node-ru.unit.on-ramp.now"');
    // ...next band collapsed: node hidden, header shown with friendly
    // name primary and CEFR as the small subtitle.
    expect(html).not.toContain('data-testid="path-node-ru.unit.a1.later"');
    expect(html).toContain("Beginner");
    expect(html).toContain(">A1<");
    expect(html).toContain("0/1 done");
  });

  it("locks win over every other state", () => {
    expect(pathNodeState(node({ locked: true, done: true }))).toBe("locked");
    expect(pathNodeState(node({ current: true, done: true, review_due: true }))).toBe("current");
    expect(pathNodeState(node({ done: true, review_due: true }))).toBe("review-due");
    expect(pathNodeState(node({}))).toBe("ready");
  });

  it("renders a started-but-unproven unit as an in-progress ring filled to the honest fraction", () => {
    // PATH-VISUAL-001: the dogfood contradiction — the learner drilled 3
    // of this unit's 4 refs (one ref starved by the rotation), so the
    // engine says NOT done but STARTED. The path must SHOW that, not a
    // flat open circle beside a pin that sits past it.
    const html = renderToStaticMarkup(
      <PathView
        nodes={[
          node({
            unit_id: "ru.unit.on-ramp.cyrillic-a-o-m-t",
            in_progress: true,
            refs_done: 3,
            refs_total: 4,
          }),
          node({ unit_id: "ru.unit.on-ramp.cyrillic-k-e-n-s", current: true }),
        ]}
      />,
    );
    expect(html).toContain('data-state="in-progress"');
    // The ring arc is drawn at the engine's honest fraction, not a fake
    // "half" — 3/4 proven renders as a 75% arc.
    expect(html).toContain('data-fill="0.75"');
    expect(html).toContain('stroke-dasharray="75 25"');
    expect(html).toContain("In progress (3/4 learned)");
    // And the section counter still counts PROVEN-DONE only.
    expect(html).toContain("0/2 done");
  });

  it("PATH-FEEL-MOTION-001: nodes carry the entrance-cascade index for the CSS stagger", () => {
    // The section-expand cascade rides --path-i (CSS caps the stagger
    // at 10 rows). The live-animation proof is the capture gate
    // (scripts/path-motion-capture.mjs); this pins the markup contract
    // the CSS depends on: every node knows its row, in order.
    const html = renderToStaticMarkup(
      <PathView
        nodes={[
          node({ unit_id: "ru.unit.a" }),
          node({ unit_id: "ru.unit.b" }),
          node({ unit_id: "ru.unit.c" }),
        ]}
      />,
    );
    expect(html).toContain("--path-i:0");
    expect(html).toContain("--path-i:1");
    expect(html).toContain("--path-i:2");
  });

  it("winds: node rings sway along a deterministic wave with connector stubs", () => {
    // PATH-VISUAL-001: the flat list is what the owner rejected. The
    // markup must carry the winding geometry — a sway that is a pure
    // function of position, and connectors hanging off each ring.
    const html = renderToStaticMarkup(
      <PathView
        nodes={Array.from({ length: 4 }, (_, i) =>
          node({ unit_id: `ru.unit.w.${i}`, in_progress: i === 0, refs_done: 1 }),
        )}
      />,
    );
    expect(html).toContain("--path-sway:0px");
    expect(html).toContain("--path-sway:29px");
    expect(html).toContain("path-conn--down");
    expect(html).toContain("path-conn--up");
  });

  it("renders exactly ONE 'You are here' caption when three units share the current pool", () => {
    // FIX-PATH-VISUAL-001-1 (owner dogfood 2026-11-22): three units
    // share the introduction pool, so the engine marks all three
    // current — and three stacked captions collided on the phone.
    // Policy (state/notes/FIX-PATH-VISUAL-001-1.md): exactly one
    // caption, on the FIRST current node in rendered (ladder) order;
    // the other current nodes keep their current rings — engine truth
    // stays visible, only the duplicate caption is suppressed.
    const html = renderToStaticMarkup(
      <PathView
        nodes={[
          node({ unit_id: "ru.unit.w.0" }),
          node({ unit_id: "ru.unit.w.1", current: true, in_progress: true, refs_done: 1 }),
          node({ unit_id: "ru.unit.w.2", current: true }),
          node({ unit_id: "ru.unit.w.3", current: true }),
        ]}
      />,
    );
    expect(html.split("You are here").length - 1).toBe(1);
    // The caption belongs to the topmost current node: it rides inside
    // the first current node's markup, before the next node renders.
    const firstCurrent = html.indexOf('data-testid="path-node-ru.unit.w.1"');
    const pin = html.indexOf('data-testid="path-pin"');
    const nextNode = html.indexOf('data-testid="path-node-ru.unit.w.2"');
    expect(firstCurrent).toBeGreaterThan(-1);
    expect(pin).toBeGreaterThan(firstCurrent);
    expect(pin).toBeLessThan(nextNode);
    // The other two current nodes are still engine-honest current rings.
    expect(html.split('data-state="current"').length - 1).toBe(3);
  });
});

// PATH-PIN-CONSISTENCY-001 (owner dogfood 2026-11-22 complaint 10): the
// track showed node 1 (А а О о М м Т т) as "In progress (3/4 learned)"
// while the "You are here" pin sat three nodes later on Б б П п Д д Г г —
// the plan's next-NEW-material suggestion. Two contradictory markers on
// one track read as "the course starts mid-branch". The rule under test:
// the journey has exactly ONE pin, and it marks WHERE THE LEARNER IS —
// the in-progress (or first-not-done) unit, never the recommendation.
// A next-up offer that belongs to a different unit rides a separate
// "next up" chip in the path header (the market pattern: pin on the
// trail, action chip in the header strip), never as the track pin.
describe("one pin = where I am; next-up is a header chip (PATH-PIN-CONSISTENCY-001)", () => {
  // The owner's exact scene in pack order: one proven-done unit, the
  // in-progress unit (3/4 learned), and the plan's next NEW-material
  // offer further down the same band.
  const ownerScene = (): UnitPathNode[] => [
    node({
      unit_id: "ru.unit.a",
      title: "А а О о М м Т т",
      done: true,
      refs_done: 4,
      refs_total: 4,
    }),
    node({
      unit_id: "ru.unit.b",
      title: "Б б П п Д д Г г",
      in_progress: true,
      refs_done: 3,
      refs_total: 4,
    }),
    node({ unit_id: "ru.unit.c", title: "Н н" }),
    node({ unit_id: "ru.unit.d", title: "В в", current: true }),
  ];

  it("pins the IN-PROGRESS unit even when the plan offers a later unit", () => {
    const html = renderToStaticMarkup(<PathView nodes={ownerScene()} />);
    // Exactly one caption on the whole track.
    expect(html.split("You are here").length - 1).toBe(1);
    // The caption rides inside the in-progress unit's markup...
    const pinnedUnit = html.indexOf('data-testid="path-node-ru.unit.b"');
    const pin = html.indexOf('data-testid="path-pin"');
    const offerNode = html.indexOf('data-testid="path-node-ru.unit.d"');
    expect(pinnedUnit).toBeGreaterThan(-1);
    expect(pin).toBeGreaterThan(pinnedUnit);
    expect(pin).toBeLessThan(offerNode);
    // ...and the offered node keeps its engine-honest current ring but
    // NEVER a second pin — the recommendation is not "where I am".
    expect(html).toContain('data-state="current"');
    expect(html.slice(offerNode)).not.toContain("path-node-pin");
  });

  it("with nothing in progress, pins the FIRST not-done unit, not a later offered one", () => {
    const html = renderToStaticMarkup(
      <PathView
        nodes={[
          node({ unit_id: "ru.unit.done", done: true, refs_done: 4, refs_total: 4 }),
          node({ unit_id: "ru.unit.first-ready" }),
          node({ unit_id: "ru.unit.offered", current: true }),
        ]}
      />,
    );
    expect(html.split("You are here").length - 1).toBe(1);
    const firstReady = html.indexOf('data-testid="path-node-ru.unit.first-ready"');
    const pin = html.indexOf('data-testid="path-pin"');
    const offered = html.indexOf('data-testid="path-node-ru.unit.offered"');
    expect(pin).toBeGreaterThan(firstReady);
    expect(pin).toBeLessThan(offered);
  });

  it("shows a next-up offer that belongs to another unit as a header chip, never a second pin", () => {
    const html = renderToStaticMarkup(
      <PathView
        nodes={ownerScene()}
        nextOffer={{
          kind: "introduction",
          unit_id: "ru.unit.d",
          title: "В в",
          minutes: 3,
          total_due: 0,
        }}
      />,
    );
    // The chip lives in the path header zone — before any track node.
    const chip = html.indexOf('data-testid="path-next-up"');
    expect(chip).toBeGreaterThan(-1);
    expect(html).toContain("Next up: В в");
    expect(chip).toBeLessThan(html.indexOf('<ol class="path-nodes"'));
    // The track keeps exactly ONE pin, still on the in-progress unit.
    expect(html.split("You are here").length - 1).toBe(1);
    const pinnedUnit = html.indexOf('data-testid="path-node-ru.unit.b"');
    const pin = html.indexOf('data-testid="path-pin"');
    expect(pin).toBeGreaterThan(pinnedUnit);
    expect(html.slice(html.indexOf('data-testid="path-node-ru.unit.d"'))).not.toContain(
      "path-node-pin",
    );
  });

  it("renders no next-up chip when the offer names the pinned unit itself", () => {
    const html = renderToStaticMarkup(
      <PathView
        nodes={ownerScene()}
        nextOffer={{
          kind: "introduction",
          unit_id: "ru.unit.b",
          title: "Б б П п Д д Г г",
          minutes: 3,
          total_due: 0,
        }}
      />,
    );
    expect(html).not.toContain('data-testid="path-next-up"');
    expect(html.split("You are here").length - 1).toBe(1);
  });
});

// PATH-SECTIONS-DEDUP-001 (owner dogfood 2026-11-22 complaint 09a): the
// path shows ONE section row per band. The pack's late-appended journey
// groups (files 810–818: A2 past-events, B1 practical-problems, B2
// style-register) sit at the tail of curriculum file order, honestly
// banded — the old consecutive-run grouping rendered them as a SECOND
// A2/B1/B2 ladder at 0/3 each. The rule under test: sections are the
// canonical band list; every unit maps INTO its band, never beside it.
describe("path sections are the canonical band ladder (PATH-SECTIONS-DEDUP-001)", () => {
  // Exactly the shape the pack produces: the five main bands, then the
  // three stray journey groups at the tail of engine order.
  const packShapedNodes = (): UnitPathNode[] => [
    node({ unit_id: "ru.unit.ramp.1", band: "on-ramp" }),
    node({ unit_id: "ru.unit.a1.1", band: "A1" }),
    node({ unit_id: "ru.unit.a2.1", band: "A2" }),
    node({ unit_id: "ru.unit.a2.2", band: "A2" }),
    node({ unit_id: "ru.unit.b1.1", band: "B1" }),
    node({ unit_id: "ru.unit.b2.1", band: "B2" }),
    node({ unit_id: "ru.unit.a2.jpast-01", band: "A2" }),
    node({ unit_id: "ru.unit.a2.jpast-02", band: "A2" }),
    node({ unit_id: "ru.unit.a2.jpast-03", band: "A2" }),
    node({ unit_id: "ru.unit.b1.jprob-01", band: "B1" }),
    node({ unit_id: "ru.unit.b1.jprob-02", band: "B1" }),
    node({ unit_id: "ru.unit.b1.jprob-03", band: "B1" }),
    node({ unit_id: "ru.unit.b2.jstyle-01", band: "B2" }),
    node({ unit_id: "ru.unit.b2.jstyle-02", band: "B2" }),
    node({ unit_id: "ru.unit.b2.jstyle-03", band: "B2" }),
  ];

  it("never spawns a duplicate band label — the tail groups merge into their band", () => {
    const sections = pathSections(packShapedNodes());
    const bands = sections.map((s) => s.band.trim().toLowerCase());
    expect(new Set(bands).size).toBe(bands.length);
    // Canonical ladder order regardless of where the nodes rode in engine order.
    expect(bands).toEqual(["on-ramp", "a1", "a2", "b1", "b2"]);
    // The stray groups merged INTO their band, counts included.
    expect(sections.find((s) => s.band === "A2")!.nodes.map((n) => n.unit_id)).toEqual([
      "ru.unit.a2.1",
      "ru.unit.a2.2",
      "ru.unit.a2.jpast-01",
      "ru.unit.a2.jpast-02",
      "ru.unit.a2.jpast-03",
    ]);
    expect(sections.find((s) => s.band === "B1")!.nodes).toHaveLength(4);
    expect(sections.find((s) => s.band === "B2")!.nodes).toHaveLength(4);
  });

  it("orders sections by the canonical ladder, not by first-occurrence in engine order", () => {
    const sections = pathSections([
      node({ unit_id: "ru.unit.b2.late", band: "B2" }),
      node({ unit_id: "ru.unit.a1.early", band: "A1" }),
      node({ unit_id: "ru.unit.nope", band: null }),
    ]);
    expect(sections.map((s) => s.band)).toEqual(["A1", "B2", "other"]);
  });

  it("custom pack bands ride after the CEFR ladder in first-occurrence order", () => {
    const sections = pathSections([
      node({ unit_id: "ru.unit.novice.1", band: "novice" }),
      node({ unit_id: "ru.unit.a1.1", band: "A1" }),
      node({ unit_id: "ru.unit.expert.1", band: "expert" }),
    ]);
    expect(sections.map((s) => s.band)).toEqual(["A1", "novice", "expert"]);
  });

  it("renders exactly one section header per band at the real pack's shape", () => {
    const html = renderToStaticMarkup(<PathView nodes={packShapedNodes()} />);
    for (const band of ["on-ramp", "A1", "A2", "B1", "B2"]) {
      const rows = html.split(`data-band="${band}"`).length - 1;
      expect(rows, `section header rows for band ${band}`).toBe(1);
    }
  });
});

// PATH-LOCK-ORDER-001 (owner phone live inspection 2026-11-23): two LOCKED
// number-words nodes rendered ABOVE the "You are here" pin, each repeating
// the same unlock sentence. Market rule (docs/design/
// PROGRESSION-UX-AUDIT-2026-11-22.md): completed above, current in the
// middle, locked strictly below — nothing locked sits above the learner.
// The number-words units are honestly gated on the Cyrillic goal (goal-level
// hard prerequisite, no requires_unit edge); what lied was the placement —
// curriculum FILE order put them before it. Display order must follow the
// gates, not the file numbering. Root cause in state/notes/PATH-LOCK-ORDER-001.md.
describe("locked nodes render strictly below the frontier (PATH-LOCK-ORDER-001)", () => {
  // The fresh-profile on-ramp shape: word units (locked until Cyrillic
  // independence) ride AHEAD of the Cyrillic units in file order — exactly
  // the pack's real numbering (files 000–009 words, 010+ Cyrillic).
  const freshProfile = (): UnitPathNode[] => [
    node({
      unit_id: "ru.unit.on-ramp.greetings-01",
      locked: true,
      unlock_hint: 'finish "the Cyrillic letters"',
    }),
    node({
      unit_id: "ru.unit.on-ramp.numbers-01",
      locked: true,
      unlock_hint: 'finish "the Cyrillic letters"',
    }),
    node({
      unit_id: "ru.unit.on-ramp.numbers-02",
      locked: true,
      unlock_hint: 'finish "the Cyrillic letters"',
    }),
    node({ unit_id: "ru.unit.on-ramp.cyrillic-a-o-m-t" }),
    node({ unit_id: "ru.unit.on-ramp.cyrillic-k-e-n-s" }),
    node({
      unit_id: "ru.unit.on-ramp.stress-review",
      done: true,
      refs_done: 4,
      refs_total: 4,
    }),
  ];

  it("orders each section done -> open -> locked, curriculum order inside each group", () => {
    const sections = pathSections(freshProfile());
    expect(sections).toHaveLength(1);
    expect(sections[0]!.nodes.map((n) => n.unit_id)).toEqual([
      "ru.unit.on-ramp.stress-review",
      "ru.unit.on-ramp.cyrillic-a-o-m-t",
      "ru.unit.on-ramp.cyrillic-k-e-n-s",
      "ru.unit.on-ramp.greetings-01",
      "ru.unit.on-ramp.numbers-01",
      "ru.unit.on-ramp.numbers-02",
    ]);
  });

  // Re-pinned by FIX-M1-PATH-VIS-001 (LEARNER-REVIEW-M1-001 D-003): the
  // third locked sibling now sits past PATH_FUTURE_WINDOW, so it is not in
  // the DOM at all — its band shows a counted "+ 1 later unit" group instead
  // of its title. The original assertion (nothing locked rides ABOVE the
  // pin) stands for every node that does render; the new assertion is
  // stricter: far-future units never title themselves at all.
  it("renders zero locked nodes above the pinned frontier node", () => {
    const html = renderToStaticMarkup(<PathView nodes={freshProfile()} />);
    const pinNode = html.indexOf('data-testid="path-node-ru.unit.on-ramp.cyrillic-a-o-m-t"');
    const pin = html.indexOf('data-testid="path-pin"');
    expect(pinNode).toBeGreaterThan(-1);
    expect(pin).toBeGreaterThan(pinNode);
    for (const lockedId of ["ru.unit.on-ramp.greetings-01", "ru.unit.on-ramp.numbers-01"]) {
      expect(
        html.indexOf(`data-testid="path-node-${lockedId}"`),
        `${lockedId} must render BELOW the pin`,
      ).toBeGreaterThan(pin);
    }
    expect(
      html.indexOf('data-testid="path-node-ru.unit.on-ramp.numbers-02"'),
      "a past-window locked unit may not render its node at all",
    ).toBe(-1);
    expect(html, "the collapsed band group counts them, and names no titles").toContain(
      "+ 1 later unit in",
    );
  });

  it("sibling locked nodes sharing one gate state the unlock reason ONCE", () => {
    const html = renderToStaticMarkup(<PathView nodes={freshProfile()} />);
    expect(html.split("finish &quot;the Cyrillic letters&quot;").length - 1).toBe(1);
    // Distinct gates still each get their own reason — dedup never hides a
    // gate nobody has heard yet. (All-locked track: with no pin the first
    // section renders open.)
    const distinct = renderToStaticMarkup(
      <PathView
        nodes={[
          node({
            unit_id: "ru.unit.novice.a",
            band: "novice",
            locked: true,
            unlock_hint: "finish Warm-up first",
          }),
          node({
            unit_id: "ru.unit.novice.b",
            band: "novice",
            locked: true,
            unlock_hint: "finish Starter first",
          }),
        ]}
      />,
    );
    expect(distinct).toContain("finish Warm-up first");
    expect(distinct).toContain("finish Starter first");
  });
});

// PATH-FEEL-SCROLL-001 (Duolingo parity for the viewport): the journey
// opens centered on the pin, and once the learner scrolls their spot away
// a floating "jump to my spot" arrow appears, pointing back toward it.
// The live proof (offscreen flip, arrow direction, jump-back) is the
// capture gate scripts/path-scroll-capture.mjs; these tests pin the
// markup contract the observer + CSS depend on: the control SHIPS hidden
// and only exists when the track has a pin to jump to.
describe("jump-to-my-spot affordance (PATH-FEEL-SCROLL-001)", () => {
  it("ships the jump control hidden in the markup, ready for the offscreen flip", () => {
    const html = renderToStaticMarkup(
      <PathView
        nodes={[
          node({ unit_id: "ru.unit.a", done: true, refs_done: 4, refs_total: 4 }),
          node({ unit_id: "ru.unit.b", in_progress: true, refs_done: 3, refs_total: 4 }),
        ]}
      />,
    );
    expect(html).toContain('data-testid="path-jump-to-pin"');
    // Hidden until the pin node leaves the viewport — the IntersectionObserver
    // flips data-visible, the CSS animates opacity only (no layout jump).
    expect(html).toContain('data-visible="false"');
    expect(html).toContain('aria-label="Jump to my spot"');
  });

  it("has no jump affordance when the track has no pin (nothing left open)", () => {
    const html = renderToStaticMarkup(
      <PathView
        nodes={[node({ unit_id: "ru.unit.a", done: true, refs_done: 4, refs_total: 4 })]}
      />,
    );
    expect(html).not.toContain('data-testid="path-jump-to-pin"');
  });
});

// PATH-NODE-TYPES-001 (market sheet: Duolingo's pictogram grammar): the
// ring center carries WHAT the unit teaches (engine-derived kind), the
// state layer (fill, color, halo, lock, check, captions) carries WHERE the
// learner is, and the glyph is never the only signal — every node names
// its kind to the screen reader in words.
describe("typed node glyphs by activity kind (PATH-NODE-TYPES-001)", () => {
  it("draws one pictogram per kind in the ring center — the identical text dots are gone", () => {
    const html = renderToStaticMarkup(
      <PathView
        nodes={[
          node({ unit_id: "u-letters", kind: "letters" }),
          node({ unit_id: "u-listen", kind: "listening" }),
          node({ unit_id: "u-speak", kind: "speaking" }),
          node({ unit_id: "u-words", kind: "words" }),
        ]}
      />,
    );
    for (const kind of ["letters", "listening", "speaking", "words"]) {
      expect(html).toContain(`data-kind="${kind}"`);
      expect(html).toContain(`data-glyph="${kind}"`);
    }
    // The identical-circle era is over: no •/○/◉/⟳ text dots anywhere on
    // the track. (The ✓ completion mark is a state mark, not a dot; the
    // middle-dot unlock-hint separator is a different character.)
    expect(html).not.toMatch(/[•○◉⟳]/);
  });

  it("never lets the glyph stand alone: the pictogram is aria-hidden and the row names the kind in words", () => {
    const html = renderToStaticMarkup(
      <PathView
        nodes={[node({ unit_id: "u-l", kind: "listening", title: "Hear the difference" })]}
      />,
    );
    // decoration for sighted users only...
    expect(html).toContain('data-glyph="listening" aria-hidden="true"');
    // ...and the row itself says the kind and shows the visible title.
    expect(html).toContain(">Listening<");
    expect(html).toContain("Hear the difference");
  });

  it("keeps the state layer intact: done keeps the check and names Completed; review-due keeps its caption", () => {
    const done = renderToStaticMarkup(
      <PathView nodes={[node({ unit_id: "u-d", kind: "words", done: true })]} />,
    );
    expect(done).toContain("✓");
    expect(done).toContain(">Completed<");
    const review = renderToStaticMarkup(
      <PathView
        nodes={[
          node({
            unit_id: "u-r",
            kind: "listening",
            done: true,
            review_due: true,
            due_count: 2,
          }),
        ]}
      />,
    );
    expect(review).toContain('data-glyph="review"');
    expect(review).toContain("Review due (2)");
    expect(review).toContain(">Listening<");
  });
});

// UNIT-CAPSTONE-001: the section checkpoint node. The engine synthesizes
// it (the live-wire shape is proven by capstone-capture.mjs); THIS file
// pins what the view does with those nodes — the calm-but-warm posture
// (ADR-0002): a real control, plain words, no celebration.
describe("section capstone node (UNIT-CAPSTONE-001)", () => {
  const cap = (over: Partial<UnitPathNode>): UnitPathNode =>
    node({
      unit_id: "capstone.org.openlanguage.ru-ru.reference.on-ramp",
      kind: "capstone",
      title: "Section review",
      summary: "Mixed recall of the letters and words of this section.",
      refs_total: 84,
      unlock_hint: "finish this section's units first",
      ...over,
    });

  it("renders a locked checkpoint with its gate hint and NO start control", () => {
    const html = renderToStaticMarkup(
      <PathView nodes={[node({ unit_id: "ru.unit.x", current: true }), cap({ locked: true })]} />,
    );
    expect(html).toContain('data-kind="capstone"');
    expect(html).toContain('data-state="locked"');
    expect(html).toContain("finish this section&#x27;s units first");
    expect(html).not.toContain("Start section review");
  });

  it("offers a real start control on an unlocked, unattempted checkpoint and wires it", () => {
    const html = renderToStaticMarkup(
      <PathView
        nodes={[
          node({ unit_id: "ru.unit.x", done: true }),
          cap({ unlock_hint: null, refs_done: 84 }),
        ]}
        onStartCapstone={() => {}}
      />,
    );
    // The flag pictogram appears once the lock lifts (state-layer rule
    // from PATH-NODE-TYPES-001: locked nodes wear the lock, not the kind).
    expect(html).toContain('data-glyph="capstone"');
    expect(html).toContain("Start section review");
    expect(html).toContain(
      'data-testid="capstone-start-capstone.org.openlanguage.ru-ru.reference.on-ramp"',
    );
    expect(html).toContain("Section review");
  });

  it("invites a retry on a started-but-unpassed checkpoint and states the record on a passed one", () => {
    const again = renderToStaticMarkup(
      <PathView
        nodes={[node({ unit_id: "ru.unit.x", done: true }), cap({ in_progress: true })]}
        onStartCapstone={() => {}}
      />,
    );
    expect(again).toContain("Run the section review again");
    const passed = renderToStaticMarkup(
      <PathView nodes={[node({ unit_id: "ru.unit.x", done: true }), cap({ done: true })]} />,
    );
    expect(passed).toContain("Section review recorded");
    expect(passed).not.toContain("Start section review");
    // ADR-0002: the recorded state is a fact, not a trophy — the only
    // celebration-free copy is the plain record caption, with no XP or
    // badge tokens (word-boundary + case-sensitive: aria-expanded is not XP).
    expect(passed).not.toContain("Congrats");
    expect(passed).not.toMatch(/\bXP\b|badge|celebration/i);
  });

  it("states a finished review once, calmly, with the engine's honest counts", () => {
    // WARM-MOMENTS-001 re-scope: the pass branch is now the quiet
    // unit-finish card (its presence + token suite live in the
    // unit-finish-moment describe); the calm counts stay the substance.
    const pass = renderToStaticMarkup(
      <PathView
        nodes={[node({ unit_id: "ru.unit.x", current: true })]}
        capstoneResult={{
          passed: true,
          items: 16,
          correct: 13,
          friendly: "On-ramp",
          band: "on-ramp",
        }}
      />,
    );
    expect(pass).toContain("Section complete — On-ramp");
    expect(pass).toContain("13 of 16 recalled");
    expect(pass).toContain('role="status"');
    const fail = renderToStaticMarkup(
      <PathView
        nodes={[node({ unit_id: "ru.unit.x", current: true })]}
        capstoneResult={{
          passed: false,
          items: 16,
          correct: 9,
          friendly: "On-ramp",
          band: "on-ramp",
        }}
      />,
    );
    expect(fail).toContain(
      "Section review recorded — 9 of 16 recalled. Not passed yet — keep practicing this section, then run the review again.",
    );
    expect(fail).not.toContain("Congrats");
    const err = renderToStaticMarkup(
      <PathView
        nodes={[node({ unit_id: "ru.unit.x", current: true })]}
        capstoneResult={{
          passed: false,
          items: 0,
          correct: 0,
          friendly: "On-ramp",
          band: "on-ramp",
          error: "pack not installed",
        }}
      />,
    );
    expect(err).toContain("Could not record the section review: pack not installed");
  });

  it("counts the checkpoint in the section counter and flips its last slot on pass", () => {
    // 1 unit + 1 checkpoint: the checkpoint is one of the counted nodes,
    // and passing it is what takes the counter from 1/2 to 2/2.
    const before = renderToStaticMarkup(
      <PathView nodes={[node({ unit_id: "ru.unit.x", done: true }), cap({})]} />,
    );
    expect(before).toContain("1/2 done");
    const after = renderToStaticMarkup(
      <PathView nodes={[node({ unit_id: "ru.unit.x", done: true }), cap({ done: true })]} />,
    );
    expect(after).toContain("2/2 done");
  });
});

// WARM-MOMENTS-001: the calm-but-warm unit-finish moment (owner decision
// 2026-11-22, docs/design/PROGRESSION-UX-AUDIT-2026-11-22.md; ADR-0002
// amended). A PASSED capstone gets one quiet card — what was completed,
// the honest recall numbers behind it, what comes next. Honest warmth
// only: the amended ADR still bans every token that could turn warmth
// into a lever, and this card asserts BOTH presence and token-freedom.
describe("unit-finish moment (WARM-MOMENTS-001)", () => {
  const cap = (over: Partial<UnitPathNode>): UnitPathNode =>
    node({
      unit_id: "capstone.org.openlanguage.ru-ru.reference.on-ramp",
      kind: "capstone",
      title: "Section review",
      summary: "Mixed recall of the letters and words of this section.",
      refs_total: 84,
      ...over,
    });
  const finishedSection: UnitPathNode[] = [
    node({ unit_id: "ru.unit.one", done: true }),
    node({ unit_id: "ru.unit.two", done: true }),
    cap({ done: true, refs_done: 84, unlock_hint: null }),
    node({ unit_id: "ru.unit.a1-first", band: "a1" }),
  ];
  const pass = renderToStaticMarkup(
    <PathView
      nodes={finishedSection}
      capstoneResult={{
        passed: true,
        items: 16,
        correct: 13,
        friendly: "Getting started",
        band: "on-ramp",
      }}
    />,
  );

  it("a passed capstone renders the quiet completion card with honest counts", () => {
    expect(pass).toContain('data-testid="unit-finish-moment"');
    expect(pass).toContain("Section complete — Getting started");
    expect(pass).toContain("Well done");
    expect(pass).toContain("13 of 16");
    // What was learned: the section's units and its proven recall pool.
    expect(pass).toContain("2 units");
    expect(pass).toContain("84 of 84");
  });

  it("the card names the next section by friendly name and live lock state", () => {
    // The a1 fixture node is unlocked: the card may say it is open.
    expect(pass).toContain("Up next: Beginner");
    expect(pass).toContain("open on the path");
    // And when the next section is still locked, the card says so — it
    // never claims an unlock that the engine does not report.
    const lockedNext = renderToStaticMarkup(
      <PathView
        nodes={[
          node({ unit_id: "ru.unit.one", done: true }),
          cap({ done: true, refs_done: 84, unlock_hint: null }),
          node({ unit_id: "ru.unit.a1-first", band: "a1", locked: true }),
        ]}
        capstoneResult={{
          passed: true,
          items: 16,
          correct: 13,
          friendly: "Getting started",
          band: "on-ramp",
        }}
      />,
    );
    expect(lockedNext).toContain("Up next: Beginner");
    expect(lockedNext).toContain("still ahead");
  });

  it("the card carries warmth without any banned token", () => {
    expect(pass).not.toMatch(
      /congrats|celebrat|\bxp\b|badge|league|\bpoints\b|heart|freeze|streak/i,
    );
  });

  it("an unpassed or failed review never fakes the moment", () => {
    const fail = renderToStaticMarkup(
      <PathView
        nodes={finishedSection}
        capstoneResult={{
          passed: false,
          items: 16,
          correct: 9,
          friendly: "Getting started",
          band: "on-ramp",
        }}
      />,
    );
    expect(fail).not.toContain('data-testid="unit-finish-moment"');
    expect(fail).toContain("Not passed yet");
  });
});

// TODAY-FIRSTSCREEN-001 (MARKET NAVIGATION RULES, PROGRESSION-UX-AUDIT-2026-11-22):
// the first screen IS the path and the start action lives ON the frontier
// node. The whatsnext CTA MOVES to the pin (one pill on the pinned node),
// it is never copied beside it.
describe("start pill rides the frontier pin (TODAY-FIRSTSCREEN-001)", () => {
  it("renders exactly ONE pill inside the pinned node's row and nowhere else", () => {
    const html = renderToStaticMarkup(
      <PathView
        nodes={[
          node({ unit_id: "ru.unit.done-1", done: true }),
          node({ unit_id: "ru.unit.frontier", in_progress: true }),
          node({ unit_id: "ru.unit.next" }),
        ]}
        startPlan={() => {}}
      />,
    );
    expect(html).toContain('data-testid="path-start-pill"');
    expect(html.match(/data-testid="path-start-pill"/g)).toHaveLength(1);
    // The pill labels itself as the moved whatsnext CTA, same words.
    expect(html).toContain("Start today&#x27;s plan");
    // It rides the PIN row: the pill markup sits inside the pinned node's
    // <li> (before the next node's data-unit marker, after the pin label).
    const pinRow = html.slice(
      html.indexOf('data-unit="ru.unit.frontier"'),
      html.indexOf('data-unit="ru.unit.next"'),
    );
    expect(pinRow).toContain('data-testid="path-pin"');
    expect(pinRow).toContain('data-testid="path-start-pill"');
    expect(html.slice(html.indexOf('data-unit="ru.unit.next"'))).not.toContain(
      'data-testid="path-start-pill"',
    );
    expect(html.slice(0, html.indexOf('data-unit="ru.unit.frontier"'))).not.toContain(
      'data-testid="path-start-pill"',
    );
  });

  it("no pill at all when there is no plan to start and no section review to run", () => {
    const html = renderToStaticMarkup(
      <PathView
        nodes={[
          node({ unit_id: "ru.unit.frontier", in_progress: true }),
          node({
            unit_id: "capstone.org.openlanguage.ru-ru.reference.on-ramp",
            kind: "capstone",
            locked: true,
          }),
        ]}
      />,
    );
    expect(html).not.toContain('data-testid="path-start-pill"');
  });

  it("falls back to the pin's section review when today's plan has nothing to start", () => {
    const html = renderToStaticMarkup(
      <PathView
        nodes={[
          node({ unit_id: "ru.unit.frontier", in_progress: true }),
          node({
            unit_id: "capstone.org.openlanguage.ru-ru.reference.on-ramp",
            kind: "capstone",
            title: "Section review",
            unlock_hint: null,
          }),
        ]}
        onStartCapstone={() => {}}
      />,
    );
    const pill = /data-testid="path-start-pill"[^>]*>([^<]*)/.exec(html);
    expect(
      pill,
      "pill on the pinned unit when only the section review is startable",
    ).not.toBeNull();
    expect(pill![1]).toContain("Start section review");
    // The pill rides the pinned UNIT row, not the capstone row — the
    // capstone keeps its own control (next assertion: still exactly one).
    expect(html.match(/data-testid="path-start-pill"/g)).toHaveLength(1);
    const capRow = html.slice(html.indexOf('data-unit="capstone.org'));
    expect(capRow).not.toContain('data-testid="path-start-pill"');
    // And the capstone node's own start control is untouched.
    expect(
      html.includes(
        'data-testid="capstone-start-capstone.org.openlanguage.ru-ru.reference.on-ramp"',
      ),
    ).toBe(true);
  });

  it("never pills a pinned capstone — its own start control already IS the action", () => {
    const html = renderToStaticMarkup(
      <PathView
        nodes={[
          node({ unit_id: "ru.unit.done-1", done: true }),
          node({
            unit_id: "capstone.org.openlanguage.ru-ru.reference.on-ramp",
            kind: "capstone",
            title: "Section review",
            unlock_hint: null,
            current: true,
            in_progress: true,
          }),
        ]}
        startPlan={() => {}}
        onStartCapstone={() => {}}
      />,
    );
    // The pin can land on a checkpoint; that node already carries the
    // UNIT-CAPSTONE-001 start button — a pill would duplicate it.
    expect(html).not.toContain('data-testid="path-start-pill"');
    expect(html).toContain(
      'data-testid="capstone-start-capstone.org.openlanguage.ru-ru.reference.on-ramp"',
    );
  });
});

// PATH-CONNECT-PILL-001 (owner dogfood 2026-11-23: "none of the lines
// connect and you're starting in the middle"). The frozen contract lives
// in state/notes/PATH-CONNECT-PILL-001.md: fixed row pitch, overlay start
// pill, connector stubs bridging ring centers, a track head cap, and
// per-unit typed glyphs. The live-geometry gates A1-A5 are the capture
// harness (scripts/path-connect-pill-capture.mjs); these contracts pin
// the markup + CSS rules that make that geometry possible.
describe("track connects: pitch, pill overlay, head cap, typed glyphs (PATH-CONNECT-PILL-001)", () => {
  const css = readFileSync(new URL("../../../packages/ui/src/styles.css", import.meta.url), "utf8");
  const ruleBody = (selector: string): string => {
    const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const m = new RegExp(`^\\s*${esc}\\s*\\{([^}]*)\\}`, "m").exec(css);
    if (!m) throw new Error(`styles.css must define a "${selector}" rule`);
    return (m[1] ?? "").replace(/\s+/g, " ");
  };

  it("R1 CSS: rows are exactly PATH_ROW_PITCH_PX tall and touch (gap 0)", () => {
    expect(ruleBody(".path-nodes")).toContain("gap: 0");
    const row = ruleBody(".path-node");
    expect(row).toContain("height: 4.75rem"); // = 76px = PATH_ROW_PITCH_PX
    expect(row).toContain("grid-template-rows: minmax(0, 1fr)"); // the TRACK cannot grow
    expect(row).toContain("position: relative");
    expect(row).not.toContain("min-height: 4.75rem");
  });

  it("R3/A2 CSS: connector stubs anchor ON the ring center line", () => {
    expect(ruleBody(".path-conn--down")).toContain("top: 50%");
    expect(ruleBody(".path-conn--up")).toContain("bottom: 50%");
    expect(ruleBody(".path-conn")).toContain("height: 3.6rem");
  });

  it("R2 CSS: the start pill is an absolutely-positioned one-line overlay", () => {
    const pill = ruleBody(".path-node-start");
    expect(pill).toContain("position: absolute");
    expect(pill).toContain("white-space: nowrap");
  });

  it("R4: exactly one track head cap, on the FIRST node of the open band", () => {
    const html = renderToStaticMarkup(
      <PathView
        nodes={[
          node({ unit_id: "ru.unit.head", in_progress: true }),
          node({ unit_id: "ru.unit.two" }),
          node({ unit_id: "ru.unit.three", locked: true }),
        ]}
      />,
    );
    expect(html.match(/data-testid="path-head-cap"/g)).toHaveLength(1);
    const firstRow = html.slice(
      html.indexOf('data-unit="ru.unit.head"'),
      html.indexOf('data-unit="ru.unit.two"'),
    );
    expect(firstRow).toContain('data-testid="path-head-cap"');
  });

  it("R5: letters units wear their OWN head letter, not the shared A pictogram", () => {
    expect(pathTypedLetterGlyph("Printed Cyrillic: Б б, В в, Г г, Д д")).toBe("Б");
    expect(pathTypedLetterGlyph("No colon here")).toBeNull();
    const html = renderToStaticMarkup(
      <PathView
        nodes={[
          node({
            unit_id: "ru.unit.letters.a",
            kind: "letters",
            title: "Printed Cyrillic: А а, О о, М м, Т т",
            in_progress: true,
          }),
          node({
            unit_id: "ru.unit.letters.k",
            kind: "letters",
            title: "Printed Cyrillic: К к, Е е, Н н, С с",
          }),
        ]}
      />,
    );
    expect(html).toContain('class="path-node-letter" data-glyph="letters"');
    expect(html).toContain(">А</span>");
    expect(html).toContain(">К</span>");
    // The two open letter rings no longer share one identical drawing.
    expect(html.match(/path-node-letter/g)!.length).toBe(2);
  });
});

// FIX-M1-PATH-VIS-001 (LEARNER-REVIEW-M1-001 D-003): the pack catalog is 818
// units, and the open band rendered every one of them — a from-zero learner
// read "carbon economics" / "thesis defense" as today's roadmap. The market
// IA rule (docs/design/PROGRESSION-UX-AUDIT-2026-11-22.md) is OPEN AT the
// frontier, locked strictly BELOW; the locked mass must never BE the screen.
// These pins hold the line: inside the open band the learner sees their
// history, the frontier, and PATH_FUTURE_WINDOW locked neighbours; the rest
// collapses to a counted group that names no future titles.
describe("the far-future catalog stays collapsed (FIX-M1-PATH-VIS-001)", () => {
  const catalogBand = (count: number): UnitPathNode[] => [
    node({
      unit_id: "ru.unit.a1.done-1",
      band: "a1",
      title: "Market morning",
      done: true,
      refs_done: 4,
      refs_total: 4,
    }),
    node({ unit_id: "ru.unit.a1.frontier", band: "a1", title: "Numbers to 100" }),
    ...Array.from({ length: count }, (_, i) =>
      node({
        unit_id: `ru.unit.a1.future-${i}`,
        band: "a1",
        title: `Carbon economics ${i}`,
        locked: true,
      }),
    ),
  ];

  it("keeps history + frontier + PATH_FUTURE_WINDOW neighbours, hides the rest", () => {
    const nodes = catalogBand(40);
    expect(pathTailCutoff(nodes)).toBe(2 + PATH_FUTURE_WINDOW);
    const html = renderToStaticMarkup(<PathView nodes={nodes} />);
    expect(html).toContain('data-testid="path-node-ru.unit.a1.done-1"');
    expect(html).toContain('data-testid="path-node-ru.unit.a1.frontier"');
    for (let i = 0; i < PATH_FUTURE_WINDOW; i += 1) {
      expect(html).toContain(`data-testid="path-node-ru.unit.a1.future-${i}"`);
    }
    for (let i = PATH_FUTURE_WINDOW; i < 40; i += 1) {
      expect(
        html.indexOf(`data-testid="path-node-ru.unit.a1.future-${i}"`),
        `future-${i} is beyond the frontier window and must not render`,
      ).toBe(-1);
    }
  });

  it("collapses the hidden units into ONE counted group naming no titles", () => {
    const html = renderToStaticMarkup(<PathView nodes={catalogBand(741)} />);
    const group = html.match(/data-testid="path-later-units-a1"[^>]*>\s*([^<]*)/);
    expect(group, "the counted band group is the only tail row").not.toBeNull();
    const [, label] = group as unknown as [string, string];
    expect(label.trim()).toBe("+ 739 later units in Beginner");
    expect(html.match(/data-hidden="739"/), "the count rides the control").not.toBeNull();
    expect(html.split("Carbon economics").length - 1).toBe(PATH_FUTURE_WINDOW);
  });

  it("a band beyond the frontier never renders any of its unit titles", () => {
    // The collapsed-band contract: a far band is a header with a count, and
    // a title only ever appears inside the band the learner stands in.
    const nodes: UnitPathNode[] = [
      node({ unit_id: "ru.unit.on-ramp.here", band: "on-ramp", title: "First sounds" }),
      ...Array.from({ length: 403 }, (_, i) =>
        node({
          unit_id: `ru.unit.b2.future-${i}`,
          band: "b2",
          title: `Thesis defense ${i}`,
          locked: true,
        }),
      ),
    ];
    const html = renderToStaticMarkup(<PathView nodes={nodes} />);
    expect(html).toContain('data-band="b2"');
    expect(html, "the b2 header counts the tail; it never titles it").toContain("0/403 done");
    expect(html).not.toContain("Thesis defense");
  });
});
