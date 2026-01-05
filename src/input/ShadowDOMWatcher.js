// Shadow DOM Watcher
// Monitors shadow roots for dynamically added inputs

import { EVENTS, emit } from "../core/events.js";
import { focusState } from "../core/state.js";
import {
  bindAllInputs,
  bindInput,
  isSupportedInput,
  processAddedNode,
} from "./InputBinder.js";

// WeakMap to track observers per shadow root (prevents memory leaks)
const shadowObservers = new WeakMap();

// Debounce timeout for mutation processing
const DEBOUNCE_DELAY = 16; // ~1 frame at 60fps
let pendingMutations = [];
let debounceTimeout = null;

/**
 * Process pending mutations (debounced)
 */
function processPendingMutations() {
  const mutations = pendingMutations;
  pendingMutations = [];
  debounceTimeout = null;

  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      processAddedNode(node);
      if (node.nodeType === Node.ELEMENT_NODE && node.shadowRoot) {
        observeShadowRoot(node.shadowRoot);
      }
    }
    for (const node of mutation.removedNodes) {
      processRemovedNode(node);
    }
  }
}

/**
 * Queue mutations for debounced processing
 * @param {MutationRecord[]} mutations
 */
function queueMutations(mutations) {
  pendingMutations.push(...mutations);
  if (!debounceTimeout) {
    debounceTimeout = setTimeout(processPendingMutations, DEBOUNCE_DELAY);
  }
}

/**
 * Start observing a shadow root for input changes
 * @param {ShadowRoot} shadowRoot
 */
export function observeShadowRoot(shadowRoot) {
  if (!shadowRoot || shadowObservers.has(shadowRoot)) return;

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        processAddedNode(node);
        // Check if added node has a shadow root
        if (node.shadowRoot) {
          observeShadowRoot(node.shadowRoot);
        }
      }
      for (const node of mutation.removedNodes) {
        processRemovedNode(node);
      }
    }
  });

  observer.observe(shadowRoot, { childList: true, subtree: true });
  shadowObservers.set(shadowRoot, observer);

  // Bind any existing inputs in this shadow root
  bindAllInputs(shadowRoot);

  // Recursively observe nested shadow roots
  const allElements = shadowRoot.querySelectorAll("*");
  for (const el of allElements) {
    if (el.shadowRoot) {
      observeShadowRoot(el.shadowRoot);
    }
  }
}

/**
 * Stop observing a shadow root
 * @param {ShadowRoot} shadowRoot
 */
export function unobserveShadowRoot(shadowRoot) {
  if (!shadowRoot) return;

  const observer = shadowObservers.get(shadowRoot);
  if (observer) {
    observer.disconnect();
    shadowObservers.delete(shadowRoot);
  }
}

/**
 * Check if the focused element was removed and close keyboard if so
 * @param {Node} node - The removed node
 */
function checkFocusedElementRemoved(node) {
  const focusedElement = focusState.get("element");
  if (!focusedElement) return;

  // Check if the removed node is or contains the focused element
  if (node === focusedElement || node.contains?.(focusedElement)) {
    focusState.set("element", null);
    emit(EVENTS.KEYBOARD_CLOSE);
    return;
  }

  // Check if the removed node is an iframe containing the focused element
  if (node.nodeName === "IFRAME") {
    try {
      const iframeDoc = node.contentDocument;
      if (iframeDoc?.contains(focusedElement)) {
        focusState.set("element", null);
        emit(EVENTS.KEYBOARD_CLOSE);
      }
    } catch {
      // Cross-origin iframe - can't check, but if the focused element
      // is no longer connected, we should close
      if (!focusedElement.isConnected) {
        focusState.set("element", null);
        emit(EVENTS.KEYBOARD_CLOSE);
      }
    }
  }
}

/**
 * Process a node that was removed from the DOM
 * Clean up any shadow observers
 * @param {Node} node
 */
function processRemovedNode(node) {
  if (node.nodeType !== Node.ELEMENT_NODE) return;

  // Check if the focused element was removed - close keyboard if so
  checkFocusedElementRemoved(node);

  // Clean up shadow observer for this node
  if (node.shadowRoot) {
    unobserveShadowRoot(node.shadowRoot);
  }

  // Clean up shadow observers for all descendants
  if (node.querySelectorAll) {
    const elements = node.querySelectorAll("*");
    for (const el of elements) {
      if (el.shadowRoot) {
        unobserveShadowRoot(el.shadowRoot);
      }
    }
  }
}

/**
 * Walk all elements in a container, including shadow DOM
 * @param {HTMLElement|Document} root
 * @param {boolean} includeShadow - Whether to include shadow DOM
 * @yields {HTMLElement}
 */
export function* walkElements(root, includeShadow = true) {
  if (!root || !root.children) return;

  for (const node of root.children) {
    yield node;

    if (includeShadow && node.shadowRoot) {
      yield node.shadowRoot;
      yield* walkElements(node.shadowRoot, includeShadow);
    }

    yield* walkElements(node, includeShadow);
  }
}

/**
 * Find and bind all inputs including those in shadow DOM
 * @param {HTMLElement|Document} root
 */
export function bindAllInputsDeep(root = document) {
  if (!root) return;

  // Also check direct children of the root (document.body level)
  const directInputs = root.querySelectorAll
    ? root.querySelectorAll("input, textarea, [contenteditable]")
    : [];
  for (const input of directInputs) {
    if (isSupportedInput(input)) {
      bindInput(input);
    }
  }

  for (const node of walkElements(root, true)) {
    if (isSupportedInput(node)) {
      bindInput(node);
    }

    // Set up observer for shadow roots
    if (node.shadowRoot) {
      observeShadowRoot(node.shadowRoot);
    }
  }
}

/**
 * Create the mutation observer
 * @returns {MutationObserver}
 */
function createObserver() {
  return new MutationObserver(queueMutations);
}

/**
 * Start the main document observer
 * Defers until document.body exists
 * @returns {Promise<MutationObserver>}
 */
export function startDocumentObserver() {
  return new Promise((resolve) => {
    const startObserving = () => {
      const observer = createObserver();
      observer.observe(document.body, { childList: true, subtree: true });
      resolve(observer);
    };

    if (document.body) {
      startObserving();
    } else {
      // Wait for body to exist
      document.addEventListener("DOMContentLoaded", startObserving, {
        once: true,
      });
    }
  });
}

export default {
  observeShadowRoot,
  unobserveShadowRoot,
  walkElements,
  bindAllInputsDeep,
  startDocumentObserver,
};
