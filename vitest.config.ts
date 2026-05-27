import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // Workaround: `@aliimam/logos@1.0.3` ships a `package.json` whose
      // `main` field points at a non-existent `dist/index.cjs`, so Vite's
      // import-analysis pass fails when a test transitively imports it
      // (e.g. via `project-showcase → brand-icons`). Next.js's build
      // honours the `module` field and works fine; here we redirect the
      // bare specifier to the ESM bundle that actually exists on disk.
      "@aliimam/logos": fileURLToPath(
        new URL(
          "./node_modules/@aliimam/logos/dist/index.mjs",
          import.meta.url,
        ),
      ),
    },
  },
  test: {
    environment: "jsdom",
    globals: false,
    setupFiles: ["./vitest.setup.ts"],
    css: true,
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
});
