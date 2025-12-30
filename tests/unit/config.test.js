// Unit tests for config.js - Configuration constants
import { describe, expect, it } from "vitest";
import {
  CSS_CLASSES,
  DEFAULT_BOTTOM_ROW,
  DOM_IDS,
  INPUT_TYPES,
  KEY_TYPES,
  KEYBOARD,
  MESSAGE_TYPES,
  SPECIAL_KEYS,
  STORAGE_KEYS,
  TIMING,
} from "../../src/core/config.js";

describe("config.js", () => {
  describe("DOM_IDS", () => {
    it("should have all keyboard DOM IDs", () => {
      expect(DOM_IDS.KEYBOARD).toBe("virtual-keyboard");
      expect(DOM_IDS.KEYBOARD_HOST).toBe("virtual-keyboard-host");
      expect(DOM_IDS.MAIN_KBD).toBe("vk-main-kbd");
      expect(DOM_IDS.MAIN_KBD_PLACEHOLDER).toBe("vk-main-kbd-ph");
      expect(DOM_IDS.MAIN_NUMBERS).toBe("vk-main-numbers");
      expect(DOM_IDS.NUMBER_BAR_INPUT).toBe("vk-number-bar-input");
      expect(DOM_IDS.SCROLL_EXTEND).toBe("vk-scroll-extend");
      expect(DOM_IDS.URL_BAR).toBe("vk-url-bar");
      expect(DOM_IDS.URL_BAR_TEXTBOX).toBe("vk-url-bar-textbox");
    });

    it("should have all button IDs", () => {
      expect(DOM_IDS.SETTINGS_BUTTON).toBe("vk-settings-btn");
      expect(DOM_IDS.LANGUAGE_BUTTON).toBe("vk-lang-btn");
      expect(DOM_IDS.URL_BUTTON).toBe("vk-url-btn");
      expect(DOM_IDS.OPEN_BUTTON).toBe("vk-open-btn");
    });

    it("should have overlay IDs", () => {
      expect(DOM_IDS.OVERLAY_LANGUAGE).toBe("vk-overlay-language");
      expect(DOM_IDS.OVERLAY_LANGUAGE_UL).toBe("vk-overlay-language-ul");
    });
  });

  describe("CSS_CLASSES", () => {
    it("should have key classes", () => {
      expect(CSS_CLASSES.KEY_CLICK).toBe("vk-key");
      expect(CSS_CLASSES.KEY_CASE_DISPLAY).toBe("vk-key-case");
      expect(CSS_CLASSES.NUMBER_KEY).toBe("vk-number-key");
    });

    it("should have state classes", () => {
      expect(CSS_CLASSES.SHIFT_ACTIVE).toBe("shift-active");
      expect(CSS_CLASSES.KEYBOARD_OPEN).toBe("keyboard-open");
      expect(CSS_CLASSES.KEYBOARD_CLOSED).toBe("keyboard-closed");
    });

    it("should have overlay/menu classes", () => {
      expect(CSS_CLASSES.OVERLAY).toBe("vk-overlay");
      expect(CSS_CLASSES.OVERLAY_BUTTON).toBe("vk-overlay-btn");
      expect(CSS_CLASSES.MENU).toBe("vk-menu");
    });

    it("should have email key classes", () => {
      expect(CSS_CLASSES.EMAIL_INPUT).toBe("vk-email-key");
      expect(CSS_CLASSES.HIDE_EMAIL_INPUT).toBe("vk-hide-email-key");
    });
  });

  describe("TIMING", () => {
    it("should have all timing values", () => {
      expect(TIMING.OVERLAY_CLOSE_DELAY).toBe(500);
      expect(TIMING.CLOSE_TIMER_DELAY).toBe(500);
      expect(TIMING.URL_CLOSE_DELAY).toBe(1000);
      expect(TIMING.KEYBOARD_HIDE_DELAY).toBe(500);
      expect(TIMING.URL_BAR_HIGHLIGHT_DELAY).toBe(500);
      expect(TIMING.URL_BAR_FOCUS_DELAY).toBe(200);
      expect(TIMING.ANIMATION_DURATION).toBe(400);
    });

    it("should have positive values", () => {
      Object.values(TIMING).forEach((value) => {
        expect(value).toBeGreaterThan(0);
      });
    });
  });

  describe("KEYBOARD", () => {
    it("should have dimension values", () => {
      expect(KEYBOARD.HEIGHT).toBe(370);
    });

    it("should have z-index values", () => {
      expect(KEYBOARD.Z_INDEX).toBe(10000000);
      expect(KEYBOARD.OVERLAY_Z_INDEX).toBe(10000001);
      expect(KEYBOARD.OVERLAY_Z_INDEX).toBeGreaterThan(KEYBOARD.Z_INDEX);
    });

    it("should have zoom settings", () => {
      expect(KEYBOARD.DEFAULT_ZOOM).toBe(100);
      expect(KEYBOARD.MIN_ZOOM).toBe(25);
      expect(KEYBOARD.MAX_ZOOM).toBe(150);
      expect(KEYBOARD.MIN_ZOOM).toBeLessThan(KEYBOARD.DEFAULT_ZOOM);
      expect(KEYBOARD.MAX_ZOOM).toBeGreaterThan(KEYBOARD.DEFAULT_ZOOM);
    });
  });

  describe("INPUT_TYPES", () => {
    it("should include all supported input types", () => {
      expect(INPUT_TYPES).toContain("text");
      expect(INPUT_TYPES).toContain("password");
      expect(INPUT_TYPES).toContain("search");
      expect(INPUT_TYPES).toContain("email");
      expect(INPUT_TYPES).toContain("number");
      expect(INPUT_TYPES).toContain("tel");
      expect(INPUT_TYPES).toContain("url");
    });

    it("should have exactly 7 types", () => {
      expect(INPUT_TYPES).toHaveLength(7);
    });
  });

  describe("SPECIAL_KEYS", () => {
    it("should have all special key names", () => {
      expect(SPECIAL_KEYS.EMPTY).toBe("empty");
      expect(SPECIAL_KEYS.URL).toBe("Url");
      expect(SPECIAL_KEYS.SETTINGS).toBe("Settings");
      expect(SPECIAL_KEYS.OPEN_SETTINGS).toBe("OpenSettings");
      expect(SPECIAL_KEYS.NUMBERS).toBe("&123");
      expect(SPECIAL_KEYS.CLOSE).toBe("Close");
      expect(SPECIAL_KEYS.ENTER).toBe("Enter");
      expect(SPECIAL_KEYS.SHIFT).toBe("Shift");
      expect(SPECIAL_KEYS.BACKSPACE).toBe("Backspace");
      expect(SPECIAL_KEYS.SPACE).toBe("Space");
    });
  });

  describe("STORAGE_KEYS", () => {
    it("should have all storage key names", () => {
      expect(STORAGE_KEYS.OPENED_FIRST_TIME).toBe("openedFirstTime");
      expect(STORAGE_KEYS.KEYBOARD_LAYOUT).toBe("keyboardLayout1");
      expect(STORAGE_KEYS.KEYBOARD_LAYOUTS_LIST).toBe("keyboardLayoutsList");
      expect(STORAGE_KEYS.SHOW_OPEN_BUTTON).toBe("showOpenButton");
      expect(STORAGE_KEYS.SHOW_LANGUAGE_BUTTON).toBe("showLanguageButton");
      expect(STORAGE_KEYS.SHOW_SETTINGS_BUTTON).toBe("showSettingsButton");
      expect(STORAGE_KEYS.SHOW_NUMBER_BAR).toBe("showNumberBar");
      expect(STORAGE_KEYS.KEYBOARD_ZOOM_WIDTH).toBe("keyboardZoomWidth");
      expect(STORAGE_KEYS.KEYBOARD_ZOOM_HEIGHT).toBe("keyboardZoomHeight");
      expect(STORAGE_KEYS.KEYBOARD_ZOOM_LOCKED).toBe("keyboardZoomLocked");
      expect(STORAGE_KEYS.SPACEBAR_CURSOR_SWIPE).toBe("spacebarCursorSwipe");
      expect(STORAGE_KEYS.KEYBOARD_DRAGGABLE).toBe("keyboardDraggable");
      expect(STORAGE_KEYS.KEYBOARD_POSITION).toBe("keyboardPosition");
      expect(STORAGE_KEYS.AUTOSTART).toBe("autostart");
      expect(STORAGE_KEYS.STICKY_SHIFT).toBe("stickyShift");
    });
  });

  describe("MESSAGE_TYPES", () => {
    it("should have all message type names", () => {
      expect(MESSAGE_TYPES.OPEN_FROM_IFRAME).toBe("openFromIframe");
      expect(MESSAGE_TYPES.CLICK_FROM_IFRAME).toBe("clickFromIframe");
      expect(MESSAGE_TYPES.OPEN_FROM_BUTTON).toBe("openFromButton");
      expect(MESSAGE_TYPES.OPEN_URL_BAR).toBe("openUrlBar");
      expect(MESSAGE_TYPES.KEYBOARD_STATE_CHANGE).toBe("keyboardStateChange");
    });
  });

  describe("KEY_TYPES", () => {
    it("should define Backspace key", () => {
      expect(KEY_TYPES.Backspace.class).toContain("vk-key");
      expect(KEY_TYPES.Backspace.icon).toBe("backspace");
    });

    it("should define BackspaceSmall key", () => {
      expect(KEY_TYPES.BackspaceSmall.class).toContain("vk-key");
      expect(KEY_TYPES.BackspaceSmall.icon).toBe("backspace");
    });

    it("should define Enter keys", () => {
      expect(KEY_TYPES.Enter.icon).toBe("enter");
      expect(KEY_TYPES.EnterBottom.icon).toBe("enter");
    });

    it("should define Shift key", () => {
      expect(KEY_TYPES.Shift.class).toContain("vk-key-shift");
      expect(KEY_TYPES.Shift.icon).toBe("shift");
    });

    it("should define Space key", () => {
      expect(KEY_TYPES.Space.class).toContain("vk-key-space");
      expect(KEY_TYPES.Space.dataKey).toBe(" ");
    });

    it("should define Close key", () => {
      expect(KEY_TYPES.Close.icon).toBe("close");
    });

    it("should define Settings key with ID", () => {
      expect(KEY_TYPES.Settings.icon).toBe("settings");
      expect(KEY_TYPES.Settings.attrs.id).toBe(DOM_IDS.SETTINGS_BUTTON);
      expect(KEY_TYPES.Settings.dataKey).toBe("OpenSettings");
    });

    it("should define Language key with menu", () => {
      expect(KEY_TYPES.Language.attrs["data-menu"]).toBe("Language");
      expect(KEY_TYPES.Language.noClick).toBe(true);
    });

    it("should define Url key", () => {
      expect(KEY_TYPES.Url.label).toBe("URL");
      expect(KEY_TYPES.Url.dataKey).toBe("Url");
    });

    it("should define spacer", () => {
      expect(KEY_TYPES._spacer.class).toBe("vk-spacer");
      expect(KEY_TYPES._spacer.noClick).toBe(true);
    });
  });

  describe("DEFAULT_BOTTOM_ROW", () => {
    it("should have correct order", () => {
      expect(DEFAULT_BOTTOM_ROW).toEqual([
        "&123",
        "Language",
        "Space",
        "Url",
        "Settings",
        "Close",
      ]);
    });

    it("should have 6 keys", () => {
      expect(DEFAULT_BOTTOM_ROW).toHaveLength(6);
    });
  });
});
