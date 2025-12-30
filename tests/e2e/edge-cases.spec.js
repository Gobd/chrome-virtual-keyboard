import { expect, test } from "./fixtures.js";
import {
  clickCloseButton,
  clickKey,
  typeWithKeyboard,
  waitForExtension,
  waitForKeyboardClose,
  waitForKeyboardOpen,
} from "./helpers.js";

test.describe("Virtual Keyboard - Change Event", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/index.html");
    await waitForExtension(page);
  });

  test("change event fires after blur with modifications", async ({ page }) => {
    await page.evaluate(() => {
      const el = document.querySelector("#text-input");
      window.__changeFired = false;
      el.addEventListener("change", () => {
        window.__changeFired = true;
      });
    });

    await page.click("#text-input");
    await waitForKeyboardOpen(page);
    await typeWithKeyboard(page, "test");
    await page.click("h1"); // blur
    await page.waitForTimeout(600);

    const fired = await page.evaluate(() => window.__changeFired);
    expect(fired).toBe(true);
  });

  test("no change event without modifications", async ({ page }) => {
    await page.evaluate(() => {
      const el = document.querySelector("#text-input");
      window.__changeFired = false;
      el.addEventListener("change", () => {
        window.__changeFired = true;
      });
    });

    await page.click("#text-input");
    await waitForKeyboardOpen(page);
    // Don't type anything
    await page.click("h1"); // blur
    await page.waitForTimeout(600);

    const fired = await page.evaluate(() => window.__changeFired);
    expect(fired).toBe(false);
  });
});

test.describe("Virtual Keyboard - Scroll Behavior", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/index.html");
    await waitForExtension(page);
  });

  test("body gets margin when keyboard opens", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    const hasMargin = await page.evaluate(() => {
      return document.body.style.marginBottom !== "";
    });

    expect(hasMargin).toBe(true);
  });

  test("body margin removed when keyboard closes", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);
    await clickCloseButton(page);
    await waitForKeyboardClose(page);
    await page.waitForTimeout(500);

    const marginRemoved = await page.evaluate(() => {
      return document.body.style.marginBottom === "";
    });

    expect(marginRemoved).toBe(true);
  });
});

test.describe("Virtual Keyboard - Input Type Preservation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/index.html");
    await waitForExtension(page);
  });

  test("password type is preserved on blur", async ({ page }) => {
    await page.click("#password-input");
    await waitForKeyboardOpen(page);
    await typeWithKeyboard(page, "secret");
    await clickCloseButton(page);
    await waitForKeyboardClose(page);

    const inputType = await page.evaluate(() => {
      return document.querySelector("#password-input").type;
    });

    expect(inputType).toBe("password");
  });

  test("number input original type stored", async ({ page }) => {
    await page.click("#number-input");
    await waitForKeyboardOpen(page);

    const origType = await page.evaluate(() => {
      return document
        .querySelector("#number-input")
        .getAttribute("data-original-type");
    });

    expect(origType).toBe("number");
  });
});

test.describe("Virtual Keyboard - Pointer Events", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/index.html");
    await waitForExtension(page);
  });

  test("clicking key triggers active state", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    // Just verify key can be clicked
    await clickKey(page, "a");
    const value = await page.inputValue("#text-input");
    expect(value).toBe("a");
  });
});

test.describe("Virtual Keyboard - Keyboard Structure", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/index.html");
    await waitForExtension(page);
  });

  test("keyboard element has correct id", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    const exists = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      return host?.shadowRoot?.querySelector("#virtual-keyboard") !== null;
    });

    expect(exists).toBe(true);
  });

  test("number bar exists", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    const exists = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      return host?.shadowRoot?.querySelector("#vk-number-bar") !== null;
    });

    expect(exists).toBe(true);
  });

  test("main numbers keyboard exists", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    const exists = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      return host?.shadowRoot?.querySelector("#vk-main-numbers") !== null;
    });

    expect(exists).toBe(true);
  });

  test("number input keyboard exists", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    const exists = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      return host?.shadowRoot?.querySelector("#vk-number-bar-input") !== null;
    });

    expect(exists).toBe(true);
  });
});

test.describe("Virtual Keyboard - Layout Loading", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/index.html");
    await waitForExtension(page);
  });

  test("keyboard loads default English layout", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    const hasQwerty = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      return host?.shadowRoot?.querySelector('[data-key="q"]') !== null;
    });

    expect(hasQwerty).toBe(true);
  });
});

test.describe("Virtual Keyboard - Disabled and Readonly Handling", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/index.html");
    await waitForExtension(page);
  });

  test("disabled input does not open keyboard", async ({ page }) => {
    await page.click("#disabled-input", { force: true });
    await page.waitForTimeout(300);

    const isOpen = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      return (
        host?.shadowRoot?.querySelector("#virtual-keyboard")?.dataset.state ===
        "open"
      );
    });

    expect(isOpen).toBe(false);
  });

  test("readonly input does not trigger keyboard", async ({ page }) => {
    await page.click("#readonly-input", { force: true });
    await page.waitForTimeout(300);

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

test.describe("Virtual Keyboard - URL Bar Submit", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/index.html");
    await waitForExtension(page);
  });

  test("URL bar has form structure", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    const hasForm = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      const urlBar = host?.shadowRoot?.querySelector("#vk-url-bar");
      return urlBar?.querySelector("form") !== null;
    });

    expect(hasForm).toBe(true);
  });

  test("URL bar has submit button", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    const hasSubmit = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      const urlBar = host?.shadowRoot?.querySelector("#vk-url-bar");
      return urlBar?.querySelector('input[type="submit"]') !== null;
    });

    expect(hasSubmit).toBe(true);
  });
});

test.describe("Virtual Keyboard - Shift Key Visual", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/index.html");
    await waitForExtension(page);
  });

  test("shift key has icon", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    const hasIcon = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      const shift = host?.shadowRoot?.querySelector('[data-key="Shift"]');
      return shift?.querySelector(".vk-icon") !== null;
    });

    expect(hasIcon).toBe(true);
  });
});

test.describe("Virtual Keyboard - Mixed Input Types", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/index.html");
    await waitForExtension(page);
  });

  test("switching between text and email updates button", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    // Text shows URL button
    let btnText = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      return host?.shadowRoot?.querySelector("#vk-url-btn span")?.textContent;
    });
    expect(btnText).toBe("URL");

    // Switch to email
    await page.click("#email-input");
    await page.waitForTimeout(200);

    btnText = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      return host?.shadowRoot?.querySelector("#vk-url-btn span")?.textContent;
    });
    expect(btnText).toBe(".com");
  });

  test("switching from email to text resets button", async ({ page }) => {
    await page.click("#email-input");
    await waitForKeyboardOpen(page);
    await page.click("#text-input");
    await page.waitForTimeout(200);

    const btnText = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      return host?.shadowRoot?.querySelector("#vk-url-btn span")?.textContent;
    });
    expect(btnText).toBe("URL");
  });
});

test.describe("Virtual Keyboard - Input Focus Management", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/index.html");
    await waitForExtension(page);
  });

  test("clicking key keeps focus on input", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);
    await clickKey(page, "a");

    const focusedId = await page.evaluate(() => document.activeElement?.id);
    expect(focusedId).toBe("text-input");
  });

  test("typing multiple characters maintains focus", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);
    await typeWithKeyboard(page, "hello world");

    const focusedId = await page.evaluate(() => document.activeElement?.id);
    expect(focusedId).toBe("text-input");
  });
});

test.describe("Virtual Keyboard - Bottom Row Keys", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/index.html");
    await waitForExtension(page);
  });

  test("bottom row has space key", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    const hasSpace = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      return host?.shadowRoot?.querySelector('[data-key=" "]') !== null;
    });

    expect(hasSpace).toBe(true);
  });

  test("bottom row has numbers toggle", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    const has123 = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      return host?.shadowRoot?.querySelector('[data-key="&123"]') !== null;
    });

    expect(has123).toBe(true);
  });

  test("bottom row has close key", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    const hasClose = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      return host?.shadowRoot?.querySelector('[data-key="Close"]') !== null;
    });

    expect(hasClose).toBe(true);
  });
});

test.describe("Virtual Keyboard - Key Button Types", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/index.html");
    await waitForExtension(page);
  });

  test("keys are button elements", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    const allButtons = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      const keys = host?.shadowRoot?.querySelectorAll(".vk-key") || [];
      return Array.from(keys).every((k) => k.tagName === "BUTTON");
    });

    expect(allButtons).toBe(true);
  });

  test("keys have type button attribute", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    const allTypeButton = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      const keys = host?.shadowRoot?.querySelectorAll(".vk-key") || [];
      return Array.from(keys).every((k) => k.getAttribute("type") === "button");
    });

    expect(allTypeButton).toBe(true);
  });
});

test.describe("Virtual Keyboard - Text Insertion", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/index.html");
    await waitForExtension(page);
  });

  test("typing at cursor position works", async ({ page }) => {
    await page.fill("#text-input", "ac");
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    await page.evaluate(() => {
      const el = document.querySelector("#text-input");
      el.setSelectionRange(1, 1);
    });

    await clickKey(page, "b");
    const value = await page.inputValue("#text-input");
    expect(value).toBe("abc");
  });

  test("replacing selection works", async ({ page }) => {
    await page.fill("#text-input", "hello");
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    await page.evaluate(() => {
      const el = document.querySelector("#text-input");
      el.setSelectionRange(0, 5);
    });

    await typeWithKeyboard(page, "bye");
    const value = await page.inputValue("#text-input");
    expect(value).toBe("bye");
  });
});

test.describe("Virtual Keyboard - Special Characters", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/index.html");
    await waitForExtension(page);
  });

  test("comma key works", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);
    await clickKey(page, ",");

    const value = await page.inputValue("#text-input");
    expect(value).toBe(",");
  });

  test("period key works", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);
    await clickKey(page, ".");

    const value = await page.inputValue("#text-input");
    expect(value).toBe(".");
  });
});
