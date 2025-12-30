import { expect, test } from "./fixtures.js";
import { waitForExtension, waitForKeyboardOpen } from "./helpers.js";

test.describe("Virtual Keyboard - Button Visibility Settings", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3333/index.html");
    await waitForExtension(page);
  });

  test.describe("URL Button", () => {
    test("URL button is visible by default", async ({ page }) => {
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

    test("URL button can be hidden via storage setting", async ({ page }) => {
      // Set storage to hide URL button
      await page.evaluate(() => {
        return new Promise((resolve) => {
          chrome.storage.local.set({ showUrlButton: false }, resolve);
        });
      });

      // Wait for setting to apply
      await page.waitForTimeout(300);

      // Reload to apply setting
      await page.reload();
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

    test("close button can be hidden via storage setting", async ({ page }) => {
      // Set storage to hide close button
      await page.evaluate(() => {
        return new Promise((resolve) => {
          chrome.storage.local.set({ showCloseButton: false }, resolve);
        });
      });

      await page.waitForTimeout(300);
      await page.reload();
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
      page,
    }) => {
      // Set storage to hide close button
      await page.evaluate(() => {
        return new Promise((resolve) => {
          chrome.storage.local.set({ showCloseButton: false }, resolve);
        });
      });

      await page.waitForTimeout(300);
      await page.reload();
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

    test("&123 button can be hidden via storage setting", async ({ page }) => {
      // Set storage to hide numbers button
      await page.evaluate(() => {
        return new Promise((resolve) => {
          chrome.storage.local.set({ showNumbersButton: false }, resolve);
        });
      });

      await page.waitForTimeout(300);
      await page.reload();
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

    test("ABC button (on symbols keyboard) is also hidden when numbers button setting is false", async ({
      page,
    }) => {
      await page.click("#text-input");
      await waitForKeyboardOpen(page);

      // First switch to symbols keyboard while button is visible
      await page.evaluate(() => {
        const host = document.querySelector("#virtual-keyboard-host");
        const numbersBtn = host.shadowRoot.querySelector('[data-key="&123"]');
        if (numbersBtn) numbersBtn.click();
      });

      await page.waitForTimeout(200);

      // Now set storage to hide numbers button
      await page.evaluate(() => {
        return new Promise((resolve) => {
          chrome.storage.local.set({ showNumbersButton: false }, resolve);
        });
      });

      await page.waitForTimeout(300);
      await page.reload();
      await waitForExtension(page);

      await page.click("#text-input");
      await waitForKeyboardOpen(page);

      // Try to switch to symbols - this should work through number bar or other means
      // But the &123 button won't be there on the symbols keyboard to switch back
      // Let's check the main keyboard first
      const hasNumbersButtonOnMain = await page.evaluate(() => {
        const host = document.querySelector("#virtual-keyboard-host");
        if (!host || !host.shadowRoot) return false;
        const mainKbd = host.shadowRoot.querySelector("#vk-main-kbd");
        if (!mainKbd) return false;
        const numbersBtn = mainKbd.querySelector('[data-key="&123"]');
        return numbersBtn !== null;
      });

      expect(hasNumbersButtonOnMain).toBe(false);

      // Also verify it's hidden on symbols keyboard by checking the raw keyboard structure
      const hasNumbersButtonOnSymbols = await page.evaluate(() => {
        const host = document.querySelector("#virtual-keyboard-host");
        if (!host || !host.shadowRoot) return false;
        const numbersKbd = host.shadowRoot.querySelector("#vk-main-numbers");
        if (!numbersKbd) return false;
        // The &123 button on symbols keyboard is the "ABC" toggle back
        const abcBtn = numbersKbd.querySelector('[data-key="&123"]');
        return abcBtn !== null;
      });

      expect(hasNumbersButtonOnSymbols).toBe(false);
    });
  });

  test.describe("Settings Button", () => {
    test("settings button is visible by default", async ({ page }) => {
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
      page,
    }) => {
      // Set storage to hide settings button
      await page.evaluate(() => {
        return new Promise((resolve) => {
          chrome.storage.local.set({ showSettingsButton: false }, resolve);
        });
      });

      await page.waitForTimeout(300);
      await page.reload();
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
      page,
    }) => {
      // Set autostart to true
      await page.evaluate(() => {
        return new Promise((resolve) => {
          chrome.storage.local.set({ autostart: true }, resolve);
        });
      });

      await page.waitForTimeout(300);
      await page.reload();
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
      page,
    }) => {
      // First get normal spacebar width
      await page.click("#text-input");
      await waitForKeyboardOpen(page);

      const normalWidth = await page.evaluate(() => {
        const host = document.querySelector("#virtual-keyboard-host");
        if (!host || !host.shadowRoot) return 0;
        const spacebar = host.shadowRoot.querySelector(".vk-key-space");
        return spacebar ? spacebar.getBoundingClientRect().width : 0;
      });

      // Now hide multiple buttons
      await page.evaluate(() => {
        return new Promise((resolve) => {
          chrome.storage.local.set(
            {
              showUrlButton: false,
              showSettingsButton: false,
              showNumbersButton: false,
            },
            resolve
          );
        });
      });

      await page.waitForTimeout(300);
      await page.reload();
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
      page,
    }) => {
      // Hide all extra buttons for a minimal alpha-only keyboard
      await page.evaluate(() => {
        return new Promise((resolve) => {
          chrome.storage.local.set(
            {
              showUrlButton: false,
              showSettingsButton: false,
              showNumbersButton: false,
              showLanguageButton: false,
              showNumberBar: false,
            },
            resolve
          );
        });
      });

      await page.waitForTimeout(300);
      await page.reload();
      await waitForExtension(page);

      await page.click("#text-input");
      await waitForKeyboardOpen(page);

      // Verify the keyboard only has essential keys
      const buttonCounts = await page.evaluate(() => {
        const host = document.querySelector("#virtual-keyboard-host");
        if (!host || !host.shadowRoot) return null;

        return {
          hasUrl: host.shadowRoot.querySelector("#vk-url-btn") !== null,
          hasSettings: host.shadowRoot.querySelector("#vk-settings-btn") !== null,
          hasNumbers: host.shadowRoot.querySelector('[data-key="&123"]') !== null,
          hasLanguage: host.shadowRoot.querySelector("#vk-lang-btn") !== null,
          hasNumberBar:
            host.shadowRoot.querySelector("#vk-number-bar")?.style.display !==
            "none",
          hasClose: host.shadowRoot.querySelector('[data-key="Close"]') !== null,
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
