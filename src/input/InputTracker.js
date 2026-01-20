// Input Tracker
// Manages focused input state, change detection, and scroll management

import { MESSAGE_TYPES, TIMING } from "../core/config.js";
import { EVENTS, emit, on } from "../core/events.js";
import { focusState, runtimeState, scrollState } from "../core/state.js";

// Counter for generating unique element IDs in iframes
let iframeElementCount = 0;

// Timer for delayed close after element removal (managed here to avoid circular imports)
let removalCloseTimer = null;

/**
 * Clear the removal close timer
 */
export function clearRemovalCloseTimer() {
  if (removalCloseTimer) {
    clearTimeout(removalCloseTimer);
    removalCloseTimer = null;
  }
}

/**
 * Start a delayed close after element removal
 * Uses a grace period to allow new elements to take focus
 */
export function startRemovalCloseTimer() {
  clearRemovalCloseTimer();
  removalCloseTimer = setTimeout(() => {
    removalCloseTimer = null;
    focusState.set("element", null);
    emit(EVENTS.KEYBOARD_CLOSE);
  }, TIMING.REMOVAL_CLOSE_DELAY);
}

/**
 * Initialize input tracking
 * Sets up event listeners for input focus/blur
 */
export function init() {
  // Listen for input focus events
  on(EVENTS.INPUT_FOCUS, handleInputFocus);

  // Listen for input blur events
  on(EVENTS.INPUT_BLUR, handleInputBlur);
}

/**
 * Check if we're in a same-origin iframe
 * @returns {boolean}
 */
function isInSameOriginIframe() {
  return top !== self && window.frameElement !== null;
}

/**
 * Handle input focus event
 * @param {Object} data - { element, inputType, isFocus }
 */
function handleInputFocus({ element, inputType, isFocus }) {
  // Clear any pending close timers (both blur and removal)
  clearCloseTimer();
  clearRemovalCloseTimer();

  // Fire change event for previous element if needed
  fireChangeIfNeeded();

  // Check if in same-origin iframe - relay to top frame
  if (isInSameOriginIframe()) {
    // Ensure element has an ID so top frame can find it
    if (!element.id) {
      element.id = `CVK_E_${iframeElementCount++}`;
    }

    // Ensure iframe has an ID so top frame can find it
    if (!window.frameElement.id) {
      window.frameElement.id = `CVK_F_${Date.now()}`;
    }

    // Send message to top frame via background script
    chrome.runtime.sendMessage({
      method: MESSAGE_TYPES.OPEN_FROM_IFRAME,
      posY: focusState.get("clickY"),
      posX: focusState.get("clickX"),
      force: isFocus,
      frame: window.frameElement.id,
      elem: element.id,
    });
    return;
  }

  // Update focused state
  focusState.set({
    element,
    type: inputType,
    changed: false,
  });

  // Emit keyboard open event
  emit(EVENTS.KEYBOARD_OPEN, {
    force: isFocus,
    posY: focusState.get("clickY"),
    posX: focusState.get("clickX"),
  });
}

/**
 * Handle input blur event
 * @param {HTMLElement} element
 */
function handleInputBlur(element) {
  // Fire change event if content was modified
  fireChangeIfNeeded();

  // Restore original input type if we changed it
  restoreInputType(element);

  // Clear focused element
  focusState.set("element", null);

  // Start close timer
  startCloseTimer();
}

/**
 * Fire change event if the input was modified
 */
export function fireChangeIfNeeded() {
  const element = focusState.get("element");
  const changed = focusState.get("changed");

  if (element && changed) {
    focusState.set("changed", false);
    element.dispatchEvent(new Event("change", { bubbles: false }));
  }
}

/**
 * Mark the current input as changed
 */
export function markChanged() {
  focusState.set("changed", true);
}

/**
 * Restore the original input type (e.g., after we changed password to text)
 * @param {HTMLElement} element
 */
function restoreInputType(element) {
  if (!element) return;

  const originalType = element.getAttribute("data-original-type");
  if (originalType && element.type !== originalType) {
    element.type = originalType;
  }
}

/**
 * Save the original input type before modifying it
 * @param {HTMLElement} element
 */
export function saveInputType(element) {
  if (!element.getAttribute("data-original-type")) {
    element.setAttribute("data-original-type", element.type);
  }
}

/**
 * Start the close timer
 */
function startCloseTimer() {
  const timer = setTimeout(() => {
    // In same-origin iframe, send message to top frame to close
    if (isInSameOriginIframe()) {
      chrome.runtime.sendMessage({
        method: MESSAGE_TYPES.CLICK_FROM_IFRAME,
        key: "Close",
        skip: false,
        frame: window.frameElement.id,
      });
    } else {
      emit(EVENTS.KEYBOARD_CLOSE);
    }
  }, TIMING.CLOSE_TIMER_DELAY);

  runtimeState.set("closeTimer", timer);
}

/**
 * Clear the close timer
 */
export function clearCloseTimer() {
  const timer = runtimeState.get("closeTimer");
  if (timer) {
    clearTimeout(timer);
    runtimeState.set("closeTimer", null);
  }
}

// =============================================================================
// Scroll Management
// =============================================================================

/**
 * Save current scroll position before opening keyboard
 */
export function saveScrollPosition() {
  scrollState.set("lastPos", window.scrollY);
}

/**
 * Scroll the focused input into view
 * @param {number} keyboardHeight - Height of the keyboard in pixels
 */
export function scrollInputIntoView(keyboardHeight) {
  const element = focusState.get("element");
  if (!element) return;

  const elemRect = element.getBoundingClientRect();
  const visibleBottom = window.innerHeight - keyboardHeight;

  if (elemRect.bottom > visibleBottom) {
    const padding = 20;
    const scrollAmount = elemRect.bottom - visibleBottom + padding;

    scrollState.set("lastPos", window.scrollY);
    scrollState.set("newPos", window.scrollY + scrollAmount);

    window.scrollBy({ top: scrollAmount, behavior: "smooth" });
  }
}

/**
 * Restore scroll position when keyboard closes
 */
export function restoreScrollPosition() {
  const lastPos = scrollState.get("lastPos");
  const newPos = scrollState.get("newPos");
  const scrollY = window.scrollY;

  // Only restore if user hasn't scrolled much since we opened
  if (scrollY <= newPos + 50 && scrollY >= newPos - 50) {
    window.scroll(0, lastPos);
  }
}

// Track the spacer element we added
let scrollSpacer = null;
let scrollSpacerContainer = null;

/**
 * Find the scrollable ancestor of an element
 * @param {HTMLElement} element
 * @returns {HTMLElement|null}
 */
function findScrollableAncestor(element) {
  let current = element.parentElement;

  while (current && current !== document.body && current !== document.documentElement) {
    const style = window.getComputedStyle(current);
    const overflowY = style.overflowY;
    const isScrollable = overflowY === "auto" || overflowY === "scroll";

    if (isScrollable && current.scrollHeight > current.clientHeight) {
      return current;
    }

    current = current.parentElement;
  }

  return null;
}

/**
 * Add padding to the focused element's scrollable container to make room for keyboard
 * Falls back to body if no scrollable container is found
 * @param {number} keyboardHeight
 */
export function addBodyPadding(keyboardHeight) {
  removeBodyPadding();

  const element = focusState.get("element");
  const scrollableContainer = element ? findScrollableAncestor(element) : null;

  if (scrollableContainer) {
    scrollSpacer = document.createElement("div");
    scrollSpacer.id = "vk-scroll-spacer";
    scrollSpacer.style.cssText = `height: ${keyboardHeight}px; flex-shrink: 0; pointer-events: none;`;
    scrollableContainer.appendChild(scrollSpacer);
    scrollSpacerContainer = scrollableContainer;
    scrollState.set("pagePadding", true);
  } else {
    document.body.style.marginBottom = `${keyboardHeight}px`;
    scrollState.set("pagePadding", true);
  }
}

/**
 * Remove scroll padding when keyboard closes
 */
export function removeBodyPadding() {
  if (scrollSpacer && scrollSpacer.parentNode) {
    scrollSpacer.parentNode.removeChild(scrollSpacer);
  }
  scrollSpacer = null;
  scrollSpacerContainer = null;

  if (scrollState.get("pagePadding")) {
    document.body.style.marginBottom = "";
    scrollState.set("pagePadding", false);
  }
}

export default {
  init,
  fireChangeIfNeeded,
  markChanged,
  saveInputType,
  clearCloseTimer,
  clearRemovalCloseTimer,
  startRemovalCloseTimer,
  saveScrollPosition,
  scrollInputIntoView,
  restoreScrollPosition,
  addBodyPadding,
  removeBodyPadding,
};
