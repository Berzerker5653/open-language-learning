import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Tauri expects a fixed dev port and disables watch polling inside containers.
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
  },
  build: {
    target: "es2022",
  },
  test: {
    // the a11y audit reads the palette stylesheet via ?raw (K-33)
    css: true,
  },
});
