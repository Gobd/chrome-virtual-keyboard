// Unit tests for storage.js - Chrome storage wrapper
import { beforeEach, describe, expect, it } from "vitest";
import { STORAGE_KEYS } from "../../src/core/config.js";
import {
  clear,
  get,
  getAutostart,
  getKeyboardDraggable,
  getKeyboardPosition,
  getKeyboardZoomHeight,
  getKeyboardZoomLocked,
  getKeyboardZoomWidth,
  getLayout,
  getLayoutsList,
  getShowLanguageButton,
  getShowNumberBar,
  getShowOpenButton,
  getShowSettingsButton,
  getSpacebarCursorSwipe,
  getStickyShift,
  initializeDefaults,
  isFirstTime,
  loadAllSettings,
  markOpened,
  remove,
  set,
  setAutostart,
  setKeyboardDraggable,
  setKeyboardPosition,
  setKeyboardZoomHeight,
  setKeyboardZoomLocked,
  setKeyboardZoomWidth,
  setLayout,
  setLayoutsList,
  setShowLanguageButton,
  setShowNumberBar,
  setShowOpenButton,
  setShowSettingsButton,
  setSpacebarCursorSwipe,
  setStickyShift,
} from "../../src/core/storage.js";
import { chromeMocks } from "./setup.js";

describe("storage.js", () => {
  beforeEach(() => {
    chromeMocks.resetAll();
  });

  describe("Basic operations", () => {
    describe("get", () => {
      it("should call chrome.storage.local.get", async () => {
        await get("testKey");
        expect(chrome.storage.local.get).toHaveBeenCalledWith("testKey");
      });

      it("should return stored value", async () => {
        chromeMocks.storage._set({ testKey: "testValue" });
        const result = await get("testKey");
        expect(result).toEqual({ testKey: "testValue" });
      });
    });

    describe("set", () => {
      it("should call chrome.storage.local.set", async () => {
        await set({ testKey: "testValue" });
        expect(chrome.storage.local.set).toHaveBeenCalledWith({
          testKey: "testValue",
        });
      });

      it("should persist value", async () => {
        await set({ testKey: "testValue" });
        const result = await get("testKey");
        expect(result).toEqual({ testKey: "testValue" });
      });
    });

    describe("remove", () => {
      it("should call chrome.storage.local.remove", async () => {
        await remove("testKey");
        expect(chrome.storage.local.remove).toHaveBeenCalledWith("testKey");
      });

      it("should remove value from storage", async () => {
        chromeMocks.storage._set({ testKey: "testValue" });
        await remove("testKey");
        const result = await get("testKey");
        expect(result).toEqual({});
      });
    });

    describe("clear", () => {
      it("should call chrome.storage.local.clear", async () => {
        await clear();
        expect(chrome.storage.local.clear).toHaveBeenCalled();
      });

      it("should clear all values", async () => {
        chromeMocks.storage._set({ key1: "v1", key2: "v2" });
        await clear();
        const result = await get(["key1", "key2"]);
        expect(result).toEqual({});
      });
    });
  });

  describe("Layout settings", () => {
    describe("getLayout", () => {
      it("should return stored layout", async () => {
        chromeMocks.storage._set({ [STORAGE_KEYS.KEYBOARD_LAYOUT]: "fr" });
        const layout = await getLayout();
        expect(layout).toBe("fr");
      });

      it("should return 'en' as default", async () => {
        const layout = await getLayout();
        expect(layout).toBe("en");
      });
    });

    describe("setLayout", () => {
      it("should store layout", async () => {
        await setLayout("de");
        const result = await get(STORAGE_KEYS.KEYBOARD_LAYOUT);
        expect(result[STORAGE_KEYS.KEYBOARD_LAYOUT]).toBe("de");
      });
    });

    describe("getLayoutsList", () => {
      it("should parse JSON layouts list", async () => {
        const layouts = [
          { value: "en", name: "English" },
          { value: "fr", name: "French" },
        ];
        chromeMocks.storage._set({
          [STORAGE_KEYS.KEYBOARD_LAYOUTS_LIST]: JSON.stringify(layouts),
        });

        const result = await getLayoutsList();
        expect(result).toEqual(layouts);
      });

      it("should return empty array when no layouts", async () => {
        const result = await getLayoutsList();
        expect(result).toEqual([]);
      });

      it("should return empty array on invalid JSON", async () => {
        chromeMocks.storage._set({
          [STORAGE_KEYS.KEYBOARD_LAYOUTS_LIST]: "invalid json",
        });

        const result = await getLayoutsList();
        expect(result).toEqual([]);
      });
    });

    describe("setLayoutsList", () => {
      it("should stringify and store layouts", async () => {
        const layouts = [{ value: "en", name: "English" }];
        await setLayoutsList(layouts);

        const result = await get(STORAGE_KEYS.KEYBOARD_LAYOUTS_LIST);
        expect(result[STORAGE_KEYS.KEYBOARD_LAYOUTS_LIST]).toBe(
          JSON.stringify(layouts)
        );
      });
    });
  });

  describe("Boolean settings", () => {
    describe("showOpenButton", () => {
      it("should return true by default", async () => {
        expect(await getShowOpenButton()).toBe(true);
      });

      it("should return false when explicitly set", async () => {
        chromeMocks.storage._set({ [STORAGE_KEYS.SHOW_OPEN_BUTTON]: false });
        expect(await getShowOpenButton()).toBe(false);
      });

      it("should store value", async () => {
        await setShowOpenButton(false);
        expect(await getShowOpenButton()).toBe(false);
      });
    });

    describe("showLanguageButton", () => {
      it("should return false by default", async () => {
        expect(await getShowLanguageButton()).toBe(false);
      });

      it("should return true when explicitly set", async () => {
        chromeMocks.storage._set({ [STORAGE_KEYS.SHOW_LANGUAGE_BUTTON]: true });
        expect(await getShowLanguageButton()).toBe(true);
      });

      it("should store value", async () => {
        await setShowLanguageButton(true);
        expect(await getShowLanguageButton()).toBe(true);
      });
    });

    describe("showSettingsButton", () => {
      it("should return true by default", async () => {
        expect(await getShowSettingsButton()).toBe(true);
      });

      it("should return false when explicitly set", async () => {
        chromeMocks.storage._set({
          [STORAGE_KEYS.SHOW_SETTINGS_BUTTON]: false,
        });
        expect(await getShowSettingsButton()).toBe(false);
      });

      it("should store value", async () => {
        await setShowSettingsButton(false);
        expect(await getShowSettingsButton()).toBe(false);
      });
    });

    describe("showNumberBar", () => {
      it("should return true by default", async () => {
        expect(await getShowNumberBar()).toBe(true);
      });

      it("should return false when explicitly set", async () => {
        chromeMocks.storage._set({ [STORAGE_KEYS.SHOW_NUMBER_BAR]: false });
        expect(await getShowNumberBar()).toBe(false);
      });

      it("should store value", async () => {
        await setShowNumberBar(false);
        expect(await getShowNumberBar()).toBe(false);
      });
    });

    describe("spacebarCursorSwipe", () => {
      it("should return false by default", async () => {
        expect(await getSpacebarCursorSwipe()).toBe(false);
      });

      it("should return true when explicitly set", async () => {
        chromeMocks.storage._set({
          [STORAGE_KEYS.SPACEBAR_CURSOR_SWIPE]: true,
        });
        expect(await getSpacebarCursorSwipe()).toBe(true);
      });

      it("should store value", async () => {
        await setSpacebarCursorSwipe(true);
        expect(await getSpacebarCursorSwipe()).toBe(true);
      });
    });

    describe("keyboardDraggable", () => {
      it("should return false by default", async () => {
        expect(await getKeyboardDraggable()).toBe(false);
      });

      it("should return true when explicitly set", async () => {
        chromeMocks.storage._set({ [STORAGE_KEYS.KEYBOARD_DRAGGABLE]: true });
        expect(await getKeyboardDraggable()).toBe(true);
      });

      it("should store value", async () => {
        await setKeyboardDraggable(true);
        expect(await getKeyboardDraggable()).toBe(true);
      });
    });

    describe("autostart", () => {
      it("should return false by default", async () => {
        expect(await getAutostart()).toBe(false);
      });

      it("should return true when explicitly set", async () => {
        chromeMocks.storage._set({ [STORAGE_KEYS.AUTOSTART]: true });
        expect(await getAutostart()).toBe(true);
      });

      it("should store value", async () => {
        await setAutostart(true);
        expect(await getAutostart()).toBe(true);
      });
    });
  });

  describe("Zoom settings", () => {
    describe("keyboardZoomWidth", () => {
      it("should return 100 by default", async () => {
        expect(await getKeyboardZoomWidth()).toBe(100);
      });

      it("should return stored value", async () => {
        chromeMocks.storage._set({ [STORAGE_KEYS.KEYBOARD_ZOOM_WIDTH]: 150 });
        expect(await getKeyboardZoomWidth()).toBe(150);
      });

      it("should store value", async () => {
        await setKeyboardZoomWidth(75);
        expect(await getKeyboardZoomWidth()).toBe(75);
      });
    });

    describe("keyboardZoomHeight", () => {
      it("should return 100 by default", async () => {
        expect(await getKeyboardZoomHeight()).toBe(100);
      });

      it("should return stored value", async () => {
        chromeMocks.storage._set({ [STORAGE_KEYS.KEYBOARD_ZOOM_HEIGHT]: 125 });
        expect(await getKeyboardZoomHeight()).toBe(125);
      });

      it("should store value", async () => {
        await setKeyboardZoomHeight(80);
        expect(await getKeyboardZoomHeight()).toBe(80);
      });
    });

    describe("keyboardZoomLocked", () => {
      it("should return true by default", async () => {
        expect(await getKeyboardZoomLocked()).toBe(true);
      });

      it("should return stored value", async () => {
        chromeMocks.storage._set({
          [STORAGE_KEYS.KEYBOARD_ZOOM_LOCKED]: false,
        });
        expect(await getKeyboardZoomLocked()).toBe(false);
      });

      it("should store value", async () => {
        await setKeyboardZoomLocked(false);
        expect(await getKeyboardZoomLocked()).toBe(false);
      });
    });
  });

  describe("Sticky shift setting", () => {
    describe("stickyShift", () => {
      it("should return false by default", async () => {
        expect(await getStickyShift()).toBe(false);
      });

      it("should return stored value", async () => {
        chromeMocks.storage._set({ [STORAGE_KEYS.STICKY_SHIFT]: true });
        expect(await getStickyShift()).toBe(true);
      });

      it("should store value", async () => {
        await setStickyShift(true);
        expect(await getStickyShift()).toBe(true);
      });
    });
  });

  describe("Position settings", () => {
    describe("keyboardPosition", () => {
      it("should return null by default", async () => {
        expect(await getKeyboardPosition()).toBeNull();
      });

      it("should return stored position", async () => {
        const position = { x: 100, y: 200 };
        chromeMocks.storage._set({
          [STORAGE_KEYS.KEYBOARD_POSITION]: position,
        });
        expect(await getKeyboardPosition()).toEqual(position);
      });

      it("should store position", async () => {
        const position = { x: 150, y: 250 };
        await setKeyboardPosition(position);
        expect(await getKeyboardPosition()).toEqual(position);
      });

      it("should allow null position", async () => {
        await setKeyboardPosition({ x: 100, y: 100 });
        await setKeyboardPosition(null);
        expect(await getKeyboardPosition()).toBeNull();
      });
    });
  });

  describe("First time tracking", () => {
    describe("isFirstTime", () => {
      it("should return true when not opened before", async () => {
        expect(await isFirstTime()).toBe(true);
      });

      it("should return false after markOpened", async () => {
        await markOpened();
        expect(await isFirstTime()).toBe(false);
      });
    });

    describe("markOpened", () => {
      it("should set opened flag", async () => {
        await markOpened();
        const result = await get(STORAGE_KEYS.OPENED_FIRST_TIME);
        expect(result[STORAGE_KEYS.OPENED_FIRST_TIME]).toBe("true");
      });
    });
  });

  describe("loadAllSettings", () => {
    it("should return all settings with defaults", async () => {
      const settings = await loadAllSettings();

      expect(settings).toEqual({
        isFirstTime: true,
        layout: "en",
        layoutsList: [],
        showOpenButton: true,
        showLanguageButton: false,
        showSettingsButton: true,
        showUrlButton: true,
        showCloseButton: true,
        showNumbersButton: true,
        showNumberBar: true,
        keyboardZoomWidth: 100,
        keyboardZoomHeight: 100,
        keyboardZoomLocked: true,
        spacebarCursorSwipe: false,
        keyboardDraggable: false,
        keyboardPosition: null,
        autostart: false,
        stickyShift: false,
        autoCaps: false,
        voiceEnabled: false,
        voiceModel: "base-q8",
        voiceLanguage: "multilingual",
        keyRepeatEnabled: false,
        keyRepeatDelay: 400,
        keyRepeatSpeed: 75,
      });
    });

    it("should return stored settings", async () => {
      chromeMocks.storage._set({
        [STORAGE_KEYS.OPENED_FIRST_TIME]: "true",
        [STORAGE_KEYS.KEYBOARD_LAYOUT]: "fr",
        [STORAGE_KEYS.KEYBOARD_LAYOUTS_LIST]: JSON.stringify([
          { value: "fr", name: "French" },
        ]),
        [STORAGE_KEYS.SHOW_OPEN_BUTTON]: false,
        [STORAGE_KEYS.SHOW_LANGUAGE_BUTTON]: true,
        [STORAGE_KEYS.SHOW_SETTINGS_BUTTON]: false,
        [STORAGE_KEYS.SHOW_URL_BUTTON]: false,
        [STORAGE_KEYS.SHOW_CLOSE_BUTTON]: false,
        [STORAGE_KEYS.SHOW_NUMBERS_BUTTON]: false,
        [STORAGE_KEYS.SHOW_NUMBER_BAR]: false,
        [STORAGE_KEYS.KEYBOARD_ZOOM_WIDTH]: 125,
        [STORAGE_KEYS.KEYBOARD_ZOOM_HEIGHT]: 80,
        [STORAGE_KEYS.KEYBOARD_ZOOM_LOCKED]: false,
        [STORAGE_KEYS.SPACEBAR_CURSOR_SWIPE]: true,
        [STORAGE_KEYS.KEYBOARD_DRAGGABLE]: true,
        [STORAGE_KEYS.KEYBOARD_POSITION]: { x: 100, y: 200 },
        [STORAGE_KEYS.AUTOSTART]: true,
        [STORAGE_KEYS.STICKY_SHIFT]: true,
      });

      const settings = await loadAllSettings();

      expect(settings).toEqual({
        isFirstTime: false,
        layout: "fr",
        layoutsList: [{ value: "fr", name: "French" }],
        showOpenButton: false,
        showLanguageButton: true,
        showSettingsButton: false,
        showUrlButton: false,
        showCloseButton: false,
        showNumbersButton: false,
        showNumberBar: false,
        keyboardZoomWidth: 125,
        keyboardZoomHeight: 80,
        keyboardZoomLocked: false,
        spacebarCursorSwipe: true,
        keyboardDraggable: true,
        keyboardPosition: { x: 100, y: 200 },
        autostart: true,
        stickyShift: true,
        autoCaps: false,
        voiceEnabled: false,
        voiceModel: "base-q8",
        voiceLanguage: "multilingual",
        keyRepeatEnabled: false,
        keyRepeatDelay: 400,
        keyRepeatSpeed: 75,
      });
    });
  });

  describe("initializeDefaults", () => {
    it("should set all default values", async () => {
      const defaultLayouts = [
        { value: "en", name: "English" },
        { value: "es", name: "Spanish" },
      ];

      await initializeDefaults(defaultLayouts);

      const settings = await loadAllSettings();

      expect(settings.isFirstTime).toBe(false);
      expect(settings.layout).toBe("en");
      expect(settings.layoutsList).toEqual(defaultLayouts);
      expect(settings.showOpenButton).toBe(false);
      expect(settings.showLanguageButton).toBe(false);
      expect(settings.showSettingsButton).toBe(true);
      expect(settings.showNumberBar).toBe(true);
      expect(settings.keyboardZoomWidth).toBe(100);
      expect(settings.keyboardZoomHeight).toBe(100);
      expect(settings.keyboardZoomLocked).toBe(true);
      expect(settings.spacebarCursorSwipe).toBe(false);
      expect(settings.keyboardDraggable).toBe(false);
      expect(settings.keyboardPosition).toBeNull();
      expect(settings.autostart).toBe(false);
      expect(settings.stickyShift).toBe(false);
    });
  });
});
