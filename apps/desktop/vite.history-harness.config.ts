// WEB-HISTORY-001 evidence build: vite config for the real-browser history
// walk entry (history-harness.html). Dev-only; the shipped build uses
// vite.config.ts. Mirrors vite.mobile-harness.config.ts.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: new URL(".", import.meta.url).pathname,
  // relative asset URLs so the built page also loads from file://
  base: "./",
  plugins: [react()],
  build: {
    outDir: "dist-history",
    emptyOutDir: true,
    rollupOptions: { input: "history-harness.html" },
  },
});
