// Virtual Keyboard Options - Layout selector and display settings

import { STORAGE_KEYS } from '../core/config.js';
import { getLayoutsList } from '../core/storage.js';

const $ = (id) => document.getElementById(id);

function saveDisplaySettings() {
  const showOpenButton = $('showOpenButton').checked;
  const keyboardZoom = parseInt($('keyboardZoom').value, 10) || 100;

  chrome.storage.local.set({
    [STORAGE_KEYS.SHOW_OPEN_BUTTON]: showOpenButton,
    [STORAGE_KEYS.KEYBOARD_ZOOM]: keyboardZoom,
  });

  $('changeEffect').className = 'show';
}

async function loadDisplaySettings() {
  const result = await chrome.storage.local.get([
    STORAGE_KEYS.SHOW_OPEN_BUTTON,
    STORAGE_KEYS.KEYBOARD_ZOOM,
  ]);

  $('showOpenButton').checked = result[STORAGE_KEYS.SHOW_OPEN_BUTTON] !== false;
  $('keyboardZoom').value = result[STORAGE_KEYS.KEYBOARD_ZOOM] || 100;
}

function addLayout() {
  const available = $('al').options;
  const selected = $('sl').options;

  if (!available || available.length === 0) return;

  for (const opt of available) {
    if (!opt.selected) continue;

    // Check if already exists
    let exists = false;
    for (const existingOpt of selected) {
      if (existingOpt.value === opt.value) {
        exists = true;
        break;
      }
    }

    if (!exists) {
      const newOpt = document.createElement('option');
      newOpt.text = opt.text;
      newOpt.value = opt.value;
      $('sl').options.add(newOpt);
    }
  }

  saveLayouts();
}

function removeLayout() {
  const selected = $('sl').options;
  if (!selected || selected.length <= 1) return; // Keep at least one

  for (let index = selected.length - 1; index >= 0; index--) {
    if (selected[index].selected) {
      $('sl').removeChild(selected[index]);
    }
  }

  saveLayouts();
}

function saveLayouts() {
  const layouts = [];
  const selected = $('sl').options;

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

  $('changeEffect').className = 'show';
}

async function loadLayouts() {
  const layouts = await getLayoutsList();
  if (!layouts || layouts.length === 0) return;

  // Clear default and populate
  $('sl').innerHTML = '';

  for (const layout of layouts) {
    if (!layout.value) continue;

    const opt = document.createElement('option');
    opt.text = layout.name;
    opt.value = layout.value;
    $('sl').options.add(opt);
  }
}

window.addEventListener('load', () => {
  document.body.className = 'loaded';

  loadLayouts();
  loadDisplaySettings();

  $('kl_add').addEventListener('click', addLayout);
  $('kl_remove').addEventListener('click', removeLayout);

  $('showOpenButton').addEventListener('change', saveDisplaySettings);
  $('keyboardZoom').addEventListener('change', saveDisplaySettings);
});
