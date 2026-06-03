import { expect, test } from "@playwright/test";

const VIEWPORTS = [
  { name: "360x640", width: 360, height: 640 },
  { name: "390x844", width: 390, height: 844 },
  { name: "412x915", width: 412, height: 915 },
  { name: "800x1280", width: 800, height: 1280 },
  { name: "1366x768", width: 1366, height: 768 },
  { name: "1920x1080", width: 1920, height: 1080 },
  { name: "844x390", width: 844, height: 390 },
  { name: "1280x800", width: 1280, height: 800 }
] as const;

const enterGuestMode = async (page: import("@playwright/test").Page) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Continue as Guest/i }).first().click({ timeout: 8_000 }).catch(() => {});
  await page.getByRole("button", { name: /Start Playing/i }).first().click({ timeout: 8_000 }).catch(() => {});
  await page.locator(".fluidShell .boardFrameMain").waitFor({ timeout: 30_000 });
  await page.waitForTimeout(900);
};

test("fluid shell has no viewport loss or overlaps", async ({ page }) => {
  for (const viewport of VIEWPORTS) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await enterGuestMode(page);

    const metrics = await page.evaluate(() => {
      const viewportBox = {
        left: 0,
        top: 0,
        right: window.innerWidth,
        bottom: window.innerHeight,
        width: window.innerWidth,
        height: window.innerHeight
      };

      const visible = (element: Element) => {
        const style = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return (
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          Number.parseFloat(style.opacity || "1") > 0 &&
          rect.width > 0 &&
          rect.height > 0
        );
      };

      const rectFor = (selector: string) => {
        const element = document.querySelector(selector);
        if (!element || !visible(element)) {
          return null;
        }
        const rect = element.getBoundingClientRect();
        return {
          selector,
          left: rect.left,
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
          width: rect.width,
          height: rect.height
        };
      };

      const insideViewport = (rect: ReturnType<typeof rectFor>) =>
        Boolean(
          rect &&
            rect.left >= -1 &&
            rect.top >= -1 &&
            rect.right <= viewportBox.right + 1 &&
            rect.bottom <= viewportBox.bottom + 1
        );

      const intersectionArea = (
        a: NonNullable<ReturnType<typeof rectFor>>,
        b: NonNullable<ReturnType<typeof rectFor>>
      ) => {
        const width = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
        const height = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
        return width * height;
      };

      const zoneSelectors = [
        ".fluidShell > .brandingRail",
        ".fluidShell > .centerStage",
        ".fluidShell > .supportRail",
        ".fluidShell > .floatingGameDock"
      ];
      const panelSelectors = [
        ".supportRail .treasuryBlock",
        ".supportRail .supportBalanceBlock",
        ".supportRail .supportMeterBlock, .supportRail .constellationTriggerBlock",
        ".supportRail .supportStatusBlock",
        ".supportRail .supportHistoryBlock"
      ];
      const boardSelectors = [".boardFrameMain", ".pixiStage canvas"];
      const controlSelectors = [
        ".spinCta",
        ".dockBetCluster",
        ".dockAutoCluster",
        ".supportRail .walletAction"
      ];

      const zones = zoneSelectors.map(rectFor).filter(Boolean) as NonNullable<ReturnType<typeof rectFor>>[];
      const panels = panelSelectors.map(rectFor);
      const board = boardSelectors.map(rectFor);
      const controlGroups = controlSelectors.map(rectFor);
      const visibleControls = Array.from(
        document.querySelectorAll(".supportRail button, .supportRail input, .floatingGameDock button, .floatingGameDock input")
      ).filter(visible).map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          selector: element.className.toString() || element.getAttribute("aria-label") || element.tagName,
          left: rect.left,
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
          width: rect.width,
          height: rect.height
        };
      });

      const zoneOverlaps: string[] = [];
      for (let i = 0; i < zones.length; i += 1) {
        for (let j = i + 1; j < zones.length; j += 1) {
          if (intersectionArea(zones[i], zones[j]) > 1) {
            zoneOverlaps.push(`${zones[i].selector} overlaps ${zones[j].selector}`);
          }
        }
      }

      const visiblePanelRects = panels.filter(Boolean) as NonNullable<ReturnType<typeof rectFor>>[];
      const panelOverlaps: string[] = [];
      for (let i = 0; i < visiblePanelRects.length; i += 1) {
        for (let j = i + 1; j < visiblePanelRects.length; j += 1) {
          if (intersectionArea(visiblePanelRects[i], visiblePanelRects[j]) > 1) {
            panelOverlaps.push(`${visiblePanelRects[i].selector} overlaps ${visiblePanelRects[j].selector}`);
          }
        }
      }

      return {
        horizontalOverflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth,
        zonesInViewport: zones.every(insideViewport),
        panelsPresent: panels.every(Boolean),
        panelsInViewport: panels.every(insideViewport),
        boardVisible: board.every(Boolean),
        boardInViewport: board.every(insideViewport),
        controlGroupsPresent: controlGroups.every(Boolean),
        controlGroupsInViewport: controlGroups.every(insideViewport),
        controlsInViewport: visibleControls.every((rect) => insideViewport(rect)),
        zoneOverlaps,
        panelOverlaps,
        zones,
        panels,
        board,
        controlGroups,
        visibleControls
      };
    });

    console.log(`${viewport.name}: ${JSON.stringify(metrics)}`);

    expect(metrics.horizontalOverflow, `${viewport.name} horizontal overflow`).toBeLessThanOrEqual(1);
    expect(metrics.zonesInViewport, `${viewport.name} zones inside viewport`).toBe(true);
    expect(metrics.panelsPresent, `${viewport.name} all panels present`).toBe(true);
    expect(metrics.panelsInViewport, `${viewport.name} panels inside viewport`).toBe(true);
    expect(metrics.boardVisible, `${viewport.name} board visible`).toBe(true);
    expect(metrics.boardInViewport, `${viewport.name} board inside viewport`).toBe(true);
    expect(metrics.controlGroupsPresent, `${viewport.name} control groups present`).toBe(true);
    expect(metrics.controlGroupsInViewport, `${viewport.name} control groups inside viewport`).toBe(true);
    expect(metrics.controlsInViewport, `${viewport.name} every visible control inside viewport`).toBe(true);
    expect(metrics.zoneOverlaps, `${viewport.name} zone overlaps`).toEqual([]);
    expect(metrics.panelOverlaps, `${viewport.name} panel overlaps`).toEqual([]);

    await page.screenshot({ path: `screenshots/fluid-${viewport.name}.png`, fullPage: false });
  }
});
