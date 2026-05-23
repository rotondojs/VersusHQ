import { defineConfig, devices } from "@playwright/test";

/* global process */ // TODO: is there a better way to avoid making ESLint angry?
export default defineConfig({
  // Where the tests live, relative to this file
  testDir: "./tests/e2e",

  // Fail the build on CI if you accidentally left test.only in the source code.
  forbidOnly: !!process.env.CI,

  // The HTML reporter gives nice, pretty reports
  reporter: process.env.CI ? "dot" : [["html", { outputFolder: "playwright-report" }]],

  // No parallelism (slower, but can avoid errors with overlapping tests)
  workers: 1,

  timeout: 60000,

  // In CI, React + Chakra UI + socket.io initialization can be slow.
  // Raise the default assertion timeout so toBeVisible() / toBeEnabled() etc.
  // have enough time to observe the element.
  expect: { timeout: 15000 },

  // Settings that we'd rather set once, rather than in every test file
  use: {
    baseURL: "http://localhost:4530",
    // Give each individual action (click, fill, …) up to 30 s in CI.
    actionTimeout: 30000,
  },

  // Just test with chrome
  projects: [{ name: "chromium", use: devices["Desktop Chrome"] }],

  // This sets up the two-server development environment that we recommend,
  // the Vite frontend server that the tests will connect to, and the Express
  // server that serves API requests. The `reuseExistingServer` option means
  // that, if you already have your development environment running, tests
  // will just operate on that running server instead of starting a new
  // server.
  webServer: [
    {
      name: "Frontend",
      cwd: "..",
      command: process.env.CI ? "npm run preview -w=client" : "npm run dev -w=client",
      reuseExistingServer: !process.env.CI,
      url: "http://localhost:4530",
      timeout: 120000,
    },
    {
      name: "Server",
      cwd: "..",
      command: "npm run dev -w=server",
      reuseExistingServer: !process.env.CI,
      url: "http://localhost:8000",
      timeout: 120000,
    },
  ],
});
