import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./tests/utils/setup.ts"],
    globalSetup: ["./tests/integration/setup/global-setup.ts"],
    include: ["tests/integration/**/*.test.ts"],
    pool: "forks",
    maxWorkers: 1,
    minWorkers: 1,
    testTimeout: 30000,
    hookTimeout: 60000,
  },
});
