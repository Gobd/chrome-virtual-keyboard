import { expect, test } from "./fixtures.js";
import {
  clickKey,
  typeWithKeyboard,
  waitForExtension,
  waitForKeyboardClose,
  waitForKeyboardOpen,
} from "./helpers.js";

test.describe("Virtual Keyboard - Focus State", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/index.html");
    await waitForExtension(page);
  });

  test("focusing input opens keyboard", async ({ page }) => {
    await page.focus("#text-input");
    await waitForKeyboardOpen(page);

    const isOpen = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      return (
        host?.shadowRoot?.querySelector("#virtual-keyboard")?.dataset.state ===
        "open"
      );
    });

    expect(isOpen).toBe(true);
  });

  test("blurring input eventually closes keyboard", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    await page.click("h1");
    await waitForKeyboardClose(page);

    const isClosed = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      return (
        host?.shadowRoot?.querySelector("#virtual-keyboard")?.dataset.state ===
        "closed"
      );
    });

    expect(isClosed).toBe(true);
  });

  test("clicking another input keeps keyboard open", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    await page.click("#search-input");
    await page.waitForTimeout(200);

    const isOpen = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      return (
        host?.shadowRoot?.querySelector("#virtual-keyboard")?.dataset.state ===
        "open"
      );
    });

    expect(isOpen).toBe(true);
  });
});

test.describe("Virtual Keyboard - Key Events Sequence", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/index.html");
    await waitForExtension(page);
  });

  test("keydown fires before input", async ({ page }) => {
    const _events = [];
    await page.evaluate(() => {
      const el = document.querySelector("#text-input");
      window.__events = [];
      el.addEventListener("keydown", () => window.__events.push("keydown"));
      el.addEventListener("input", () => window.__events.push("input"));
    });

    await page.click("#text-input");
    await waitForKeyboardOpen(page);
    await clickKey(page, "a");
    await page.waitForTimeout(100);

    const eventOrder = await page.evaluate(() => window.__events);
    expect(eventOrder.indexOf("keydown")).toBeLessThan(
      eventOrder.indexOf("input")
    );
  });

  test("keyup fires after keydown", async ({ page }) => {
    await page.evaluate(() => {
      const el = document.querySelector("#text-input");
      window.__events = [];
      el.addEventListener("keydown", () => window.__events.push("keydown"));
      el.addEventListener("keyup", () => window.__events.push("keyup"));
    });

    await page.click("#text-input");
    await waitForKeyboardOpen(page);
    await clickKey(page, "a");
    await page.waitForTimeout(100);

    const eventOrder = await page.evaluate(() => window.__events);
    expect(eventOrder.indexOf("keydown")).toBeLessThan(
      eventOrder.indexOf("keyup")
    );
  });
});

test.describe("Virtual Keyboard - Contenteditable Cursor", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/index.html");
    await waitForExtension(page);
  });

  test("typing updates contenteditable content", async ({ page }) => {
    await page.click("#contenteditable");
    await waitForKeyboardOpen(page);

    await typeWithKeyboard(page, "test");

    const content = await page.evaluate(() => {
      return document.querySelector("#contenteditable")?.textContent || "";
    });

    expect(content).toContain("test");
  });

  test("backspace removes from contenteditable", async ({ page }) => {
    await page.click("#contenteditable");
    await waitForKeyboardOpen(page);

    // Type first then backspace
    await typeWithKeyboard(page, "hi");
    await page.waitForTimeout(100);

    await clickKey(page, "Backspace");
    await page.waitForTimeout(100);

    const content = await page.evaluate(() => {
      return document.querySelector("#contenteditable")?.textContent || "";
    });

    // Original content may have been replaced or appended to
    expect(content).toContain("h");
    expect(content).not.toContain("hi");
  });
});

test.describe("Virtual Keyboard - Row Structure", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/index.html");
    await waitForExtension(page);
  });

  test("keyboard has vk-row elements", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    const rowCount = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      return host?.shadowRoot?.querySelectorAll(".vk-row").length || 0;
    });

    expect(rowCount).toBeGreaterThan(0);
  });

  test("rows contain keys", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    const rowsHaveKeys = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      const rows = host?.shadowRoot?.querySelectorAll(".vk-row") || [];
      return Array.from(rows).every(
        (row) => row.querySelectorAll(".vk-key").length > 0
      );
    });

    expect(rowsHaveKeys).toBe(true);
  });
});

test.describe("Virtual Keyboard - Main Keyboard Container", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/index.html");
    await waitForExtension(page);
  });

  test("main-kbd exists", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    const exists = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      return host?.shadowRoot?.querySelector("#vk-main-kbd") !== null;
    });

    expect(exists).toBe(true);
  });

  test("main-kbd-placeholder exists", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    const exists = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      return host?.shadowRoot?.querySelector("#vk-main-kbd-ph") !== null;
    });

    expect(exists).toBe(true);
  });
});

test.describe("Virtual Keyboard - Key Data Attributes", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/index.html");
    await waitForExtension(page);
  });

  test("keys have data-key attribute", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    const allHaveDataKey = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      const keys = host?.shadowRoot?.querySelectorAll(".vk-key") || [];
      return Array.from(keys).every((k) => k.hasAttribute("data-key"));
    });

    expect(allHaveDataKey).toBe(true);
  });

  test("shift keys exist on keyboard", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    const hasShiftKey = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      const shiftKey = host?.shadowRoot?.querySelector('[data-key="Shift"]');
      return shiftKey !== null;
    });

    expect(hasShiftKey).toBe(true);
  });
});

test.describe("Virtual Keyboard - Selection Handling", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/index.html");
    await waitForExtension(page);
  });

  test("selecting all text and typing replaces it", async ({ page }) => {
    await page.fill("#text-input", "original");
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    await page.evaluate(() => {
      document.querySelector("#text-input").select();
    });

    await clickKey(page, "x");
    await page.waitForTimeout(100);

    const value = await page.inputValue("#text-input");
    expect(value).toBe("x");
  });

  test("partial selection is replaced by typing", async ({ page }) => {
    await page.fill("#text-input", "hello world");
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    await page.evaluate(() => {
      const el = document.querySelector("#text-input");
      el.setSelectionRange(0, 5);
    });

    await typeWithKeyboard(page, "bye");
    await page.waitForTimeout(100);

    const value = await page.inputValue("#text-input");
    expect(value).toBe("bye world");
  });
});

test.describe("Virtual Keyboard - Maxlength Handling", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/index.html");
    await waitForExtension(page);
  });

  test("respects maxlength attribute", async ({ page }) => {
    await page.evaluate(() => {
      document.querySelector("#text-input").setAttribute("maxlength", "3");
    });

    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    await typeWithKeyboard(page, "abcdef");
    await page.waitForTimeout(100);

    const value = await page.inputValue("#text-input");
    expect(value.length).toBe(3);
  });
});

test.describe("Virtual Keyboard - Input Types Conversion", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/index.html");
    await waitForExtension(page);
  });

  test("email type preserved for number keyboard check", async ({ page }) => {
    await page.click("#email-input");
    await waitForKeyboardOpen(page);

    // Should show text keyboard with @ key, not number pad
    const hasAtKey = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      const atKey = host?.shadowRoot?.querySelector('[data-key="@"]');
      return atKey !== null && atKey.style.display !== "none";
    });

    expect(hasAtKey).toBe(true);
  });
});

test.describe("Virtual Keyboard - Multiple Inputs", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/index.html");
    await waitForExtension(page);
  });

  test("switching inputs updates keyboard state correctly", async ({
    page,
  }) => {
    // Type in text input
    await page.click("#text-input");
    await waitForKeyboardOpen(page);
    await clickKey(page, "a");

    // Switch to search
    await page.click("#search-input");
    await page.waitForTimeout(200);
    await clickKey(page, "b");

    const textValue = await page.inputValue("#text-input");
    const searchValue = await page.inputValue("#search-input");

    expect(textValue).toBe("a");
    expect(searchValue).toBe("b");
  });

  test("switching from number to text input changes keyboard", async ({
    page,
  }) => {
    await page.click("#number-input");
    await waitForKeyboardOpen(page);

    const numberPadVisible = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      const numPad = host?.shadowRoot?.querySelector("#vk-number-bar-input");
      return numPad?.style.display !== "none";
    });
    expect(numberPadVisible).toBe(true);

    await page.click("#text-input");
    await page.waitForTimeout(200);

    const textKbdVisible = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      const main = host?.shadowRoot?.querySelector("#vk-main-kbd");
      return main?.style.display !== "none";
    });
    expect(textKbdVisible).toBe(true);
  });
});

test.describe("Virtual Keyboard - Enter Key Behavior", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/index.html");
    await waitForExtension(page);
  });

  test("enter in plain input closes keyboard", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    await clickKey(page, "Enter");
    await waitForKeyboardClose(page);

    const isClosed = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      return (
        host?.shadowRoot?.querySelector("#virtual-keyboard")?.dataset.state ===
        "closed"
      );
    });

    expect(isClosed).toBe(true);
  });
});
