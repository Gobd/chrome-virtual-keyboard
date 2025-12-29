// Virtual Keyboard Options - Layout selector and display settings

import { STORAGE_KEYS } from "../core/config.js";
import { getLayoutsList } from "../core/storage.js";

const $ = (id) => document.getElementById(id);

function updateSettingsButtonState() {
  const autostart = $("autostart").checked;
  const checkbox = $("showSettingsButton");
  const help = $("showSettingsButtonHelp");

  checkbox.disabled = autostart;
  if (autostart) {
    checkbox.checked = false;
    help.textContent = "Disabled when 'Always show keyboard' is enabled";
    help.style.color = "#c00";
  } else {
    help.textContent =
      "If disabled, access settings via the extension icon in your browser toolbar";
    help.style.color = "#888";
  }
}

function saveDisplaySettings() {
  const showOpenButton = $("showOpenButton").checked;
  const showNumberBar = $("showNumberBar").checked;
  const showLanguageButton = $("showLanguageButton").checked;
  const showSettingsButton = $("showSettingsButton").checked;
  const keyboardZoom = parseInt($("keyboardZoom").value, 10) || 100;
  const keyboardDraggable = $("keyboardDraggable").checked;
  const spacebarCursorSwipe = $("spacebarCursorSwipe").checked;
  const autostart = $("autostart").checked;

  chrome.storage.local.set({
    [STORAGE_KEYS.SHOW_OPEN_BUTTON]: showOpenButton,
    [STORAGE_KEYS.SHOW_NUMBER_BAR]: showNumberBar,
    [STORAGE_KEYS.SHOW_LANGUAGE_BUTTON]: showLanguageButton,
    [STORAGE_KEYS.SHOW_SETTINGS_BUTTON]: showSettingsButton,
    [STORAGE_KEYS.KEYBOARD_ZOOM]: keyboardZoom,
    [STORAGE_KEYS.KEYBOARD_DRAGGABLE]: keyboardDraggable,
    [STORAGE_KEYS.SPACEBAR_CURSOR_SWIPE]: spacebarCursorSwipe,
    [STORAGE_KEYS.AUTOSTART]: autostart,
  });

  $("changeEffect").className = "show";
}

async function loadDisplaySettings() {
  const result = await chrome.storage.local.get([
    STORAGE_KEYS.SHOW_OPEN_BUTTON,
    STORAGE_KEYS.SHOW_NUMBER_BAR,
    STORAGE_KEYS.SHOW_LANGUAGE_BUTTON,
    STORAGE_KEYS.SHOW_SETTINGS_BUTTON,
    STORAGE_KEYS.KEYBOARD_ZOOM,
    STORAGE_KEYS.KEYBOARD_DRAGGABLE,
    STORAGE_KEYS.SPACEBAR_CURSOR_SWIPE,
    STORAGE_KEYS.AUTOSTART,
  ]);

  $("showOpenButton").checked = result[STORAGE_KEYS.SHOW_OPEN_BUTTON] !== false;
  $("showNumberBar").checked = result[STORAGE_KEYS.SHOW_NUMBER_BAR] !== false;
  $("showLanguageButton").checked =
    result[STORAGE_KEYS.SHOW_LANGUAGE_BUTTON] === true;
  $("showSettingsButton").checked =
    result[STORAGE_KEYS.SHOW_SETTINGS_BUTTON] !== false;
  $("keyboardZoom").value = result[STORAGE_KEYS.KEYBOARD_ZOOM] || 100;
  $("keyboardDraggable").checked =
    result[STORAGE_KEYS.KEYBOARD_DRAGGABLE] === true;
  $("spacebarCursorSwipe").checked =
    result[STORAGE_KEYS.SPACEBAR_CURSOR_SWIPE] === true;
  $("autostart").checked = result[STORAGE_KEYS.AUTOSTART] === true;
}

function addLayout() {
  const available = $("al").options;
  const selected = $("sl").options;

  if (!available || available.length === 0) return;

  // Use Set for O(1) existence check instead of O(n) loop
  const existingValues = new Set(Array.from(selected, (opt) => opt.value));

  for (const opt of available) {
    if (!opt.selected || existingValues.has(opt.value)) continue;

    const newOpt = document.createElement("option");
    newOpt.text = opt.text;
    newOpt.value = opt.value;
    $("sl").options.add(newOpt);
  }

  saveLayouts();
}

function removeLayout() {
  const selected = $("sl").options;
  if (!selected || selected.length <= 1) return; // Keep at least one

  for (let index = selected.length - 1; index >= 0; index--) {
    if (selected[index].selected) {
      $("sl").removeChild(selected[index]);
    }
  }

  saveLayouts();
}

function saveLayouts() {
  const layouts = [];
  const selected = $("sl").options;

  if (!selected || selected.length === 0) return;

  for (const opt of selected) {
    if (opt.value) {
      layouts.push({ value: opt.value, name: opt.text });
    }
  }

  if (layouts.length === 0) return;

  chrome.storage.local.set({
    [STORAGE_KEYS.KEYBOARD_LAYOUTS_LIST]: JSON.stringify(layouts),
    [STORAGE_KEYS.KEYBOARD_LAYOUT]: layouts[0].value,
  });

  $("changeEffect").className = "show";
}

async function loadLayouts() {
  const layouts = await getLayoutsList();
  if (!layouts || layouts.length === 0) return;

  // Clear default and populate
  $("sl").innerHTML = "";

  for (const layout of layouts) {
    if (!layout.value) continue;

    const opt = document.createElement("option");
    opt.text = layout.name;
    opt.value = layout.value;
    $("sl").options.add(opt);
  }
}

window.addEventListener("load", async () => {
  document.body.className = "loaded";

  loadLayouts();
  await loadDisplaySettings();
  updateSettingsButtonState();

  $("kl_add").addEventListener("click", addLayout);
  $("kl_remove").addEventListener("click", removeLayout);

  $("showOpenButton").addEventListener("change", saveDisplaySettings);
  $("showNumberBar").addEventListener("change", saveDisplaySettings);
  $("showLanguageButton").addEventListener("change", saveDisplaySettings);
  $("showSettingsButton").addEventListener("change", saveDisplaySettings);
  $("keyboardZoom").addEventListener("change", saveDisplaySettings);
  $("keyboardDraggable").addEventListener("change", saveDisplaySettings);
  $("spacebarCursorSwipe").addEventListener("change", saveDisplaySettings);
  $("autostart").addEventListener("change", () => {
    updateSettingsButtonState();
    saveDisplaySettings();
  });
  $("resetPosition").addEventListener("click", () => {
    chrome.storage.local.set({ [STORAGE_KEYS.KEYBOARD_POSITION]: null });
    $("changeEffect").className = "show";
  });
});
