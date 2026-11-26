// EMPTY-STATES-001 evidence build: vite config for the screenshot harness entry
// (empty-states-capture.html). Dev-only; the shipped build uses vite.config.ts.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: new URL(".", import.meta.url).pathname,
  base: "./",
  plugins: [react()],
  build: {
    outDir: "dist-empty-states",
    emptyOutDir: true,
    rollupOptions: { input: "empty-states-capture.html" },
  },
});
