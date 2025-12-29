// Chrome Storage Wrapper
// Async wrapper around chrome.storage.local with defaults

import { STORAGE_KEYS } from "./config.js";

/**
 * Get values from chrome.storage.local
 * @param {string|string[]} keys - Key(s) to retrieve
 * @returns {Promise<Object>} Object with requested values
 */
export async function get(keys) {
  return chrome.storage.local.get(keys);
}

/**
 * Set values in chrome.storage.local
 * @param {Object} items - Key-value pairs to store
 * @returns {Promise<void>}
 */
export async function set(items) {
  return chrome.storage.local.set(items);
}

/**
 * Remove keys from chrome.storage.local
 * @param {string|string[]} keys - Key(s) to remove
 * @returns {Promise<void>}
 */
export async function remove(keys) {
  return chrome.storage.local.remove(keys);
}

/**
 * Clear all data from chrome.storage.local
 * @returns {Promise<void>}
 */
export async function clear() {
  return chrome.storage.local.clear();
}

// =============================================================================
// Typed Getters/Setters for specific settings
// =============================================================================

/**
 * Get the current keyboard layout
 * @returns {Promise<string>} Layout code (e.g., 'en', 'fr')
 */
export async function getLayout() {
  const result = await get(STORAGE_KEYS.KEYBOARD_LAYOUT);
  return result[STORAGE_KEYS.KEYBOARD_LAYOUT] || "en";
}

/**
 * Set the current keyboard layout
 * @param {string} layout - Layout code
 */
export async function setLayout(layout) {
  await set({ [STORAGE_KEYS.KEYBOARD_LAYOUT]: layout });
}

/**
 * Get the list of enabled layouts
 * @returns {Promise<Array<{value: string, name: string}>>}
 */
export async function getLayoutsList() {
  const result = await get(STORAGE_KEYS.KEYBOARD_LAYOUTS_LIST);
  return parseLayoutsList(result[STORAGE_KEYS.KEYBOARD_LAYOUTS_LIST]);
}

/**
 * Set the list of enabled layouts
 * @param {Array<{value: string, name: string}>} layouts
 */
export async function setLayoutsList(layouts) {
  await set({ [STORAGE_KEYS.KEYBOARD_LAYOUTS_LIST]: JSON.stringify(layouts) });
}

/**
 * Get whether to show the open button
 * @returns {Promise<boolean>}
 */
export async function getShowOpenButton() {
  const result = await get(STORAGE_KEYS.SHOW_OPEN_BUTTON);
  return result[STORAGE_KEYS.SHOW_OPEN_BUTTON] !== false;
}

/**
 * Set whether to show the open button
 * @param {boolean} show
 */
export async function setShowOpenButton(show) {
  await set({ [STORAGE_KEYS.SHOW_OPEN_BUTTON]: show });
}

/**
 * Get the keyboard zoom level
 * @returns {Promise<number>} Zoom percentage (25-150)
 */
export async function getKeyboardZoom() {
  const result = await get(STORAGE_KEYS.KEYBOARD_ZOOM);
  return result[STORAGE_KEYS.KEYBOARD_ZOOM] || 100;
}

/**
 * Set the keyboard zoom level
 * @param {number} zoom - Zoom percentage (25-150)
 */
export async function setKeyboardZoom(zoom) {
  await set({ [STORAGE_KEYS.KEYBOARD_ZOOM]: zoom });
}

/**
 * Check if this is the first time the extension has been opened
 * @returns {Promise<boolean>}
 */
export async function isFirstTime() {
  const result = await get(STORAGE_KEYS.OPENED_FIRST_TIME);
  return !result[STORAGE_KEYS.OPENED_FIRST_TIME];
}

/**
 * Mark that the extension has been opened
 */
export async function markOpened() {
  await set({ [STORAGE_KEYS.OPENED_FIRST_TIME]: "true" });
}

/**
 * Load all settings at once
 * @returns {Promise<Object>} All settings
 */
export async function loadAllSettings() {
  const result = await get([
    STORAGE_KEYS.OPENED_FIRST_TIME,
    STORAGE_KEYS.KEYBOARD_LAYOUT,
    STORAGE_KEYS.KEYBOARD_LAYOUTS_LIST,
    STORAGE_KEYS.SHOW_OPEN_BUTTON,
    STORAGE_KEYS.KEYBOARD_ZOOM,
  ]);

  return {
    isFirstTime: !result[STORAGE_KEYS.OPENED_FIRST_TIME],
    layout: result[STORAGE_KEYS.KEYBOARD_LAYOUT] || "en",
    layoutsList: parseLayoutsList(result[STORAGE_KEYS.KEYBOARD_LAYOUTS_LIST]),
    showOpenButton: result[STORAGE_KEYS.SHOW_OPEN_BUTTON] !== false,
    keyboardZoom: result[STORAGE_KEYS.KEYBOARD_ZOOM] || 100,
  };
}

/**
 * Initialize storage with default values (first time setup)
 * @param {Array<{value: string, name: string}>} defaultLayouts
 */
export async function initializeDefaults(defaultLayouts) {
  await set({
    [STORAGE_KEYS.KEYBOARD_LAYOUT]: "en",
    [STORAGE_KEYS.KEYBOARD_LAYOUTS_LIST]: JSON.stringify(defaultLayouts),
    [STORAGE_KEYS.OPENED_FIRST_TIME]: "true",
    [STORAGE_KEYS.SHOW_OPEN_BUTTON]: true,
    [STORAGE_KEYS.KEYBOARD_ZOOM]: 100,
  });
}

// =============================================================================
// Helpers
// =============================================================================

function parseLayoutsList(data) {
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

// Export as default object for convenient import
export default {
  get,
  set,
  remove,
  clear,
  getLayout,
  setLayout,
  getLayoutsList,
  setLayoutsList,
  getShowOpenButton,
  setShowOpenButton,
  getKeyboardZoom,
  setKeyboardZoom,
  isFirstTime,
  markOpened,
  loadAllSettings,
  initializeDefaults,
};
