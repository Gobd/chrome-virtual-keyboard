// Virtual Keyboard - Main Entry Point
// Initializes all modules and sets up the keyboard

import { DOM_IDS, MESSAGE_TYPES, TIMING } from "./core/config.js";
import { EVENTS, emit, on } from "./core/events.js";
import { focusState, runtimeState, settingsState } from "./core/state.js";
import storage from "./core/storage.js";
import { getInputType } from "./input/InputBinder.js";
import { init as initInputTracker } from "./input/InputTracker.js";
import {
  bindAllInputsDeep,
  startDocumentObserver,
} from "./input/ShadowDOMWatcher.js";
import Keyboard from "./keyboard/Keyboard.js";
import { handleKeyPress } from "./keyboard/KeyHandler.js";
import { getLayoutsList } from "./layouts/layouts.js";

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

  const isTopFrame = top === self;
  const isCrossOriginIframe = top !== self && window.frameElement === null;
  const isSameOriginIframe = top !== self && window.frameElement !== null;

  if (isTopFrame || isCrossOriginIframe) {
    // We can host the keyboard - open directly
    Keyboard.open(true);
  } else if (isSameOriginIframe) {
    // Same-origin child iframe - relay to parent with frame ID
    chrome.runtime.sendMessage({
      method: MESSAGE_TYPES.OPEN_FROM_BUTTON,
      frame: window.frameElement.id,
    });
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
      showOpenButton: false,
      showLanguageButton: false,
      showSettingsButton: true,
      showUrlButton: true,
      showCloseButton: true,
      showNumbersButton: true,
      showNumberBar: true,
      keyboardZoomWidth: 100,
      keyboardZoomHeight: 100,
      keyboardZoomLocked: true,
      spacebarCursorSwipe: false,
      keyboardDraggable: false,
      keyboardPosition: null,
      autostart: false,
      stickyShift: false,
      autoCaps: false,
      voiceEnabled: false,
      voiceModel: "base-q8",
      voiceLanguage: "multilingual",
      keyRepeatEnabled: false,
      keyRepeatDelay: 400,
      keyRepeatSpeed: 75,
    });
  } else {
    settingsState.set({
      layout: settings.layout,
      showOpenButton: settings.showOpenButton,
      showLanguageButton: settings.showLanguageButton,
      showSettingsButton: settings.showSettingsButton,
      showUrlButton: settings.showUrlButton,
      showCloseButton: settings.showCloseButton,
      showNumbersButton: settings.showNumbersButton,
      showNumberBar: settings.showNumberBar,
      keyboardZoomWidth: settings.keyboardZoomWidth,
      keyboardZoomHeight: settings.keyboardZoomHeight,
      keyboardZoomLocked: settings.keyboardZoomLocked,
      spacebarCursorSwipe: settings.spacebarCursorSwipe,
      keyboardDraggable: settings.keyboardDraggable,
      keyboardPosition: settings.keyboardPosition,
      autostart: settings.autostart,
      stickyShift: settings.stickyShift,
      autoCaps: settings.autoCaps,
      voiceEnabled: settings.voiceEnabled,
      voiceModel: settings.voiceModel,
      voiceLanguage: settings.voiceLanguage,
      keyRepeatEnabled: settings.keyRepeatEnabled,
      keyRepeatDelay: settings.keyRepeatDelay,
      keyRepeatSpeed: settings.keyRepeatSpeed,
    });
  }

  // Listen for storage changes to update settings live
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local") return;

    if (changes.keyboardZoomWidth) {
      settingsState.set(
        "keyboardZoomWidth",
        changes.keyboardZoomWidth.newValue || 100
      );
    }
    if (changes.keyboardZoomHeight) {
      settingsState.set(
        "keyboardZoomHeight",
        changes.keyboardZoomHeight.newValue || 100
      );
    }
    if (changes.keyboardZoomLocked !== undefined) {
      settingsState.set(
        "keyboardZoomLocked",
        changes.keyboardZoomLocked.newValue !== false
      );
    }
    if (changes.stickyShift !== undefined) {
      settingsState.set("stickyShift", changes.stickyShift.newValue === true);
    }
    if (changes.autoCaps !== undefined) {
      settingsState.set("autoCaps", changes.autoCaps.newValue === true);
    }
    if (changes.spacebarCursorSwipe !== undefined) {
      settingsState.set(
        "spacebarCursorSwipe",
        changes.spacebarCursorSwipe.newValue === true
      );
    }
    if (changes.keyboardDraggable !== undefined) {
      settingsState.set(
        "keyboardDraggable",
        changes.keyboardDraggable.newValue === true
      );
    }
    if (changes.showOpenButton !== undefined) {
      settingsState.set(
        "showOpenButton",
        changes.showOpenButton.newValue !== false
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
        changes.showLanguageButton.newValue === true
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
        changes.showSettingsButton.newValue !== false
      );
      // Reload layout to show/hide settings button
      const currentLayout = settingsState.get("layout");
      if (currentLayout) {
        import("./keyboard/Keyboard.js").then((Keyboard) => {
          Keyboard.loadLayout(currentLayout);
        });
      }
    }
    if (changes.showUrlButton !== undefined) {
      settingsState.set(
        "showUrlButton",
        changes.showUrlButton.newValue !== false
      );
      // Reload layout to show/hide URL button
      const currentLayout = settingsState.get("layout");
      if (currentLayout) {
        import("./keyboard/Keyboard.js").then((Keyboard) => {
          Keyboard.loadLayout(currentLayout);
        });
      }
    }
    if (changes.showCloseButton !== undefined) {
      settingsState.set(
        "showCloseButton",
        changes.showCloseButton.newValue !== false
      );
      // Reload keyboard to show/hide close button
      import("./keyboard/Keyboard.js").then((Keyboard) => {
        Keyboard.reloadKeyboard();
      });
    }
    if (changes.showNumbersButton !== undefined) {
      settingsState.set(
        "showNumbersButton",
        changes.showNumbersButton.newValue !== false
      );
      // Reload keyboard to show/hide numbers button
      import("./keyboard/Keyboard.js").then((Keyboard) => {
        Keyboard.reloadKeyboard();
      });
    }
    if (changes.showNumberBar !== undefined) {
      settingsState.set(
        "showNumberBar",
        changes.showNumberBar.newValue !== false
      );
      import("./keyboard/Keyboard.js").then((Keyboard) => {
        Keyboard.updateNumberBarVisibility();
      });
    }
    if (changes.voiceEnabled !== undefined) {
      settingsState.set("voiceEnabled", changes.voiceEnabled.newValue === true);
      // Reload layout to show/hide voice button
      const currentLayout = settingsState.get("layout");
      if (currentLayout) {
        import("./keyboard/Keyboard.js").then((Keyboard) => {
          Keyboard.loadLayout(currentLayout);
        });
      }
    }
    if (changes.voiceModel !== undefined) {
      settingsState.set("voiceModel", changes.voiceModel.newValue || "base-q8");
    }
    if (changes.voiceLanguage !== undefined) {
      settingsState.set(
        "voiceLanguage",
        changes.voiceLanguage.newValue || "multilingual"
      );
    }
    if (changes.autostart !== undefined) {
      const autostartEnabled = changes.autostart.newValue === true;
      settingsState.set("autostart", autostartEnabled);
      if (autostartEnabled) {
        // Open keyboard automatically
        import("./keyboard/Keyboard.js").then((Keyboard) => {
          Keyboard.open(true);
        });
      }
    }
    if (changes.keyRepeatEnabled !== undefined) {
      settingsState.set(
        "keyRepeatEnabled",
        changes.keyRepeatEnabled.newValue === true
      );
    }
    if (changes.keyRepeatDelay !== undefined) {
      settingsState.set(
        "keyRepeatDelay",
        changes.keyRepeatDelay.newValue || 400
      );
    }
    if (changes.keyRepeatSpeed !== undefined) {
      settingsState.set(
        "keyRepeatSpeed",
        changes.keyRepeatSpeed.newValue || 75
      );
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
  const isCrossOriginIframe = top !== self && window.frameElement === null;
  const canHostKeyboard = isTopFrame || isCrossOriginIframe;

  if (canHostKeyboard) {
    // Top frame and cross-origin iframes receive messages from child iframes
    chrome.runtime.onMessage.addListener((request) => {
      if (request.method === MESSAGE_TYPES.OPEN_FROM_IFRAME) {
        handleOpenFromIframe(request);
      } else if (request.method === MESSAGE_TYPES.OPEN_FROM_BUTTON) {
        // If frame ID provided, only respond if we own that iframe
        if (request.frame) {
          const iframe = document.getElementById(request.frame);
          if (iframe) {
            Keyboard.open(true);
          }
          // else: not our iframe, ignore
        } else {
          // No frame specified - open keyboard
          Keyboard.open(true);
        }
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
