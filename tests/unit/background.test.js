// Unit tests for background.js - Background service worker
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MESSAGE_TYPES } from "../../src/core/config.js";
import { chromeMocks } from "./setup.js";

describe("background.js", () => {
  beforeEach(() => {
    chromeMocks.resetAll();
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe("Extension icon click", () => {
    it("should open options page when icon clicked", async () => {
      // Import the module to register listeners
      await import("../../src/background.js");

      // Trigger the click
      chromeMocks.action._triggerClicked({ id: 1, url: "https://example.com" });

      expect(chrome.runtime.openOptionsPage).toHaveBeenCalled();
    });
  });

  describe("Message handling", () => {
    beforeEach(async () => {
      vi.resetModules();
      chromeMocks.resetAll();
      // Import fresh module to register listeners
      await import("../../src/background.js");
    });

    it("should relay OPEN_FROM_IFRAME to active tab", async () => {
      const request = { method: MESSAGE_TYPES.OPEN_FROM_IFRAME };
      const sendResponse = vi.fn();

      // Get the registered listener
      const listener = chromeMocks.runtime._listeners.onMessage[0];
      listener(request, {}, sendResponse);

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(chrome.tabs.query).toHaveBeenCalledWith({
        active: true,
        currentWindow: true,
      });
      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(1, request);
    });

    it("should relay CLICK_FROM_IFRAME to active tab", async () => {
      const request = { method: MESSAGE_TYPES.CLICK_FROM_IFRAME };
      const sendResponse = vi.fn();

      const listener = chromeMocks.runtime._listeners.onMessage[0];
      listener(request, {}, sendResponse);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(1, request);
    });

    it("should relay OPEN_FROM_BUTTON to active tab", async () => {
      const request = { method: MESSAGE_TYPES.OPEN_FROM_BUTTON };
      const sendResponse = vi.fn();

      const listener = chromeMocks.runtime._listeners.onMessage[0];
      listener(request, {}, sendResponse);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(1, request);
    });

    it("should relay OPEN_URL_BAR to active tab", async () => {
      const request = { method: MESSAGE_TYPES.OPEN_URL_BAR };
      const sendResponse = vi.fn();

      const listener = chromeMocks.runtime._listeners.onMessage[0];
      listener(request, {}, sendResponse);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(1, request);
    });

    it("should broadcast KEYBOARD_STATE_CHANGE to all tabs", async () => {
      chromeMocks.tabs._setTabs([
        { id: 1, active: true, url: "https://example.com" },
        { id: 2, active: false, url: "https://test.com" },
        { id: 3, active: false, url: "https://other.com" },
      ]);

      const request = {
        method: MESSAGE_TYPES.KEYBOARD_STATE_CHANGE,
        data: { open: true },
      };
      const sendResponse = vi.fn();

      const listener = chromeMocks.runtime._listeners.onMessage[0];
      listener(request, {}, sendResponse);

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Should query all tabs (not just active)
      expect(chrome.tabs.query).toHaveBeenCalledWith({});

      // Should send to all tabs
      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(1, request);
      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(2, request);
      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(3, request);
    });

    it("should handle unknown message types as fallback relay", async () => {
      const request = { method: "unknownMessageType" };
      const sendResponse = vi.fn();

      const listener = chromeMocks.runtime._listeners.onMessage[0];
      listener(request, {}, sendResponse);

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Should still relay to active tab
      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(1, request);
    });

    it("should not fail when no active tab", async () => {
      chromeMocks.tabs._setTabs([]);

      const request = { method: MESSAGE_TYPES.OPEN_FROM_IFRAME };
      const sendResponse = vi.fn();

      const listener = chromeMocks.runtime._listeners.onMessage[0];

      // Should not throw
      expect(() => listener(request, {}, sendResponse)).not.toThrow();
    });

    it("should handle tabs without id during broadcast", async () => {
      chromeMocks.tabs._setTabs([
        { id: 1, url: "https://example.com" },
        { url: "https://no-id.com" }, // Tab without id
        { id: 3, url: "https://other.com" },
      ]);

      const request = { method: MESSAGE_TYPES.KEYBOARD_STATE_CHANGE };
      const sendResponse = vi.fn();

      const listener = chromeMocks.runtime._listeners.onMessage[0];
      listener(request, {}, sendResponse);

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Should only send to tabs with id
      expect(chrome.tabs.sendMessage).toHaveBeenCalledTimes(2);
      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(1, request);
      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(3, request);
    });

    it("should catch errors when sending to tabs", async () => {
      // Make sendMessage throw for one tab
      chrome.tabs.sendMessage.mockImplementation((tabId, _message) => {
        if (tabId === 2) {
          return Promise.reject(new Error("Tab not available"));
        }
        return Promise.resolve({ success: true });
      });

      chromeMocks.tabs._setTabs([
        { id: 1, url: "https://example.com" },
        { id: 2, url: "https://error-tab.com" },
        { id: 3, url: "https://other.com" },
      ]);

      const request = { method: MESSAGE_TYPES.KEYBOARD_STATE_CHANGE };
      const sendResponse = vi.fn();

      const listener = chromeMocks.runtime._listeners.onMessage[0];

      // Should not throw even with error
      expect(() => listener(request, {}, sendResponse)).not.toThrow();

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Should have attempted all tabs
      expect(chrome.tabs.sendMessage).toHaveBeenCalledTimes(3);
    });

    it("should return true to keep channel open for async response", async () => {
      const request = { method: MESSAGE_TYPES.OPEN_FROM_IFRAME };
      const sendResponse = vi.fn();

      const listener = chromeMocks.runtime._listeners.onMessage[0];
      const result = listener(request, {}, sendResponse);

      expect(result).toBe(true);
    });

    it("should call sendResponse with success", async () => {
      const request = { method: MESSAGE_TYPES.OPEN_FROM_IFRAME };
      const sendResponse = vi.fn();

      const listener = chromeMocks.runtime._listeners.onMessage[0];
      listener(request, {}, sendResponse);

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(sendResponse).toHaveBeenCalledWith({ success: true });
    });
  });
});
