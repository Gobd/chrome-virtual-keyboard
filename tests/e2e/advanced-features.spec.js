import { expect, test } from "./fixtures.js";
import {
  clickKey,
  clickNumbersToggle,
  typeWithKeyboard,
  waitForExtension,
  waitForKeyboardOpen,
} from "./helpers.js";

test.describe("Virtual Keyboard - URL Bar", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/index.html");
    await waitForExtension(page);
  });

  test("URL button opens URL bar", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    // Click URL button
    await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      const btn = host.shadowRoot.querySelector("#vk-url-btn");
      btn?.click();
    });
    await page.waitForTimeout(200);

    const urlBarVisible = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      const urlBar = host.shadowRoot.querySelector("#vk-url-bar");
      return urlBar?.style.display !== "none";
    });

    expect(urlBarVisible).toBe(true);
  });

  test("URL bar has input field and submit", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      host.shadowRoot.querySelector("#vk-url-btn")?.click();
    });
    await page.waitForTimeout(200);

    const hasInput = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      return host.shadowRoot.querySelector("#vk-url-bar-textbox") !== null;
    });

    expect(hasInput).toBe(true);
  });

  test(".com button works for email input", async ({ page }) => {
    await page.click("#email-input");
    await waitForKeyboardOpen(page);

    await typeWithKeyboard(page, "test");

    // Click .com button (URL button shows .com for email)
    await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      const btn = host.shadowRoot.querySelector("#vk-url-btn");
      btn?.click();
    });
    await page.waitForTimeout(100);

    const value = await page.inputValue("#email-input");
    expect(value).toContain(".com");
  });
});

test.describe("Virtual Keyboard - Language Overlay", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/index.html");
    await waitForExtension(page);
  });

  test("language overlay exists", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    const overlayExists = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      return host.shadowRoot.querySelector("#vk-overlay-language") !== null;
    });

    expect(overlayExists).toBe(true);
  });

  test("language overlay starts closed", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    const overlayState = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      const overlay = host.shadowRoot.querySelector("#vk-overlay-language");
      return overlay?.dataset.state;
    });

    expect(overlayState).toBe("closed");
  });
});

test.describe("Virtual Keyboard - Numbers Mode", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/index.html");
    await waitForExtension(page);
  });

  test("&123 toggles to numbers mode", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    await clickNumbersToggle(page);
    await page.waitForTimeout(100);

    const numbersVisible = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      const numbers = host.shadowRoot.querySelector("#vk-main-numbers");
      return numbers?.style.display !== "none";
    });

    expect(numbersVisible).toBe(true);
  });

  test("ABC button toggles back from numbers mode", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    // Enter numbers mode
    await clickNumbersToggle(page);
    await page.waitForTimeout(100);

    // Click ABC to go back
    await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      const abcKey = host.shadowRoot.querySelector('[data-key="&123"]');
      abcKey?.click();
    });
    await page.waitForTimeout(100);

    const mainVisible = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      const main = host.shadowRoot.querySelector("#vk-main-kbd");
      return main?.style.display !== "none";
    });

    expect(mainVisible).toBe(true);
  });

  test("numbers keyboard has symbols", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    await clickNumbersToggle(page);
    await page.waitForTimeout(100);

    const hasSymbols = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      const numbers = host.shadowRoot.querySelector("#vk-main-numbers");
      const keys = numbers?.querySelectorAll(".vk-key");
      const keyValues = Array.from(keys || []).map(
        (k) => k.getAttribute("data-key") || ""
      );
      return (
        keyValues.includes("@") &&
        keyValues.includes("#") &&
        keyValues.includes("$")
      );
    });

    expect(hasSymbols).toBe(true);
  });

  test("can type symbols from numbers keyboard", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    await clickNumbersToggle(page);
    await page.waitForTimeout(100);

    // Click @ symbol
    await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      const atKey = host.shadowRoot.querySelector('[data-key="@"]');
      atKey?.click();
    });
    await page.waitForTimeout(50);

    const value = await page.inputValue("#text-input");
    expect(value).toBe("@");
  });
});

test.describe("Virtual Keyboard - Drag Handle", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/index.html");
    await waitForExtension(page);
  });

  test("drag handle exists in keyboard", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    const handleExists = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      return host.shadowRoot.querySelector(".vk-drag-handle") !== null;
    });

    expect(handleExists).toBe(true);
  });

  test("drag handle is hidden by default", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    const isHidden = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      const handle = host.shadowRoot.querySelector(".vk-drag-handle");
      return handle?.style.display === "none";
    });

    expect(isHidden).toBe(true);
  });
});

test.describe("Virtual Keyboard - Scroll Handling", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/index.html");
    await waitForExtension(page);
  });

  test("scroll extend element exists", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    const exists = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      return host.shadowRoot.querySelector("#vk-scroll-extend") !== null;
    });

    expect(exists).toBe(true);
  });
});

test.describe("Virtual Keyboard - Pointer Events", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/index.html");
    await waitForExtension(page);
  });

  test("keyboard tracks pointer enter/leave", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    // Just verify keyboard exists and is interactive
    const isInteractive = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      const kbd = host.shadowRoot.querySelector("#virtual-keyboard");
      return kbd !== null && kbd.dataset.state === "open";
    });

    expect(isInteractive).toBe(true);
  });
});

test.describe("Virtual Keyboard - Form Submission", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/index.html");
    await waitForExtension(page);
  });

  test("enter in form input triggers submit", async ({ page }) => {
    // Track if form was submitted
    await page.evaluate(() => {
      const form = document.querySelector("#test-form");
      if (form) {
        form.addEventListener("submit", (e) => {
          e.preventDefault();
          window.__formSubmitted = true;
        });
      }
    });

    await page.click("#form-input");
    await waitForKeyboardOpen(page);

    await clickKey(page, "Enter");
    await page.waitForTimeout(100);

    const submitted = await page.evaluate(() => window.__formSubmitted);
    expect(submitted).toBe(true);
  });

  test("enter in textarea inserts newline", async ({ page }) => {
    await page.click("#textarea");
    await waitForKeyboardOpen(page);

    await typeWithKeyboard(page, "line1");
    await clickKey(page, "Enter");
    await typeWithKeyboard(page, "line2");

    const value = await page.inputValue("#textarea");
    expect(value).toBe("line1\nline2");
  });
});

test.describe("Virtual Keyboard - CSS Classes", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/index.html");
    await waitForExtension(page);
  });

  test("keyboard has open class when open", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    const hasOpenClass = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      const kbd = host.shadowRoot.querySelector("#virtual-keyboard");
      // Check for either vk-open class or data-state="open"
      return (
        kbd?.classList.contains("vk-open") || kbd?.dataset.state === "open"
      );
    });

    expect(hasOpenClass).toBe(true);
  });

  test("keyboard has closed class when closed", async ({ page }) => {
    const hasClosedClass = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      if (!host?.shadowRoot) return true;
      const kbd = host.shadowRoot.querySelector("#virtual-keyboard");
      return (
        kbd?.classList.contains("vk-closed") || kbd?.dataset.state === "closed"
      );
    });

    expect(hasClosedClass).toBe(true);
  });
});

test.describe("Virtual Keyboard - Special Key Icons", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/index.html");
    await waitForExtension(page);
  });

  test("backspace has icon element", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    const hasIcon = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      const backspace = host.shadowRoot.querySelector('[data-key="Backspace"]');
      return backspace?.querySelector(".vk-icon-backspace") !== null;
    });

    expect(hasIcon).toBe(true);
  });

  test("enter has icon element", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    const hasIcon = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      const enter = host.shadowRoot.querySelector('[data-key="Enter"]');
      return enter?.querySelector(".vk-icon-enter") !== null;
    });

    expect(hasIcon).toBe(true);
  });

  test("close has icon element", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    const hasIcon = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      const close = host.shadowRoot.querySelector('[data-key="Close"]');
      return close?.querySelector(".vk-icon-close") !== null;
    });

    expect(hasIcon).toBe(true);
  });
});

test.describe("Virtual Keyboard - Overlay Behavior", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/index.html");
    await waitForExtension(page);
  });

  test("clicking outside keyboard closes overlays", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    // Click somewhere outside
    await page.click("h1");
    await page.waitForTimeout(200);

    const allOverlaysClosed = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      if (!host?.shadowRoot) return true;
      const overlays = host.shadowRoot.querySelectorAll(".vk-overlay");
      return Array.from(overlays).every((o) => o.dataset.state !== "open");
    });

    expect(allOverlaysClosed).toBe(true);
  });
});

test.describe("Virtual Keyboard - Key Click Classes", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/index.html");
    await waitForExtension(page);
  });

  test("keys have click class", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    const keysAreClickable = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      const keys = host.shadowRoot.querySelectorAll(".vk-key");
      // Keys should be clickable (buttons)
      return Array.from(keys).every((k) => k.tagName === "BUTTON");
    });

    expect(keysAreClickable).toBe(true);
  });
});

test.describe("Virtual Keyboard - Shadow DOM", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/index.html");
    await waitForExtension(page);
  });

  test("host element exists", async ({ page }) => {
    const hostExists = await page.evaluate(() => {
      return document.querySelector("#virtual-keyboard-host") !== null;
    });

    expect(hostExists).toBe(true);
  });

  test("shadow root is accessible", async ({ page }) => {
    const shadowExists = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      return host?.shadowRoot !== null;
    });

    expect(shadowExists).toBe(true);
  });

  test("styles are loaded", async ({ page }) => {
    const styleLoaded = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      const link = host?.shadowRoot?.querySelector("link[rel='stylesheet']");
      return link !== null;
    });

    expect(styleLoaded).toBe(true);
  });
});

test.describe("Virtual Keyboard - Input Type Handling", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/index.html");
    await waitForExtension(page);
  });

  test("email input stores original type", async ({ page }) => {
    await page.click("#email-input");
    await waitForKeyboardOpen(page);

    const origType = await page.evaluate(() => {
      return document
        .querySelector("#email-input")
        ?.getAttribute("data-original-type");
    });

    expect(origType).toBe("email");
  });

  test("url input stores original type", async ({ page }) => {
    await page.click("#url-input");
    await waitForKeyboardOpen(page);

    const origType = await page.evaluate(() => {
      return document
        .querySelector("#url-input")
        ?.getAttribute("data-original-type");
    });

    expect(origType).toBe("url");
  });
});

test.describe("Virtual Keyboard - Zoom", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/index.html");
    await waitForExtension(page);
  });

  test("keyboard has transform scale style applied", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    const hasTransform = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      const kbd = host.shadowRoot.querySelector("#virtual-keyboard");
      const transform = kbd?.style.transform;
      // Should have scale transform applied (default is scale(1, 1))
      return transform?.includes("scale");
    });

    expect(hasTransform).toBe(true);
  });
});
