// R14 policy tests: which clip URLs get revoked, and what the learner is
// told when playback fails.
import { describe, expect, it } from "vitest";
import { PLAYBACK_FAILED, playClip, type ClipLike } from "./playback";

class FakeClip implements ClipLike {
  readonly listeners: Record<string, (() => void)[]> = {};
  private settle!: () => void;
  private reject!: (reason: unknown) => void;
  constructor(private readonly playFails = false) {}
  play(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.settle = resolve;
      this.reject = reject;
      if (this.playFails) this.reject(new Error("NotAllowedError"));
    });
  }
  addEventListener(type: string, listener: () => void): void {
    (this.listeners[type] ??= []).push(listener);
  }
  fire(type: string): void {
    for (const listener of this.listeners[type] ?? []) listener();
  }
  finish(): void {
    this.settle();
  }
}

function harness(playFails = false) {
  const clip = new FakeClip(playFails);
  const revoked: string[] = [];
  const errors: string[] = [];
  let cleared = 0;
  playClip({
    url: "blob:attempt",
    retained: false,
    audio: clip,
    revoke: (url) => revoked.push(url),
    onError: (message) => errors.push(message),
    onClearError: () => {
      cleared += 1;
    },
  });
  return { clip, revoked, errors, cleared: () => cleared };
}

describe("playClip", () => {
  it("revokes a one-shot clip once it has finished", () => {
    const h = harness();
    h.clip.finish();
    h.clip.fire("ended");
    expect(h.revoked).toEqual(["blob:attempt"]);
    expect(h.errors).toEqual([]);
  });

  it("keeps a retained recording alive after a replay", async () => {
    const clip = new FakeClip();
    const revoked: string[] = [];
    playClip({
      url: "blob:attempt",
      retained: true,
      audio: clip,
      revoke: (url) => revoked.push(url),
      onError: () => undefined,
    });
    clip.finish();
    clip.fire("ended");
    await Promise.resolve();
    expect(revoked).toEqual([]);
  });

  it("says so when the clip cannot be played, and lets go of a one-shot URL", async () => {
    const h = harness(true);
    await Promise.resolve();
    expect(h.errors).toEqual([PLAYBACK_FAILED]);
    expect(h.revoked).toEqual(["blob:attempt"]);
  });

  it("reports a decode error and revokes the dead one-shot URL", () => {
    const h = harness();
    h.clip.finish();
    h.clip.fire("error");
    expect(h.errors).toEqual([PLAYBACK_FAILED]);
    expect(h.revoked).toEqual(["blob:attempt"]);
  });

  it("clears the previous complaint before starting a new clip", () => {
    expect(harness().cleared()).toBe(1);
  });
});
