import { expect, test } from "./fixtures.js";
import {
  clickCloseButton,
  clickKey,
  clickNumbersToggle,
  isKeyboardOpen,
  isNumberBarVisible,
  typeWithKeyboard,
  waitForExtension,
  waitForKeyboardClose,
  waitForKeyboardOpen,
} from "./helpers.js";

test.describe("Virtual Keyboard - Number Bar", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/index.html");
    await waitForExtension(page);
  });

  test("number bar is visible by default", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    const isVisible = await isNumberBarVisible(page);
    expect(isVisible).toBe(true);
  });

  test("can type numbers from number bar", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    // Click number keys in the top number bar
    await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      const bar = host.shadowRoot.querySelector("#vk-number-bar");
      const key1 = bar.querySelector('[data-key="1"]');
      const key2 = bar.querySelector('[data-key="2"]');
      const key3 = bar.querySelector('[data-key="3"]');
      key1?.click();
      key2?.click();
      key3?.click();
    });

    await page.waitForTimeout(100);
    const value = await page.inputValue("#text-input");
    expect(value).toBe("123");
  });

  test("number bar has all digits 1-0", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    const digits = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      if (!host || !host.shadowRoot) return [];
      const bar = host.shadowRoot.querySelector("#vk-number-bar");
      if (!bar) return [];
      const keys = bar.querySelectorAll(".vk-key");
      return Array.from(keys).map((k) => k.getAttribute("data-key"));
    });

    expect(digits).toContain("1");
    expect(digits).toContain("2");
    expect(digits).toContain("3");
    expect(digits).toContain("4");
    expect(digits).toContain("5");
    expect(digits).toContain("6");
    expect(digits).toContain("7");
    expect(digits).toContain("8");
    expect(digits).toContain("9");
    expect(digits).toContain("0");
  });
});

test.describe("Virtual Keyboard - URL Input Type", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/index.html");
    await waitForExtension(page);
  });

  test("keyboard opens for URL input", async ({ page }) => {
    await page.click("#url-input");
    await waitForKeyboardOpen(page);

    const isOpen = await isKeyboardOpen(page);
    expect(isOpen).toBe(true);
  });

  test("can type URL in URL input", async ({ page }) => {
    await page.click("#url-input");
    await waitForKeyboardOpen(page);

    await typeWithKeyboard(page, "https");

    const value = await page.inputValue("#url-input");
    expect(value).toBe("https");
  });

  test("URL input shows URL button (not .com)", async ({ page }) => {
    await page.click("#url-input");
    await waitForKeyboardOpen(page);

    const buttonText = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      if (!host || !host.shadowRoot) return "";
      const btn = host.shadowRoot.querySelector("#vk-url-btn span");
      return btn?.textContent || "";
    });

    expect(buttonText).toBe("URL");
  });
});

test.describe("Virtual Keyboard - Password Input", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/index.html");
    await waitForExtension(page);
  });

  test("keyboard opens for password input", async ({ page }) => {
    await page.click("#password-input");
    await waitForKeyboardOpen(page);

    const isOpen = await isKeyboardOpen(page);
    expect(isOpen).toBe(true);
  });

  test("can type in password input", async ({ page }) => {
    await page.click("#password-input");
    await waitForKeyboardOpen(page);

    await typeWithKeyboard(page, "secret");

    const value = await page.inputValue("#password-input");
    expect(value).toBe("secret");
  });

  test("password input shows regular keyboard (not number pad)", async ({
    page,
  }) => {
    await page.click("#password-input");
    await waitForKeyboardOpen(page);

    // Should show letter keys, not number pad
    const hasLetters = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      if (!host || !host.shadowRoot) return false;
      const keyA = host.shadowRoot.querySelector('[data-key="a"]');
      return keyA !== null;
    });

    expect(hasLetters).toBe(true);
  });

  test("shift works in password input", async ({ page }) => {
    await page.click("#password-input");
    await waitForKeyboardOpen(page);

    await clickKey(page, "Shift");
    await clickKey(page, "p");
    await typeWithKeyboard(page, "ass");

    const value = await page.inputValue("#password-input");
    expect(value).toBe("Pass");
  });
});

test.describe("Virtual Keyboard - Search Input", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/index.html");
    await waitForExtension(page);
  });

  test("keyboard opens for search input", async ({ page }) => {
    await page.click("#search-input");
    await waitForKeyboardOpen(page);

    const isOpen = await isKeyboardOpen(page);
    expect(isOpen).toBe(true);
  });

  test("can type in search input", async ({ page }) => {
    await page.click("#search-input");
    await waitForKeyboardOpen(page);

    await typeWithKeyboard(page, "query");

    const value = await page.inputValue("#search-input");
    expect(value).toBe("query");
  });

  test("backspace works in search input", async ({ page }) => {
    await page.click("#search-input");
    await waitForKeyboardOpen(page);

    await typeWithKeyboard(page, "test");
    await clickKey(page, "Backspace");

    const value = await page.inputValue("#search-input");
    expect(value).toBe("tes");
  });
});

test.describe("Virtual Keyboard - Keyboard State", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/index.html");
    await waitForExtension(page);
  });

  test("keyboard state is closed initially", async ({ page }) => {
    const isOpen = await isKeyboardOpen(page);
    expect(isOpen).toBe(false);
  });

  test("keyboard state changes to open when input focused", async ({
    page,
  }) => {
    const beforeOpen = await isKeyboardOpen(page);
    expect(beforeOpen).toBe(false);

    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    const afterOpen = await isKeyboardOpen(page);
    expect(afterOpen).toBe(true);
  });

  test("keyboard state changes to closed when close clicked", async ({
    page,
  }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    await clickCloseButton(page);
    await waitForKeyboardClose(page);

    const isOpen = await isKeyboardOpen(page);
    expect(isOpen).toBe(false);
  });

  test("keyboard has data-state attribute", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    const state = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      if (!host || !host.shadowRoot) return "";
      const keyboard = host.shadowRoot.querySelector("#virtual-keyboard");
      return keyboard?.dataset.state || "";
    });

    expect(state).toBe("open");
  });

  test("keyboard transitions between inputs smoothly", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    await typeWithKeyboard(page, "a");

    // Switch to another input
    await page.click("#search-input");
    await page.waitForTimeout(200);

    // Should still be open
    const isOpen = await isKeyboardOpen(page);
    expect(isOpen).toBe(true);

    // Type in new input
    await typeWithKeyboard(page, "b");

    const searchValue = await page.inputValue("#search-input");
    expect(searchValue).toBe("b");
  });
});

test.describe("Virtual Keyboard - Bottom Row", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/index.html");
    await waitForExtension(page);
  });

  test("bottom row has &123 button", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    const has123 = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      if (!host || !host.shadowRoot) return false;
      return host.shadowRoot.querySelector('[data-key="&123"]') !== null;
    });

    expect(has123).toBe(true);
  });

  test("bottom row has space bar", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    const hasSpace = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      if (!host || !host.shadowRoot) return false;
      return host.shadowRoot.querySelector('[data-key=" "]') !== null;
    });

    expect(hasSpace).toBe(true);
  });

  test("bottom row has close button", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    const hasClose = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      if (!host || !host.shadowRoot) return false;
      return host.shadowRoot.querySelector('[data-key="Close"]') !== null;
    });

    expect(hasClose).toBe(true);
  });

  test("&123 button toggles numbers keyboard", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    // Check main keyboard is visible
    const mainVisible = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      if (!host || !host.shadowRoot) return false;
      const main = host.shadowRoot.querySelector("#vk-main-kbd-ph");
      if (!main) return false;
      return window.getComputedStyle(main).display !== "none";
    });
    expect(mainVisible).toBe(true);

    // Click &123
    await clickNumbersToggle(page);
    await page.waitForTimeout(100);

    // Check numbers keyboard is visible
    const numbersVisible = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      if (!host || !host.shadowRoot) return false;
      const numbers = host.shadowRoot.querySelector("#vk-main-numbers");
      if (!numbers) return false;
      return window.getComputedStyle(numbers).display !== "none";
    });
    expect(numbersVisible).toBe(true);
  });
});

test.describe("Virtual Keyboard - Typing Edge Cases", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/index.html");
    await waitForExtension(page);
  });

  test("typing in empty input works", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    await typeWithKeyboard(page, "x");

    const value = await page.inputValue("#text-input");
    expect(value).toBe("x");
  });

  test("typing multiple words works", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    await typeWithKeyboard(page, "hello world test");

    const value = await page.inputValue("#text-input");
    expect(value).toBe("hello world test");
  });

  test("backspace on empty input does nothing", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    // Input is empty, backspace should do nothing
    await clickKey(page, "Backspace");
    await page.waitForTimeout(100);

    const value = await page.inputValue("#text-input");
    expect(value).toBe("");
  });

  test("can clear entire input with backspace", async ({ page }) => {
    await page.fill("#text-input", "abc");
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    await clickKey(page, "Backspace");
    await clickKey(page, "Backspace");
    await clickKey(page, "Backspace");

    const value = await page.inputValue("#text-input");
    expect(value).toBe("");
  });

  test("rapid typing works correctly", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    // Type rapidly
    for (const char of "abcdef") {
      await clickKey(page, char);
    }

    const value = await page.inputValue("#text-input");
    expect(value).toBe("abcdef");
  });

  test("alternating shift and letters works", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    // Type "AbCd" with alternating case
    await clickKey(page, "Shift");
    await clickKey(page, "a");
    await clickKey(page, "b");
    await clickKey(page, "Shift");
    await clickKey(page, "c");
    await clickKey(page, "d");

    const value = await page.inputValue("#text-input");
    expect(value).toBe("AbCd");
  });
});

test.describe("Virtual Keyboard - Special Key Interactions", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/index.html");
    await waitForExtension(page);
  });

  test("settings button exists and is clickable", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    const settingsExists = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      if (!host || !host.shadowRoot) return false;
      const btn = host.shadowRoot.querySelector("#vk-settings-btn");
      return btn !== null;
    });

    expect(settingsExists).toBe(true);
  });

  test("URL button exists", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    const urlExists = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      if (!host || !host.shadowRoot) return false;
      const btn = host.shadowRoot.querySelector("#vk-url-btn");
      return btn !== null;
    });

    expect(urlExists).toBe(true);
  });

  test("shift keys exist on both sides", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    const shiftCount = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      if (!host || !host.shadowRoot) return 0;
      const shifts = host.shadowRoot.querySelectorAll('[data-key="Shift"]');
      return shifts.length;
    });

    // Should have 2 shift keys (left and right)
    expect(shiftCount).toBe(2);
  });

  test("clicking either shift key activates shift", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    // Click the second shift key (right side)
    await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      const shifts = host.shadowRoot.querySelectorAll('[data-key="Shift"]');
      if (shifts.length > 1) shifts[1].click();
    });
    await page.waitForTimeout(100);

    // Verify shift is active
    const shiftActive = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      if (!host || !host.shadowRoot) return false;
      const mainKbd = host.shadowRoot.querySelector("#vk-main-kbd");
      return mainKbd?.classList.contains("shift-active") || false;
    });

    expect(shiftActive).toBe(true);
  });
});
