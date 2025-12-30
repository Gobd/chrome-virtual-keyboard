import { expect, test } from "./fixtures.js";
import {
  clickCloseButton,
  clickKey,
  clickNumbersToggle,
  focusInputInIframe,
  getIframeInputValue,
  typeWithKeyboard,
  waitForExtension,
  waitForKeyboardClose,
  waitForKeyboardOpen,
} from "./helpers.js";

const IFRAME_SELECTOR = "#same-origin-iframe";

test.describe("Virtual Keyboard - Iframe Shift Behavior", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/iframe.html");
    await waitForExtension(page);
    await page.waitForTimeout(1000);
  });

  test("shift produces uppercase in iframe", async ({ page }) => {
    await focusInputInIframe(page, IFRAME_SELECTOR, "#iframe-text");
    await waitForKeyboardOpen(page);

    await clickKey(page, "Shift");
    await clickKey(page, "h");
    await typeWithKeyboard(page, "ello");

    const value = await getIframeInputValue(
      page,
      IFRAME_SELECTOR,
      "#iframe-text"
    );
    expect(value).toBe("Hello");
  });

  test("shift auto-resets after typing letter in iframe", async ({ page }) => {
    await focusInputInIframe(page, IFRAME_SELECTOR, "#iframe-text");
    await waitForKeyboardOpen(page);

    await clickKey(page, "Shift");
    await clickKey(page, "a");
    await clickKey(page, "b");

    const value = await getIframeInputValue(
      page,
      IFRAME_SELECTOR,
      "#iframe-text"
    );
    expect(value).toBe("Ab");
  });

  test("shift toggle on/off in iframe", async ({ page }) => {
    await focusInputInIframe(page, IFRAME_SELECTOR, "#iframe-text");
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

test.describe("Virtual Keyboard - Iframe Numbers Mode", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/iframe.html");
    await waitForExtension(page);
    await page.waitForTimeout(1000);
  });

  test("numbers mode toggle works while in iframe", async ({ page }) => {
    await focusInputInIframe(page, IFRAME_SELECTOR, "#iframe-text");
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

  test("typing symbols in numbers mode works in iframe", async ({ page }) => {
    await focusInputInIframe(page, IFRAME_SELECTOR, "#iframe-text");
    await waitForKeyboardOpen(page);

    await clickNumbersToggle(page);
    await page.waitForTimeout(100);

    await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      const numbers = host.shadowRoot.querySelector("#vk-main-numbers");
      numbers.querySelector('[data-key="1"]')?.click();
      numbers.querySelector('[data-key="+"]')?.click();
      numbers.querySelector('[data-key="1"]')?.click();
    });
    await page.waitForTimeout(100);

    const value = await getIframeInputValue(
      page,
      IFRAME_SELECTOR,
      "#iframe-text"
    );
    expect(value).toBe("1+1");
  });

  test("backspace in numbers mode works in iframe", async ({ page }) => {
    const frame = page.frameLocator(IFRAME_SELECTOR);
    await frame.locator("#iframe-text").fill("abc");
    await frame.locator("#iframe-text").click();
    await waitForKeyboardOpen(page);

    await clickNumbersToggle(page);
    await page.waitForTimeout(100);

    await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      const numbers = host.shadowRoot.querySelector("#vk-main-numbers");
      numbers.querySelector('[data-key="Backspace"]')?.click();
    });
    await page.waitForTimeout(100);

    const value = await getIframeInputValue(
      page,
      IFRAME_SELECTOR,
      "#iframe-text"
    );
    expect(value).toBe("ab");
  });
});

test.describe("Virtual Keyboard - Iframe Close Behavior", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/iframe.html");
    await waitForExtension(page);
    await page.waitForTimeout(1000);
  });

  test("close button closes keyboard while iframe focused", async ({
    page,
  }) => {
    await focusInputInIframe(page, IFRAME_SELECTOR, "#iframe-text");
    await waitForKeyboardOpen(page);

    await clickCloseButton(page);
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

  test("enter closes keyboard on regular iframe input", async ({ page }) => {
    await focusInputInIframe(page, IFRAME_SELECTOR, "#iframe-text");
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

  test("clicking outside iframe input closes keyboard", async ({ page }) => {
    await focusInputInIframe(page, IFRAME_SELECTOR, "#iframe-text");
    await waitForKeyboardOpen(page);

    // Click on the main page h1
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
});

test.describe("Virtual Keyboard - Iframe Event Dispatch", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/iframe.html");
    await waitForExtension(page);
    await page.waitForTimeout(1000);
  });

  test("input event fires in iframe input", async ({ page }) => {
    const frame = page.frameLocator(IFRAME_SELECTOR);
    await frame.locator("#iframe-text").evaluate((el) => {
      window.__inputFired = false;
      el.addEventListener("input", () => {
        window.__inputFired = true;
      });
    });

    await focusInputInIframe(page, IFRAME_SELECTOR, "#iframe-text");
    await waitForKeyboardOpen(page);
    await clickKey(page, "x");

    const inputFired = await frame
      .locator("#iframe-text")
      .evaluate(() => window.__inputFired);
    expect(inputFired).toBe(true);
  });

  test("keydown event fires in iframe input", async ({ page }) => {
    const frame = page.frameLocator(IFRAME_SELECTOR);
    await frame.locator("#iframe-text").evaluate((el) => {
      window.__keydownFired = false;
      el.addEventListener("keydown", () => {
        window.__keydownFired = true;
      });
    });

    await focusInputInIframe(page, IFRAME_SELECTOR, "#iframe-text");
    await waitForKeyboardOpen(page);
    await clickKey(page, "y");

    const keydownFired = await frame
      .locator("#iframe-text")
      .evaluate(() => window.__keydownFired);
    expect(keydownFired).toBe(true);
  });

  test("keyup event fires in iframe input", async ({ page }) => {
    const frame = page.frameLocator(IFRAME_SELECTOR);
    await frame.locator("#iframe-text").evaluate((el) => {
      window.__keyupFired = false;
      el.addEventListener("keyup", () => {
        window.__keyupFired = true;
      });
    });

    await focusInputInIframe(page, IFRAME_SELECTOR, "#iframe-text");
    await waitForKeyboardOpen(page);
    await clickKey(page, "z");

    const keyupFired = await frame
      .locator("#iframe-text")
      .evaluate(() => window.__keyupFired);
    expect(keyupFired).toBe(true);
  });

  test("value persists after blur in iframe", async ({ page }) => {
    await focusInputInIframe(page, IFRAME_SELECTOR, "#iframe-text");
    await waitForKeyboardOpen(page);
    await typeWithKeyboard(page, "test");

    // Blur by clicking elsewhere
    await page.click("h1");
    await page.waitForTimeout(600);

    // Verify value is still there after blur
    const value = await getIframeInputValue(
      page,
      IFRAME_SELECTOR,
      "#iframe-text"
    );
    expect(value).toBe("test");
  });
});

test.describe("Virtual Keyboard - Iframe Selection Handling", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/iframe.html");
    await waitForExtension(page);
    await page.waitForTimeout(1000);
  });

  test("selecting all text and typing replaces it in iframe", async ({
    page,
  }) => {
    const frame = page.frameLocator(IFRAME_SELECTOR);
    await frame.locator("#iframe-text").fill("original");
    await frame.locator("#iframe-text").click();
    await waitForKeyboardOpen(page);

    await frame.locator("#iframe-text").evaluate((el) => {
      el.select();
    });

    await clickKey(page, "x");
    await page.waitForTimeout(100);

    const value = await getIframeInputValue(
      page,
      IFRAME_SELECTOR,
      "#iframe-text"
    );
    expect(value).toBe("x");
  });

  test("partial selection is replaced in iframe", async ({ page }) => {
    const frame = page.frameLocator(IFRAME_SELECTOR);
    await frame.locator("#iframe-text").fill("hello world");
    await frame.locator("#iframe-text").click();
    await waitForKeyboardOpen(page);

    await frame.locator("#iframe-text").evaluate((el) => {
      el.setSelectionRange(0, 5);
    });

    await typeWithKeyboard(page, "bye");
    await page.waitForTimeout(100);

    const value = await getIframeInputValue(
      page,
      IFRAME_SELECTOR,
      "#iframe-text"
    );
    expect(value).toBe("bye world");
  });
});

test.describe("Virtual Keyboard - Iframe Disabled/Readonly", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/iframe.html");
    await waitForExtension(page);
    await page.waitForTimeout(1000);
  });

  test("disabled input in iframe does not open keyboard", async ({ page }) => {
    const frame = page.frameLocator(IFRAME_SELECTOR);
    await frame.locator("#iframe-text").evaluate((el) => {
      el.disabled = true;
    });

    await frame.locator("#iframe-text").click({ force: true });
    await page.waitForTimeout(500);

    const isOpen = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      return (
        host?.shadowRoot?.querySelector("#virtual-keyboard")?.dataset.state ===
        "open"
      );
    });

    expect(isOpen).toBe(false);
  });

  test("readonly input in iframe does not open keyboard", async ({ page }) => {
    const frame = page.frameLocator(IFRAME_SELECTOR);
    await frame.locator("#iframe-text").evaluate((el) => {
      el.readOnly = true;
    });

    await frame.locator("#iframe-text").click({ force: true });
    await page.waitForTimeout(500);

    const isOpen = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      return (
        host?.shadowRoot?.querySelector("#virtual-keyboard")?.dataset.state ===
        "open"
      );
    });

    expect(isOpen).toBe(false);
  });
});

test.describe("Virtual Keyboard - Iframe Special Keys", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/iframe.html");
    await waitForExtension(page);
    await page.waitForTimeout(1000);
  });

  test("space key works in iframe", async ({ page }) => {
    await focusInputInIframe(page, IFRAME_SELECTOR, "#iframe-text");
    await waitForKeyboardOpen(page);

    await typeWithKeyboard(page, "hello");
    await clickKey(page, " ");
    await typeWithKeyboard(page, "world");

    const value = await getIframeInputValue(
      page,
      IFRAME_SELECTOR,
      "#iframe-text"
    );
    expect(value).toBe("hello world");
  });

  test("multiple backspaces work in iframe", async ({ page }) => {
    const frame = page.frameLocator(IFRAME_SELECTOR);
    await frame.locator("#iframe-text").fill("hello");
    await frame.locator("#iframe-text").click();
    await waitForKeyboardOpen(page);

    for (let i = 0; i < 3; i++) {
      await clickKey(page, "Backspace");
      await page.waitForTimeout(50);
    }

    const value = await getIframeInputValue(
      page,
      IFRAME_SELECTOR,
      "#iframe-text"
    );
    expect(value).toBe("he");
  });

  test("backspace at start does nothing in iframe", async ({ page }) => {
    const frame = page.frameLocator(IFRAME_SELECTOR);
    await frame.locator("#iframe-text").fill("test");
    await frame.locator("#iframe-text").click();
    await waitForKeyboardOpen(page);

    await frame.locator("#iframe-text").evaluate((el) => {
      el.setSelectionRange(0, 0);
    });

    await clickKey(page, "Backspace");
    await page.waitForTimeout(100);

    const value = await getIframeInputValue(
      page,
      IFRAME_SELECTOR,
      "#iframe-text"
    );
    expect(value).toBe("test");
  });
});

test.describe("Virtual Keyboard - Iframe Textarea Special", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/iframe.html");
    await waitForExtension(page);
    await page.waitForTimeout(1000);
  });

  test("multiple newlines work in iframe textarea", async ({ page }) => {
    await focusInputInIframe(page, IFRAME_SELECTOR, "#iframe-textarea");
    await waitForKeyboardOpen(page);

    await typeWithKeyboard(page, "a");
    await clickKey(page, "Enter");
    await typeWithKeyboard(page, "b");
    await clickKey(page, "Enter");
    await typeWithKeyboard(page, "c");

    const value = await getIframeInputValue(
      page,
      IFRAME_SELECTOR,
      "#iframe-textarea"
    );
    expect(value).toBe("a\nb\nc");
  });

  test("shift works in iframe textarea", async ({ page }) => {
    await focusInputInIframe(page, IFRAME_SELECTOR, "#iframe-textarea");
    await waitForKeyboardOpen(page);

    await clickKey(page, "Shift");
    await typeWithKeyboard(page, "hello");

    const value = await getIframeInputValue(
      page,
      IFRAME_SELECTOR,
      "#iframe-textarea"
    );
    expect(value.startsWith("H")).toBe(true);
  });
});

test.describe("Virtual Keyboard - Iframe Number Bar", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/iframe.html");
    await waitForExtension(page);
    await page.waitForTimeout(1000);
  });

  test("number bar keys work for iframe text input", async ({ page }) => {
    await focusInputInIframe(page, IFRAME_SELECTOR, "#iframe-text");
    await waitForKeyboardOpen(page);

    // Click numbers from the top bar
    await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      const numBar = host.shadowRoot.querySelector("#vk-number-bar");
      numBar?.querySelector('[data-key="1"]')?.click();
      numBar?.querySelector('[data-key="2"]')?.click();
      numBar?.querySelector('[data-key="3"]')?.click();
    });
    await page.waitForTimeout(100);

    const value = await getIframeInputValue(
      page,
      IFRAME_SELECTOR,
      "#iframe-text"
    );
    expect(value).toBe("123");
  });
});

test.describe("Virtual Keyboard - Iframe Focus Switching", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/iframe.html");
    await waitForExtension(page);
    await page.waitForTimeout(1000);
  });

  test("rapid focus switching between iframes works", async ({ page }) => {
    // Quick switches between iframes
    await focusInputInIframe(page, "#iframe-1", "#iframe-text");
    await waitForKeyboardOpen(page);
    await clickKey(page, "a");

    await focusInputInIframe(page, "#iframe-2", "#iframe-text");
    await page.waitForTimeout(50);
    await clickKey(page, "b");

    await focusInputInIframe(page, "#iframe-1", "#iframe-email");
    await page.waitForTimeout(50);
    await clickKey(page, "c");

    const value1 = await getIframeInputValue(page, "#iframe-1", "#iframe-text");
    const value2 = await getIframeInputValue(page, "#iframe-2", "#iframe-text");
    const value3 = await getIframeInputValue(
      page,
      "#iframe-1",
      "#iframe-email"
    );

    expect(value1).toBe("a");
    expect(value2).toBe("b");
    expect(value3).toBe("c");
  });

  test("keyboard stays open when switching between different input types in iframe", async ({
    page,
  }) => {
    await focusInputInIframe(page, IFRAME_SELECTOR, "#iframe-text");
    await waitForKeyboardOpen(page);

    await focusInputInIframe(page, IFRAME_SELECTOR, "#iframe-email");
    await page.waitForTimeout(100);

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
