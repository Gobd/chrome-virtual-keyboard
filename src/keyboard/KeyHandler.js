// Key Handler
// Handles key press events and synthetic event dispatching

import { SPECIAL_KEYS } from "../core/config.js";
import { EVENTS, emit } from "../core/events.js";
import {
  focusState,
  keyboardState,
  settingsState,
  urlBarState,
  voiceState,
} from "../core/state.js";
import { clearCloseTimer, markChanged } from "../input/InputTracker.js";
import * as VoiceInput from "../voice/VoiceInput.js";
import { applyShiftToCharacter } from "./KeyMap.js";

/**
 * Handle a key press
 * @param {string} key - Key value
 * @param {Object} options - Additional options
 */
export function handleKeyPress(key, options = {}) {
  const { skip = false } = options;

  // Don't clear close timer for Close key
  if (key !== SPECIAL_KEYS.CLOSE) {
    if (!skip) {
      const element = focusState.get("element");
      if (element) {
        element.focus();
      }
    }
    clearCloseTimer();
  }

  switch (key) {
    case SPECIAL_KEYS.EMPTY:
      // No-op
      break;

    case SPECIAL_KEYS.URL:
      handleUrl();
      break;

    case SPECIAL_KEYS.SETTINGS:
    case SPECIAL_KEYS.OPEN_SETTINGS:
      handleSettings();
      break;

    case SPECIAL_KEYS.NUMBERS:
      handleNumbersToggle();
      break;

    case SPECIAL_KEYS.CLOSE:
      handleClose();
      break;

    case SPECIAL_KEYS.ENTER:
      handleEnter();
      break;

    case SPECIAL_KEYS.SHIFT:
      handleShift();
      break;

    case SPECIAL_KEYS.BACKSPACE:
      handleBackspace();
      break;

    case SPECIAL_KEYS.VOICE:
      handleVoice();
      break;

    default:
      insertCharacter(key);
      break;
  }
}

/**
 * Handle URL button press
 */
function handleUrl() {
  const element = focusState.get("element");
  const isEmailInput =
    element?.getAttribute?.("data-original-type") === "email";

  if (urlBarState.get("open") || isEmailInput) {
    // URL bar is open OR email input focused, insert ".com"
    if (element) {
      insertTextAtPosition(element, ".com");
    }
  } else {
    // Open URL bar
    emit(EVENTS.URL_BAR_OPEN);
  }
}

/**
 * Handle settings button press
 */
function handleSettings() {
  window.open(chrome.runtime.getURL("options.html"));
}

/**
 * Handle numbers/symbols toggle
 */
function handleNumbersToggle() {
  const current = keyboardState.get("numbersMode");
  keyboardState.set("numbersMode", !current);
}

/**
 * Handle close button press
 */
function handleClose() {
  if (keyboardState.get("open")) {
    emit(EVENTS.KEYBOARD_CLOSE);
  }
}

/**
 * Handle enter key press
 */
function handleEnter() {
  const element = focusState.get("element");
  if (!element) return;

  // Dispatch keydown event
  const keydownEvent = new KeyboardEvent("keydown", {
    key: "Enter",
    code: "Enter",
    keyCode: 13,
    which: 13,
    bubbles: true,
    cancelable: true,
  });
  element.dispatchEvent(keydownEvent);

  // If site handled the keydown (prevented default), don't do manual insertion
  if (keydownEvent.defaultPrevented) {
    markChanged();
    dispatchInputEvent(element);
    return;
  }

  const type = focusState.get("type");

  if (type === "textarea") {
    // Insert newline
    const pos = element.selectionStart;
    const posEnd = element.selectionEnd;
    element.value = `${element.value.slice(0, pos)}\n${element.value.slice(posEnd)}`;
    element.selectionStart = element.selectionEnd = pos + 1;
    dispatchInputEvent(element);
    activateAutoCaps();
  } else if (type === "contenteditable") {
    // Insert <br>
    const selection = getSelectionForElement(element);
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      const br = element.ownerDocument.createElement("br");
      range.insertNode(br);
      range.setStartAfter(br);
      range.setEndAfter(br);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    dispatchInputEvent(element);
    markChanged();
    activateAutoCaps();
  } else {
    // Submit form or close keyboard
    const form = element.closest("form");
    if (form) {
      const submitted = clickSubmitButton(form);
      if (!submitted) {
        form.dispatchEvent(new Event("submit", { bubbles: true }));
      }
    }
    emit(EVENTS.KEYBOARD_CLOSE);
  }

  dispatchInputEvent(element);
  markChanged();
}

/**
 * Handle shift key press
 */
function handleShift() {
  const current = keyboardState.get("shift");
  keyboardState.set("shift", !current);
  // Clear auto-caps flag when user manually toggles shift
  if (keyboardState.get("autoCapsActive")) {
    keyboardState.set("autoCapsActive", false);
  }
}

/**
 * Handle voice button press
 */
async function handleVoice() {
  // Check if voice is enabled in settings
  if (!settingsState.get("voiceEnabled")) {
    return;
  }

  const element = focusState.get("element");
  if (!element) return;

  // Initialize transcriber if not already done
  if (!VoiceInput.isModelLoaded()) {
    const modelSize = settingsState.get("voiceModel") || "base";
    const language = settingsState.get("voiceLanguage") || "multilingual";

    voiceState.set("state", VoiceInput.VoiceState.LOADING_MODEL);

    const success = await VoiceInput.initTranscriber({
      modelSize,
      language,
      onProgress: (percent) => {
        voiceState.set("downloadProgress", percent);
      },
      onStateChange: (state, error) => {
        voiceState.set("state", state);
        if (error) {
          voiceState.set("error", error);
        }
      },
    });

    if (!success) {
      return;
    }
  }

  // Toggle recording
  if (VoiceInput.getIsRecording()) {
    // Stop recording and get transcription
    const text = await VoiceInput.stopRecording();
    if (text) {
      // Insert transcribed text at cursor position
      insertVoiceText(element, text);
    }
  } else {
    // Start recording
    await VoiceInput.startRecording();
  }
}

/**
 * Insert voice transcribed text character by character
 * This ensures each character triggers keyboard events like manual typing,
 * which is needed for proxy apps and special input handling.
 * @param {string} text - Text to insert
 */
function insertVoiceText(_element, text) {
  // Insert each character as if the user pressed the key
  for (const char of text) {
    insertCharacter(char);
  }
}

/**
 * Handle backspace key press
 */
function handleBackspace() {
  const element = focusState.get("element");
  if (!element) return;

  const type = focusState.get("type");

  // For contenteditable, capture selection state BEFORE dispatching keydown
  // because some sites handle the keydown and move the cursor, which would
  // cause us to delete at the wrong position
  let savedRange = null;
  if (type === "contenteditable") {
    const selection = getSelectionForElement(element);
    if (selection.rangeCount > 0) {
      savedRange = selection.getRangeAt(0).cloneRange();
    }
  }

  // Dispatch keydown event
  const keydownEvent = new KeyboardEvent("keydown", {
    key: "Backspace",
    code: "Backspace",
    keyCode: 8,
    which: 8,
    bubbles: true,
    cancelable: true,
  });
  element.dispatchEvent(keydownEvent);

  // If site handled the keydown (prevented default), don't do manual deletion
  if (keydownEvent.defaultPrevented) {
    markChanged();
    dispatchBackspaceEvents(element);
    return;
  }

  if (type === "contenteditable") {
    deleteAtCursorWithRange(element, savedRange);
  } else {
    try {
      let pos = element.selectionStart;
      const posEnd = element.selectionEnd;
      if (pos !== null && posEnd !== null) {
        if (posEnd === pos) pos--;
        if (pos >= 0) {
          element.value =
            element.value.slice(0, pos) + element.value.slice(posEnd);
          element.selectionStart = element.selectionEnd = pos;
        }
      } else {
        // Fallback for inputs that don't support selection (email, number)
        element.value = element.value.slice(0, -1);
      }
    } catch (_e) {
      // Some input types (email, number) throw on selection access
      element.value = element.value.slice(0, -1);
    }
  }

  markChanged();
  // Dispatch remaining events (keypress, keyup, input)
  dispatchBackspaceEvents(element);
}

/**
 * Insert a character
 * @param {string} key - Character to insert
 */
function insertCharacter(key) {
  const element = focusState.get("element");
  if (!element) return;

  const type = focusState.get("type");

  // Apply shift transformation
  if (keyboardState.get("shift")) {
    key = applyShiftToCharacter(key);
  }

  // Dispatch keydown event
  const keydownEvent = createKeyboardEvent(
    "keydown",
    key.charCodeAt(0),
    0,
    key
  );
  element.dispatchEvent(keydownEvent);

  if (type === "contenteditable") {
    insertTextAtCursor(element, key);
    markChanged();
    resetShiftIfNeeded();
    dispatchKeyEvents(element, key);
  } else {
    const maxLength = element.maxLength;
    if (maxLength <= 0 || element.value.length < maxLength) {
      insertTextAtPosition(element, key);
      markChanged();
      resetShiftIfNeeded();
      dispatchKeyEvents(element, key);
    }
  }

  // Activate auto-caps after sentence-ending punctuation
  if (key === "." || key === "?" || key === "!") {
    activateAutoCaps();
  }
}

/**
 * Reset shift mode after typing a character (unless sticky shift is enabled)
 * Auto-caps triggered shift always resets (ignores sticky shift)
 */
function resetShiftIfNeeded() {
  if (keyboardState.get("shift")) {
    // Auto-caps always resets after one letter (ignores sticky shift)
    if (keyboardState.get("autoCapsActive")) {
      keyboardState.set("shift", false);
      keyboardState.set("autoCapsActive", false);
    } else if (!settingsState.get("stickyShift")) {
      keyboardState.set("shift", false);
    }
  }
}

/**
 * Activate auto-caps if enabled and shift is not already on
 * Only activates if shift is OFF to avoid interfering with sticky shift
 */
function activateAutoCaps() {
  if (settingsState.get("autoCaps") && !keyboardState.get("shift")) {
    keyboardState.set("shift", true);
    keyboardState.set("autoCapsActive", true);
  }
}

// =============================================================================
// DOM Manipulation Helpers
// =============================================================================

/**
 * Get the selection object for an element (handles iframe elements)
 * @param {HTMLElement} element
 * @returns {Selection|null}
 */
function getSelectionForElement(element) {
  const win = element?.ownerDocument?.defaultView || window;
  return win.getSelection();
}

/**
 * Insert text at cursor position for contenteditable
 * @param {HTMLElement} element - The contenteditable element
 * @param {string} text
 */
function insertTextAtCursor(element, text) {
  const selection = getSelectionForElement(element);
  if (selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    range.deleteContents();
    const textNode = element.ownerDocument.createTextNode(text);
    range.insertNode(textNode);
    range.setStartAfter(textNode);
    range.setEndAfter(textNode);
    selection.removeAllRanges();
    selection.addRange(range);
  }
}

/**
 * Insert text at cursor position for input/textarea
 * Handles inputs that don't support selection (email, number, etc.)
 * @param {HTMLElement} input
 * @param {string} text
 */
function insertTextAtPosition(input, text) {
  try {
    const pos = input.selectionStart;
    const posEnd = input.selectionEnd;
    if (pos !== null && posEnd !== null) {
      input.value =
        input.value.slice(0, pos) + text + input.value.slice(posEnd);
      input.selectionStart = input.selectionEnd = pos + text.length;
    } else {
      // Fallback for inputs that don't support selection (email, number)
      input.value += text;
    }
  } catch (_e) {
    // Some input types (email, number) throw on selection access
    input.value += text;
  }
  dispatchInputEvent(input);
}

/**
 * Delete character at cursor for contenteditable using a saved range
 * @param {HTMLElement} element - The contenteditable element
 * @param {Range|null} savedRange - The range captured before keydown dispatch
 */
function deleteAtCursorWithRange(element, savedRange) {
  if (!savedRange) {
    // Fallback to current selection if no saved range
    const selection = getSelectionForElement(element);
    if (selection.rangeCount > 0) {
      savedRange = selection.getRangeAt(0);
    } else {
      return;
    }
  }

  const { startContainer, startOffset } = savedRange;

  if (savedRange.collapsed) {
    if (startContainer.nodeType === Node.TEXT_NODE && startOffset > 0) {
      // Delete character before cursor in text node
      startContainer.textContent =
        startContainer.textContent.slice(0, startOffset - 1) +
        startContainer.textContent.slice(startOffset);
      // Update selection to new position
      const selection = getSelectionForElement(element);
      const newRange = document.createRange();
      newRange.setStart(startContainer, startOffset - 1);
      newRange.setEnd(startContainer, startOffset - 1);
      selection.removeAllRanges();
      selection.addRange(newRange);
    } else if (startOffset > 0) {
      // For element nodes with startOffset > 0
      const range = document.createRange();
      range.setStart(startContainer, startOffset - 1);
      range.setEnd(startContainer, startOffset);
      range.deleteContents();
    }
    // When startOffset === 0, we're at start of a node/line
    // The keydown event should have handled moving to previous line
    // We intentionally do nothing here to avoid double-delete
  } else {
    // Selection exists, delete it
    savedRange.deleteContents();
  }
}

/**
 * Find and click submit button in form
 * @param {HTMLFormElement} form
 * @returns {boolean} - Whether a submit button was found and clicked
 */
function clickSubmitButton(form) {
  const submitButtons = form.querySelectorAll(
    'input[type="submit"], button[type="submit"]'
  );
  for (const btn of submitButtons) {
    btn.click();
    return true;
  }
  return false;
}

// =============================================================================
// Event Dispatching
// =============================================================================

/**
 * Create a keyboard event
 * @param {string} type - Event type
 * @param {number} keyCode - Key code
 * @param {number} charCode - Character code
 * @param {string} key - Key name (e.g., "Enter", "a")
 * @returns {KeyboardEvent}
 */
function createKeyboardEvent(type, keyCode = 0, charCode = 0, key = "") {
  return new KeyboardEvent(type, {
    bubbles: true,
    cancelable: true,
    keyCode,
    charCode,
    which: keyCode || charCode,
    key: key || (charCode ? String.fromCharCode(charCode) : ""),
  });
}

/**
 * Dispatch input event
 * @param {HTMLElement} element
 */
function dispatchInputEvent(element) {
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(
    new InputEvent("input", { bubbles: true, inputType: "insertText" })
  );
}

/**
 * Dispatch key events (keypress, keyup)
 * @param {HTMLElement} element
 * @param {string} key
 */
function dispatchKeyEvents(element, key) {
  element.dispatchEvent(createKeyboardEvent("keypress", 0, key.charCodeAt(0)));
  element.dispatchEvent(createKeyboardEvent("keyup", 0, key.charCodeAt(0)));
  dispatchInputEvent(element);
}

/**
 * Dispatch backspace events (keypress, keyup, input - keydown already dispatched)
 * @param {HTMLElement} element
 */
function dispatchBackspaceEvents(element) {
  const backspaceEvent = (type) =>
    new KeyboardEvent(type, {
      key: "Backspace",
      code: "Backspace",
      bubbles: true,
      cancelable: true,
      keyCode: 8,
      which: 8,
    });

  element.dispatchEvent(backspaceEvent("keypress"));
  element.dispatchEvent(backspaceEvent("keyup"));
  element.dispatchEvent(new Event("input", { bubbles: true }));
}

export { activateAutoCaps, handleKeyPress };

export default {
  handleKeyPress,
};
