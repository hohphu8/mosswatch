import { test, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { PADS, WIDTH, HEIGHT } from "../../src/content.js";

const production = process.env.MOSSWATCH_PRODUCTION === "1";
async function selectPad(page, id, touch = false) {
  const tray = page.getByRole("button", {
    name: "Đóng bảng tháp",
    exact: true,
  });
  if (await tray.isVisible()) await tray.click();
  await page.locator("canvas").scrollIntoViewIfNeeded();
  const box = await page.locator("canvas").boundingBox();
  const pad = PADS[id];
  const x = box.x + (pad.x / WIDTH) * box.width,
    y = box.y + (pad.y / HEIGHT) * box.height;
  if (touch) await page.touchscreen.tap(x, y);
  else await page.mouse.click(x, y);
}
async function place(page, id, name) {
  await selectPad(page, id);
  await page.getByRole("button", { name, exact: true }).click();
  await page.getByRole("button", { name: /^Xây tháp/ }).click();
}
async function nextWave(page) {
  await page.getByRole("button", { name: /^Gọi đợt/ }).click();
  // Clock drives real requestAnimationFrame callbacks and gameplay, without mutating engine state.
  for (let i = 0; i < 20; i++) {
    await page.clock.runFor(2000);
    if ((await page.getByTestId("status").textContent()) !== "Đang phòng thủ")
      return;
  }
  throw Error("Wave did not finish within 120 simulated seconds at 3×.");
}
test("pointer building, upgrades, selling, restart confirmation and no remote runtime", async ({
  page,
}) => {
  const errors = [],
    remote = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (!new URL(request.url()).hostname.match(/^(127\.0\.0\.1|localhost)$/))
      remote.push(request.url());
  });
  await page.addInitScript(() => {
    window.__csp = [];
    document.addEventListener("securitypolicyviolation", (event) =>
      window.__csp.push(event.violatedDirective),
    );
  });
  await page.goto("/");
  await expect(page.getByTestId("money")).toHaveText("180");
  await place(page, 2, "Chòi Nỏ");
  await expect(page.getByTestId("money")).toHaveText("130");
  await expect(page.getByTestId("selection")).toHaveText("Chòi Nỏ · Cấp 1");
  await page.getByRole("button", { name: /^Nâng cấp/ }).click();
  await expect(page.getByTestId("money")).toHaveText("90");
  await expect(page.getByTestId("selection")).toHaveText("Chòi Nỏ · Cấp 2");
  await page.getByRole("button", { name: /^Bán tháp/ }).click();
  await expect(page.getByTestId("money")).toHaveText("153");
  await place(page, 4, "Pháo Hạt");
  await selectPad(page, 5);
  await expect(page.getByRole("button", { name: /^Xây tháp/ })).toBeDisabled();
  await page.getByRole("button", { name: "Chơi lại", exact: true }).click();
  await page.getByRole("button", { name: "Giữ trận này", exact: true }).click();
  await expect(page.getByTestId("money")).toHaveText("63");
  await page.getByRole("button", { name: "Chơi lại", exact: true }).click();
  await page.getByRole("button", { name: "Bắt đầu lại", exact: true }).click();
  await expect(page.getByTestId("money")).toHaveText("180");
  expect(errors).toEqual([]);
  expect(remote).toEqual([]);
  expect(await page.evaluate(() => window.__csp)).toEqual([]);
  if (production)
    expect(await page.evaluate(() => window.__mosswatch)).toBeUndefined();
});

test("five waves can be won through actual UI commands and the browser frame loop", async ({
  page,
}) => {
  test.setTimeout(180000);
  await page.clock.install();
  await page.goto("/");
  await place(page, 2, "Chòi Nỏ");
  await place(page, 4, "Chòi Nỏ");
  await place(page, 6, "Tháp Sương");
  await page.getByRole("button", { name: "3×", exact: true }).click();
  for (let wave = 1; wave <= 5; wave++) {
    if (wave > 1) {
      for (const pad of [2, 4]) {
        await selectPad(page, pad);
        const upgrade = page.getByRole("button", {
          name: /^Nâng cấp|^Đã đạt cấp/,
        });
        if (await upgrade.isEnabled()) await upgrade.click();
      }
      for (const pad of [9, 5, 0, 10]) {
        await selectPad(page, pad);
        if (
          (await page.getByTestId("selection").textContent()).includes(
            "sẵn sàng",
          ) &&
          Number(await page.getByTestId("money").textContent()) >= 90
        ) {
          await page
            .getByRole("button", { name: "Pháo Hạt", exact: true })
            .click();
          await page.getByRole("button", { name: /^Xây tháp/ }).click();
        }
      }
      for (const pad of [2, 4, 6, 9, 5, 0, 10]) {
        await selectPad(page, pad);
        const upgrade = page.getByRole("button", {
          name: /^Nâng cấp|^Đã đạt cấp/,
        });
        if ((await upgrade.isVisible()) && (await upgrade.isEnabled()))
          await upgrade.click();
      }
    }
    await nextWave(page);
    await expect(page.getByTestId("health")).not.toHaveText("0");
  }
  await expect(
    page.getByRole("heading", { name: "Khu rừng vẫn sáng." }),
  ).toBeVisible();
  await expect(page.getByTestId("status")).toHaveText("Khu rừng an toàn");
  await page.getByRole("button", { name: "Bắt đầu ca trực mới" }).click();
  await page.getByRole("button", { name: "Bắt đầu lại", exact: true }).click();
  await expect(page.getByTestId("health")).toHaveText("20");
  await expect(page.getByTestId("money")).toHaveText("180");
});

test("unprotected game loses and the result allows a clean replay", async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.clock.install();
  await page.goto("/");
  await page.getByRole("button", { name: "3×", exact: true }).click();
  await nextWave(page);
  await nextWave(page);
  await expect(page.getByTestId("health")).toHaveText("0");
  await expect(
    page.getByRole("heading", { name: "Thử một cách bố trí khác." }),
  ).toBeVisible();
  await expect(page.getByTestId("status")).toHaveText("Hạt sáng đã tắt");
  await page.getByRole("button", { name: "Bắt đầu ca trực mới" }).click();
  await page.getByRole("button", { name: "Bắt đầu lại", exact: true }).click();
  await place(page, 0, "Chòi Nỏ");
  await expect(page.getByTestId("money")).toHaveText("130");
});

test("pause, help, keyboard and tab visibility freeze the battle until explicit resume", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("/");
  await page.locator("summary").click();
  await page.getByRole("button", { name: "Ô 3: trống", exact: true }).focus();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: /^Xây tháp/ }).click();
  await page.getByRole("button", { name: /^Gọi đợt/ }).click();
  await page.clock.runFor(4000);
  await page.keyboard.press("p");
  await expect(page.getByTestId("status")).toHaveText("Đã tạm dừng");
  await selectPad(page, 0);
  await expect(page.getByTestId("selection")).toHaveText("Ô 1 · sẵn sàng xây");
  await page.getByRole("button", { name: /^Xây tháp/ }).click();
  await expect(page.getByTestId("selection")).toHaveText("Chòi Nỏ · Cấp 1");
  await expect(page.getByTestId("status")).toHaveText("Đã tạm dừng");
  const before = await page.locator("canvas").screenshot();
  await page.clock.runFor(3000);
  expect(await page.locator("canvas").screenshot()).toEqual(before);
  await page.getByRole("button", { name: "Cách chơi", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Cách chơi", exact: true }),
  ).toBeFocused();
  await expect(page.getByTestId("status")).toHaveText("Đã tạm dừng");
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.getByTestId("status")).toHaveText("Đã tạm dừng");
  await expect(page.locator(".pause-note")).toContainText("chuyển tab");
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.clock.runFor(1000);
  await expect(page.getByTestId("status")).toHaveText("Đã tạm dừng");
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  await expect(page.getByTestId("status")).toHaveText("Đang phòng thủ");
});

test("touch selection, responsive bounds, reduced motion and screenshot review", async ({
  browser,
  baseURL,
}, testInfo) => {
  const context = await browser.newContext({
    baseURL,
    hasTouch: true,
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  await page.goto("/");
  await selectPad(page, 2, true);
  await expect(page.getByTestId("selection")).toHaveText("Ô 3 · sẵn sàng xây");
  await page.getByRole("button", { name: /^Xây tháp/ }).tap();
  await expect(page.getByTestId("money")).toHaveText("130");
  await expect(
    page.getByRole("button", { name: "Đóng bảng tháp", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Đóng bảng tháp", exact: true }).tap();
  for (const width of [390, 320, 768, 1440]) {
    await page.setViewportSize({ width, height: width === 1440 ? 1100 : 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
  }
  if (testInfo.project.name === "chromium") {
    await mkdir(".local", { recursive: true });
    await page.screenshot({
      path: `.local/desktop-${production ? "prod" : "dev"}.png`,
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: `.local/mobile-${production ? "prod" : "dev"}.png`,
      fullPage: true,
    });
  }
  await context.close();
});

test("reactive bridge is bounded; repeated restarts and actual scope cleanup release the loop", async ({
  page,
}, testInfo) => {
  test.skip(
    production,
    "Dev-only lifecycle observation is intentionally absent from production.",
  );
  await page.clock.install();
  await page.goto("/");
  await place(page, 2, "Chòi Nỏ");
  await page.getByRole("button", { name: /^Gọi đợt/ }).click();
  const before = await page.evaluate(() => window.__mosswatch.inspect());
  await page.clock.runFor(5000);
  const after = await page.evaluate(() => window.__mosswatch.inspect());
  expect(after.steps - before.steps).toBeGreaterThan(250);
  expect(after.publications - before.publications).toBeLessThanOrEqual(51);
  expect(after.frames - before.frames).toBeGreaterThan(200);
  expect(after.pendingFrames).toBe(1);
  for (let i = 0; i < 8; i++) {
    await page.getByRole("button", { name: "Chơi lại", exact: true }).click();
    await page
      .getByRole("button", { name: "Bắt đầu lại", exact: true })
      .click();
    await page.getByRole("button", { name: /^Gọi đợt/ }).click();
    await page.clock.runFor(100);
    expect(
      (await page.evaluate(() => window.__mosswatch.inspect())).pendingFrames,
    ).toBe(1);
  }
  await page.evaluate(() => {
    window.__retired = window.__mosswatch;
    window.__retired.dispose();
  });
  const disposed = await page.evaluate(() => window.__retired.inspect());
  expect(disposed.alive).toBe(false);
  expect(disposed.pendingFrames).toBe(0);
  await page.clock.runFor(2000);
  await page.evaluate(() => {
    document.dispatchEvent(new Event("visibilitychange"));
    window.dispatchEvent(new Event("resize"));
  });
  expect(await page.evaluate(() => window.__retired.inspect())).toEqual(
    disposed,
  );
  expect(await page.evaluate(() => window.__mosswatch)).toBeUndefined();
  await mkdir(".local", { recursive: true });
  await writeFile(
    `.local/bridge-${testInfo.project.name}.json`,
    JSON.stringify(
      {
        before,
        after,
        disposed,
        note: "Playwright virtual clock, not a real-device FPS or heap benchmark.",
      },
      null,
      2,
    ),
  );
});
