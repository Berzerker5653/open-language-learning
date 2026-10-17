/**
 * UX-001 onboarding flow: privacy-first explanation, local profile
 * (no account), language-pack choice (install, locate a local pack file, or
 * skip and decide later), skippable microphone
 * setup, and — when the mic is enabled — a speech-setup step for the
 * speech components (K-72). Presentational component: state and IPC
 * live in the container so every step is renderable in tests.
 */
import { progressLine, type EngineProgress } from "./progress";
import { PackText } from "@openlang/ui";

export interface PrivacyNotice {
  title: string;
  points: string[];
}

export interface PackCandidate {
  pack_id: string;
  display_name: string;
  locale: string;
  maturity: string;
  /** `capabilities.rtl` from the pack manifest (ADR-0029). */
  rtl: boolean;
}

export type OnboardingStep =
  "resume" | "welcome" | "packs" | "microphone" | "speech-setup" | "done";

/**
 * One part of the speech stack (K-72): the sherpa runtime, the Japanese
 * voice, and recognition. Names are container-chosen; sizes are the
 * catalog's pinned bytes, so the download cost is honest up front.
 */
export interface SpeechComponent {
  id: string;
  name: string;
  installed: boolean;
  installable: boolean;
  size_bytes: number;
  /// "recognition" (learner's speech -> text) or "synthesis" (text -> voice).
  /// The start gate is about recognition; synthesis absence only changes what
  /// feedback the activities can give.
  role: "recognition" | "synthesis";
}

export interface ProfileSummary {
  id: string;
  display_name: string;
}

export interface OnboardingProps {
  step: OnboardingStep;
  notice: PrivacyNotice;
  packs: PackCandidate[];
  selectedPack: string | null;
  installedPacks: string[];
  /** Set when the launch-time `installed_packs` read failed: installed
   * state is genuinely unknown, and the step says so rather than
   * rendering a confident-but-wrong Install button (sweep-ts-dup-install). */
  installedUnknown?: boolean;
  profileName: string;
  onProfileName(value: string): void;
  onCreateProfile(): void;
  onSelectPack(id: string): void;
  onInstall(id: string): void;
  /** Choose a `.lpk` file that is already on this device (owner 2026-10-12:
   * locating a downloaded pack belongs on the same page as choosing one). */
  onLocatePack(file: File): void;
  /** Finish setup with no active pack; the language is picked later in
   * Settings. The profile exists either way. */
  onSkipPack(): void;
  onEnableMic(): void;
  onSkipMic(): void;
  onInstallSpeech(): void;
  onSkipSpeech(): void;
  onStartSpeech(): void;
  speechComponents: SpeechComponent[];
  speechInstalling?: boolean;
  /** True once the learner answered "yes" to the microphone; adds the
   * Speech step to the progress stepper (K-72). */
  micChosen?: boolean;
  onContinue(): void;
  profiles?: ProfileSummary[];
  onResume(id: string): void;
  onCreateNew(): void;
  error?: string | null;
  progress?: EngineProgress | null;
  installing?: string | null;
}

export function Onboarding(p: OnboardingProps) {
  // Continue needs a pack the engine can actually read: a selected pack that
  // is already on the device (bundled, catalog-installed, or located from a
  // file) unlocks it with no install click. Choosing a pack is not mandatory —
  // "Skip for now" finishes setup with no active pack, which the store and
  // every pack-scoped read already resolve to "nothing yet". After a failed
  // install the actionable paths are retry, another pack, or a local file;
  // Continue is explained, never silently disabled.
  const canContinue = p.selectedPack !== null && p.installedPacks.includes(p.selectedPack);
  return (
    <section aria-label="Onboarding">
      {p.step !== "resume" && (
        <ol aria-label="Progress" className="stepper">
          <li aria-current={p.step === "welcome" ? "step" : undefined}>Welcome</li>
          <li aria-current={p.step === "packs" ? "step" : undefined}>Language</li>
          <li aria-current={p.step === "microphone" ? "step" : undefined}>Microphone</li>
          {p.micChosen && (
            <li aria-current={p.step === "speech-setup" ? "step" : undefined}>Speech</li>
          )}
          <li aria-current={p.step === "done" ? "step" : undefined}>Start</li>
        </ol>
      )}
      {p.error && (
        <p role="alert" className="alert">
          {p.error}
        </p>
      )}
      {p.progress && (
        // K-62: installing a full language pack is not instant. This line names
        // the stage the engine reported; it never implies a percentage the
        // engine did not send.
        <p role="status" aria-live="polite" className="notice">
          {progressLine(p.progress)}
        </p>
      )}

      {p.step === "resume" && (
        <div className="card">
          <h1>Welcome back</h1>
          <p>These profiles live on this device. Pick one to continue.</p>
          <div role="group" aria-label="Profiles" className="btn-row">
            {(p.profiles ?? []).map((profile) => (
              <button
                key={profile.id}
                type="button"
                className="btn btn--primary"
                onClick={() => p.onResume(profile.id)}
              >
                {profile.display_name}
              </button>
            ))}
          </div>
          <div className="btn-row">
            <button type="button" className="btn btn--quiet" onClick={p.onCreateNew}>
              Create a new profile
            </button>
          </div>
        </div>
      )}

      {p.step === "welcome" && (
        <div className="card">
          <h1>{p.notice.title}</h1>
          <p>No account required. Everything stays on this device.</p>
          <ul>
            {p.notice.points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
          <div className="field">
            <label htmlFor="profile-name">Your name (local only)</label>
            <input
              id="profile-name"
              type="text"
              value={p.profileName}
              onChange={(e) => p.onProfileName(e.target.value)}
            />
          </div>
          <button
            type="button"
            className="btn btn--primary"
            onClick={p.onCreateProfile}
            disabled={p.profileName.trim() === ""}
          >
            Create local profile
          </button>
        </div>
      )}

      {p.step === "packs" && (
        <div className="card">
          <h1>Choose a language pack</h1>
          {p.installedUnknown && (
            <p role="status" aria-live="polite" className="notice">
              The app could not check which packs are already installed. If a pack is already on
              this device, installing it again does nothing.
            </p>
          )}
          <fieldset>
            <legend>Available packs</legend>
            {p.packs.map((pack) => (
              <div key={pack.pack_id} className="radio-row">
                <label>
                  <input
                    type="radio"
                    name="pack"
                    checked={p.selectedPack === pack.pack_id}
                    onChange={() => p.onSelectPack(pack.pack_id)}
                  />
                  <PackText rtl={pack.rtl} locale={pack.locale} tag="span">
                    {pack.display_name}
                  </PackText>{" "}
                  ({pack.locale}, {pack.maturity})
                </label>
                <button
                  type="button"
                  className="btn btn--quiet"
                  onClick={() => p.onInstall(pack.pack_id)}
                  disabled={
                    p.installedPacks.includes(pack.pack_id) ||
                    (p.installing !== null && p.installing !== undefined)
                  }
                  aria-busy={p.installing === pack.pack_id}
                >
                  {p.installedPacks.includes(pack.pack_id)
                    ? "Installed"
                    : p.installing === pack.pack_id
                      ? "Installing…"
                      : "Install"}
                </button>
              </div>
            ))}
          </fieldset>
          <p>
            <small>
              A pack you already downloaded can be located here: it goes through the same validation
              as a catalog install, and once it is on this device you can select it without
              installing anything else. You can also import packs or change the language you are
              learning later from the Language packs section of Settings. This never changes the
              app&apos;s own interface language.
            </small>
          </p>
          <input
            type="file"
            accept=".lpk"
            aria-label="Locate a language pack file"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) p.onLocatePack(f);
            }}
          />
          {!canContinue ? (
            <p
              className="notice"
              id="packs-continue-note"
              data-testid="packs-continue-note"
              role="status"
            >
              {p.error
                ? "The install did not complete, so nothing was changed. Press Install again to retry this pack, select a different pack, or locate a pack file from this device — Continue unlocks once a pack is installed."
                : "Select an installed pack to continue, or skip this and choose the language later in Settings."}
            </p>
          ) : null}
          <button
            type="button"
            className="btn btn--primary"
            onClick={p.onContinue}
            disabled={!canContinue}
            aria-describedby={canContinue ? undefined : "packs-continue-note"}
          >
            Continue
          </button>
          <button type="button" className="btn btn--quiet" onClick={p.onSkipPack}>
            Skip for now
          </button>
        </div>
      )}

      {p.step === "microphone" && (
        <div className="card">
          <h1>Microphone (optional)</h1>
          <p>
            Speaking activities need a microphone, but it is never required. You can skip this and
            enable it later in Settings; skipping never blocks progress. Enabling it continues to a
            speech setup step — saying "yes" to the microphone never leaves you to find the
            downloads on your own.
          </p>
          <div className="btn-row">
            <button type="button" className="btn btn--primary" onClick={p.onEnableMic}>
              Enable microphone
            </button>
            <button type="button" className="btn btn--quiet" onClick={p.onSkipMic}>
              Skip for now
            </button>
          </div>
        </div>
      )}
      {p.step === "speech-setup" && (
        <div className="card">
          <h1>Speech setup</h1>
          <p>
            Speech components are downloaded once to this computer and shared by every language.
            Installing them now is optional — skipping is a clean choice and the app will offer the
            download wherever an activity needs it — but without them those activities stay
            text-only.
          </p>
          {p.selectedPack === null ? (
            // The components install independently of any pack, but the
            // activities they serve read content from the profile's language.
            // Saying so here is the difference between a deferral and a dead
            // end (owner 2026-10-12: skipping the pack left this step looking
            // like it had nothing to switch on).
            <p className="notice" role="status">
              This profile has no language chosen yet, so speaking activities stay unavailable until
              one is set under Settings → Language packs. Installing these components does not
              change that, and skipping here never blocks setup.
            </p>
          ) : null}
          <ul className="speech-components">
            {p.speechComponents.map((c) => (
              <li key={c.id}>
                {c.name}:{" "}
                {c.installed ? (
                  <span>installed</span>
                ) : (
                  <span>
                    not installed ({Math.round(c.size_bytes / 1e6)} MB
                    {c.installable ? "" : ", not downloadable in this build"})
                  </span>
                )}
              </li>
            ))}
          </ul>
          {p.speechComponents.length === 0 ? (
            // An empty list must never read as two dead buttons: name the
            // state and the clean way out.
            <p className="notice" role="status">
              No speech components could be listed in this build, so there is nothing to install
              from here. Speaking and listening stay text-only for now; skip this step and Settings
              retries the listing later.
            </p>
          ) : null}
          <div className="btn-row">
            <button
              type="button"
              className="btn btn--primary"
              onClick={p.onInstallSpeech}
              disabled={
                p.speechInstalling === true ||
                p.speechComponents.every((c) => c.installed || !c.installable)
              }
              aria-busy={p.speechInstalling === true || undefined}
            >
              {p.speechInstalling === true ? "Installing…" : "Install speech components"}
            </button>
            <button
              type="button"
              className="btn"
              onClick={p.onStartSpeech}
              // Speaking needs a recognition model; K-90 made pack media the
              // only spoken audio, and it rides on top of these activities —
              // a pack with no recording still runs them honestly.
              disabled={!p.speechComponents.some((c) => c.installed && c.role === "recognition")}
            >
              Start with speech
            </button>
            <button type="button" className="btn btn--quiet" onClick={p.onSkipSpeech}>
              Skip for now
            </button>
          </div>
        </div>
      )}

      {p.step === "done" && (
        <div className="card">
          <h1>Ready</h1>
          <p>
            {p.selectedPack
              ? "Profile created locally, with the language pack installed. Microphone and speech can be enabled anytime."
              : "Profile created locally with no language chosen yet, so there is nothing to practise from until you set one under Settings → Language packs."}
          </p>
          <button type="button" className="btn btn--primary" onClick={p.onContinue}>
            Start learning
          </button>
        </div>
      )}
    </section>
  );
}
