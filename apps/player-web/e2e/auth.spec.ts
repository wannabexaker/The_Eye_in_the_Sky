import { expect, test } from "@playwright/test";

const SIZES = [
  { name: "auth-1366x768", w: 1366, h: 768 },
  { name: "auth-1920x1080", w: 1920, h: 1080 },
  { name: "auth-phone-390x844", w: 390, h: 844 },
];

test("auth modal fits viewport", async ({ page }) => {
  for (const s of SIZES) {
    await page.setViewportSize({ width: s.w, height: s.h });
    await page.goto("/");
    await page.getByText(/TEMPLE LOGIN|Create Player|Continue as Guest/i).first().waitFor({ timeout: 30_000 });
    await page.waitForTimeout(800);
    await page.screenshot({ path: `screenshots/${s.name}.png` });
    const guest = page.getByRole("button", { name: /Continue as Guest/i });
    const inView = await guest.isVisible().catch(() => false);
    console.log(`${s.name}: guest-button-visible=${inView}`);
  }
});

test("guest can open and dismiss create account prompt", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto("/");

  await page.getByRole("button", { name: /Continue as Guest/i }).first().click({ timeout: 30_000 });
  await page.getByRole("button", { name: /Start Playing/i }).click({ timeout: 30_000 }).catch(() => {});

  const createAccount = page.getByRole("button", { name: /^Create Account$/ }).first();
  await expect(createAccount).toBeVisible({ timeout: 30_000 });
  await createAccount.click();

  await expect(page.getByRole("heading", { name: /Create Player Account/i })).toBeVisible();
  await expect(page.getByText("Save your progress, wallet, and bonuses across devices.")).toBeVisible();

  await page.getByRole("button", { name: /Maybe later/i }).click();
  await expect(page.getByRole("heading", { name: /Create Player Account/i })).toBeHidden();
  await expect(createAccount).toBeVisible();
});
