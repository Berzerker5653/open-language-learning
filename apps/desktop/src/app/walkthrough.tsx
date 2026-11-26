/**
 * APP-SPLIT-002: the journey/walkthrough smoke-handshake slice, extracted
 * from App() without behavior change. The hooks stay owned by App; this
 * module owns the module-scope progress-stage witness, the once-per-process
 * walkthrough guard, and the ~450-line smoke effect body.
 *
 * Re-exported from App.tsx so nothing else moves.
 */
import { after } from "./primitives";
import { PerfProbe } from "../perf-probe";
import type { EngineProgress } from "../progress";
import type { Invoke } from "./primitives";
import type { ProfileSummary, PackCandidate } from "../onboarding";
import type {
  SessionPlan,
  NextGoalView,
  FirstRunStep,
  UnitPathNode,
  NextOffer,
  WorldEnvironment,
  GoalCard,
} from "../home";
import type { DisplaySettingsView } from "../stress";
import type { ScenarioSummaryView, ScenarioStepResult } from "../scenario";
import type { AlignerStatus } from "../language";

/**
 * K-62 witness: every stage the engine reports is recorded as it arrives, so
 * the headless walkthrough can prove the renderer heard the progress channel
 * rather than trusting that a listener was wired up.
 */
export const progressStages: EngineProgress[] = [];

// StrictMode invokes mount effects twice in a development build. The launch
// handshake is idempotent, but this walkthrough drives a real pack install and
// a full click tour, so it runs once per process instead of twice per mount.
let walkthroughRan = false;

/** App-owned hooks the smoke walkthrough drives. All are stable/mount
 *  closures (useState setters + the mount-time applyPlan). */
export interface WalkthroughHooks {
  setProfileId: (id: string) => void;
  setDisplayName: (name: string) => void;
  setSelectedPack: (packId: string | null) => void;
  setMicEnabled: (enabled: boolean) => void;
  setNextGoal: (goal: NextGoalView | null | undefined) => void;
  setFirstRunSteps: (steps: FirstRunStep[]) => void;
  setPathNodes: (nodes: UnitPathNode[]) => void;
  setNextOffer: (offer: NextOffer | null | undefined) => void;
  setEnvironments: (envs: WorldEnvironment[] | null) => void;
  setDisplay: (view: DisplaySettingsView | null) => void;
  setStep: (step: import("../onboarding").OnboardingStep) => void;
  applyPlan: (plan: SessionPlan) => void;
}

/**
 * Runs the smoke walkthrough if the engine reports smoke mode. Resolves to
 * `true` when the app must skip its non-smoke boot path (the smoke branch is
 * final), or `false` when the ordinary app should boot as usual.
 */
export async function runSmokeHandshake(
  inv: Invoke,
  hooks: WalkthroughHooks,
): Promise<boolean> {
  let mode: { smoke: boolean; smoke_perf?: boolean } = { smoke: false };
  try {
    mode = (await inv("app_mode")) as { smoke: boolean; smoke_perf?: boolean };
  } catch (e) {
    // No mode answer: assume the ordinary app and keep booting — the
    // silent rejection below would strand the learner anyway.
    console.error("app_mode read failed", e);
  }
  if (mode.smoke) {
    // The headless walkthrough is a once-per-process act, and it belongs
    // to the smoke branch alone: a StrictMode dev remount — or a test
    // that mounts the app twice — must still reach the returning-learner
    // resume below, instead of stranding it at the wizard.
    if (walkthroughRan) return true;
    walkthroughRan = true;
    await inv("smoke_ack", { note: "home" });
    // POLISH-001: full-route walkthrough. Drive onboarding
    // deterministically (local profile + bundled default pack), then
    // click each route nav button so the real open* handlers run.
    // Wait n animation frames so React commits and paints.
    const painted = async (frames: number) => {
      const { promise, resolve } = Promise.withResolvers<void>();
      let left = frames;
      const tick = () => (left-- > 0 ? requestAnimationFrame(tick) : resolve());
      requestAnimationFrame(tick);
      await promise;
    };
    // Poll until a predicate holds (up to `frames` animation
    // frames) — needed when the next step depends on React state
    // landing, not just on a fixed paint budget.
    const waitUntil = async (pred: () => boolean, frames = 60) => {
      const { promise, resolve } = Promise.withResolvers<void>();
      let left = frames;
      const tick = () => (pred() || left-- <= 0 ? resolve() : requestAnimationFrame(tick));
      requestAnimationFrame(tick);
      await promise;
    };
    // A frame budget that never completes must produce a readable marker,
    // not a harness timeout: exit 124 says nothing about where the webview
    // stopped painting.
    const paintedOrStall = async (label: string) => {
      const stalled = await Promise.race([painted(4).then(() => false), after(3000, true)]);
      if (stalled) await inv("smoke_ack", { note: `paint-stall:${label}` });
    };
    try {
      const existing = (await inv("list_profiles")) as ProfileSummary[];
      const first = existing[0];
      const p = first
        ? ((await inv("resume_profile", {
            profileId: first.id,
          })) as ProfileSummary)
        : ((await inv("create_profile", {
            displayName: "smoke",
          })) as ProfileSummary);
      hooks.setProfileId(p.id);
      hooks.setDisplayName(p.display_name);
      // D7: the smoke walkthrough installs the first bundled
      // candidate — the same list the wizard is shown — instead of
      // naming a pack id here.
      const bundled = (await inv("available_packs")) as PackCandidate[];
      const packId = bundled[0]?.pack_id;
      if (!packId) throw new Error("no bundled pack is available to install");
      hooks.setSelectedPack(packId);
      await inv("install_pack", { packId });
      // K-62: the owner's complaint was an install that gives back no
      // sign of life. The stages are only worth asserting if the renderer
      // really heard them, so the smoke run reports each stage by name as
      // it arrived over the event channel.
      for (let i = 0; i < 20 && progressStages.length < 3; i++) {
        await after(50, undefined);
      }
      for (const stage of ["prepare", "install", "record"]) {
        await inv("smoke_ack", {
          note: `progress:${stage}:${
            progressStages.some((p2) => p2.operation === "install-pack" && p2.stage === stage)
              ? "heard"
              : "SILENT"
          }`,
        });
      }
      await inv("complete_onboarding", {
        profileId: p.id,
        packId,
        micEnabled: false,
      });
      hooks.setMicEnabled((await inv("get_microphone_enabled", { profileId: p.id })) as boolean);
      const home = (await inv("home_state", {
        profileId: p.id,
      })) as { display_name: string; plan: SessionPlan; next_goal: NextGoalView | null };
      hooks.setDisplayName(home.display_name);
      hooks.applyPlan(home.plan);
      hooks.setNextGoal(home.next_goal);
      // K-66: on a fresh profile every planned item is an
      // introduction, and first-run guidance must be non-empty for
      // the ja-JP pack. The script asserts both markers.
      const freshSteps = (await inv("first_run_steps", { profileId: p.id })) as FirstRunStep[];
      hooks.setFirstRunSteps(freshSteps);
      hooks.setPathNodes((await inv("unit_path", { profileId: p.id })) as UnitPathNode[]);
      hooks.setNextOffer((await inv("current_offer", { profileId: p.id })) as NextOffer | null);
      await inv("smoke_ack", { note: `fresh-plan:${home.plan.items.length}` });
      await inv("smoke_ack", { note: `first-run:${freshSteps.length}` });
      hooks.setEnvironments((await inv("world_state", { profileId: p.id })) as WorldEnvironment[]);
      hooks.setDisplay((await inv("display_settings", { profileId: p.id })) as DisplaySettingsView);
      const goalRows = (await inv("goal_map", { profileId: p.id })) as GoalCard[];
      await inv("smoke_ack", { note: `goal-map:${goalRows.length}` });
      hooks.setStep("done");
      // sweep-walkthrough-stall: no bare frame wait — a frozen rAF must
      // name itself instead of parking the walkthrough unmarked.
      await paintedOrStall("hub-paint");
      const buttons = Array.from(document.querySelectorAll('nav[aria-label="Routes"] button'));
      for (const b of buttons) {
        const label = (b.textContent ?? "").trim();
        // K-63: "switching routes feels slow" is an impression; this is the
        // measurement. Timed from the click to the paint a learner would
        // actually see, inside the real webview over real IPC.
        const started = performance.now();
        (b as HTMLButtonElement).click();
        await paintedOrStall(label);
        await inv("smoke_ack", {
          note: `route-ms:${label}:${Math.round(performance.now() - started)}`,
        });
        await inv("smoke_ack", { note: `route:${label}` });
        // K-64: the microphone picker is a Settings control backed by a
        // stored setting. Walking the route proves it is really rendered,
        // not just present in the component source.
        if (label === "Settings") {
          await inv("smoke_ack", {
            note: `mic-picker:${document.querySelector("#mic-device") ? "present" : "ABSENT"}`,
          });
        }
      }
      // K-63-follow: one tab costs six times what every other tab costs, and
      // (K-77) the heavy tab is now Settings, which carries the folded
      // Language-packs panel.
      // the two halves need different fixes. Leave the tab, come back, and
      // time the return: by now the panel's commands are warm and its data
      // is memoized, so whatever is left is the remount's fetch chain plus
      // painting the panel. If the number survives, it is paint.
      const navTo = (label: string) =>
        buttons.find((b) => (b.textContent ?? "").trim() === label) as
          HTMLButtonElement | undefined;
      const away = navTo("Today");
      const back = navTo("Settings");
      if (away && back) {
        away.click();
        await paintedOrStall("Today");
        const again = performance.now();
        back.click();
        await paintedOrStall("Settings");
        await inv("smoke_ack", {
          note: `route-2ms:Settings:${Math.round(performance.now() - again)}`,
        });
      }
      // K-81: the nav is five destinations now; the practice modes hide
      // behind the hub, so the walk drills the hub the way a learner
      // does — the route floor counts modes, not just tabs.
      const practiceTab = navTo("Practice");
      if (!practiceTab) throw new Error("Practice hub tab missing");
      for (const mode of [
        "Pronunciation",
        "Speaking",
        "Writing",
        "Scenarios",
        "Shadowing",
        "Reading",
        "Kanji",
        "Placement",
      ]) {
        practiceTab.click();
        await paintedOrStall("practice-tab");
        const card = Array.from(
          document.querySelectorAll('[aria-label="Practice modes"] button'),
        ).find((b) => (b.textContent ?? "").trim() === mode) as HTMLButtonElement | undefined;
        if (!card) throw new Error(`hub card "${mode}" missing`);
        const started = performance.now();
        card.click();
        await paintedOrStall(mode);
        await inv("smoke_ack", {
          note: `route-ms:${mode}:${Math.round(performance.now() - started)}`,
        });
        await inv("smoke_ack", { note: `route:${mode}` });
        if (mode === "Shadowing") {
          // Owner finding 8: the pass reported Play/Record as grey and
          // unclickable. Nothing in the code ever disables them, so the
          // walk records what the live card actually rendered.
          const sec = document.querySelector('[aria-label="Shadowing"]');
          const bs = sec
            ? Array.from(sec.querySelectorAll("button")).map((b) => b as HTMLButtonElement)
            : [];
          await inv("smoke_ack", {
            note: `shadow-buttons:${bs.length}:${bs.filter((b) => b.disabled).length}`,
          });
        }
      }
      // K-63: route switching was reported as feeling dead. Split the cost
      // into the commands a route runs and the paint that follows, because
      // the fix differs by half. These are warm calls: the state a learner
      // is already in when they click the tab.
      const timed = async (cmd: string, args?: Record<string, unknown>) => {
        const t = performance.now();
        await inv(cmd, args);
        await inv("smoke_ack", {
          note: `call-ms:${cmd}:${Math.round(performance.now() - t)}`,
        });
      };
      const warm: Array<[string, Record<string, unknown> | undefined]> = [
        ["installed_packs", undefined],
        ["pack_claims", undefined],
        ["catalog_packs", undefined],
        ["available_models", undefined],
        ["aligner_status", undefined],
        ["scenario_list", { profileId: p.id }],
        ["home_state", { profileId: p.id }],
        ["active_pack", { profileId: p.id }],
        ["placement_plan", { profileId: p.id }],
        ["kanji_list", { profileId: p.id }],
        ["goal_map", { profileId: p.id }],
        ["unit_path", { profileId: p.id }],
        ["practice_plan", { profileId: p.id, minutes: 10 }],
        ["writing_task", { profileId: p.id }],
        // Not content: this proves the command is actually registered in the
        // native handler list. The web layer calling a command the Rust side
        // never registered fails silently outside a typed call site.
        ["build_identity", undefined],
      ];
      for (const [cmd, args] of warm) {
        await timed(cmd, args);
      }
      if (mode.smoke_perf) {
        // PERF-002: the CLI benchmarks cannot answer
        // app.ui_responsiveness_during_inference.*, so the walkthrough
        // brackets a real aligner call (whisper sidecar, ADR-0019) with
        // probe windows and lets the webview report its own numbers.
        // Three calls: one cold (first subprocess), two warm.
        const probe = new PerfProbe((note) => inv("smoke_ack", { note }));
        try {
          const model = (await inv("perf_asr_setup")) as string;
          await inv("smoke_ack", { note: `perf:asr-model:${model}` });
          const attempt = (await inv("perf_asr_attempt")) as {
            pack_id: string;
            short_unit: string;
            long_unit: string;
            short_text: string;
            long_text: string;
            wav_b64: string;
          };
          probe.start("asr-inference");
          for (let i = 0; i < 3; i++) {
            await inv("pronunciation_check", { attempt });
          }
          probe.stop();
          probe.start("idle-baseline");
          await new Promise((r) => setTimeout(r, 1500));
          probe.stop();
        } catch (e) {
          // Abstain, don't fake: the marker names why there is no number.
          await inv("smoke_ack", { note: `perf:asr-skipped:${String(e)}` });
        }
        await probe.flush();
        // app.cancellation.asr_cancel_effect_ms: the shipped whisper-cli
        // invocation has no cancel seam; inventing one to measure would
        // measure the invention. State the abstention instead.
        await inv("smoke_ack", { note: "perf:cancel-skipped:no-product-seam" });
      }
      // K-60: scenario actions died at the IPC boundary because the
      // native view structs renamed their keys to kebab-case. Walk
      // the real click path (nav button -> list row -> Start) so the
      // regression is caught by the headless walkthrough, not only
      // by unit tests.
      const scenarios = (await inv("scenario_list", {
        profileId: p.id,
      })) as ScenarioSummaryView[];
      if (scenarios.length === 0) {
        await inv("smoke_ack", { note: "scenario-started:none-locked" });
      } else {
        // K-75: the native list leads with the playable scenario and
        // marks it as the recommendation, so the walkthrough follows
        // that row instead of whatever the pack files sort to first.
        const scen = scenarios.find((s) => s.recommended) ?? scenarios[0];
        if (!scen) throw new Error("scenario list row vanished");
        const practiceTab = navTo("Practice");
        if (!practiceTab) throw new Error("Practice tab missing");
        practiceTab.click();
        await painted(4);
        const scenCard = Array.from(
          document.querySelectorAll('[aria-label="Practice modes"] button'),
        ).find((b) => (b.textContent ?? "").trim() === "Scenarios") as
          HTMLButtonElement | undefined;
        if (!scenCard) throw new Error("Scenarios hub card missing");
        scenCard.click();
        await painted(4);
        const row = Array.from(document.querySelectorAll("li")).find((li) =>
          (li.textContent ?? "").includes(scen.title),
        );
        if (!row) throw new Error(`scenario row for "${scen.title}" missing`);
        const start = Array.from(row.querySelectorAll("button")).find(
          (b) => (b.textContent ?? "").trim() === "Start",
        ) as HTMLButtonElement | undefined;
        if (scen.unlocked) {
          if (!start) throw new Error("Start button missing on unlocked scenario");
          start.click();
          await waitUntil(() => !!document.querySelector('[aria-label="Scenario"]'));
          if (!document.querySelector('[aria-label="Scenario"]'))
            throw new Error("scenario session did not open");
          if (document.querySelector('[aria-label="Scenario"] [role="alert"]'))
            throw new Error("scenario start surfaced an error to the learner");
          await inv("smoke_ack", { note: `scenario-started:${scen.scenario_id}` });
          const action = document.querySelector(
            '[aria-label="Ways to respond"] button',
          ) as HTMLButtonElement | null;
          // U07: the button text is the learner-facing label, never
          // the intent token; the walkthrough reads the machine-side
          // attribute exactly as the click handler receives it.
          const intent = (action?.getAttribute("data-intent") ?? "").trim();
          try {
            if (intent) {
              const step = (await inv("scenario_attempt", {
                profileId: p.id,
                scenarioId: scen.scenario_id,
                intent,
              })) as ScenarioStepResult;
              await inv("smoke_ack", {
                note: `scenario-step:${scen.scenario_id}:${step.result}`,
              });
            } else {
              await inv("smoke_ack", {
                note: `scenario-step:${scen.scenario_id}:abstained`,
              });
            }
          } catch (e) {
            await inv("smoke_ack", {
              note: `scenario-step:${scen.scenario_id}:error:${String(e)}`,
            });
          }
          // O-06 2026-10-10: the owner reported the Support box and the
          // Transfer variants "do nothing". Click them the way a learner
          // does and report what visibly changes.
          const support = document.querySelector(
            '[aria-label="Scenario"] fieldset.ladder button',
          ) as HTMLButtonElement | null;
          if (support) {
            support.click();
            await waitUntil(() => support.disabled, 2000);
            await inv("smoke_ack", {
              note: `scenario-support:${scen.scenario_id}:${support.disabled ? "consumed" : "no-visible-change"}`,
            });
          } else {
            await inv("smoke_ack", { note: `scenario-support:${scen.scenario_id}:no-ladder` });
          }
          const transfer = document.querySelector(
            '[aria-label="Scenario"] fieldset.transfers button',
          ) as HTMLButtonElement | null;
          if (transfer) {
            if (transfer.disabled) {
              // SCENARIO-TRANSFER-001: a variant without a practice
              // payload is honest dead content by design — it is
              // never pressable.
              await inv("smoke_ack", {
                note: `scenario-transfer:${scen.scenario_id}:no-payload`,
              });
            } else {
              transfer.click();
              // A press OPENS practice (SCENARIO-TRANSFER-001); it
              // never stamps a ✓ by itself. Report which happened.
              await waitUntil(
                () =>
                  document.querySelector('[data-testid="transfer-practice"]') !== null ||
                  (transfer.textContent ?? "").includes("✓"),
                120,
              );
              const opened =
                document.querySelector('[data-testid="transfer-practice"]') !== null;
              const done = (transfer.textContent ?? "").includes("✓");
              await inv("smoke_ack", {
                note: `scenario-transfer:${scen.scenario_id}:${opened ? "practice-opened" : done ? "done" : "no-visible-change"}`,
              });
            }
          } else {
            // Branch-B packs (SCENARIO-TRANSFER-001): the section is
            // gone because nothing is required that cannot be done.
            await inv("smoke_ack", {
              note: `scenario-transfer:${scen.scenario_id}:none-offered`,
            });
          }
        } else {
          await inv("smoke_ack", {
            note: `scenario-locked:${scen.scenario_id}:${scen.locked_reason ?? "?"}`,
          });
        }
      }
      // D4 (ADR-0019): the app must be able to state, over real IPC, which
      // aligner runtime this build carries. The value is build-dependent;
      // the requirement is that the answer exists.
      const al = (await inv("aligner_status")) as AlignerStatus;
      await inv("smoke_ack", {
        note: `aligner:${al.available ? "yes" : "no"}:${al.available ? (al.source ?? "?") : (al.reason ?? "?")}`,
      });
      await inv("smoke_ack", {
        note: `routes-complete:${buttons.length}`,
      });
    } catch (e) {
      await inv("smoke_ack", { note: `walkthrough-error:${String(e)}` });
    }
    return true;
  }
  return false;
}
