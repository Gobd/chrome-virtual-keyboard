// Keyboard
// Main keyboard UI class - rendering, show/hide, event delegation

import { DOM_IDS, CSS_CLASSES, TIMING, KEYBOARD } from '../core/config.js';
import { keyboardState, focusState, settingsState, runtimeState, urlBarState } from '../core/state.js';
import { emit, on, EVENTS } from '../core/events.js';
import { renderLayout, getLayoutsList } from '../layouts/LayoutRenderer.js';
import { getKeyWithShift } from './KeyMap.js';
import { handleKeyPress } from './KeyHandler.js';
import {
  saveScrollPosition,
  scrollInputIntoView,
  restoreScrollPosition,
  addBodyPadding,
  removeBodyPadding,
  clearCloseTimer,
  saveInputType,
} from '../input/InputTracker.js';
import storage from '../core/storage.js';

let keyboardElement = null;
let shadowRoot = null;
let scrollExtendElement = null;
let overlayCloseTimeout = null;

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
    cachedElements.numbersKbd = shadowRoot.getElementById(DOM_IDS.MAIN_NUMBERS);
    cachedElements.numberInput = shadowRoot.getElementById(DOM_IDS.NUMBER_BAR_INPUT);
    cachedElements.urlBar = shadowRoot.getElementById(DOM_IDS.URL_BAR);
    cachedElements.urlBarTextbox = shadowRoot.getElementById(DOM_IDS.URL_BAR_TEXTBOX);
    cachedElements.placeholder = shadowRoot.getElementById(DOM_IDS.MAIN_KBD_PLACEHOLDER);
  }
  // Cache layout-dependent elements separately (created in loadLayout)
  if (!cachedElements.urlButton && shadowRoot) {
    cachedElements.urlButton = shadowRoot.getElementById(DOM_IDS.URL_BUTTON);
  }
  if (!cachedElements.langButton && shadowRoot) {
    cachedElements.langButton = shadowRoot.getElementById(DOM_IDS.LANGUAGE_BUTTON);
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
  if (!cachedElements.shiftKeys && shadowRoot) {
    cachedElements.shiftKeys = shadowRoot.querySelectorAll(`.${CSS_CLASSES.KEY_CASE_DISPLAY}`);
  }
  return cachedElements.shiftKeys || [];
}

/**
 * Get cached email key elements, populating cache on first access
 * @returns {{emailKeys: NodeList, hideEmailKeys: NodeList}}
 */
function getCachedEmailKeys() {
  if (!cachedElements.emailKeys && shadowRoot) {
    cachedElements.emailKeys = shadowRoot.querySelectorAll(`.${CSS_CLASSES.EMAIL_INPUT}`);
    cachedElements.hideEmailKeys = shadowRoot.querySelectorAll(`.${CSS_CLASSES.HIDE_EMAIL_INPUT}`);
  }
  return {
    emailKeys: cachedElements.emailKeys || [],
    hideEmailKeys: cachedElements.hideEmailKeys || [],
  };
}

/**
 * Initialize the keyboard
 * Creates the shadow DOM host and loads the keyboard HTML
 */
export async function init() {
  // Create shadow DOM host
  const host = document.createElement('div');
  host.id = DOM_IDS.KEYBOARD_HOST;

  // Use closed shadow DOM for style encapsulation
  shadowRoot = host.attachShadow({ mode: 'closed' });

  // Create keyboard container - hidden until CSS loads
  keyboardElement = document.createElement('div');
  keyboardElement.id = DOM_IDS.KEYBOARD;
  keyboardElement.className = CSS_CLASSES.KEYBOARD_CLOSED;
  keyboardElement.dataset.state = 'closed';
  keyboardElement.style.display = 'none'; // Hide completely until CSS ready
  shadowRoot.appendChild(keyboardElement);

  // Create scroll extend element
  scrollExtendElement = document.createElement('div');
  scrollExtendElement.id = DOM_IDS.SCROLL_EXTEND;
  scrollExtendElement.style.display = 'none';
  shadowRoot.appendChild(scrollExtendElement);

  // Add host to document FIRST (so stylesheet can load)
  document.body.appendChild(host);

  // Now load styles - onload will fire since we're in the document
  const styleLink = document.createElement('link');
  styleLink.rel = 'stylesheet';
  styleLink.href = chrome.runtime.getURL('style.css');

  const styleLoaded = new Promise((resolve) => {
    styleLink.onload = () => resolve('loaded');
    styleLink.onerror = () => resolve('error');
    setTimeout(() => resolve('timeout'), 500); // Short fallback
  });
  shadowRoot.appendChild(styleLink);

  // Build keyboard structure while CSS loads
  await buildKeyboardStructure();

  // Set up event delegation
  setupEventDelegation();

  // Track pointer over keyboard for URL bar blur handling
  keyboardElement.addEventListener('pointerenter', () => {
    runtimeState.set('pointerOverKeyboard', true);
  });
  keyboardElement.addEventListener('pointerleave', () => {
    runtimeState.set('pointerOverKeyboard', false);
  });

  // Wait for stylesheet to load
  await styleLoaded;

  // Now show keyboard (CSS is ready, keyboard starts in closed/hidden state)
  keyboardElement.style.display = '';

  runtimeState.set('keyboardElement', keyboardElement);

  // Subscribe to state changes
  setupStateSubscriptions();

  // Subscribe to events
  setupEventListeners();

  // Apply zoom setting
  applyZoom();
}

/**
 * Build the internal keyboard structure
 */
async function buildKeyboardStructure() {
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
  const mainKbd = document.createElement('div');
  mainKbd.id = DOM_IDS.MAIN_KBD;
  keyboardElement.appendChild(mainKbd);

  // Create number bar (top row of numbers)
  const numberBar = createNumberBar();
  mainKbd.appendChild(numberBar);

  // Create layout placeholder
  const placeholder = document.createElement('div');
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
  const urlBar = document.createElement('div');
  urlBar.id = DOM_IDS.URL_BAR;
  urlBar.dataset.open = 'false';
  urlBar.style.display = 'none'; // Hidden until URL button clicked

  const form = document.createElement('form');
  form.onsubmit = (e) => {
    e.preventDefault();
    const input = shadowRoot.getElementById(DOM_IDS.URL_BAR_TEXTBOX);
    let url = input.value;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    window.location.href = url;
  };

  const input = document.createElement('input');
  input.type = 'text';
  input.id = DOM_IDS.URL_BAR_TEXTBOX;
  input.placeholder = 'https://';

  // URL bar focus/blur handling
  let refocusing = false;
  let urlBarCloseTimeout = null;

  input.onblur = (event) => {
    if (refocusing) return;

    const relatedTarget = event.relatedTarget;
    const focusInKeyboard = relatedTarget && keyboardElement.contains(relatedTarget);

    if (focusInKeyboard || runtimeState.get('pointerOverKeyboard')) {
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
        urlBar.dataset.open = 'false';
        urlBar.style.display = 'none'; // Hide URL bar
        urlBarState.set('open', false);
        setUrlButtonMode(false);
        input.value = ''; // Clear the URL bar input

        focusState.set('element', null);
        runtimeState.set('closeTimer', setTimeout(() => {
          emit(EVENTS.KEYBOARD_CLOSE);
        }, TIMING.URL_CLOSE_DELAY));
      }
      urlBarCloseTimeout = null;
    }, 50);
  };

  input.onfocus = (event) => {
    clearCloseTimer();
    focusState.set({
      type: 'input',
      element: input,
    });
    urlBar.dataset.open = 'true';
    urlBar.style.display = ''; // Show URL bar
    urlBarState.set('open', true);
    setUrlButtonMode(true);

    if (!keyboardState.get('open')) {
      open();
      input.focus();
      setTimeout(() => {
        const urlBtn = shadowRoot.getElementById(DOM_IDS.URL_BUTTON);
        if (urlBtn) urlBtn.dataset.highlight = 'true';
      }, TIMING.URL_BAR_HIGHLIGHT_DELAY);
    }

    event.preventDefault();
  };

  input.onclick = () => {
    if (!keyboardState.get('open')) {
      open();
    }
  };

  const submit = document.createElement('input');
  submit.type = 'submit';
  submit.value = 'Go';

  form.appendChild(input);
  form.appendChild(submit);
  urlBar.appendChild(form);

  return urlBar;
}

/**
 * Create the language overlay (for switching keyboard layouts)
 */
async function createLanguageOverlay() {
  const overlay = document.createElement('div');
  overlay.id = DOM_IDS.OVERLAY_LANGUAGE;
  overlay.className = CSS_CLASSES.OVERLAY;
  overlay.dataset.state = 'closed';
  overlay.style.display = 'none';

  const ul = document.createElement('ul');
  ul.id = DOM_IDS.OVERLAY_LANGUAGE_UL;
  ul.className = 'vk-overlay-keys';

  // Populate with layouts from storage
  const layouts = await storage.getLayoutsList();
  for (const layout of layouts) {
    const li = document.createElement('li');
    li.className = CSS_CLASSES.OVERLAY_BUTTON;
    li.textContent = layout.value.toUpperCase();
    li.dataset.action = 'setKeyboard';
    li.dataset.layout = layout.value;
    ul.appendChild(li);
  }

  overlay.appendChild(ul);
  return overlay;
}

/**
 * Create the number input keyboard (for number/tel inputs)
 */
function createNumberInputKeyboard() {
  const container = document.createElement('div');
  container.id = DOM_IDS.NUMBER_BAR_INPUT;
  container.style.display = 'none';

  const keys = [
    ['7', '8', '9', '#'],
    ['4', '5', '6', '-', ')'],
    ['1', '2', '3', '+', '('],
    ['0', '.', '*', '$', 'Enter'],
  ];

  for (const row of keys) {
    const rowDiv = document.createElement('div');
    rowDiv.className = 'vk-row';
    for (const key of row) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `vk-key ${CSS_CLASSES.KEY_CLICK}`;
      btn.dataset.key = key;
      const span = document.createElement('span');
      span.textContent = key === 'Enter' ? '↵' : key;
      btn.appendChild(span);
      rowDiv.appendChild(btn);
    }
    container.appendChild(rowDiv);
  }

  // Add backspace
  const backspaceBtn = document.createElement('button');
  backspaceBtn.type = 'button';
  backspaceBtn.className = `vk-key vk-key-backspace ${CSS_CLASSES.KEY_CLICK}`;
  backspaceBtn.dataset.key = 'Backspace';
  const backspaceSpan = document.createElement('span');
  backspaceSpan.className = 'vk-icon vk-icon-backspace';
  backspaceBtn.appendChild(backspaceSpan);

  return container;
}

/**
 * Create the number bar (row of 0-9 at top)
 */
function createNumberBar() {
  const container = document.createElement('div');
  container.id = 'vk-number-bar';
  container.className = 'vk-row';

  for (let i = 1; i <= 9; i++) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `vk-key vk-number-key ${CSS_CLASSES.KEY_CLICK}`;
    btn.dataset.key = String(i);
    const span = document.createElement('span');
    span.textContent = String(i);
    btn.appendChild(span);
    container.appendChild(btn);
  }

  // Add 0
  const zeroBtn = document.createElement('button');
  zeroBtn.type = 'button';
  zeroBtn.className = `vk-key vk-number-key ${CSS_CLASSES.KEY_CLICK}`;
  zeroBtn.dataset.key = '0';
  const zeroSpan = document.createElement('span');
  zeroSpan.textContent = '0';
  zeroBtn.appendChild(zeroSpan);
  container.appendChild(zeroBtn);

  return container;
}

/**
 * Create the numbers/symbols keyboard
 */
function createNumbersKeyboard() {
  const container = document.createElement('div');
  container.id = DOM_IDS.MAIN_NUMBERS;
  container.style.display = 'none';

  const rows = [
    ['_', '\\', ':', ';', ')', '(', '/', '^', '1', '2', '3', 'Backspace'],
    ['€', '$', '£', '&', '@', '"', '*', '~', '4', '5', '6', 'Enter'],
    ['?', '!', "'", '_', '<', '>', '-', '`', '7', '8', '9', '&123'],
    ['[', ']', '{', '}', '#', ',', '+', '%', '0', '0', '.', 'Close'],
  ];

  for (const row of rows) {
    const rowDiv = document.createElement('div');
    rowDiv.className = 'vk-row';
    for (const key of row) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset.key = key;

      if (key === 'Backspace') {
        btn.className = `vk-key vk-key-backspace ${CSS_CLASSES.KEY_CLICK}`;
        const span = document.createElement('span');
        span.className = 'vk-icon vk-icon-backspace';
        btn.appendChild(span);
      } else if (key === 'Enter') {
        btn.className = `vk-key vk-key-enter ${CSS_CLASSES.KEY_CLICK}`;
        const span = document.createElement('span');
        span.className = 'vk-icon vk-icon-enter';
        btn.appendChild(span);
      } else if (key === '&123') {
        btn.className = `vk-key vk-key-action ${CSS_CLASSES.KEY_CLICK}`;
        const span = document.createElement('span');
        span.textContent = 'ABC';
        btn.appendChild(span);
      } else if (key === 'Close') {
        btn.className = `vk-key vk-key-action ${CSS_CLASSES.KEY_CLICK}`;
        const span = document.createElement('span');
        span.className = 'vk-icon vk-icon-close';
        btn.appendChild(span);
      } else {
        btn.className = `vk-key ${CSS_CLASSES.KEY_CLICK}`;
        const span = document.createElement('span');
        span.textContent = key;
        btn.appendChild(span);
      }
      rowDiv.appendChild(btn);
    }
    container.appendChild(rowDiv);
  }

  return container;
}

/**
 * Set up event delegation for keyboard clicks
 */
function setupEventDelegation() {
  // Single click handler for all keys
  keyboardElement.addEventListener('click', (e) => {
    const key = e.target.closest(`.${CSS_CLASSES.KEY_CLICK}`);
    if (key) {
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
      toggleOverlay(menuId, e.clientX, e.clientY);
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
  keyboardElement.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
  });

  // Close overlays when clicking outside keyboard
  document.addEventListener('click', (e) => {
    if (!keyboardElement.contains(e.target)) {
      closeAllOverlays();
    }
  });
}

/**
 * Handle overlay button click
 */
async function handleOverlayClick(btn) {
  const action = btn.dataset.action;

  if (action === 'setKeyboard') {
    const layout = btn.dataset.layout;
    await storage.setLayout(layout);
    settingsState.set('layout', layout);
    await loadLayout(layout);

    const element = focusState.get('element');
    if (element) {
      element.focus();
    }
  } else if (action === 'key') {
    const keyValue = getKeyWithShift(btn);
    handleKeyPress(keyValue);
  }
}

/**
 * Toggle an overlay menu
 */
function toggleOverlay(menuId, clientX, clientY) {
  const overlay = shadowRoot.getElementById(`vk-overlay-${menuId}`) ||
                  shadowRoot.getElementById(DOM_IDS.OVERLAY_LANGUAGE);
  if (!overlay) return;

  if (overlay.dataset.state === 'open') {
    closeAllOverlays();
  } else {
    // Close any other open overlays first
    closeAllOverlays();
    // Show this overlay
    overlay.style.display = '';
    overlay.style.left = `${clientX - overlay.offsetWidth / 2}px`;
    overlay.style.bottom = `${window.innerHeight - clientY + 20}px`;
    overlay.dataset.state = 'open';
  }
}

/**
 * Close all overlay menus
 */
function closeAllOverlays() {
  const overlays = shadowRoot.querySelectorAll(`.${CSS_CLASSES.OVERLAY}`);
  for (const overlay of overlays) {
    overlay.dataset.state = 'closed';
  }

  // Clear any existing timeout to prevent stale closures
  if (overlayCloseTimeout) {
    clearTimeout(overlayCloseTimeout);
  }

  overlayCloseTimeout = setTimeout(() => {
    for (const overlay of overlays) {
      if (overlay.dataset.state === 'closed') {
        overlay.style.display = 'none';
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
  keyboardState.subscribe('numbersMode', (numbersMode) => {
    const { mainKbd, numbersKbd } = getCachedElements();
    if (mainKbd) mainKbd.style.display = numbersMode ? 'none' : '';
    if (numbersKbd) numbersKbd.style.display = numbersMode ? '' : 'none';
  });

  // Shift mode toggle
  keyboardState.subscribe('shift', (shift) => {
    const { mainKbd } = getCachedElements();
    if (mainKbd) {
      mainKbd.classList.toggle(CSS_CLASSES.SHIFT_ACTIVE, shift);
    }
    updateShiftKeys();
  });

  // Zoom setting change
  settingsState.subscribe('keyboardZoom', applyZoom);
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
  on(EVENTS.KEYBOARD_OPEN, ({ force, posY, posX }) => {
    open(force);
  });

  on(EVENTS.KEYBOARD_CLOSE, close);

  on(EVENTS.URL_BAR_OPEN, () => {
    const { urlBar, urlBarTextbox } = getCachedElements();
    if (urlBar && urlBarTextbox) {
      // Show URL bar first, then focus
      urlBar.style.display = '';
      urlBar.dataset.open = 'true';
      urlBarState.set('open', true);
      setUrlButtonMode(true);
      urlBarTextbox.focus();
    }
  });
}

/**
 * Load a keyboard layout
 */
export async function loadLayout(layoutId) {
  const { placeholder } = getCachedElements();
  if (!placeholder) return;

  // Clear existing content
  placeholder.innerHTML = '';

  // Clear layout-specific cached elements (shift keys, email keys)
  clearLayoutCache();

  // Render new layout
  const fragment = renderLayout(layoutId);
  placeholder.appendChild(fragment);

  keyboardState.set('loadedLayout', layoutId);

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
    const span = langButton.querySelector('span');
    if (span) {
      span.textContent = layoutId.toUpperCase();
    }
  }
}

/**
 * Open the keyboard
 */
export async function open(force = false) {
  if (keyboardState.get('open') && !force) return;

  // Load layout if needed
  const currentLayout = settingsState.get('layout');
  if (keyboardState.get('loadedLayout') !== currentLayout) {
    await loadLayout(currentLayout);
  } else {
    // Layout already loaded, but still need to update for current input type
    renderInputType();
  }

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
  keyboardState.set('open', true);
  keyboardElement.dataset.state = 'open';
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
  if (!keyboardState.get('open')) return;

  keyboardState.set('open', false);
  keyboardElement.dataset.state = 'closed';
  keyboardElement.classList.remove(CSS_CLASSES.KEYBOARD_OPEN);
  keyboardElement.classList.add(CSS_CLASSES.KEYBOARD_CLOSED);

  // Close URL bar if open
  const { urlBar, urlBarTextbox } = getCachedElements();
  if (urlBar && urlBarState.get('open')) {
    urlBar.dataset.open = 'false';
    urlBar.style.display = 'none';
    urlBarState.set('open', false);
    setUrlButtonMode(false);
    // Clear the URL bar input
    if (urlBarTextbox) {
      urlBarTextbox.value = '';
    }
  }

  // Show open button
  emit(EVENTS.OPEN_BUTTON_SHOW);

  // Broadcast state to iframes
  broadcastKeyboardState(false);

  setTimeout(() => {
    if (!keyboardState.get('open')) {
      // Restore scroll position
      restoreScrollPosition();
      removeBodyPadding();

      // Hide scroll extend
      if (scrollExtendElement) {
        scrollExtendElement.style.display = 'none';
      }
    }
  }, TIMING.KEYBOARD_HIDE_DELAY);
}

/**
 * Update the scroll extend element height
 */
function updateScrollExtend() {
  if (!scrollExtendElement || !keyboardElement) return;

  const style = window.getComputedStyle(keyboardElement);
  const height =
    parseFloat(style.height) +
    parseFloat(style.paddingTop) +
    parseFloat(style.paddingBottom);
  const zoom = parseFloat(style.zoom) || 1;

  scrollExtendElement.style.height = `${height * zoom}px`;
  scrollExtendElement.style.display = 'block';
}

/**
 * Set email-specific key visibility
 * @param {boolean} showEmailKeys - Whether to show email keys (@, .com) or hide them
 */
function setEmailKeysVisibility(showEmailKeys) {
  const { emailKeys, hideEmailKeys } = getCachedEmailKeys();

  for (const key of emailKeys) {
    // Use 'inline-flex' to override CSS 'display: none' rule
    key.style.display = showEmailKeys ? 'inline-flex' : 'none';
  }
  for (const key of hideEmailKeys) {
    key.style.display = showEmailKeys ? 'none' : 'inline-flex';
  }
}

/**
 * Render the appropriate keyboard for the input type
 */
function renderInputType() {
  const element = focusState.get('element');
  const type = focusState.get('type');
  if (!element) return;

  // Save original input type
  if (type === 'input') {
    saveInputType(element);
    // Convert to text for display (except password)
    // Preserve cursor position when changing type
    if (element.type !== 'password' && element.type !== 'text') {
      const selStart = element.selectionStart;
      const selEnd = element.selectionEnd;
      element.type = 'text';
      // Restore cursor position after type change
      try {
        element.selectionStart = selStart;
        element.selectionEnd = selEnd;
      } catch (e) {
        // Some types don't support selection restoration
      }
    }
  }

  const { mainKbd, numberInput, numbersKbd } = getCachedElements();

  // Reset displays
  if (numbersKbd) numbersKbd.style.display = 'none';
  if (numberInput) numberInput.style.display = 'none';
  if (mainKbd) mainKbd.style.display = '';
  keyboardState.set('numbersMode', false);

  // Hide email keys and reset URL button by default
  setEmailKeysVisibility(false);
  runtimeState.set('emailInputMode', false);
  // Only reset URL button if URL bar is not open
  if (!urlBarState.get('open')) {
    setUrlButtonMode(false);
  }

  if (type !== 'textarea') {
    const origType = element.getAttribute('data-original-type');
    if (origType === 'number' || origType === 'tel') {
      // Show number keyboard
      if (numberInput) numberInput.style.display = '';
      if (mainKbd) mainKbd.style.display = 'none';
    } else if (origType === 'email') {
      // Show email keys (@) and change URL button to .com
      setEmailKeysVisibility(true);
      setUrlButtonMode(true);
      runtimeState.set('emailInputMode', true);
    }
  }
}

/**
 * Update shift key displays
 */
function updateShiftKeys() {
  const keys = getCachedShiftKeys();
  const shift = keyboardState.get('shift');

  for (const key of keys) {
    const value = key.dataset.keyShift && shift ? key.dataset.keyShift : key.dataset.key;
    const span = key.querySelector('span');
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

  const span = urlButton.querySelector('span');
  if (span) {
    span.textContent = isDotCom ? '.com' : 'URL';
  }
}

/**
 * Apply zoom setting
 */
function applyZoom() {
  if (!keyboardElement) return;
  const zoom = settingsState.get('keyboardZoom') / 100;
  keyboardElement.style.zoom = zoom;
}

/**
 * Broadcast keyboard state to iframes
 */
function broadcastKeyboardState(isOpen) {
  if (top === self) {
    chrome.runtime.sendMessage({
      method: 'keyboardStateChange',
      isOpen,
    });
  }
}

export default {
  init,
  open,
  close,
  loadLayout,
};
