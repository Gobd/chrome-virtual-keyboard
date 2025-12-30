// Vitest setup - Chrome API mocks
import { vi } from "vitest";

// Chrome storage mock with in-memory storage
const createStorageMock = () => {
  let store = {};
  return {
    local: {
      get: vi.fn((keys) => {
        if (typeof keys === "string") {
          return Promise.resolve({ [keys]: store[keys] });
        }
        if (Array.isArray(keys)) {
          const result = {};
          keys.forEach((key) => {
            if (store[key] !== undefined) {
              result[key] = store[key];
            }
          });
          return Promise.resolve(result);
        }
        return Promise.resolve({ ...store });
      }),
      set: vi.fn((items) => {
        Object.assign(store, items);
        return Promise.resolve();
      }),
      remove: vi.fn((keys) => {
        if (typeof keys === "string") {
          delete store[keys];
        } else if (Array.isArray(keys)) {
          for (const key of keys) {
            delete store[key];
          }
        }
        return Promise.resolve();
      }),
      clear: vi.fn(() => {
        store = {};
        return Promise.resolve();
      }),
    },
    // Helper for tests to inspect/reset storage
    _store: store,
    _reset: () => {
      store = {};
    },
    _set: (data) => {
      store = { ...data };
    },
  };
};

// Chrome tabs mock
const createTabsMock = () => {
  let tabs = [
    { id: 1, active: true, url: "https://example.com" },
    { id: 2, active: false, url: "https://test.com" },
  ];

  return {
    query: vi.fn((queryInfo) => {
      let result = [...tabs];
      if (queryInfo.active !== undefined) {
        result = result.filter((t) => t.active === queryInfo.active);
      }
      if (queryInfo.currentWindow !== undefined && queryInfo.active) {
        result = result.filter((t) => t.active);
      }
      return Promise.resolve(result);
    }),
    sendMessage: vi.fn((_tabId, _message) => {
      return Promise.resolve({ success: true });
    }),
    // Helper for tests
    _setTabs: (newTabs) => {
      tabs = newTabs;
    },
    _reset: () => {
      tabs = [
        { id: 1, active: true, url: "https://example.com" },
        { id: 2, active: false, url: "https://test.com" },
      ];
    },
  };
};

// Chrome runtime mock
const createRuntimeMock = () => {
  const listeners = {
    onMessage: [],
  };

  return {
    onMessage: {
      addListener: vi.fn((callback) => {
        listeners.onMessage.push(callback);
      }),
      removeListener: vi.fn((callback) => {
        const idx = listeners.onMessage.indexOf(callback);
        if (idx !== -1) listeners.onMessage.splice(idx, 1);
      }),
    },
    openOptionsPage: vi.fn(() => Promise.resolve()),
    sendMessage: vi.fn((_message) => Promise.resolve({ success: true })),
    // Helper for tests to simulate messages
    _triggerMessage: (request, sender = {}) => {
      const responses = [];
      listeners.onMessage.forEach((listener) => {
        const sendResponse = vi.fn((response) => responses.push(response));
        listener(request, sender, sendResponse);
      });
      return responses;
    },
    _listeners: listeners,
    _reset: () => {
      listeners.onMessage = [];
    },
  };
};

// Chrome action mock
const createActionMock = () => {
  const listeners = {
    onClicked: [],
  };

  return {
    onClicked: {
      addListener: vi.fn((callback) => {
        listeners.onClicked.push(callback);
      }),
    },
    // Helper for tests
    _triggerClicked: (tab) => {
      for (const listener of listeners.onClicked) {
        listener(tab);
      }
    },
    _reset: () => {
      listeners.onClicked = [];
    },
  };
};

// Create all mocks
const storageMock = createStorageMock();
const tabsMock = createTabsMock();
const runtimeMock = createRuntimeMock();
const actionMock = createActionMock();

// Global chrome object
globalThis.chrome = {
  storage: storageMock,
  tabs: tabsMock,
  runtime: runtimeMock,
  action: actionMock,
};

// Export for direct test access
export const chromeMocks = {
  storage: storageMock,
  tabs: tabsMock,
  runtime: runtimeMock,
  action: actionMock,
  resetAll: () => {
    storageMock._reset();
    tabsMock._reset();
    runtimeMock._reset();
    actionMock._reset();
    // Reset all mock function call counts
    vi.clearAllMocks();
  },
};
