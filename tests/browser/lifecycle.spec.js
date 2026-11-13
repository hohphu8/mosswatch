import { test, expect } from "@playwright/test";

test("repeated actual unmount/remount releases observers, shortcuts and frames", async ({
  page,
}) => {
  test.skip(
    process.env.MOSSWATCH_PRODUCTION === "1",
    "Explicit mount observation is dev-only.",
  );
  await page.addInitScript(() => {
    const Native = window.ResizeObserver;
    window.__observing = new Set();
    window.ResizeObserver = class extends Native {
      observe(target, options) {
        window.__observing.add(this);
        return super.observe(target, options);
      }
      disconnect() {
        window.__observing.delete(this);
        return super.disconnect();
      }
    };
  });
  await page.clock.install();
  await page.goto("/");
  const initialObservers = await page.evaluate(() => window.__observing.size);
  expect(initialObservers).toBe(1);
  for (let i = 0; i < 6; i++) {
    await expect(page.getByTestId("money")).toHaveText("180");
    await page.getByRole("button", { name: /^Gọi đợt/ }).click();
    await page.clock.runFor(200);
    await page.keyboard.press("p");
    await expect(page.getByTestId("status")).toHaveText("Đã tạm dừng");
    await page.keyboard.press("p");
    await expect(page.getByTestId("status")).toHaveText("Đang phòng thủ");
    await page.evaluate(() => {
      window.__old = window.__mosswatch;
      window.__old.dispose();
    });
    expect(await page.evaluate(() => window.__observing.size)).toBe(0);
    const retired = await page.evaluate(() => window.__old.inspect());
    expect(retired.pendingFrames).toBe(0);
    expect(
      await page.evaluate(() => {
        const event = new KeyboardEvent("keydown", {
          key: "p",
          bubbles: true,
          cancelable: true,
        });
        document.body.dispatchEvent(event);
        return event.defaultPrevented;
      }),
    ).toBe(false);
    await page.clock.runFor(200);
    expect(await page.evaluate(() => window.__old.inspect())).toEqual(retired);
    await page.evaluate(() => window.__old.remount());
    await expect(page.getByTestId("status")).toHaveText("Giờ chuẩn bị");
    expect(await page.evaluate(() => window.__observing.size)).toBe(
      initialObservers,
    );
  }
});

test("Canvas creation failure is visible and leaves start/build disabled", async ({
  page,
}) => {
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.getContext = () => null;
  });
  await page.goto("/");
  await expect(page.getByRole("alert")).toContainText("Canvas 2D");
  await expect(page.getByRole("button", { name: /^Gọi đợt/ })).toBeDisabled();
  await page.locator("summary").click();
  await page.getByRole("button", { name: "Ô 1: trống", exact: true }).click();
  await expect(page.getByRole("button", { name: /^Xây tháp/ })).toBeDisabled();
  await page.getByRole("button", { name: "Cách chơi", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
});
