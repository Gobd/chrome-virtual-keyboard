import { test, expect } from "./fixtures.js";
import {
  waitForExtension,
  waitForKeyboardOpen,
  isKeyboardOpen,
  typeWithKeyboard,
  clickKey,
  focusInputInIframe,
  getIframeInputValue,
  isEmailKeyVisible,
  isNumberKeyboardVisible,
  getUrlButtonText,
} from "./helpers.js";

const IFRAME_SELECTOR = "#same-origin-iframe";

test.describe("Virtual Keyboard - Iframe Support", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/iframe.html");
    await waitForExtension(page);
    // Wait for iframes to load
    await page.waitForTimeout(1000);
  });

  test.describe("Text Input in Iframe", () => {
    test("keyboard opens when text input in iframe is focused", async ({
      page,
    }) => {
      await focusInputInIframe(page, IFRAME_SELECTOR, "#iframe-text");
      await waitForKeyboardOpen(page);

      const isOpen = await isKeyboardOpen(page);
      expect(isOpen).toBe(true);
    });

    test("typing works in iframe text input", async ({ page }) => {
      await focusInputInIframe(page, IFRAME_SELECTOR, "#iframe-text");
      await waitForKeyboardOpen(page);

      await typeWithKeyboard(page, "hello iframe");

      const value = await getIframeInputValue(
        page,
        IFRAME_SELECTOR,
        "#iframe-text",
      );
      expect(value).toBe("hello iframe");
    });

    test("cursor position works in iframe text input", async ({ page }) => {
      const frame = page.frameLocator(IFRAME_SELECTOR);
      await frame.locator("#iframe-text").fill("helloworld");
      await frame.locator("#iframe-text").click();
      await waitForKeyboardOpen(page);

      // Position cursor in middle
      await frame.locator("#iframe-text").evaluate((el) => {
        el.setSelectionRange(5, 5);
      });

      await typeWithKeyboard(page, " ");

      const value = await getIframeInputValue(
        page,
        IFRAME_SELECTOR,
        "#iframe-text",
      );
      expect(value).toBe("hello world");
    });

    test("backspace works at cursor position in iframe", async ({ page }) => {
      const frame = page.frameLocator(IFRAME_SELECTOR);
      await frame.locator("#iframe-text").fill("hello world");
      await frame.locator("#iframe-text").click();
      await waitForKeyboardOpen(page);

      // Position cursor after space
      await frame.locator("#iframe-text").evaluate((el) => {
        el.setSelectionRange(6, 6);
      });

      await clickKey(page, "Backspace");

      const value = await getIframeInputValue(
        page,
        IFRAME_SELECTOR,
        "#iframe-text",
      );
      expect(value).toBe("helloworld");
    });
  });

  test.describe("Email Input in Iframe", () => {
    test("email input in iframe shows @ key", async ({ page }) => {
      await focusInputInIframe(page, IFRAME_SELECTOR, "#iframe-email");
      await waitForKeyboardOpen(page);

      const isVisible = await isEmailKeyVisible(page);
      expect(isVisible).toBe(true);
    });

    test("email input in iframe shows .com button", async ({ page }) => {
      await focusInputInIframe(page, IFRAME_SELECTOR, "#iframe-email");
      await waitForKeyboardOpen(page);

      const buttonText = await getUrlButtonText(page);
      expect(buttonText).toBe(".com");
    });

    test("typing email in iframe works", async ({ page }) => {
      await focusInputInIframe(page, IFRAME_SELECTOR, "#iframe-email");
      await waitForKeyboardOpen(page);

      await typeWithKeyboard(page, "user");
      await clickKey(page, "@");
      await typeWithKeyboard(page, "example.com");

      const value = await getIframeInputValue(
        page,
        IFRAME_SELECTOR,
        "#iframe-email",
      );
      expect(value).toBe("user@example.com");
    });

    test("cursor position works in iframe email input", async ({ page }) => {
      const frame = page.frameLocator(IFRAME_SELECTOR);
      await frame.locator("#iframe-email").fill("user@example");
      await frame.locator("#iframe-email").click();
      await waitForKeyboardOpen(page);

      // Position at end
      await frame.locator("#iframe-email").evaluate((el) => {
        el.setSelectionRange(el.value.length, el.value.length);
      });

      await typeWithKeyboard(page, ".com");

      const value = await getIframeInputValue(
        page,
        IFRAME_SELECTOR,
        "#iframe-email",
      );
      expect(value).toBe("user@example.com");
    });
  });

  test.describe("Password Input in Iframe", () => {
    test("keyboard opens for password input in iframe", async ({ page }) => {
      await focusInputInIframe(page, IFRAME_SELECTOR, "#iframe-password");
      await waitForKeyboardOpen(page);

      const isOpen = await isKeyboardOpen(page);
      expect(isOpen).toBe(true);
    });

    test("typing works in iframe password input", async ({ page }) => {
      await focusInputInIframe(page, IFRAME_SELECTOR, "#iframe-password");
      await waitForKeyboardOpen(page);

      await typeWithKeyboard(page, "secret123");

      const value = await getIframeInputValue(
        page,
        IFRAME_SELECTOR,
        "#iframe-password",
      );
      expect(value).toBe("secret123");
    });

    test("cursor position works in iframe password input", async ({ page }) => {
      const frame = page.frameLocator(IFRAME_SELECTOR);
      await frame.locator("#iframe-password").fill("pass");
      await frame.locator("#iframe-password").click();
      await waitForKeyboardOpen(page);

      // Position at beginning
      await frame.locator("#iframe-password").evaluate((el) => {
        el.setSelectionRange(0, 0);
      });

      await typeWithKeyboard(page, "my");

      const value = await getIframeInputValue(
        page,
        IFRAME_SELECTOR,
        "#iframe-password",
      );
      expect(value).toBe("mypass");
    });
  });

  test.describe("Search Input in Iframe", () => {
    test("keyboard opens for search input in iframe", async ({ page }) => {
      await focusInputInIframe(page, IFRAME_SELECTOR, "#iframe-search");
      await waitForKeyboardOpen(page);

      const isOpen = await isKeyboardOpen(page);
      expect(isOpen).toBe(true);
    });

    test("typing works in iframe search input", async ({ page }) => {
      await focusInputInIframe(page, IFRAME_SELECTOR, "#iframe-search");
      await waitForKeyboardOpen(page);

      await typeWithKeyboard(page, "search query");

      const value = await getIframeInputValue(
        page,
        IFRAME_SELECTOR,
        "#iframe-search",
      );
      expect(value).toBe("search query");
    });

    test("cursor position works in iframe search input", async ({ page }) => {
      const frame = page.frameLocator(IFRAME_SELECTOR);
      await frame.locator("#iframe-search").fill("searchterm");
      await frame.locator("#iframe-search").click();
      await waitForKeyboardOpen(page);

      // Position in middle
      await frame.locator("#iframe-search").evaluate((el) => {
        el.setSelectionRange(6, 6);
      });

      await typeWithKeyboard(page, " ");

      const value = await getIframeInputValue(
        page,
        IFRAME_SELECTOR,
        "#iframe-search",
      );
      expect(value).toBe("search term");
    });
  });

  test.describe("Number Input in Iframe", () => {
    test("number keyboard shows for number input in iframe", async ({
      page,
    }) => {
      await focusInputInIframe(page, IFRAME_SELECTOR, "#iframe-number");
      await waitForKeyboardOpen(page);

      const isVisible = await isNumberKeyboardVisible(page);
      expect(isVisible).toBe(true);
    });

    test("typing numbers works in iframe", async ({ page }) => {
      await focusInputInIframe(page, IFRAME_SELECTOR, "#iframe-number");
      await waitForKeyboardOpen(page);

      await clickKey(page, "1");
      await clickKey(page, "2");
      await clickKey(page, "3");

      const value = await getIframeInputValue(
        page,
        IFRAME_SELECTOR,
        "#iframe-number",
      );
      expect(value).toBe("123");
    });

    test("decimal works in iframe number input", async ({ page }) => {
      await focusInputInIframe(page, IFRAME_SELECTOR, "#iframe-number");
      await waitForKeyboardOpen(page);

      await clickKey(page, "1");
      await clickKey(page, ".");
      await clickKey(page, "5");

      const value = await getIframeInputValue(
        page,
        IFRAME_SELECTOR,
        "#iframe-number",
      );
      expect(value).toBe("1.5");
    });
  });

  test.describe("Tel Input in Iframe", () => {
    test("number keyboard shows for tel input in iframe", async ({ page }) => {
      await focusInputInIframe(page, IFRAME_SELECTOR, "#iframe-tel");
      await waitForKeyboardOpen(page);

      const isVisible = await isNumberKeyboardVisible(page);
      expect(isVisible).toBe(true);
    });

    test("typing phone number works in iframe", async ({ page }) => {
      await focusInputInIframe(page, IFRAME_SELECTOR, "#iframe-tel");
      await waitForKeyboardOpen(page);

      await clickKey(page, "5");
      await clickKey(page, "5");
      await clickKey(page, "5");
      await clickKey(page, "-");
      await clickKey(page, "1");
      await clickKey(page, "2");
      await clickKey(page, "3");
      await clickKey(page, "4");

      const value = await getIframeInputValue(
        page,
        IFRAME_SELECTOR,
        "#iframe-tel",
      );
      expect(value).toBe("555-1234");
    });
  });

  test.describe("URL Input in Iframe", () => {
    test("keyboard opens for url input in iframe", async ({ page }) => {
      await focusInputInIframe(page, IFRAME_SELECTOR, "#iframe-url");
      await waitForKeyboardOpen(page);

      const isOpen = await isKeyboardOpen(page);
      expect(isOpen).toBe(true);
    });

    test("typing url works in iframe", async ({ page }) => {
      await focusInputInIframe(page, IFRAME_SELECTOR, "#iframe-url");
      await waitForKeyboardOpen(page);

      await typeWithKeyboard(page, "example.com");

      const value = await getIframeInputValue(
        page,
        IFRAME_SELECTOR,
        "#iframe-url",
      );
      expect(value).toBe("example.com");
    });

    test("cursor position works in iframe url input", async ({ page }) => {
      const frame = page.frameLocator(IFRAME_SELECTOR);
      await frame.locator("#iframe-url").fill("example.com");
      await frame.locator("#iframe-url").click();
      await waitForKeyboardOpen(page);

      // Position at beginning
      await frame.locator("#iframe-url").evaluate((el) => {
        el.setSelectionRange(0, 0);
      });

      await typeWithKeyboard(page, "www.");

      const value = await getIframeInputValue(
        page,
        IFRAME_SELECTOR,
        "#iframe-url",
      );
      expect(value).toBe("www.example.com");
    });
  });

  test.describe("Textarea in Iframe", () => {
    test("keyboard opens for textarea in iframe", async ({ page }) => {
      await focusInputInIframe(page, IFRAME_SELECTOR, "#iframe-textarea");
      await waitForKeyboardOpen(page);

      const isOpen = await isKeyboardOpen(page);
      expect(isOpen).toBe(true);
    });

    test("typing works in iframe textarea", async ({ page }) => {
      await focusInputInIframe(page, IFRAME_SELECTOR, "#iframe-textarea");
      await waitForKeyboardOpen(page);

      await typeWithKeyboard(page, "multiline text");

      const value = await getIframeInputValue(
        page,
        IFRAME_SELECTOR,
        "#iframe-textarea",
      );
      expect(value).toBe("multiline text");
    });

    test("enter adds newline in iframe textarea", async ({ page }) => {
      await focusInputInIframe(page, IFRAME_SELECTOR, "#iframe-textarea");
      await waitForKeyboardOpen(page);

      await typeWithKeyboard(page, "line1");
      await clickKey(page, "Enter");
      await typeWithKeyboard(page, "line2");

      const value = await getIframeInputValue(
        page,
        IFRAME_SELECTOR,
        "#iframe-textarea",
      );
      expect(value).toBe("line1\nline2");
    });

    test("cursor position works in iframe textarea", async ({ page }) => {
      const frame = page.frameLocator(IFRAME_SELECTOR);
      await frame.locator("#iframe-textarea").fill("helloworld");
      await frame.locator("#iframe-textarea").click();
      await waitForKeyboardOpen(page);

      // Position in middle
      await frame.locator("#iframe-textarea").evaluate((el) => {
        el.setSelectionRange(5, 5);
      });

      await typeWithKeyboard(page, " ");

      const value = await getIframeInputValue(
        page,
        IFRAME_SELECTOR,
        "#iframe-textarea",
      );
      expect(value).toBe("hello world");
    });
  });

  test.describe("Contenteditable in Iframe", () => {
    test("keyboard opens for contenteditable in iframe", async ({ page }) => {
      const frame = page.frameLocator(IFRAME_SELECTOR);
      await frame.locator("#iframe-contenteditable").click();
      await waitForKeyboardOpen(page);

      const isOpen = await isKeyboardOpen(page);
      expect(isOpen).toBe(true);
    });

    test("typing works in iframe contenteditable", async ({ page }) => {
      const frame = page.frameLocator(IFRAME_SELECTOR);
      await frame.locator("#iframe-contenteditable").evaluate((el) => {
        el.textContent = "";
      });
      await frame.locator("#iframe-contenteditable").click();
      await waitForKeyboardOpen(page);

      await typeWithKeyboard(page, "edited content");

      const text = await frame.locator("#iframe-contenteditable").textContent();
      expect(text).toBe("edited content");
    });

    test("enter adds line break in iframe contenteditable", async ({
      page,
    }) => {
      const frame = page.frameLocator(IFRAME_SELECTOR);
      await frame.locator("#iframe-contenteditable").evaluate((el) => {
        el.innerHTML = "";
      });
      await frame.locator("#iframe-contenteditable").click();
      await waitForKeyboardOpen(page);

      await typeWithKeyboard(page, "line1");
      await clickKey(page, "Enter");
      await typeWithKeyboard(page, "line2");

      const html = await frame
        .locator("#iframe-contenteditable")
        .evaluate((el) => el.innerHTML);
      expect(html).toContain("<br>");
      expect(html).toContain("line1");
      expect(html).toContain("line2");
    });

    test("cursor position works in iframe contenteditable", async ({
      page,
    }) => {
      const frame = page.frameLocator(IFRAME_SELECTOR);
      await frame.locator("#iframe-contenteditable").evaluate((el) => {
        el.textContent = "helloworld";
      });
      await frame.locator("#iframe-contenteditable").click();
      await waitForKeyboardOpen(page);

      // Position cursor in middle using evaluate on the frame
      await frame.locator("#iframe-contenteditable").evaluate((el) => {
        const range = document.createRange();
        range.setStart(el.firstChild, 5);
        range.collapse(true);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      });

      await typeWithKeyboard(page, " ");

      const text = await frame.locator("#iframe-contenteditable").textContent();
      expect(text).toBe("hello world");
    });
  });

  test.describe("Role Textbox in Iframe", () => {
    test("keyboard opens for role=textbox in iframe", async ({ page }) => {
      const frame = page.frameLocator(IFRAME_SELECTOR);
      await frame.locator("#iframe-role-textbox").click();
      await waitForKeyboardOpen(page);

      const isOpen = await isKeyboardOpen(page);
      expect(isOpen).toBe(true);
    });

    test("typing works in iframe role=textbox", async ({ page }) => {
      const frame = page.frameLocator(IFRAME_SELECTOR);
      await frame.locator("#iframe-role-textbox").evaluate((el) => {
        el.textContent = "";
      });
      await frame.locator("#iframe-role-textbox").click();
      await waitForKeyboardOpen(page);

      await typeWithKeyboard(page, "textbox content");

      const text = await frame.locator("#iframe-role-textbox").textContent();
      expect(text).toBe("textbox content");
    });

    test("cursor position works in iframe role=textbox", async ({ page }) => {
      const frame = page.frameLocator(IFRAME_SELECTOR);
      await frame.locator("#iframe-role-textbox").evaluate((el) => {
        el.textContent = "helloworld";
      });
      await frame.locator("#iframe-role-textbox").click();
      await waitForKeyboardOpen(page);

      // Position cursor in middle
      await frame.locator("#iframe-role-textbox").evaluate((el) => {
        const range = document.createRange();
        range.setStart(el.firstChild, 5);
        range.collapse(true);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      });

      await typeWithKeyboard(page, " ");

      const text = await frame.locator("#iframe-role-textbox").textContent();
      expect(text).toBe("hello world");
    });

    test("backspace works at cursor position in iframe role=textbox", async ({
      page,
    }) => {
      const frame = page.frameLocator(IFRAME_SELECTOR);
      await frame.locator("#iframe-role-textbox").evaluate((el) => {
        el.textContent = "hello world";
      });
      await frame.locator("#iframe-role-textbox").click();
      await waitForKeyboardOpen(page);

      // Position cursor after space
      await frame.locator("#iframe-role-textbox").evaluate((el) => {
        const range = document.createRange();
        range.setStart(el.firstChild, 6);
        range.collapse(true);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      });

      await clickKey(page, "Backspace");

      const text = await frame.locator("#iframe-role-textbox").textContent();
      expect(text).toBe("helloworld");
    });
  });

  test.describe("Switching Between Main Page and Iframe", () => {
    test("switching from main page to iframe input works", async ({ page }) => {
      // Type in main page first
      await page.click("#main-input");
      await waitForKeyboardOpen(page);
      await typeWithKeyboard(page, "main");

      // Switch to iframe
      await focusInputInIframe(page, IFRAME_SELECTOR, "#iframe-text");
      await page.waitForTimeout(100);
      await typeWithKeyboard(page, "iframe");

      const mainValue = await page.inputValue("#main-input");
      const iframeValue = await getIframeInputValue(
        page,
        IFRAME_SELECTOR,
        "#iframe-text",
      );

      expect(mainValue).toBe("main");
      expect(iframeValue).toBe("iframe");
    });

    test("switching from iframe to main page input works", async ({ page }) => {
      // Type in iframe first
      await focusInputInIframe(page, IFRAME_SELECTOR, "#iframe-text");
      await waitForKeyboardOpen(page);
      await typeWithKeyboard(page, "iframe");

      // Switch to main page
      await page.click("#main-input");
      await page.waitForTimeout(100);
      await typeWithKeyboard(page, "main");

      const mainValue = await page.inputValue("#main-input");
      const iframeValue = await getIframeInputValue(
        page,
        IFRAME_SELECTOR,
        "#iframe-text",
      );

      expect(mainValue).toBe("main");
      expect(iframeValue).toBe("iframe");
    });

    test("keyboard type switches when moving between email in iframe and text in main", async ({
      page,
    }) => {
      // Focus email in iframe - should show .com
      await focusInputInIframe(page, IFRAME_SELECTOR, "#iframe-email");
      await waitForKeyboardOpen(page);

      let buttonText = await getUrlButtonText(page);
      expect(buttonText).toBe(".com");

      // Focus text in main page - should show URL
      await page.click("#main-input");
      await page.waitForTimeout(100);

      buttonText = await getUrlButtonText(page);
      expect(buttonText).toBe("URL");
    });
  });

  test.describe("Multiple Iframes", () => {
    test("switching between multiple iframes works", async ({ page }) => {
      // Type in first iframe
      await focusInputInIframe(page, "#iframe-1", "#iframe-text");
      await waitForKeyboardOpen(page);
      await typeWithKeyboard(page, "first");

      // Type in second iframe
      await focusInputInIframe(page, "#iframe-2", "#iframe-text");
      await page.waitForTimeout(100);
      await typeWithKeyboard(page, "second");

      const value1 = await getIframeInputValue(
        page,
        "#iframe-1",
        "#iframe-text",
      );
      const value2 = await getIframeInputValue(
        page,
        "#iframe-2",
        "#iframe-text",
      );

      expect(value1).toBe("first");
      expect(value2).toBe("second");
    });

    test("cursor position works when switching between iframes", async ({
      page,
    }) => {
      // Fill and position in first iframe
      const frame1 = page.frameLocator("#iframe-1");
      await frame1.locator("#iframe-text").fill("hello");
      await frame1.locator("#iframe-text").click();
      await waitForKeyboardOpen(page);

      await frame1.locator("#iframe-text").evaluate((el) => {
        el.setSelectionRange(0, 0);
      });
      await typeWithKeyboard(page, "A");

      // Fill and position in second iframe
      const frame2 = page.frameLocator("#iframe-2");
      await frame2.locator("#iframe-text").fill("world");
      await frame2.locator("#iframe-text").click();
      await page.waitForTimeout(100);

      await frame2.locator("#iframe-text").evaluate((el) => {
        el.setSelectionRange(0, 0);
      });
      await typeWithKeyboard(page, "B");

      const value1 = await getIframeInputValue(
        page,
        "#iframe-1",
        "#iframe-text",
      );
      const value2 = await getIframeInputValue(
        page,
        "#iframe-2",
        "#iframe-text",
      );

      expect(value1).toBe("Ahello");
      expect(value2).toBe("Bworld");
    });
  });
});
