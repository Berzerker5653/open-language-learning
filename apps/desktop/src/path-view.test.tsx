// PATH-VIEW-001 (PROGRESS-PATH-DESIGN-001.md phase 1): the Today tab's unit
// path. The view renders engine state and derives nothing — these tests pin
// the visible contract: attendance-shaped nodes are never done, locked units
// are visible with their unlock hint, done units re-light when reviews are
// due, and sections carry friendly names with CEFR as the small subtitle.
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PathView, pathNodeState, pathSections, type UnitPathNode } from "./home";

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
    expect(html).toContain("⟳");
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
    expect(html).toContain("0/1 units done");
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
    expect(html).toContain("0/2 units done");
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
