import { expect, test } from "./fixtures.js";
import {
  clickCloseButton,
  clickUrlButton,
  getUrlBarValue,
  isKeyboardOpen,
  isUrlBarOpen,
  typeWithKeyboard,
  waitForExtension,
  waitForKeyboardClose,
  waitForKeyboardOpen,
} from "./helpers.js";

test.describe("Virtual Keyboard - URL Bar", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/index.html");
    await waitForExtension(page);
  });

  test("URL button opens URL bar", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    await clickUrlButton(page);
    await page.waitForTimeout(300);

    const isOpen = await isUrlBarOpen(page);
    expect(isOpen).toBe(true);
  });

  test("URL bar is initially empty", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    await clickUrlButton(page);
    await page.waitForTimeout(300);

    const value = await getUrlBarValue(page);
    expect(value).toBe("");
  });

  test("can type URL in URL bar", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    await clickUrlButton(page);
    await page.waitForTimeout(300);

    await typeWithKeyboard(page, "example");

    const value = await getUrlBarValue(page);
    expect(value).toBe("example");
  });

  test("URL bar clears when keyboard closes", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    // Open URL bar and type something
    await clickUrlButton(page);
    await page.waitForTimeout(300);
    await typeWithKeyboard(page, "test");

    // Close keyboard
    await clickCloseButton(page);
    await waitForKeyboardClose(page);

    // Reopen keyboard and URL bar
    await page.click("#text-input");
    await waitForKeyboardOpen(page);
    await clickUrlButton(page);
    await page.waitForTimeout(300);

    const value = await getUrlBarValue(page);
    expect(value).toBe("");
  });

  test("URL bar clears when clicking outside", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    // Open URL bar and type something
    await clickUrlButton(page);
    await page.waitForTimeout(300);
    await typeWithKeyboard(page, "test");

    // Click outside to close
    await page.click("h1");
    await waitForKeyboardClose(page);

    // Reopen and check URL bar is cleared
    await page.click("#text-input");
    await waitForKeyboardOpen(page);
    await clickUrlButton(page);
    await page.waitForTimeout(300);

    const value = await getUrlBarValue(page);
    expect(value).toBe("");
  });

  test("URL bar shows when URL button is clicked", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    // URL bar should be hidden initially
    let isOpen = await isUrlBarOpen(page);
    expect(isOpen).toBe(false);

    // Click URL button
    await clickUrlButton(page);
    await page.waitForTimeout(300);

    isOpen = await isUrlBarOpen(page);
    expect(isOpen).toBe(true);
  });

  test("keyboard stays open while URL bar is focused", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    await clickUrlButton(page);
    await page.waitForTimeout(500);

    // Wait a bit to ensure it doesn't auto-close
    await page.waitForTimeout(1000);

    const isOpen = await isKeyboardOpen(page);
    expect(isOpen).toBe(true);
  });

  test("backspace works in URL bar", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    await clickUrlButton(page);
    await page.waitForTimeout(300);

    await typeWithKeyboard(page, "hello");

    // Use evaluate to click backspace since we're in URL bar context
    await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      const backspace = host.shadowRoot.querySelector(".vk-icon-backspace");
      backspace.closest(".vk-key").click();
    });
    await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      const backspace = host.shadowRoot.querySelector(".vk-icon-backspace");
      backspace.closest(".vk-key").click();
    });

    const value = await getUrlBarValue(page);
    expect(value).toBe("hel");
  });
});
