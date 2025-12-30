import { expect, test } from "./fixtures.js";
import {
  clickKey,
  getRecordedEvents,
  startRecordingInputEvents,
  typeWithKeyboard,
  waitForExtension,
  waitForKeyboardOpen,
} from "./helpers.js";

test.describe("Virtual Keyboard - Input Events", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/index.html");
    await waitForExtension(page);
  });

  test("typing dispatches input event", async ({ page }) => {
    await startRecordingInputEvents(page, "#text-input");
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    await clickKey(page, "a");
    await page.waitForTimeout(100);

    const events = await getRecordedEvents(page);
    const inputEvents = events.filter((e) => e.type === "input");
    expect(inputEvents.length).toBeGreaterThan(0);
  });

  test("typing dispatches keydown event", async ({ page }) => {
    await startRecordingInputEvents(page, "#text-input");
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    await clickKey(page, "a");
    await page.waitForTimeout(100);

    const events = await getRecordedEvents(page);
    const keydownEvents = events.filter((e) => e.type === "keydown");
    expect(keydownEvents.length).toBeGreaterThan(0);
  });

  test("typing dispatches keyup event", async ({ page }) => {
    await startRecordingInputEvents(page, "#text-input");
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    await clickKey(page, "a");
    await page.waitForTimeout(100);

    const events = await getRecordedEvents(page);
    const keyupEvents = events.filter((e) => e.type === "keyup");
    expect(keyupEvents.length).toBeGreaterThan(0);
  });

  test("keydown event has correct keyCode", async ({ page }) => {
    await startRecordingInputEvents(page, "#text-input");
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    await clickKey(page, "a");
    await page.waitForTimeout(100);

    const events = await getRecordedEvents(page);
    const keydownEvents = events.filter((e) => e.type === "keydown");
    // 'a' has charCode 97
    expect(
      keydownEvents.some((e) => e.keyCode === 97 || e.charCode === 97)
    ).toBe(true);
  });

  test("shift + letter produces uppercase in input", async ({ page }) => {
    await startRecordingInputEvents(page, "#text-input");
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    await clickKey(page, "Shift");
    await clickKey(page, "a");
    await page.waitForTimeout(100);

    // Verify the uppercase letter was typed
    const value = await page.inputValue("#text-input");
    expect(value).toBe("A");

    // And that input events were fired
    const events = await getRecordedEvents(page);
    const inputEvents = events.filter((e) => e.type === "input");
    expect(inputEvents.length).toBeGreaterThan(0);
  });

  test("backspace dispatches correct key event", async ({ page }) => {
    await page.fill("#text-input", "hello");
    await startRecordingInputEvents(page, "#text-input");
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    await clickKey(page, "Backspace");
    await page.waitForTimeout(100);

    const events = await getRecordedEvents(page);
    const keydownEvents = events.filter((e) => e.type === "keydown");
    // Backspace keyCode is 8
    expect(keydownEvents.some((e) => e.keyCode === 8)).toBe(true);
  });

  test("enter dispatches correct key event in form input", async ({ page }) => {
    // Use form-input because enter in regular text input dispatches keydown before submitting
    await startRecordingInputEvents(page, "#form-input");
    await page.click("#form-input");
    await waitForKeyboardOpen(page);

    await clickKey(page, "Enter");
    await page.waitForTimeout(100);

    const events = await getRecordedEvents(page);
    const keydownEvents = events.filter((e) => e.type === "keydown");
    // Enter keyCode is 13
    expect(keydownEvents.some((e) => e.keyCode === 13)).toBe(true);
  });

  test("space dispatches correct key event", async ({ page }) => {
    await startRecordingInputEvents(page, "#text-input");
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    await clickKey(page, " ");
    await page.waitForTimeout(100);

    const events = await getRecordedEvents(page);
    // Space charCode is 32
    expect(events.some((e) => e.keyCode === 32 || e.charCode === 32)).toBe(
      true
    );
  });

  test("events are dispatched in correct order", async ({ page }) => {
    await startRecordingInputEvents(page, "#text-input");
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    await clickKey(page, "a");
    await page.waitForTimeout(100);

    const events = await getRecordedEvents(page);

    // Find indices
    const keydownIndex = events.findIndex((e) => e.type === "keydown");
    const inputIndex = events.findIndex((e) => e.type === "input");
    const keyupIndex = events.findIndex((e) => e.type === "keyup");

    // keydown should come before input and keyup
    expect(keydownIndex).toBeLessThan(inputIndex);
    expect(keydownIndex).toBeLessThan(keyupIndex);
  });

  test("input respects maxlength attribute", async ({ page }) => {
    // Set maxlength on input
    await page.evaluate(() => {
      document.querySelector("#text-input").setAttribute("maxlength", "5");
    });

    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    // Try to type more than maxlength
    await typeWithKeyboard(page, "1234567890");
    await page.waitForTimeout(100);

    const value = await page.inputValue("#text-input");
    expect(value.length).toBeLessThanOrEqual(5);
  });

  test("input events work with textarea", async ({ page }) => {
    await startRecordingInputEvents(page, "#textarea");
    await page.click("#textarea");
    await waitForKeyboardOpen(page);

    await clickKey(page, "a");
    await page.waitForTimeout(100);

    const events = await getRecordedEvents(page);
    expect(events.filter((e) => e.type === "input").length).toBeGreaterThan(0);
    expect(events.filter((e) => e.type === "keydown").length).toBeGreaterThan(
      0
    );
  });

  test("change event fires on blur after keyboard input", async ({ page }) => {
    // Record change events
    await page.evaluate(() => {
      const el = document.querySelector("#text-input");
      window.__changeEventFired = false;
      el.addEventListener("change", () => {
        window.__changeEventFired = true;
      });
    });

    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    await typeWithKeyboard(page, "hello");

    // Blur the input
    await page.click("h1");
    await page.waitForTimeout(600);

    const changeFired = await page.evaluate(() => window.__changeEventFired);
    expect(changeFired).toBe(true);
  });

  test("focus remains on input while typing", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    await typeWithKeyboard(page, "hello");

    const focusedId = await page.evaluate(
      () => document.activeElement?.id || ""
    );
    expect(focusedId).toBe("text-input");
  });

  test("cursor position advances after each keystroke", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    await clickKey(page, "a");
    await page.waitForTimeout(50);

    let cursorPos = await page.evaluate(() => {
      const el = document.querySelector("#text-input");
      return el.selectionStart;
    });
    expect(cursorPos).toBe(1);

    await clickKey(page, "b");
    await page.waitForTimeout(50);

    cursorPos = await page.evaluate(() => {
      const el = document.querySelector("#text-input");
      return el.selectionStart;
    });
    expect(cursorPos).toBe(2);
  });

  test("selected text is replaced when typing", async ({ page }) => {
    await page.fill("#text-input", "hello");
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    // Select all text
    await page.evaluate(() => {
      const el = document.querySelector("#text-input");
      el.select();
    });

    // Type new character
    await clickKey(page, "x");
    await page.waitForTimeout(100);

    const value = await page.inputValue("#text-input");
    expect(value).toBe("x");
  });

  test("typing at cursor position inserts correctly", async ({ page }) => {
    await page.fill("#text-input", "helloworld");
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    // Move cursor to middle
    await page.evaluate(() => {
      const el = document.querySelector("#text-input");
      el.setSelectionRange(5, 5);
    });

    await clickKey(page, " ");
    await page.waitForTimeout(100);

    const value = await page.inputValue("#text-input");
    expect(value).toBe("hello world");
  });

  test("partial selection is replaced correctly", async ({ page }) => {
    await page.fill("#text-input", "hello world");
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    // Select "world"
    await page.evaluate(() => {
      const el = document.querySelector("#text-input");
      el.setSelectionRange(6, 11);
    });

    await typeWithKeyboard(page, "there");
    await page.waitForTimeout(100);

    const value = await page.inputValue("#text-input");
    expect(value).toBe("hello there");
  });

  test("typing at start of input works", async ({ page }) => {
    await page.fill("#text-input", "world");
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    // Move cursor to start
    await page.evaluate(() => {
      const el = document.querySelector("#text-input");
      el.setSelectionRange(0, 0);
    });

    await typeWithKeyboard(page, "hello ");
    await page.waitForTimeout(100);

    const value = await page.inputValue("#text-input");
    expect(value).toBe("hello world");
  });

  test("typing at end of input works", async ({ page }) => {
    await page.fill("#text-input", "hello");
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    // Move cursor to end
    await page.evaluate(() => {
      const el = document.querySelector("#text-input");
      el.setSelectionRange(5, 5);
    });

    await typeWithKeyboard(page, " world");
    await page.waitForTimeout(100);

    const value = await page.inputValue("#text-input");
    expect(value).toBe("hello world");
  });
});
