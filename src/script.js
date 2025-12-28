// Virtual Keyboard - Chrome Extension
// Refactored: async/await, pointer events, simplified state, JSON-based layouts

// =============================================================================
// CONSTANTS
// =============================================================================

// Layouts are defined in layouts/layouts.js and rendered via LayoutRenderer

// DOM element IDs
const DOM_IDS = {
  KEYBOARD: "virtualKeyboardChromeExtension",
  MAIN_KBD: "virtualKeyboardChromeExtensionMainKbd",
  MAIN_KBD_PLACEHOLDER: "virtualKeyboardChromeExtensionMainKbdPH",
  MAIN_NUMBERS: "virtualKeyboardChromeExtensionMainNumbers",
  NUMBER_BAR_INPUT: "virtualKeyboardChromeExtensionNumberBarKbdInput",
  SCROLL_EXTEND: "virtualKeyboardChromeExtensionOverlayScrollExtend",
  OVERLAY_SETTINGS: "virtualKeyboardChromeExtensionOverlaySettings",
  OVERLAY_SETTINGS_UL: "virtualKeyboardChromeExtensionOverlaySettingsUl",
  URL_BAR: "virtualKeyboardChromeExtensionUrlBar",
  URL_BAR_TEXTBOX: "virtualKeyboardChromeExtensionUrlBarTextBox",
  SETTINGS_BUTTON: "settingsButton",
  URL_BUTTON: "urlButton",
  OPEN_BUTTON: "virtualKeyboardOpenButton",
};

// CSS selectors and classes
const CSS = {
  OVERLAY_CLASS: "virtualKeyboardChromeExtensionOverlay",
  OVERLAY_BUTTON_CLASS: "virtualKeyboardChromeExtensionOverlayButton",
  KEY_CLICK_CLASS: "kbdClick",
  KEY_CASE_DISPLAY_CLASS: "keyCaseDisplay",
  MENU_CLASS: "kMenu",
  EMAIL_INPUT_CLASS: "kbEmailInput",
};

// Timing constants (ms)
const TIMING = {
  OVERLAY_CLOSE_DELAY: 500,
  CLOSE_TIMER_DELAY: 500,
  URL_CLOSE_DELAY: 1000,
  KEYBOARD_HIDE_DELAY: 500,
  URL_BAR_HIGHLIGHT_DELAY: 500,
  URL_BAR_FOCUS_DELAY: 200,
};

// =============================================================================
// GLOBAL STATE
// =============================================================================

const state = {
  keyboard: {
    open: false,
    shift: false,
    numbersMode: false,
    element: null,
    loadedLayout: "",
  },
  focused: {
    element: null,
    type: "input",
    changed: false,
    clickY: 0,
    clickX: 0,
  },
  scroll: {
    lastPos: 0,
    newPos: 0,
    pagePadding: false,
  },
  settings: {
    layout: "en",
  },
  urlBarOpen: false,
  closeTimer: null,
  iframeCount: 0,
  pointerOverKeyboard: false,
  observer: null,
  shadowObservers: new WeakMap(),
  openButton: null,
};

// =============================================================================
// STORAGE HELPERS
// =============================================================================

async function storageGet(keys) {
  return chrome.storage.local.get(keys);
}

async function storageSet(obj) {
  return chrome.storage.local.set(obj);
}

// =============================================================================
// EVENT HELPERS
// =============================================================================

function dispatchEvent(elem, type, options = {}) {
  elem.dispatchEvent(new Event(type, { bubbles: true, ...options }));
}

function dispatchInputEvent(elem) {
  elem.dispatchEvent(
    new InputEvent("input", { bubbles: true, inputType: "insertText" }),
  );
}

function createKeyboardEvent(type, keyCode = 0, charCode = 0) {
  return new KeyboardEvent(type, {
    bubbles: true,
    cancelable: true,
    keyCode,
    charCode,
    which: keyCode || charCode,
  });
}

// =============================================================================
// DOM HELPERS
// =============================================================================

function $(id) {
  return document.getElementById(id);
}

function $$(selector, root = document) {
  return root.querySelectorAll(selector);
}

function preventDefault(event) {
  event.preventDefault();
  event.stopPropagation();
}

function setClassDisplay(className, value) {
  for (const item of $$(`.${className}`)) {
    item.style.display = value;
  }
}

// =============================================================================
// CONTENTEDITABLE HELPERS
// =============================================================================

function isContentEditable() {
  return state.focused.type === "contenteditable";
}

function insertTextAtCursor(text) {
  const selection = window.getSelection();
  if (selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    range.deleteContents();
    const textNode = document.createTextNode(text);
    range.insertNode(textNode);
    range.setStartAfter(textNode);
    range.setEndAfter(textNode);
    selection.removeAllRanges();
    selection.addRange(range);
  }
}

function insertTextAtPosition(input, text) {
  const pos = input.selectionStart;
  const posEnd = input.selectionEnd;
  input.value = input.value.slice(0, pos) + text + input.value.slice(posEnd);
  input.selectionStart = input.selectionEnd = pos + text.length;
  dispatchEvent(input, "input");
}

function deleteAtCursor() {
  const selection = window.getSelection();
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

// =============================================================================
// OVERLAY HELPERS
// =============================================================================

function closeAllOverlays() {
  const overlays = $$(`.${CSS.OVERLAY_CLASS}`);
  for (const overlay of overlays) {
    overlay.setAttribute("data-state", "closed");
  }
  setTimeout(() => {
    for (const overlay of overlays) {
      overlay.style.display = "none";
    }
  }, TIMING.OVERLAY_CLOSE_DELAY);
}

// =============================================================================
// KEY HELPERS
// =============================================================================

function getKeyWithShift(element) {
  const baseKey = element.getAttribute("data-key");
  if (state.keyboard.shift && element.getAttribute("data-key-shift")) {
    return element.getAttribute("data-key-shift");
  }
  return baseKey;
}

function applyShiftToCharacter(char) {
  const charCode = char.charCodeAt(0);

  // Lowercase a-z (97-122) -> Uppercase A-Z (65-90)
  if (charCode >= 97 && charCode <= 122) {
    return String.fromCharCode(charCode - 32);
  }

  // Accented lowercase (224-252) -> Accented uppercase (192-220)
  if (charCode >= 224 && charCode <= 252) {
    return String.fromCharCode(charCode - 32);
  }

  return char;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function clickSubmitButton(form, inputType) {
  const inputs = form.querySelectorAll(inputType);
  for (const input of inputs) {
    if (input.type === "submit") {
      input.click();
      return true;
    }
  }
  return false;
}

function getElementPosition(obj, type) {
  let position = 0;
  while (obj?.offsetParent) {
    position += obj[type];
    obj = obj.offsetParent;
  }
  return position;
}

function getElementPositionY(obj) {
  return getElementPosition(obj, "offsetTop");
}

function getElementPositionX(obj) {
  return getElementPosition(obj, "offsetLeft");
}

// =============================================================================
// KEYBOARD DISPLAY
// =============================================================================

function closeKeyboard() {
  state.keyboard.open = false;
  const keyboard = $(DOM_IDS.KEYBOARD);

  keyboard.style.transform = "translate3d(0,450px,0)";
  keyboard.style.opacity = "0";
  keyboard.setAttribute("data-state", "closed");

  // Show the open button and broadcast to iframes
  showOpenButton();
  broadcastKeyboardState(false);

  setTimeout(() => {
    if (!state.keyboard.open) {
      keyboard.style.display = "none";
    }
  }, TIMING.KEYBOARD_HIDE_DELAY);

  // Restore scroll position
  const scrollY = window.scrollY;
  if (
    scrollY <= state.scroll.newPos + 50 &&
    scrollY >= state.scroll.newPos - 50
  ) {
    $(DOM_IDS.SCROLL_EXTEND).style.display = "none";
    if (state.scroll.pagePadding) {
      document.body.style.marginBottom = "";
    }
    window.scroll(0, state.scroll.lastPos);
  }
}

function scrollInputIntoView() {
  if (!state.focused.element) return;

  const keyboard = $(DOM_IDS.KEYBOARD);
  const keyboardHeight = keyboard.offsetHeight;
  const elemRect = state.focused.element.getBoundingClientRect();
  const visibleBottom = window.innerHeight - keyboardHeight;

  if (elemRect.bottom > visibleBottom) {
    const padding = 20;
    const scrollAmount = elemRect.bottom - visibleBottom + padding;

    state.scroll.lastPos = window.scrollY;
    state.scroll.newPos = window.scrollY + scrollAmount;

    window.scrollBy({ top: scrollAmount, behavior: "smooth" });
  }
}

async function openKeyboard(posY, posX, force) {
  // Check if in same-origin iframe
  const inIframe = top !== self && window.frameElement !== null;

  if (inIframe) {
    if (!state.focused.element.id) {
      state.focused.element.id = "CVK_E_" + state.iframeCount++;
    }
    chrome.runtime.sendMessage({
      method: "openFromIframe",
      posY,
      posX,
      force,
      frame: window.frameElement.id,
      elem: state.focused.element.id,
    });
    return;
  }

  // Move keyboard to fullscreen element if needed
  if (document.webkitFullscreenElement) {
    document.webkitFullscreenElement.appendChild(state.keyboard.element);
  } else {
    document.body.appendChild(state.keyboard.element);
  }

  // Load layout if needed
  if (state.keyboard.loadedLayout !== state.settings.layout) {
    await loadLayout(state.settings.layout);
  }

  openKeyboardUI(posY);
}

async function loadLayout(layout) {
  try {
    const html = await window.LayoutRenderer.renderLayout(layout);
    if (!html) {
      console.error(`Failed to render keyboard layout: ${layout}`);
      return;
    }
    $(DOM_IDS.MAIN_KBD_PLACEHOLDER).innerHTML = html;
    state.keyboard.loadedLayout = layout;
    initKeyboardKeys(true);
    renderInputType();
  } catch (err) {
    console.error(`Error loading keyboard layout ${layout}:`, err);
  }
}

function openKeyboardUI(posY) {
  clearTimeout(state.closeTimer);
  state.scroll.lastPos = window.scrollY;

  // Hide the open button and broadcast to iframes
  hideOpenButton();
  broadcastKeyboardState(true);

  // Add body padding
  if (!document.body.style.marginBottom || state.scroll.pagePadding) {
    document.body.style.marginBottom = $(DOM_IDS.KEYBOARD).offsetHeight + "px";
    state.scroll.pagePadding = true;
  }

  state.keyboard.open = true;
  const keyboard = $(DOM_IDS.KEYBOARD);
  keyboard.style.display = "";
  keyboard.style.transform = "translate3d(0,0,0)";
  keyboard.style.opacity = "1";
  keyboard.setAttribute("data-state", "open");

  // Set up scroll extend element
  const style = window.getComputedStyle(keyboard);
  const height =
    parseFloat(style.height) +
    parseFloat(style.paddingTop) +
    parseFloat(style.paddingBottom);
  const zoom = parseFloat(style.zoom) || 1;

  const scrollExtend = $(DOM_IDS.SCROLL_EXTEND);
  scrollExtend.style.height = height * zoom + "px";
  scrollExtend.style.display = "block";

  requestAnimationFrame(() => scrollInputIntoView());
}

function renderInputType() {
  const elem = state.focused.element;
  if (!elem) return;

  if (state.focused.type === "input") {
    if (!elem.getAttribute("data-original-type")) {
      elem.setAttribute("data-original-type", elem.type);
    }
    if (elem.type !== "password") {
      elem.type = "text";
    }
  }

  $(DOM_IDS.MAIN_NUMBERS).style.display = "none";
  $(DOM_IDS.NUMBER_BAR_INPUT).style.display = "none";
  $(DOM_IDS.MAIN_KBD).style.display = "";
  state.keyboard.numbersMode = false;

  setClassDisplay(CSS.EMAIL_INPUT_CLASS, "none");

  if (state.focused.type !== "textarea") {
    const origType = elem.getAttribute("data-original-type");
    if (origType === "number" || origType === "tel") {
      $(DOM_IDS.NUMBER_BAR_INPUT).style.display = "";
      $(DOM_IDS.MAIN_KBD).style.display = "none";
    } else if (origType === "email") {
      setClassDisplay(CSS.EMAIL_INPUT_CLASS, "");
    }
  }
}

// =============================================================================
// KEY PRESS HANDLING
// =============================================================================

function handleKeyPress(key, skip = false) {
  // Check if in same-origin iframe
  const inIframe = top !== self && window.frameElement !== null;

  if (inIframe) {
    chrome.runtime.sendMessage({
      method: "clickFromIframe",
      key,
      skip,
      frame: window.frameElement.id,
    });
    return;
  }

  if (key !== "Close") {
    if (!skip && state.focused.element) {
      state.focused.element.focus();
    }
    clearTimeout(state.closeTimer);
  }

  switch (key) {
    case "empty":
      break;

    case "Url":
      if (state.urlBarOpen) {
        // URL bar is open, insert ".com"
        insertTextAtPosition($(DOM_IDS.URL_BAR_TEXTBOX), ".com");
      } else {
        // Open URL bar
        $(DOM_IDS.URL_BAR_TEXTBOX).focus();
      }
      break;

    case "Settings":
      window.open(chrome.runtime.getURL("options.html"));
      break;

    case "&123":
      state.keyboard.numbersMode = !state.keyboard.numbersMode;
      $(DOM_IDS.MAIN_KBD).style.display = state.keyboard.numbersMode
        ? "none"
        : "";
      $(DOM_IDS.MAIN_NUMBERS).style.display = state.keyboard.numbersMode
        ? ""
        : "none";
      break;

    case "Close":
      handleClose();
      break;

    case "Enter":
      handleEnter();
      break;

    case "Shift":
      handleShift();
      break;

    case "Backspace":
      handleBackspace();
      break;

    default:
      insertCharacter(key);
      break;
  }
}

function handleClose() {
  if (state.keyboard.open) {
    closeKeyboard();
  }
}

function handleEnter() {
  const elem = state.focused.element;
  if (!elem) return;

  if (state.focused.type === "textarea") {
    const pos = elem.selectionStart;
    const posEnd = elem.selectionEnd;
    elem.value = elem.value.substr(0, pos) + "\n" + elem.value.substr(posEnd);
    elem.selectionStart = elem.selectionEnd = pos + 1;
  } else if (isContentEditable()) {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      const br = document.createElement("br");
      range.insertNode(br);
      range.setStartAfter(br);
      range.setEndAfter(br);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    dispatchEvent(elem, "input");
    fireOnChange();
  } else {
    const form = elem.closest("form");
    if (form) {
      const submitted =
        clickSubmitButton(form, "input") || clickSubmitButton(form, "button");
      if (!submitted) {
        form.dispatchEvent(new Event("submit", { bubbles: true }));
      }
    }
    elem.dispatchEvent(createKeyboardEvent("keydown", 13));
    closeKeyboard();
  }

  dispatchEvent(elem, "input");
  fireOnChange();
}

function handleShift() {
  state.keyboard.shift = !state.keyboard.shift;
  $(DOM_IDS.MAIN_KBD).className = state.keyboard.shift ? "Shift" : "";
  updateShiftKeys();
}

function handleBackspace() {
  const elem = state.focused.element;
  if (!elem) return;

  if (isContentEditable()) {
    deleteAtCursor();
  } else {
    let pos = elem.selectionStart;
    const posEnd = elem.selectionEnd;
    if (posEnd === pos) pos--;

    elem.value = elem.value.substr(0, pos) + elem.value.substr(posEnd);
    elem.selectionStart = elem.selectionEnd = pos;
  }

  state.focused.changed = true;
  dispatchBackspaceEvents();
}

function insertCharacter(key) {
  const elem = state.focused.element;
  if (!elem) return;

  // Apply shift transformation
  if (state.keyboard.shift) {
    key = applyShiftToCharacter(key);
  }

  if (isContentEditable()) {
    elem.dispatchEvent(createKeyboardEvent("keydown", key.charCodeAt(0)));
    insertTextAtCursor(key);
    state.focused.changed = true;
    resetShiftIfNeeded();
    dispatchKeyEvents(key);
  } else {
    const maxLength = elem.maxLength;
    if (maxLength <= 0 || elem.value.length < maxLength) {
      elem.dispatchEvent(createKeyboardEvent("keydown", key.charCodeAt(0)));
      const pos = elem.selectionStart;
      const posEnd = elem.selectionEnd;
      elem.value = elem.value.substr(0, pos) + key + elem.value.substr(posEnd);
      elem.selectionStart = elem.selectionEnd = pos + 1;
      state.focused.changed = true;
      resetShiftIfNeeded();
      dispatchKeyEvents(key);
    }
  }
}

function dispatchKeyEvents(key) {
  const elem = state.focused.element;
  if (!elem) return;
  elem.dispatchEvent(createKeyboardEvent("keypress", 0, key.charCodeAt(0)));
  elem.dispatchEvent(createKeyboardEvent("keyup", 0, key.charCodeAt(0)));
  dispatchEvent(elem, "input");
  dispatchInputEvent(elem);
}

function dispatchBackspaceEvents() {
  const elem = state.focused.element;
  if (!elem) return;

  const backspaceEvent = (type) =>
    new KeyboardEvent(type, {
      bubbles: true,
      cancelable: true,
      keyCode: 8,
      which: 8,
    });

  elem.dispatchEvent(backspaceEvent("keydown"));
  elem.dispatchEvent(backspaceEvent("keypress"));
  elem.dispatchEvent(backspaceEvent("keyup"));
  dispatchEvent(elem, "input");
}

function resetShiftIfNeeded() {
  if (state.keyboard.shift) {
    state.keyboard.shift = false;
    $(DOM_IDS.MAIN_KBD).className = "";
    updateShiftKeys();
  }
}

function updateShiftKeys() {
  const keys = $$(`.${CSS.KEY_CASE_DISPLAY_CLASS}`);
  for (const key of keys) {
    const attr = state.keyboard.shift ? "data-key-shift" : "data-key";
    key.innerHTML = `<span>${key.getAttribute(attr) || key.getAttribute("data-key")}</span>`;
  }
}

function fireOnChange() {
  if (state.focused.changed && state.focused.element) {
    state.focused.changed = false;
    state.focused.element.dispatchEvent(
      new Event("change", { bubbles: false }),
    );
  }
}

// =============================================================================
// INPUT BINDING
// =============================================================================

function bindInput(elem, focusCallback, clickCallback) {
  if (elem.getAttribute("data-vk-enabled")) return;

  elem.addEventListener("blur", handleInputBlur);
  elem.addEventListener("pointerdown", handleInputPointerDown);
  elem.addEventListener("focus", focusCallback);
  elem.addEventListener("click", clickCallback);
  elem.setAttribute("data-vk-enabled", "true");
}

function handleInputBlur() {
  fireOnChange();

  if (state.focused.element?.getAttribute("data-original-type")) {
    state.focused.element.type =
      state.focused.element.getAttribute("data-original-type");
  }

  state.focused.element = null;
  state.closeTimer = setTimeout(
    () => handleKeyPress("Close"),
    TIMING.CLOSE_TIMER_DELAY,
  );
}

function handleInputPointerDown(event) {
  state.focused.clickY = event.clientY;
  state.focused.clickX = event.clientX;
}

function handleInputEvent(element, isFocus = false, elementType = "input") {
  if (element.disabled || element.readOnly) return;

  clearTimeout(state.closeTimer);
  state.focused.type = elementType;
  fireOnChange();
  state.focused.element = element;

  if (isFocus || !state.keyboard.open) {
    openKeyboard(state.focused.clickY, state.focused.clickX);
  }

  renderInputType();
}

// Event handlers for different input types
function onInputFocus() {
  handleInputEvent(this, true);
}
function onInputClick() {
  handleInputEvent(this);
}
function onTextareaFocus() {
  handleInputEvent(this, true, "textarea");
}
function onTextareaClick() {
  handleInputEvent(this, false, "textarea");
}
function onContentEditableFocus() {
  handleInputEvent(this, true, "contenteditable");
}
function onContentEditableClick() {
  handleInputEvent(this, false, "contenteditable");
}

// =============================================================================
// DOM OBSERVATION
// =============================================================================

function bindNode(node) {
  if (node.nodeName === "INPUT") {
    const type = node.type;
    if (
      ["text", "password", "search", "email", "number", "tel", "url"].includes(
        type,
      )
    ) {
      bindInput(node, onInputFocus, onInputClick);
    }
  } else if (node.nodeName === "TEXTAREA") {
    bindInput(node, onTextareaFocus, onTextareaClick);
  } else if (
    node.getAttribute?.("role") === "textbox" ||
    node.getAttribute?.("contenteditable") === "true"
  ) {
    bindInput(node, onContentEditableFocus, onContentEditableClick);
  }
}

function processAddedNode(node) {
  if (node.nodeType !== Node.ELEMENT_NODE) return;

  bindNode(node);

  if (node.querySelectorAll) {
    const inputs = node.querySelectorAll(
      'input, textarea, [contenteditable="true"], [role="textbox"]',
    );
    for (const input of inputs) {
      bindNode(input);
    }
  }

  if (node.shadowRoot) {
    observeShadowRoot(node.shadowRoot);
  }
}

function processRemovedNode(node) {
  if (node.nodeType !== Node.ELEMENT_NODE) return;

  if (node.shadowRoot && state.shadowObservers.has(node.shadowRoot)) {
    state.shadowObservers.get(node.shadowRoot).disconnect();
    state.shadowObservers.delete(node.shadowRoot);
  }

  if (node.querySelectorAll) {
    for (const el of node.querySelectorAll("*")) {
      if (el.shadowRoot && state.shadowObservers.has(el.shadowRoot)) {
        state.shadowObservers.get(el.shadowRoot).disconnect();
        state.shadowObservers.delete(el.shadowRoot);
      }
    }
  }
}

function observeShadowRoot(shadowRoot) {
  if (state.shadowObservers.has(shadowRoot)) return;

  const shadowObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) processAddedNode(node);
      for (const node of mutation.removedNodes) processRemovedNode(node);
    }
  });

  shadowObserver.observe(shadowRoot, { childList: true, subtree: true });
  state.shadowObservers.set(shadowRoot, shadowObserver);

  const inputs = shadowRoot.querySelectorAll(
    'input, textarea, [contenteditable="true"], [role="textbox"]',
  );
  for (const input of inputs) bindNode(input);
}

function startObserver() {
  if (state.observer) return;

  state.observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) processAddedNode(node);
      for (const node of mutation.removedNodes) processRemovedNode(node);
    }
  });

  state.observer.observe(document.body, { childList: true, subtree: true });
}

// Generator for walking all child nodes including shadow DOM
function* getAllChildNodes(element, includeShadowDom) {
  if (!element.children) return;

  for (const node of element.children) {
    yield node;
    if (includeShadowDom && node.shadowRoot) {
      yield node.shadowRoot;
      yield* getAllChildNodes(node.shadowRoot, includeShadowDom);
    }
    yield* getAllChildNodes(node, includeShadowDom);
  }
}

// =============================================================================
// KEYBOARD KEY INITIALIZATION
// =============================================================================

function initKeyboardKeys(firstTime) {
  if (!firstTime) return;

  const inTopFrame = top === self;
  const isCrossOriginIframe = top !== self && window.frameElement === null;

  if (inTopFrame || isCrossOriginIframe) {
    const keyboard = $(DOM_IDS.KEYBOARD);
    keyboard.onclick = preventDefault;
    keyboard.onpointerdown = preventDefault;
    keyboard.onpointerup = preventDefault;
  }

  // Bind keyboard keys
  const keys = $$(`.${CSS.KEY_CLICK_CLASS}`);
  for (const key of keys) {
    if (key.getAttribute("data-vk-enabled")) continue;
    key.setAttribute("data-vk-enabled", "true");

    key.onclick = function (event) {
      const keyValue = getKeyWithShift(this);
      handleKeyPress(keyValue);
      preventDefault(event);
    };

    key.onpointerdown = preventDefault;
    key.onpointermove = preventDefault;
    key.onpointerup = preventDefault;
  }

  // Settings menu (layout selector)
  if (inTopFrame) {
    initSettingsMenu();
  }
}

async function initSettingsMenu() {
  const result = await storageGet("keyboardLayoutsList");
  const data = result.keyboardLayoutsList;

  const settingsBtn = $(DOM_IDS.SETTINGS_BUTTON);
  if (!settingsBtn) return;

  settingsBtn.style.display = "none";

  if (!data) return;

  const layouts = JSON.parse(data);
  if (layouts.length <= 1) return;

  settingsBtn.style.display = "";
  const ul = $(DOM_IDS.OVERLAY_SETTINGS_UL);
  ul.innerHTML = "";

  for (const layout of layouts) {
    if (!layout.value) continue;

    const li = document.createElement("li");
    li.textContent = layout.value.toUpperCase();
    li.className = CSS.OVERLAY_BUTTON_CLASS;
    li.setAttribute("data-action", "setKeyboard");
    li.setAttribute("data-layout", layout.value);
    ul.appendChild(li);
  }

  // Bind menu buttons
  for (const btn of $$(`.${CSS.OVERLAY_BUTTON_CLASS}`)) {
    btn.onpointerdown = function () {
      for (const b of $$(`.${CSS.OVERLAY_BUTTON_CLASS}`)) {
        b.setAttribute("data-mouse-over", "");
      }
      this.setAttribute("data-mouse-over", "true");
    };

    btn.onpointerup = async function () {
      const action = this.getAttribute("data-action");

      if (action === "setKeyboard") {
        const layout = this.getAttribute("data-layout");
        await storageSet({ keyboardLayout1: layout });
        state.settings.layout = layout;
        setClassDisplay(CSS.EMAIL_INPUT_CLASS, "none");

        if (state.focused.element) {
          await openKeyboard(undefined, undefined, true);
          state.focused.element.focus();
        }
      } else if (action === "openSettings") {
        window.open(chrome.runtime.getURL("options.html"));
      } else if (action === "key") {
        const keyValue = getKeyWithShift(this);
        handleKeyPress(keyValue);
      }
    };
  }

  // Menu toggle buttons
  for (const menuBtn of $$(`.${CSS.MENU_CLASS}`)) {
    menuBtn.onpointerdown = function (event) {
      const menuName = this.getAttribute("data-menu");
      const overlay = $(DOM_IDS.OVERLAY_SETTINGS.replace("Settings", menuName));
      overlay.style.display = "";
      overlay.style.left = event.clientX - overlay.offsetWidth / 2 + "px";
      overlay.style.bottom = window.innerHeight - event.clientY + 20 + "px";
      overlay.setAttribute("data-state", "open");
    };

    menuBtn.onpointerup = function () {
      closeAllOverlays();
    };
  }
}

// =============================================================================
// URL BAR SETUP
// =============================================================================

function initUrlBar() {
  const urlInput = $(DOM_IDS.URL_BAR_TEXTBOX);
  if (!urlInput) return;

  let refocusing = false;
  urlInput.onblur = function (event) {
    if (refocusing) return;

    // Check if focus is moving to keyboard or pointer is over keyboard
    const relatedTarget = event.relatedTarget;
    const keyboard = $(DOM_IDS.KEYBOARD);
    const focusInKeyboard =
      relatedTarget && keyboard && keyboard.contains(relatedTarget);

    if (focusInKeyboard || state.pointerOverKeyboard) {
      // User is interacting with keyboard, keep URL bar visible and re-focus input
      refocusing = true;
      setTimeout(() => {
        urlInput.focus();
        refocusing = false;
      }, 0);
      return;
    }

    $(DOM_IDS.URL_BAR).style.top = "-100px";
    const urlBtn = $(DOM_IDS.URL_BUTTON);
    if (urlBtn) urlBtn.setAttribute("highlight", "");
    setUrlButtonMode(false);
    fireOnChange();
    state.focused.element = null;
    state.closeTimer = setTimeout(
      () => handleKeyPress("Close"),
      TIMING.URL_CLOSE_DELAY,
    );
  };

  urlInput.onfocus = function (event) {
    clearTimeout(state.closeTimer);
    state.focused.type = "input";
    state.focused.element = urlInput;
    $(DOM_IDS.URL_BAR).style.top = "0px";

    const urlBtn = $(DOM_IDS.URL_BUTTON);
    if (urlBtn) urlBtn.setAttribute("highlight", "true");
    setUrlButtonMode(true);

    if (!state.keyboard.open) {
      openKeyboard(0, 0, true);
      urlInput.focus();
      renderInputType();
      setTimeout(() => {
        if (urlBtn) urlBtn.setAttribute("highlight", "true");
      }, TIMING.URL_BAR_HIGHLIGHT_DELAY);
    }

    event.preventDefault();
  };

  urlInput.addEventListener("click", onInputClick);
  urlInput.setAttribute("data-vk-enabled", "true");

  // URL button always visible
  const urlBtn = $(DOM_IDS.URL_BUTTON);
  if (urlBtn) urlBtn.style.display = "";
}

function setUrlButtonMode(isDotCom) {
  const urlBtn = $(DOM_IDS.URL_BUTTON);
  if (!urlBtn) return;

  const span = urlBtn.querySelector("span");
  if (span) {
    span.textContent = isDotCom ? ".com" : "URL";
  }
  state.urlBarOpen = isDotCom;
}

// =============================================================================
// OPEN BUTTON (FLOATING KEYBOARD TRIGGER)
// =============================================================================

function createOpenButton() {
  if ($(DOM_IDS.OPEN_BUTTON)) return; // Already exists

  const button = document.createElement("button");
  button.id = DOM_IDS.OPEN_BUTTON;
  button.type = "button";
  button.innerHTML = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 5H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm-9 3h2v2h-2V8zm0 3h2v2h-2v-2zM8 8h2v2H8V8zm0 3h2v2H8v-2zm-1 2H5v-2h2v2zm0-3H5V8h2v2zm9 7H8v-2h8v2zm0-4h-2v-2h2v2zm0-3h-2V8h2v2zm3 3h-2v-2h2v2zm0-3h-2V8h2v2z"/>
  </svg>`;
  button.title = "Open virtual keyboard";

  button.addEventListener("click", handleOpenButtonClick);
  button.addEventListener("pointerdown", preventDefault);

  document.body.appendChild(button);
  state.openButton = button;
}

function handleOpenButtonClick(event) {
  preventDefault(event);

  // Check if in same-origin iframe
  const inIframe = top !== self && window.frameElement !== null;

  if (inIframe) {
    // Relay to top frame
    chrome.runtime.sendMessage({
      method: "openFromButton",
    });
  } else {
    // Open keyboard directly (no focused element, just show it)
    openKeyboardFromButton();
  }
}

async function openKeyboardFromButton() {
  // Load layout if needed
  if (state.keyboard.loadedLayout !== state.settings.layout) {
    await loadLayout(state.settings.layout);
  }
  openKeyboardUI(0);
}

function showOpenButton() {
  const button = $(DOM_IDS.OPEN_BUTTON);
  if (button) {
    button.setAttribute("data-hidden", "false");
  }
}

function hideOpenButton() {
  const button = $(DOM_IDS.OPEN_BUTTON);
  if (button) {
    button.setAttribute("data-hidden", "true");
  }
}

function broadcastKeyboardState(isOpen) {
  // Only broadcast from top frame
  if (top === self) {
    chrome.runtime.sendMessage({
      method: "keyboardStateChange",
      isOpen,
    });
  }
}

// =============================================================================
// DOCUMENT-LEVEL EVENT HANDLERS
// =============================================================================

function onDocumentPointerUp() {
  closeAllOverlays();
}

// =============================================================================
// SETTINGS LOADING
// =============================================================================

async function loadSettings() {
  const result = await storageGet([
    "openedFirstTime",
    "keyboardLayout1",
    "keyboardLayoutsList",
  ]);

  // First time setup
  if (!result.openedFirstTime) {
    const layouts = await window.LayoutRenderer.getLayouts();
    await storageSet({
      keyboardLayout1: "en",
      keyboardLayoutsList: JSON.stringify(layouts),
      openedFirstTime: "true",
    });

    state.settings.layout = "en";
  } else {
    state.settings.layout = result.keyboardLayout1 || "en";
  }
}

// =============================================================================
// INITIALIZATION
// =============================================================================

async function init() {
  await loadSettings();

  // Bind existing inputs
  for (const node of getAllChildNodes(document, true)) {
    bindNode(node);
  }

  // Start observer for dynamic inputs
  startObserver();

  // Set up document events
  document.addEventListener("pointerup", onDocumentPointerUp);

  // Track pointer over keyboard for blur handling
  const keyboard = $(DOM_IDS.KEYBOARD);
  if (keyboard) {
    keyboard.addEventListener("pointerenter", () => {
      state.pointerOverKeyboard = true;
    });
    keyboard.addEventListener("pointerleave", () => {
      state.pointerOverKeyboard = false;
    });
  }

  // Init UI components
  initUrlBar();
  initKeyboardKeys(true);

  // Create the floating open button
  createOpenButton();
}

// =============================================================================
// MESSAGE HANDLING FOR IFRAME COMMUNICATION
// =============================================================================

if (top === self) {
  chrome.runtime.onMessage.addListener((request) => {
    if (request.method === "openFromIframe") {
      fireOnChange();
      state.focused.element = $(request.frame)?.contentDocument?.getElementById(
        request.elem,
      );

      if (state.focused.element) {
        scrollInputIntoView();
        const elem = state.focused.element;

        if (
          elem.getAttribute?.("role") === "textbox" ||
          elem.getAttribute?.("contenteditable") === "true"
        ) {
          state.focused.type = "contenteditable";
        } else {
          state.focused.type = elem.tagName.toLowerCase();
        }

        renderInputType();
        const pX = request.posX + getElementPositionX($(request.frame));
        const pY = request.posY + getElementPositionY($(request.frame));
        openKeyboard(pY, pX, request.force);
      }
    } else if (request.method === "openFromButton") {
      // Open keyboard from iframe button click (no focused element)
      openKeyboardFromButton();
    } else if (request.method === "clickFromIframe") {
      handleKeyPress(request.key, request.skip);
    } else if (request.method === "openUrlBar") {
      setTimeout(
        () => $(DOM_IDS.URL_BAR_TEXTBOX)?.focus(),
        TIMING.URL_BAR_FOCUS_DELAY,
      );
    }
  });

  // Assign IDs to iframes
  const iframes = $$("iframe");
  let iframeIndex = 0;
  for (const iframe of iframes) {
    if (!iframe.id) iframe.id = "CVK_F_" + iframeIndex++;
  }
}

// Listen for keyboard state broadcasts in all frames (including iframes)
chrome.runtime.onMessage.addListener((request) => {
  if (request.method === "keyboardStateChange") {
    if (request.isOpen) {
      hideOpenButton();
    } else {
      showOpenButton();
    }
  }
});

// =============================================================================
// LOAD KEYBOARD HTML AND CSS
// =============================================================================

async function loadKeyboardHTML() {
  try {
    // Load CSS
    const link = document.createElement("link");
    link.href = chrome.runtime.getURL("style.css");
    link.type = "text/css";
    link.rel = "stylesheet";
    document.head.appendChild(link);

    // Load keyboard HTML
    const response = await fetch(chrome.runtime.getURL("keyboard.html"));
    if (!response.ok) {
      console.error("Failed to load keyboard.html");
      return;
    }
    const html = await response.text();

    state.keyboard.element = document.createElement("div");
    state.keyboard.element.className = "ha"; // Hardware acceleration
    state.keyboard.element.innerHTML = html;
    document.body.appendChild(state.keyboard.element);

    await init();
  } catch (err) {
    console.error("Error loading virtual keyboard:", err);
  }
}

// =============================================================================
// ENTRY POINT
// =============================================================================

function loadCSS() {
  const link = document.createElement("link");
  link.href = chrome.runtime.getURL("style.css");
  link.type = "text/css";
  link.rel = "stylesheet";
  document.head.appendChild(link);
}

const isTopFrame = top === self;
const isCrossOriginIframe = top !== self && window.frameElement === null;

if (isTopFrame || isCrossOriginIframe) {
  loadKeyboardHTML();
} else {
  // Same-origin iframe - load CSS and bind inputs (no keyboard HTML needed)
  loadCSS();
  init();
}
