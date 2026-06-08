import { test, type Page } from "@playwright/test";

/*
Device matrix for the responsive overhaul. Each entry is captured as a
screenshot and checked for horizontal overflow (a common responsive break).
Portrait + landscape are both represented, plus the short-height landscape
phone case that the legacy shell handled poorly.
*/
const VIEWPORTS = [
  { name: "phone-360x640", width: 360, height: 640 },
  { name: "phone-390x844", width: 390, height: 844 },
  { name: "phone-412x915", width: 412, height: 915 },
  { name: "phone-landscape-844x390", width: 844, height: 390 },
  { name: "tablet-portrait-800x1280", width: 800, height: 1280 },
  { name: "tablet-landscape-1280x800", width: 1280, height: 800 },
  { name: "laptop-1366x768", width: 1366, height: 768 },
  { name: "laptop-1440x900", width: 1440, height: 900 },
  { name: "desktop-1920x1080", width: 1920, height: 1080 },
  { name: "desktop-2560x1440", width: 2560, height: 1440 },
];

async function enterGuest(page: Page) {
  await page.goto("/");
  const guestBtn = page.getByRole("button", { name: "Continue as Guest" });
  await guestBtn.waitFor({ state: "visible", timeout: 30_000 });
  await guestBtn.click();
  await page.locator(".slotViewport").first().waitFor({ state: "visible", timeout: 15_000 });
  await page.waitForTimeout(1200); // let the Pixi board settle
}

test("responsive screenshot matrix", async ({ page }) => {
  await enterGuest(page);

  const report: string[] = [];
  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.waitForTimeout(700);
    await page.screenshot({ path: `screenshots/${vp.name}.png`, fullPage: false });

    const overflow = await page.evaluate(() => ({
      x: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      y: document.documentElement.scrollHeight - document.documentElement.clientHeight,
    }));
    report.push(`${vp.name.padEnd(28)} h-overflow=${overflow.x}px  v-overflow=${overflow.y}px`);
  }

  console.log("\n=== RESPONSIVE OVERFLOW REPORT ===\n" + report.join("\n") + "\n");
});
