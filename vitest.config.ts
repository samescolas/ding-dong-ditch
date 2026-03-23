import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "client/src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts", "client/src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "client/src/**/*.test.ts", "src/public/**"],
    },
  },
});
