import { test } from "@playwright/test";

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
