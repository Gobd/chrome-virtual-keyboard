import { expect, test } from "./fixtures.js";
import {
  clickKey,
  clickNumbersToggle,
  typeWithKeyboard,
  waitForExtension,
  waitForKeyboardOpen,
} from "./helpers.js";

test.describe("Virtual Keyboard - Special Characters & Punctuation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/index.html");
    await waitForExtension(page);
  });

  test("comma key types comma", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    await clickKey(page, ",");

    const value = await page.inputValue("#text-input");
    expect(value).toBe(",");
  });

  test("period key types period", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    await clickKey(page, ".");

    const value = await page.inputValue("#text-input");
    expect(value).toBe(".");
  });

  test("apostrophe key types apostrophe", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    await clickKey(page, "'");

    const value = await page.inputValue("#text-input");
    expect(value).toBe("'");
  });

  test("question mark key types question mark (from symbols)", async ({
    page,
  }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    await clickNumbersToggle(page);
    await page.waitForTimeout(100);

    await clickKey(page, "?");

    const value = await page.inputValue("#text-input");
    expect(value).toBe("?");
  });

  test("exclamation mark key types exclamation mark (from symbols)", async ({
    page,
  }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    await clickNumbersToggle(page);
    await page.waitForTimeout(100);

    await clickKey(page, "!");

    const value = await page.inputValue("#text-input");
    expect(value).toBe("!");
  });

  test("at symbol works (from symbols keyboard)", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    await clickNumbersToggle(page);
    await page.waitForTimeout(100);

    await clickKey(page, "@");

    const value = await page.inputValue("#text-input");
    expect(value).toBe("@");
  });

  test("hash/pound symbol works", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    await clickNumbersToggle(page);
    await page.waitForTimeout(100);

    await clickKey(page, "#");

    const value = await page.inputValue("#text-input");
    expect(value).toBe("#");
  });

  test("dollar sign works", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    await clickNumbersToggle(page);
    await page.waitForTimeout(100);

    await clickKey(page, "$");

    const value = await page.inputValue("#text-input");
    expect(value).toBe("$");
  });

  test("percent sign works", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    await clickNumbersToggle(page);
    await page.waitForTimeout(100);

    await clickKey(page, "%");

    const value = await page.inputValue("#text-input");
    expect(value).toBe("%");
  });

  test("ampersand works", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    await clickNumbersToggle(page);
    await page.waitForTimeout(100);

    await clickKey(page, "&");

    const value = await page.inputValue("#text-input");
    expect(value).toBe("&");
  });

  test("hyphen/dash works", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    await clickNumbersToggle(page);
    await page.waitForTimeout(100);

    await clickKey(page, "-");

    const value = await page.inputValue("#text-input");
    expect(value).toBe("-");
  });

  test("plus sign works", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    await clickNumbersToggle(page);
    await page.waitForTimeout(100);

    await clickKey(page, "+");

    const value = await page.inputValue("#text-input");
    expect(value).toBe("+");
  });

  test("parentheses work", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    await clickNumbersToggle(page);
    await page.waitForTimeout(100);

    await clickKey(page, "(");
    await clickKey(page, ")");

    const value = await page.inputValue("#text-input");
    expect(value).toBe("()");
  });

  test("typing a sentence with mixed characters", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    // Type "Hello, world!"
    await typeWithKeyboard(page, "Hello");
    await clickKey(page, ",");
    await clickKey(page, " ");
    await typeWithKeyboard(page, "world");
    await clickNumbersToggle(page);
    await page.waitForTimeout(100);
    await clickKey(page, "!");

    const value = await page.inputValue("#text-input");
    expect(value).toBe("Hello, world!");
  });

  test("typing email format works", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    // Type "test@example.com"
    await typeWithKeyboard(page, "test");
    await clickNumbersToggle(page);
    await page.waitForTimeout(100);
    await clickKey(page, "@");
    await clickNumbersToggle(page);
    await page.waitForTimeout(100);
    await typeWithKeyboard(page, "example");
    await clickKey(page, ".");
    await typeWithKeyboard(page, "com");

    const value = await page.inputValue("#text-input");
    expect(value).toBe("test@example.com");
  });

  test("typing URL format works", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    // Type "https://test.com"
    await typeWithKeyboard(page, "https");
    await clickNumbersToggle(page);
    await page.waitForTimeout(100);
    await clickKey(page, ":");
    await clickKey(page, "/");
    await clickKey(page, "/");
    await clickNumbersToggle(page);
    await page.waitForTimeout(100);
    await typeWithKeyboard(page, "test");
    await clickKey(page, ".");
    await typeWithKeyboard(page, "com");

    const value = await page.inputValue("#text-input");
    expect(value).toBe("https://test.com");
  });

  test("asterisk works", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    await clickNumbersToggle(page);
    await page.waitForTimeout(100);

    await clickKey(page, "*");

    const value = await page.inputValue("#text-input");
    expect(value).toBe("*");
  });

  test("equals sign works", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    await clickNumbersToggle(page);
    await page.waitForTimeout(100);

    await clickKey(page, "=");

    const value = await page.inputValue("#text-input");
    expect(value).toBe("=");
  });

  test("underscore works", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    await clickNumbersToggle(page);
    await page.waitForTimeout(100);

    await clickKey(page, "_");

    const value = await page.inputValue("#text-input");
    expect(value).toBe("_");
  });

  test("typing math expression works", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    await clickNumbersToggle(page);
    await page.waitForTimeout(100);

    // Type "5+3=8"
    await clickKey(page, "5");
    await clickKey(page, "+");
    await clickKey(page, "3");
    await clickKey(page, "=");
    await clickKey(page, "8");

    const value = await page.inputValue("#text-input");
    expect(value).toBe("5+3=8");
  });

  test("colon works", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    await clickNumbersToggle(page);
    await page.waitForTimeout(100);

    await clickKey(page, ":");

    const value = await page.inputValue("#text-input");
    expect(value).toBe(":");
  });

  test("semicolon works", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    await clickNumbersToggle(page);
    await page.waitForTimeout(100);

    await clickKey(page, ";");

    const value = await page.inputValue("#text-input");
    expect(value).toBe(";");
  });

  test("forward slash works", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    await clickNumbersToggle(page);
    await page.waitForTimeout(100);

    await clickKey(page, "/");

    const value = await page.inputValue("#text-input");
    expect(value).toBe("/");
  });
});
