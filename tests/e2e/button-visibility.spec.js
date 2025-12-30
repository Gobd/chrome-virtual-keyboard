import { expect, test } from "./fixtures.js";
import {
  setStorageSettings,
  waitForExtension,
  waitForKeyboardOpen,
} from "./helpers.js";

test.describe("Virtual Keyboard - Button Visibility Settings", () => {
  test.describe("URL Button", () => {
    test("URL button is visible by default", async ({ page }) => {
      await page.goto("http://localhost:3333/index.html");
      await waitForExtension(page);
      await page.click("#text-input");
      await waitForKeyboardOpen(page);

      const hasUrlButton = await page.evaluate(() => {
        const host = document.querySelector("#virtual-keyboard-host");
        if (!host || !host.shadowRoot) return false;
        const urlBtn = host.shadowRoot.querySelector("#vk-url-btn");
        return urlBtn !== null;
      });

      expect(hasUrlButton).toBe(true);
    });

    test("URL button can be hidden via storage setting", async ({
      context,
      extensionId,
      page,
    }) => {
      // Set storage to hide URL button via options page
      await setStorageSettings(context, extensionId, { showUrlButton: false });

      await page.goto("http://localhost:3333/index.html");
      await waitForExtension(page);

      await page.click("#text-input");
      await waitForKeyboardOpen(page);

      const hasUrlButton = await page.evaluate(() => {
        const host = document.querySelector("#virtual-keyboard-host");
        if (!host || !host.shadowRoot) return false;
        const urlBtn = host.shadowRoot.querySelector("#vk-url-btn");
        return urlBtn !== null;
      });

      expect(hasUrlButton).toBe(false);
    });
  });

  test.describe("Close Button", () => {
    test("close button is visible by default", async ({ page }) => {
      await page.goto("http://localhost:3333/index.html");
      await waitForExtension(page);
      await page.click("#text-input");
      await waitForKeyboardOpen(page);

      const hasCloseButton = await page.evaluate(() => {
        const host = document.querySelector("#virtual-keyboard-host");
        if (!host || !host.shadowRoot) return false;
        const closeBtn = host.shadowRoot.querySelector('[data-key="Close"]');
        return closeBtn !== null;
      });

      expect(hasCloseButton).toBe(true);
    });

    test("close button can be hidden via storage setting", async ({
      context,
      extensionId,
      page,
    }) => {
      await setStorageSettings(context, extensionId, {
        showCloseButton: false,
      });

      await page.goto("http://localhost:3333/index.html");
      await waitForExtension(page);

      await page.click("#text-input");
      await waitForKeyboardOpen(page);

      const hasCloseButton = await page.evaluate(() => {
        const host = document.querySelector("#virtual-keyboard-host");
        if (!host || !host.shadowRoot) return false;
        const closeBtn = host.shadowRoot.querySelector('[data-key="Close"]');
        return closeBtn !== null;
      });

      expect(hasCloseButton).toBe(false);
    });

    test("close button is also hidden on symbols keyboard when setting is false", async ({
      context,
      extensionId,
      page,
    }) => {
      await setStorageSettings(context, extensionId, {
        showCloseButton: false,
      });

      await page.goto("http://localhost:3333/index.html");
      await waitForExtension(page);

      await page.click("#text-input");
      await waitForKeyboardOpen(page);

      // Switch to symbols keyboard
      await page.evaluate(() => {
        const host = document.querySelector("#virtual-keyboard-host");
        const numbersBtn = host.shadowRoot.querySelector('[data-key="&123"]');
        if (numbersBtn) numbersBtn.click();
      });

      await page.waitForTimeout(200);

      // Check that close button is not in the symbols keyboard
      const hasCloseButton = await page.evaluate(() => {
        const host = document.querySelector("#virtual-keyboard-host");
        if (!host || !host.shadowRoot) return false;
        const numbersKbd = host.shadowRoot.querySelector("#vk-main-numbers");
        if (!numbersKbd) return false;
        const closeBtn = numbersKbd.querySelector('[data-key="Close"]');
        return closeBtn !== null;
      });

      expect(hasCloseButton).toBe(false);
    });
  });

  test.describe("Numbers/Symbols Toggle Button", () => {
    test("&123 button is visible by default", async ({ page }) => {
      await page.goto("http://localhost:3333/index.html");
      await waitForExtension(page);
      await page.click("#text-input");
      await waitForKeyboardOpen(page);

      const hasNumbersButton = await page.evaluate(() => {
        const host = document.querySelector("#virtual-keyboard-host");
        if (!host || !host.shadowRoot) return false;
        const numbersBtn = host.shadowRoot.querySelector('[data-key="&123"]');
        return numbersBtn !== null;
      });

      expect(hasNumbersButton).toBe(true);
    });

    test("&123 button can be hidden via storage setting", async ({
      context,
      extensionId,
      page,
    }) => {
      await setStorageSettings(context, extensionId, {
        showNumbersButton: false,
      });

      await page.goto("http://localhost:3333/index.html");
      await waitForExtension(page);

      await page.click("#text-input");
      await waitForKeyboardOpen(page);

      const hasNumbersButton = await page.evaluate(() => {
        const host = document.querySelector("#virtual-keyboard-host");
        if (!host || !host.shadowRoot) return false;
        const numbersBtn = host.shadowRoot.querySelector('[data-key="&123"]');
        return numbersBtn !== null;
      });

      expect(hasNumbersButton).toBe(false);
    });
  });

  test.describe("Settings Button", () => {
    test("settings button is visible by default", async ({ page }) => {
      await page.goto("http://localhost:3333/index.html");
      await waitForExtension(page);
      await page.click("#text-input");
      await waitForKeyboardOpen(page);

      const hasSettingsButton = await page.evaluate(() => {
        const host = document.querySelector("#virtual-keyboard-host");
        if (!host || !host.shadowRoot) return false;
        const settingsBtn = host.shadowRoot.querySelector("#vk-settings-btn");
        return settingsBtn !== null;
      });

      expect(hasSettingsButton).toBe(true);
    });

    test("settings button can be hidden via storage setting", async ({
      context,
      extensionId,
      page,
    }) => {
      await setStorageSettings(context, extensionId, {
        showSettingsButton: false,
      });

      await page.goto("http://localhost:3333/index.html");
      await waitForExtension(page);

      await page.click("#text-input");
      await waitForKeyboardOpen(page);

      const hasSettingsButton = await page.evaluate(() => {
        const host = document.querySelector("#virtual-keyboard-host");
        if (!host || !host.shadowRoot) return false;
        const settingsBtn = host.shadowRoot.querySelector("#vk-settings-btn");
        return settingsBtn !== null;
      });

      expect(hasSettingsButton).toBe(false);
    });

    test("settings button works even when autostart is enabled", async ({
      context,
      extensionId,
      page,
    }) => {
      await setStorageSettings(context, extensionId, { autostart: true });

      await page.goto("http://localhost:3333/index.html");
      await waitForExtension(page);

      // Wait for keyboard to auto-open
      await waitForKeyboardOpen(page);

      // Settings button should still be visible
      const hasSettingsButton = await page.evaluate(() => {
        const host = document.querySelector("#virtual-keyboard-host");
        if (!host || !host.shadowRoot) return false;
        const settingsBtn = host.shadowRoot.querySelector("#vk-settings-btn");
        return settingsBtn !== null;
      });

      expect(hasSettingsButton).toBe(true);
    });
  });

  test.describe("Multiple buttons hidden", () => {
    test("spacebar widens when multiple buttons are hidden", async ({
      context,
      extensionId,
      page,
    }) => {
      // First get normal spacebar width
      await page.goto("http://localhost:3333/index.html");
      await waitForExtension(page);
      await page.click("#text-input");
      await waitForKeyboardOpen(page);

      const normalWidth = await page.evaluate(() => {
        const host = document.querySelector("#virtual-keyboard-host");
        if (!host || !host.shadowRoot) return 0;
        const spacebar = host.shadowRoot.querySelector(".vk-key-space");
        return spacebar ? spacebar.getBoundingClientRect().width : 0;
      });

      // Now set storage to hide multiple buttons
      await setStorageSettings(context, extensionId, {
        showUrlButton: false,
        showSettingsButton: false,
        showNumbersButton: false,
      });

      // Navigate to page after settings are applied
      await page.goto("http://localhost:3333/index.html");
      await waitForExtension(page);

      await page.click("#text-input");
      await waitForKeyboardOpen(page);

      const widerWidth = await page.evaluate(() => {
        const host = document.querySelector("#virtual-keyboard-host");
        if (!host || !host.shadowRoot) return 0;
        const spacebar = host.shadowRoot.querySelector(".vk-key-space");
        return spacebar ? spacebar.getBoundingClientRect().width : 0;
      });

      // Spacebar should be wider when buttons are hidden
      expect(widerWidth).toBeGreaterThan(normalWidth);
    });

    test("can create alpha-only keyboard by hiding all extra buttons", async ({
      context,
      extensionId,
      page,
    }) => {
      // Hide all extra buttons for a minimal alpha-only keyboard
      await setStorageSettings(context, extensionId, {
        showUrlButton: false,
        showSettingsButton: false,
        showNumbersButton: false,
        showLanguageButton: false,
        showNumberBar: false,
      });

      await page.goto("http://localhost:3333/index.html");
      await waitForExtension(page);

      await page.click("#text-input");
      await waitForKeyboardOpen(page);

      // Verify the keyboard only has essential keys
      const buttonCounts = await page.evaluate(() => {
        const host = document.querySelector("#virtual-keyboard-host");
        if (!host || !host.shadowRoot) return null;

        return {
          hasUrl: host.shadowRoot.querySelector("#vk-url-btn") !== null,
          hasSettings:
            host.shadowRoot.querySelector("#vk-settings-btn") !== null,
          hasNumbers:
            host.shadowRoot.querySelector('[data-key="&123"]') !== null,
          hasLanguage: host.shadowRoot.querySelector("#vk-lang-btn") !== null,
          hasNumberBar:
            host.shadowRoot.querySelector("#vk-number-bar")?.style.display !==
            "none",
          hasClose:
            host.shadowRoot.querySelector('[data-key="Close"]') !== null,
          hasShift: host.shadowRoot.querySelector(".vk-key-shift") !== null,
          hasBackspace:
            host.shadowRoot.querySelector(".vk-key-backspace") !== null,
          hasSpace: host.shadowRoot.querySelector(".vk-key-space") !== null,
        };
      });

      expect(buttonCounts.hasUrl).toBe(false);
      expect(buttonCounts.hasSettings).toBe(false);
      expect(buttonCounts.hasNumbers).toBe(false);
      expect(buttonCounts.hasLanguage).toBe(false);
      expect(buttonCounts.hasNumberBar).toBe(false);
      // Essential keys should still be present
      expect(buttonCounts.hasClose).toBe(true);
      expect(buttonCounts.hasShift).toBe(true);
      expect(buttonCounts.hasBackspace).toBe(true);
      expect(buttonCounts.hasSpace).toBe(true);
    });
  });
});
