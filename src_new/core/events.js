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
  KEYBOARD_OPEN: 'keyboard:open',
  KEYBOARD_CLOSE: 'keyboard:close',
  KEYBOARD_TOGGLE: 'keyboard:toggle',
  KEYBOARD_LAYOUT_CHANGE: 'keyboard:layoutChange',

  // Key events
  KEY_PRESS: 'key:press',
  KEY_SHIFT: 'key:shift',
  KEY_BACKSPACE: 'key:backspace',
  KEY_ENTER: 'key:enter',

  // Input events
  INPUT_FOCUS: 'input:focus',
  INPUT_BLUR: 'input:blur',
  INPUT_CHANGE: 'input:change',

  // URL bar events
  URL_BAR_OPEN: 'urlBar:open',
  URL_BAR_CLOSE: 'urlBar:close',

  // Settings events
  SETTINGS_CHANGE: 'settings:change',

  // Overlay events
  OVERLAY_OPEN: 'overlay:open',
  OVERLAY_CLOSE: 'overlay:close',
  OVERLAY_CLOSE_ALL: 'overlay:closeAll',

  // Open button events
  OPEN_BUTTON_SHOW: 'openButton:show',
  OPEN_BUTTON_HIDE: 'openButton:hide',
  OPEN_BUTTON_CLICK: 'openButton:click',

  // Iframe communication
  IFRAME_MESSAGE: 'iframe:message',
};

// Export default object for convenient import
export default { on, once, off, emit, clear, EVENTS };
