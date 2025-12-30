// Unit tests for events.js - Event bus pub/sub system
import { beforeEach, describe, expect, it, vi } from "vitest";
import { clear, EVENTS, emit, off, on, once } from "../../src/core/events.js";

describe("events.js", () => {
  beforeEach(() => {
    // Clear all listeners before each test
    clear();
  });

  describe("on", () => {
    it("should subscribe to an event", () => {
      const callback = vi.fn();
      on("test", callback);

      emit("test", "data");

      expect(callback).toHaveBeenCalledWith("data");
    });

    it("should support multiple subscribers", () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      on("test", callback1);
      on("test", callback2);

      emit("test", "data");

      expect(callback1).toHaveBeenCalledWith("data");
      expect(callback2).toHaveBeenCalledWith("data");
    });

    it("should return unsubscribe function", () => {
      const callback = vi.fn();
      const unsubscribe = on("test", callback);

      emit("test", "first");
      expect(callback).toHaveBeenCalledTimes(1);

      unsubscribe();

      emit("test", "second");
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("should handle multiple emissions", () => {
      const callback = vi.fn();
      on("test", callback);

      emit("test", "a");
      emit("test", "b");
      emit("test", "c");

      expect(callback).toHaveBeenCalledTimes(3);
      expect(callback).toHaveBeenNthCalledWith(1, "a");
      expect(callback).toHaveBeenNthCalledWith(2, "b");
      expect(callback).toHaveBeenNthCalledWith(3, "c");
    });
  });

  describe("once", () => {
    it("should only trigger callback once", () => {
      const callback = vi.fn();
      once("test", callback);

      emit("test", "first");
      emit("test", "second");
      emit("test", "third");

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith("first");
    });

    it("should return unsubscribe function", () => {
      const callback = vi.fn();
      const unsubscribe = once("test", callback);

      unsubscribe();

      emit("test", "data");

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe("off", () => {
    it("should unsubscribe from an event", () => {
      const callback = vi.fn();
      on("test", callback);

      emit("test", "first");
      expect(callback).toHaveBeenCalledTimes(1);

      off("test", callback);

      emit("test", "second");
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("should handle non-existent event", () => {
      const callback = vi.fn();
      // Should not throw
      expect(() => off("nonexistent", callback)).not.toThrow();
    });

    it("should only remove specified callback", () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      on("test", callback1);
      on("test", callback2);

      off("test", callback1);

      emit("test", "data");

      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalledWith("data");
    });
  });

  describe("emit", () => {
    it("should pass multiple arguments", () => {
      const callback = vi.fn();
      on("test", callback);

      emit("test", "arg1", "arg2", "arg3");

      expect(callback).toHaveBeenCalledWith("arg1", "arg2", "arg3");
    });

    it("should handle events with no subscribers", () => {
      // Should not throw
      expect(() => emit("nonexistent", "data")).not.toThrow();
    });

    it("should catch errors in handlers", () => {
      const errorCallback = vi.fn(() => {
        throw new Error("Handler error");
      });
      const successCallback = vi.fn();

      // Mock console.error to suppress output
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      on("test", errorCallback);
      on("test", successCallback);

      emit("test", "data");

      // Error handler should have been called
      expect(errorCallback).toHaveBeenCalled();
      // Success handler should still be called despite error
      expect(successCallback).toHaveBeenCalledWith("data");
      // Error should be logged
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe("clear", () => {
    it("should clear specific event listeners", () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      on("event1", callback1);
      on("event2", callback2);

      clear("event1");

      emit("event1", "data");
      emit("event2", "data");

      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalledWith("data");
    });

    it("should clear all event listeners when no event specified", () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      on("event1", callback1);
      on("event2", callback2);

      clear();

      emit("event1", "data");
      emit("event2", "data");

      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).not.toHaveBeenCalled();
    });
  });

  describe("EVENTS constants", () => {
    it("should have keyboard events", () => {
      expect(EVENTS.KEYBOARD_OPEN).toBe("keyboard:open");
      expect(EVENTS.KEYBOARD_CLOSE).toBe("keyboard:close");
    });

    it("should have input events", () => {
      expect(EVENTS.INPUT_FOCUS).toBe("input:focus");
      expect(EVENTS.INPUT_BLUR).toBe("input:blur");
    });

    it("should have URL bar events", () => {
      expect(EVENTS.URL_BAR_OPEN).toBe("urlBar:open");
    });

    it("should have open button events", () => {
      expect(EVENTS.OPEN_BUTTON_SHOW).toBe("openButton:show");
      expect(EVENTS.OPEN_BUTTON_HIDE).toBe("openButton:hide");
    });

    it("should work with on/emit", () => {
      const callback = vi.fn();
      on(EVENTS.KEYBOARD_OPEN, callback);

      emit(EVENTS.KEYBOARD_OPEN, { some: "data" });

      expect(callback).toHaveBeenCalledWith({ some: "data" });
    });
  });
});
