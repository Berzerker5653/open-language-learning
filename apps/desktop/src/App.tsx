import { useEffect, useState } from "react";
import { AppShell } from "@openlang/ui";
import {
  Onboarding,
  type OnboardingStep,
  type PackCandidate,
  type PrivacyNotice,
} from "./onboarding";
import { Home, ProgressView, type ProgressRow, type SessionPlan } from "./home";

type Invoke = (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;

/** Tauri IPC when running inside the native shell; null in plain
 * browser/vitest runs, where the flow stays purely local. */
function detectInvoke(): Invoke | null {
  if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
    return (cmd, args) => import("@tauri-apps/api/core").then((m) => m.invoke(cmd, args));
  }
  return null;
}

const EMPTY_PLAN: SessionPlan = {
  items: [],
  total_seconds: 0,
  budget_minutes: 5,
  seed: 0,
  planner_version: "session-planner-0.1.0",
};

/**
 * Desktop UI host. UX-001 onboarding (privacy notice, local profile,
 * Japanese pack install, skippable microphone), then UX-002 home /
 * time-budget practice / capability progress. The smoke handshake
 * (BOOT-002) runs on mount regardless of route.
 */
export function App() {
  const [step, setStep] = useState<OnboardingStep>("welcome");
  const [route, setRoute] = useState<"practice" | "progress">("practice");
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
  const [displayName, setDisplayName] = useState("");
  const [budget, setBudget] = useState(5);
  const [plan, setPlan] = useState<SessionPlan>(EMPTY_PLAN);
  const [progress, setProgress] = useState<ProgressRow[]>([]);

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
      const p = (await inv("create_profile", { displayName: profileName })) as {
        id: string;
        display_name: string;
      };
      setDisplayName(p.display_name);
    } else {
      setProfileId("local-dev-profile");
      setDisplayName(profileName);
    }
    setStep("packs");
  }

  async function install(id: string) {
    if (inv) await inv("install_pack", { packId: id });
    setInstalledPacks((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }

  async function finishOnboarding(micEnabled: boolean) {
    if (inv && profileId && selectedPack) {
      await inv("complete_onboarding", { profileId, packId: selectedPack, micEnabled });
      const home = (await inv("home_state", { profileId })) as {
        display_name: string;
        plan: SessionPlan;
      };
      setDisplayName(home.display_name);
      setPlan(home.plan);
    }
    setStep("done");
  }

  async function changeBudget(minutes: number) {
    setBudget(minutes);
    if (inv && profileId) {
      setPlan((await inv("practice_plan", { profileId, minutes })) as SessionPlan);
    }
  }

  async function openProgress() {
    setRoute("progress");
    if (inv && profileId) {
      setProgress((await inv("progress_summary", { profileId })) as ProgressRow[]);
    }
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
      {route === "practice" ? (
        <Home
          displayName={displayName}
          plan={plan}
          activeBudget={budget}
          onBudget={(m) => void changeBudget(m)}
        />
      ) : (
        <ProgressView rows={progress} />
      )}
      <nav aria-label="Routes">
        <button type="button" onClick={() => setRoute("practice")}>
          Practice
        </button>
        <button type="button" onClick={() => void openProgress()}>
          Progress
        </button>
      </nav>
    </AppShell>
  );
}
