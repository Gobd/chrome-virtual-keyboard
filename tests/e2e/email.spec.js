import { expect, test } from "./fixtures.js";
import {
  clickKey,
  clickUrlButton,
  getUrlButtonText,
  isEmailKeyVisible,
  typeWithKeyboard,
  waitForExtension,
  waitForKeyboardOpen,
} from "./helpers.js";

test.describe("Virtual Keyboard - Email Input", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/index.html");
    await waitForExtension(page);
  });

  test("email input shows @ key", async ({ page }) => {
    await page.click("#email-input");
    await waitForKeyboardOpen(page);

    const isVisible = await isEmailKeyVisible(page);
    expect(isVisible).toBe(true);
  });

  test("text input hides @ key", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    const isVisible = await isEmailKeyVisible(page);
    expect(isVisible).toBe(false);
  });

  test("email input shows .com button instead of URL", async ({ page }) => {
    await page.click("#email-input");
    await waitForKeyboardOpen(page);

    const buttonText = await getUrlButtonText(page);
    expect(buttonText).toBe(".com");
  });

  test("text input shows URL button", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    const buttonText = await getUrlButtonText(page);
    expect(buttonText).toBe("URL");
  });

  test("clicking .com button inserts .com in email input", async ({ page }) => {
    await page.click("#email-input");
    await waitForKeyboardOpen(page);

    await typeWithKeyboard(page, "test");
    await clickUrlButton(page);

    const value = await page.inputValue("#email-input");
    expect(value).toBe("test.com");
  });

  test("@ key types @ symbol", async ({ page }) => {
    await page.click("#email-input");
    await waitForKeyboardOpen(page);

    await typeWithKeyboard(page, "user");
    await clickKey(page, "@");
    await typeWithKeyboard(page, "example");
    await clickUrlButton(page); // .com

    const value = await page.inputValue("#email-input");
    expect(value).toBe("user@example.com");
  });

  test("valid email format can be typed", async ({ page }) => {
    await page.click("#email-input");
    await waitForKeyboardOpen(page);

    // Type a complete email
    await typeWithKeyboard(page, "john");
    await clickKey(page, ".");
    await typeWithKeyboard(page, "doe");
    await clickKey(page, "@");
    await typeWithKeyboard(page, "gmail");
    await clickUrlButton(page);

    const value = await page.inputValue("#email-input");
    expect(value).toBe("john.doe@gmail.com");
  });

  test("switching from email to text input changes button back to URL", async ({
    page,
  }) => {
    // First focus email input
    await page.click("#email-input");
    await waitForKeyboardOpen(page);

    let buttonText = await getUrlButtonText(page);
    expect(buttonText).toBe(".com");

    // Now focus text input
    await page.click("#text-input");
    await page.waitForTimeout(100);

    buttonText = await getUrlButtonText(page);
    expect(buttonText).toBe("URL");
  });

  test("switching from text to email input changes button to .com", async ({
    page,
  }) => {
    // First focus text input
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    let buttonText = await getUrlButtonText(page);
    expect(buttonText).toBe("URL");

    // Now focus email input
    await page.click("#email-input");
    await page.waitForTimeout(100);

    buttonText = await getUrlButtonText(page);
    expect(buttonText).toBe(".com");
  });
});
