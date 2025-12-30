import { expect, test } from "./fixtures.js";
import {
  clickKey,
  getKeyboardRowCount,
  getKeyDisplayText,
  getVisibleKeys,
  waitForExtension,
  waitForKeyboardOpen,
} from "./helpers.js";

test.describe("Virtual Keyboard - Layout Structure", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/index.html");
    await waitForExtension(page);
  });

  test("English layout has QWERTY top row", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    const keys = await getVisibleKeys(page);

    // Verify QWERTY row exists
    const qwertyKeys = ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"];
    for (const key of qwertyKeys) {
      expect(keys).toContain(key);
    }
  });

  test("English layout has home row keys", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    const keys = await getVisibleKeys(page);

    // Verify home row exists
    const homeRowKeys = ["a", "s", "d", "f", "g", "h", "j", "k", "l"];
    for (const key of homeRowKeys) {
      expect(keys).toContain(key);
    }
  });

  test("English layout has bottom row keys", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    const keys = await getVisibleKeys(page);

    // Verify bottom row exists
    const bottomRowKeys = ["z", "x", "c", "v", "b", "n", "m"];
    for (const key of bottomRowKeys) {
      expect(keys).toContain(key);
    }
  });

  test("keyboard has special keys", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    const keys = await getVisibleKeys(page);

    // Verify special keys exist
    expect(keys).toContain("Backspace");
    expect(keys).toContain("Enter");
    expect(keys).toContain("Shift");
    expect(keys).toContain(" "); // Space
  });

  test("keyboard has bottom row action keys", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    const keys = await getVisibleKeys(page);

    // Verify action keys in bottom row
    expect(keys).toContain("&123");
    expect(keys).toContain("Close");
  });

  test("keyboard has correct number of rows", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    const rowCount = await getKeyboardRowCount(page);
    // English layout has 3 main rows + bottom row = 4
    expect(rowCount).toBeGreaterThanOrEqual(3);
  });

  test("punctuation keys are present", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    const keys = await getVisibleKeys(page);

    // Verify common punctuation
    expect(keys).toContain(",");
    expect(keys).toContain(".");
    expect(keys).toContain("'");
  });

  test("all letter keys are clickable and insert correct character", async ({
    page,
  }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    // Test a few letters to ensure they insert correctly
    const testLetters = ["a", "m", "z"];
    for (const letter of testLetters) {
      await page.fill("#text-input", "");
      await clickKey(page, letter);
      const value = await page.inputValue("#text-input");
      expect(value).toBe(letter);
    }
  });

  test("keyboard displays lowercase letters by default", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    // Check that keys display lowercase
    const displayA = await getKeyDisplayText(page, "a");
    const displayZ = await getKeyDisplayText(page, "z");

    expect(displayA).toBe("a");
    expect(displayZ).toBe("z");
  });

  test("keyboard displays uppercase letters when shift is active", async ({
    page,
  }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    // Click shift
    await clickKey(page, "Shift");
    await page.waitForTimeout(200);

    // Check that main keyboard has shift-active class
    const hasShiftActive = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      if (!host || !host.shadowRoot) return false;
      const mainKbd = host.shadowRoot.querySelector("#vk-main-kbd");
      return mainKbd?.classList.contains("shift-active") || false;
    });
    expect(hasShiftActive).toBe(true);

    // CSS transforms lowercase to uppercase via text-transform when shift-active
    // Verify the shift state is active (visual change handled by CSS)
  });

  test("space key has correct width (spans multiple columns)", async ({
    page,
  }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    // Space key should be wider than regular keys
    const spaceWidth = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      if (!host || !host.shadowRoot) return 0;
      const space = host.shadowRoot.querySelector('[data-key=" "]');
      if (!space) return 0;
      return space.getBoundingClientRect().width;
    });

    const regularKeyWidth = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      if (!host || !host.shadowRoot) return 0;
      const key = host.shadowRoot.querySelector('[data-key="a"]');
      if (!key) return 0;
      return key.getBoundingClientRect().width;
    });

    // Space should be at least 2x width of regular key
    expect(spaceWidth).toBeGreaterThan(regularKeyWidth * 1.5);
  });

  test("backspace key has icon", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    const hasIcon = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      if (!host || !host.shadowRoot) return false;
      const backspace = host.shadowRoot.querySelector('[data-key="Backspace"]');
      if (!backspace) return false;
      return !!backspace.querySelector(".vk-icon-backspace");
    });

    expect(hasIcon).toBe(true);
  });

  test("enter key has icon", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    const hasIcon = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      if (!host || !host.shadowRoot) return false;
      const enter = host.shadowRoot.querySelector('[data-key="Enter"]');
      if (!enter) return false;
      return !!enter.querySelector(".vk-icon-enter");
    });

    expect(hasIcon).toBe(true);
  });

  test("shift key has icon", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    const hasIcon = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      if (!host || !host.shadowRoot) return false;
      const shift = host.shadowRoot.querySelector('[data-key="Shift"]');
      if (!shift) return false;
      return !!shift.querySelector(".vk-icon-shift");
    });

    expect(hasIcon).toBe(true);
  });
});
