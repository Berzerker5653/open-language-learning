// K-62: the progress line is the fix for "I clicked Install and nothing told
// me anything was happening". The invariant that matters is honesty: the line
// may name a phase, and it may show a percentage ONLY when the engine sent one.
import { describe, expect, it } from "vitest";
import { progressLine, type EngineProgress } from "./progress";

function stage(over: Partial<EngineProgress>): EngineProgress {
  return {
    operation: "install-pack",
    subject: "org.openlanguage.ja-JP",
    stage: "install",
    percent: null,
    ...over,
  };
}

describe("progress line", () => {
  it("shows no percentage the engine did not send", () => {
    // An absent fraction is the common case. Rendering "0%" would claim the
    // operation had not started, and a bar would creep on a timer instead of
    // on facts.
    expect(progressLine(stage({ percent: null }))).not.toMatch(/\d+\s*%/);
  });

  it("shows the percentage when the engine computed one", () => {
    expect(progressLine(stage({ stage: "fetch", operation: "install-model", percent: 40 })))
      .toContain("40%");
  });

  it("names the phase for each stage of a pack install", () => {
    const lines = ["prepare", "fetch", "verify", "install", "record"].map((s) =>
      progressLine(stage({ stage: s })),
    );
    // Identical copy would mean the learner is told "working" for a minute with
    // no idea whether it is downloading or unpacking.
    expect(new Set(lines).size).toBe(lines.length);
    for (const line of lines) {
      expect(line).not.toBe("");
      expect(line).not.toMatch(/^\s*$/);
    }
  });

  it("still says something when the engine invents a stage the build does not know", () => {
    // An older/newer engine must never produce a blank status line.
    const line = progressLine(stage({ stage: "polishing", percent: null }));
    expect(line.trim().length).toBeGreaterThan(0);
    expect(line).not.toMatch(/\d+\s*%/);
  });
});
