import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Tauri expects a fixed dev port and disables watch polling inside containers.
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    // Pinned to IPv4 loopback so it matches build.devUrl exactly: left
    // implicit, vite binds ::1 only, and a debug build pointed at
    // http://localhost:1420 then works or goes blank depending on how
    // localhost resolves.
    host: "127.0.0.1",
    port: 1420,
    strictPort: true,
  },
  build: {
    target: "es2022",
  },
  test: {
    // JOURNEY-SUITE-001: node stays the default environment for every existing
    // suite. vitest 5.0.3 has no per-file switch any more — the
    // `@vitest-environment` docblock and `environmentMatchGlobs` are both gone
    // from the installed build — so the supported opt-in is `test.projects`,
    // and declaring projects turns this config into a container: each
    // environment has to be spelled out. Only src/journeys/*.journey.tsx gets
    // a DOM.
    // A project entry is a Vite config, so its own options sit under `test` —
    // and a container-level test option is not inherited by the projects, so
    // the options belong to the project that uses them: the a11y audit reads
    // the palette stylesheet via ?raw (K-33), hence `css: true` on node.
    projects: [
      {
        test: {
          name: "node",
          environment: "node",
          css: true,
        },
      },
      {
        test: {
          name: "dom",
          environment: "happy-dom",
          include: ["src/journeys/*.journey.tsx"],
        },
      },
    ],
  },
});
