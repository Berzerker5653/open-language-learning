/**
 * WEB-HISTORY-001: unit tier for the history shim's pure mapping rules.
 * The end-to-end walk (back lands one level at a time, guardrail asks,
 * desktop stays untouched) is proven by src/journeys/history-nav.journey.tsx;
 * these tests pin the location vocabulary itself.
 */
import { describe, expect, it } from "vitest";
import { decodeLocation, encodeLocation, sameLocation } from "./history-nav";

const root = { tab: "", session: false, stage: false };

describe("location vocabulary round-trips", () => {
  it("root encodes to the empty token and back", () => {
    expect(encodeLocation(root)).toBe("");
    expect(decodeLocation("")).toEqual(root);
  });

  it("a live session with the runner open encodes two levels and back", () => {
    const loc = { tab: "", session: true, stage: true };
    expect(encodeLocation(loc)).toBe("session/stage");
    expect(decodeLocation("session/stage")).toEqual(loc);
  });

  it("a paused session drops the stage level", () => {
    const loc = { tab: "", session: true, stage: false };
    expect(encodeLocation(loc)).toBe("session");
    expect(decodeLocation("session")).toEqual(loc);
  });

  it("secondary tabs carry only the tab; a solo activity carries the stage", () => {
    expect(encodeLocation({ tab: "progress", session: false, stage: false })).toBe("progress");
    expect(decodeLocation("progress").tab).toBe("progress");
    const solo = { tab: "", session: false, stage: true };
    expect(encodeLocation(solo)).toBe("stage");
    expect(decodeLocation("stage")).toEqual(solo);
  });

  it("a junk token's last free segment names the tab (App falls back to the root tab)", () => {
    expect(decodeLocation("nonsense/path/deeper")).toEqual({
      tab: "deeper",
      session: false,
      stage: false,
    });
  });

  it("sameLocation is equality of the encoded token", () => {
    expect(sameLocation(root, { tab: "", session: false, stage: false })).toBe(true);
    expect(sameLocation(root, { tab: "", session: true, stage: false })).toBe(false);
  });
});
