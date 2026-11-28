// @vitest-environment happy-dom
/**
 * FIX-M1-PATH-VIS-2 (REVIEW-FIX-M1-PATH-VIS-001 S-D2, MAJOR): the counted
 * row on a CLOSED band was a dead control — the tap only added the band to
 * `expandedTails`, which changes `visibleNodes` for a list that never
 * mounts while the band is closed: the button unmounted itself and ZERO
 * rows appeared (4 of the 5 day-1 RU counted rows behaved this way). The
 * shipped contract: tapping a counted row opens its band (the same accordion
 * move the header toggle makes) AND expands its tail, so the learner's
 * lookahead tap renders exactly the units it counted. Interactive walk on a
 * real React root (the mywords-undo precedent); the static SSR pins live in
 * path-view.test.tsx.
 */
import { describe, expect, it, afterEach } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { PathView, type UnitPathNode } from "./home";

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

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

describe("tapping the counted row pulls its band's tail into view (FIX-M1-PATH-VIS-2)", () => {
  let root: Root | null = null;
  let container: HTMLDivElement | null = null;
  afterEach(() => {
    act(() => root?.unmount());
    root = null;
    container?.remove();
    container = null;
  });

  it("a closed band's counted row counts the whole band, and the tap renders it", () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    const nodes: UnitPathNode[] = [
      node({ unit_id: "ru.unit.on-ramp.here", band: "on-ramp", title: "First sounds" }),
      ...Array.from({ length: 5 }, (_, i) =>
        node({
          unit_id: `ru.unit.a1.future-${i}`,
          band: "a1",
          title: `Market morning ${i}`,
          locked: true,
        }),
      ),
    ];
    root = createRoot(container);
    act(() => root!.render(<PathView nodes={nodes} />));

    const section = container!.querySelector<HTMLElement>('[data-band="a1"]')!;
    expect(section, "the closed band renders its header only").toBeTruthy();
    expect(section.querySelectorAll("li[data-unit]").length).toBe(0);
    const btn = section.querySelector<HTMLElement>('[data-testid="path-later-units-a1"]')!;
    expect(btn.getAttribute("data-hidden"), "S-D1: the count is the full band").toBe("5");

    act(() => {
      btn.click();
    });

    // S-D2: the band opened and every counted unit now renders.
    expect(section.querySelectorAll("li[data-unit]").length).toBe(5);
    expect(section.querySelector('[data-testid="path-later-units-a1"]')).toBeNull();
    // The accordion moved: the tapped band is the open one, and its header
    // toggle reports the honest expanded state.
    const header = section.querySelector<HTMLElement>(".path-section-toggle")!;
    expect(header.getAttribute("aria-expanded")).toBe("true");
  });
});
