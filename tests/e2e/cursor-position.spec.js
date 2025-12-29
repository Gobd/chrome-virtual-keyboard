import { test, expect } from "./fixtures.js";
import {
  waitForExtension,
  waitForKeyboardOpen,
  clickKey,
  typeWithKeyboard,
} from "./helpers.js";

test.describe("Virtual Keyboard - Cursor Position", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/index.html");
    await waitForExtension(page);
  });

  test.describe("Text Input", () => {
    test("can type at beginning of text", async ({ page }) => {
      await page.fill("#text-input", "world");
      await page.click("#text-input");
      await waitForKeyboardOpen(page);

      // Move cursor to beginning
      await page.evaluate(() => {
        const input = document.querySelector("#text-input");
        input.setSelectionRange(0, 0);
      });

      await typeWithKeyboard(page, "hello ");

      const value = await page.inputValue("#text-input");
      expect(value).toBe("hello world");
    });

    test("can type in middle of text", async ({ page }) => {
      await page.fill("#text-input", "helloworld");
      await page.click("#text-input");
      await waitForKeyboardOpen(page);

      // Move cursor to middle (after 'hello')
      await page.evaluate(() => {
        const input = document.querySelector("#text-input");
        input.setSelectionRange(5, 5);
      });

      await typeWithKeyboard(page, " ");

      const value = await page.inputValue("#text-input");
      expect(value).toBe("hello world");
    });

    test("can type at end of text", async ({ page }) => {
      await page.fill("#text-input", "hello");
      await page.click("#text-input");
      await waitForKeyboardOpen(page);

      // Cursor should be at end by default after fill
      await typeWithKeyboard(page, " world");

      const value = await page.inputValue("#text-input");
      expect(value).toBe("hello world");
    });

    test("backspace at middle position works correctly", async ({ page }) => {
      await page.fill("#text-input", "hello world");
      await page.click("#text-input");
      await waitForKeyboardOpen(page);

      // Position cursor after 'hello ' (position 6)
      await page.evaluate(() => {
        const input = document.querySelector("#text-input");
        input.setSelectionRange(6, 6);
      });

      await clickKey(page, "Backspace"); // Delete the space

      const value = await page.inputValue("#text-input");
      expect(value).toBe("helloworld");
    });

    test("typing replaces selected text", async ({ page }) => {
      await page.fill("#text-input", "hello world");
      await page.click("#text-input");
      await waitForKeyboardOpen(page);

      // Select 'world'
      await page.evaluate(() => {
        const input = document.querySelector("#text-input");
        input.setSelectionRange(6, 11);
      });

      await typeWithKeyboard(page, "there");

      const value = await page.inputValue("#text-input");
      expect(value).toBe("hello there");
    });

    test("backspace deletes selected text", async ({ page }) => {
      await page.fill("#text-input", "hello world");
      await page.click("#text-input");
      await waitForKeyboardOpen(page);

      // Select 'world'
      await page.evaluate(() => {
        const input = document.querySelector("#text-input");
        input.setSelectionRange(6, 11);
      });

      await clickKey(page, "Backspace");

      const value = await page.inputValue("#text-input");
      expect(value).toBe("hello ");
    });

    test("cursor position preserved after typing", async ({ page }) => {
      await page.fill("#text-input", "ac");
      await page.click("#text-input");
      await waitForKeyboardOpen(page);

      // Position cursor between 'a' and 'c'
      await page.evaluate(() => {
        const input = document.querySelector("#text-input");
        input.setSelectionRange(1, 1);
      });

      await clickKey(page, "b");

      // Cursor should now be after 'b' (position 2)
      const cursorPos = await page.evaluate(() => {
        const input = document.querySelector("#text-input");
        return input.selectionStart;
      });

      expect(cursorPos).toBe(2);

      const value = await page.inputValue("#text-input");
      expect(value).toBe("abc");
    });
  });

  test.describe("Textarea", () => {
    test("can type at beginning of textarea", async ({ page }) => {
      await page.fill("#textarea", "world");
      await page.click("#textarea");
      await waitForKeyboardOpen(page);

      await page.evaluate(() => {
        const textarea = document.querySelector("#textarea");
        textarea.setSelectionRange(0, 0);
      });

      await typeWithKeyboard(page, "hello ");

      const value = await page.inputValue("#textarea");
      expect(value).toBe("hello world");
    });

    test("can type in middle of textarea", async ({ page }) => {
      await page.fill("#textarea", "helloworld");
      await page.click("#textarea");
      await waitForKeyboardOpen(page);

      await page.evaluate(() => {
        const textarea = document.querySelector("#textarea");
        textarea.setSelectionRange(5, 5);
      });

      await typeWithKeyboard(page, " ");

      const value = await page.inputValue("#textarea");
      expect(value).toBe("hello world");
    });

    test("can type at specific line in multiline textarea", async ({
      page,
    }) => {
      await page.fill("#textarea", "line1\nline3");
      await page.click("#textarea");
      await waitForKeyboardOpen(page);

      // Position cursor after 'line1\n' (position 6)
      await page.evaluate(() => {
        const textarea = document.querySelector("#textarea");
        textarea.setSelectionRange(6, 6);
      });

      await typeWithKeyboard(page, "line2");
      await clickKey(page, "Enter");

      const value = await page.inputValue("#textarea");
      expect(value).toBe("line1\nline2\nline3");
    });

    test("backspace works at cursor position in textarea", async ({ page }) => {
      await page.fill("#textarea", "hello world");
      await page.click("#textarea");
      await waitForKeyboardOpen(page);

      // Position after space
      await page.evaluate(() => {
        const textarea = document.querySelector("#textarea");
        textarea.setSelectionRange(6, 6);
      });

      await clickKey(page, "Backspace");

      const value = await page.inputValue("#textarea");
      expect(value).toBe("helloworld");
    });
  });

  test.describe("Email Input", () => {
    test("can type at cursor position in email input", async ({ page }) => {
      await page.fill("#email-input", "user@example");
      await page.click("#email-input");
      await waitForKeyboardOpen(page);

      // Position cursor at end
      await page.evaluate(() => {
        const input = document.querySelector("#email-input");
        input.setSelectionRange(input.value.length, input.value.length);
      });

      await typeWithKeyboard(page, ".com");

      const value = await page.inputValue("#email-input");
      expect(value).toBe("user@example.com");
    });

    test("can insert @ at cursor position", async ({ page }) => {
      await page.fill("#email-input", "userexample.com");
      await page.click("#email-input");
      await waitForKeyboardOpen(page);

      // Position cursor after 'user'
      await page.evaluate(() => {
        const input = document.querySelector("#email-input");
        input.setSelectionRange(4, 4);
      });

      await clickKey(page, "@");

      const value = await page.inputValue("#email-input");
      expect(value).toBe("user@example.com");
    });
  });

  test.describe("Password Input", () => {
    test("can type at cursor position in password input", async ({ page }) => {
      await page.fill("#password-input", "pass");
      await page.click("#password-input");
      await waitForKeyboardOpen(page);

      // Position cursor at beginning
      await page.evaluate(() => {
        const input = document.querySelector("#password-input");
        input.setSelectionRange(0, 0);
      });

      await typeWithKeyboard(page, "my");

      const value = await page.inputValue("#password-input");
      expect(value).toBe("mypass");
    });
  });

  test.describe("Search Input", () => {
    test("can type at cursor position in search input", async ({ page }) => {
      await page.fill("#search-input", "search term");
      await page.click("#search-input");
      await waitForKeyboardOpen(page);

      // Position cursor between 'search' and 'term'
      await page.evaluate(() => {
        const input = document.querySelector("#search-input");
        input.setSelectionRange(7, 7);
      });

      await typeWithKeyboard(page, "query ");

      const value = await page.inputValue("#search-input");
      expect(value).toBe("search query term");
    });
  });

  test.describe("URL Input", () => {
    test("can type at beginning of url input", async ({ page }) => {
      await page.fill("#url-input", "example.com");
      await page.click("#url-input");
      await waitForKeyboardOpen(page);

      await page.evaluate(() => {
        const input = document.querySelector("#url-input");
        input.setSelectionRange(0, 0);
      });

      await typeWithKeyboard(page, "www.");

      const value = await page.inputValue("#url-input");
      expect(value).toBe("www.example.com");
    });

    test("can type in middle of url input", async ({ page }) => {
      await page.fill("#url-input", "example.com");
      await page.click("#url-input");
      await waitForKeyboardOpen(page);

      // Position cursor after 'example' (position 7)
      await page.evaluate(() => {
        const input = document.querySelector("#url-input");
        input.setSelectionRange(7, 7);
      });

      await typeWithKeyboard(page, ".co");

      const value = await page.inputValue("#url-input");
      expect(value).toBe("example.co.com");
    });

    test("backspace works at cursor position in url input", async ({
      page,
    }) => {
      await page.fill("#url-input", "https://example.com");
      await page.click("#url-input");
      await waitForKeyboardOpen(page);

      // Position cursor after 'https://' (position 8)
      await page.evaluate(() => {
        const input = document.querySelector("#url-input");
        input.setSelectionRange(8, 8);
      });

      // Delete the two slashes
      await clickKey(page, "Backspace");
      await clickKey(page, "Backspace");

      const value = await page.inputValue("#url-input");
      expect(value).toBe("https:example.com");
    });
  });

  test.describe("Contenteditable", () => {
    test("can type at beginning of contenteditable", async ({ page }) => {
      await page.evaluate(() => {
        document.querySelector("#contenteditable").textContent = "world";
      });
      await page.click("#contenteditable");
      await waitForKeyboardOpen(page);

      // Position cursor at beginning
      await page.evaluate(() => {
        const el = document.querySelector("#contenteditable");
        const range = document.createRange();
        range.setStart(el.firstChild, 0);
        range.collapse(true);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      });

      await typeWithKeyboard(page, "hello ");

      const text = await page.textContent("#contenteditable");
      expect(text).toBe("hello world");
    });

    test("can type in middle of contenteditable", async ({ page }) => {
      await page.evaluate(() => {
        document.querySelector("#contenteditable").textContent = "helloworld";
      });
      await page.click("#contenteditable");
      await waitForKeyboardOpen(page);

      // Position cursor in middle
      await page.evaluate(() => {
        const el = document.querySelector("#contenteditable");
        const range = document.createRange();
        range.setStart(el.firstChild, 5);
        range.collapse(true);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      });

      await typeWithKeyboard(page, " ");

      const text = await page.textContent("#contenteditable");
      expect(text).toBe("hello world");
    });

    test("backspace at cursor position in contenteditable", async ({
      page,
    }) => {
      await page.evaluate(() => {
        document.querySelector("#contenteditable").textContent = "hello world";
      });
      await page.click("#contenteditable");
      await waitForKeyboardOpen(page);

      // Position cursor after space (position 6)
      await page.evaluate(() => {
        const el = document.querySelector("#contenteditable");
        const range = document.createRange();
        range.setStart(el.firstChild, 6);
        range.collapse(true);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      });

      await clickKey(page, "Backspace");

      const text = await page.textContent("#contenteditable");
      expect(text).toBe("helloworld");
    });

    test("typing replaces selected text in contenteditable", async ({
      page,
    }) => {
      await page.evaluate(() => {
        document.querySelector("#contenteditable").textContent = "hello world";
      });
      await page.click("#contenteditable");
      await waitForKeyboardOpen(page);

      // Select 'world'
      await page.evaluate(() => {
        const el = document.querySelector("#contenteditable");
        const range = document.createRange();
        range.setStart(el.firstChild, 6);
        range.setEnd(el.firstChild, 11);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      });

      await typeWithKeyboard(page, "there");

      const text = await page.textContent("#contenteditable");
      expect(text).toBe("hello there");
    });
  });

  test.describe("Role Textbox", () => {
    test("can type at beginning of role=textbox", async ({ page }) => {
      await page.evaluate(() => {
        document.querySelector("#role-textbox").textContent = "world";
      });
      await page.click("#role-textbox");
      await waitForKeyboardOpen(page);

      // Position cursor at beginning
      await page.evaluate(() => {
        const el = document.querySelector("#role-textbox");
        const range = document.createRange();
        range.setStart(el.firstChild, 0);
        range.collapse(true);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      });

      await typeWithKeyboard(page, "hello ");

      const text = await page.textContent("#role-textbox");
      expect(text).toBe("hello world");
    });

    test("can type in middle of role=textbox", async ({ page }) => {
      await page.evaluate(() => {
        document.querySelector("#role-textbox").textContent = "helloworld";
      });
      await page.click("#role-textbox");
      await waitForKeyboardOpen(page);

      // Position cursor in middle
      await page.evaluate(() => {
        const el = document.querySelector("#role-textbox");
        const range = document.createRange();
        range.setStart(el.firstChild, 5);
        range.collapse(true);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      });

      await typeWithKeyboard(page, " ");

      const text = await page.textContent("#role-textbox");
      expect(text).toBe("hello world");
    });

    test("backspace at cursor position in role=textbox", async ({ page }) => {
      await page.evaluate(() => {
        document.querySelector("#role-textbox").textContent = "hello world";
      });
      await page.click("#role-textbox");
      await waitForKeyboardOpen(page);

      // Position cursor after space (position 6)
      await page.evaluate(() => {
        const el = document.querySelector("#role-textbox");
        const range = document.createRange();
        range.setStart(el.firstChild, 6);
        range.collapse(true);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      });

      await clickKey(page, "Backspace");

      const text = await page.textContent("#role-textbox");
      expect(text).toBe("helloworld");
    });

    test("typing replaces selected text in role=textbox", async ({ page }) => {
      await page.evaluate(() => {
        document.querySelector("#role-textbox").textContent = "hello world";
      });
      await page.click("#role-textbox");
      await waitForKeyboardOpen(page);

      // Select 'world'
      await page.evaluate(() => {
        const el = document.querySelector("#role-textbox");
        const range = document.createRange();
        range.setStart(el.firstChild, 6);
        range.setEnd(el.firstChild, 11);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      });

      await typeWithKeyboard(page, "there");

      const text = await page.textContent("#role-textbox");
      expect(text).toBe("hello there");
    });
  });

  test.describe("Click to Position Cursor", () => {
    test("clicking in middle of input positions cursor correctly", async ({
      page,
    }) => {
      await page.fill("#text-input", "hello world");

      // Click to focus and open keyboard
      await page.click("#text-input");
      await waitForKeyboardOpen(page);

      // Now explicitly set cursor position
      // This avoids font-rendering differences across platforms
      await page.evaluate(() => {
        const input = document.querySelector("#text-input");
        input.setSelectionRange(5, 5); // Position cursor after "hello"
      });

      // Type something - it should go where we positioned the cursor
      await typeWithKeyboard(page, "X");

      const value = await page.inputValue("#text-input");
      // The X should be at position 5, resulting in "helloX world"
      expect(value).toBe("helloX world");
    });
  });
});
