import { expect, test } from "./fixtures.js";
import {
  clickKey,
  getKeyboardPosition,
  typeWithKeyboard,
  waitForExtension,
  waitForKeyboardOpen,
} from "./helpers.js";

test.describe("Virtual Keyboard - Drag Handle", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/index.html");
    await waitForExtension(page);
  });

  test("drag handle element exists in keyboard", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    const handleExists = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      return host.shadowRoot.querySelector(".vk-drag-handle") !== null;
    });

    expect(handleExists).toBe(true);
  });

  test("drag handle is hidden by default (keyboardDraggable false)", async ({
    page,
  }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    const isHidden = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      const handle = host.shadowRoot.querySelector(".vk-drag-handle");
      return handle?.style.display === "none";
    });

    expect(isHidden).toBe(true);
  });

  test("keyboard has default position CSS variable", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    const hasPositionVar = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      const keyboard = host.shadowRoot.querySelector("#virtual-keyboard");
      const offsetX = keyboard.style.getPropertyValue("--vk-offset-x");
      // Default is 0px or empty
      return offsetX === "" || offsetX === "0px";
    });

    expect(hasPositionVar).toBe(true);
  });

  test("keyboard is centered at bottom by default", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    const isCentered = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      const keyboard = host.shadowRoot.querySelector("#virtual-keyboard");
      const rect = keyboard.getBoundingClientRect();
      const viewportCenter = window.innerWidth / 2;
      const keyboardCenter = rect.left + rect.width / 2;
      // Allow some tolerance for centering
      return Math.abs(viewportCenter - keyboardCenter) < 50;
    });

    expect(isCentered).toBe(true);
  });

  test("keyboard is visible in viewport when open", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    const isVisible = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      const keyboard = host.shadowRoot.querySelector("#virtual-keyboard");
      const rect = keyboard.getBoundingClientRect();
      // Keyboard should be at least partially visible
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        rect.top < window.innerHeight &&
        rect.bottom > 0
      );
    });

    expect(isVisible).toBe(true);
  });
});

test.describe("Virtual Keyboard - Spacebar", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/index.html");
    await waitForExtension(page);
  });

  test("spacebar key exists", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    const spaceExists = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      return host.shadowRoot.querySelector(".vk-key-space") !== null;
    });

    expect(spaceExists).toBe(true);
  });

  test("spacebar has correct data-key attribute", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    const dataKey = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      const space = host.shadowRoot.querySelector(".vk-key-space");
      return space?.dataset.key;
    });

    expect(dataKey).toBe(" ");
  });

  test("clicking spacebar inserts space", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    await typeWithKeyboard(page, "hello");
    await clickKey(page, " ");
    await typeWithKeyboard(page, "world");

    const value = await page.inputValue("#text-input");
    expect(value).toBe("hello world");
  });

  test("multiple spaces can be typed", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    await typeWithKeyboard(page, "a");
    await clickKey(page, " ");
    await clickKey(page, " ");
    await clickKey(page, " ");
    await typeWithKeyboard(page, "b");

    const value = await page.inputValue("#text-input");
    expect(value).toBe("a   b");
  });

  test("space works in textarea", async ({ page }) => {
    await page.click("#textarea");
    await waitForKeyboardOpen(page);

    await typeWithKeyboard(page, "line");
    await clickKey(page, " ");
    await typeWithKeyboard(page, "one");

    const value = await page.inputValue("#textarea");
    expect(value).toBe("line one");
  });

  test("space works in contenteditable", async ({ page }) => {
    await page.evaluate(() => {
      document.querySelector("#contenteditable").textContent = "";
    });
    await page.click("#contenteditable");
    await waitForKeyboardOpen(page);

    await typeWithKeyboard(page, "word");
    await clickKey(page, " ");
    await typeWithKeyboard(page, "two");

    const text = await page.textContent("#contenteditable");
    expect(text).toBe("word two");
  });

  test("spacebar cursor swipe is disabled by default", async ({ page }) => {
    // When swipe is disabled, pointer events on spacebar should just type space
    await page.fill("#text-input", "hello");
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    // Set cursor at end
    await page.evaluate(() => {
      const input = document.querySelector("#text-input");
      input.setSelectionRange(5, 5);
    });

    // Simulate a swipe gesture on spacebar (which should be ignored when disabled)
    await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      const spaceKey = host.shadowRoot.querySelector(".vk-key-space");
      if (!spaceKey) throw new Error("Space key not found");

      const rect = spaceKey.getBoundingClientRect();
      const startX = rect.left + rect.width / 2;
      const startY = rect.top + rect.height / 2;

      spaceKey.setPointerCapture = () => {};
      spaceKey.releasePointerCapture = () => {};

      // Try to swipe left
      spaceKey.dispatchEvent(
        new PointerEvent("pointerdown", {
          bubbles: true,
          cancelable: true,
          pointerId: 1,
          clientX: startX,
          clientY: startY,
        })
      );

      spaceKey.dispatchEvent(
        new PointerEvent("pointermove", {
          bubbles: true,
          cancelable: true,
          pointerId: 1,
          clientX: startX - 100, // Move 100px left
          clientY: startY,
        })
      );

      spaceKey.dispatchEvent(
        new PointerEvent("pointerup", {
          bubbles: true,
          cancelable: true,
          pointerId: 1,
          clientX: startX - 100,
          clientY: startY,
        })
      );
    });

    await page.waitForTimeout(100);

    // Since swipe is disabled by default, clicking space should still insert a space
    // (the swipe was ignored)
    await clickKey(page, " ");

    const value = await page.inputValue("#text-input");
    expect(value).toBe("hello ");
  });
});

test.describe("Virtual Keyboard - Position Helper", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/index.html");
    await waitForExtension(page);
  });

  test("getKeyboardPosition returns valid coordinates", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    const pos = await getKeyboardPosition(page);

    expect(pos.x).toBeGreaterThanOrEqual(0);
    expect(pos.y).toBeGreaterThanOrEqual(0);
  });

  test("keyboard has reasonable size", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    const hasReasonableSize = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      const keyboard = host.shadowRoot.querySelector("#virtual-keyboard");
      const rect = keyboard.getBoundingClientRect();

      // Keyboard should have reasonable dimensions
      return (
        rect.width > 100 &&
        rect.height > 50 &&
        rect.width < window.innerWidth * 2 // Shouldn't be larger than 2x viewport
      );
    });

    expect(hasReasonableSize).toBe(true);
  });
});

test.describe("Virtual Keyboard - Dragging State CSS", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/index.html");
    await waitForExtension(page);
  });

  test("keyboard does not have dragging class by default", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    const hasDraggingClass = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      const keyboard = host.shadowRoot.querySelector("#virtual-keyboard");
      return keyboard.classList.contains("vk-dragging");
    });

    expect(hasDraggingClass).toBe(false);
  });
});
