// @vitest-environment happy-dom
/**
 * FEEL-MYWORDS-001 (undo leg) — remove is reversible: the row leaves at
 * once, a UNDO chip lives 4 s, and the engine delete is deferred to the
 * chip's expiry. Interactive walk on a real React root with fake timers;
 * the static sheet/SSR pins live in mywords-feel.test.tsx (the DOM project
 * cannot read the sheet via file URLs, hence the split).
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MyWordsPanel, type MineDraft, type MineItem, type MyWordsPanelProps } from "./words";

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const DAY = 86_400_000;
function item(over: Partial<MineItem> & { id: string; due_at: string | null }): MineItem {
  return {
    surface: "дом",
    reading: null,
    gloss: "house; home",
    source_citation: "ru.lesson.first",
    created_at: "2026-11-20T00:00:00Z",
    context_sentence_id: null,
    context_sentence: null,
    ...over,
  };
}
const draft: MineDraft = { surface: "", reading: "", gloss: "", source: "" };

const panel = (over: Record<string, unknown> = {}) => (
  <MyWordsPanel
    {...({
      items: [
        item({ id: "a", due_at: new Date(Date.now() + 3 * DAY).toISOString() }),
        item({ id: "b", due_at: new Date(Date.now() + DAY).toISOString() }),
        item({ id: "c", due_at: null }),
      ],
      review: null,
      error: null,
      notice: null,
      draft,
      onDraftChange: () => undefined,
      onAdd: () => undefined,
      onRemove: () => undefined,
      onGrade: () => undefined,
      onReviewNow: () => undefined,
      onStartNewReview: () => undefined,
      onStartReview: () => undefined,
      onReveal: () => undefined,
      ...over,
    } as MyWordsPanelProps)}
  />
);

describe("remove is reversible: row leaves, chip lives 4s, delete deferred", () => {
  let root: Root | null = null;
  let host: HTMLElement | null = null;
  const mount = (onRemove: (id: string) => void) => {
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
    act(() => {
      root!.render(panel({ onRemove }));
    });
    return host;
  };
  const removeButtons = (h: HTMLElement) =>
    [...h.querySelectorAll("button")].filter((b) => b.textContent?.includes("Remove"));
  const chip = (h: HTMLElement) => h.querySelector(".undo-chip");

  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    act(() => root?.unmount());
    root = null;
    host?.remove();
    host = null;
    vi.useRealTimers();
  });

  it("Remove hides the row, shows the chip, and has NOT called the engine yet", () => {
    const onRemove = vi.fn();
    const h = mount(onRemove);
    act(() => {
      removeButtons(h)[0].click();
    });
    expect(chip(h)).not.toBeNull();
    expect(onRemove).not.toHaveBeenCalled();
    act(() => void vi.advanceTimersByTime(3999));
    expect(onRemove).not.toHaveBeenCalled();
    act(() => void vi.advanceTimersByTime(2));
    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onRemove.mock.calls[0][0]).toBe("a");
    expect(chip(h)).toBeNull();
  });

  it("UNDO inside the window cancels the delete outright", () => {
    const onRemove = vi.fn();
    const h = mount(onRemove);
    act(() => {
      removeButtons(h)[0].click();
    });
    const c = chip(h);
    expect(c).not.toBeNull();
    act(() => {
      (c as HTMLElement).click();
    });
    expect(chip(h)).toBeNull();
    act(() => void vi.advanceTimersByTime(10_000));
    expect(onRemove).not.toHaveBeenCalled();
  });

  it("a second Remove commits the previous pending delete first", () => {
    const onRemove = vi.fn();
    const h = mount(onRemove);
    act(() => {
      removeButtons(h)[0].click();
    });
    act(() => {
      removeButtons(h)[0].click(); // "b" now — "a" is still pending
    });
    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onRemove.mock.calls[0][0]).toBe("a");
  });

  it("unmounting with a pending delete flushes it (nav away keeps the word gone)", () => {
    const onRemove = vi.fn();
    const h = mount(onRemove);
    act(() => {
      removeButtons(h)[0].click();
    });
    act(() => {
      root!.unmount();
    });
    root = null;
    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onRemove.mock.calls[0][0]).toBe("a");
  });
});
