import { test, expect } from "./fixtures.js";
import {
  waitForExtension,
  waitForKeyboardOpen,
  waitForKeyboardClose,
  isKeyboardOpen,
  clickKey,
  typeWithKeyboard,
  clickCloseButton,
} from "./helpers.js";

test.describe("Virtual Keyboard - Core Functionality", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/index.html");
    await waitForExtension(page);
  });

  test("keyboard opens when text input is focused", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    const isOpen = await isKeyboardOpen(page);
    expect(isOpen).toBe(true);
  });

  test("keyboard opens when textarea is focused", async ({ page }) => {
    await page.click("#textarea");
    await waitForKeyboardOpen(page);

    const isOpen = await isKeyboardOpen(page);
    expect(isOpen).toBe(true);
  });

  test("keyboard opens when search input is focused", async ({ page }) => {
    await page.click("#search-input");
    await waitForKeyboardOpen(page);

    const isOpen = await isKeyboardOpen(page);
    expect(isOpen).toBe(true);
  });

  test("keyboard opens when password input is focused", async ({ page }) => {
    await page.click("#password-input");
    await waitForKeyboardOpen(page);

    const isOpen = await isKeyboardOpen(page);
    expect(isOpen).toBe(true);
  });

  test("keyboard does NOT open for disabled input", async ({ page }) => {
    // Try to click disabled input
    await page.click("#disabled-input", { force: true });
    await page.waitForTimeout(1000);

    const isOpen = await isKeyboardOpen(page);
    expect(isOpen).toBe(false);
  });

  test("keyboard does NOT open for readonly input", async ({ page }) => {
    await page.click("#readonly-input");
    await page.waitForTimeout(1000);

    const isOpen = await isKeyboardOpen(page);
    expect(isOpen).toBe(false);
  });

  test("clicking X button closes the keyboard", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    await clickCloseButton(page);
    await waitForKeyboardClose(page);

    const isOpen = await isKeyboardOpen(page);
    expect(isOpen).toBe(false);
  });

  test("clicking outside keyboard closes it", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    // Click outside the keyboard (on the body)
    await page.click("h1");
    await waitForKeyboardClose(page);

    const isOpen = await isKeyboardOpen(page);
    expect(isOpen).toBe(false);
  });

  test("typing characters inserts them into input", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    await typeWithKeyboard(page, "hello");

    const value = await page.inputValue("#text-input");
    expect(value).toBe("hello");
  });

  test("typing uppercase characters works with shift", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    await typeWithKeyboard(page, "Hello");

    const value = await page.inputValue("#text-input");
    expect(value).toBe("Hello");
  });

  test("space key inserts space", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    await typeWithKeyboard(page, "hello world");

    const value = await page.inputValue("#text-input");
    expect(value).toBe("hello world");
  });

  test("backspace deletes characters", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    await typeWithKeyboard(page, "hello");
    await clickKey(page, "Backspace");
    await clickKey(page, "Backspace");

    const value = await page.inputValue("#text-input");
    expect(value).toBe("hel");
  });

  test("enter key submits form", async ({ page }) => {
    await page.click("#form-input");
    await waitForKeyboardOpen(page);

    await typeWithKeyboard(page, "test");
    await clickKey(page, "Enter");

    const result = await page.textContent("#form-result");
    expect(result).toBe("Submitted!");
  });

  test("enter key adds newline in textarea", async ({ page }) => {
    await page.click("#textarea");
    await waitForKeyboardOpen(page);

    await typeWithKeyboard(page, "line1");
    await clickKey(page, "Enter");
    await typeWithKeyboard(page, "line2");

    const value = await page.inputValue("#textarea");
    expect(value).toBe("line1\nline2");
  });

  test("switching between inputs keeps keyboard open", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    // Click another input
    await page.click("#search-input");
    await page.waitForTimeout(600); // Wait longer than close timer

    const isOpen = await isKeyboardOpen(page);
    expect(isOpen).toBe(true);
  });

  test("cursor position is respected when typing", async ({ page }) => {
    // Pre-fill input
    await page.fill("#text-input", "helloworld");
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    // Move cursor to middle (after 'hello')
    await page.evaluate(() => {
      const input = document.querySelector("#text-input");
      input.setSelectionRange(5, 5);
    });

    await typeWithKeyboard(page, " ");

    const value = await page.inputValue("#text-input");
    expect(value).toBe("hello world");
  });
});
