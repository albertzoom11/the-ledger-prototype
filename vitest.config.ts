import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    /** Integration tests run against a throwaway SQLite file, never data/ledger.db. */
    env: {
      LEDGER_DB_PATH: path.resolve(__dirname, "data", "test.ledger.db"),
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
});
