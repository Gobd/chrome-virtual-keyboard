// Virtual Keyboard - Chrome Extension
// Refactored: async/await, pointer events, simplified state

const LAYOUTS = [
  { value: "en", name: "English (QWERTY)" },
  { value: "fr", name: "French (AZERTY)" },
  { value: "de", name: "German (QWERTZ)" },
  { value: "it", name: "Italian (QWERTY)" },
  { value: "kr", name: "Korean" },
  { value: "hu", name: "Magyar (QWERTY)" },
  { value: "no", name: "Norwegian (QWERTY)" },
  { value: "pl", name: "Polish (QWERTY)" },
  { value: "ru", name: "Russian (JCUKEN)" },
  { value: "sl", name: "Slovenian (QWERTZ)" },
  { value: "es", name: "Spanish (QWERTY)" },
  { value: "sw", name: "Swedish (QWERTY)" },
  { value: "ta", name: "Tamil 99" },
  { value: "cs", name: "Czech (QWERTY)" },
  { value: "ua", name: "Ukrainian (QWERTY)" },
];

// Global state
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
  },
  scroll: {
    lastPos: 0,
    newPos: 0,
    pagePadding: false,
  },
  settings: {
    layout: "en",
  },
  closeTimer: null,
  iframeCount: 0,
};

// Storage helpers - use chrome.storage directly
async function storageGet(keys) {
  return chrome.storage.local.get(keys);
}

async function storageSet(obj) {
  return chrome.storage.local.set(obj);
}

// Event helpers
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

// DOM helpers
function $(id) {
  return document.getElementById(id);
}

function $$(selector, root = document) {
  return root.querySelectorAll(selector);
}

// ContentEditable helpers
function isContentEditable() {
  return state.focused.type === "contenteditable";
}

function getSelection() {
  const sel = window.getSelection();
  return sel.rangeCount > 0 ? sel.getRangeAt(0) : null;
}

function insertTextAtCursor(text) {
  const sel = window.getSelection();
  if (sel.rangeCount > 0) {
    const range = sel.getRangeAt(0);
    range.deleteContents();
    const textNode = document.createTextNode(text);
    range.insertNode(textNode);
    range.setStartAfter(textNode);
    range.setEndAfter(textNode);
    sel.removeAllRanges();
    sel.addRange(range);
  }
}

function deleteAtCursor() {
  const sel = window.getSelection();
  if (sel.rangeCount > 0) {
    const range = sel.getRangeAt(0);
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

// Keyboard display
function closeKeyboard() {
  state.keyboard.open = false;
  const kbd = $("virtualKeyboardChromeExtension");

  kbd.style.transform = "translate3d(0,450px,0)";
  kbd.style.opacity = "0";
  kbd.setAttribute("_state", "closed");

  setTimeout(() => {
    if (!state.keyboard.open) {
      kbd.style.display = "none";
    }
  }, 500);

  // Restore scroll position
  const scrollY = window.scrollY;
  if (
    scrollY <= state.scroll.newPos + 50 &&
    scrollY >= state.scroll.newPos - 50
  ) {
    $("virtualKeyboardChromeExtensionOverlayScrollExtend").style.display =
      "none";
    if (state.scroll.pagePadding) {
      document.body.style.marginBottom = "";
    }
    window.scroll(0, state.scroll.lastPos);
  }
}

function scrollInputIntoView() {
  if (!state.focused.element) return;

  const kbd = $("virtualKeyboardChromeExtension");
  const keyboardHeight = kbd.offsetHeight;
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
    const url = chrome.runtime.getURL(`layouts/keyboard_${layout}.html`);
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Failed to load keyboard layout: ${layout}`);
      return;
    }
    const html = await response.text();
    $("virtualKeyboardChromeExtensionMainKbdPH").innerHTML = html;
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

  // Add body padding
  if (!document.body.style.marginBottom || state.scroll.pagePadding) {
    document.body.style.marginBottom =
      $("virtualKeyboardChromeExtension").offsetHeight + "px";
    state.scroll.pagePadding = true;
  }

  state.keyboard.open = true;
  const kbd = $("virtualKeyboardChromeExtension");
  kbd.style.display = "";
  kbd.style.transform = "translate3d(0,0,0)";
  kbd.style.opacity = "1";
  kbd.setAttribute("_state", "open");

  // Set up scroll extend element
  const style = window.getComputedStyle(kbd);
  const height =
    parseFloat(style.height) +
    parseFloat(style.paddingTop) +
    parseFloat(style.paddingBottom);
  const zoom = parseFloat(style.zoom) || 1;

  const scrollExtend = $("virtualKeyboardChromeExtensionOverlayScrollExtend");
  scrollExtend.style.height = height * zoom + "px";
  scrollExtend.style.display = "block";

  requestAnimationFrame(() => scrollInputIntoView());
}

function renderInputType() {
  const elem = state.focused.element;

  if (state.focused.type === "input") {
    if (!elem.getAttribute("_originalType")) {
      elem.setAttribute("_originalType", elem.type);
    }
    if (elem.type !== "password") {
      elem.type = "text";
    }
  }

  $("virtualKeyboardChromeExtensionMainNumbers").style.display = "none";
  $("virtualKeyboardChromeExtensionNumberBarKbdInput").style.display = "none";
  $("virtualKeyboardChromeExtensionMainKbd").style.display = "";
  state.keyboard.numbersMode = false;

  setClassDisplay("kbEmailInput", "none");

  if (state.focused.type !== "textarea") {
    const origType = elem.getAttribute("_originalType");
    if (origType === "number" || origType === "tel") {
      $("virtualKeyboardChromeExtensionNumberBarKbdInput").style.display = "";
      $("virtualKeyboardChromeExtensionMainKbd").style.display = "none";
    } else if (origType === "email") {
      setClassDisplay("kbEmailInput", "");
    }
  }
}

// Key press handling
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
      $("virtualKeyboardChromeExtensionUrlBarTextBox").focus();
      break;

    case "Settings":
      window.open(chrome.runtime.getURL("options.html"));
      break;

    case "&123":
      state.keyboard.numbersMode = !state.keyboard.numbersMode;
      $("virtualKeyboardChromeExtensionMainKbd").style.display = state.keyboard
        .numbersMode
        ? "none"
        : "";
      $("virtualKeyboardChromeExtensionMainNumbers").style.display = state
        .keyboard.numbersMode
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
    const sel = window.getSelection();
    if (sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      const br = document.createElement("br");
      range.insertNode(br);
      range.setStartAfter(br);
      range.setEndAfter(br);
      sel.removeAllRanges();
      sel.addRange(range);
    }
    dispatchEvent(elem, "input");
    fireOnChange();
  } else {
    const form = getParentByTagName(elem, "form");
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
  $("virtualKeyboardChromeExtensionMainKbd").className = state.keyboard.shift
    ? "Shift"
    : "";
  updateShiftKeys();
}

function handleBackspace() {
  const elem = state.focused.element;

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

  // Apply shift
  if (state.keyboard.shift) {
    if (key.charCodeAt(0) >= 97 && key.charCodeAt(0) <= 122) {
      key = String.fromCharCode(key.charCodeAt(0) - 32);
    }
    if (key.charCodeAt(0) >= 224 && key.charCodeAt(0) <= 252) {
      key = String.fromCharCode(key.charCodeAt(0) - 32);
    }
    // Hungarian special chars
    if (key.charCodeAt(0) === 337 || key.charCodeAt(0) === 369) {
      key = String.fromCharCode(key.charCodeAt(0) - 1);
    }
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
  elem.dispatchEvent(createKeyboardEvent("keypress", 0, key.charCodeAt(0)));
  elem.dispatchEvent(createKeyboardEvent("keyup", 0, key.charCodeAt(0)));
  dispatchEvent(elem, "input");
  dispatchInputEvent(elem);
}

function dispatchBackspaceEvents() {
  const elem = state.focused.element;
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
    $("virtualKeyboardChromeExtensionMainKbd").className = "";
    updateShiftKeys();
  }
}

function updateShiftKeys() {
  const keys = $$(".keyCaseDisplay");
  for (const key of keys) {
    const attr = state.keyboard.shift ? "_keyC" : "_key";
    key.innerHTML = `<span>${key.getAttribute(attr) || key.getAttribute("_key")}</span>`;
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

// Utility functions
function getParentByTagName(el, tagName) {
  let t = el.parentNode;
  tagName = tagName.toLowerCase();
  let count = 0;

  while (count < 500 && t) {
    if (t.tagName?.toLowerCase() === tagName) return t;
    t = t.parentNode;
    count++;
  }
  return null;
}

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
  let cur = 0;
  while (obj?.offsetParent) {
    cur += obj[type];
    obj = obj.offsetParent;
  }
  return cur;
}

function getElementPositionY(obj) {
  return getElementPosition(obj, "offsetTop");
}

function getElementPositionX(obj) {
  return getElementPosition(obj, "offsetLeft");
}

function setClassDisplay(className, value) {
  for (const item of $$(`.${className}`)) {
    item.style.display = value;
  }
}

function preventDefault(e) {
  e.preventDefault();
  e.stopPropagation();
}

// Input binding
function bindInput(elem, focusCallback, clickCallback) {
  if (elem.getAttribute("_vkEnabled")) return;

  elem.addEventListener("blur", handleInputBlur);
  elem.addEventListener("pointerdown", handleInputPointerDown);
  elem.addEventListener("focus", focusCallback);
  elem.addEventListener("click", clickCallback);
  elem.setAttribute("_vkEnabled", "true");
}

function handleInputBlur() {
  fireOnChange();

  if (state.focused.element?.getAttribute("_originalType")) {
    state.focused.element.type =
      state.focused.element.getAttribute("_originalType");
  }

  state.focused.element = null;
  state.closeTimer = setTimeout(() => handleKeyPress("Close"), 500);
}

function handleInputPointerDown(e) {
  state.focused.clickY = e.clientY;
  state.focused.clickX = e.clientX;
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

// DOM observation
let observer = null;
const shadowObservers = new WeakMap();

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

  if (node.shadowRoot && shadowObservers.has(node.shadowRoot)) {
    shadowObservers.get(node.shadowRoot).disconnect();
    shadowObservers.delete(node.shadowRoot);
  }

  if (node.querySelectorAll) {
    for (const el of node.querySelectorAll("*")) {
      if (el.shadowRoot && shadowObservers.has(el.shadowRoot)) {
        shadowObservers.get(el.shadowRoot).disconnect();
        shadowObservers.delete(el.shadowRoot);
      }
    }
  }
}

function observeShadowRoot(shadowRoot) {
  if (shadowObservers.has(shadowRoot)) return;

  const shadowObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) processAddedNode(node);
      for (const node of mutation.removedNodes) processRemovedNode(node);
    }
  });

  shadowObserver.observe(shadowRoot, { childList: true, subtree: true });
  shadowObservers.set(shadowRoot, shadowObserver);

  const inputs = shadowRoot.querySelectorAll(
    'input, textarea, [contenteditable="true"], [role="textbox"]',
  );
  for (const input of inputs) bindNode(input);
}

function startObserver() {
  if (observer) return;

  observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) processAddedNode(node);
      for (const node of mutation.removedNodes) processRemovedNode(node);
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
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

// Keyboard key initialization
function initKeyboardKeys(firstTime) {
  if (!firstTime) return;

  const inTopFrame = top === self;
  const isCrossOriginIframe = top !== self && window.frameElement === null;

  if (inTopFrame || isCrossOriginIframe) {
    const kbd = $("virtualKeyboardChromeExtension");
    kbd.onclick = preventDefault;
    kbd.onpointerdown = preventDefault;
    kbd.onpointerup = preventDefault;
  }

  // Bind keyboard keys
  const keys = $$(".kbdClick");
  for (const key of keys) {
    if (key.getAttribute("_vkEnabled")) continue;
    key.setAttribute("_vkEnabled", "true");

    key.onclick = function (e) {
      let k = this.getAttribute("_key");
      if (state.keyboard.shift && this.getAttribute("_keyC")) {
        k = this.getAttribute("_keyC");
      }
      handleKeyPress(k);
      preventDefault(e);
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

  const settingsBtn = $("settingsButton");
  if (!settingsBtn) return;

  settingsBtn.style.display = "none";

  if (!data) return;

  const layouts = JSON.parse(data);
  if (layouts.length <= 1) return;

  settingsBtn.style.display = "";
  const ul = $("virtualKeyboardChromeExtensionOverlaySettingsUl");
  ul.innerHTML = "";

  for (const layout of layouts) {
    if (!layout.value) continue;

    const li = document.createElement("li");
    li.textContent = layout.value.toUpperCase();
    li.className = "virtualKeyboardChromeExtensionOverlayButton";
    li.setAttribute("_action", "setKeyboard");
    li.setAttribute("_layout", layout.value);
    ul.appendChild(li);
  }

  // Bind menu buttons
  for (const btn of $$(".virtualKeyboardChromeExtensionOverlayButton")) {
    btn.onpointerdown = function () {
      for (const b of $$(".virtualKeyboardChromeExtensionOverlayButton")) {
        b.setAttribute("mo", "");
      }
      this.setAttribute("mo", "true");
    };

    btn.onpointerup = async function () {
      const action = this.getAttribute("_action");

      if (action === "setKeyboard") {
        const layout = this.getAttribute("_layout");
        await storageSet({ keyboardLayout1: layout });
        state.settings.layout = layout;
        setClassDisplay("kbEmailInput", "none");

        if (state.focused.element) {
          await openKeyboard(undefined, undefined, true);
          state.focused.element.focus();
        }
      } else if (action === "openSettings") {
        window.open(chrome.runtime.getURL("options.html"));
      } else if (action === "key") {
        let k = this.getAttribute("_key");
        if (state.keyboard.shift && this.getAttribute("_keyC")) {
          k = this.getAttribute("_keyC");
        }
        handleKeyPress(k);
      }
    };
  }

  // Menu toggle buttons
  for (const menuBtn of $$(".kMenu")) {
    menuBtn.onpointerdown = function (e) {
      const overlay = $(
        "virtualKeyboardChromeExtensionOverlay" + this.getAttribute("_menu"),
      );
      overlay.style.display = "";
      overlay.style.left = e.clientX - overlay.offsetWidth / 2 + "px";
      overlay.style.bottom = window.innerHeight - e.clientY + 20 + "px";
      overlay.setAttribute("_state", "open");
    };

    menuBtn.onpointerup = function (e) {
      const overlays = $$(".virtualKeyboardChromeExtensionOverlay");
      for (const o of overlays) {
        o.setAttribute("_state", "closed");
      }
      setTimeout(() => {
        for (const o of overlays) o.style.display = "none";
      }, 500);
    };
  }
}

// URL bar setup
function initUrlBar() {
  const urlInput = $("virtualKeyboardChromeExtensionUrlBarTextBox");
  if (!urlInput) return;

  urlInput.onblur = function () {
    $("virtualKeyboardChromeExtensionUrlBar").style.top = "-100px";
    const urlBtn = $("urlButton");
    if (urlBtn) urlBtn.setAttribute("highlight", "");
    fireOnChange();
    state.focused.element = null;
    state.closeTimer = setTimeout(() => handleKeyPress("Close"), 1000);
  };

  urlInput.onfocus = function (e) {
    clearTimeout(state.closeTimer);
    state.focused.type = "input";
    state.focused.element = urlInput;
    $("virtualKeyboardChromeExtensionUrlBar").style.top = "0px";

    const urlBtn = $("urlButton");
    if (urlBtn) urlBtn.setAttribute("highlight", "true");

    if (!state.keyboard.open) {
      openKeyboard(0, 0, true);
      urlInput.focus();
      renderInputType();
      setTimeout(() => {
        if (urlBtn) urlBtn.setAttribute("highlight", "true");
      }, 500);
    }

    e.preventDefault();
  };

  urlInput.addEventListener("click", onInputClick);
  urlInput.setAttribute("_vkEnabled", "true");

  // URL button always visible
  const urlBtn = $("urlButton");
  if (urlBtn) urlBtn.style.display = "";
}

// Document-level event handlers
function onDocumentPointerUp() {
  // Close overlays
  const overlays = $$(".virtualKeyboardChromeExtensionOverlay");
  for (const o of overlays) {
    o.setAttribute("_state", "closed");
  }
  setTimeout(() => {
    for (const o of overlays) o.style.display = "none";
  }, 500);
}

// Settings loading
async function loadSettings() {
  const result = await storageGet([
    "openedFirstTime",
    "keyboardLayout1",
    "keyboardLayoutsList",
  ]);

  // First time setup
  if (!result.openedFirstTime) {
    await storageSet({
      keyboardLayout1: "en",
      keyboardLayoutsList: JSON.stringify(LAYOUTS),
      openedFirstTime: "true",
    });

    state.settings.layout = "en";
  } else {
    state.settings.layout = result.keyboardLayout1 || "en";
  }
}

// Initialize extension
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

  // Init UI components
  initUrlBar();
  initKeyboardKeys(true);
}

// Message handling for iframe communication
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
    } else if (request.method === "clickFromIframe") {
      handleKeyPress(request.key, request.skip);
    } else if (request === "openUrlBar") {
      setTimeout(
        () => $("virtualKeyboardChromeExtensionUrlBarTextBox")?.focus(),
        200,
      );
    }
  });

  // Assign IDs to iframes
  const iframes = $$("iframe");
  let i = 0;
  for (const iframe of iframes) {
    if (!iframe.id) iframe.id = "CVK_F_" + i++;
  }
}

// Load keyboard HTML and CSS
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

// Entry point
const isTopFrame = top === self;
const isCrossOriginIframe = top !== self && window.frameElement === null;

if (isTopFrame || isCrossOriginIframe) {
  loadKeyboardHTML();
} else {
  // Same-origin iframe - just bind inputs
  init();
}
