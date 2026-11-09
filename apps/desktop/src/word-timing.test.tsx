/**
 * WORD-TIMING-001: karaoke mapping and the render contract.
 *
 * The two hard invariants: with timings, a fake playback clock highlights
 * exactly the token whose span contains it; without timings (no sidecar,
 * empty sidecar, or text the sidecar cannot align to) the surface renders
 * exactly as it did before the feature.
 */
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ShadowingPanel, type ShadowTarget } from "./shadowing";
import {
  activeTokenIndex,
  alignSurfaceTokens,
  attachKaraokeClock,
  type WordSpan,
} from "./word-timing";

const words: WordSpan[] = [
  { w: "Привет", s: 0.0, e: 0.5 },
  { w: "мир", s: 0.6, e: 1.0 },
];

describe("alignSurfaceTokens", () => {
  it("maps spans onto surface tokens positionally, preserving the text", () => {
    const surface = "Привет мир";
    const tokens = alignSurfaceTokens(surface, words);
    expect(tokens).not.toBeNull();
    expect(tokens!.map((t) => t.span)).toEqual([words[0], words[1]]);
    // Reconstruction is byte-identical, so the pack text never changes.
    expect(tokens!.map((t) => t.text).join("")).toBe(surface);
  });

  it("leaves abstained gaps unspanned while keeping the aligned ones", () => {
    const tokens = alignSurfaceTokens("Привет большой мир", words);
    expect(tokens!.map((t) => t.span === null)).toEqual([false, true, false]);
  });

  it("returns null when nothing aligns, so callers keep the plain render", () => {
    expect(alignSurfaceTokens("Bonjour le monde", words)).toBeNull();
    expect(alignSurfaceTokens("Привет мир", [])).toBeNull();
  });
});

describe("activeTokenIndex (fake playback clock)", () => {
  const tokens = alignSurfaceTokens("Привет мир", words)!;

  it("highlights the token whose [s, e) contains the clock", () => {
    expect(activeTokenIndex(tokens, 0.0)).toBe(0);
    expect(activeTokenIndex(tokens, 0.25)).toBe(0);
    expect(activeTokenIndex(tokens, 0.8)).toBe(1);
  });

  it("highlights nothing between spans, past the clip, or when idle", () => {
    expect(activeTokenIndex(tokens, 0.5)).toBeNull(); // half-open spans
    expect(activeTokenIndex(tokens, 1.4)).toBeNull();
    expect(activeTokenIndex(tokens, null)).toBeNull();
  });
});

function item(words?: WordSpan[]): ShadowTarget {
  return {
    content_id: "ru.sent.demo.hello",
    surface: "Привет мир",
    reading: null,
    romaji: null,
    words,
  };
}

function render(target: ShadowTarget, playTime?: number | null): string {
  return renderToStaticMarkup(
    <ShadowingPanel
      items={[target]}
      index={0}
      error={null}
      audioMsg={null}
      recording={false}
      attemptUrl={null}
      playTime={playTime}
      onRetry={() => {}}
      onOpenSetup={() => {}}
      onPlayModel={() => {}}
      onRecord={() => {}}
      onStop={() => {}}
      onPlayAttempt={() => {}}
      onStep={() => {}}
      onPlayWord={() => {}}
    />,
  );
}

describe("ShadowingPanel karaoke render", () => {
  it("highlights the covering word for a fake clock, click-to-hear on every timed word", () => {
    const html = render(item(words), 0.8);
    // Both words are pressable; only the covering one is active.
    expect(html).toContain('<button type="button" class="word"');
    expect(html).toContain('<button type="button" class="word word--active"');
    expect(html.indexOf("word--active")).toBeGreaterThan(html.indexOf("Привет"));
  });

  it("drops the highlight when the clock is idle or outside every span", () => {
    for (const playTime of [null, 1.4]) {
      const html = render(item(words), playTime);
      expect(html).not.toContain("word--active");
      expect(html).toContain('class="word"');
    }
  });

  it("renders exactly the pre-feature surface when the clip has no timings", () => {
    const plain = render(item(undefined));
    expect(plain).toContain("Привет мир");
    expect(plain).not.toContain('class="word');
    // An empty sidecar row degrades to the same plain render.
    expect(render(item([]))).toBe(plain);
    // A sidecar from different text cannot half-highlight this surface.
    expect(render(item([{ w: "до-ёброе", s: 0, e: 1 }]))).toBe(plain);
  });
});

/// KARAOKE-CLOCK-001: the regression this device test found — WebKitGTK
/// delivered zero `timeupdate` events on a short blob clip, so the karaoke
/// chip stayed dark although audio played. The pump must drive the clock
/// from currentTime at frame rate, without any timeupdate event at all.
class FakeMedia {
  currentTime = 0;
  paused = true;
  ended = false;
  private handlers = new Map<string, Array<() => void>>();
  addEventListener(ev: string, fn: () => void) {
    const list = this.handlers.get(ev) ?? [];
    list.push(fn);
    this.handlers.set(ev, list);
  }
  emit(ev: string) {
    for (const fn of this.handlers.get(ev) ?? []) fn();
  }
  pause() {
    this.paused = true;
    this.emit("pause");
  }
}

function frameSource() {
  let queue: Array<() => void> = [];
  let id = 0;
  return {
    requestFrame: (cb: () => void) => {
      queue.push(cb);
      return ++id;
    },
    cancelFrame: (frame: number) => {
      void frame;
    },
    /// run every frame currently queued (each may enqueue the next)
    step() {
      const batch = queue;
      queue = [];
      for (const cb of batch) cb();
    },
    pending: () => queue.length,
  };
}

describe("attachKaraokeClock", () => {
  it("drives the clock with NO timeupdate events at all (the WebKitGTK starvation bug)", () => {
    const media = new FakeMedia();
    const frames = frameSource();
    const seen: Array<number | null> = [];
    attachKaraokeClock(media as unknown as HTMLAudioElement, {
      onTime: (t) => seen.push(t),
      requestFrame: frames.requestFrame,
      cancelFrame: frames.cancelFrame,
    });
    media.paused = false;
    media.emit("play");
    expect(frames.pending()).toBe(1);
    media.currentTime = 0.4;
    frames.step();
    media.currentTime = 0.9;
    frames.step();
    expect(seen).toEqual([0.4, 0.9]);
    media.ended = true;
    media.emit("ended");
    media.currentTime = 1.2;
    frames.step();
    expect(seen).toEqual([0.4, 0.9]); // pump stopped: no tick after ended
  });

  it("pauses at stopAt and closes the clock with null (click-to-hear-word window)", () => {
    const media = new FakeMedia();
    const frames = frameSource();
    const seen: Array<number | null> = [];
    attachKaraokeClock(media as unknown as HTMLAudioElement, {
      onTime: (t) => seen.push(t),
      startAt: 0.6,
      stopAt: 1.0,
      requestFrame: frames.requestFrame,
      cancelFrame: frames.cancelFrame,
    });
    media.emit("loadedmetadata");
    expect(media.currentTime).toBe(0.6); // seeked once metadata is known
    media.paused = false;
    media.emit("play");
    media.currentTime = 0.8;
    frames.step();
    media.currentTime = 1.05;
    frames.step();
    expect(media.paused).toBe(true);
    expect(seen).toEqual([0.8, null]);
  });

  it("still honours timeupdate when the webview does deliver it", () => {
    const media = new FakeMedia();
    const frames = frameSource();
    const seen: Array<number | null> = [];
    attachKaraokeClock(media as unknown as HTMLAudioElement, {
      onTime: (t) => seen.push(t),
      requestFrame: frames.requestFrame,
      cancelFrame: frames.cancelFrame,
    });
    media.paused = false;
    media.currentTime = 0.5;
    media.emit("timeupdate");
    expect(seen).toEqual([0.5]);
  });
});
