// Layout Renderer
// Renders keyboard layouts as DOM elements (not HTML strings)

import { CSS_CLASSES, DEFAULT_BOTTOM_ROW, KEY_TYPES } from "../core/config.js";
import { getLayoutsList, layouts } from "./layouts.js";

/**
 * Render a complete keyboard layout
 * @param {string} layoutId - Layout identifier (e.g., 'en', 'fr')
 * @param {Object} options - Render options
 * @param {boolean} options.showLanguageButton - Whether to show the language button
 * @param {boolean} options.showSettingsButton - Whether to show the settings button
 * @param {boolean} options.showUrlButton - Whether to show the URL button
 * @param {boolean} options.showCloseButton - Whether to show the close button
 * @param {boolean} options.showNumbersButton - Whether to show the &123 numbers toggle button
 * @param {boolean} options.showVoiceButton - Whether to show the voice input button
 * @returns {DocumentFragment} DOM fragment containing the keyboard
 */
export function renderLayout(layoutId, options = {}) {
  const layout = layouts[layoutId];
  if (!layout) {
    console.error(`Layout not found: ${layoutId}`);
    return document.createDocumentFragment();
  }

  const {
    showLanguageButton = true,
    showSettingsButton = true,
    showUrlButton = true,
    showCloseButton = true,
    showNumbersButton = true,
    showVoiceButton = false, // Voice is opt-in
  } = options;

  const fragment = document.createDocumentFragment();
  const labels = layout.labels || {};

  // Render overlays first
  if (layout.overlays) {
    for (const [overlayId, items] of Object.entries(layout.overlays)) {
      fragment.appendChild(renderOverlay(overlayId, items));
    }
  }

  // Render main keyboard rows
  for (const row of layout.rows) {
    fragment.appendChild(renderRow(row, labels));
  }

  // Render bottom row, optionally filtering out buttons
  let bottomRow = layout.bottomRow || [...DEFAULT_BOTTOM_ROW];
  if (!showLanguageButton) {
    bottomRow = bottomRow.filter((key) => key !== "Language");
  }
  if (!showSettingsButton) {
    bottomRow = bottomRow.filter((key) => key !== "Settings");
  }
  if (!showUrlButton) {
    bottomRow = bottomRow.filter((key) => key !== "Url");
  }
  if (!showCloseButton) {
    bottomRow = bottomRow.filter((key) => key !== "Close");
  }
  if (!showNumbersButton) {
    bottomRow = bottomRow.filter((key) => key !== "&123");
  }
  if (!showVoiceButton) {
    bottomRow = bottomRow.filter((key) => key !== "Voice");
  }
  const hiddenButtonCount =
    (!showLanguageButton ? 1 : 0) +
    (!showSettingsButton ? 1 : 0) +
    (!showUrlButton ? 1 : 0) +
    (!showCloseButton ? 1 : 0) +
    (!showNumbersButton ? 1 : 0) +
    (!showVoiceButton ? 1 : 0);
  fragment.appendChild(
    renderRow(bottomRow, labels, { widenSpace: hiddenButtonCount > 0 })
  );

  return fragment;
}

/**
 * Render a single keyboard row
 * @param {Array} keys - Array of key definitions
 * @param {Object} labels - Custom label overrides
 * @param {Object} options - Row options
 * @param {boolean} options.widenSpace - Whether to make spacebar wider
 * @returns {HTMLElement} Row element
 */
function renderRow(keys, labels = {}, options = {}) {
  const row = document.createElement("div");
  row.className = "vk-row";

  for (const keyDef of keys) {
    const keyElements = renderKey(keyDef, labels, options);
    for (const el of keyElements) {
      row.appendChild(el);
    }
  }

  return row;
}

/**
 * Render a single key (may return multiple elements for email toggle keys)
 * @param {string|Object} keyDef - Key definition
 * @param {Object} labels - Custom label overrides
 * @param {Object} options - Key options
 * @returns {HTMLElement[]} Array of key elements
 */
function renderKey(keyDef, labels = {}, options = {}) {
  // Handle email toggle syntax: "?|@"
  if (typeof keyDef === "string" && keyDef.includes("|")) {
    const [normalKey, emailKey] = keyDef.split("|");
    return [
      createRegularKey(normalKey, { extraClass: CSS_CLASSES.HIDE_EMAIL_INPUT }),
      createRegularKey(emailKey, {
        extraClass: CSS_CLASSES.EMAIL_INPUT,
        hidden: true,
      }),
    ];
  }

  // Handle special keys
  const keyName = typeof keyDef === "string" ? keyDef : keyDef.key;
  if (KEY_TYPES[keyName]) {
    return [createSpecialKey(keyName, labels, options)];
  }

  // Regular key
  return [createRegularKey(keyDef)];
}

/**
 * Create a special key element (Backspace, Enter, Shift, etc.)
 * @param {string} keyName - Special key name
 * @param {Object} labels - Custom label overrides
 * @param {Object} options - Key options
 * @returns {HTMLElement}
 */
function createSpecialKey(keyName, labels = {}, options = {}) {
  const keyType = KEY_TYPES[keyName];
  const key = document.createElement("button");
  key.type = "button";
  key.className = keyType.class;

  // Add wider class to spacebar if language button is hidden
  if (keyName === "Space" && options.widenSpace) {
    key.classList.add("vk-key-space-wide");
  }

  // Add click class unless explicitly disabled
  if (!keyType.noClick) {
    key.classList.add(CSS_CLASSES.KEY_CLICK);
  }

  // Set data-key attribute
  if (!keyType.noDataKey) {
    key.dataset.key = keyType.dataKey || keyName;
  }

  // Apply custom attributes
  if (keyType.attrs) {
    for (const [attr, value] of Object.entries(keyType.attrs)) {
      if (attr === "id") {
        key.id = value;
      } else {
        key.setAttribute(attr, value);
      }
    }
  }

  // Create content span
  const span = document.createElement("span");

  if (keyType.icon) {
    span.className = `vk-icon vk-icon-${keyType.icon}`;
    span.setAttribute("aria-label", keyName);
  } else {
    // Use custom label or default (check for undefined to allow empty labels)
    const label =
      labels[keyName] !== undefined
        ? labels[keyName]
        : keyType.label !== undefined
          ? keyType.label
          : keyName;
    span.textContent = label;
  }

  key.appendChild(span);
  return key;
}

/**
 * Create a regular character key
 * @param {string|Object} keyDef - Key definition
 * @param {Object} options - Additional options
 * @returns {HTMLElement}
 */
function createRegularKey(keyDef, options = {}) {
  const key = document.createElement("button");
  key.type = "button";

  // Parse key definition
  let char, shiftChar, menuId, displayShift;

  if (typeof keyDef === "string") {
    char = keyDef;
  } else {
    char = keyDef.key;
    shiftChar = keyDef.shift;
    menuId = keyDef.menu;
    displayShift = keyDef.display;
  }

  // Build class list
  const classes = ["vk-key", CSS_CLASSES.KEY_CLICK];

  // Add case class for auto-shift (unless explicitly disabled)
  if (!options.noCase) {
    classes.push("vk-key-case");
  }

  // Add menu class if has overlay
  if (menuId) {
    classes.push(CSS_CLASSES.MENU);
  }

  // Add case display class if should show shift on key face
  if (displayShift) {
    classes.push(CSS_CLASSES.KEY_CASE_DISPLAY);
  }

  // Add extra class if provided
  if (options.extraClass) {
    classes.push(options.extraClass);
  }

  key.className = classes.join(" ");

  // Set data attributes
  key.dataset.key = char;

  if (shiftChar) {
    key.dataset.keyShift = shiftChar;
  }

  if (menuId) {
    key.dataset.menu = menuId;
    key.dataset.hoverOnly = "true";
  }

  // Hide if specified
  if (options.hidden) {
    key.style.display = "none";
  }

  // Create content span
  const span = document.createElement("span");
  span.textContent = char;
  key.appendChild(span);

  return key;
}

/**
 * Render an overlay menu
 * @param {string} overlayId - Overlay identifier
 * @param {Array} items - Array of overlay item definitions
 * @returns {HTMLElement}
 */
function renderOverlay(overlayId, items) {
  const overlay = document.createElement("div");
  overlay.id = `vk-overlay-${overlayId}`;
  overlay.className = CSS_CLASSES.OVERLAY;
  overlay.dataset.state = "closed";
  overlay.style.display = "none";

  const ul = document.createElement("ul");
  ul.className = "vk-overlay-keys";

  for (const itemDef of items) {
    ul.appendChild(renderOverlayItem(itemDef));
  }

  overlay.appendChild(ul);
  return overlay;
}

/**
 * Render a single overlay item
 * @param {string|Object} itemDef - Item definition
 * @returns {HTMLElement}
 */
function renderOverlayItem(itemDef) {
  const li = document.createElement("li");
  li.className = CSS_CLASSES.OVERLAY_BUTTON;

  // Parse item definition
  let char, shiftChar, displayShift;

  if (typeof itemDef === "string") {
    char = itemDef;
  } else {
    char = itemDef.key;
    shiftChar = itemDef.shift;
    displayShift = itemDef.display;
  }

  // Add case class for auto-shift
  li.classList.add("vk-key-case");

  // Add case display class if needed
  if (displayShift) {
    li.classList.add(CSS_CLASSES.KEY_CASE_DISPLAY);
  }

  // Set data attributes
  li.dataset.action = "key";
  li.dataset.key = char;

  if (shiftChar) {
    li.dataset.keyShift = shiftChar;
  }

  li.textContent = char;
  return li;
}

/**
 * Get available layouts list
 * @returns {Array<{value: string, name: string}>}
 */
export { getLayoutsList };

export default {
  renderLayout,
  getLayoutsList,
};
