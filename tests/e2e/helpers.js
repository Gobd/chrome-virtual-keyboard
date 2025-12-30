/**
 * Test helpers for Chrome Virtual Keyboard extension
 */

/**
 * DOM IDs and selectors matching src/core/config.js
 */
export const SELECTORS = {
  // Host and root
  KEYBOARD_HOST: "#virtual-keyboard-host",
  KEYBOARD: "#virtual-keyboard",

  // Main keyboard elements
  MAIN_KBD: "#vk-main-kbd",
  MAIN_NUMBERS: "#vk-main-numbers",
  NUMBER_INPUT: "#vk-number-bar-input",

  // URL bar
  URL_BAR: "#vk-url-bar",
  URL_BAR_TEXTBOX: "#vk-url-bar-textbox",

  // Buttons
  URL_BUTTON: "#vk-url-btn",
  SETTINGS_BUTTON: "#vk-settings-btn",
  LANGUAGE_BUTTON: "#vk-lang-btn",
  OPEN_BUTTON: "#vk-open-btn",

  // Overlays
  LANGUAGE_OVERLAY: "#vk-overlay-language",

  // CSS classes
  KEY: ".vk-key",
  KEY_CASE: ".vk-key-case",
  EMAIL_KEY: ".vk-email-key",
  SHIFT_KEY: ".vk-key-shift",
  BACKSPACE_KEY: ".vk-key-backspace",
  ENTER_KEY: ".vk-key-enter",
  SPACE_KEY: ".vk-key-space",
  CLOSE_KEY: ".vk-icon-close",
  ACTION_KEY: ".vk-key-action",
};

/**
 * Get the keyboard's shadow root
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<import('@playwright/test').Locator>}
 */
export async function getKeyboardShadowRoot(page) {
  // Wait for extension to initialize
  await page.waitForSelector(SELECTORS.KEYBOARD_HOST, { timeout: 10000 });

  // Since shadow root is closed, we need to use evaluate to access it
  // Store a reference we can use
  return page.locator(SELECTORS.KEYBOARD_HOST);
}

/**
 * Check if keyboard is visible
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<boolean>}
 */
export async function isKeyboardOpen(page) {
  return await page.evaluate(() => {
    const host = document.querySelector("#virtual-keyboard-host");
    if (!host || !host.shadowRoot) return false;
    const keyboard = host.shadowRoot.querySelector("#virtual-keyboard");
    return keyboard?.dataset.state === "open";
  });
}

/**
 * Wait for keyboard to open
 * @param {import('@playwright/test').Page} page
 * @param {number} timeout
 */
export async function waitForKeyboardOpen(page, timeout = 5000) {
  await page.waitForFunction(
    () => {
      const host = document.querySelector("#virtual-keyboard-host");
      if (!host || !host.shadowRoot) return false;
      const keyboard = host.shadowRoot.querySelector("#virtual-keyboard");
      return keyboard?.dataset.state === "open";
    },
    { timeout }
  );
}

/**
 * Wait for keyboard to close
 * @param {import('@playwright/test').Page} page
 * @param {number} timeout
 */
export async function waitForKeyboardClose(page, timeout = 5000) {
  await page.waitForFunction(
    () => {
      const host = document.querySelector("#virtual-keyboard-host");
      if (!host || !host.shadowRoot) return false;
      const keyboard = host.shadowRoot.querySelector("#virtual-keyboard");
      return keyboard?.dataset.state === "closed";
    },
    { timeout }
  );
}

/**
 * Click a key on the virtual keyboard
 * @param {import('@playwright/test').Page} page
 * @param {string} key - The key value to click (e.g., 'a', 'Shift', 'Enter')
 */
export async function clickKey(page, key) {
  await page.evaluate((keyValue) => {
    const host = document.querySelector("#virtual-keyboard-host");
    if (!host || !host.shadowRoot) throw new Error("Keyboard not found");

    // Helper to dispatch real mouse events
    const simulateClick = (el) => {
      const rect = el.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;

      const eventInit = {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX: x,
        clientY: y,
      };

      el.dispatchEvent(new MouseEvent("mousedown", eventInit));
      el.dispatchEvent(new MouseEvent("mouseup", eventInit));
      el.dispatchEvent(new MouseEvent("click", eventInit));
    };

    // Find key by data-key attribute
    const keyEl = host.shadowRoot.querySelector(`[data-key="${keyValue}"]`);
    if (keyEl) {
      simulateClick(keyEl);
      return;
    }

    // For special keys, find by icon class
    const iconMap = {
      Backspace: ".vk-icon-backspace",
      Enter: ".vk-icon-enter",
      Close: ".vk-icon-close",
      Shift: ".vk-icon-shift",
      Settings: ".vk-icon-settings",
    };

    if (iconMap[keyValue]) {
      const icon = host.shadowRoot.querySelector(iconMap[keyValue]);
      if (icon) {
        const keyBtn = icon.closest(".vk-key");
        if (keyBtn) {
          simulateClick(keyBtn);
          return;
        }
      }
    }

    throw new Error(`Key "${keyValue}" not found`);
  }, key);
}

/**
 * Type a string using the virtual keyboard
 * @param {import('@playwright/test').Page} page
 * @param {string} text - Text to type
 */
export async function typeWithKeyboard(page, text) {
  for (const char of text) {
    if (char === " ") {
      await clickKey(page, " ");
    } else if (char === char.toUpperCase() && char !== char.toLowerCase()) {
      // Uppercase letter - click shift first
      await clickKey(page, "Shift");
      await clickKey(page, char.toLowerCase());
    } else {
      await clickKey(page, char);
    }
    // Small delay between keystrokes
    await page.waitForTimeout(50);
  }
}

/**
 * Check if URL bar is open
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<boolean>}
 */
export async function isUrlBarOpen(page) {
  return await page.evaluate(() => {
    const host = document.querySelector("#virtual-keyboard-host");
    if (!host || !host.shadowRoot) return false;
    const urlBar = host.shadowRoot.querySelector("#vk-url-bar");
    return urlBar?.dataset.open === "true";
  });
}

/**
 * Get the URL button text (URL or .com)
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<string>}
 */
export async function getUrlButtonText(page) {
  return await page.evaluate(() => {
    const host = document.querySelector("#virtual-keyboard-host");
    if (!host || !host.shadowRoot) return "";
    const btn = host.shadowRoot.querySelector("#vk-url-btn span");
    return btn?.textContent || "";
  });
}

/**
 * Click the URL button on the keyboard
 * @param {import('@playwright/test').Page} page
 */
export async function clickUrlButton(page) {
  await page.evaluate(() => {
    const host = document.querySelector("#virtual-keyboard-host");
    if (!host || !host.shadowRoot) throw new Error("Keyboard not found");
    const btn = host.shadowRoot.querySelector("#vk-url-btn");
    if (!btn) throw new Error("URL button not found");

    const rect = btn.getBoundingClientRect();
    const eventInit = {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: rect.left + rect.width / 2,
      clientY: rect.top + rect.height / 2,
    };
    btn.dispatchEvent(new MouseEvent("mousedown", eventInit));
    btn.dispatchEvent(new MouseEvent("mouseup", eventInit));
    btn.dispatchEvent(new MouseEvent("click", eventInit));
  });
}

/**
 * Click the close button on the keyboard
 * @param {import('@playwright/test').Page} page
 */
export async function clickCloseButton(page) {
  await page.evaluate(() => {
    const host = document.querySelector("#virtual-keyboard-host");
    if (!host || !host.shadowRoot) throw new Error("Keyboard not found");
    const closeIcon = host.shadowRoot.querySelector(".vk-icon-close");
    if (!closeIcon) throw new Error("Close button not found");
    const btn = closeIcon.closest(".vk-key");
    if (!btn) throw new Error("Close button parent not found");

    const rect = btn.getBoundingClientRect();
    const eventInit = {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: rect.left + rect.width / 2,
      clientY: rect.top + rect.height / 2,
    };
    btn.dispatchEvent(new MouseEvent("mousedown", eventInit));
    btn.dispatchEvent(new MouseEvent("mouseup", eventInit));
    btn.dispatchEvent(new MouseEvent("click", eventInit));
  });
}

/**
 * Check if the email @ key is visible
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<boolean>}
 */
export async function isEmailKeyVisible(page) {
  return await page.evaluate(() => {
    const host = document.querySelector("#virtual-keyboard-host");
    if (!host || !host.shadowRoot) return false;
    const emailKey = host.shadowRoot.querySelector(".vk-email-key");
    if (!emailKey) return false;
    const style = window.getComputedStyle(emailKey);
    return style.display !== "none";
  });
}

/**
 * Get URL bar input value
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<string>}
 */
export async function getUrlBarValue(page) {
  return await page.evaluate(() => {
    const host = document.querySelector("#virtual-keyboard-host");
    if (!host || !host.shadowRoot) return "";
    const input = host.shadowRoot.querySelector("#vk-url-bar-textbox");
    return input?.value || "";
  });
}

/**
 * Check if number keyboard is visible
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<boolean>}
 */
export async function isNumberKeyboardVisible(page) {
  return await page.evaluate(() => {
    const host = document.querySelector("#virtual-keyboard-host");
    if (!host || !host.shadowRoot) return false;
    const numberKbd = host.shadowRoot.querySelector("#vk-number-bar-input");
    if (!numberKbd) return false;
    const style = window.getComputedStyle(numberKbd);
    return style.display !== "none";
  });
}

/**
 * Focus an input inside an iframe
 * @param {import('@playwright/test').Page} page
 * @param {string} iframeSelector - Selector for the iframe
 * @param {string} inputSelector - Selector for the input inside iframe
 */
export async function focusInputInIframe(page, iframeSelector, inputSelector) {
  const frame = page.frameLocator(iframeSelector);
  await frame.locator(inputSelector).click();
}

/**
 * Get input value from inside an iframe
 * @param {import('@playwright/test').Page} page
 * @param {string} iframeSelector
 * @param {string} inputSelector
 * @returns {Promise<string>}
 */
export async function getIframeInputValue(page, iframeSelector, inputSelector) {
  const frame = page.frameLocator(iframeSelector);
  return await frame.locator(inputSelector).inputValue();
}

/**
 * Wait for extension to fully initialize
 * @param {import('@playwright/test').Page} page
 */
export async function waitForExtension(page) {
  // Wait for element to exist (not necessarily visible - keyboard starts hidden)
  await page.waitForSelector(SELECTORS.KEYBOARD_HOST, {
    timeout: 10000,
    state: "attached", // Just needs to exist in DOM, not be visible
  });
  // Give extension time to set up shadow DOM and event listeners
  await page.waitForTimeout(500);
}

/**
 * Check if shift is currently active
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<boolean>}
 */
export async function isShiftActive(page) {
  return await page.evaluate(() => {
    const host = document.querySelector("#virtual-keyboard-host");
    if (!host || !host.shadowRoot) return false;
    // shift-active class is on #vk-main-kbd, not #virtual-keyboard
    const mainKbd = host.shadowRoot.querySelector("#vk-main-kbd");
    return mainKbd?.classList.contains("shift-active") || false;
  });
}

/**
 * Check if numbers/symbols mode is active
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<boolean>}
 */
export async function isNumbersModeActive(page) {
  return await page.evaluate(() => {
    const host = document.querySelector("#virtual-keyboard-host");
    if (!host || !host.shadowRoot) return false;
    const numbersKbd = host.shadowRoot.querySelector("#vk-main-numbers");
    if (!numbersKbd) return false;
    const style = window.getComputedStyle(numbersKbd);
    return style.display !== "none";
  });
}

/**
 * Click the &123 numbers toggle button
 * @param {import('@playwright/test').Page} page
 */
export async function clickNumbersToggle(page) {
  await page.evaluate(() => {
    const host = document.querySelector("#virtual-keyboard-host");
    if (!host || !host.shadowRoot) throw new Error("Keyboard not found");
    const btn = host.shadowRoot.querySelector('[data-key="&123"]');
    if (!btn) throw new Error("&123 button not found");
    btn.click();
  });
}

/**
 * Get all visible key values from the main keyboard
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<string[]>}
 */
export async function getVisibleKeys(page) {
  return await page.evaluate(() => {
    const host = document.querySelector("#virtual-keyboard-host");
    if (!host || !host.shadowRoot) return [];
    const keys = host.shadowRoot.querySelectorAll("#vk-main-kbd .vk-key");
    const visibleKeys = [];
    keys.forEach((key) => {
      const style = window.getComputedStyle(key);
      if (style.display !== "none" && style.visibility !== "hidden") {
        const dataKey = key.getAttribute("data-key");
        if (dataKey) visibleKeys.push(dataKey);
      }
    });
    return visibleKeys;
  });
}

/**
 * Get the displayed text on a specific key
 * @param {import('@playwright/test').Page} page
 * @param {string} keyValue - The data-key value
 * @returns {Promise<string>}
 */
export async function getKeyDisplayText(page, keyValue) {
  return await page.evaluate((key) => {
    const host = document.querySelector("#virtual-keyboard-host");
    if (!host || !host.shadowRoot) return "";
    const keyEl = host.shadowRoot.querySelector(`[data-key="${key}"]`);
    if (!keyEl) return "";
    // Get text content, excluding icons
    const textEl = keyEl.querySelector(".vk-key-case") || keyEl;
    return textEl.textContent?.trim() || "";
  }, keyValue);
}

/**
 * Check if the floating open button is visible
 * Note: Open button is NOT in shadow DOM - it's directly on document.body
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<boolean>}
 */
export async function isOpenButtonVisible(page) {
  return await page.evaluate(() => {
    const btn = document.querySelector("#vk-open-btn");
    if (!btn) return false;
    const style = window.getComputedStyle(btn);
    return (
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      style.opacity !== "0" &&
      btn.dataset.hidden !== "true"
    );
  });
}

/**
 * Click the floating open button
 * Note: Open button is NOT in shadow DOM - it's directly on document.body
 * @param {import('@playwright/test').Page} page
 */
export async function clickOpenButton(page) {
  await page.evaluate(() => {
    const btn = document.querySelector("#vk-open-btn");
    if (!btn) throw new Error("Open button not found");
    btn.click();
  });
}

/**
 * Get the number of rows in the main keyboard
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<number>}
 */
export async function getKeyboardRowCount(page) {
  return await page.evaluate(() => {
    const host = document.querySelector("#virtual-keyboard-host");
    if (!host || !host.shadowRoot) return 0;
    const rows = host.shadowRoot.querySelectorAll("#vk-main-kbd-ph .vk-row");
    return rows.length;
  });
}

/**
 * Check if a specific button is visible in the keyboard
 * @param {import('@playwright/test').Page} page
 * @param {string} selector - CSS selector for the button
 * @returns {Promise<boolean>}
 */
export async function isButtonVisible(page, selector) {
  return await page.evaluate((sel) => {
    const host = document.querySelector("#virtual-keyboard-host");
    if (!host || !host.shadowRoot) return false;
    const btn = host.shadowRoot.querySelector(sel);
    if (!btn) return false;
    const style = window.getComputedStyle(btn);
    return style.display !== "none" && style.visibility !== "hidden";
  }, selector);
}

/**
 * Get keyboard zoom scale
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<number>}
 */
export async function getKeyboardZoom(page) {
  return await page.evaluate(() => {
    const host = document.querySelector("#virtual-keyboard-host");
    if (!host || !host.shadowRoot) return 1;
    const keyboard = host.shadowRoot.querySelector("#virtual-keyboard");
    if (!keyboard) return 1;
    const transform = window.getComputedStyle(keyboard).transform;
    if (!transform || transform === "none") return 1;
    // Parse scale from matrix
    const match = transform.match(/matrix\(([^,]+)/);
    return match ? parseFloat(match[1]) : 1;
  });
}

/**
 * Check if the number bar (top row 1-0) is visible
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<boolean>}
 */
export async function isNumberBarVisible(page) {
  return await page.evaluate(() => {
    const host = document.querySelector("#virtual-keyboard-host");
    if (!host || !host.shadowRoot) return false;
    const bar = host.shadowRoot.querySelector("#vk-number-bar");
    if (!bar) return false;
    const style = window.getComputedStyle(bar);
    return style.display !== "none";
  });
}

/**
 * Check if settings button is visible
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<boolean>}
 */
export async function isSettingsButtonVisible(page) {
  return await page.evaluate(() => {
    const host = document.querySelector("#virtual-keyboard-host");
    if (!host || !host.shadowRoot) return false;
    const btn = host.shadowRoot.querySelector("#vk-settings-btn");
    if (!btn) return false;
    const style = window.getComputedStyle(btn);
    return style.display !== "none" && style.visibility !== "hidden";
  });
}

/**
 * Check if language button is visible
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<boolean>}
 */
export async function isLanguageButtonVisible(page) {
  return await page.evaluate(() => {
    const host = document.querySelector("#virtual-keyboard-host");
    if (!host || !host.shadowRoot) return false;
    const btn = host.shadowRoot.querySelector("#vk-lang-btn");
    if (!btn) return false;
    const style = window.getComputedStyle(btn);
    return style.display !== "none" && style.visibility !== "hidden";
  });
}

/**
 * Set Chrome storage settings via the extension's options page.
 * This navigates to the options page (which has chrome.storage access),
 * sets the values, then returns.
 * @param {import('@playwright/test').BrowserContext} context
 * @param {string} extensionId - The extension ID
 * @param {Object} settings - Key-value pairs to set in storage
 */
export async function setStorageSettings(context, extensionId, settings) {
  const optionsPage = await context.newPage();
  await optionsPage.goto(`chrome-extension://${extensionId}/options.html`);

  // Wait for page to fully load
  await optionsPage.waitForLoadState("networkidle");

  // Always set openedFirstTime to prevent extension from reinitializing with defaults
  const settingsWithInit = {
    openedFirstTime: "true",
    ...settings,
  };

  // Set all the storage values
  await optionsPage.evaluate(async (storageSettings) => {
    await new Promise((resolve) => {
      chrome.storage.local.set(storageSettings, resolve);
    });
  }, settingsWithInit);

  // Wait for storage to persist and sync
  await optionsPage.waitForTimeout(200);
  await optionsPage.close();
}

/**
 * Get the keys in the symbols/numbers keyboard
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<string[]>}
 */
export async function getNumbersKeyboardKeys(page) {
  return await page.evaluate(() => {
    const host = document.querySelector("#virtual-keyboard-host");
    if (!host || !host.shadowRoot) return [];
    const keys = host.shadowRoot.querySelectorAll("#vk-main-numbers .vk-key");
    const keyValues = [];
    keys.forEach((key) => {
      const dataKey = key.getAttribute("data-key");
      if (dataKey) keyValues.push(dataKey);
    });
    return keyValues;
  });
}

/**
 * Record input events on an element
 * @param {import('@playwright/test').Page} page
 * @param {string} selector
 */
export async function startRecordingInputEvents(page, selector) {
  await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return;
    window.__recordedEvents = [];
    ["keydown", "keyup", "keypress", "input", "beforeinput"].forEach(
      (eventType) => {
        el.addEventListener(eventType, (e) => {
          window.__recordedEvents.push({
            type: e.type,
            key: e.key,
            keyCode: e.keyCode,
            charCode: e.charCode,
            which: e.which,
            data: e.data,
            inputType: e.inputType,
          });
        });
      }
    );
  }, selector);
}

/**
 * Get recorded input events
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<Array<{type: string, key?: string, data?: string}>>}
 */
export async function getRecordedEvents(page) {
  return await page.evaluate(() => window.__recordedEvents || []);
}

/**
 * Get keyboard position (for draggable tests)
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<{x: number, y: number}>}
 */
export async function getKeyboardPosition(page) {
  return await page.evaluate(() => {
    const host = document.querySelector("#virtual-keyboard-host");
    if (!host || !host.shadowRoot) return { x: 0, y: 0 };
    const keyboard = host.shadowRoot.querySelector("#virtual-keyboard");
    if (!keyboard) return { x: 0, y: 0 };
    const rect = keyboard.getBoundingClientRect();
    return { x: rect.left, y: rect.top };
  });
}
