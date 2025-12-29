// Virtual Keyboard - Main Entry Point
// Initializes all modules and sets up the keyboard

import { DOM_IDS, MESSAGE_TYPES, TIMING } from "./core/config.js";
import {
  settingsState,
  runtimeState,
  focusState,
  keyboardState,
} from "./core/state.js";
import { emit, on, EVENTS } from "./core/events.js";
import storage from "./core/storage.js";
import { getLayoutsList } from "./layouts/layouts.js";
import Keyboard from "./keyboard/Keyboard.js";
import { handleKeyPress } from "./keyboard/KeyHandler.js";
import {
  init as initInputTracker,
  clearCloseTimer,
} from "./input/InputTracker.js";
import {
  bindAllInputsDeep,
  startDocumentObserver,
} from "./input/ShadowDOMWatcher.js";
import { getInputType } from "./input/InputBinder.js";

// =============================================================================
// OPEN BUTTON (FLOATING KEYBOARD TRIGGER)
// =============================================================================

let openButtonElement = null;

/**
 * Create the floating open button
 */
function createOpenButton() {
  if (openButtonElement) return;
  if (!settingsState.get("showOpenButton")) return;
  if (settingsState.get("autostart")) return; // Don't show open button in autostart mode

  const button = document.createElement("button");
  button.id = DOM_IDS.OPEN_BUTTON;
  button.type = "button";
  button.textContent = "⌨";
  button.title = "Open virtual keyboard";
  button.dataset.hidden = "false";

  // Reset all inherited styles, then apply our own
  Object.assign(button.style, {
    all: "initial",
    position: "fixed",
    bottom: "20px",
    right: "20px",
    width: "50px",
    height: "50px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
    cursor: "pointer",
    fontSize: "28px",
    fontFamily: "system-ui, -apple-system, sans-serif",
    color: "#fff",
    zIndex: "9999999",
    transition: "transform 0.2s, opacity 0.3s, box-shadow 0.2s",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  });

  button.addEventListener("click", handleOpenButtonClick);
  button.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    e.stopPropagation();
  });

  // Hover effect
  button.addEventListener("mouseenter", () => {
    button.style.transform = "scale(1.1)";
    button.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.5)";
  });
  button.addEventListener("mouseleave", () => {
    if (button.dataset.hidden !== "true") {
      button.style.transform = "scale(1)";
      button.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.3)";
    }
  });

  document.body.appendChild(button);
  openButtonElement = button;
  runtimeState.set("openButtonElement", button);
}

/**
 * Handle open button click
 */
function handleOpenButtonClick(event) {
  event.preventDefault();
  event.stopPropagation();

  const inIframe = top !== self && window.frameElement !== null;

  if (inIframe) {
    chrome.runtime.sendMessage({ method: MESSAGE_TYPES.OPEN_FROM_BUTTON });
  } else {
    Keyboard.open(true);
  }
}

/**
 * Show the open button
 */
function showOpenButton() {
  if (!openButtonElement) return;
  openButtonElement.dataset.hidden = "false";
  openButtonElement.style.opacity = "1";
  openButtonElement.style.pointerEvents = "auto";
  openButtonElement.style.transform = "scale(1)";
}

/**
 * Hide the open button
 */
function hideOpenButton() {
  if (!openButtonElement) return;
  openButtonElement.dataset.hidden = "true";
  openButtonElement.style.opacity = "0";
  openButtonElement.style.pointerEvents = "none";
  openButtonElement.style.transform = "scale(0.8)";
}

// =============================================================================
// SETTINGS LOADING
// =============================================================================

/**
 * Load settings from storage
 */
async function loadSettings() {
  const settings = await storage.loadAllSettings();

  if (settings.isFirstTime) {
    // First time setup
    const layouts = getLayoutsList();
    await storage.initializeDefaults(layouts);

    settingsState.set({
      layout: "en",
      showOpenButton: true,
      showLanguageButton: false,
      showSettingsButton: true,
      keyboardZoom: 100,
      spacebarCursorSwipe: false,
      keyboardDraggable: false,
      keyboardPosition: null,
      autostart: false,
    });
  } else {
    settingsState.set({
      layout: settings.layout,
      showOpenButton: settings.showOpenButton,
      showLanguageButton: settings.showLanguageButton,
      showSettingsButton: settings.showSettingsButton,
      keyboardZoom: settings.keyboardZoom,
      spacebarCursorSwipe: settings.spacebarCursorSwipe,
      keyboardDraggable: settings.keyboardDraggable,
      keyboardPosition: settings.keyboardPosition,
      autostart: settings.autostart,
    });
  }

  // Listen for storage changes to update settings live
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local") return;

    if (changes.keyboardZoom) {
      settingsState.set("keyboardZoom", changes.keyboardZoom.newValue || 100);
    }
    if (changes.spacebarCursorSwipe !== undefined) {
      settingsState.set(
        "spacebarCursorSwipe",
        changes.spacebarCursorSwipe.newValue === true,
      );
    }
    if (changes.keyboardDraggable !== undefined) {
      settingsState.set(
        "keyboardDraggable",
        changes.keyboardDraggable.newValue === true,
      );
    }
    if (changes.showOpenButton !== undefined) {
      settingsState.set(
        "showOpenButton",
        changes.showOpenButton.newValue !== false,
      );
      if (changes.showOpenButton.newValue === false) {
        hideOpenButton();
      } else {
        createOpenButton();
      }
    }
    if (changes.keyboardPosition !== undefined) {
      settingsState.set("keyboardPosition", changes.keyboardPosition.newValue);
    }
    if (changes.showLanguageButton !== undefined) {
      settingsState.set(
        "showLanguageButton",
        changes.showLanguageButton.newValue === true,
      );
      // Reload layout to show/hide language button
      const currentLayout = settingsState.get("layout");
      if (currentLayout) {
        import("./keyboard/Keyboard.js").then((Keyboard) => {
          Keyboard.loadLayout(currentLayout);
        });
      }
    }
    if (changes.showSettingsButton !== undefined) {
      settingsState.set(
        "showSettingsButton",
        changes.showSettingsButton.newValue !== false,
      );
      // Reload layout to show/hide settings button
      const currentLayout = settingsState.get("layout");
      if (currentLayout) {
        import("./keyboard/Keyboard.js").then((Keyboard) => {
          Keyboard.loadLayout(currentLayout);
        });
      }
    }
    if (changes.autostart !== undefined) {
      const autostartEnabled = changes.autostart.newValue === true;
      settingsState.set("autostart", autostartEnabled);
      if (autostartEnabled) {
        // Hide open button and open keyboard
        hideOpenButton();
        import("./keyboard/Keyboard.js").then((Keyboard) => {
          Keyboard.loadLayout(settingsState.get("layout"));
          Keyboard.open(true);
        });
      } else {
        // Show open button if setting allows
        if (settingsState.get("showOpenButton")) {
          createOpenButton();
          showOpenButton();
        }
        // Reload layout to show close button again
        const currentLayout = settingsState.get("layout");
        if (currentLayout) {
          import("./keyboard/Keyboard.js").then((Keyboard) => {
            Keyboard.loadLayout(currentLayout);
          });
        }
      }
    }
  });
}

// =============================================================================
// IFRAME COMMUNICATION
// =============================================================================

/**
 * Set up message handling for iframe communication
 */
function setupIframeCommunication() {
  const isTopFrame = top === self;

  if (isTopFrame) {
    // Top frame receives messages from iframes
    chrome.runtime.onMessage.addListener((request) => {
      if (request.method === MESSAGE_TYPES.OPEN_FROM_IFRAME) {
        handleOpenFromIframe(request);
      } else if (request.method === MESSAGE_TYPES.OPEN_FROM_BUTTON) {
        Keyboard.open(true);
      } else if (request.method === MESSAGE_TYPES.CLICK_FROM_IFRAME) {
        handleKeyPress(request.key, { skip: request.skip });
      } else if (request.method === MESSAGE_TYPES.OPEN_URL_BAR) {
        setTimeout(() => {
          emit(EVENTS.URL_BAR_OPEN);
        }, TIMING.URL_BAR_FOCUS_DELAY);
      }
    });

    // Assign IDs to iframes
    const iframes = document.querySelectorAll("iframe");
    let iframeIndex = 0;
    for (const iframe of iframes) {
      if (!iframe.id) iframe.id = `CVK_F_${iframeIndex++}`;
    }
  }

  // All frames listen for keyboard state changes
  chrome.runtime.onMessage.addListener((request) => {
    if (request.method === MESSAGE_TYPES.KEYBOARD_STATE_CHANGE) {
      if (request.isOpen) {
        hideOpenButton();
      } else {
        showOpenButton();
      }
    }
  });
}

/**
 * Handle open from iframe message
 */
function handleOpenFromIframe(request) {
  const iframe = document.getElementById(request.frame);
  if (!iframe) return;

  const element = iframe.contentDocument?.getElementById(request.elem);
  if (!element) return;

  focusState.set({
    element,
    type: getInputType(element),
    changed: false,
  });

  Keyboard.open(request.force);
}

// =============================================================================
// EVENT SUBSCRIPTIONS
// =============================================================================

/**
 * Set up event subscriptions
 */
function setupEventSubscriptions() {
  on(EVENTS.OPEN_BUTTON_SHOW, showOpenButton);
  on(EVENTS.OPEN_BUTTON_HIDE, hideOpenButton);
}

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Initialize the virtual keyboard
 */
async function init() {
  // Load settings first
  await loadSettings();

  // Initialize input tracker
  initInputTracker();

  // Initialize keyboard
  await Keyboard.init();

  // Bind existing inputs (including shadow DOM)
  bindAllInputsDeep(document);

  // Start observing for new inputs
  startDocumentObserver();

  // Set up event subscriptions
  setupEventSubscriptions();

  // Set up iframe communication
  setupIframeCommunication();

  // Create open button (only if not in autostart mode)
  createOpenButton();

  // Auto-open keyboard if autostart is enabled
  if (settingsState.get("autostart")) {
    Keyboard.open(true);
  }
}

// =============================================================================
// ENTRY POINT
// =============================================================================

const isTopFrame = top === self;
const isCrossOriginIframe = top !== self && window.frameElement === null;

if (isTopFrame || isCrossOriginIframe) {
  // Full initialization for top frame and cross-origin iframes
  init().catch((err) => {
    console.error("Virtual Keyboard: Error initializing", err);
  });
} else {
  // Same-origin iframe - only bind inputs and set up communication
  loadSettings().then(() => {
    initInputTracker();
    bindAllInputsDeep(document);
    startDocumentObserver();
    setupIframeCommunication();
    createOpenButton();
  });
}
