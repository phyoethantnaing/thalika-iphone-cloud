import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser", fullyParallel: false, workers: 1, timeout: 90_000,
  use: { baseURL: "http://127.0.0.1:3100", trace: "retain-on-failure" },
  projects: [{ name: "iphone-webkit", use: { ...devices["iPhone 13"], browserName: "webkit", launchOptions: process.env.THALIKA_WEBKIT_EXECUTABLE ? { executablePath: process.env.THALIKA_WEBKIT_EXECUTABLE } : {} } }, { name: "mobile-chromium", use: { ...devices["Pixel 7"], browserName: "chromium" } }],
  webServer: { command: "node tests/e2e-server.mjs", url: "http://127.0.0.1:3100/api/health", timeout: 60_000, reuseExistingServer: false }
});
