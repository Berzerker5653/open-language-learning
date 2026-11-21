import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "node_modules/**",
      "target/**",
      "dist/**",
      ".venv/**",
      "**/dist/**",
      "apps/desktop/src-tauri/**",
      "tools/**",
      "audit/**",
      "tmp/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // Dev tooling under scripts/ runs in Node (the MOBILE-UX-001 evidence
    // capture); browser libs are not its environment.
    files: ["scripts/**/*.mjs"],
    languageOptions: {
      globals: {
        process: "readonly",
        console: "readonly",
        setTimeout: "readonly",
        Buffer: "readonly",
        WebSocket: "readonly",
      },
    },
  },
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
);
