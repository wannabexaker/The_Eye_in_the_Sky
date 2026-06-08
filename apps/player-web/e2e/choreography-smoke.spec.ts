import { expect, test, type Page } from "@playwright/test";

const SPIN_VIEWPORTS = [
  { name: "spin-phone-390x844", width: 390, height: 844 },
  { name: "spin-desktop-1366x768", width: 1366, height: 768 },
  { name: "spin-wide-1920x1080", width: 1920, height: 1080 }
] as const;

const enterGuestMode = async (page: Page) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Continue as Guest/i }).first().click({ timeout: 30_000 }).catch(() => {});
  await page.getByRole("button", { name: /Start Playing/i }).first().click({ timeout: 30_000 }).catch(() => {});
  await page.locator(".fluidShell .boardFrameMain").waitFor({ timeout: 30_000 });
  await page.waitForTimeout(900);
};

const ensurePlayableBalance = async (page: Page) => {
  const spinButton = page.locator(".spinCta").first();
  if (await spinButton.isEnabled()) {
    return;
  }

  await page.getByRole("button", { name: /^Deposit$/i }).first().click({ timeout: 10_000 });
  const depositModal = page.locator('.overlayModal[aria-label="Deposit Credits"]');
  await expect(depositModal).toBeVisible({ timeout: 10_000 });
  await page.getByRole("button", { name: /Confirm Deposit/i }).click();
  await expect(depositModal).toBeHidden({ timeout: 8_000 });
  await expect(spinButton).toBeEnabled({ timeout: 10_000 });
};

test("guest spin choreography completes without Pixi or audio runtime errors", async ({ page }) => {
  const runtimeIssues: string[] = [];

  page.on("console", (message) => {
    const text = message.text();
    if (/Pixi|resolver|AudioContext|WebAudio|Asset not found|Cannot read|choreography|sound/i.test(text)) {
      runtimeIssues.push(`${message.type()}: ${text}`);
    }
  });
  page.on("pageerror", (error) => {
    runtimeIssues.push(`pageerror: ${error.message}`);
  });

  for (const viewport of SPIN_VIEWPORTS) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await enterGuestMode(page);
    await ensurePlayableBalance(page);

    const spinButton = page.locator(".spinCta").first();
    await expect(spinButton, `${viewport.name} spin button initially enabled`).toBeEnabled({ timeout: 10_000 });
    await spinButton.click();
    await page
      .waitForFunction(() => document.querySelector(".spinCta")?.getAttribute("data-phase") !== "IDLE", null, {
        timeout: 3_000
      })
      .catch(() => {});
    await page.waitForFunction(() => document.querySelector(".spinCta")?.getAttribute("data-phase") === "IDLE", null, {
      timeout: 15_000
    });
    await page.waitForTimeout(500);
    await expect(page.locator(".pixiStage canvas").first(), `${viewport.name} canvas remains mounted`).toBeVisible();
  }

  expect(runtimeIssues).toEqual([]);
});
