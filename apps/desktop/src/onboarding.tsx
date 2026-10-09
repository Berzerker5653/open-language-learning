/**
 * UX-001 onboarding flow: privacy-first explanation, local profile
 * (no account), Japanese pack selection/install, skippable microphone
 * setup. Presentational component: state and IPC live in the container
 * so every step is renderable in tests.
 */
import { progressLine, type EngineProgress } from "./progress";

export interface PrivacyNotice {
  title: string;
  points: string[];
}

export interface PackCandidate {
  pack_id: string;
  display_name: string;
  locale: string;
  maturity: string;
}

export type OnboardingStep = "resume" | "welcome" | "packs" | "microphone" | "done";

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
  profileName: string;
  onProfileName(value: string): void;
  onCreateProfile(): void;
  onSelectPack(id: string): void;
  onInstall(id: string): void;
  onEnableMic(): void;
  onSkipMic(): void;
  onContinue(): void;
  profiles?: ProfileSummary[];
  onResume(id: string): void;
  onCreateNew(): void;
  error?: string | null;
  progress?: EngineProgress | null;
}

export function Onboarding(p: OnboardingProps) {
  // The engine requires an installed active pack to finish setup
  // (`complete_onboarding` rejects an uninstalled pack), so "continue
  // without" is not an honest option in this build. After an install
  // failure the actionable path is retry — the Install button stays
  // enabled — or another pack; Continue is explained, never silently
  // disabled.
  const canContinue = p.selectedPack !== null && p.installedPacks.includes(p.selectedPack);
  return (
    <section aria-label="Onboarding">
      {p.step !== "resume" && (
        <ol aria-label="Progress" className="stepper">
          <li aria-current={p.step === "welcome" ? "step" : undefined}>Welcome</li>
          <li aria-current={p.step === "packs" ? "step" : undefined}>Language</li>
          <li aria-current={p.step === "microphone" ? "step" : undefined}>Microphone</li>
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
                  {pack.display_name} ({pack.locale}, {pack.maturity})
                </label>
                <button
                  type="button"
                  className="btn btn--quiet"
                  onClick={() => p.onInstall(pack.pack_id)}
                  disabled={p.installedPacks.includes(pack.pack_id)}
                >
                  {p.installedPacks.includes(pack.pack_id) ? "Installed" : "Install"}
                </button>
              </div>
            ))}
          </fieldset>
          <p>
            <small>
              You can import community packs or change the language you are learning later from the
              Languages page. This never changes the app&apos;s own interface language.
            </small>
          </p>
          {!canContinue ? (
            <p
              className="notice"
              id="packs-continue-note"
              data-testid="packs-continue-note"
              role="status"
            >
              {p.error
                ? "The install did not complete, so nothing was changed. Press Install again to retry this pack, or select a different pack — Continue unlocks once a pack is installed."
                : "Select a pack and install it to continue."}
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
        </div>
      )}

      {p.step === "microphone" && (
        <div className="card">
          <h1>Microphone (optional)</h1>
          <p>
            Speaking activities need a microphone, but it is never required. You can skip this and
            enable it later in Settings; skipping never blocks progress.
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

      {p.step === "done" && (
        <div className="card">
          <h1>Ready</h1>
          <p>
            Profile created locally. Language pack installed. Microphone can be enabled anytime.
          </p>
          <button type="button" className="btn btn--primary" onClick={p.onContinue}>
            Start learning
          </button>
        </div>
      )}
    </section>
  );
}
