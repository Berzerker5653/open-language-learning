import { AppShell } from "@openlang/ui";

/**
 * Desktop UI host. The Tauri native shell is added by BOOT-002; this
 * skeleton proves the shared web UI builds and renders in the workspace.
 * Navigation labels are placeholders supplied by the host, not embedded
 * language content.
 */
export function App() {
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
        The learning engine is under construction. See <code>state/STATUS.md</code> for roadmap
        progress.
      </p>
    </AppShell>
  );
}
