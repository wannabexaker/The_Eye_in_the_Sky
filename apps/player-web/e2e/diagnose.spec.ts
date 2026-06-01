import { test, type Page } from "@playwright/test";

// Diagnostic-only: zoom into the spin dock, left rail, and guest badge so the
// exact truncation / visibility issues are observable. Not part of the matrix.

async function enterGuest(page: Page) {
  await page.goto("/");
  const guestBtn = page.getByRole("button", { name: "Continue as Guest" });
  await guestBtn.waitFor({ state: "visible", timeout: 30_000 });
  await guestBtn.click();
  await page.locator(".slotViewport").first().waitFor({ state: "visible", timeout: 15_000 });
  await page.waitForTimeout(1200);
}

test("diagnose desktop regions", async ({ page }) => {
  await enterGuest(page);
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.waitForTimeout(600);

  const dock = page.locator(".floatingGameDock").first();
  if (await dock.count()) await dock.screenshot({ path: "screenshots/diag-spin-dock.png" });

  const spin = page.locator(".spinCta").first();
  if (await spin.count()) await spin.screenshot({ path: "screenshots/diag-spin-cta.png" });

  // bottom-right corner context (dock + protruding spin)
  await page.screenshot({
    path: "screenshots/diag-corner.png",
    clip: { x: 1500, y: 760, width: 420, height: 320 },
  });

  const rail = page.locator(".leftRail").first();
  if (await rail.count()) await rail.screenshot({ path: "screenshots/diag-left-rail.png" });

  const badge = page.locator(".guestSessionBadge, .guestSessionChip").first();
  if (await badge.count()) await badge.screenshot({ path: "screenshots/diag-guest-badge.png" });
});
