// SERVE-BANNER-001 contract: the serve-mode capability report never stacks
// meta on the learner's first screen. The full lines live in Settings >
// About (see settings.test.tsx); Today may carry AT MOST a one-line
// unobtrusive badge, and only when the server's own report degrades a
// capability for this origin (the secure-context microphone rule). The badge
// text derives from the report, never a local invention.
import { describe, expect, it } from "vitest";
import { serveDegradedBadge } from "./App";

describe("serve degraded badge (SERVE-BANNER-001)", () => {
  it("names the microphone degradation in ONE line when the report blocks it", () => {
    const line = serveDegradedBadge({
      mode: "browser-serve",
      install_progress_events: true,
      microphone_capture:
        "needs a secure context (https or localhost); over a plain tailnet http URL the browser blocks mic capture, so scoring features are labeled unavailable",
      microphone_names_available: false,
      privacy_modes: "unchanged — serve mode never rewrites stored mic/privacy settings",
    });
    expect(typeof line).toBe("string");
    expect(line).not.toBeNull();
    const one = line as string;
    expect(one.includes("\n")).toBe(false);
    expect(one.toLowerCase()).toContain("microphone");
  });
  it("stays silent on a healthy localhost serve report — the notes live in Settings", () => {
    expect(
      serveDegradedBadge({
        mode: "browser-serve",
        install_progress_events: true,
        microphone_names_available: true,
      }),
    ).toBeNull();
  });
  it("stays silent when the bridge is unreachable — that note also lives in Settings", () => {
    expect(serveDegradedBadge(null)).toBeNull();
  });
  it("stays silent when an older bridge says nothing about microphone names", () => {
    expect(
      serveDegradedBadge({ mode: "browser-serve", install_progress_events: false }),
    ).toBeNull();
  });
});
