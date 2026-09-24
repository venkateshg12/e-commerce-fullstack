import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    babel({ presets: [reactCompilerPreset()] }),
  ],
  resolve: {
    alias: {
      "@": path .resolve(__dirname, "./src"),
      // The package's `main` is its CommonJS build, for the Node backend. The browser can't read
      // named exports from CommonJS, so the client compiles the TypeScript source instead.
      "@repo/types": path.resolve(__dirname, "../../packages/types/src/index.ts"),
    },
  },
});
