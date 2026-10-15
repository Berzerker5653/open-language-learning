// K-62: turns a stage event from the engine into a line the learner reads.
//
// The engine only names phases it actually enters, and only sends a percentage
// when it has one (docs: it never estimates work in flight). This module's half
// of the contract is to say what is happening without ever implying a number
// that was not sent — an absent percent renders no number, not 0%.

export interface EngineProgress {
  operation: string;
  subject: string;
  stage: string;
  percent: number | null;
}

const COPY: Record<string, string> = {
  "install-pack.prepare":
    "Building the language pack from its source files — this can take a minute",
  "install-pack.fetch": "Downloading the language pack",
  "install-pack.verify": "Checking the download against what the catalog promised",
  "install-pack.install": "Unpacking and checking the content — this can take a minute",
  "install-pack.record": "Recording the installed pack",
  "install-pack.cancelled": "Install cancelled",
  "install-model.fetch": "Downloading the speech model",
  "install-model.record": "Recording the installed model",
};

/**
 * One honest status line for a reported stage. An unknown stage still gets a
 * line (the operation is running and the learner should see that) but never a
 * fabricated percentage.
 */
export function progressLine(p: EngineProgress): string {
  const base = COPY[`${p.operation}.${p.stage}`] ?? "Working";
  const percent = typeof p.percent === "number" && p.percent > 0 ? ` — ${p.percent}% done` : "";
  return `${base}${percent}`;
}
