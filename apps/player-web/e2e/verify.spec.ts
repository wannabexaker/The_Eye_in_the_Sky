import { test } from "@playwright/test";

test("verify ouroboros image", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await page.getByText(/Continue as Guest/i).first().click({ timeout: 30_000 });
  await page.waitForTimeout(2500);

  const spin = page.locator(".spinCta").first();
  await spin.screenshot({ path: "screenshots/verify-spin.png" });

  await page.screenshot({
    path: "screenshots/verify-corner.png",
    clip: { x: 980, y: 520, width: 300, height: 280 },
  });
});
