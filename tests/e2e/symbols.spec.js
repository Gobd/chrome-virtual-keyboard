import { expect, test } from "./fixtures.js";
import {
  clickKey,
  clickNumbersToggle,
  getNumbersKeyboardKeys,
  getVisibleKeys,
  isNumbersModeActive,
  waitForExtension,
  waitForKeyboardOpen,
} from "./helpers.js";

test.describe("Virtual Keyboard - Numbers/Symbols Mode", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/index.html");
    await waitForExtension(page);
  });

  test("numbers mode is not active by default", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    const numbersActive = await isNumbersModeActive(page);
    expect(numbersActive).toBe(false);
  });

  test("clicking &123 activates numbers mode", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    await clickNumbersToggle(page);
    await page.waitForTimeout(100);

    const numbersActive = await isNumbersModeActive(page);
    expect(numbersActive).toBe(true);
  });

  test("clicking &123 again deactivates numbers mode", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    // Activate
    await clickNumbersToggle(page);
    await page.waitForTimeout(100);

    // Deactivate
    await clickNumbersToggle(page);
    await page.waitForTimeout(100);

    const numbersActive = await isNumbersModeActive(page);
    expect(numbersActive).toBe(false);
  });

  test("numbers keyboard has digit keys", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    await clickNumbersToggle(page);
    await page.waitForTimeout(100);

    const keys = await getNumbersKeyboardKeys(page);

    // Verify all digits present
    for (let i = 0; i <= 9; i++) {
      expect(keys).toContain(String(i));
    }
  });

  test("numbers keyboard has common symbols", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    await clickNumbersToggle(page);
    await page.waitForTimeout(100);

    const keys = await getNumbersKeyboardKeys(page);

    // Verify common symbols
    const expectedSymbols = ["@", "#", "$", "%", "&", "-", "+", "(", ")"];
    for (const symbol of expectedSymbols) {
      expect(keys).toContain(symbol);
    }
  });

  test("can type numbers from numbers keyboard", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    await clickNumbersToggle(page);
    await page.waitForTimeout(100);

    // Type some numbers
    await clickKey(page, "1");
    await clickKey(page, "2");
    await clickKey(page, "3");

    const value = await page.inputValue("#text-input");
    expect(value).toBe("123");
  });

  test("can type symbols from numbers keyboard", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    await clickNumbersToggle(page);
    await page.waitForTimeout(100);

    // Type some symbols
    await clickKey(page, "@");
    await clickKey(page, "#");

    const value = await page.inputValue("#text-input");
    expect(value).toBe("@#");
  });

  test("backspace works in numbers mode", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    await clickNumbersToggle(page);
    await page.waitForTimeout(100);

    await clickKey(page, "1");
    await clickKey(page, "2");
    await clickKey(page, "3");
    await clickKey(page, "Backspace");

    const value = await page.inputValue("#text-input");
    expect(value).toBe("12");
  });

  test("space works in numbers mode", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    await clickNumbersToggle(page);
    await page.waitForTimeout(100);

    await clickKey(page, "1");
    await clickKey(page, " ");
    await clickKey(page, "2");

    const value = await page.inputValue("#text-input");
    expect(value).toBe("1 2");
  });

  test("enter works in numbers mode (submits form)", async ({ page }) => {
    await page.click("#form-input");
    await waitForKeyboardOpen(page);

    await clickNumbersToggle(page);
    await page.waitForTimeout(100);

    await clickKey(page, "1");
    await clickKey(page, "Enter");

    const result = await page.textContent("#form-result");
    expect(result).toBe("Submitted!");
  });

  test("numbers mode persists across typing until toggled off", async ({
    page,
  }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    await clickNumbersToggle(page);
    await page.waitForTimeout(100);

    // Type multiple characters
    await clickKey(page, "1");
    await clickKey(page, "2");
    await clickKey(page, "3");

    // Should still be in numbers mode
    const numbersActive = await isNumbersModeActive(page);
    expect(numbersActive).toBe(true);
  });

  test("ABC button returns to letter keyboard", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    // Go to numbers mode
    await clickNumbersToggle(page);
    await page.waitForTimeout(100);

    // Numbers keyboard should have ABC button to go back
    // The toggle is the same button but shows different text
    await clickNumbersToggle(page);
    await page.waitForTimeout(100);

    const numbersActive = await isNumbersModeActive(page);
    expect(numbersActive).toBe(false);

    // Letter keys should be visible again
    const keys = await getVisibleKeys(page);
    expect(keys).toContain("a");
  });

  test("close button works in numbers mode", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    await clickNumbersToggle(page);
    await page.waitForTimeout(100);

    await clickKey(page, "Close");
    await page.waitForTimeout(500);

    const isOpen = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      if (!host || !host.shadowRoot) return false;
      const keyboard = host.shadowRoot.querySelector("#virtual-keyboard");
      return keyboard?.dataset.state === "open";
    });
    expect(isOpen).toBe(false);
  });

  test("switching inputs resets to letter mode", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    // Go to numbers mode
    await clickNumbersToggle(page);
    await page.waitForTimeout(100);

    // Switch to different input
    await page.click("#search-input");
    await page.waitForTimeout(200);

    // Should be back in letter mode
    const numbersActive = await isNumbersModeActive(page);
    expect(numbersActive).toBe(false);
  });

  test("numbers keyboard has punctuation marks", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    await clickNumbersToggle(page);
    await page.waitForTimeout(100);

    const keys = await getNumbersKeyboardKeys(page);

    // Common punctuation should be available
    const punctuation = ["!", "?", ".", ","];
    for (const p of punctuation) {
      expect(keys).toContain(p);
    }
  });

  test("typing parentheses works correctly", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    await clickNumbersToggle(page);
    await page.waitForTimeout(100);

    await clickKey(page, "(");
    await clickKey(page, "1");
    await clickKey(page, "+");
    await clickKey(page, "2");
    await clickKey(page, ")");

    const value = await page.inputValue("#text-input");
    expect(value).toBe("(1+2)");
  });

  test("mixed letter and number typing works", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    // Type letters
    await clickKey(page, "a");
    await clickKey(page, "b");

    // Switch to numbers
    await clickNumbersToggle(page);
    await page.waitForTimeout(100);
    await clickKey(page, "1");
    await clickKey(page, "2");

    // Switch back to letters
    await clickNumbersToggle(page);
    await page.waitForTimeout(100);
    await clickKey(page, "c");

    const value = await page.inputValue("#text-input");
    expect(value).toBe("ab12c");
  });
});
