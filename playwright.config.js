import { defineConfig } from "@playwright/test";
const production = process.env.MOSSWATCH_PRODUCTION === "1";
const port = production ? 4231 : 4230;
export default defineConfig({
  testDir: "./tests/browser",
  timeout: 60000,
  workers: 1,
  forbidOnly: !!process.env.CI,
  outputDir: `test-results/${production ? "production" : "development"}`,
  reporter: [
    ["list"],
    [
      "json",
      {
        outputFile: `.local/${production ? "production" : "development"}-results.json`,
      },
    ],
  ],
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        browserName: "chromium",
        channel: process.platform === "win32" ? "chrome" : undefined,
      },
    },
    { name: "firefox", use: { browserName: "firefox" } },
    { name: "webkit", use: { browserName: "webkit" } },
  ],
  webServer: {
    command: `node node_modules/vite/bin/vite.js ${production ? "preview " : ""}--host 127.0.0.1 --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
    timeout: 60000,
  },
});
