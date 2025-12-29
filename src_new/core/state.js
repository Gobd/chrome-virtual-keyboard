// Observable State Store
// Simple pub/sub state management with separate slices

/**
 * Creates an observable store with subscription support
 * @param {Object} initialState - Initial state values
 * @returns {Object} Store with get, set, subscribe methods
 */
export function createStore(initialState = {}) {
  let state = { ...initialState };
  const subscribers = new Map(); // key -> Set of callbacks

  return {
    /**
     * Get current state or a specific key
     * @param {string} [key] - Optional key to get specific value
     * @returns {*} State value or entire state object
     */
    get(key) {
      if (key !== undefined) {
        return state[key];
      }
      return { ...state };
    },

    /**
     * Set state value(s) and notify subscribers
     * @param {string|Object} keyOrObject - Key to set or object of key-value pairs
     * @param {*} [value] - Value to set (if key is string)
     */
    set(keyOrObject, value) {
      if (typeof keyOrObject === 'string') {
        const oldValue = state[keyOrObject];
        state[keyOrObject] = value;
        this._notify(keyOrObject, value, oldValue);
      } else {
        // Object of key-value pairs
        for (const [k, v] of Object.entries(keyOrObject)) {
          const oldValue = state[k];
          state[k] = v;
          this._notify(k, v, oldValue);
        }
      }
    },

    /**
     * Subscribe to changes on a specific key
     * @param {string} key - Key to watch
     * @param {Function} callback - Called with (newValue, oldValue)
     * @returns {Function} Unsubscribe function
     */
    subscribe(key, callback) {
      if (!subscribers.has(key)) {
        subscribers.set(key, new Set());
      }
      subscribers.get(key).add(callback);

      // Return unsubscribe function
      return () => {
        subscribers.get(key)?.delete(callback);
      };
    },

    /**
     * Subscribe to all state changes
     * @param {Function} callback - Called with (key, newValue, oldValue)
     * @returns {Function} Unsubscribe function
     */
    subscribeAll(callback) {
      if (!subscribers.has('*')) {
        subscribers.set('*', new Set());
      }
      subscribers.get('*').add(callback);

      return () => {
        subscribers.get('*')?.delete(callback);
      };
    },

    /**
     * Notify subscribers of a change
     * @private
     */
    _notify(key, newValue, oldValue) {
      // Skip if value hasn't changed
      if (newValue === oldValue) return;

      // Notify key-specific subscribers
      if (subscribers.has(key)) {
        for (const callback of subscribers.get(key)) {
          callback(newValue, oldValue);
        }
      }

      // Notify wildcard subscribers
      if (subscribers.has('*')) {
        for (const callback of subscribers.get('*')) {
          callback(key, newValue, oldValue);
        }
      }
    },

    /**
     * Reset state to initial values
     */
    reset() {
      const oldState = state;
      state = { ...initialState };

      for (const key of Object.keys(oldState)) {
        if (oldState[key] !== state[key]) {
          this._notify(key, state[key], oldState[key]);
        }
      }
    },
  };
}

// =============================================================================
// Application State Stores
// =============================================================================

// Keyboard UI state
export const keyboardState = createStore({
  open: false,
  shift: false,
  numbersMode: false,
  loadedLayout: '',
});

// Currently focused input state
export const focusState = createStore({
  element: null,
  type: 'input', // 'input' | 'textarea' | 'contenteditable'
  changed: false,
  clickY: 0,
  clickX: 0,
});

// Scroll position state
export const scrollState = createStore({
  lastPos: 0,
  newPos: 0,
  pagePadding: false,
});

// User settings state
export const settingsState = createStore({
  layout: 'en',
  showOpenButton: true,
  keyboardZoom: 100,
});

// URL bar state
export const urlBarState = createStore({
  open: false,
  refocusing: false,
});

// Runtime state (not persisted)
export const runtimeState = createStore({
  closeTimer: null,
  iframeCount: 0,
  pointerOverKeyboard: false,
  keyboardElement: null,
  openButtonElement: null,
});
