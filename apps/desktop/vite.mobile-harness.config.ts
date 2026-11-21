// MOBILE-UX-001 evidence build: vite config for the screenshot harness entry
// (mobile-harness.html). Dev-only; the shipped build uses vite.config.ts.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: new URL(".", import.meta.url).pathname,
  // relative asset URLs so the built page also loads from file:// (the
  // capture harness opens it without a dev server)
  base: "./",
  plugins: [react()],
  build: {
    outDir: "dist-mobile",
    emptyOutDir: true,
    rollupOptions: { input: "mobile-harness.html" },
  },
});
