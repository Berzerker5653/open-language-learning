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
      return { stream: await mediaDevices.getUserMedia({ audio: true }), used: "default", fellBack: true };
    }
  }
  return { stream: await mediaDevices.getUserMedia({ audio: true }), used: "default", fellBack: false };
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
