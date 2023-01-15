import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    setupFiles: [],
    testTimeout: 20000,
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@threadline/domain": path.resolve(__dirname, "packages/domain/dist/index.js"),
      "@threadline/database": path.resolve(__dirname, "packages/database/dist/index.js"),
      "@threadline/security": path.resolve(__dirname, "packages/security/dist/index.js"),
      "@threadline/document-security": path.resolve(__dirname, "packages/document-security/dist/index.js"),
      "@threadline/measurement-engine": path.resolve(__dirname, "packages/measurement-engine/dist/index.js"),
    },
  },
});
