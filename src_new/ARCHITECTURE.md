# Chrome Virtual Keyboard Refactor Plan

## Goal
Refactor the Chrome virtual keyboard extension with modern architecture while preserving all existing functionality. Create in `src_new/` folder.

## Architecture Overview

```
src_new/
├── manifest.json
├── background.js                 # Simplified message relay
├── style.css                     # CSS custom properties, no !important
├── toggle.html / toggle.js       # Popup (minimal changes)
├── options.html                  # Options page
├── options/
│   ├── script.js                 # Layout selector
│   └── styles.css                # Options page styles
├── buttons/                      # Extension button images
├── core/
│   ├── state.js                  # Observable state store with pub/sub
│   ├── events.js                 # Event bus for decoupled communication
│   ├── config.js                 # Constants, input types, timings
│   └── storage.js                # Chrome storage wrapper
├── keyboard/
│   ├── Keyboard.js               # Main keyboard class (show/hide/render)
│   ├── KeyHandler.js             # Key press logic, synthetic events
│   └── KeyMap.js                 # Key → action mapping
├── input/
│   ├── InputBinder.js            # Input detection and binding
│   ├── InputTracker.js           # Focus/blur tracking, scroll management
│   └── ShadowDOMWatcher.js       # Shadow DOM observer management
├── layouts/
│   ├── layouts.js                # Keep as JS (user preference for comments)
│   └── LayoutRenderer.js         # Clean renderer, returns DOM not strings
└── main.js                       # Entry point, wires everything together
```

## Key Architectural Decisions

### 1. Observable State Store (`core/state.js`)
```javascript
// Separate state slices with subscriptions
const keyboardState = createStore({ open: false, shift: false, mode: 'letters' });
const focusState = createStore({ element: null, type: null, changed: false });
const scrollState = createStore({ lastPos: 0, newPos: 0, pagePadding: false });

// Subscribe to changes
keyboardState.subscribe('shift', updateShiftVisuals);
```

### 2. Event Delegation (`keyboard/Keyboard.js`)
Single listener on keyboard container instead of per-key handlers:
```javascript
this.element.addEventListener('pointerdown', (e) => {
  const key = e.target.closest('[data-key]');
  if (key) this.keyHandler.handle(key.dataset.key);
});
```

### 3. Shadow DOM Encapsulation
Keyboard renders inside Shadow DOM to isolate styles (closed mode, trivial to switch to open for debugging):
```javascript
const host = document.createElement('div');
host.id = 'virtual-keyboard-host';
const shadow = host.attachShadow({ mode: 'closed' }); // Change to 'open' for debugging
shadow.appendChild(keyboardElement);
```

### 4. CSS Full Rewrite with Custom Properties
Clean slate CSS - no porting of old styles, modern patterns throughout:
```css
:host {
  --vk-key-bg: #3a3a3c;
  --vk-key-active-bg: #636366;
  --vk-keyboard-height: 450px;
  --vk-key-radius: 5px;
  --vk-animation-duration: 300ms;
}
.key { background: var(--vk-key-bg); }
```
- No `!important` anywhere
- Shadow DOM scoping eliminates specificity wars
- CSS custom properties enable easy theming
- Unicode characters for icons (⇧ ⌫ ↵ ✕ ⚙)

### 5. Named Constants (`core/config.js`)
```javascript
export const TIMINGS = {
  KEYBOARD_HIDE_DELAY: 500,
  CLOSE_TIMER_DELAY: 500,
  URL_CLOSE_DELAY: 1000,
};
export const Z_INDEX = 10000000;
export const INPUT_TYPES = ['text', 'password', 'search', 'email', 'number', 'tel', 'url'];
```

### 6. Layouts Stay as JS
Per user request - allows comments in layout definitions.

## Features Implemented

### Display Options
- [x] Floating open button (⌨) in lower right corner
- [x] Show/hide open button setting
- [x] Keyboard zoom setting (25-150%)
- [x] Open button hides when keyboard open, shows when closed
- [x] Broadcast keyboard state to sync open button across iframes

### URL Button Behavior
- [x] Shows "URL" normally
- [x] Changes to ".com" when URL bar is focused
- [x] Clicking inserts ".com" when URL bar open

### Input Types
- [x] text, password, search, email, number, tel, url inputs
- [x] textarea elements
- [x] contenteditable elements (including role="textbox")
- [x] Dynamic input detection via MutationObserver
- [x] Shadow DOM input detection

### Keyboard Behavior
- [x] Show/hide with CSS transform animation
- [x] Scroll input into view when keyboard opens
- [x] Restore scroll position on close
- [x] Body margin adjustment for keyboard space
- [x] Fullscreen element support

### Key Handling
- [x] Character insertion at cursor
- [x] Backspace (delete before cursor)
- [x] Enter (submit form or newline)
- [x] Shift toggle with visual update
- [x] &123 numbers/symbols mode
- [x] Close button
- [x] Settings menu
- [x] URL bar

### Special Features
- [x] Email input shows @ key
- [x] Number/tel input shows number keyboard
- [x] Accent overlay menus (long-press)
- [x] 17 keyboard layouts
- [x] Layout switching via settings menu
- [x] Layout persistence in chrome.storage

### Iframe Support
- [x] Same-origin iframe keyboard relay
- [x] Message passing through background script
- [x] Element ID assignment (CVK_F_*, CVK_E_*)

### Events
- [x] Synthetic KeyboardEvent (keydown, keypress, keyup)
- [x] Synthetic InputEvent
- [x] Change event on blur if modified

## Critical Implementation Notes

1. **Close timer pattern**: 500ms delay on blur allows smooth transition between inputs
2. **Pointer tracking**: `pointerOverKeyboard` flag prevents URL bar from closing incorrectly
3. **Type preservation**: Save original input type in data attribute, restore on blur
4. **Hungarian shift mapping**: Special `applyShiftToCharacter()` for ő→Ő, ű→Ű
5. **Form submission**: Enter on input should find and click submit button, or call form.submit()
6. **Contenteditable cursor**: Use Selection API for text insertion/deletion

## File Structure

| File | Purpose |
|------|---------|
| `main.js` | Entry point, initializes all modules, iframe communication |
| `core/config.js` | All constants and configuration |
| `core/state.js` | Observable state management |
| `core/events.js` | Event bus for decoupled communication |
| `core/storage.js` | Chrome storage API wrapper |
| `keyboard/Keyboard.js` | Main keyboard UI, Shadow DOM rendering |
| `keyboard/KeyHandler.js` | Key press logic, synthetic events |
| `keyboard/KeyMap.js` | Key value resolution, shift mapping |
| `input/InputBinder.js` | Detects and binds input elements |
| `input/InputTracker.js` | Focus/blur tracking, scroll management |
| `input/ShadowDOMWatcher.js` | Observes Shadow DOM for inputs |
| `layouts/layouts.js` | 17 keyboard layout definitions |
| `layouts/LayoutRenderer.js` | Renders layouts as DOM elements |
| `background.js` | Service worker for message relay |
| `toggle.html/js` | Extension popup |
| `options.html` | Settings page |
| `options/script.js` | Settings page logic |
| `style.css` | Keyboard styles with CSS custom properties |
