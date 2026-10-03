import { invoke } from "@tauri-apps/api/core";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.js";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

/**
 * Automated launch/home-route smoke handshake (BOOT-002). In smoke mode the
 * native shell waits for this ack, records it, and exits 0. Outside smoke
 * mode `app_mode` reports smoke=false and nothing happens.
 */
if ("__TAURI_INTERNALS__" in window) {
  requestAnimationFrame(() => {
    void invoke("app_mode")
      .then((mode: unknown) => {
        if (mode && typeof mode === "object" && "smoke" in mode && mode.smoke) {
          return invoke("smoke_ack", { note: "home-rendered" });
        }
        return undefined;
      })
      .catch(() => {
        // Smoke handshake failures must never affect normal startup.
      });
  });
}
