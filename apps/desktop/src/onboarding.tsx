/**
 * UX-001 onboarding flow: privacy-first explanation, local profile
 * (no account), Japanese pack selection/install, skippable microphone
 * setup. Presentational component: state and IPC live in the container
 * so every step is renderable in tests.
 */

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

export type OnboardingStep = "welcome" | "packs" | "microphone" | "done";

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
}

export function Onboarding(p: OnboardingProps) {
  return (
    <section aria-label="Onboarding">
      <ol aria-label="Progress">
        <li aria-current={p.step === "welcome" ? "step" : undefined}>Welcome</li>
        <li aria-current={p.step === "packs" ? "step" : undefined}>Language</li>
        <li aria-current={p.step === "microphone" ? "step" : undefined}>Microphone</li>
        <li aria-current={p.step === "done" ? "step" : undefined}>Start</li>
      </ol>

      {p.step === "welcome" && (
        <div>
          <h1>{p.notice.title}</h1>
          <p>No account required. Everything stays on this device.</p>
          <ul>
            {p.notice.points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
          <label htmlFor="profile-name">Your name (local only)</label>
          <input
            id="profile-name"
            type="text"
            value={p.profileName}
            onChange={(e) => p.onProfileName(e.target.value)}
          />
          <button type="button" onClick={p.onCreateProfile} disabled={p.profileName.trim() === ""}>
            Create local profile
          </button>
        </div>
      )}

      {p.step === "packs" && (
        <div>
          <h1>Choose a language pack</h1>
          <fieldset>
            <legend>Available packs</legend>
            {p.packs.map((pack) => (
              <div key={pack.pack_id}>
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
                  onClick={() => p.onInstall(pack.pack_id)}
                  disabled={p.installedPacks.includes(pack.pack_id)}
                >
                  {p.installedPacks.includes(pack.pack_id) ? "Installed" : "Install"}
                </button>
              </div>
            ))}
          </fieldset>
          <button
            type="button"
            onClick={p.onContinue}
            disabled={p.selectedPack === null || !p.installedPacks.includes(p.selectedPack)}
          >
            Continue
          </button>
        </div>
      )}

      {p.step === "microphone" && (
        <div>
          <h1>Microphone (optional)</h1>
          <p>
            Speaking activities need a microphone, but it is never required. You can skip this and
            enable it later in Settings; skipping never blocks progress.
          </p>
          <button type="button" onClick={p.onEnableMic}>
            Enable microphone
          </button>
          <button type="button" onClick={p.onSkipMic}>
            Skip for now
          </button>
        </div>
      )}

      {p.step === "done" && (
        <div>
          <h1>Ready</h1>
          <p>
            Profile created locally. Language pack installed. Microphone can be enabled anytime.
          </p>
          <button type="button" onClick={p.onContinue}>
            Start learning
          </button>
        </div>
      )}
    </section>
  );
}
