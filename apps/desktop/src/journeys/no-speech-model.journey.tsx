/**
 * Journey (c) — a speaking activity with no speech model abstains honestly.
 *
 * The learner does everything a speaking attempt asks for: they pick the
 * speaking mode, the app opens the microphone for real (the capture code is
 * the shipped one; only the browser's devices are stood in for), the recording
 * is turned into a WAV and handed to the recogniser. The recogniser has no
 * model to run, so what comes back is an abstention — and the screen has to
 * say which capability is missing and where to get it, show no "that matches"
 * or "I heard", and print no number that could be read as a score.
 */
import { afterEach, describe, expect, it } from "vitest";
import { JA, LearnerEngine, grantMicrophone, mountApp, type Mounted } from "./harness";

describe("no speech model (journey c)", () => {
  let app: Mounted;

  afterEach(async () => {
    await app?.unmount();
  });

  it("reports what is missing instead of inventing a speaking verdict", async () => {
    grantMicrophone();
    const engine = new LearnerEngine({
      // This profile has a microphone and a pack; what it has no is a model.
      profiles: [{ id: "lee", display_name: "Lee", active: JA, micEnabled: true }],
      installed: [JA],
    });
    app = await mountApp(engine);
    await app.click(app.button(app.section("Profiles"), "Lee"));

    await app.click(app.button(app.section("Routes"), "Practice"));
    await app.click(app.button(app.section("Practice modes"), "Speaking"));

    // The pack's own sentence arrives, scoped to the pack this profile chose.
    const speaking = app.section("Dictation practice");
    expect(speaking.querySelector("h2")?.textContent).toBe("Speaking: say the sentence");
    expect(speaking.querySelector('[data-testid="dict-sentence"]')?.textContent).toContain(
      "おばあさん",
    );
    expect(app.engine.argsFor("dictation_target")).toEqual({ packId: JA, offset: 0 });

    // A real recording: the shipped capture path opens the device and frames
    // reach the buffer, so the attempt below is audio, not a fixture string.
    await app.click(app.button(speaking, "Record attempt"));
    const recording = app.section("Recording");
    expect(recording.textContent).toContain("Stop and check");
    await app.settle();

    await app.click(app.button(recording, "Stop and check"));

    const check = app.engine.argsFor("dictation_check");
    const attempt = (check?.attempt ?? {}) as Record<string, unknown>;
    expect(attempt.pack_id).toBe(JA);
    expect(attempt.target_text).toBe("おばあさん");
    // The payload is a WAV the app built from the frames the microphone
    // handed it: one 4096-sample frame at the context's 48 kHz, 16-bit mono.
    // Nothing here is a fixture string standing in for a recording. The bytes
    // are decoded with the web APIs the app itself has, never node's `Buffer`,
    // so this suite stays honest about running inside a webview.
    const raw = atob(String(attempt.wav_b64));
    const wav = Uint8Array.from(raw, (c) => c.charCodeAt(0));
    const view = new DataView(wav.buffer);
    const tag = (at: number) => String.fromCharCode(...Array.from(wav.subarray(at, at + 4)));
    expect(tag(0)).toBe("RIFF");
    expect(tag(8)).toBe("WAVE");
    expect(view.getUint32(24, true)).toBe(48000);
    expect(wav.length).toBe(44 + 4096 * 2);

    // What the learner is told: the capability that is missing, and where the
    // control for it lives.
    const abstain = document.querySelector('[data-testid="dict-abstain"]');
    if (!abstain) throw new Error("the speaking result card showed no abstention");
    expect(abstain.textContent).toContain("No speech model is selected.");
    expect(abstain.textContent).toContain("Settings → Speech");
    expect(abstain.textContent).toContain("this check abstains");

    // Nothing that could be mistaken for a judgement of the learner.
    expect(document.querySelector('[data-testid="dict-match"]')).toBeNull();
    expect(document.querySelector('[data-testid="dict-mismatch"]')).toBeNull();
    const card = abstain.closest(".card");
    expect(card?.textContent).not.toMatch(/\d+\s*%|\bscore\b|\bpoints\b|\d+\s*\/\s*\d+/i);
    expect(document.querySelector('[data-testid="dict-mode"]')?.textContent).toContain(
      "not a pronunciation grade",
    );

    // Turning the microphone off is honest in the same way: the app says it
    // will not ask for access, and no further check is attempted.
    await app.click(app.button(app.section("Routes"), "Settings"));
    const mic = document.querySelector<HTMLInputElement>("#mic-enabled");
    if (!mic) throw new Error('Settings rendered no "#mic-enabled" switch');
    await app.click(mic);
    expect(app.engine.lastArgsFor("set_microphone_enabled")).toEqual({
      profileId: "lee",
      enabled: false,
    });

    await app.click(app.button(app.section("Routes"), "Practice"));
    await app.click(app.button(app.section("Practice modes"), "Speaking"));
    await app.click(app.button(app.section("Dictation practice"), "Record attempt"));
    // The gate answers in a status line above the panel, not inside it.
    expect(app.text('[role="status"]')).toContain("The microphone is turned off");
    expect(engine.appCalls().filter((c) => c.cmd === "dictation_check")).toHaveLength(1);
  });
});
