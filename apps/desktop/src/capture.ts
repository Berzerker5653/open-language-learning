/**
 * K-64: which microphone the app records from.
 *
 * The chosen device is remembered per profile (an engine setting, not UI
 * state), so a learner with both a headset and a webcam mic is not asked to
 * re-pick it every session. The remembered id is requested with `exact`:
 * that fails loudly (`OverconstrainedError`) when the device has been
 * unplugged, and only then does the app fall back to the system default and
 * report the fallback — recording from a different microphone must never be
 * silent. Any other failure (device busy, permission refused) propagates as
 * the caller saw it: switching microphones would not fix it and would hide
 * the cause.
 *
 * Device labels only exist after the browser has granted access once, so an
 * empty list is normal on a fresh profile; the caller says so rather than
 * showing an empty picker.
 */

export interface Microphone {
  deviceId: string;
  label: string;
}

interface MediaDevicesLike {
  getUserMedia(constraints: { audio: MediaTrackConstraints | boolean }): Promise<MediaStream>;
  enumerateDevices?(): Promise<{ kind: string; deviceId: string; label: string }[]>;
}

export type CaptureResult = {
  stream: MediaStream;
  /** Which device the stream actually came from. */
  used: "stored" | "default";
  /** True when the remembered device was missing and the default answered. */
  fellBack: boolean;
};

/** Opens the microphone, honouring the stored device when there is one. */
export async function openMicrophone(
  mediaDevices: MediaDevicesLike,
  deviceId: string | null,
): Promise<CaptureResult> {
  if (deviceId) {
    try {
      const stream = await mediaDevices.getUserMedia({ audio: { deviceId: { exact: deviceId } } });
      return { stream, used: "stored", fellBack: false };
    } catch (e) {
      // Only "that device is not available" justifies a second attempt; a
      // busy or refused device must surface unchanged.
      if ((e as { name?: string } | null)?.name !== "OverconstrainedError") throw e;
      return {
        stream: await mediaDevices.getUserMedia({ audio: true }),
        used: "default",
        fellBack: true,
      };
    }
  }
  return {
    stream: await mediaDevices.getUserMedia({ audio: true }),
    used: "default",
    fellBack: false,
  };
}

/**
 * Audio inputs the profile can pick. Devices whose label the browser has not
 * revealed yet are omitted: a picker full of blank rows or invented names is
 * worse than an honest "allow access once to see names".
 */
export async function listMicrophones(mediaDevices: MediaDevicesLike): Promise<Microphone[]> {
  const devices = (await mediaDevices.enumerateDevices?.()) ?? [];
  return devices
    .filter((d) => d.kind === "audioinput" && d.deviceId && d.label)
    .map((d) => ({ deviceId: d.deviceId, label: d.label }));
}

export interface SpeakerOutput {
  deviceId: string;
  label: string;
}

/**
 * K-88: audio outputs the profile can pick, under the same label rule as
 * microphones — no blank rows, no invented names.
 */
export async function listOutputs(mediaDevices: MediaDevicesLike): Promise<SpeakerOutput[]> {
  const devices = (await mediaDevices.enumerateDevices?.()) ?? [];
  return devices
    .filter((d) => d.kind === "audiooutput" && d.deviceId && d.label)
    .map((d) => ({ deviceId: d.deviceId, label: d.label }));
}
/**
 * L01: who owns a live recording.
 *
 * A recording flow ends two ways: the learner pressed Stop (keep the frames,
 * analyse them), or the flow was abandoned — navigation, unmount, profile or
 * pack change, microphone turned off — where the device must be released and
 * the frames dropped. Both have to survive the same race: the learner leaves
 * while `getUserMedia` is still deciding, and then a stream arrives for a
 * screen that no longer exists. A naive implementation starts recording there.
 *
 * Every `begin` takes a generation number; every end (`finish`/`cancel`)
 * advances it. A session that resolves under a superseded generation is closed
 * immediately instead of becoming the active recording.
 */
export interface CaptureSessionLike {
  /** Release the device and any audio graph. Safe to call more than once. */
  close(): void;
}

export class CaptureOwner<S extends CaptureSessionLike> {
  private generation = 0;
  private current: S | null = null;

  /** A recording is live and owned here. */
  active(): boolean {
    return this.current !== null;
  }

  /** Open a recording. Resolves to the live session, or to null when the
   *  caller cancelled or superseded this attempt while the permission grant
   *  was in flight — in which case the late session was already closed. */
  async begin(open: () => Promise<S>): Promise<S | null> {
    const generation = ++this.generation;
    const session = await open();
    if (generation !== this.generation) {
      session.close();
      return null;
    }
    this.current = session;
    return session;
  }

  /** Deliberate end: hand the session back so the caller can use what it
   *  captured, and stop an in-flight grant from becoming active. */
  finish(): S | null {
    const session = this.current;
    this.current = null;
    this.generation++;
    return session;
  }

  /** Abandon: release the device, discard what was captured. Idempotent. */
  cancel(): void {
    this.generation++;
    const session = this.current;
    this.current = null;
    session?.close();
  }
}

/** Longest single recording the app keeps. A ScriptProcessor callback that
 *  appends forever is a memory leak with a microphone attached to it, so the
 *  bound is a correctness rule, not a UI preference. */
export const MAX_CAPTURE_SECONDS = 60;

/** True once `chunks` buffers of `chunkSamples` samples at `sampleRate` have
 *  passed the bound. Pure, so the bound is testable without a clock. */
export function captureLimitReached(
  chunks: number,
  chunkSamples: number,
  sampleRate: number,
): boolean {
  return (chunks * chunkSamples) / sampleRate >= MAX_CAPTURE_SECONDS;
}
