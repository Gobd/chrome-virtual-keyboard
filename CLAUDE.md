# Chrome Virtual Keyboard Extension

## Architecture Overview

Chrome extension that injects a virtual keyboard into web pages for touch input.

## Key Files

| File | Purpose |
|------|---------|
| `src/core/storage.js` | Chrome storage API wrapper with typed getters/setters |
| `src/core/config.js` | Constants: storage keys, DOM IDs, special keys, KEY_TYPES |
| `src/core/state.js` | Reactive state management (settingsState, keyboardState) |
| `src/layouts/layouts.js` | Keyboard layout definitions (15 languages) |
| `src/layouts/LayoutRenderer.js` | Renders layout objects to DOM |
| `src/keyboard/Keyboard.js` | Main keyboard UI class, creates structure, applies settings |
| `src/options.html` | Settings UI form |
| `src/options/script.js` | Options page logic, loads/saves settings |
| `src/main.js` | Entry point, initialization, settings loading |
| `src/styles/keyboard.css` | All keyboard styling |

## Settings System

**Storage keys** defined in `config.js`:
- `keyboardLayout1` - Currently selected layout
- `keyboardLayoutsList` - JSON array of enabled layouts
- `showOpenButton` - Floating keyboard button visibility
- `showLanguageButton` - Language switcher visibility
- `showSettingsButton` - Settings button visibility
- `showNumberBar` - Top number row visibility (default: true)
- `keyboardZoom` - Scale factor (25-150%)
- `spacebarCursorSwipe` - Spacebar cursor movement feature
- `keyboardDraggable` - Allow repositioning
- `keyboardPosition` - Saved X,Y coordinates
- `autostart` - Auto-open keyboard

**Adding a new setting:**
1. Add storage key constant to `config.js` `STORAGE_KEYS`
2. Add getter/setter to `storage.js`
3. Add default value in `storage.js` `initializeDefaults()`
4. Add to `loadAllSettings()` in `storage.js`
5. Add UI control in `options.html`
6. Wire up in `options/script.js`
7. Use in keyboard via `settingsState.get("settingName")`

## Keyboard Structure

```
#vk-wrapper (shadow root container)
├── #vk-number-bar (top number row: 1-0) - created in createNumberBar()
├── #vk-number-bar-input (number pad for type="number" inputs)
├── #vk-keyboard (main container)
│   ├── #vk-main-keyboard (letter rows)
│   ├── #vk-main-numbers (symbols mode, toggled by &123)
│   └── #vk-bottom-row
└── #vk-drag-handle (if draggable enabled)
```

## Layout Definition Format

```javascript
{
  name: "Display Name",
  rows: [ [...], [...], [...] ],      // 3 main rows
  bottomRow: [...],                    // Custom bottom row (optional)
  overlays: { MenuId: [...] },        // Long-press menus (optional)
  labels: { Backspace: "Delete" }     // Custom key labels (optional)
}
```

**Key types in rows:**
- Simple string: `"a"` - types lowercase, auto-shifts
- Object with shift: `{ key: "ü", shift: "Ü" }`
- Long-press menu: `{ key: "e", menu: "FrE" }`
- Display shift on key: `{ key: "ㅂ", shift: "ㅃ", display: true }`

**Special keys** (defined in `KEY_TYPES` in config.js):
- `Backspace`, `BackspaceSmall`, `Enter`, `EnterBottom`
- `Shift`, `Space`, `Close`, `Url`
- `&123` (numbers toggle), `Settings`, `Language`
- `_spacer` (empty cell for alignment)

## Default Bottom Row

```javascript
["&123", "Language", "Space", "Url", "Settings", "Close"]
```

Buttons are conditionally hidden based on settings in `LayoutRenderer.js`.

## State Management

Two state objects in `state.js`:
- `settingsState` - User preferences from storage
- `keyboardState` - Runtime state (shift, caps, current mode)

Both use reactive pattern: `state.subscribe(key, callback)`

## CSS

All styles in `src/styles/keyboard.css`. Key classes:
- `.vk-key` - Base key styling
- `.vk-number-key` - Number bar keys
- `.vk-special` - Special function keys
- `.vk-active` - Key press state
- `.vk-shifted` - Shift active state
