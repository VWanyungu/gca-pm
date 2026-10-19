import { defineConfig, devices } from "@playwright/test";

// Runs against the already-running local dev servers (frontend :3001, backend :3000).
// No webServer / no DB reseed — we rely on the seeded users already present (see TEST-CASES.md).
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:3001",
    screenshot: "only-on-failure",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
