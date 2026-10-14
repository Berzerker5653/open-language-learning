import { describe, expect, it } from "vitest";
import {
  captureLimitReached,
  CaptureOwner,
  MAX_CAPTURE_SECONDS,
  listMicrophones,
  openMicrophone,
} from "./capture";

const stream = { getTracks: () => [] } as unknown as MediaStream;

function fakeMediaDevices(
  opts: {
    exactFailsWith?: unknown;
    defaultFailsWith?: unknown;
    devices?: { kind: string; deviceId: string; label: string }[];
  },
  calls: unknown[],
) {
  return {
    async getUserMedia(c: { audio: unknown }) {
      calls.push(c.audio);
      const askingForStored = JSON.stringify(c.audio) !== "true";
      const failure = askingForStored ? opts.exactFailsWith : opts.defaultFailsWith;
      if (failure) throw failure;
      return stream;
    },
    async enumerateDevices() {
      return opts.devices ?? [];
    },
  };
}

describe("microphone selection (K-64)", () => {
  it("records from the remembered device when one is stored", async () => {
    const calls: unknown[] = [];
    const result = await openMicrophone(fakeMediaDevices({}, calls), "mic-headset");
    expect(calls).toEqual([{ deviceId: { exact: "mic-headset" } }]);
    expect(result.used).toBe("stored");
    expect(result.fellBack).toBe(false);
  });

  it("uses the system default when nothing is stored", async () => {
    const calls: unknown[] = [];
    const result = await openMicrophone(fakeMediaDevices({}, calls), null);
    expect(calls).toEqual([true]);
    expect(result.used).toBe("default");
    expect(result.fellBack).toBe(false);
  });

  it("falls back to the default and reports it when the remembered device is gone", async () => {
    const calls: unknown[] = [];
    const gone = { name: "OverconstrainedError" };
    const result = await openMicrophone(
      fakeMediaDevices({ exactFailsWith: gone }, calls),
      "mic-headset",
    );
    expect(calls).toEqual([{ deviceId: { exact: "mic-headset" } }, true]);
    expect(result.used).toBe("default");
    expect(result.fellBack).toBe(true);
  });

  it("does not switch microphones over a failure the switch cannot fix", async () => {
    const calls: unknown[] = [];
    const busy = { name: "NotReadableError" };
    await expect(
      openMicrophone(fakeMediaDevices({ exactFailsWith: busy }, calls), "mic-headset"),
    ).rejects.toMatchObject({
      name: "NotReadableError",
    });
    expect(calls).toEqual([{ deviceId: { exact: "mic-headset" } }]);
  });

  it("offers only devices the browser has actually named", async () => {
    const devices = [
      { kind: "audioinput", deviceId: "a", label: "Headset Microphone" },
      { kind: "audioinput", deviceId: "b", label: "" },
      { kind: "videoinput", deviceId: "c", label: "Webcam" },
    ];
    const listed = await listMicrophones(fakeMediaDevices({ devices }, []));
    expect(listed).toEqual([{ deviceId: "a", label: "Headset Microphone" }]);
  });
});
/**
 * L01: `close` is the fake stand-in for stopping the microphone track and
 * tearing down the audio graph, so the assertions are about whether the app
 * gives the device back — not about WebAudio internals the runtime lacks.
 */
class FakeCapture {
  closes = 0;
  close(): void {
    this.closes++;
  }
}

function gate<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe("recording ownership (L01)", () => {
  it("gives the device back when the flow is abandoned", async () => {
    const owner = new CaptureOwner<FakeCapture>();
    const cap = await owner.begin(async () => new FakeCapture());
    expect(owner.active()).toBe(true);

    owner.cancel();
    expect(cap!.closes).toBe(1);
    expect(owner.active()).toBe(false);

    // Leaving a second time (navigation then unmount, say) must not double-stop.
    owner.cancel();
    expect(cap!.closes).toBe(1);
  });

  it("closes a microphone grant that arrives after the learner left", async () => {
    const owner = new CaptureOwner<FakeCapture>();
    const granted = gate<FakeCapture>();
    const cap = new FakeCapture();
    const begun = owner.begin(() => granted.promise);

    // The learner navigated away (or switched profile, or turned the
    // microphone off) while the browser was still deciding.
    owner.cancel();
    granted.resolve(cap);

    expect(await begun).toBeNull();
    expect(cap.closes).toBe(1);
    expect(owner.active()).toBe(false);
  });

  it("keeps the newest attempt when the learner starts recording twice", async () => {
    const owner = new CaptureOwner<FakeCapture>();
    const first = gate<FakeCapture>();
    const firstCap = new FakeCapture();
    const firstBegun = owner.begin(() => first.promise);
    const secondCap = await owner.begin(async () => new FakeCapture());

    first.resolve(firstCap);
    expect(await firstBegun).toBeNull();
    expect(firstCap.closes).toBe(1);
    expect(secondCap).not.toBeNull();
    expect(secondCap!.closes).toBe(0);
    // The late grant must not have replaced the recording in front of the
    // learner — that one is still the live session.
    expect(owner.finish()).toBe(secondCap);
  });

  it("keeps the frames when the learner stops on purpose", async () => {
    const owner = new CaptureOwner<FakeCapture>();
    const cap = await owner.begin(async () => new FakeCapture());
    const finished = owner.finish();
    expect(finished).toBe(cap);
    expect(finished!.closes).toBe(0); // the caller stops it after reading frames
    expect(owner.active()).toBe(false);

    // A grant still in flight behind a deliberate stop is not adopted.
    const granted = gate<FakeCapture>();
    const late = new FakeCapture();
    const begun = owner.begin(() => granted.promise);
    owner.finish();
    granted.resolve(late);
    expect(await begun).toBeNull();
    expect(late.closes).toBe(1);
  });

  it("bounds one recording at the declared limit", () => {
    // 4096-sample callbacks at 48 kHz: 703 of them are still under a minute.
    expect(captureLimitReached(703, 4096, 48_000)).toBe(false);
    expect(captureLimitReached(704, 4096, 48_000)).toBe(true);
    // The boundary is the declared limit, whatever the device's rate is.
    const at44100 = (MAX_CAPTURE_SECONDS * 44_100) / 4096;
    expect(captureLimitReached(Math.ceil(at44100), 4096, 44_100)).toBe(true);
    expect(captureLimitReached(Math.floor(at44100), 4096, 44_100)).toBe(false);
  });
});
