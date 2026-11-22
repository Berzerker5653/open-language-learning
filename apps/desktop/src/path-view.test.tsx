// PATH-VIEW-001 (PROGRESS-PATH-DESIGN-001.md phase 1): the Today tab's unit
// path. The view renders engine state and derives nothing — these tests pin
// the visible contract: attendance-shaped nodes are never done, locked units
// are visible with their unlock hint, done units re-light when reviews are
// due, and sections carry friendly names with CEFR as the small subtitle.
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PathView, pathNodeState, type UnitPathNode } from "./home";

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
});
