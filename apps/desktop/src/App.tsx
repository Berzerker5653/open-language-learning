import { useEffect, useState } from "react";
import { AppShell } from "@openlang/ui";
import {
  Onboarding,
  type OnboardingStep,
  type PackCandidate,
  type PrivacyNotice,
} from "./onboarding";

type Invoke = (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;

/** Tauri IPC when running inside the native shell; null in plain
 * browser/vitest runs, where the flow stays purely local. */
function detectInvoke(): Invoke | null {
  if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
    return (cmd, args) => import("@tauri-apps/api/core").then((m) => m.invoke(cmd, args));
  }
  return null;
}

/**
 * Desktop UI host. UX-001: onboarding (privacy notice, local profile,
 * Japanese pack install, skippable microphone). The smoke handshake
 * (BOOT-002) runs on mount regardless of route.
 */
export function App() {
  const [step, setStep] = useState<OnboardingStep>("welcome");
  const [notice, setNotice] = useState<PrivacyNotice>({
    title: "Your data stays on this device",
    points: [
      "Everything runs locally unless you enable an online provider.",
      "No account is required; profiles live on this device.",
    ],
  });
  const [packs, setPacks] = useState<PackCandidate[]>([]);
  const [selectedPack, setSelectedPack] = useState<string | null>(null);
  const [installedPacks, setInstalledPacks] = useState<string[]>([]);
  const [profileName, setProfileName] = useState("");
  const [profileId, setProfileId] = useState<string | null>(null);

  useEffect(() => {
    const inv = detectInvoke();
    if (!inv) return;
    void (async () => {
      const mode = (await inv("app_mode")) as { smoke: boolean };
      if (mode.smoke) {
        await inv("smoke_ack", { note: "home" });
        return;
      }
      setNotice((await inv("privacy_notice")) as PrivacyNotice);
      setPacks((await inv("available_packs")) as PackCandidate[]);
    })();
  }, []);

  const inv = detectInvoke();

  async function createProfile() {
    if (inv) {
      const p = (await inv("create_profile", { displayName: profileName })) as { id: string };
      setProfileId(p.id);
    } else {
      setProfileId("local-dev-profile");
    }
    setStep("packs");
  }

  async function install(id: string) {
    if (inv) await inv("install_pack", { packId: id });
    setInstalledPacks((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }

  async function finishOnboarding(micEnabled: boolean) {
    if (inv && profileId && selectedPack) {
      await inv("complete_onboarding", {
        profileId,
        packId: selectedPack,
        micEnabled,
      });
    }
    setStep("done");
  }

  if (step !== "done") {
    return (
      <AppShell
        productName="Open Language Learning Platform"
        nav={[{ id: "onboarding", label: "Setup" }]}
      >
        <Onboarding
          step={step}
          notice={notice}
          packs={packs}
          selectedPack={selectedPack}
          installedPacks={installedPacks}
          profileName={profileName}
          onProfileName={setProfileName}
          onCreateProfile={() => void createProfile()}
          onSelectPack={setSelectedPack}
          onInstall={(id) => void install(id)}
          onEnableMic={() => void finishOnboarding(true)}
          onSkipMic={() => void finishOnboarding(false)}
          onContinue={() => setStep("microphone")}
        />
      </AppShell>
    );
  }

  return (
    <AppShell
      productName="Open Language Learning Platform"
      nav={[
        { id: "practice", label: "Practice" },
        { id: "progress", label: "Progress" },
        { id: "settings", label: "Settings" },
      ]}
    >
      <h1>Welcome</h1>
      <p>
        Onboarding complete. The learning engine is under construction. See{" "}
        <code>state/STATUS.md</code> for roadmap progress.
      </p>
    </AppShell>
  );
}
