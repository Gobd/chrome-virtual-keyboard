import { test, expect } from "./fixtures.js";
import {
  waitForExtension,
  waitForKeyboardOpen,
  waitForKeyboardClose,
  clickKey,
  typeWithKeyboard,
  clickCloseButton,
  clickNumbersToggle,
} from "./helpers.js";

test.describe("Virtual Keyboard - Number Keyboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/index.html");
    await waitForExtension(page);
  });

  test("number keyboard has operator keys", async ({ page }) => {
    await page.click("#number-input");
    await waitForKeyboardOpen(page);

    const hasOperators = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      const numPad = host.shadowRoot.querySelector("#vk-number-bar-input");
      const keys = numPad?.querySelectorAll(".vk-key") || [];
      const keyValues = Array.from(keys).map((k) => k.getAttribute("data-key"));
      return keyValues.includes("+") && keyValues.includes("-");
    });

    expect(hasOperators).toBe(true);
  });

  test("number keyboard has parentheses", async ({ page }) => {
    await page.click("#number-input");
    await waitForKeyboardOpen(page);

    const hasParens = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      const numPad = host.shadowRoot.querySelector("#vk-number-bar-input");
      const keys = numPad?.querySelectorAll(".vk-key") || [];
      const keyValues = Array.from(keys).map((k) => k.getAttribute("data-key"));
      return keyValues.includes("(") && keyValues.includes(")");
    });

    expect(hasParens).toBe(true);
  });

  test("number keyboard has decimal point", async ({ page }) => {
    await page.click("#number-input");
    await waitForKeyboardOpen(page);

    const hasDot = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      const numPad = host.shadowRoot.querySelector("#vk-number-bar-input");
      return numPad?.querySelector('[data-key="."]') !== null;
    });

    expect(hasDot).toBe(true);
  });

  test("can type decimal numbers", async ({ page }) => {
    await page.click("#number-input");
    await waitForKeyboardOpen(page);

    await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      const numPad = host.shadowRoot.querySelector("#vk-number-bar-input");
      numPad.querySelector('[data-key="1"]')?.click();
      numPad.querySelector('[data-key="."]')?.click();
      numPad.querySelector('[data-key="5"]')?.click();
    });
    await page.waitForTimeout(100);

    const value = await page.inputValue("#number-input");
    expect(value).toBe("1.5");
  });

  test("number keyboard enter closes keyboard", async ({ page }) => {
    await page.click("#number-input");
    await waitForKeyboardOpen(page);

    await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      const numPad = host.shadowRoot.querySelector("#vk-number-bar-input");
      numPad.querySelector('[data-key="Enter"]')?.click();
    });
    await waitForKeyboardClose(page);

    const isClosed = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      return host?.shadowRoot?.querySelector("#virtual-keyboard")?.dataset.state === "closed";
    });
    expect(isClosed).toBe(true);
  });
});

test.describe("Virtual Keyboard - Tel Input", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/index.html");
    await waitForExtension(page);
  });

  test("tel input shows number pad", async ({ page }) => {
    await page.click("#tel-input");
    await waitForKeyboardOpen(page);

    const numPadVisible = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      const numPad = host.shadowRoot.querySelector("#vk-number-bar-input");
      return numPad?.style.display !== "none";
    });

    expect(numPadVisible).toBe(true);
  });

  test("can type phone number with dashes", async ({ page }) => {
    await page.click("#tel-input");
    await waitForKeyboardOpen(page);

    await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      const numPad = host.shadowRoot.querySelector("#vk-number-bar-input");
      numPad.querySelector('[data-key="5"]')?.click();
      numPad.querySelector('[data-key="5"]')?.click();
      numPad.querySelector('[data-key="5"]')?.click();
      numPad.querySelector('[data-key="-"]')?.click();
      numPad.querySelector('[data-key="1"]')?.click();
      numPad.querySelector('[data-key="2"]')?.click();
      numPad.querySelector('[data-key="3"]')?.click();
      numPad.querySelector('[data-key="4"]')?.click();
    });
    await page.waitForTimeout(100);

    const value = await page.inputValue("#tel-input");
    expect(value).toBe("555-1234");
  });
});

test.describe("Virtual Keyboard - Settings Button", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/index.html");
    await waitForExtension(page);
  });

  test("settings button exists", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    const exists = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      return host.shadowRoot.querySelector("#vk-settings-btn") !== null;
    });

    expect(exists).toBe(true);
  });

  test("settings button is clickable button", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    const isButton = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      const btn = host.shadowRoot.querySelector("#vk-settings-btn");
      return btn?.tagName === "BUTTON";
    });

    expect(isButton).toBe(true);
  });
});

test.describe("Virtual Keyboard - Language Overlay", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/index.html");
    await waitForExtension(page);
  });

  test("language overlay exists in DOM", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    const exists = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      return host.shadowRoot.querySelector("#vk-overlay-language") !== null;
    });

    expect(exists).toBe(true);
  });

  test("language overlay is closed by default", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    const isClosed = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      const overlay = host.shadowRoot.querySelector("#vk-overlay-language");
      return overlay?.dataset.state === "closed";
    });

    expect(isClosed).toBe(true);
  });
});

test.describe("Virtual Keyboard - Symbols Keyboard Characters", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/index.html");
    await waitForExtension(page);
  });

  test("symbols keyboard has currency symbols", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);
    await clickNumbersToggle(page);
    await page.waitForTimeout(100);

    const hasCurrency = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      const numbers = host.shadowRoot.querySelector("#vk-main-numbers");
      const keys = numbers?.querySelectorAll(".vk-key") || [];
      const keyValues = Array.from(keys).map((k) => k.getAttribute("data-key"));
      return keyValues.includes("$") && keyValues.includes("€") && keyValues.includes("£");
    });

    expect(hasCurrency).toBe(true);
  });

  test("symbols keyboard has brackets", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);
    await clickNumbersToggle(page);
    await page.waitForTimeout(100);

    const hasBrackets = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      const numbers = host.shadowRoot.querySelector("#vk-main-numbers");
      const keys = numbers?.querySelectorAll(".vk-key") || [];
      const keyValues = Array.from(keys).map((k) => k.getAttribute("data-key"));
      return keyValues.includes("[") && keyValues.includes("]") &&
             keyValues.includes("{") && keyValues.includes("}");
    });

    expect(hasBrackets).toBe(true);
  });

  test("can type math expression", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);
    await clickNumbersToggle(page);
    await page.waitForTimeout(100);

    await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      const numbers = host.shadowRoot.querySelector("#vk-main-numbers");
      numbers.querySelector('[data-key="1"]')?.click();
      numbers.querySelector('[data-key="+"]')?.click();
      numbers.querySelector('[data-key="2"]')?.click();
      numbers.querySelector('[data-key="="]')?.click();
      numbers.querySelector('[data-key="3"]')?.click();
    });
    await page.waitForTimeout(100);

    const value = await page.inputValue("#text-input");
    expect(value).toBe("1+2=3");
  });
});

test.describe("Virtual Keyboard - Backspace Variations", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/index.html");
    await waitForExtension(page);
  });

  test("backspace on text input removes character", async ({ page }) => {
    await page.fill("#text-input", "xyz");
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    await clickKey(page, "Backspace");
    await page.waitForTimeout(100);

    const value = await page.inputValue("#text-input");
    expect(value).toBe("xy");
  });

  test("backspace in symbols mode works", async ({ page }) => {
    await page.fill("#text-input", "abc");
    await page.click("#text-input");
    await waitForKeyboardOpen(page);
    await clickNumbersToggle(page);
    await page.waitForTimeout(100);

    await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      const numbers = host.shadowRoot.querySelector("#vk-main-numbers");
      numbers.querySelector('[data-key="Backspace"]')?.click();
    });
    await page.waitForTimeout(100);

    const value = await page.inputValue("#text-input");
    expect(value).toBe("ab");
  });
});

test.describe("Virtual Keyboard - Row Order", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/index.html");
    await waitForExtension(page);
  });

  test("first letter row starts with Q", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    const firstKey = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      const placeholder = host.shadowRoot.querySelector("#vk-main-kbd-ph");
      const firstRow = placeholder?.querySelector(".vk-row");
      const firstKey = firstRow?.querySelector(".vk-key");
      return firstKey?.getAttribute("data-key")?.toLowerCase();
    });

    expect(firstKey).toBe("q");
  });

  test("second row starts with A", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    const secondRowFirstKey = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      const placeholder = host.shadowRoot.querySelector("#vk-main-kbd-ph");
      const rows = placeholder?.querySelectorAll(".vk-row");
      if (rows && rows.length > 1) {
        const secondRow = rows[1];
        const firstKey = secondRow?.querySelector(".vk-key:not([data-key=''])");
        return firstKey?.getAttribute("data-key")?.toLowerCase();
      }
      return null;
    });

    expect(secondRowFirstKey).toBe("a");
  });
});

test.describe("Virtual Keyboard - Close Behavior", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/index.html");
    await waitForExtension(page);
  });

  test("close button in symbols mode closes keyboard", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);
    await clickNumbersToggle(page);
    await page.waitForTimeout(100);

    await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      const numbers = host.shadowRoot.querySelector("#vk-main-numbers");
      numbers.querySelector('[data-key="Close"]')?.click();
    });
    await waitForKeyboardClose(page);

    const isClosed = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      return host?.shadowRoot?.querySelector("#virtual-keyboard")?.dataset.state === "closed";
    });

    expect(isClosed).toBe(true);
  });
});

test.describe("Virtual Keyboard - Email @ Key", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/index.html");
    await waitForExtension(page);
  });

  test("email input shows @ key visible", async ({ page }) => {
    await page.click("#email-input");
    await waitForKeyboardOpen(page);

    const atKeyVisible = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      const atKey = host.shadowRoot.querySelector('[data-key="@"]');
      if (!atKey) return false;
      const style = window.getComputedStyle(atKey);
      return style.display !== "none";
    });

    expect(atKeyVisible).toBe(true);
  });

  test("clicking @ inserts @ in email", async ({ page }) => {
    await page.click("#email-input");
    await waitForKeyboardOpen(page);

    await typeWithKeyboard(page, "test");

    await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      const atKey = host.shadowRoot.querySelector('[data-key="@"]');
      atKey?.click();
    });
    await page.waitForTimeout(100);

    const value = await page.inputValue("#email-input");
    expect(value).toContain("@");
  });
});

test.describe("Virtual Keyboard - Disabled/Readonly Inputs", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/index.html");
    await waitForExtension(page);
  });

  test("keyboard does not open for disabled input", async ({ page }) => {
    await page.click("#disabled-input", { force: true });
    await page.waitForTimeout(500);

    const isOpen = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      return host?.shadowRoot?.querySelector("#virtual-keyboard")?.dataset.state === "open";
    });

    expect(isOpen).toBe(false);
  });

  test("keyboard does not open for readonly input", async ({ page }) => {
    await page.click("#readonly-input", { force: true });
    await page.waitForTimeout(500);

    const isOpen = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      return host?.shadowRoot?.querySelector("#virtual-keyboard")?.dataset.state === "open";
    });

    expect(isOpen).toBe(false);
  });
});

test.describe("Virtual Keyboard - Space Key", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/index.html");
    await waitForExtension(page);
  });

  test("space key has special class", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    const hasClass = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      const space = host.shadowRoot.querySelector('[data-key=" "]');
      return space?.classList.contains("vk-key-space");
    });

    expect(hasClass).toBe(true);
  });

  test("space key is wider than letter keys", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    const isWider = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      const space = host.shadowRoot.querySelector('[data-key=" "]');
      const letterA = host.shadowRoot.querySelector('[data-key="a"]');
      if (!space || !letterA) return false;
      return space.offsetWidth > letterA.offsetWidth;
    });

    expect(isWider).toBe(true);
  });
});

test.describe("Virtual Keyboard - Multiple Backspaces", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/index.html");
    await waitForExtension(page);
  });

  test("multiple backspaces work correctly", async ({ page }) => {
    await page.fill("#text-input", "hello");
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    for (let i = 0; i < 3; i++) {
      await clickKey(page, "Backspace");
      await page.waitForTimeout(50);
    }

    const value = await page.inputValue("#text-input");
    expect(value).toBe("he");
  });
});
