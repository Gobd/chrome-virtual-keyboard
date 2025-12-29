# Adding New Keyboard Layouts

This guide explains how to add a new language layout to the virtual keyboard.

## Quick Start

1. Open `layouts.js`
2. Add your layout object to the `layouts` export
3. Test by selecting your layout in the extension options

## Layout Structure

```javascript
export const layouts = {
  // Layout ID (2-3 letter code, e.g., "en", "fr", "de")
  xx: {
    name: "Language Name (Layout Type)",  // Display name

    // Optional: Custom labels for special keys
    labels: {
      Backspace: "Delete",
      Enter: "Return"
    },

    // Main keyboard rows (typically 3 rows)
    rows: [
      ["q", "w", "e", "r", ...],  // Top row
      ["a", "s", "d", "f", ...],  // Middle row
      ["z", "x", "c", "v", ...],  // Bottom row
    ],

    // Optional: Custom bottom row (default: ["&123", "Language", "Space", "Url", "Settings", "Close"])
    bottomRow: ["&123", "Language", "Space", "Url", "Settings", "Close"],

    // Optional: Long-press overlay menus
    overlays: {
      MenuId: ["a", "à", "á", "â"]
    }
  }
};
```

## Key Types

### Simple Keys

```javascript
"a"; // Types "a", auto-shifts to "A"
"1"; // Types "1", no shift variant
```

### Keys with Explicit Shift

```javascript
{ key: "ü", shift: "Ü" }     // Explicit shift mapping
{ key: "ñ", shift: "Ñ" }
```

### Keys with Long-Press Menu

```javascript
{ key: "e", menu: "MenuId" }  // Long-press shows overlay "MenuId"
```

### Keys with Display Shift (shows shifted char on key face)

```javascript
{ key: "ㅂ", shift: "ㅃ", display: true }  // Korean double consonants
```

### Email Input Toggle Keys

```javascript
"?|@"; // Shows "?" normally, "@" for email inputs
```

Note: The URL button automatically changes to ".com" for email inputs.

## Special Keys

| Key              | Description                          |
| ---------------- | ------------------------------------ |
| `Backspace`      | Standard backspace                   |
| `BackspaceSmall` | Smaller backspace for wide keyboards |
| `Enter`          | Standard enter key                   |
| `EnterBottom`    | Enter in bottom row                  |
| `Shift`          | Shift key with icon                  |
| `Space`          | Spacebar                             |
| `Close`          | Close keyboard button                |
| `Url`            | URL input button                     |
| `&123`           | Toggle numbers/symbols mode          |
| `Settings`       | Settings menu button                 |
| `Language`       | Language switcher (menu)             |
| `_spacer`        | Empty cell for row alignment         |

## Overlay Menus

Long-press menus for accented characters:

```javascript
overlays: {
  FrE: [
    "e", // Base character
    { key: "é", shift: "É" }, // Accented variants
    { key: "è", shift: "È" },
    { key: "ê", shift: "Ê" },
    { key: "ë", shift: "Ë" },
  ];
}
```

Reference the overlay from a key:

```javascript
{ key: "e", menu: "FrE" }
```

## Example: Adding a Portuguese Layout

```javascript
pt: {
  name: "Portuguese (QWERTY)",
  rows: [
    ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "Backspace"],
    [
      "_spacer",
      { key: "a", menu: "PtA" },
      "s", "d", "f", "g", "h", "j", "k", "l",
      { key: "ç", shift: "Ç" },
      "Enter"
    ],
    [
      "Shift",
      "z", "x", "c", "v", "b", "n", "m",
      ",",
      ".",
      "?|@",
      "Shift"
    ]
  ],
  overlays: {
    PtA: [
      "a",
      { key: "á", shift: "Á" },
      { key: "à", shift: "À" },
      { key: "â", shift: "Â" },
      { key: "ã", shift: "Ã" }
    ]
  }
}
```

## Tips

1. **Row alignment**: Use `_spacer` to align rows visually
2. **Accents**: Use overlays for characters with multiple accent variants
3. **Email keys**: Include `?|@` and `,|.com` for email-friendly input
4. **Testing**: Test with various input types (text, email, password)
5. **Shift behavior**: Latin characters auto-shift; use explicit shift for non-Latin scripts

## Non-Latin Scripts

For scripts that don't auto-shift (Cyrillic, Korean, etc.), specify explicit shift mappings:

```javascript
// Russian example
{ key: "й", shift: "Й" },
{ key: "ц", shift: "Ц" },
```

## Custom Bottom Row

Override the default bottom row for layouts that need special arrangements:

```javascript
// Russian - adds punctuation around spacebar
bottomRow: ["&123", "Language", ".", "Space", ",", "Url", "Settings", "Close"];

// Hungarian - puts Enter in bottom row
bottomRow: [
  "&123",
  "Language",
  "Space",
  "Url",
  "Settings",
  "Close",
  "EnterBottom",
];
```
