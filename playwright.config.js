import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  workers: 1,
  reporter: [["list"], ["json", { outputFile: "test-results/browser.json" }]],
  use: {
    baseURL: "http://localhost:3002",
    channel: process.env.PLAYWRIGHT_CHANNEL || "chrome",
    headless: true,
  },
  webServer: {
    command:
      "node --env-file-if-exists=backend/.env.test backend/src/server.js",
    port: 3002,
    reuseExistingServer: false,
    env: {
      PORT: "3002",
      APP_ORIGIN: "http://localhost:3002",
      SERVE_FRONTEND: "true",
      HOST: "127.0.0.1",
    },
  },
});
