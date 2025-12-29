// Event Bus
// Simple pub/sub event system for decoupled module communication

const listeners = new Map();

/**
 * Subscribe to an event
 * @param {string} event - Event name
 * @param {Function} callback - Event handler
 * @returns {Function} Unsubscribe function
 */
export function on(event, callback) {
  if (!listeners.has(event)) {
    listeners.set(event, new Set());
  }
  listeners.get(event).add(callback);

  return () => off(event, callback);
}

/**
 * Subscribe to an event (one-time)
 * @param {string} event - Event name
 * @param {Function} callback - Event handler
 * @returns {Function} Unsubscribe function
 */
export function once(event, callback) {
  const wrapper = (...args) => {
    off(event, wrapper);
    callback(...args);
  };
  return on(event, wrapper);
}

/**
 * Unsubscribe from an event
 * @param {string} event - Event name
 * @param {Function} callback - Event handler to remove
 */
export function off(event, callback) {
  listeners.get(event)?.delete(callback);
}

/**
 * Emit an event
 * @param {string} event - Event name
 * @param {...*} args - Arguments to pass to handlers
 */
export function emit(event, ...args) {
  if (listeners.has(event)) {
    for (const callback of listeners.get(event)) {
      try {
        callback(...args);
      } catch (err) {
        console.error(`Error in event handler for "${event}":`, err);
      }
    }
  }
}

/**
 * Remove all listeners for an event (or all events)
 * @param {string} [event] - Event name (optional, clears all if omitted)
 */
export function clear(event) {
  if (event) {
    listeners.delete(event);
  } else {
    listeners.clear();
  }
}

// =============================================================================
// Event Names (constants for type safety)
// =============================================================================

export const EVENTS = {
  // Keyboard events
  KEYBOARD_OPEN: "keyboard:open",
  KEYBOARD_CLOSE: "keyboard:close",

  // Input events
  INPUT_FOCUS: "input:focus",
  INPUT_BLUR: "input:blur",

  // URL bar events
  URL_BAR_OPEN: "urlBar:open",

  // Open button events
  OPEN_BUTTON_SHOW: "openButton:show",
  OPEN_BUTTON_HIDE: "openButton:hide",
};

// Export default object for convenient import
export default { on, once, off, emit, clear, EVENTS };
