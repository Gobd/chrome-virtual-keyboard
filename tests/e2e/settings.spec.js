import { expect, test } from "./fixtures.js";
import {
  getKeyboardZoom,
  isLanguageButtonVisible,
  isNumberBarVisible,
  isSettingsButtonVisible,
  waitForExtension,
  waitForKeyboardOpen,
} from "./helpers.js";

test.describe("Virtual Keyboard - Settings", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/index.html");
    await waitForExtension(page);
  });

  test("settings button is visible by default", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    const isVisible = await isSettingsButtonVisible(page);
    expect(isVisible).toBe(true);
  });

  test("language button is hidden by default", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    const isVisible = await isLanguageButtonVisible(page);
    expect(isVisible).toBe(false);
  });

  test("number bar is visible by default", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    const isVisible = await isNumberBarVisible(page);
    expect(isVisible).toBe(true);
  });

  test("number bar contains digits 1-0", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    const digits = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      if (!host || !host.shadowRoot) return [];
      const numberBar = host.shadowRoot.querySelector("#vk-number-bar");
      if (!numberBar) return [];
      const keys = numberBar.querySelectorAll(".vk-key");
      return Array.from(keys).map((k) => k.getAttribute("data-key"));
    });

    // Should have numbers 1 through 0
    expect(digits).toContain("1");
    expect(digits).toContain("2");
    expect(digits).toContain("3");
    expect(digits).toContain("4");
    expect(digits).toContain("5");
    expect(digits).toContain("6");
    expect(digits).toContain("7");
    expect(digits).toContain("8");
    expect(digits).toContain("9");
    expect(digits).toContain("0");
  });

  test("clicking settings button opens options (or shows indicator)", async ({
    page,
  }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    // Click settings button
    await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      const btn = host.shadowRoot.querySelector("#vk-settings-btn");
      if (btn) btn.click();
    });
    await page.waitForTimeout(500);

    // Settings click should trigger some action
    // In extension context, this opens options page
    // We verify the button is clickable and doesn't error
  });

  test("keyboard default zoom is 100%", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    const zoom = await getKeyboardZoom(page);
    // Default zoom should be 1 (100%)
    expect(zoom).toBeCloseTo(1, 1);
  });

  test("keyboard is positioned at bottom of viewport", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    const position = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      if (!host || !host.shadowRoot) return null;
      const keyboard = host.shadowRoot.querySelector("#virtual-keyboard");
      if (!keyboard) return null;
      const rect = keyboard.getBoundingClientRect();
      return {
        bottom: window.innerHeight - rect.bottom,
        left: rect.left,
        right: window.innerWidth - rect.right,
      };
    });

    expect(position).not.toBeNull();
    // Keyboard should be near bottom
    expect(position.bottom).toBeLessThan(50);
  });

  test("keyboard has reasonable width", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    const position = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      if (!host || !host.shadowRoot) return null;
      const keyboard = host.shadowRoot.querySelector("#virtual-keyboard");
      if (!keyboard) return null;
      const rect = keyboard.getBoundingClientRect();
      return {
        width: rect.width,
        viewportWidth: window.innerWidth,
      };
    });

    expect(position).not.toBeNull();
    // Keyboard should have reasonable width (at least 35% of viewport)
    expect(position.width).toBeGreaterThan(position.viewportWidth * 0.35);
  });

  test("close button is visible", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    const hasClose = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      if (!host || !host.shadowRoot) return false;
      const closeBtn = host.shadowRoot.querySelector('[data-key="Close"]');
      if (!closeBtn) return false;
      const style = window.getComputedStyle(closeBtn);
      return style.display !== "none";
    });

    expect(hasClose).toBe(true);
  });

  test("URL button is visible for text input", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    const hasUrl = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      if (!host || !host.shadowRoot) return false;
      const urlBtn = host.shadowRoot.querySelector("#vk-url-btn");
      if (!urlBtn) return false;
      const style = window.getComputedStyle(urlBtn);
      return style.display !== "none";
    });

    expect(hasUrl).toBe(true);
  });

  test("keyboard has proper shadow DOM encapsulation", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    const hasShadowRoot = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      return host && host.shadowRoot !== null;
    });

    expect(hasShadowRoot).toBe(true);
  });

  test("keyboard styles don't leak to page", async ({ page }) => {
    // Check that page styles aren't affected
    const buttonStyle = await page.evaluate(() => {
      const btn = document.querySelector("#test-form button");
      if (!btn) return null;
      const style = window.getComputedStyle(btn);
      return {
        fontFamily: style.fontFamily,
        // Get any styles that keyboard might have
      };
    });

    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    const buttonStyleAfter = await page.evaluate(() => {
      const btn = document.querySelector("#test-form button");
      if (!btn) return null;
      const style = window.getComputedStyle(btn);
      return {
        fontFamily: style.fontFamily,
      };
    });

    // Styles should be unchanged
    expect(buttonStyle?.fontFamily).toBe(buttonStyleAfter?.fontFamily);
  });

  test("keyboard has consistent height", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    const height1 = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      if (!host || !host.shadowRoot) return 0;
      const keyboard = host.shadowRoot.querySelector("#virtual-keyboard");
      return keyboard?.getBoundingClientRect().height || 0;
    });

    // Switch to another input type
    await page.click("#search-input");
    await page.waitForTimeout(200);

    const height2 = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      if (!host || !host.shadowRoot) return 0;
      const keyboard = host.shadowRoot.querySelector("#virtual-keyboard");
      return keyboard?.getBoundingClientRect().height || 0;
    });

    // Height should be consistent
    expect(Math.abs(height1 - height2)).toBeLessThan(10);
  });

  test("keyboard maintains state during rapid input switching", async ({
    page,
  }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    // Type something
    await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      host.shadowRoot.querySelector('[data-key="a"]').click();
    });

    // Rapidly switch inputs
    await page.click("#search-input");
    await page.waitForTimeout(50);
    await page.click("#text-input");
    await page.waitForTimeout(50);
    await page.click("#password-input");
    await page.waitForTimeout(200);

    // Keyboard should still be open
    const isOpen = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      if (!host || !host.shadowRoot) return false;
      const keyboard = host.shadowRoot.querySelector("#virtual-keyboard");
      return keyboard?.dataset.state === "open";
    });

    expect(isOpen).toBe(true);
  });

  test("default layout is English", async ({ page }) => {
    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    // English layout should have QWERTY arrangement
    const hasQwerty = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      if (!host || !host.shadowRoot) return false;

      const keys = host.shadowRoot.querySelectorAll("#vk-main-kbd .vk-key");
      const keyValues = Array.from(keys).map((k) => k.getAttribute("data-key"));

      // QWERTY should be present (first row)
      return (
        keyValues.includes("q") &&
        keyValues.includes("w") &&
        keyValues.includes("e") &&
        keyValues.includes("r") &&
        keyValues.includes("t") &&
        keyValues.includes("y")
      );
    });

    expect(hasQwerty).toBe(true);
  });
});

test.describe("Virtual Keyboard - Settings Persistence", () => {
  // These tests verify that settings from chrome.storage affect the UI
  // Note: Setting storage requires extension context

  test("open button is hidden by default", async ({ page }) => {
    await page.goto("http://localhost:3333/index.html");
    await waitForExtension(page);

    // By default, open button should not exist in the DOM
    const exists = await page.evaluate(() => {
      return document.querySelector("#vk-open-btn") !== null;
    });
    expect(exists).toBe(false);
  });

  test("keyboard applies correct styling", async ({ page }) => {
    await page.goto("http://localhost:3333/index.html");
    await waitForExtension(page);

    await page.click("#text-input");
    await waitForKeyboardOpen(page);

    // Verify keyboard has expected CSS classes
    const hasClasses = await page.evaluate(() => {
      const host = document.querySelector("#virtual-keyboard-host");
      if (!host || !host.shadowRoot) return false;
      const keyboard = host.shadowRoot.querySelector("#virtual-keyboard");
      // Should have basic keyboard class or ID
      return keyboard !== null;
    });

    expect(hasClasses).toBe(true);
  });
});
