// Key Handler
// Handles key press events and synthetic event dispatching

import { SPECIAL_KEYS } from '../core/config.js';
import { focusState, keyboardState, urlBarState } from '../core/state.js';
import { emit, EVENTS } from '../core/events.js';
import { applyShiftToCharacter } from './KeyMap.js';
import { markChanged, clearCloseTimer } from '../input/InputTracker.js';

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
      const element = focusState.get('element');
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

    default:
      insertCharacter(key);
      break;
  }
}

/**
 * Handle URL button press
 */
function handleUrl() {
  const element = focusState.get('element');
  const isEmailInput = element?.getAttribute?.('data-original-type') === 'email';

  if (urlBarState.get('open') || isEmailInput) {
    // URL bar is open OR email input focused, insert ".com"
    if (element) {
      insertTextAtPosition(element, '.com');
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
  window.open(chrome.runtime.getURL('options.html'));
}

/**
 * Handle numbers/symbols toggle
 */
function handleNumbersToggle() {
  const current = keyboardState.get('numbersMode');
  keyboardState.set('numbersMode', !current);
}

/**
 * Handle close button press
 */
function handleClose() {
  if (keyboardState.get('open')) {
    emit(EVENTS.KEYBOARD_CLOSE);
  }
}

/**
 * Handle enter key press
 */
function handleEnter() {
  const element = focusState.get('element');
  if (!element) return;

  const type = focusState.get('type');

  if (type === 'textarea') {
    // Insert newline
    const pos = element.selectionStart;
    const posEnd = element.selectionEnd;
    element.value = element.value.slice(0, pos) + '\n' + element.value.slice(posEnd);
    element.selectionStart = element.selectionEnd = pos + 1;
    dispatchInputEvent(element);
  } else if (type === 'contenteditable') {
    // Insert <br>
    const selection = getSelectionForElement(element);
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      const br = element.ownerDocument.createElement('br');
      range.insertNode(br);
      range.setStartAfter(br);
      range.setEndAfter(br);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    dispatchInputEvent(element);
    markChanged();
  } else {
    // Submit form or close keyboard
    const form = element.closest('form');
    if (form) {
      const submitted = clickSubmitButton(form);
      if (!submitted) {
        form.dispatchEvent(new Event('submit', { bubbles: true }));
      }
    }
    element.dispatchEvent(createKeyboardEvent('keydown', 13));
    emit(EVENTS.KEYBOARD_CLOSE);
  }

  dispatchInputEvent(element);
  markChanged();
}

/**
 * Handle shift key press
 */
function handleShift() {
  const current = keyboardState.get('shift');
  keyboardState.set('shift', !current);
}

/**
 * Handle backspace key press
 */
function handleBackspace() {
  const element = focusState.get('element');
  if (!element) return;

  const type = focusState.get('type');

  if (type === 'contenteditable') {
    deleteAtCursor(element);
  } else {
    try {
      let pos = element.selectionStart;
      const posEnd = element.selectionEnd;
      if (pos !== null && posEnd !== null) {
        if (posEnd === pos) pos--;
        if (pos >= 0) {
          element.value = element.value.slice(0, pos) + element.value.slice(posEnd);
          element.selectionStart = element.selectionEnd = pos;
        }
      } else {
        // Fallback for inputs that don't support selection (email, number)
        element.value = element.value.slice(0, -1);
      }
    } catch (e) {
      // Some input types (email, number) throw on selection access
      element.value = element.value.slice(0, -1);
    }
  }

  markChanged();
  dispatchBackspaceEvents(element);
}

/**
 * Insert a character
 * @param {string} key - Character to insert
 */
function insertCharacter(key) {
  const element = focusState.get('element');
  if (!element) return;

  const type = focusState.get('type');

  // Apply shift transformation
  if (keyboardState.get('shift')) {
    key = applyShiftToCharacter(key);
  }

  if (type === 'contenteditable') {
    element.dispatchEvent(createKeyboardEvent('keydown', key.charCodeAt(0)));
    insertTextAtCursor(element, key);
    markChanged();
    resetShiftIfNeeded();
    dispatchKeyEvents(element, key);
  } else {
    const maxLength = element.maxLength;
    if (maxLength <= 0 || element.value.length < maxLength) {
      element.dispatchEvent(createKeyboardEvent('keydown', key.charCodeAt(0)));
      insertTextAtPosition(element, key);
      markChanged();
      resetShiftIfNeeded();
      dispatchKeyEvents(element, key);
    }
  }
}

/**
 * Reset shift mode after typing a character
 */
function resetShiftIfNeeded() {
  if (keyboardState.get('shift')) {
    keyboardState.set('shift', false);
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
      input.value = input.value.slice(0, pos) + text + input.value.slice(posEnd);
      input.selectionStart = input.selectionEnd = pos + text.length;
    } else {
      // Fallback for inputs that don't support selection (email, number)
      input.value += text;
    }
  } catch (e) {
    // Some input types (email, number) throw on selection access
    input.value += text;
  }
  dispatchInputEvent(input);
}

/**
 * Delete character at cursor for contenteditable
 * @param {HTMLElement} element - The contenteditable element
 */
function deleteAtCursor(element) {
  const selection = getSelectionForElement(element);
  if (selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    if (range.collapsed) {
      const { startContainer, startOffset } = range;
      if (startContainer.nodeType === Node.TEXT_NODE && startOffset > 0) {
        startContainer.textContent =
          startContainer.textContent.slice(0, startOffset - 1) +
          startContainer.textContent.slice(startOffset);
        range.setStart(startContainer, startOffset - 1);
        range.setEnd(startContainer, startOffset - 1);
      } else if (startOffset > 0) {
        range.setStart(startContainer, startOffset - 1);
        range.deleteContents();
      }
    } else {
      range.deleteContents();
    }
  }
}

/**
 * Find and click submit button in form
 * @param {HTMLFormElement} form
 * @returns {boolean} - Whether a submit button was found and clicked
 */
function clickSubmitButton(form) {
  const submitButtons = form.querySelectorAll('input[type="submit"], button[type="submit"]');
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
 * @returns {KeyboardEvent}
 */
function createKeyboardEvent(type, keyCode = 0, charCode = 0) {
  return new KeyboardEvent(type, {
    bubbles: true,
    cancelable: true,
    keyCode,
    charCode,
    which: keyCode || charCode,
  });
}

/**
 * Dispatch input event
 * @param {HTMLElement} element
 */
function dispatchInputEvent(element) {
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(
    new InputEvent('input', { bubbles: true, inputType: 'insertText' })
  );
}

/**
 * Dispatch key events (keypress, keyup)
 * @param {HTMLElement} element
 * @param {string} key
 */
function dispatchKeyEvents(element, key) {
  element.dispatchEvent(createKeyboardEvent('keypress', 0, key.charCodeAt(0)));
  element.dispatchEvent(createKeyboardEvent('keyup', 0, key.charCodeAt(0)));
  dispatchInputEvent(element);
}

/**
 * Dispatch backspace events
 * @param {HTMLElement} element
 */
function dispatchBackspaceEvents(element) {
  const backspaceEvent = (type) =>
    new KeyboardEvent(type, {
      bubbles: true,
      cancelable: true,
      keyCode: 8,
      which: 8,
    });

  element.dispatchEvent(backspaceEvent('keydown'));
  element.dispatchEvent(backspaceEvent('keypress'));
  element.dispatchEvent(backspaceEvent('keyup'));
  element.dispatchEvent(new Event('input', { bubbles: true }));
}

export default {
  handleKeyPress,
};
