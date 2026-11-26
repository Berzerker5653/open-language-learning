/**
 * APP-SPLIT-003C: the pack/session/claims refresh wiring slice, moved out of
 * App() without behavior change. App.tsx still owns every hook and state;
 * this module owns the bodies of the pack/session/claims refresh reads
 * (refreshLanguages — installed packs, pack claims, session pack, catalogue)
 * and the install/import/cancel/update handler family. The deps object is
 * built once per render in App() (after every referenced binding is in
 * scope) and passed at each call site, so reads keep the exact old timing.
 */
import type {
  CatalogEntry,
  InstallOutcome,
  InstallReceipt,
  InstalledPack,
  PackClaims,
} from "../language";
import type { EngineProgress } from "../progress";
import { loadSessionPack, type Invoke } from "./primitives";

/** Every dependency of the pack/session/claims refresh slice: plain render
 *  values + setters (no hooks). Mirrors exactly what the old inline
 *  closures in App() captured. */
export interface PackWiringDeps {
  inv: Invoke | null;
  profileId: string | null;
  engineProgress: EngineProgress | null;
  setPacksPending: (v: boolean) => void;
  setPacksUnknown: (v: boolean) => void;
  setInstalled: (v: InstalledPack[]) => void;
  setInstalledUnknown: (v: boolean) => void;
  setClaims: (v: PackClaims[] | null) => void;
  setActiveIds: (v: string[]) => void;
  setSelectedPack: (v: string | null) => void;
  setLangError: (v: string | null) => void;
  setCatalog: (v: CatalogEntry[]) => void;
  setCatalogStatus: (v: string) => void;
  setOnboardError: (v: string | null) => void;
  setInstallingPack: (v: string | null) => void;
  setEngineProgress: (v: EngineProgress | null) => void;
  setInstallOutcome: (v: InstallOutcome | null) => void;
  setInstallReceipt: (v: InstallReceipt | null) => void;
}

/** The four pack reads (installed, claims, session pack, catalogue) run
 *  together and commit in one block. */
export async function runRefreshLanguages(deps: PackWiringDeps, pid?: string): Promise<void> {
  const { inv } = deps;
  if (!inv) return;
  const active = pid ?? deps.profileId;
  deps.setPacksPending(true);
  let results;
  try {
    results = await Promise.all([
      inv("installed_packs") as Promise<InstalledPack[]>,
      inv("pack_claims") as Promise<PackClaims[]>,
      active ? loadSessionPack(inv, active) : Promise.resolve(null),
      inv("catalog_packs") as Promise<{ entries: CatalogEntry[]; status: string }>,
    ]);
  } catch (e) {
    // Sweep finding 19: a failed pack read leaves the active-pack state
    // UNKNOWN, not "none"; Home attributes the failure instead of
    // claiming the profile has no language.
    deps.setPacksUnknown(true);
    throw e;
  } finally {
    deps.setPacksPending(false);
  }
  const [installed, claims, session, catalog] = results;
  deps.setPacksUnknown(false);
  deps.setInstalled(installed);
  deps.setClaims(claims);
  if (session) {
    deps.setActiveIds(session.ids);
    // D7: the profile's own active pack seeds every pack-scoped call,
    // so a returning session (no wizard this run) and a pack switch
    // from Settings both aim at the right pack. No pack here means no pack:
    // the panels refuse instead of guessing one.
    deps.setSelectedPack(session.packId);
    if (session.note) deps.setLangError(session.note);
  }
  deps.setCatalog(catalog.entries);
  deps.setCatalogStatus(catalog.status);
}

/** One read, one container update. */
export async function runRefreshInstalled(deps: PackWiringDeps): Promise<InstalledPack[] | null> {
  const { inv } = deps;
  if (!inv) return null;
  try {
    const fresh = (await inv("installed_packs")) as InstalledPack[];
    deps.setInstalled(fresh);
    deps.setInstalledUnknown(false);
    return fresh;
  } catch {
    deps.setInstalledUnknown(true);
    return null;
  }
}

/** The wizard's Update control. */
export async function runUpdateFromCatalog(deps: PackWiringDeps, id: string): Promise<void> {
  const { inv } = deps;
  if (!inv) return;
  deps.setOnboardError(null);
  deps.setInstallingPack(id);
  try {
    await inv("install_catalog_pack", { packId: id });
  } catch (e) {
    deps.setOnboardError(`Could not update that pack: ${String(e)}`);
    return;
  } finally {
    deps.setInstallingPack(null);
    deps.setEngineProgress(null);
  }
  await runRefreshInstalled(deps);
  try {
    const cat = (await inv("catalog_packs")) as {
      entries: CatalogEntry[];
      status: string;
    };
    deps.setCatalog(cat.entries);
    deps.setCatalogStatus(cat.status);
  } catch {
    // The rows keep the last-known facts; the notice does not invent a version.
  }
}

/** Settings -> Install from catalogue. */
export async function runInstallCatalogPack(deps: PackWiringDeps, packId: string): Promise<void> {
  const { inv } = deps;
  if (!inv) return;
  deps.setInstallOutcome(null);
  deps.setInstallReceipt(null);
  deps.setLangError(null);
  try {
    const res = (await inv("install_catalog_pack", { packId })) as {
      receipt: InstallReceipt | null;
    } | null;
    if (res?.receipt) deps.setInstallReceipt(res.receipt);
  } catch (e) {
    const reason = String(e).replace(/^install-catalog-pack failed:\s*/, "");
    deps.setInstallOutcome(
      reason.includes("install cancelled")
        ? { kind: "cancelled", pack_id: packId, message: reason }
        : { kind: "failed", pack_id: packId, message: reason },
    );
  } finally {
    deps.setEngineProgress(null);
  }
  try {
    await runRefreshLanguages(deps);
  } catch (e) {
    // The write succeeded; only the re-read failed — say so, and let the
    // receipt/outcome already on screen stand.
    deps.setLangError(`The pack list could not be re-read: ${String(e)}`);
  }
}

/** Cancel asks the engine to stop the install whose progress is on screen. */
export async function runCancelInstall(deps: PackWiringDeps): Promise<void> {
  const { inv } = deps;
  if (!inv) return;
  const subject = deps.engineProgress?.subject;
  if (!subject) return;
  await inv("cancel_pack_install", { packId: subject }).catch(() => undefined);
}

/** Settings -> import a pack file. */
export async function runImportPack(deps: PackWiringDeps, dataB64: string): Promise<void> {
  const { inv } = deps;
  if (!inv) return;
  try {
    await inv("import_pack", { dataB64 });
    deps.setLangError(null);
  } catch (e) {
    deps.setLangError(String(e));
  } finally {
    deps.setEngineProgress(null);
  }
  try {
    await runRefreshLanguages(deps);
  } catch (e) {
    deps.setLangError(`The pack list could not be re-read: ${String(e)}`);
  }
}
