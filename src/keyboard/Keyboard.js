// Keyboard
// Main keyboard UI class - rendering, show/hide, event delegation

import { CSS_CLASSES, DOM_IDS, TIMING } from "../core/config.js";
import { EVENTS, emit, on } from "../core/events.js";
import {
  focusState,
  keyboardState,
  runtimeState,
  settingsState,
  urlBarState,
} from "../core/state.js";
import storage from "../core/storage.js";
import {
  addBodyPadding,
  clearCloseTimer,
  removeBodyPadding,
  restoreScrollPosition,
  saveInputType,
  saveScrollPosition,
  scrollInputIntoView,
} from "../input/InputTracker.js";
import { renderLayout } from "../layouts/LayoutRenderer.js";
import { handleKeyPress } from "./KeyHandler.js";
import { getKeyWithShift } from "./KeyMap.js";

let keyboardElement = null;
let shadowRoot = null;
let scrollExtendElement = null;
let overlayCloseTimeout = null;
let dragHandleElement = null;

// Spacebar swipe state
let spacebarSwipeState = {
  active: false,
  startX: 0,
  lastX: 0,
  spaceKey: null,
};

// Keyboard drag state
let dragState = {
  active: false,
  startX: 0,
  startY: 0,
  startLeft: 0,
  startBottom: 0,
};

const SWIPE_THRESHOLD = 10; // Pixels to move before considering it a swipe

// Track if key min-width has been calculated
let keyMinWidthCalculated = false;
const SWIPE_SENSITIVITY = 20; // Pixels of swipe per cursor position change

// Cached DOM element references
const cachedElements = {
  mainKbd: null,
  numbersKbd: null,
  numberInput: null,
  urlBar: null,
  urlBarTextbox: null,
  placeholder: null,
  // Layout-dependent elements (cleared when layout changes)
  urlButton: null,
  langButton: null,
  shiftKeys: null,
  emailKeys: null,
  hideEmailKeys: null,
};

/**
 * Get cached DOM elements, populating cache on first access
 * @returns {typeof cachedElements}
 */
function getCachedElements() {
  // Cache static elements (created in buildKeyboardStructure)
  if (!cachedElements.mainKbd && shadowRoot) {
    cachedElements.mainKbd = shadowRoot.getElementById(DOM_IDS.MAIN_KBD);
    cachedElements.numberInput = shadowRoot.getElementById(
      DOM_IDS.NUMBER_BAR_INPUT
    );
    cachedElements.urlBar = shadowRoot.getElementById(DOM_IDS.URL_BAR);
    cachedElements.urlBarTextbox = shadowRoot.getElementById(
      DOM_IDS.URL_BAR_TEXTBOX
    );
    cachedElements.placeholder = shadowRoot.getElementById(
      DOM_IDS.MAIN_KBD_PLACEHOLDER
    );
  }
  // Cache numbersKbd separately (can be recreated by reloadKeyboard)
  if (!cachedElements.numbersKbd && shadowRoot) {
    cachedElements.numbersKbd = shadowRoot.getElementById(DOM_IDS.MAIN_NUMBERS);
  }
  // Cache layout-dependent elements separately (created in loadLayout)
  if (!cachedElements.urlButton && shadowRoot) {
    cachedElements.urlButton = shadowRoot.getElementById(DOM_IDS.URL_BUTTON);
  }
  if (!cachedElements.langButton && shadowRoot) {
    cachedElements.langButton = shadowRoot.getElementById(
      DOM_IDS.LANGUAGE_BUTTON
    );
  }
  return cachedElements;
}

/**
 * Clear layout-specific cached elements (called when layout changes)
 */
function clearLayoutCache() {
  cachedElements.urlButton = null;
  cachedElements.langButton = null;
  cachedElements.shiftKeys = null;
  cachedElements.emailKeys = null;
  cachedElements.hideEmailKeys = null;
}

/**
 * Get cached shift key elements, populating cache on first access
 * @returns {NodeList}
 */
function getCachedShiftKeys() {
  return (
    getOrCache("shiftKeys", () =>
      shadowRoot.querySelectorAll(`.${CSS_CLASSES.KEY_CASE_DISPLAY}`)
    ) || []
  );
}

/**
 * Generic cache helper - get or populate cache on first access
 * @param {string} key - Cache key
 * @param {Function} queryFn - Function to get value if not cached
 * @returns {*} Cached value
 */
function getOrCache(key, queryFn) {
  if (!cachedElements[key] && shadowRoot) {
    cachedElements[key] = queryFn();
  }
  return (
    cachedElements[key] || (Array.isArray(cachedElements[key]) ? [] : null)
  );
}

/**
 * Get cached email key elements, populating cache on first access
 * @returns {{emailKeys: NodeList, hideEmailKeys: NodeList}}
 */
function getCachedEmailKeys() {
  return {
    emailKeys: getOrCache("emailKeys", () =>
      shadowRoot.querySelectorAll(`.${CSS_CLASSES.EMAIL_INPUT}`)
    ),
    hideEmailKeys: getOrCache("hideEmailKeys", () =>
      shadowRoot.querySelectorAll(`.${CSS_CLASSES.HIDE_EMAIL_INPUT}`)
    ),
  };
}

/**
 * Set URL bar open/closed state (single source of truth)
 * @param {boolean} isOpen - Whether URL bar should be open
 * @param {boolean} clearInput - Whether to clear the input value
 */
function setUrlBarOpen(isOpen, clearInput = false) {
  const { urlBar, urlBarTextbox } = getCachedElements();
  if (!urlBar) return;

  urlBar.dataset.open = String(isOpen);
  urlBar.style.display = isOpen ? "" : "none";
  urlBarState.set("open", isOpen);
  setUrlButtonMode(isOpen);

  if (clearInput && urlBarTextbox) {
    urlBarTextbox.value = "";
  }
}

/**
 * Initialize the keyboard
 * Creates the shadow DOM host and loads the keyboard HTML
 */
export async function init() {
  // Create shadow DOM host
  const host = document.createElement("div");
  host.id = DOM_IDS.KEYBOARD_HOST;

  // Use closed shadow DOM for style encapsulation (open for testing)
  // __SHADOW_MODE__ is replaced at build time by esbuild
  const shadowMode =
    typeof __SHADOW_MODE__ !== "undefined" ? __SHADOW_MODE__ : "closed";
  shadowRoot = host.attachShadow({ mode: shadowMode });

  // Create keyboard container - hidden until CSS loads
  keyboardElement = document.createElement("div");
  keyboardElement.id = DOM_IDS.KEYBOARD;
  keyboardElement.className = CSS_CLASSES.KEYBOARD_CLOSED;
  keyboardElement.dataset.state = "closed";
  keyboardElement.style.display = "none"; // Hide completely until CSS ready
  shadowRoot.appendChild(keyboardElement);

  // Create scroll extend element
  scrollExtendElement = document.createElement("div");
  scrollExtendElement.id = DOM_IDS.SCROLL_EXTEND;
  scrollExtendElement.style.display = "none";
  shadowRoot.appendChild(scrollExtendElement);

  // Add host to document FIRST (so stylesheet can load)
  document.body.appendChild(host);

  // Now load styles - onload will fire since we're in the document
  const styleLink = document.createElement("link");
  styleLink.rel = "stylesheet";
  styleLink.href = chrome.runtime.getURL("style.css");

  const styleLoaded = new Promise((resolve) => {
    styleLink.onload = () => resolve("loaded");
    styleLink.onerror = () => resolve("error");
    setTimeout(() => resolve("timeout"), 500); // Short fallback
  });
  shadowRoot.appendChild(styleLink);

  // Build keyboard structure while CSS loads
  await buildKeyboardStructure();

  // Set up event delegation
  setupEventDelegation();

  // Set up spacebar swipe for cursor movement
  setupSpacebarSwipe();

  // Track pointer over keyboard for URL bar blur handling
  keyboardElement.addEventListener("pointerenter", () => {
    runtimeState.set("pointerOverKeyboard", true);
  });
  keyboardElement.addEventListener("pointerleave", () => {
    runtimeState.set("pointerOverKeyboard", false);
  });

  // Wait for stylesheet to load
  await styleLoaded;

  // Now show keyboard (CSS is ready, keyboard starts in closed/hidden state)
  keyboardElement.style.display = "";

  runtimeState.set("keyboardElement", keyboardElement);

  // Subscribe to state changes
  setupStateSubscriptions();

  // Subscribe to events
  setupEventListeners();

  // Apply zoom setting
  applyZoom();

  // Apply drag handle visibility and position
  updateDragHandleVisibility();
  const savedPosition = settingsState.get("keyboardPosition");
  if (savedPosition && settingsState.get("keyboardDraggable") && savedPosition.left !== undefined) {
    applyKeyboardPositionCSS(savedPosition.left, savedPosition.bottom);
  }

  // Apply number bar visibility
  updateNumberBarVisibility();
}

/**
 * Build the internal keyboard structure
 */
async function buildKeyboardStructure() {
  // Create drag handle for repositioning
  const dragHandle = createDragHandle();
  keyboardElement.appendChild(dragHandle);

  // Create URL bar
  const urlBar = createUrlBar();
  keyboardElement.appendChild(urlBar);

  // Create language overlay (for switching keyboard layouts)
  const languageOverlay = await createLanguageOverlay();
  keyboardElement.appendChild(languageOverlay);

  // Create number input keyboard
  const numberInput = createNumberInputKeyboard();
  keyboardElement.appendChild(numberInput);

  // Create main keyboard container
  const mainKbd = document.createElement("div");
  mainKbd.id = DOM_IDS.MAIN_KBD;
  keyboardElement.appendChild(mainKbd);

  // Create number bar (top row of numbers)
  const numberBar = createNumberBar();
  mainKbd.appendChild(numberBar);

  // Create layout placeholder
  const placeholder = document.createElement("div");
  placeholder.id = DOM_IDS.MAIN_KBD_PLACEHOLDER;
  mainKbd.appendChild(placeholder);

  // Create numbers/symbols keyboard
  const numbersKbd = createNumbersKeyboard();
  keyboardElement.appendChild(numbersKbd);
}

/**
 * Create the URL bar element
 */
function createUrlBar() {
  const urlBar = document.createElement("div");
  urlBar.id = DOM_IDS.URL_BAR;
  urlBar.dataset.open = "false";
  urlBar.style.display = "none"; // Hidden until URL button clicked

  const form = document.createElement("form");
  form.onsubmit = (e) => {
    e.preventDefault();
    const input = shadowRoot.getElementById(DOM_IDS.URL_BAR_TEXTBOX);
    let url = input.value;
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = `https://${url}`;
    }
    window.location.href = url;
  };

  const input = document.createElement("input");
  input.type = "text";
  input.id = DOM_IDS.URL_BAR_TEXTBOX;
  input.placeholder = "https://";

  // URL bar focus/blur handling
  let refocusing = false;
  let urlBarCloseTimeout = null;

  input.onblur = (event) => {
    if (refocusing) return;

    const relatedTarget = event.relatedTarget;
    const focusInKeyboard =
      relatedTarget && keyboardElement.contains(relatedTarget);

    if (focusInKeyboard || runtimeState.get("pointerOverKeyboard")) {
      refocusing = true;
      setTimeout(() => {
        input.focus();
        refocusing = false;
      }, 0);
      return;
    }

    // Delay URL bar close to allow click handlers to process first
    // This fixes the .com button not working on touch devices
    if (urlBarCloseTimeout) clearTimeout(urlBarCloseTimeout);
    urlBarCloseTimeout = setTimeout(() => {
      // Only close if still blurred (not refocused)
      if (document.activeElement !== input && !refocusing) {
        // Use local urlBar reference (closure) since cache may not be populated yet
        urlBar.dataset.open = "false";
        urlBar.style.display = "none";
        urlBarState.set("open", false);
        setUrlButtonMode(false);
        input.value = "";

        focusState.set("element", null);
        runtimeState.set(
          "closeTimer",
          setTimeout(() => {
            emit(EVENTS.KEYBOARD_CLOSE);
          }, TIMING.URL_CLOSE_DELAY)
        );
      }
      urlBarCloseTimeout = null;
    }, 50);
  };

  input.onfocus = (event) => {
    clearCloseTimer();
    focusState.set({
      type: "input",
      element: input,
    });
    // Use local urlBar reference (closure) since cache may not be populated yet
    urlBar.dataset.open = "true";
    urlBar.style.display = "";
    urlBarState.set("open", true);
    setUrlButtonMode(true);

    if (!keyboardState.get("open")) {
      open();
      input.focus();
      setTimeout(() => {
        const urlBtn = shadowRoot.getElementById(DOM_IDS.URL_BUTTON);
        if (urlBtn) urlBtn.dataset.highlight = "true";
      }, TIMING.URL_BAR_HIGHLIGHT_DELAY);
    }

    event.preventDefault();
  };

  input.onclick = () => {
    if (!keyboardState.get("open")) {
      open();
    }
  };

  const submit = document.createElement("input");
  submit.type = "submit";
  submit.value = "Go";

  form.appendChild(input);
  form.appendChild(submit);
  urlBar.appendChild(form);

  return urlBar;
}

/**
 * Create the language overlay (for switching keyboard layouts)
 */
async function createLanguageOverlay() {
  const overlay = document.createElement("div");
  overlay.id = DOM_IDS.OVERLAY_LANGUAGE;
  overlay.className = CSS_CLASSES.OVERLAY;
  overlay.dataset.state = "closed";
  overlay.style.display = "none";

  const ul = document.createElement("ul");
  ul.id = DOM_IDS.OVERLAY_LANGUAGE_UL;
  ul.className = "vk-overlay-keys";

  // Populate with layouts from storage
  const layouts = await storage.getLayoutsList();
  for (const layout of layouts) {
    const li = document.createElement("li");
    li.className = CSS_CLASSES.OVERLAY_BUTTON;
    li.textContent = layout.value.toUpperCase();
    li.dataset.action = "setKeyboard";
    li.dataset.layout = layout.value;
    ul.appendChild(li);
  }

  overlay.appendChild(ul);
  return overlay;
}

/**
 * Special key configurations for button creation
 */
const SPECIAL_KEY_CONFIG = {
  Backspace: { className: "vk-key-backspace", icon: "vk-icon-backspace" },
  Enter: { className: "vk-key-enter", icon: "vk-icon-enter" },
  "&123": { className: "vk-key-action", text: "ABC" },
  Close: { className: "vk-key-action", icon: "vk-icon-close" },
};

/**
 * Create a keyboard button element
 * @param {string} key - Key value
 * @param {string} [extraClass] - Extra CSS class to add
 * @returns {HTMLButtonElement}
 */
function createKeyButton(key, extraClass = "") {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.dataset.key = key;

  const config = SPECIAL_KEY_CONFIG[key];
  if (config) {
    btn.className = `vk-key ${config.className} ${CSS_CLASSES.KEY_CLICK}`;
    const span = document.createElement("span");
    if (config.icon) {
      span.className = `vk-icon ${config.icon}`;
    } else if (config.text) {
      span.textContent = config.text;
    }
    btn.appendChild(span);
  } else {
    btn.className = `vk-key ${extraClass} ${CSS_CLASSES.KEY_CLICK}`.trim();
    const span = document.createElement("span");
    span.textContent = key === "Enter" ? "↵" : key;
    btn.appendChild(span);
  }

  return btn;
}

/**
 * Create a keyboard from rows of keys
 * @param {string} id - Container element ID
 * @param {string[][]} rows - Array of key rows
 * @param {string} [keyClass] - Extra class for regular keys
 * @returns {HTMLDivElement}
 */
function createKeyboardFromRows(id, rows, keyClass = "") {
  const container = document.createElement("div");
  container.id = id;
  container.style.display = "none";

  for (const row of rows) {
    const rowDiv = document.createElement("div");
    rowDiv.className = "vk-row";
    for (const key of row) {
      rowDiv.appendChild(createKeyButton(key, keyClass));
    }
    container.appendChild(rowDiv);
  }

  return container;
}

/**
 * Create the number input keyboard (for number/tel inputs)
 */
function createNumberInputKeyboard() {
  return createKeyboardFromRows(DOM_IDS.NUMBER_BAR_INPUT, [
    ["7", "8", "9", "#"],
    ["4", "5", "6", "-", ")"],
    ["1", "2", "3", "+", "("],
    ["0", ".", "*", "$", "Enter"],
  ]);
}

/**
 * Create the number bar (row of 0-9 at top)
 */
function createNumberBar() {
  const container = document.createElement("div");
  container.id = "vk-number-bar";
  container.className = "vk-row";

  for (const key of ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"]) {
    container.appendChild(createKeyButton(key, "vk-number-key"));
  }

  return container;
}

/**
 * Create the numbers/symbols keyboard
 */
function createNumbersKeyboard() {
  const showCloseButton = settingsState.get("showCloseButton");
  const showNumbersButton = settingsState.get("showNumbersButton");

  // Build rows, filtering out hidden buttons
  const rows = [
    ["_", "\\", ":", ";", ")", "(", "/", "^", "1", "2", "3", "Backspace"],
    ["€", "$", "£", "&", "@", '"', "*", "~", "4", "5", "6", "Enter"],
    [
      "?",
      "!",
      "'",
      "=",
      "<",
      ">",
      "-",
      "`",
      "7",
      "8",
      "9",
      showNumbersButton ? "&123" : null,
    ],
    [
      "[",
      "]",
      "{",
      "}",
      "#",
      ",",
      "+",
      "%",
      "0",
      "0",
      ".",
      showCloseButton ? "Close" : null,
    ],
  ].map((row) => row.filter((key) => key !== null));

  return createKeyboardFromRows(DOM_IDS.MAIN_NUMBERS, rows);
}

/**
 * Set up event delegation for keyboard clicks
 */
function setupEventDelegation() {
  // Single click handler for all keys
  keyboardElement.addEventListener("click", (e) => {
    const key = e.target.closest(`.${CSS_CLASSES.KEY_CLICK}`);
    if (key) {
      // Check if this is a spacebar click that should be prevented (due to swipe)
      if (
        key.classList.contains("vk-key-space") &&
        spacebarSwipeState.preventClick
      ) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      const keyValue = getKeyWithShift(key);
      handleKeyPress(keyValue);
    }

    // Handle menu buttons (toggle overlay on click)
    const menuBtn = e.target.closest(`.${CSS_CLASSES.MENU}`);
    if (menuBtn) {
      e.preventDefault();
      e.stopPropagation();
      const menuId = menuBtn.dataset.menu;
      toggleOverlay(menuId, menuBtn);
      return;
    }

    // Handle overlay buttons
    const overlayBtn = e.target.closest(`.${CSS_CLASSES.OVERLAY_BUTTON}`);
    if (overlayBtn) {
      handleOverlayClick(overlayBtn);
      closeAllOverlays();
      return;
    }

    // Click elsewhere on keyboard closes overlays
    closeAllOverlays();
  });

  // Prevent default on pointer events
  keyboardElement.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    e.stopPropagation();
  });

  // Close overlays when clicking outside keyboard
  // Also close keyboard if opened via open button (no focused input)
  document.addEventListener("click", (e) => {
    if (!keyboardElement.contains(e.target)) {
      closeAllOverlays();

      // If keyboard is open but no input is focused (opened via open button),
      // close the keyboard when clicking outside
      const focusedElement = focusState.get("element");
      if (keyboardState.get("open") && !focusedElement) {
        emit(EVENTS.KEYBOARD_CLOSE);
      }
    }
  });
}

/**
 * Handle overlay button click
 */
async function handleOverlayClick(btn) {
  const action = btn.dataset.action;

  if (action === "setKeyboard") {
    const layout = btn.dataset.layout;
    await storage.setLayout(layout);
    settingsState.set("layout", layout);
    await loadLayout(layout);

    const element = focusState.get("element");
    if (element) {
      element.focus();
    }
  } else if (action === "key") {
    const keyValue = getKeyWithShift(btn);
    handleKeyPress(keyValue);
  }
}

/**
 * Toggle an overlay menu
 */
function toggleOverlay(menuId, buttonElement) {
  const overlay =
    shadowRoot.getElementById(`vk-overlay-${menuId}`) ||
    shadowRoot.getElementById(DOM_IDS.OVERLAY_LANGUAGE);
  if (!overlay) return;

  const isOpen = overlay.dataset.state === "open";
  closeAllOverlays();

  if (!isOpen) {
    // Show this overlay temporarily to measure it
    overlay.style.display = "";
    overlay.style.visibility = "hidden";

    const zoomWidth = settingsState.get("keyboardZoomWidth") / 100 || 1;
    const zoomHeight = settingsState.get("keyboardZoomHeight") / 100 || 1;
    const overlayWidth = overlay.offsetWidth;
    const overlayHeight = overlay.offsetHeight;

    // Get button position relative to keyboard (in screen coords, already scaled)
    const buttonRect = buttonElement.getBoundingClientRect();
    const keyboardRect = keyboardElement.getBoundingClientRect();

    // Calculate position relative to keyboard element
    // Divide by scale since getBoundingClientRect returns scaled values
    // but CSS left/top will be scaled again
    const _buttonLeft = (buttonRect.left - keyboardRect.left) / zoomWidth;
    const buttonTop = (buttonRect.top - keyboardRect.top) / zoomHeight;
    const padding = 5;

    // Try positioning at left edge of keyboard first
    let left = padding;
    const top = buttonTop - overlayHeight - 10;

    // Check if overlay would overflow viewport on the right
    // Use scaled overlay width for screen coordinate comparison
    const overlayRightEdge =
      keyboardRect.left + left * zoomWidth + overlayWidth * zoomWidth;
    if (overlayRightEdge > window.innerWidth - padding) {
      // Position from right side instead
      left = keyboardRect.width / zoomWidth - overlayWidth - padding;
    }

    // Check if overlay would overflow viewport on the left
    const overlayLeftEdge = keyboardRect.left + left * zoomWidth;
    if (overlayLeftEdge < padding) {
      left = (padding - keyboardRect.left) / zoomWidth;
    }

    overlay.style.left = `${left}px`;
    overlay.style.top = `${top}px`;
    overlay.style.bottom = "";
    overlay.style.visibility = "";
    overlay.dataset.state = "open";
  }
}

/**
 * Close all overlay menus
 */
function closeAllOverlays() {
  const overlays = shadowRoot.querySelectorAll(`.${CSS_CLASSES.OVERLAY}`);
  for (const overlay of overlays) {
    overlay.dataset.state = "closed";
  }

  // Clear any existing timeout to prevent stale closures
  if (overlayCloseTimeout) {
    clearTimeout(overlayCloseTimeout);
  }

  // Store reference to avoid re-querying in timeout
  const overlaysList = Array.from(overlays);
  overlayCloseTimeout = setTimeout(() => {
    for (const overlay of overlaysList) {
      if (overlay.dataset.state === "closed") {
        overlay.style.display = "none";
      }
    }
    overlayCloseTimeout = null;
  }, TIMING.OVERLAY_CLOSE_DELAY);
}

/**
 * Set up state subscriptions
 */
function setupStateSubscriptions() {
  // Numbers mode toggle
  keyboardState.subscribe("numbersMode", (numbersMode) => {
    const { mainKbd, numbersKbd } = getCachedElements();
    if (mainKbd) mainKbd.style.display = numbersMode ? "none" : "";
    if (numbersKbd) numbersKbd.style.display = numbersMode ? "" : "none";
  });

  // Shift mode toggle
  keyboardState.subscribe("shift", (shift) => {
    const { mainKbd } = getCachedElements();
    if (mainKbd) {
      mainKbd.classList.toggle(CSS_CLASSES.SHIFT_ACTIVE, shift);
    }
    updateShiftKeys();
  });

  // Zoom setting changes
  settingsState.subscribe("keyboardZoomWidth", applyZoom);
  settingsState.subscribe("keyboardZoomHeight", applyZoom);

  // Keyboard draggable setting change
  settingsState.subscribe("keyboardDraggable", (draggable) => {
    updateDragHandleVisibility();
    if (!draggable) {
      resetKeyboardPosition(true); // Save to storage when disabling
    }
  });

  // Apply saved keyboard position
  settingsState.subscribe("keyboardPosition", (position) => {
    if (position && settingsState.get("keyboardDraggable")) {
      // Support both old format (x, y) and new format (left, bottom)
      if (position.left !== undefined) {
        applyKeyboardPositionCSS(position.left, position.bottom);
      }
    } else if (!position) {
      resetKeyboardPosition();
    }
  });
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
  on(EVENTS.KEYBOARD_OPEN, ({ force, posY: _posY, posX: _posX }) => {
    open(force);
  });

  on(EVENTS.KEYBOARD_CLOSE, close);

  on(EVENTS.URL_BAR_OPEN, () => {
    setUrlBarOpen(true);
    const { urlBarTextbox } = getCachedElements();
    if (urlBarTextbox) urlBarTextbox.focus();
  });
}

/**
 * Load a keyboard layout
 */
export async function loadLayout(layoutId) {
  const { placeholder } = getCachedElements();
  if (!placeholder) return;

  // Clear existing content
  placeholder.innerHTML = "";

  // Clear layout-specific cached elements (shift keys, email keys)
  clearLayoutCache();
  invalidateKeyboardHeightCache();

  // Render new layout with options
  const showLanguageButton = settingsState.get("showLanguageButton");
  const showSettingsButton = settingsState.get("showSettingsButton");
  const showUrlButton = settingsState.get("showUrlButton");
  const showCloseButton = settingsState.get("showCloseButton");
  const showNumbersButton = settingsState.get("showNumbersButton");
  const fragment = renderLayout(layoutId, {
    showLanguageButton,
    showSettingsButton,
    showUrlButton,
    showCloseButton,
    showNumbersButton,
  });
  placeholder.appendChild(fragment);

  keyboardState.set("loadedLayout", layoutId);

  // Update Language button label to show current layout
  updateLanguageButtonLabel(layoutId);

  // Update input type display
  renderInputType();
}

/**
 * Update the Language button label to show current layout code
 */
function updateLanguageButtonLabel(layoutId) {
  const { langButton } = getCachedElements();
  if (langButton) {
    const span = langButton.querySelector("span");
    if (span) {
      span.textContent = layoutId.toUpperCase();
    }
  }
}

/**
 * Calculate and apply min-width for keys based on the widest key in numbers keyboard.
 * This ensures all keys can fit multi-character labels like "ABC".
 */
function calculateKeyMinWidth() {
  if (keyMinWidthCalculated) return;

  const numbersKbd = shadowRoot?.getElementById(DOM_IDS.MAIN_NUMBERS);
  if (!numbersKbd) return;

  // Temporarily show numbers keyboard to measure
  const wasHidden = numbersKbd.style.display === "none";
  if (wasHidden) {
    numbersKbd.style.display = "";
    numbersKbd.style.visibility = "hidden";
    numbersKbd.style.position = "absolute";
  }

  // Find the widest key content in numbers keyboard
  const keys = numbersKbd.querySelectorAll(
    ".vk-key:not(.vk-key-backspace):not(.vk-key-enter)"
  );
  let maxWidth = 0;

  for (const key of keys) {
    const span = key.querySelector("span");
    if (span) {
      // Measure text width
      const width = span.scrollWidth;
      if (width > maxWidth) {
        maxWidth = width;
      }
    }
  }

  // Restore visibility
  if (wasHidden) {
    numbersKbd.style.display = "none";
    numbersKbd.style.visibility = "";
    numbersKbd.style.position = "";
  }

  // Apply min-width with some padding (add ~20% for breathing room)
  if (maxWidth > 0) {
    const minWidth = Math.ceil(maxWidth * 1.2);
    keyboardElement.style.setProperty("--vk-key-min-width", `${minWidth}px`);
    keyMinWidthCalculated = true;
  }
}

/**
 * Open the keyboard
 */
export async function open(force = false) {
  if (keyboardState.get("open") && !force) return;

  // Load layout if needed
  const currentLayout = settingsState.get("layout");
  if (keyboardState.get("loadedLayout") !== currentLayout) {
    await loadLayout(currentLayout);
  } else {
    // Layout already loaded, but still need to update for current input type
    renderInputType();
  }

  // Calculate key min-width from numbers keyboard (once)
  calculateKeyMinWidth();

  // Move to fullscreen element if present
  if (document.fullscreenElement) {
    document.fullscreenElement.appendChild(keyboardElement.parentElement);
  }

  clearCloseTimer();
  saveScrollPosition();

  // Add body padding
  const height = keyboardElement.offsetHeight;
  addBodyPadding(height);

  // Show keyboard
  keyboardState.set("open", true);
  keyboardElement.dataset.state = "open";
  keyboardElement.classList.remove(CSS_CLASSES.KEYBOARD_CLOSED);
  keyboardElement.classList.add(CSS_CLASSES.KEYBOARD_OPEN);

  // Update scroll extend element
  updateScrollExtend();

  // Scroll input into view
  requestAnimationFrame(() => {
    scrollInputIntoView(height);
  });

  // Hide open button
  emit(EVENTS.OPEN_BUTTON_HIDE);

  // Broadcast state to iframes
  broadcastKeyboardState(true);
}

/**
 * Close the keyboard
 */
export function close() {
  if (!keyboardState.get("open")) return;
  if (settingsState.get("autostart")) return; // Prevent closing in autostart mode

  keyboardState.set("open", false);
  keyboardElement.dataset.state = "closed";
  keyboardElement.classList.remove(CSS_CLASSES.KEYBOARD_OPEN);
  keyboardElement.classList.add(CSS_CLASSES.KEYBOARD_CLOSED);

  // Close URL bar if open
  if (urlBarState.get("open")) {
    setUrlBarOpen(false, true);
  }

  // Show open button
  emit(EVENTS.OPEN_BUTTON_SHOW);

  // Broadcast state to iframes
  broadcastKeyboardState(false);

  setTimeout(() => {
    if (!keyboardState.get("open")) {
      // Restore scroll position
      restoreScrollPosition();
      removeBodyPadding();

      // Hide scroll extend
      if (scrollExtendElement) {
        scrollExtendElement.style.display = "none";
      }
    }
  }, TIMING.KEYBOARD_HIDE_DELAY);
}

// Cached keyboard height to avoid repeated getComputedStyle calls
let cachedKeyboardHeight = null;

/**
 * Invalidate cached keyboard height (call when layout or zoom changes)
 */
function invalidateKeyboardHeightCache() {
  cachedKeyboardHeight = null;
}

/**
 * Get keyboard height with caching to avoid layout thrashing
 * @returns {number}
 */
function getKeyboardHeight() {
  if (cachedKeyboardHeight !== null) {
    return cachedKeyboardHeight;
  }

  if (!keyboardElement) return 0;

  const style = window.getComputedStyle(keyboardElement);
  const height =
    parseFloat(style.height) +
    parseFloat(style.paddingTop) +
    parseFloat(style.paddingBottom);
  // Use height zoom from settings (transform scale doesn't affect computed style)
  const zoomHeight = settingsState.get("keyboardZoomHeight") / 100;

  cachedKeyboardHeight = height * zoomHeight;
  return cachedKeyboardHeight;
}

/**
 * Update the scroll extend element height
 */
function updateScrollExtend() {
  if (!scrollExtendElement || !keyboardElement) return;

  scrollExtendElement.style.height = `${getKeyboardHeight()}px`;
  scrollExtendElement.style.display = "block";
}

/**
 * Set email-specific key visibility
 * @param {boolean} showEmailKeys - Whether to show email keys (@, .com) or hide them
 */
function setEmailKeysVisibility(showEmailKeys) {
  const { emailKeys, hideEmailKeys } = getCachedEmailKeys();

  for (const key of emailKeys) {
    // Use 'inline-flex' to override CSS 'display: none' rule
    key.style.display = showEmailKeys ? "inline-flex" : "none";
  }
  for (const key of hideEmailKeys) {
    key.style.display = showEmailKeys ? "none" : "inline-flex";
  }
}

/**
 * Render the appropriate keyboard for the input type
 */
function renderInputType() {
  const element = focusState.get("element");
  const type = focusState.get("type");
  if (!element) return;

  // Save original input type
  if (type === "input") {
    saveInputType(element);
    // Convert to text for display (except password)
    // Preserve cursor position when changing type
    if (element.type !== "password" && element.type !== "text") {
      const selStart = element.selectionStart;
      const selEnd = element.selectionEnd;
      element.type = "text";
      // Restore cursor position after type change
      try {
        element.selectionStart = selStart;
        element.selectionEnd = selEnd;
      } catch (_e) {
        // Some types don't support selection restoration
      }
    }
  }

  const { mainKbd, numberInput, numbersKbd } = getCachedElements();

  // Reset displays
  if (numbersKbd) numbersKbd.style.display = "none";
  if (numberInput) numberInput.style.display = "none";
  if (mainKbd) mainKbd.style.display = "";
  keyboardState.set("numbersMode", false);

  // Hide email keys and reset URL button by default
  setEmailKeysVisibility(false);
  // Only reset URL button if URL bar is not open
  if (!urlBarState.get("open")) {
    setUrlButtonMode(false);
  }

  if (type !== "textarea") {
    const origType = element.getAttribute("data-original-type");
    if (origType === "number" || origType === "tel") {
      // Show number keyboard
      if (numberInput) numberInput.style.display = "";
      if (mainKbd) mainKbd.style.display = "none";
    } else if (origType === "email") {
      // Show email keys (@) and change URL button to .com
      setEmailKeysVisibility(true);
      setUrlButtonMode(true);
    }
  }
}

/**
 * Update shift key displays
 */
function updateShiftKeys() {
  const keys = getCachedShiftKeys();
  const shift = keyboardState.get("shift");

  for (const key of keys) {
    const value =
      key.dataset.keyShift && shift ? key.dataset.keyShift : key.dataset.key;
    const span = key.querySelector("span");
    if (span) {
      span.textContent = value;
    }
  }
}

/**
 * Set URL button mode (URL or .com)
 */
function setUrlButtonMode(isDotCom) {
  const { urlButton } = getCachedElements();
  if (!urlButton) return;

  const span = urlButton.querySelector("span");
  if (span) {
    span.textContent = isDotCom ? ".com" : "URL";
  }
}

/**
 * Apply zoom setting (independent width/height)
 */
function applyZoom() {
  if (!keyboardElement) return;
  const zoomWidth = settingsState.get("keyboardZoomWidth") / 100;
  const zoomHeight = settingsState.get("keyboardZoomHeight") / 100;

  // Use CSS variables for zoom so they combine with translateX from drag positioning
  keyboardElement.style.setProperty("--vk-zoom-width", zoomWidth);
  keyboardElement.style.setProperty("--vk-zoom-height", zoomHeight);
  keyboardElement.style.transformOrigin = "bottom center";

  invalidateKeyboardHeightCache();
}

/**
 * Move cursor in the focused input
 * @param {number} direction - -1 for left, 1 for right
 */
function moveCursor(direction) {
  const element = focusState.get("element");
  if (!element) return;

  const type = focusState.get("type");

  if (type === "contenteditable") {
    const selection = element.ownerDocument.defaultView.getSelection();
    if (selection.rangeCount > 0) {
      const _range = selection.getRangeAt(0);
      if (direction < 0) {
        // Move left
        selection.modify("move", "backward", "character");
      } else {
        // Move right
        selection.modify("move", "forward", "character");
      }
    }
  } else {
    // Input or textarea
    try {
      const pos = element.selectionStart;
      const newPos = Math.max(
        0,
        Math.min(element.value.length, pos + direction)
      );
      element.selectionStart = element.selectionEnd = newPos;
    } catch (_e) {
      // Some input types don't support selection
    }
  }
}

/**
 * Setup spacebar swipe for cursor movement
 */
function setupSpacebarSwipe() {
  keyboardElement.addEventListener("pointerdown", (e) => {
    if (!settingsState.get("spacebarCursorSwipe")) return;

    const spaceKey = e.target.closest(".vk-key-space");
    if (spaceKey) {
      spacebarSwipeState = {
        active: true,
        startX: e.clientX,
        lastX: e.clientX,
        spaceKey: spaceKey,
        hasSwiped: false,
      };
      spaceKey.setPointerCapture(e.pointerId);
    }
  });

  keyboardElement.addEventListener("pointermove", (e) => {
    if (!spacebarSwipeState.active) return;

    const deltaX = e.clientX - spacebarSwipeState.lastX;
    const totalDelta = e.clientX - spacebarSwipeState.startX;

    // Check if we've passed the swipe threshold
    if (Math.abs(totalDelta) > SWIPE_THRESHOLD) {
      spacebarSwipeState.hasSwiped = true;
    }

    // Move cursor based on swipe distance
    if (Math.abs(deltaX) >= SWIPE_SENSITIVITY) {
      const direction = deltaX > 0 ? 1 : -1;
      moveCursor(direction);
      spacebarSwipeState.lastX = e.clientX;
    }
  });

  keyboardElement.addEventListener("pointerup", (e) => {
    if (!spacebarSwipeState.active) return;

    const wasSwiping = spacebarSwipeState.hasSwiped;
    spacebarSwipeState.active = false;

    if (spacebarSwipeState.spaceKey) {
      spacebarSwipeState.spaceKey.releasePointerCapture(e.pointerId);
    }

    // If we didn't swipe, let the click handler insert a space
    // The click event will fire after pointerup
    if (wasSwiping) {
      // Prevent the click from firing by marking it
      spacebarSwipeState.preventClick = true;
      setTimeout(() => {
        spacebarSwipeState.preventClick = false;
      }, 50);
    }

    spacebarSwipeState.spaceKey = null;
  });

  keyboardElement.addEventListener("pointercancel", (_e) => {
    spacebarSwipeState.active = false;
    spacebarSwipeState.spaceKey = null;
  });
}

/**
 * Create and setup the drag handle for repositioning
 */
function createDragHandle() {
  dragHandleElement = document.createElement("div");
  dragHandleElement.className = "vk-drag-handle";
  dragHandleElement.style.display = "none";

  dragHandleElement.addEventListener("pointerdown", (e) => {
    if (!settingsState.get("keyboardDraggable")) return;

    e.preventDefault();
    e.stopPropagation();

    // Get current CSS left/bottom values (or calculate from current position)
    const computedStyle = window.getComputedStyle(keyboardElement);
    const currentLeft = parseFloat(computedStyle.left) || 0;
    const currentBottom = parseFloat(computedStyle.bottom) || 0;

    // If keyboard hasn't been positioned yet (left is auto), calculate from rect
    const rect = keyboardElement.getBoundingClientRect();
    const isAutoPositioned = computedStyle.left === "auto" || !keyboardElement.style.left;

    dragState = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      startLeft: isAutoPositioned ? (window.innerWidth - rect.width) / 2 : currentLeft,
      startBottom: isAutoPositioned ? 0 : currentBottom,
    };

    dragHandleElement.setPointerCapture(e.pointerId);
    keyboardElement.classList.add("vk-dragging");
  });

  dragHandleElement.addEventListener("pointermove", (e) => {
    if (!dragState.active) return;

    const deltaX = e.clientX - dragState.startX;
    const deltaY = e.clientY - dragState.startY;

    // Apply deltas directly to CSS values
    // Moving cursor right (+deltaX) should move keyboard right (+left)
    // Moving cursor down (+deltaY) should move keyboard down (-bottom)
    const newLeft = dragState.startLeft + deltaX;
    const newBottom = dragState.startBottom - deltaY;

    applyKeyboardPositionCSS(newLeft, newBottom);
  });

  dragHandleElement.addEventListener("pointerup", (e) => {
    if (!dragState.active) return;

    dragState.active = false;
    dragHandleElement.releasePointerCapture(e.pointerId);
    keyboardElement.classList.remove("vk-dragging");

    // Save position as CSS values
    const position = {
      left: parseFloat(keyboardElement.style.left) || 0,
      bottom: parseFloat(keyboardElement.style.bottom) || 0,
    };
    settingsState.set("keyboardPosition", position);
    storage.setKeyboardPosition(position);
  });

  dragHandleElement.addEventListener("pointercancel", (_e) => {
    dragState.active = false;
    keyboardElement.classList.remove("vk-dragging");
  });

  return dragHandleElement;
}

/**
 * Apply keyboard position using CSS left/bottom values directly
 * @param {number} left - CSS left value in pixels
 * @param {number} bottom - CSS bottom value in pixels
 */
function applyKeyboardPositionCSS(left, bottom) {
  if (!keyboardElement) return;

  // Get visual dimensions for constraining
  const rect = keyboardElement.getBoundingClientRect();
  const scaledWidth = rect.width;
  const scaledHeight = rect.height;

  // Constrain: keep at least 20% of keyboard visible
  const margin = Math.min(scaledWidth, scaledHeight) * 0.2;

  // Calculate visual position from CSS values
  // With transform-origin: bottom center, visual left = left + (unscaledWidth - scaledWidth) / 2
  // But for constraining, we just need to ensure the visual rect stays partially on screen
  const visualLeft = rect.left;
  const visualRight = rect.right;
  const visualTop = rect.top;
  const visualBottom = rect.bottom;

  // Check if we need to constrain
  if (visualRight < margin) {
    // Too far left, push right
    left += margin - visualRight;
  } else if (visualLeft > window.innerWidth - margin) {
    // Too far right, push left
    left -= visualLeft - (window.innerWidth - margin);
  }

  if (visualBottom < margin) {
    // Too far up, push down
    bottom -= margin - visualBottom;
  } else if (visualTop > window.innerHeight - margin) {
    // Too far down, push up
    bottom += visualTop - (window.innerHeight - margin);
  }

  // Ensure bottom doesn't go negative (keyboard below screen)
  bottom = Math.max(-scaledHeight + margin, bottom);

  keyboardElement.style.left = `${left}px`;
  keyboardElement.style.right = "auto";
  keyboardElement.style.bottom = `${bottom}px`;
}

/**
 * Reset keyboard position to default (centered at bottom)
 * @param {boolean} saveToStorage - Whether to persist the reset to storage
 */
function resetKeyboardPosition(saveToStorage = false) {
  if (!keyboardElement) return;

  keyboardElement.style.setProperty("--vk-offset-x", "0px");
  keyboardElement.style.left = "";
  keyboardElement.style.right = "";
  keyboardElement.style.bottom = "";

  if (saveToStorage) {
    settingsState.set("keyboardPosition", null);
    storage.setKeyboardPosition(null);
  }
}

/**
 * Update drag handle visibility based on settings
 */
function updateDragHandleVisibility() {
  if (!dragHandleElement) return;
  dragHandleElement.style.display = settingsState.get("keyboardDraggable")
    ? ""
    : "none";
}

/**
 * Broadcast keyboard state to iframes
 */
function broadcastKeyboardState(isOpen) {
  if (top === self) {
    chrome.runtime.sendMessage({
      method: "keyboardStateChange",
      isOpen,
    });
  }
}

/**
 * Update visibility of the number bar based on settings
 */
export function updateNumberBarVisibility() {
  if (!shadowRoot) return;
  const numberBar = shadowRoot.getElementById("vk-number-bar");
  if (!numberBar) return;
  const show = settingsState.get("showNumberBar") !== false;
  numberBar.style.display = show ? "" : "none";
}

/**
 * Reload the keyboard to apply settings changes that affect structure
 * (e.g., showCloseButton, showNumbersButton)
 */
export function reloadKeyboard() {
  if (!keyboardElement || !shadowRoot) return;

  // Reload current layout (handles main keyboard close button, numbers button)
  const currentLayout = keyboardState.get("loadedLayout");
  if (currentLayout) {
    loadLayout(currentLayout);
  }

  // Recreate numbers keyboard (handles close button, ABC button on symbols)
  const oldNumbersKbd = shadowRoot.getElementById(DOM_IDS.MAIN_NUMBERS);
  if (oldNumbersKbd) {
    oldNumbersKbd.remove();
  }
  const newNumbersKbd = createNumbersKeyboard();
  keyboardElement.appendChild(newNumbersKbd);

  // Clear cached elements since we recreated numbersKbd
  cachedElements.numbersKbd = null;
}

export default {
  init,
  open,
  close,
  loadLayout,
  updateNumberBarVisibility,
  reloadKeyboard,
};
