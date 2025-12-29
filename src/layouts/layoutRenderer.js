// Layout Renderer - Generates keyboard HTML from JSON definitions
// This replaces the individual HTML layout files

// Layouts data will be loaded dynamically
let layoutsData = null;

// Default bottom row used by most layouts
const DEFAULT_BOTTOM_ROW = ["&123", "Settings", "Space", "Close"];

// Key type definitions with their CSS classes
const KEY_TYPES = {
  Backspace: { class: "kbdHB", spanClass: "kBack", label: "\u232B" },
  BackspaceSmall: {
    class: "kbdHBS",
    spanClass: "kBack",
    label: "\u232B",
    dataKey: "Backspace",
  },
  Enter: { class: "kbdHBE", spanClass: "kEnter", label: "\u21B5" },
  EnterBottom: {
    class: "kbdD",
    spanClass: "kEnter",
    label: "\u21B5",
    dataKey: "Enter",
  },
  Shift: { class: "kbdShift", spanClass: "kShift", label: "\u21E7" },
  ShiftLabel: { class: "kbdShift", label: "Shift" },
  Space: { class: "kbdS", dataKey: " ", noLabel: true },
  Close: { class: "kbdD", spanClass: "kClose", label: "\u2715" },
  "&123": { class: "kbdD", spanClass: "kAbc", label: "&123" },
  Settings: {
    class: "kbdD kSettings kMenu",
    spanClass: "kSettings",
    label: "\u2699",
    attrs: { "data-menu": "Settings", width: "10", id: "settingsButton" },
  },
  Url: { class: "kbdH", label: "URL", attrs: { id: "urlButton" } },
  _spacer: { class: "", noLabel: true, style: "width: 1px", noDataKey: true },
  // Bottom row regular keys (for layouts with punctuation in bottom row)
  ".": { class: "kbdH", label: ".", dataKey: "." },
  ",": { class: "kbdH", label: ",", dataKey: "," },
};

// Parse special key syntax like "?|@" (shown/hidden based on input type)
function parseKey(keyDef) {
  if (typeof keyDef === "string") {
    // Check for email input toggle syntax: "?|@" means ? normally, @ for email
    if (keyDef.includes("|")) {
      const [normal, email] = keyDef.split("|");
      return [
        { key: normal, class: "kbHideEmailInput kbdH", noCase: true },
        { key: email, class: "kbEmailInput kbdH", noCase: true },
      ];
    }
    return { key: keyDef };
  }
  return keyDef;
}

// Generate HTML for a single key
function renderKey(keyDef, layoutId, labels = {}) {
  const parsed = parseKey(keyDef);

  // Handle split keys (email toggle)
  if (Array.isArray(parsed)) {
    return parsed.map((k) => renderSingleKey(k, layoutId, labels)).join("");
  }

  return renderSingleKey(parsed, layoutId, labels);
}

function renderSingleKey(keyDef, layoutId, labels) {
  const keyType = KEY_TYPES[keyDef.key || keyDef];

  if (keyType) {
    return renderSpecialKey(keyDef.key || keyDef, keyType, labels);
  }

  return renderRegularKey(keyDef, layoutId);
}

function renderSpecialKey(key, keyType, labels) {
  const attrs = [];
  const dataKey =
    keyType.dataKey !== undefined
      ? keyType.dataKey
      : key === "Settings"
        ? "empty"
        : key;

  // Build class string
  let classStr = keyType.class;
  if (!keyType.noDataKey && key !== "_spacer") {
    classStr += " kbdClick";
  }

  attrs.push(`class="${classStr}"`);

  if (!keyType.noDataKey) {
    attrs.push(`data-key="${dataKey}"`);
  }

  if (keyType.style) {
    attrs.push(`style="${keyType.style}"`);
  }

  // Add additional attributes
  if (keyType.attrs) {
    for (const [attrKey, attrVal] of Object.entries(keyType.attrs)) {
      attrs.push(`${attrKey}="${attrVal}"`);
    }
  }

  // Build span content
  let spanContent = "";
  if (keyType.spanClass && !keyType.noLabel) {
    // Has both class and label (e.g., &123 button)
    const label = labels[key] || keyType.label || "";
    spanContent = `<span class="${keyType.spanClass}">${label}</span>`;
  } else if (keyType.spanClass) {
    // Has class but no label (e.g., Shift icon, Close icon)
    spanContent = `<span class="${keyType.spanClass}"></span>`;
  } else if (!keyType.noLabel) {
    const label = labels[key] || keyType.label || key;
    spanContent = `<span>${label}</span>`;
  } else {
    spanContent = "<span></span>";
  }

  return `<td ${attrs.join(" ")}>${spanContent}</td>`;
}

function renderRegularKey(keyDef, layoutId) {
  const key = typeof keyDef === "string" ? keyDef : keyDef.key;
  const shift = typeof keyDef === "object" ? keyDef.shift : null;
  const menu = typeof keyDef === "object" ? keyDef.menu : null;
  const display = typeof keyDef === "object" ? keyDef.display : false;
  const noCase = typeof keyDef === "object" ? keyDef.noCase : false;
  const customClass = typeof keyDef === "object" ? keyDef.class : null;

  const classes = [];
  if (customClass) {
    classes.push(customClass);
  } else {
    classes.push("kbdH");
  }
  if (!noCase) {
    classes.push("kdbCase");
  }
  classes.push("kbdClick");

  if (menu) {
    classes.push("kMenu");
  }

  if (display) {
    classes.push("keyCaseDisplay");
  }

  const attrs = [`class="${classes.join(" ")}"`, `data-key="${key}"`];

  if (shift) {
    attrs.push(`data-key-shift="${shift}"`);
  }

  if (menu) {
    attrs.push(`data-menu="${menu}"`);
    attrs.push('data-hover-only="true"');
  }

  return `<td ${attrs.join(" ")}><span>${key}</span></td>`;
}

// Generate HTML for a row of keys
function renderRow(keys, layoutId, labels, isFirst = false) {
  const keyHtml = keys
    .map((k) => renderKey(k, layoutId, labels))
    .join("\n    ");

  return `<table cellpadding="2" class="virtualKeyboardChromeExtensionMainKeys">
  <tr>
    ${keyHtml}
  </tr>
</table>`;
}

// Generate HTML for overlay menus
function renderOverlay(overlayId, items, layoutId) {
  const listItems = items
    .map((item) => {
      const key = typeof item === "string" ? item : item.key;
      const shift = typeof item === "object" ? item.shift : null;
      const display = typeof item === "object" ? item.display : false;

      const classes = [
        "virtualKeyboardChromeExtensionOverlayButton",
        "kdbCase",
      ];
      if (display) {
        classes.push("keyCaseDisplay");
      }

      const attrs = [
        `class="${classes.join(" ")}"`,
        'data-action="key"',
        `data-key="${key}"`,
      ];

      if (shift) {
        attrs.push(`data-key-shift="${shift}"`);
      }

      return `    <li ${attrs.join(" ")}>${key}</li>`;
    })
    .join("\n");

  return `<div
  id="virtualKeyboardChromeExtensionOverlay${overlayId}"
  data-state="closed"
  class="virtualKeyboardChromeExtensionOverlay"
  style="display: none"
>
  <ul class="virtualKeyboardChromeExtensionOverlayKeysUl">
${listItems}
  </ul>
</div>`;
}

// Generate the default bottom row
function renderBottomRow(customRow, labels = {}) {
  const row = customRow || DEFAULT_BOTTOM_ROW;
  return renderRow(row, null, labels);
}

// Get layouts data from the global KEYBOARD_LAYOUTS (loaded from layouts.js)
function loadLayoutsData() {
  if (layoutsData) return layoutsData;

  if (window.KEYBOARD_LAYOUTS) {
    layoutsData = window.KEYBOARD_LAYOUTS;
    return layoutsData;
  }

  console.error(
    "KEYBOARD_LAYOUTS not found - ensure layouts.js is loaded first",
  );
  return null;
}

// Main render function - generates complete keyboard HTML for a layout
function renderLayout(layoutId) {
  const data = loadLayoutsData();
  if (!data) return "";

  const layout = data[layoutId];
  if (!layout) {
    console.error(`Layout not found: ${layoutId}`);
    return "";
  }

  const parts = [];
  const labels = layout.labels || {};

  // Render overlays first (they appear before the main keyboard)
  if (layout.overlays) {
    for (const [overlayId, items] of Object.entries(layout.overlays)) {
      parts.push(renderOverlay(overlayId, items, layoutId));
    }
  }

  // Render main rows
  for (let i = 0; i < layout.rows.length; i++) {
    parts.push(renderRow(layout.rows[i], layoutId, labels, i === 0));
  }

  // Render bottom row (settings, space, close, etc.)
  parts.push(renderBottomRow(layout.bottomRow, labels));

  return parts.join("\n");
}

// Get list of available layouts
function getLayouts() {
  const data = loadLayoutsData();
  if (!data) return [];

  return Object.entries(data).map(([value, layoutData]) => ({
    value,
    name: layoutData.name,
  }));
}

// Expose globally for use in script.js
window.LayoutRenderer = {
  renderLayout,
  getLayouts,
  loadLayoutsData,
};
