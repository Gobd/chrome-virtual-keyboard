import { expect, test } from "./fixtures.js";
import {
  clickCloseButton,
  clickKey,
  clickNumbersToggle,
  typeWithKeyboard,
  waitForExtension,
  waitForKeyboardClose,
  waitForKeyboardOpen,
} from "./helpers.js";

test.describe("Virtual Keyboard - Cursor Movement", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/index.html");
    await waitForExtension(page);
  });

  test("cursor advances after each character typed", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    await clickKey(page, "a");
    let cursor = await page.evaluate(
      () => document.querySelector("#text-input").selectionStart
    );
    expect(cursor).toBe(1);

    await clickKey(page, "b");
    cursor = await page.evaluate(
      () => document.querySelector("#text-input").selectionStart
    );
    expect(cursor).toBe(2);
  });

  test("cursor stays at end when typing", async ({ page }) => {
    await page.fill("#text-input", "hello");
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    // Put cursor at end
    await page.evaluate(() => {
      const el = document.querySelector("#text-input");
      el.setSelectionRange(5, 5);
    });

    await typeWithKeyboard(page, " world");
    const value = await page.inputValue("#text-input");
    expect(value).toBe("hello world");
  });
});

test.describe("Virtual Keyboard - Backspace Edge Cases", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/index.html");
    await waitForExtension(page);
  });

  test("backspace at middle removes previous character", async ({ page }) => {
    await page.fill("#text-input", "hello");
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    await page.evaluate(() => {
      const el = document.querySelector("#text-input");
      el.setSelectionRange(3, 3);
    });

    await clickKey(page, "Backspace");
    const value = await page.inputValue("#text-input");
    expect(value).toBe("helo");
  });

  test("backspace with selection deletes selection", async ({ page }) => {
    await page.fill("#text-input", "hello world");
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    await page.evaluate(() => {
      const el = document.querySelector("#text-input");
      el.setSelectionRange(0, 5);
    });

    await clickKey(page, "Backspace");
    const value = await page.inputValue("#text-input");
    expect(value).toBe(" world");
  });

  test("backspace at start does nothing", async ({ page }) => {
    await page.fill("#text-input", "test");
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    await page.evaluate(() => {
      const el = document.querySelector("#text-input");
      el.setSelectionRange(0, 0);
    });

    await clickKey(page, "Backspace");
    const value = await page.inputValue("#text-input");
    expect(value).toBe("test");
  });
});

test.describe("Virtual Keyboard - Enter Key Behavior", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/index.html");
    await waitForExtension(page);
  });

  test("enter in textarea adds newline", async ({ page }) => {
    await page.click("#textarea");
    await waitForKeyboardOpen(page);

    await typeWithKeyboard(page, "line1");
    await clickKey(page, "Enter");
    await typeWithKeyboard(page, "line2");

    const value = await page.inputValue("#textarea");
    expect(value).toContain("\n");
  });

  test("enter in regular input does not add newline", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    await typeWithKeyboard(page, "test");
    await clickKey(page, "Enter");

    const value = await page.inputValue("#text-input");
    expect(value).not.toContain("\n");
  });
});

test.describe("Virtual Keyboard - Shift Behavior", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/index.html");
    await waitForExtension(page);
  });

  test("shift auto-resets after typing letter", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    await clickKey(page, "Shift");
    await clickKey(page, "a");

    const shiftActive = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      const mainKbd = host?.shadowRoot?.querySelector("#vk-main-kbd");
      return mainKbd?.classList.contains("shift-active");
    });

    expect(shiftActive).toBe(false);
  });

  test("multiple shift clicks toggle state", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    // First click - on
    await clickKey(page, "Shift");
    let active = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      return host?.shadowRoot
        ?.querySelector("#vk-main-kbd")
        ?.classList.contains("shift-active");
    });
    expect(active).toBe(true);

    // Second click - off
    await clickKey(page, "Shift");
    active = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      return host?.shadowRoot
        ?.querySelector("#vk-main-kbd")
        ?.classList.contains("shift-active");
    });
    expect(active).toBe(false);
  });
});

test.describe("Virtual Keyboard - Numbers Mode Toggle", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/index.html");
    await waitForExtension(page);
  });

  test("numbers mode toggle hides main keyboard", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    await clickNumbersToggle(page);
    await page.waitForTimeout(100);

    const mainHidden = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      const main = host?.shadowRoot?.querySelector("#vk-main-kbd");
      return main?.style.display === "none";
    });

    expect(mainHidden).toBe(true);
  });

  test("numbers mode toggle shows numbers keyboard", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    await clickNumbersToggle(page);
    await page.waitForTimeout(100);

    const numbersVisible = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      const numbers = host?.shadowRoot?.querySelector("#vk-main-numbers");
      return numbers?.style.display !== "none";
    });

    expect(numbersVisible).toBe(true);
  });
});

test.describe("Virtual Keyboard - Event Dispatch", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/index.html");
    await waitForExtension(page);
  });

  test("typing triggers input event", async ({ page }) => {
    let inputFired = false;
    await page.evaluate(() => {
      window.__inputFired = false;
      document.querySelector("#text-input").addEventListener("input", () => {
        window.__inputFired = true;
      });
    });

    await page.click("#text-input");
    await waitForKeyboardOpen(page);
    await clickKey(page, "x");

    inputFired = await page.evaluate(() => window.__inputFired);
    expect(inputFired).toBe(true);
  });

  test("typing triggers keydown event", async ({ page }) => {
    await page.evaluate(() => {
      window.__keydownFired = false;
      document.querySelector("#text-input").addEventListener("keydown", () => {
        window.__keydownFired = true;
      });
    });

    await page.click("#text-input");
    await waitForKeyboardOpen(page);
    await clickKey(page, "y");

    const keydownFired = await page.evaluate(() => window.__keydownFired);
    expect(keydownFired).toBe(true);
  });

  test("typing triggers keyup event", async ({ page }) => {
    await page.evaluate(() => {
      window.__keyupFired = false;
      document.querySelector("#text-input").addEventListener("keyup", () => {
        window.__keyupFired = true;
      });
    });

    await page.click("#text-input");
    await waitForKeyboardOpen(page);
    await clickKey(page, "z");

    const keyupFired = await page.evaluate(() => window.__keyupFired);
    expect(keyupFired).toBe(true);
  });
});

test.describe("Virtual Keyboard - Contenteditable Support", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/index.html");
    await waitForExtension(page);
  });

  test("typing in contenteditable adds text", async ({ page }) => {
    // Clear the contenteditable first
    await page.evaluate(() => {
      document.querySelector("#contenteditable").textContent = "";
    });

    await page.click("#contenteditable");
    await waitForKeyboardOpen(page);
    await typeWithKeyboard(page, "test");

    const content = await page.evaluate(
      () => document.querySelector("#contenteditable").textContent
    );
    expect(content).toContain("test");
  });

  test("enter in contenteditable creates line break", async ({ page }) => {
    await page.evaluate(() => {
      document.querySelector("#contenteditable").textContent = "";
    });

    await page.click("#contenteditable");
    await waitForKeyboardOpen(page);
    await typeWithKeyboard(page, "line1");
    await clickKey(page, "Enter");
    await typeWithKeyboard(page, "line2");

    const content = await page.evaluate(
      () => document.querySelector("#contenteditable").innerHTML
    );
    expect(content).toContain("<br>");
  });
});

test.describe("Virtual Keyboard - Overlay Elements", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/index.html");
    await waitForExtension(page);
  });

  test("overlays have correct class", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    const hasOverlayClass = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      const overlay = host?.shadowRoot?.querySelector("#vk-overlay-language");
      return overlay?.classList.contains("vk-overlay");
    });

    expect(hasOverlayClass).toBe(true);
  });
});

test.describe("Virtual Keyboard - Zoom Setting", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/index.html");
    await waitForExtension(page);
  });

  test("keyboard has zoom style", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    const hasZoom = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      const kbd = host?.shadowRoot?.querySelector("#virtual-keyboard");
      const zoom = kbd?.style.zoom;
      return zoom !== undefined && zoom !== "";
    });

    expect(hasZoom).toBe(true);
  });
});

test.describe("Virtual Keyboard - Keyboard Close", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/index.html");
    await waitForExtension(page);
  });

  test("close button closes keyboard", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    await clickCloseButton(page);
    await waitForKeyboardClose(page);

    const state = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      return host?.shadowRoot?.querySelector("#virtual-keyboard")?.dataset
        .state;
    });

    expect(state).toBe("closed");
  });

  test("clicking outside closes keyboard", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    await page.click("h1");
    await waitForKeyboardClose(page);

    const state = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      return host?.shadowRoot?.querySelector("#virtual-keyboard")?.dataset
        .state;
    });

    expect(state).toBe("closed");
  });
});

test.describe("Virtual Keyboard - Input Value Updates", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/index.html");
    await waitForExtension(page);
  });

  test("value updates immediately after typing", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    await clickKey(page, "t");
    let value = await page.inputValue("#text-input");
    expect(value).toBe("t");

    await clickKey(page, "e");
    value = await page.inputValue("#text-input");
    expect(value).toBe("te");

    await clickKey(page, "s");
    value = await page.inputValue("#text-input");
    expect(value).toBe("tes");

    await clickKey(page, "t");
    value = await page.inputValue("#text-input");
    expect(value).toBe("test");
  });
});

test.describe("Virtual Keyboard - Search Input", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/index.html");
    await waitForExtension(page);
  });

  test("search input opens keyboard", async ({ page }) => {
    await page.click("#search-input");
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

  test("typing in search input works", async ({ page }) => {
    await page.click("#search-input");
    await waitForKeyboardOpen(page);
    await typeWithKeyboard(page, "query");

    const value = await page.inputValue("#search-input");
    expect(value).toBe("query");
  });
});

test.describe("Virtual Keyboard - URL Input", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/index.html");
    await waitForExtension(page);
  });

  test("url input opens keyboard", async ({ page }) => {
    await page.click("#url-input");
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

  test("typing in url input works", async ({ page }) => {
    await page.click("#url-input");
    await waitForKeyboardOpen(page);
    await typeWithKeyboard(page, "example");

    const value = await page.inputValue("#url-input");
    expect(value).toContain("example");
  });
});

test.describe("Virtual Keyboard - Punctuation Keys", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/index.html");
    await waitForExtension(page);
  });

  test("apostrophe key works", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);
    await clickKey(page, "'");

    const value = await page.inputValue("#text-input");
    expect(value).toBe("'");
  });

  test("exclamation via shift works", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);
    await clickNumbersToggle(page);
    await page.waitForTimeout(100);

    await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      const numbers = host.shadowRoot.querySelector("#vk-main-numbers");
      numbers.querySelector('[data-key="!"]')?.click();
    });

    const value = await page.inputValue("#text-input");
    expect(value).toBe("!");
  });

  test("question mark works", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);
    await clickNumbersToggle(page);
    await page.waitForTimeout(100);

    await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      const numbers = host.shadowRoot.querySelector("#vk-main-numbers");
      numbers.querySelector('[data-key="?"]')?.click();
    });

    const value = await page.inputValue("#text-input");
    expect(value).toBe("?");
  });
});

test.describe("Virtual Keyboard - Space Typing", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/index.html");
    await waitForExtension(page);
  });

  test("space inserts space character", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);
    await typeWithKeyboard(page, "hello");
    await clickKey(page, " ");
    await typeWithKeyboard(page, "world");

    const value = await page.inputValue("#text-input");
    expect(value).toBe("hello world");
  });

  test("multiple spaces work", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);
    await clickKey(page, " ");
    await clickKey(page, " ");
    await clickKey(page, " ");

    const value = await page.inputValue("#text-input");
    expect(value).toBe("   ");
  });
});
