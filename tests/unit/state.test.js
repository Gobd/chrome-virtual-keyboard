// Unit tests for state.js - Observable state store
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createStore,
  focusState,
  keyboardState,
  runtimeState,
  scrollState,
  settingsState,
  urlBarState,
} from "../../src/core/state.js";

describe("createStore", () => {
  let store;

  beforeEach(() => {
    store = createStore({ count: 0, name: "test" });
  });

  describe("get", () => {
    it("should return specific value when key provided", () => {
      expect(store.get("count")).toBe(0);
      expect(store.get("name")).toBe("test");
    });

    it("should return copy of entire state when no key provided", () => {
      const state = store.get();
      expect(state).toEqual({ count: 0, name: "test" });
      // Should be a copy, not the original
      state.count = 999;
      expect(store.get("count")).toBe(0);
    });

    it("should return undefined for non-existent keys", () => {
      expect(store.get("nonexistent")).toBeUndefined();
    });
  });

  describe("set", () => {
    it("should update single value with key and value", () => {
      store.set("count", 5);
      expect(store.get("count")).toBe(5);
    });

    it("should update multiple values with object", () => {
      store.set({ count: 10, name: "updated" });
      expect(store.get("count")).toBe(10);
      expect(store.get("name")).toBe("updated");
    });

    it("should add new keys", () => {
      store.set("newKey", "newValue");
      expect(store.get("newKey")).toBe("newValue");
    });
  });

  describe("subscribe", () => {
    it("should call callback when subscribed key changes", () => {
      const callback = vi.fn();
      store.subscribe("count", callback);

      store.set("count", 1);

      expect(callback).toHaveBeenCalledWith(1, 0);
    });

    it("should not call callback when other keys change", () => {
      const callback = vi.fn();
      store.subscribe("count", callback);

      store.set("name", "other");

      expect(callback).not.toHaveBeenCalled();
    });

    it("should not call callback when value unchanged", () => {
      const callback = vi.fn();
      store.subscribe("count", callback);

      store.set("count", 0); // Same value

      expect(callback).not.toHaveBeenCalled();
    });

    it("should support multiple subscribers to same key", () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      store.subscribe("count", callback1);
      store.subscribe("count", callback2);

      store.set("count", 1);

      expect(callback1).toHaveBeenCalledWith(1, 0);
      expect(callback2).toHaveBeenCalledWith(1, 0);
    });

    it("should return unsubscribe function", () => {
      const callback = vi.fn();
      const unsubscribe = store.subscribe("count", callback);

      store.set("count", 1);
      expect(callback).toHaveBeenCalledTimes(1);

      unsubscribe();

      store.set("count", 2);
      expect(callback).toHaveBeenCalledTimes(1); // Not called again
    });
  });

  describe("subscribeAll", () => {
    it("should call callback for any key change", () => {
      const callback = vi.fn();
      store.subscribeAll(callback);

      store.set("count", 1);
      expect(callback).toHaveBeenCalledWith("count", 1, 0);

      store.set("name", "changed");
      expect(callback).toHaveBeenCalledWith("name", "changed", "test");
    });

    it("should not call callback when value unchanged", () => {
      const callback = vi.fn();
      store.subscribeAll(callback);

      store.set("count", 0); // Same value

      expect(callback).not.toHaveBeenCalled();
    });

    it("should return unsubscribe function", () => {
      const callback = vi.fn();
      const unsubscribe = store.subscribeAll(callback);

      store.set("count", 1);
      expect(callback).toHaveBeenCalledTimes(1);

      unsubscribe();

      store.set("count", 2);
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe("reset", () => {
    it("should reset state to initial values", () => {
      store.set({ count: 100, name: "changed" });
      store.reset();

      expect(store.get("count")).toBe(0);
      expect(store.get("name")).toBe("test");
    });

    it("should notify subscribers of reset changes", () => {
      const callback = vi.fn();
      store.subscribe("count", callback);

      store.set("count", 100);
      callback.mockClear();

      store.reset();

      expect(callback).toHaveBeenCalledWith(0, 100);
    });

    it("should not notify if value unchanged during reset", () => {
      const callback = vi.fn();
      store.subscribe("count", callback);

      // count is already 0, so reset shouldn't trigger callback
      store.reset();

      expect(callback).not.toHaveBeenCalled();
    });
  });
});

describe("Application State Stores", () => {
  describe("keyboardState", () => {
    beforeEach(() => {
      keyboardState.reset();
    });

    it("should have correct initial values", () => {
      expect(keyboardState.get("open")).toBe(false);
      expect(keyboardState.get("shift")).toBe(false);
      expect(keyboardState.get("numbersMode")).toBe(false);
      expect(keyboardState.get("loadedLayout")).toBe("");
    });

    it("should track keyboard open state", () => {
      keyboardState.set("open", true);
      expect(keyboardState.get("open")).toBe(true);
    });

    it("should track shift state", () => {
      keyboardState.set("shift", true);
      expect(keyboardState.get("shift")).toBe(true);
    });
  });

  describe("focusState", () => {
    beforeEach(() => {
      focusState.reset();
    });

    it("should have correct initial values", () => {
      expect(focusState.get("element")).toBeNull();
      expect(focusState.get("type")).toBe("input");
      expect(focusState.get("changed")).toBe(false);
      expect(focusState.get("clickY")).toBe(0);
      expect(focusState.get("clickX")).toBe(0);
    });

    it("should track focused element", () => {
      const mockElement = document.createElement("input");
      focusState.set("element", mockElement);
      expect(focusState.get("element")).toBe(mockElement);
    });
  });

  describe("scrollState", () => {
    beforeEach(() => {
      scrollState.reset();
    });

    it("should have correct initial values", () => {
      expect(scrollState.get("lastPos")).toBe(0);
      expect(scrollState.get("newPos")).toBe(0);
      expect(scrollState.get("pagePadding")).toBe(false);
    });

    it("should track scroll positions", () => {
      scrollState.set({ lastPos: 100, newPos: 200 });
      expect(scrollState.get("lastPos")).toBe(100);
      expect(scrollState.get("newPos")).toBe(200);
    });
  });

  describe("settingsState", () => {
    beforeEach(() => {
      settingsState.reset();
    });

    it("should have correct initial values", () => {
      expect(settingsState.get("layout")).toBe("en");
      expect(settingsState.get("showOpenButton")).toBe(true);
      expect(settingsState.get("showLanguageButton")).toBe(false);
      expect(settingsState.get("showSettingsButton")).toBe(true);
      expect(settingsState.get("keyboardZoomWidth")).toBe(100);
      expect(settingsState.get("keyboardZoomHeight")).toBe(100);
      expect(settingsState.get("keyboardZoomLocked")).toBe(true);
      expect(settingsState.get("spacebarCursorSwipe")).toBe(false);
      expect(settingsState.get("keyboardDraggable")).toBe(false);
      expect(settingsState.get("keyboardPosition")).toBeNull();
      expect(settingsState.get("autostart")).toBe(false);
      expect(settingsState.get("stickyShift")).toBe(false);
    });
  });

  describe("urlBarState", () => {
    beforeEach(() => {
      urlBarState.reset();
    });

    it("should have correct initial values", () => {
      expect(urlBarState.get("open")).toBe(false);
      expect(urlBarState.get("refocusing")).toBe(false);
    });
  });

  describe("runtimeState", () => {
    beforeEach(() => {
      runtimeState.reset();
    });

    it("should have correct initial values", () => {
      expect(runtimeState.get("closeTimer")).toBeNull();
      expect(runtimeState.get("iframeCount")).toBe(0);
      expect(runtimeState.get("pointerOverKeyboard")).toBe(false);
      expect(runtimeState.get("keyboardElement")).toBeNull();
      expect(runtimeState.get("openButtonElement")).toBeNull();
    });
  });
});
