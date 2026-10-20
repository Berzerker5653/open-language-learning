import { describe, expect, it } from "vitest";
import { PerfProbeCore } from "./perf-probe";

// PERF-002: the probe's job is aggregation and marker grammar. These feed
// the pure core fake frames — the DOM glue is exercised by the headless
// walkthrough itself, whose markers are the real acceptance check.
describe("perf probe core", () => {
  it("aggregates worst block, long tasks, and window counts per label", async () => {
    const core = new PerfProbeCore();
    core.openWindow("asr-inference");
    core.frame("asr-inference", 40);
    core.frame("asr-inference", 812);
    core.frame("asr-inference", 16);
    core.longTask("asr-inference");
    core.longTask("asr-inference");
    core.inputToPaint("asr-inference", 120);
    core.inputToPaint("asr-inference", 340);
    core.openWindow("asr-inference");
    core.openWindow("idle-baseline");
    core.frame("idle-baseline", 9);
    const notes: string[] = [];
    await core.flush((n) => {
      notes.push(n);
      return Promise.resolve();
    });
    expect(notes).toContain("perf:rafmax:asr-inference:812");
    expect(notes).toContain("perf:longtasks:asr-inference:2");
    expect(notes).toContain("perf:inp:asr-inference:340");
    expect(notes).toContain("perf:windows:asr-inference:2");
    expect(notes).toContain("perf:rafmax:idle-baseline:9");
    expect(notes).toContain("perf:longtasks:idle-baseline:0");
  });

  it("notes unsupported long tasks instead of claiming zero", async () => {
    const core = new PerfProbeCore();
    core.longTasksSupported = false;
    core.openWindow("x");
    const notes: string[] = [];
    await core.flush((n) => {
      notes.push(n);
      return Promise.resolve();
    });
    expect(notes[0]).toBe("perf:note:longtasks-unsupported");
  });
});
