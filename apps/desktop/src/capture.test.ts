import { describe, expect, it } from "vitest";
import { listMicrophones, openMicrophone } from "./capture";

const stream = { getTracks: () => [] } as unknown as MediaStream;

function fakeMediaDevices(
  opts: { exactFailsWith?: unknown; defaultFailsWith?: unknown; devices?: { kind: string; deviceId: string; label: string }[] },
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
    const result = await openMicrophone(fakeMediaDevices({ exactFailsWith: gone }, calls), "mic-headset");
    expect(calls).toEqual([{ deviceId: { exact: "mic-headset" } }, true]);
    expect(result.used).toBe("default");
    expect(result.fellBack).toBe(true);
  });

  it("does not switch microphones over a failure the switch cannot fix", async () => {
    const calls: unknown[] = [];
    const busy = { name: "NotReadableError" };
    await expect(openMicrophone(fakeMediaDevices({ exactFailsWith: busy }, calls), "mic-headset")).rejects.toMatchObject({
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
