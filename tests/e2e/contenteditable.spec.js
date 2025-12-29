import { test, expect } from "./fixtures.js";
import {
  waitForExtension,
  waitForKeyboardOpen,
  isKeyboardOpen,
  clickKey,
  typeWithKeyboard,
} from "./helpers.js";

test.describe("Virtual Keyboard - Contenteditable", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/index.html");
    await waitForExtension(page);
  });

  test("keyboard opens when contenteditable is focused", async ({ page }) => {
    await page.click("#contenteditable");
    await waitForKeyboardOpen(page);

    const isOpen = await isKeyboardOpen(page);
    expect(isOpen).toBe(true);
  });

  test("keyboard opens when role=textbox is focused", async ({ page }) => {
    await page.click("#role-textbox");
    await waitForKeyboardOpen(page);

    const isOpen = await isKeyboardOpen(page);
    expect(isOpen).toBe(true);
  });

  test("typing inserts text into contenteditable", async ({ page }) => {
    // Clear existing content
    await page.evaluate(() => {
      document.querySelector("#contenteditable").textContent = "";
    });

    await page.click("#contenteditable");
    await waitForKeyboardOpen(page);

    await typeWithKeyboard(page, "hello");

    const text = await page.textContent("#contenteditable");
    expect(text).toBe("hello");
  });

  test("enter key creates line break in contenteditable", async ({ page }) => {
    // Clear existing content
    await page.evaluate(() => {
      document.querySelector("#contenteditable").innerHTML = "";
    });

    await page.click("#contenteditable");
    await waitForKeyboardOpen(page);

    await typeWithKeyboard(page, "line1");
    await clickKey(page, "Enter");
    await typeWithKeyboard(page, "line2");

    // Check that there's a <br> element
    const html = await page.evaluate(() => {
      return document.querySelector("#contenteditable").innerHTML;
    });
    expect(html).toContain("<br>");
    expect(html).toContain("line1");
    expect(html).toContain("line2");
  });

  test("backspace deletes characters in contenteditable", async ({ page }) => {
    // Clear and focus
    await page.evaluate(() => {
      document.querySelector("#contenteditable").textContent = "";
    });

    await page.click("#contenteditable");
    await waitForKeyboardOpen(page);

    await typeWithKeyboard(page, "hello");
    await clickKey(page, "Backspace");
    await clickKey(page, "Backspace");

    const text = await page.textContent("#contenteditable");
    expect(text).toBe("hel");
  });

  test("space key works in contenteditable", async ({ page }) => {
    await page.evaluate(() => {
      document.querySelector("#contenteditable").textContent = "";
    });

    await page.click("#contenteditable");
    await waitForKeyboardOpen(page);

    await typeWithKeyboard(page, "hello world");

    const text = await page.textContent("#contenteditable");
    expect(text).toBe("hello world");
  });

  test("uppercase works in contenteditable", async ({ page }) => {
    await page.evaluate(() => {
      document.querySelector("#contenteditable").textContent = "";
    });

    await page.click("#contenteditable");
    await waitForKeyboardOpen(page);

    await typeWithKeyboard(page, "Hello World");

    const text = await page.textContent("#contenteditable");
    expect(text).toBe("Hello World");
  });

  test("role=textbox contenteditable works the same", async ({ page }) => {
    await page.evaluate(() => {
      document.querySelector("#role-textbox").textContent = "";
    });

    await page.click("#role-textbox");
    await waitForKeyboardOpen(page);

    await typeWithKeyboard(page, "test");

    const text = await page.textContent("#role-textbox");
    expect(text).toBe("test");
  });

  test("can type at cursor position in contenteditable", async ({ page }) => {
    // Set initial content
    await page.evaluate(() => {
      const el = document.querySelector("#contenteditable");
      el.innerHTML = "helloworld";
    });

    await page.click("#contenteditable");
    await waitForKeyboardOpen(page);

    // Position cursor in middle using Selection API
    await page.evaluate(() => {
      const el = document.querySelector("#contenteditable");
      const textNode = el.firstChild;
      const range = document.createRange();
      range.setStart(textNode, 5);
      range.collapse(true);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    });

    await typeWithKeyboard(page, " ");

    const text = await page.textContent("#contenteditable");
    expect(text).toBe("hello world");
  });
});
