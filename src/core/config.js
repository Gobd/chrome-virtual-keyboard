// Virtual Keyboard Configuration
// All constants and configuration values in one place

export const DOM_IDS = {
  KEYBOARD: "virtual-keyboard",
  KEYBOARD_HOST: "virtual-keyboard-host",
  MAIN_KBD: "vk-main-kbd",
  MAIN_KBD_PLACEHOLDER: "vk-main-kbd-ph",
  MAIN_NUMBERS: "vk-main-numbers",
  NUMBER_BAR_INPUT: "vk-number-bar-input",
  SCROLL_EXTEND: "vk-scroll-extend",
  OVERLAY_LANGUAGE: "vk-overlay-language",
  OVERLAY_LANGUAGE_UL: "vk-overlay-language-ul",
  URL_BAR: "vk-url-bar",
  URL_BAR_TEXTBOX: "vk-url-bar-textbox",
  SETTINGS_BUTTON: "vk-settings-btn",
  LANGUAGE_BUTTON: "vk-lang-btn",
  URL_BUTTON: "vk-url-btn",
  OPEN_BUTTON: "vk-open-btn",
};

export const CSS_CLASSES = {
  OVERLAY: "vk-overlay",
  OVERLAY_BUTTON: "vk-overlay-btn",
  KEY_CLICK: "vk-key",
  KEY_CASE_DISPLAY: "vk-key-case",
  MENU: "vk-menu",
  EMAIL_INPUT: "vk-email-key",
  HIDE_EMAIL_INPUT: "vk-hide-email-key",
  NUMBER_KEY: "vk-number-key",
  SHIFT_ACTIVE: "shift-active",
  KEYBOARD_OPEN: "keyboard-open",
  KEYBOARD_CLOSED: "keyboard-closed",
};

export const TIMING = {
  OVERLAY_CLOSE_DELAY: 500,
  CLOSE_TIMER_DELAY: 500,
  URL_CLOSE_DELAY: 1000,
  KEYBOARD_HIDE_DELAY: 500,
  URL_BAR_HIGHLIGHT_DELAY: 500,
  URL_BAR_FOCUS_DELAY: 200,
  ANIMATION_DURATION: 400,
};

export const KEYBOARD = {
  HEIGHT: 450,
  Z_INDEX: 10000000,
  OVERLAY_Z_INDEX: 10000001,
  DEFAULT_ZOOM: 100,
  MIN_ZOOM: 25,
  MAX_ZOOM: 150,
};

export const INPUT_TYPES = [
  "text",
  "password",
  "search",
  "email",
  "number",
  "tel",
  "url",
];

export const SPECIAL_KEYS = {
  EMPTY: "empty",
  URL: "Url",
  SETTINGS: "Settings",
  OPEN_SETTINGS: "OpenSettings",
  NUMBERS: "&123",
  CLOSE: "Close",
  ENTER: "Enter",
  SHIFT: "Shift",
  BACKSPACE: "Backspace",
  SPACE: "Space",
};

export const STORAGE_KEYS = {
  OPENED_FIRST_TIME: "openedFirstTime",
  KEYBOARD_LAYOUT: "keyboardLayout1",
  KEYBOARD_LAYOUTS_LIST: "keyboardLayoutsList",
  SHOW_OPEN_BUTTON: "showOpenButton",
  KEYBOARD_ZOOM: "keyboardZoom",
  SPACEBAR_CURSOR_SWIPE: "spacebarCursorSwipe",
  KEYBOARD_DRAGGABLE: "keyboardDraggable",
  KEYBOARD_POSITION: "keyboardPosition",
};

export const MESSAGE_TYPES = {
  OPEN_FROM_IFRAME: "openFromIframe",
  CLICK_FROM_IFRAME: "clickFromIframe",
  OPEN_FROM_BUTTON: "openFromButton",
  OPEN_URL_BAR: "openUrlBar",
  KEYBOARD_STATE_CHANGE: "keyboardStateChange",
};

// Key type definitions for layout renderer
export const KEY_TYPES = {
  Backspace: {
    class: "vk-key vk-key-backspace",
    icon: "backspace",
  },
  BackspaceSmall: {
    class: "vk-key vk-key-backspace-sm",
    icon: "backspace",
  },
  Enter: {
    class: "vk-key vk-key-enter",
    icon: "enter",
  },
  EnterBottom: {
    class: "vk-key vk-key-action",
    icon: "enter",
  },
  Shift: {
    class: "vk-key vk-key-shift",
    icon: "shift",
  },
  Space: {
    class: "vk-key vk-key-space",
    dataKey: " ",
  },
  Close: {
    class: "vk-key vk-key-action",
    icon: "close",
  },
  "&123": {
    class: "vk-key vk-key-action",
    label: "&123",
  },
  Settings: {
    class: "vk-key vk-key-action",
    icon: "settings",
    attrs: { id: DOM_IDS.SETTINGS_BUTTON },
    dataKey: "OpenSettings",
  },
  Language: {
    class: "vk-key-action vk-menu vk-lang-btn",
    label: "EN",
    attrs: { id: DOM_IDS.LANGUAGE_BUTTON, "data-menu": "Language" },
    noDataKey: true,
    noClick: true,
  },
  Url: {
    class: "vk-key vk-key-action",
    label: "URL",
    attrs: { id: DOM_IDS.URL_BUTTON },
    dataKey: "Url",
  },
  _spacer: {
    class: "vk-spacer",
    noDataKey: true,
    noClick: true,
  },
};

export const DEFAULT_BOTTOM_ROW = [
  "&123",
  "Language",
  "Space",
  "Url",
  "Settings",
  "Close",
];
