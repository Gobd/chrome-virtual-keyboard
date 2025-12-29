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
 * Get whether to show the language button
 * @returns {Promise<boolean>}
 */
export async function getShowLanguageButton() {
  const result = await get(STORAGE_KEYS.SHOW_LANGUAGE_BUTTON);
  return result[STORAGE_KEYS.SHOW_LANGUAGE_BUTTON] === true;
}

/**
 * Set whether to show the language button
 * @param {boolean} show
 */
export async function setShowLanguageButton(show) {
  await set({ [STORAGE_KEYS.SHOW_LANGUAGE_BUTTON]: show });
}

/**
 * Get whether to show the settings button
 * @returns {Promise<boolean>}
 */
export async function getShowSettingsButton() {
  const result = await get(STORAGE_KEYS.SHOW_SETTINGS_BUTTON);
  return result[STORAGE_KEYS.SHOW_SETTINGS_BUTTON] !== false;
}

/**
 * Set whether to show the settings button
 * @param {boolean} show
 */
export async function setShowSettingsButton(show) {
  await set({ [STORAGE_KEYS.SHOW_SETTINGS_BUTTON]: show });
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
 * Get spacebar cursor swipe setting
 * @returns {Promise<boolean>}
 */
export async function getSpacebarCursorSwipe() {
  const result = await get(STORAGE_KEYS.SPACEBAR_CURSOR_SWIPE);
  return result[STORAGE_KEYS.SPACEBAR_CURSOR_SWIPE] === true;
}

/**
 * Set spacebar cursor swipe setting
 * @param {boolean} enabled
 */
export async function setSpacebarCursorSwipe(enabled) {
  await set({ [STORAGE_KEYS.SPACEBAR_CURSOR_SWIPE]: enabled });
}

/**
 * Get keyboard draggable setting
 * @returns {Promise<boolean>}
 */
export async function getKeyboardDraggable() {
  const result = await get(STORAGE_KEYS.KEYBOARD_DRAGGABLE);
  return result[STORAGE_KEYS.KEYBOARD_DRAGGABLE] === true;
}

/**
 * Set keyboard draggable setting
 * @param {boolean} enabled
 */
export async function setKeyboardDraggable(enabled) {
  await set({ [STORAGE_KEYS.KEYBOARD_DRAGGABLE]: enabled });
}

/**
 * Get keyboard position
 * @returns {Promise<{x: number, y: number} | null>}
 */
export async function getKeyboardPosition() {
  const result = await get(STORAGE_KEYS.KEYBOARD_POSITION);
  return result[STORAGE_KEYS.KEYBOARD_POSITION] || null;
}

/**
 * Set keyboard position
 * @param {{x: number, y: number} | null} position
 */
export async function setKeyboardPosition(position) {
  await set({ [STORAGE_KEYS.KEYBOARD_POSITION]: position });
}

/**
 * Get autostart setting
 * @returns {Promise<boolean>}
 */
export async function getAutostart() {
  const result = await get(STORAGE_KEYS.AUTOSTART);
  return result[STORAGE_KEYS.AUTOSTART] === true;
}

/**
 * Set autostart setting
 * @param {boolean} enabled
 */
export async function setAutostart(enabled) {
  await set({ [STORAGE_KEYS.AUTOSTART]: enabled });
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
    STORAGE_KEYS.SHOW_LANGUAGE_BUTTON,
    STORAGE_KEYS.SHOW_SETTINGS_BUTTON,
    STORAGE_KEYS.KEYBOARD_ZOOM,
    STORAGE_KEYS.SPACEBAR_CURSOR_SWIPE,
    STORAGE_KEYS.KEYBOARD_DRAGGABLE,
    STORAGE_KEYS.KEYBOARD_POSITION,
    STORAGE_KEYS.AUTOSTART,
  ]);

  return {
    isFirstTime: !result[STORAGE_KEYS.OPENED_FIRST_TIME],
    layout: result[STORAGE_KEYS.KEYBOARD_LAYOUT] || "en",
    layoutsList: parseLayoutsList(result[STORAGE_KEYS.KEYBOARD_LAYOUTS_LIST]),
    showOpenButton: result[STORAGE_KEYS.SHOW_OPEN_BUTTON] !== false,
    showLanguageButton: result[STORAGE_KEYS.SHOW_LANGUAGE_BUTTON] === true,
    showSettingsButton: result[STORAGE_KEYS.SHOW_SETTINGS_BUTTON] !== false,
    keyboardZoom: result[STORAGE_KEYS.KEYBOARD_ZOOM] || 100,
    spacebarCursorSwipe: result[STORAGE_KEYS.SPACEBAR_CURSOR_SWIPE] === true,
    keyboardDraggable: result[STORAGE_KEYS.KEYBOARD_DRAGGABLE] === true,
    keyboardPosition: result[STORAGE_KEYS.KEYBOARD_POSITION] || null,
    autostart: result[STORAGE_KEYS.AUTOSTART] === true,
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
    [STORAGE_KEYS.SHOW_LANGUAGE_BUTTON]: false,
    [STORAGE_KEYS.SHOW_SETTINGS_BUTTON]: true,
    [STORAGE_KEYS.KEYBOARD_ZOOM]: 100,
    [STORAGE_KEYS.SPACEBAR_CURSOR_SWIPE]: false,
    [STORAGE_KEYS.KEYBOARD_DRAGGABLE]: false,
    [STORAGE_KEYS.KEYBOARD_POSITION]: null,
    [STORAGE_KEYS.AUTOSTART]: false,
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
  getShowLanguageButton,
  setShowLanguageButton,
  getShowSettingsButton,
  setShowSettingsButton,
  getKeyboardZoom,
  setKeyboardZoom,
  getSpacebarCursorSwipe,
  setSpacebarCursorSwipe,
  getKeyboardDraggable,
  setKeyboardDraggable,
  getKeyboardPosition,
  setKeyboardPosition,
  getAutostart,
  setAutostart,
  isFirstTime,
  markOpened,
  loadAllSettings,
  initializeDefaults,
};
