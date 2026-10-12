// D7: every pack-scoped native call must carry the pack the profile
// actually has active — never a hardcoded fallback id. App.tsx builds those
// payloads through loadSessionPack + packRequest/packAttemptRequest, so a
// fake `inv` sees exactly the payload the Tauri command would receive.
// Mounting <App/> is not a seam this repo can drive: vitest here runs in
// node (no DOM dependency is pinned), and detectInvoke() returns null
// without `window.__TAURI_INTERNALS__`, so a mounted App would issue no
// invokes at all. These tests cover the pack-resolution and request-
// building code that the drill panels call.
import { describe, expect, it } from "vitest";
import {
  NO_ACTIVE_PACK,
  activePackNote,
  explainPackAbsence,
  loadSessionPack,
  packAttemptRequest,
  packRequest,
  type Invoke,
} from "./App";

const REFERENCE = "org.openlanguage.ja-jp.reference";
const ACTIVE = "org.openlanguage.eo-demo";

type Call = { cmd: string; args?: Record<string, unknown> };

/** Stand-in for the Tauri IPC layer (the idiom the other suites use for
 * `inv`): records every command the app tries to run and answers
 * `active_pack` with whatever the profile reports. */
function fakeInv(active: string[], responses: Record<string, unknown> = {}) {
  const calls: Call[] = [];
  const inv: Invoke = async (cmd, args) => {
    calls.push({ cmd, args });
    if (cmd === "active_pack") return active;
    return responses[cmd] ?? null;
  };
  return { inv, calls };
}

function argsFor(calls: Call[], cmd: string): Record<string, unknown> | undefined {
  return calls.find((c) => c.cmd === cmd)?.args;
}

describe("session pack (D7)", () => {
  it("resolves the profile's own active pack, not the reference pack", async () => {
    const { inv } = fakeInv([ACTIVE]);
    const session = await loadSessionPack(inv, "profile-1");
    expect(session.packId).toBe(ACTIVE);
    expect(session.note).toBeNull();
  });

  it("builds every activity request against that pack id", async () => {
    const { inv, calls } = fakeInv([ACTIVE]);
    const { packId } = await loadSessionPack(inv, "profile-1");
    const target = await packRequest(inv, packId, "dictation_target", { offset: 2 });
    const model = await packRequest(inv, packId, "speech_audio", { contentId: "eo.1" });
    const demo = await packRequest(inv, packId, "pronunciation_demo", {});
    for (const req of [target, model, demo]) {
      if (!req.ok) throw new Error(`request was refused: ${req.error}`);
      expect(req.packId).toBe(ACTIVE);
    }
    expect(argsFor(calls, "dictation_target")).toEqual({ packId: ACTIVE, offset: 2 });
    expect(argsFor(calls, "speech_audio")).toEqual({ packId: ACTIVE, contentId: "eo.1" });
    expect(argsFor(calls, "pronunciation_demo")).toEqual({ packId: ACTIVE });
    for (const c of calls) {
      expect(JSON.stringify(c.args ?? {})).not.toContain(REFERENCE);
    }
  });

  it("carries the pack id inside the speech attempt payload", async () => {
    const { inv, calls } = fakeInv([ACTIVE]);
    const { packId } = await loadSessionPack(inv, "profile-1");
    const req = await packAttemptRequest(inv, packId, "dictation_check", {
      target_text: "saluton",
      wav_b64: "AAAA",
    });
    if (!req.ok) throw new Error(`request was refused: ${req.error}`);
    expect(argsFor(calls, "dictation_check")).toEqual({
      attempt: { pack_id: ACTIVE, target_text: "saluton", wav_b64: "AAAA" },
    });
  });

  it("refuses when the profile has no active pack: no request, honest copy", async () => {
    const { inv, calls } = fakeInv([]);
    const session = await loadSessionPack(inv, "profile-1");
    expect(session.packId).toBeNull();
    expect(session.note).toBeNull();
    const req = await packRequest(inv, session.packId, "dictation_target", { offset: 0 });
    if (req.ok) throw new Error("expected a refusal, got a request");
    // The pack-scoped command was never sent: nothing was aimed at a
    // guessed pack.
    expect(calls.map((c) => c.cmd)).toEqual(["active_pack"]);
    expect(req.error).toContain("No pack is active for this profile");
    expect(req.error).toContain("Language packs");
    expect(req.error).toBe(NO_ACTIVE_PACK);
    expect(NO_ACTIVE_PACK).not.toContain(REFERENCE);
  });

  // The same state reaches routes that build their payloads without the D7
  // guards. The engine's token must arrive as the sentence that names the fix,
  // and every other payload must survive untouched — the engine's own error
  // text is already learner-readable, so rewriting it would be inventing copy.
  it("translates the pack-absence token at the IPC boundary, and nothing else", () => {
    expect(explainPackAbsence("no active language pack")).toBe(NO_ACTIVE_PACK);
    expect(explainPackAbsence(new Error("no active language pack"))).toBe(NO_ACTIVE_PACK);
    expect(explainPackAbsence("media-asset-missing: no recording ships here")).toBe(
      "media-asset-missing: no recording ships here",
    );
    expect(explainPackAbsence("pack not installed")).toBe("pack not installed");
  });

  it("uses the first id and surfaces a multi-pack profile instead of guessing", async () => {
    const { inv } = fakeInv([ACTIVE, REFERENCE]);
    const session = await loadSessionPack(inv, "profile-1");
    expect(session.packId).toBe(ACTIVE);
    expect(session.note).toContain("more than one active pack");
    expect(session.note).toContain(ACTIVE);
    expect(session.note).toContain(REFERENCE);
    // Repeats of one id, and an empty list, are not conflicts.
    expect(activePackNote([ACTIVE, ACTIVE])).toBeNull();
    expect(activePackNote([])).toBeNull();
  });
});
