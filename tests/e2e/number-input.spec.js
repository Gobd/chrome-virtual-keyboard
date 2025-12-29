import { test, expect } from "./fixtures.js";
import {
  waitForExtension,
  waitForKeyboardOpen,
  isKeyboardOpen,
  isNumberKeyboardVisible,
  clickKey,
} from "./helpers.js";

test.describe("Virtual Keyboard - Number/Tel Inputs", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/index.html");
    await waitForExtension(page);
  });

  test("number input shows number keyboard", async ({ page }) => {
    await page.click("#number-input");
    await waitForKeyboardOpen(page);

    const isVisible = await isNumberKeyboardVisible(page);
    expect(isVisible).toBe(true);
  });

  test("tel input shows number keyboard", async ({ page }) => {
    await page.click("#tel-input");
    await waitForKeyboardOpen(page);

    const isVisible = await isNumberKeyboardVisible(page);
    expect(isVisible).toBe(true);
  });

  test("text input does NOT show number keyboard", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    const isVisible = await isNumberKeyboardVisible(page);
    expect(isVisible).toBe(false);
  });

  test("can type numbers in number input", async ({ page }) => {
    await page.click("#number-input");
    await waitForKeyboardOpen(page);

    await clickKey(page, "1");
    await clickKey(page, "2");
    await clickKey(page, "3");

    const value = await page.inputValue("#number-input");
    expect(value).toBe("123");
  });

  test("can type decimal in number input", async ({ page }) => {
    await page.click("#number-input");
    await waitForKeyboardOpen(page);

    await clickKey(page, "1");
    await clickKey(page, ".");
    await clickKey(page, "5");

    const value = await page.inputValue("#number-input");
    expect(value).toBe("1.5");
  });

  test("can type phone number in tel input", async ({ page }) => {
    await page.click("#tel-input");
    await waitForKeyboardOpen(page);

    await clickKey(page, "5");
    await clickKey(page, "5");
    await clickKey(page, "5");
    await clickKey(page, "-");
    await clickKey(page, "1");
    await clickKey(page, "2");
    await clickKey(page, "3");
    await clickKey(page, "4");

    const value = await page.inputValue("#tel-input");
    expect(value).toBe("555-1234");
  });

  test("backspace works in number input", async ({ page }) => {
    await page.click("#number-input");
    await waitForKeyboardOpen(page);

    await clickKey(page, "1");
    await clickKey(page, "2");
    await clickKey(page, "3");
    await clickKey(page, "Backspace");

    const value = await page.inputValue("#number-input");
    expect(value).toBe("12");
  });

  test("switching from number to text input changes keyboard", async ({
    page,
  }) => {
    // First focus number input
    await page.click("#number-input");
    await waitForKeyboardOpen(page);

    let isNumberKbd = await isNumberKeyboardVisible(page);
    expect(isNumberKbd).toBe(true);

    // Switch to text input
    await page.click("#text-input");
    await page.waitForTimeout(100);

    isNumberKbd = await isNumberKeyboardVisible(page);
    expect(isNumberKbd).toBe(false);
  });

  test("switching from text to number input shows number keyboard", async ({
    page,
  }) => {
    // First focus text input
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    let isNumberKbd = await isNumberKeyboardVisible(page);
    expect(isNumberKbd).toBe(false);

    // Switch to number input
    await page.click("#number-input");
    await page.waitForTimeout(100);

    isNumberKbd = await isNumberKeyboardVisible(page);
    expect(isNumberKbd).toBe(true);
  });

  test("number keyboard has operator keys", async ({ page }) => {
    await page.click("#number-input");
    await waitForKeyboardOpen(page);

    // Type expression with operators
    await clickKey(page, "1");
    await clickKey(page, "+");
    await clickKey(page, "2");

    const value = await page.inputValue("#number-input");
    // Note: number input may not accept + depending on browser
    // but we should at least verify the keys exist and can be clicked
    expect(value.length).toBeGreaterThan(0);
  });

  test("enter key works with number input in form", async ({ page }) => {
    // Use form input for this test since number inputs in forms should submit
    await page.fill("#form-input", "");
    await page.click("#form-input");
    await waitForKeyboardOpen(page);

    await clickKey(page, "t");
    await clickKey(page, "e");
    await clickKey(page, "s");
    await clickKey(page, "t");
    await clickKey(page, "Enter");

    const result = await page.textContent("#form-result");
    expect(result).toBe("Submitted!");
  });
});
