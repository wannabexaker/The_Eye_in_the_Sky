import { defineConfig } from "@playwright/test";

/*
Responsive screenshot harness. Drives the player shell across the device matrix
(phones, tablets, laptops, desktops; portrait + landscape) so responsive
regressions are caught visually instead of by eyeballing one window.

Run:  corepack pnpm --filter player-web exec playwright test
The dev server is reused if already running; otherwise it is started.
*/
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  timeout: 120_000,
  use: {
    baseURL: "http://localhost:3000",
    headless: true,
  },
  webServer: {
    command: "corepack pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
