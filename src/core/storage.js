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
 * Get whether to show the URL button
 * @returns {Promise<boolean>}
 */
export async function getShowUrlButton() {
  const result = await get(STORAGE_KEYS.SHOW_URL_BUTTON);
  return result[STORAGE_KEYS.SHOW_URL_BUTTON] !== false;
}

/**
 * Set whether to show the URL button
 * @param {boolean} show
 */
export async function setShowUrlButton(show) {
  await set({ [STORAGE_KEYS.SHOW_URL_BUTTON]: show });
}

/**
 * Get whether to show the close button
 * @returns {Promise<boolean>}
 */
export async function getShowCloseButton() {
  const result = await get(STORAGE_KEYS.SHOW_CLOSE_BUTTON);
  return result[STORAGE_KEYS.SHOW_CLOSE_BUTTON] !== false;
}

/**
 * Set whether to show the close button
 * @param {boolean} show
 */
export async function setShowCloseButton(show) {
  await set({ [STORAGE_KEYS.SHOW_CLOSE_BUTTON]: show });
}

/**
 * Get whether to show the numbers/symbols toggle button
 * @returns {Promise<boolean>}
 */
export async function getShowNumbersButton() {
  const result = await get(STORAGE_KEYS.SHOW_NUMBERS_BUTTON);
  return result[STORAGE_KEYS.SHOW_NUMBERS_BUTTON] !== false;
}

/**
 * Set whether to show the numbers/symbols toggle button
 * @param {boolean} show
 */
export async function setShowNumbersButton(show) {
  await set({ [STORAGE_KEYS.SHOW_NUMBERS_BUTTON]: show });
}

/**
 * Get whether to show the number bar
 * @returns {Promise<boolean>}
 */
export async function getShowNumberBar() {
  const result = await get(STORAGE_KEYS.SHOW_NUMBER_BAR);
  return result[STORAGE_KEYS.SHOW_NUMBER_BAR] !== false;
}

/**
 * Set whether to show the number bar
 * @param {boolean} show
 */
export async function setShowNumberBar(show) {
  await set({ [STORAGE_KEYS.SHOW_NUMBER_BAR]: show });
}

/**
 * Get the keyboard zoom width
 * @returns {Promise<number>} Zoom percentage (25-150)
 */
export async function getKeyboardZoomWidth() {
  const result = await get(STORAGE_KEYS.KEYBOARD_ZOOM_WIDTH);
  return result[STORAGE_KEYS.KEYBOARD_ZOOM_WIDTH] || 100;
}

/**
 * Set the keyboard zoom width
 * @param {number} zoom - Zoom percentage (25-150)
 */
export async function setKeyboardZoomWidth(zoom) {
  await set({ [STORAGE_KEYS.KEYBOARD_ZOOM_WIDTH]: zoom });
}

/**
 * Get the keyboard zoom height
 * @returns {Promise<number>} Zoom percentage (25-150)
 */
export async function getKeyboardZoomHeight() {
  const result = await get(STORAGE_KEYS.KEYBOARD_ZOOM_HEIGHT);
  return result[STORAGE_KEYS.KEYBOARD_ZOOM_HEIGHT] || 100;
}

/**
 * Set the keyboard zoom height
 * @param {number} zoom - Zoom percentage (25-150)
 */
export async function setKeyboardZoomHeight(zoom) {
  await set({ [STORAGE_KEYS.KEYBOARD_ZOOM_HEIGHT]: zoom });
}

/**
 * Get whether zoom width/height are locked together
 * @returns {Promise<boolean>}
 */
export async function getKeyboardZoomLocked() {
  const result = await get(STORAGE_KEYS.KEYBOARD_ZOOM_LOCKED);
  return result[STORAGE_KEYS.KEYBOARD_ZOOM_LOCKED] !== false;
}

/**
 * Set whether zoom width/height are locked together
 * @param {boolean} locked
 */
export async function setKeyboardZoomLocked(locked) {
  await set({ [STORAGE_KEYS.KEYBOARD_ZOOM_LOCKED]: locked });
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
 * Get sticky shift setting
 * @returns {Promise<boolean>}
 */
export async function getStickyShift() {
  const result = await get(STORAGE_KEYS.STICKY_SHIFT);
  return result[STORAGE_KEYS.STICKY_SHIFT] === true;
}

/**
 * Set sticky shift setting
 * @param {boolean} enabled
 */
export async function setStickyShift(enabled) {
  await set({ [STORAGE_KEYS.STICKY_SHIFT]: enabled });
}

/**
 * Get auto caps setting
 * @returns {Promise<boolean>}
 */
export async function getAutoCaps() {
  const result = await get(STORAGE_KEYS.AUTO_CAPS);
  return result[STORAGE_KEYS.AUTO_CAPS] === true;
}

/**
 * Set auto caps setting
 * @param {boolean} enabled
 */
export async function setAutoCaps(enabled) {
  await set({ [STORAGE_KEYS.AUTO_CAPS]: enabled });
}

/**
 * Get voice enabled setting
 * @returns {Promise<boolean>}
 */
export async function getVoiceEnabled() {
  const result = await get(STORAGE_KEYS.VOICE_ENABLED);
  return result[STORAGE_KEYS.VOICE_ENABLED] === true;
}

/**
 * Set voice enabled setting
 * @param {boolean} enabled
 */
export async function setVoiceEnabled(enabled) {
  await set({ [STORAGE_KEYS.VOICE_ENABLED]: enabled });
}

/**
 * Get voice model setting
 * @returns {Promise<string>} Model key like 'tiny-q8', 'base-q8', 'base', etc.
 */
export async function getVoiceModel() {
  const result = await get(STORAGE_KEYS.VOICE_MODEL);
  return result[STORAGE_KEYS.VOICE_MODEL] || "base-q8";
}

/**
 * Set voice model setting
 * @param {string} model - 'tiny' or 'base'
 */
export async function setVoiceModel(model) {
  await set({ [STORAGE_KEYS.VOICE_MODEL]: model });
}

/**
 * Get voice language setting
 * @returns {Promise<string>} 'en' or 'multilingual'
 */
export async function getVoiceLanguage() {
  const result = await get(STORAGE_KEYS.VOICE_LANGUAGE);
  return result[STORAGE_KEYS.VOICE_LANGUAGE] || "multilingual";
}

/**
 * Set voice language setting
 * @param {string} language - 'en' or 'multilingual'
 */
export async function setVoiceLanguage(language) {
  await set({ [STORAGE_KEYS.VOICE_LANGUAGE]: language });
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
    STORAGE_KEYS.SHOW_URL_BUTTON,
    STORAGE_KEYS.SHOW_CLOSE_BUTTON,
    STORAGE_KEYS.SHOW_NUMBERS_BUTTON,
    STORAGE_KEYS.SHOW_NUMBER_BAR,
    STORAGE_KEYS.KEYBOARD_ZOOM_WIDTH,
    STORAGE_KEYS.KEYBOARD_ZOOM_HEIGHT,
    STORAGE_KEYS.KEYBOARD_ZOOM_LOCKED,
    STORAGE_KEYS.SPACEBAR_CURSOR_SWIPE,
    STORAGE_KEYS.KEYBOARD_DRAGGABLE,
    STORAGE_KEYS.KEYBOARD_POSITION,
    STORAGE_KEYS.AUTOSTART,
    STORAGE_KEYS.STICKY_SHIFT,
    STORAGE_KEYS.AUTO_CAPS,
    STORAGE_KEYS.VOICE_ENABLED,
    STORAGE_KEYS.VOICE_MODEL,
    STORAGE_KEYS.VOICE_LANGUAGE,
    STORAGE_KEYS.KEY_REPEAT_ENABLED,
    STORAGE_KEYS.KEY_REPEAT_DELAY,
    STORAGE_KEYS.KEY_REPEAT_SPEED,
  ]);

  return {
    isFirstTime: !result[STORAGE_KEYS.OPENED_FIRST_TIME],
    layout: result[STORAGE_KEYS.KEYBOARD_LAYOUT] || "en",
    layoutsList: parseLayoutsList(result[STORAGE_KEYS.KEYBOARD_LAYOUTS_LIST]),
    showOpenButton: result[STORAGE_KEYS.SHOW_OPEN_BUTTON] !== false,
    showLanguageButton: result[STORAGE_KEYS.SHOW_LANGUAGE_BUTTON] === true,
    showSettingsButton: result[STORAGE_KEYS.SHOW_SETTINGS_BUTTON] !== false,
    showUrlButton: result[STORAGE_KEYS.SHOW_URL_BUTTON] !== false,
    showCloseButton: result[STORAGE_KEYS.SHOW_CLOSE_BUTTON] !== false,
    showNumbersButton: result[STORAGE_KEYS.SHOW_NUMBERS_BUTTON] !== false,
    showNumberBar: result[STORAGE_KEYS.SHOW_NUMBER_BAR] !== false,
    keyboardZoomWidth: result[STORAGE_KEYS.KEYBOARD_ZOOM_WIDTH] || 100,
    keyboardZoomHeight: result[STORAGE_KEYS.KEYBOARD_ZOOM_HEIGHT] || 100,
    keyboardZoomLocked: result[STORAGE_KEYS.KEYBOARD_ZOOM_LOCKED] !== false,
    spacebarCursorSwipe: result[STORAGE_KEYS.SPACEBAR_CURSOR_SWIPE] === true,
    keyboardDraggable: result[STORAGE_KEYS.KEYBOARD_DRAGGABLE] === true,
    keyboardPosition: result[STORAGE_KEYS.KEYBOARD_POSITION] || null,
    autostart: result[STORAGE_KEYS.AUTOSTART] === true,
    stickyShift: result[STORAGE_KEYS.STICKY_SHIFT] === true,
    autoCaps: result[STORAGE_KEYS.AUTO_CAPS] === true,
    voiceEnabled: result[STORAGE_KEYS.VOICE_ENABLED] === true,
    voiceModel: result[STORAGE_KEYS.VOICE_MODEL] || "base-q8",
    voiceLanguage: result[STORAGE_KEYS.VOICE_LANGUAGE] || "multilingual",
    keyRepeatEnabled: result[STORAGE_KEYS.KEY_REPEAT_ENABLED] === true,
    keyRepeatDelay: result[STORAGE_KEYS.KEY_REPEAT_DELAY] || 400,
    keyRepeatSpeed: result[STORAGE_KEYS.KEY_REPEAT_SPEED] || 75,
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
    [STORAGE_KEYS.SHOW_OPEN_BUTTON]: false,
    [STORAGE_KEYS.SHOW_LANGUAGE_BUTTON]: false,
    [STORAGE_KEYS.SHOW_SETTINGS_BUTTON]: true,
    [STORAGE_KEYS.SHOW_URL_BUTTON]: true,
    [STORAGE_KEYS.SHOW_CLOSE_BUTTON]: true,
    [STORAGE_KEYS.SHOW_NUMBERS_BUTTON]: true,
    [STORAGE_KEYS.SHOW_NUMBER_BAR]: true,
    [STORAGE_KEYS.KEYBOARD_ZOOM_WIDTH]: 100,
    [STORAGE_KEYS.KEYBOARD_ZOOM_HEIGHT]: 100,
    [STORAGE_KEYS.KEYBOARD_ZOOM_LOCKED]: true,
    [STORAGE_KEYS.SPACEBAR_CURSOR_SWIPE]: false,
    [STORAGE_KEYS.KEYBOARD_DRAGGABLE]: false,
    [STORAGE_KEYS.KEYBOARD_POSITION]: null,
    [STORAGE_KEYS.AUTOSTART]: false,
    [STORAGE_KEYS.STICKY_SHIFT]: false,
    [STORAGE_KEYS.AUTO_CAPS]: false,
    [STORAGE_KEYS.VOICE_ENABLED]: false,
    [STORAGE_KEYS.VOICE_MODEL]: "base-q8",
    [STORAGE_KEYS.VOICE_LANGUAGE]: "multilingual",
    [STORAGE_KEYS.KEY_REPEAT_ENABLED]: false,
    [STORAGE_KEYS.KEY_REPEAT_DELAY]: 400,
    [STORAGE_KEYS.KEY_REPEAT_SPEED]: 75,
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
  getShowUrlButton,
  setShowUrlButton,
  getShowCloseButton,
  setShowCloseButton,
  getShowNumbersButton,
  setShowNumbersButton,
  getShowNumberBar,
  setShowNumberBar,
  getKeyboardZoomWidth,
  setKeyboardZoomWidth,
  getKeyboardZoomHeight,
  setKeyboardZoomHeight,
  getKeyboardZoomLocked,
  setKeyboardZoomLocked,
  getSpacebarCursorSwipe,
  setSpacebarCursorSwipe,
  getKeyboardDraggable,
  setKeyboardDraggable,
  getKeyboardPosition,
  setKeyboardPosition,
  getAutostart,
  setAutostart,
  getStickyShift,
  setStickyShift,
  getAutoCaps,
  setAutoCaps,
  getVoiceEnabled,
  setVoiceEnabled,
  getVoiceModel,
  setVoiceModel,
  getVoiceLanguage,
  setVoiceLanguage,
  isFirstTime,
  markOpened,
  loadAllSettings,
  initializeDefaults,
};
