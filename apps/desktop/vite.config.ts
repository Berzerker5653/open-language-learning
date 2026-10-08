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
    // the a11y audit reads the palette stylesheet via ?raw (K-33)
    css: true,
  },
});
