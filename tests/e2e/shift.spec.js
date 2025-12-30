import { expect, test } from "./fixtures.js";
import {
  clickKey,
  isShiftActive,
  waitForExtension,
  waitForKeyboardOpen,
} from "./helpers.js";

test.describe("Virtual Keyboard - Shift Behavior", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/index.html");
    await waitForExtension(page);
  });

  test("shift is not active by default", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    const shiftActive = await isShiftActive(page);
    expect(shiftActive).toBe(false);
  });

  test("clicking shift activates shift mode", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    await clickKey(page, "Shift");
    await page.waitForTimeout(100);

    const shiftActive = await isShiftActive(page);
    expect(shiftActive).toBe(true);
  });

  test("shift auto-releases after typing a character", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    await clickKey(page, "Shift");
    await page.waitForTimeout(100);

    // Type a character
    await clickKey(page, "a");
    await page.waitForTimeout(100);

    // Shift should auto-release
    const shiftActive = await isShiftActive(page);
    expect(shiftActive).toBe(false);
  });

  test("shift produces uppercase letter", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    await clickKey(page, "Shift");
    await clickKey(page, "a");

    const value = await page.inputValue("#text-input");
    expect(value).toBe("A");
  });

  test("double-tap shift toggles shift off", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    // First shift turns it on
    await clickKey(page, "Shift");
    await page.waitForTimeout(100);
    expect(await isShiftActive(page)).toBe(true);

    // Second shift turns it off
    await clickKey(page, "Shift");
    await page.waitForTimeout(100);
    expect(await isShiftActive(page)).toBe(false);
  });

  test("shift toggles on and off without typing", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    // Toggle on
    await clickKey(page, "Shift");
    await page.waitForTimeout(100);
    expect(await isShiftActive(page)).toBe(true);

    // Toggle off
    await clickKey(page, "Shift");
    await page.waitForTimeout(100);
    expect(await isShiftActive(page)).toBe(false);

    // Toggle on again
    await clickKey(page, "Shift");
    await page.waitForTimeout(100);
    expect(await isShiftActive(page)).toBe(true);
  });

  test("each uppercase letter requires separate shift", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    // To type ABC, need to shift before each letter
    await clickKey(page, "Shift");
    await clickKey(page, "a");
    await clickKey(page, "Shift");
    await clickKey(page, "b");
    await clickKey(page, "Shift");
    await clickKey(page, "c");

    const value = await page.inputValue("#text-input");
    expect(value).toBe("ABC");
  });

  test("shift state shown via CSS class", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    // Check no shift-active class initially
    let hasClass = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      if (!host || !host.shadowRoot) return false;
      const mainKbd = host.shadowRoot.querySelector("#vk-main-kbd");
      return mainKbd?.classList.contains("shift-active") || false;
    });
    expect(hasClass).toBe(false);

    // Activate shift
    await clickKey(page, "Shift");
    await page.waitForTimeout(100);

    // Check shift-active class is added
    hasClass = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      if (!host || !host.shadowRoot) return false;
      const mainKbd = host.shadowRoot.querySelector("#vk-main-kbd");
      return mainKbd?.classList.contains("shift-active") || false;
    });
    expect(hasClass).toBe(true);
  });

  test("shift auto-releases after typing letter", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    await clickKey(page, "Shift");
    await page.waitForTimeout(100);
    expect(await isShiftActive(page)).toBe(true);

    // Type a letter
    await clickKey(page, "a");
    await page.waitForTimeout(100);

    // Shift should auto-release
    expect(await isShiftActive(page)).toBe(false);
  });

  test("backspace works regardless of shift state", async ({ page }) => {
    await page.fill("#text-input", "hello");
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    await clickKey(page, "Shift");
    await page.waitForTimeout(100);

    // Press backspace - should still delete
    await clickKey(page, "Backspace");
    await page.waitForTimeout(100);

    // Verify backspace worked
    const value = await page.inputValue("#text-input");
    expect(value).toBe("hell");
  });

  test("mixed case typing works correctly", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    // Type "Hello" - H uppercase, ello lowercase
    await clickKey(page, "Shift");
    await clickKey(page, "h");
    await clickKey(page, "e");
    await clickKey(page, "l");
    await clickKey(page, "l");
    await clickKey(page, "o");

    const value = await page.inputValue("#text-input");
    expect(value).toBe("Hello");
  });

  test("shift works with punctuation keys that have shift variants", async ({
    page,
  }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    // Type comma without shift
    await clickKey(page, ",");

    // Verify comma was typed
    let value = await page.inputValue("#text-input");
    expect(value).toBe(",");

    await page.fill("#text-input", "");

    // Type with shift - should still be comma (no shift variant in English)
    await clickKey(page, "Shift");
    await clickKey(page, ",");

    value = await page.inputValue("#text-input");
    // In English layout, comma doesn't change with shift
    expect(value.length).toBe(1);
  });

  test("shift indicator is visually distinguishable", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    // Check main keyboard doesn't have shift-active class before shift
    const beforeHasClass = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      if (!host || !host.shadowRoot) return false;
      const mainKbd = host.shadowRoot.querySelector("#vk-main-kbd");
      return mainKbd?.classList.contains("shift-active") || false;
    });
    expect(beforeHasClass).toBe(false);

    // Activate shift
    await clickKey(page, "Shift");
    await page.waitForTimeout(100);

    // Check main keyboard has shift-active class after shift
    const afterHasClass = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      if (!host || !host.shadowRoot) return false;
      const mainKbd = host.shadowRoot.querySelector("#vk-main-kbd");
      return mainKbd?.classList.contains("shift-active") || false;
    });
    expect(afterHasClass).toBe(true);
  });

  test("keyboard main container has shift-active class when shift is on", async ({
    page,
  }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    // Check main kbd doesn't have shift-active class (shift-active is on #vk-main-kbd)
    let hasClass = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      if (!host || !host.shadowRoot) return false;
      const mainKbd = host.shadowRoot.querySelector("#vk-main-kbd");
      return mainKbd?.classList.contains("shift-active") || false;
    });
    expect(hasClass).toBe(false);

    // Activate shift
    await clickKey(page, "Shift");
    await page.waitForTimeout(100);

    // Check main kbd has shift-active class
    hasClass = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      if (!host || !host.shadowRoot) return false;
      const mainKbd = host.shadowRoot.querySelector("#vk-main-kbd");
      return mainKbd?.classList.contains("shift-active") || false;
    });
    expect(hasClass).toBe(true);
  });
});
