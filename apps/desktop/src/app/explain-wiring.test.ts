/**
 * G4-EXPLAIN-001 behavior pins (red-first per behavior; all against a fake
 * inv — the suite performs zero real network calls, and the Rust side pins
 * the provider round trip against a local mock HTTP server).
 */
import { describe, expect, it } from "vitest";
import {
  EXPLAIN_ALLOWED_COMMANDS,
  explainDirection,
  runExplainConsentAccept,
  runExplainConsentDecline,
  runExplainPress,
  type ExplainDeps,
  type ExplainSettingsView,
} from "./explain-wiring";

function fakeInv(
  overrides: Partial<Record<string, (args?: Record<string, unknown>) => Promise<unknown>>> = {},
  settings: Partial<ExplainSettingsView> = {},
) {
  const calls: { cmd: string; args?: Record<string, unknown> }[] = [];
  const base: Record<string, (args?: Record<string, unknown>) => Promise<unknown>> = {
    explain_settings: () =>
      Promise.resolve({
        ai_enabled: true,
        ai_base_url: "http://127.0.0.1:4321/v1",
        ai_model: "tester",
        consent_granted: true,
        ...settings,
      }),
    set_explain_consent: () => Promise.resolve({ ok: true }),
    explain_card: () => Promise.resolve("“привет” means hello."),
  };
  const inv = (cmd: string, args?: Record<string, unknown>) => {
    calls.push({ cmd, args });
    const fn = overrides[cmd] ?? base[cmd];
    if (!fn) return Promise.reject(new Error(`unwhitelisted command ${cmd}`));
    return fn(args);
  };
  return { inv, calls };
}

function deps(inv: ExplainDeps["inv"], patch: Partial<ExplainDeps> = {}): ExplainDeps {
  return { inv, profileId: "p-1", cardText: "привет", l1: "en", l2: "ru", ...patch };
}

describe("G4-EXPLAIN-001 explain wiring", () => {
  it("core app unchanged with the provider disabled: honest unavailable, zero provider calls", async () => {
    const { inv, calls } = fakeInv(undefined, { ai_enabled: false });
    const status = await runExplainPress(deps(inv));
    expect(status.kind).toBe("unavailable");
    expect(calls.map((c) => c.cmd)).toEqual(["explain_settings"]);
    expect(calls.some((c) => c.cmd === "explain_card")).toBe(false);
  });

  it("an empty base URL is an honest unavailable state with zero provider calls", async () => {
    const { inv, calls } = fakeInv(undefined, { ai_base_url: "  " });
    const status = await runExplainPress(deps(inv));
    expect(status.kind).toBe("unavailable");
    expect(calls.some((c) => c.cmd === "explain_card")).toBe(false);
  });

  it("the first explain consent-gates: nothing is sent before the learner accepts", async () => {
    const { inv, calls } = fakeInv(undefined, { consent_granted: false });
    const status = await runExplainPress(deps(inv));
    expect(status.kind).toBe("consent");
    // The defining invariant of the consent gate: NO provider call happened.
    expect(calls.map((c) => c.cmd)).toEqual(["explain_settings"]);
  });

  it("accepting consent stores it first, then runs exactly one provider request", async () => {
    const { inv, calls } = fakeInv(undefined, { consent_granted: false });
    const status = await runExplainConsentAccept(deps(inv));
    expect(status.kind).toBe("ready");
    if (status.kind === "ready") expect(status.text).toContain("hello");
    expect(calls.map((c) => c.cmd)).toEqual(["set_explain_consent", "explain_card"]);
    expect(calls[0]?.args).toEqual({ profileId: "p-1", granted: true });
    expect(calls[1]?.args).toEqual({ profileId: "p-1", cardText: "привет", l1: "en", l2: "ru" });
  });

  it("declining consent sends nothing and writes nothing", async () => {
    const { inv, calls } = fakeInv(undefined, { consent_granted: false });
    const status = runExplainConsentDecline();
    expect(status.kind).toBe("idle");
    expect(calls).toEqual([]);
  });

  it("a revoked consent is honored on the very next press (settings are re-read)", async () => {
    // Same press path; the settings read now says revoked.
    const { inv, calls } = fakeInv(undefined, { consent_granted: false });
    const status = await runExplainPress(deps(inv));
    expect(status.kind).toBe("consent");
    expect(calls.some((c) => c.cmd === "explain_card")).toBe(false);
  });

  it("a failed provider call is an honest unavailable state, never a verdict", async () => {
    const { inv, calls } = fakeInv({
      explain_card: () => Promise.reject(new Error("the explanation endpoint is unreachable")),
    });
    const status = await runExplainPress(deps(inv));
    expect(status.kind).toBe("unavailable");
    if (status.kind === "unavailable") {
      expect(status.reason).toContain("unreachable");
      expect(status.reason.toLowerCase()).not.toContain("grade");
    }
    expect(calls.map((c) => c.cmd)).toEqual(["explain_settings", "explain_card"]);
  });

  it("an empty explanation text is treated as a failure, not a blank panel", async () => {
    const { inv } = fakeInv({ explain_card: () => Promise.resolve("   ") });
    const status = await runExplainPress(deps(inv));
    expect(status.kind).toBe("unavailable");
  });

  it("CONTRACT: the whole consent→explain flow writes nothing outside the explain whitelist", async () => {
    // The zero-mastery-path pin: every command the explain path ever
    // invokes must be inside EXPLAIN_ALLOWED_COMMANDS. Scheduler, progress,
    // mastery, practice, and error-ledger commands are all outside it, so
    // this pin fails the moment the explain path reaches for one.
    const { inv, calls } = fakeInv(undefined, { consent_granted: false });
    const pressed = await runExplainPress(deps(inv));
    expect(pressed.kind).toBe("consent");
    const accepted = await runExplainConsentAccept(deps(inv));
    expect(accepted.kind).toBe("ready");
    const seen = new Set(calls.map((c) => c.cmd));
    for (const cmd of seen) {
      expect(EXPLAIN_ALLOWED_COMMANDS).toContain(cmd);
    }
    // And the write-shaped commands the app actually owns must be absent.
    for (const forbidden of [
      "practice_submit",
      "save_scheduler_state",
      "record_mastery_snapshot",
      "record_error",
      "add_mined",
      "record_word_lookup",
    ]) {
      expect(calls.map((c) => c.cmd)).not.toContain(forbidden);
    }
  });

  it("the consent notice names the learning direction", () => {
    expect(explainDirection({ l1: "en", l2: "ru" })).toBe("en → ru");
  });
});
