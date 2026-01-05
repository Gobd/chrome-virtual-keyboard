// Virtual Keyboard Options - Layout selector and display settings

import { STORAGE_KEYS } from "../core/config.js";
import { getLayoutsList } from "../core/storage.js";
import * as VoiceInput from "../voice/VoiceInput.js";

const $ = (id) => document.getElementById(id);

// Track if model download is in progress
let isDownloading = false;
// Track which model is currently loaded
let loadedModelKey = null;

let zoomLocked = true;

function saveDisplaySettings() {
  const showOpenButton = $("showOpenButton").checked;
  const showNumberBar = $("showNumberBar").checked;
  const showLanguageButton = $("showLanguageButton").checked;
  const showSettingsButton = $("showSettingsButton").checked;
  const showUrlButton = $("showUrlButton").checked;
  const showCloseButton = $("showCloseButton").checked;
  const showNumbersButton = $("showNumbersButton").checked;
  const keyboardZoomWidth = parseInt($("keyboardZoomWidth").value, 10) || 100;
  const keyboardZoomHeight = parseInt($("keyboardZoomHeight").value, 10) || 100;
  const keyboardDraggable = $("keyboardDraggable").checked;
  const spacebarCursorSwipe = $("spacebarCursorSwipe").checked;
  const stickyShift = $("stickyShift").checked;
  const autoCaps = $("autoCaps").checked;
  const autostart = $("autostart").checked;
  const voiceEnabled = $("voiceEnabled").checked;
  const voiceModel = $("voiceModel").value;
  const voiceLanguage = $("voiceLanguage").value;
  const keyRepeatEnabled = $("keyRepeatEnabled").checked;
  const keyRepeatDelay = parseInt($("keyRepeatDelay").value, 10) || 400;
  const keyRepeatSpeed = parseInt($("keyRepeatSpeed").value, 10) || 75;

  chrome.storage.local.set({
    [STORAGE_KEYS.SHOW_OPEN_BUTTON]: showOpenButton,
    [STORAGE_KEYS.SHOW_NUMBER_BAR]: showNumberBar,
    [STORAGE_KEYS.SHOW_LANGUAGE_BUTTON]: showLanguageButton,
    [STORAGE_KEYS.SHOW_SETTINGS_BUTTON]: showSettingsButton,
    [STORAGE_KEYS.SHOW_URL_BUTTON]: showUrlButton,
    [STORAGE_KEYS.SHOW_CLOSE_BUTTON]: showCloseButton,
    [STORAGE_KEYS.SHOW_NUMBERS_BUTTON]: showNumbersButton,
    [STORAGE_KEYS.KEYBOARD_ZOOM_WIDTH]: keyboardZoomWidth,
    [STORAGE_KEYS.KEYBOARD_ZOOM_HEIGHT]: keyboardZoomHeight,
    [STORAGE_KEYS.KEYBOARD_ZOOM_LOCKED]: zoomLocked,
    [STORAGE_KEYS.KEYBOARD_DRAGGABLE]: keyboardDraggable,
    [STORAGE_KEYS.SPACEBAR_CURSOR_SWIPE]: spacebarCursorSwipe,
    [STORAGE_KEYS.STICKY_SHIFT]: stickyShift,
    [STORAGE_KEYS.AUTO_CAPS]: autoCaps,
    [STORAGE_KEYS.AUTOSTART]: autostart,
    [STORAGE_KEYS.VOICE_ENABLED]: voiceEnabled,
    [STORAGE_KEYS.VOICE_MODEL]: voiceModel,
    [STORAGE_KEYS.VOICE_LANGUAGE]: voiceLanguage,
    [STORAGE_KEYS.KEY_REPEAT_ENABLED]: keyRepeatEnabled,
    [STORAGE_KEYS.KEY_REPEAT_DELAY]: keyRepeatDelay,
    [STORAGE_KEYS.KEY_REPEAT_SPEED]: keyRepeatSpeed,
  });

  // Toggle voice options visibility
  updateVoiceOptionsVisibility();
  // Toggle key repeat options visibility
  updateKeyRepeatOptionsVisibility();
}

function updateVoiceOptionsVisibility() {
  const voiceEnabled = $("voiceEnabled").checked;
  $("voiceOptions").style.display = voiceEnabled ? "block" : "none";
}

/**
 * Get a human-readable model name
 */
function getModelDisplayName(modelSize, language) {
  const modelNames = {
    "tiny-q8": "Tiny (Q8)",
    "base-q8": "Base (Q8)",
    "small-q8": "Small (Q8)",
    tiny: "Tiny",
    base: "Base",
    small: "Small",
  };
  const langNames = {
    en: "English",
    multilingual: "Multilingual",
  };
  return `${modelNames[modelSize] || modelSize} - ${langNames[language] || language}`;
}

/**
 * Download the voice model when voice is enabled
 */
async function downloadVoiceModel(forceReload = false) {
  if (isDownloading) return;

  const modelSize = $("voiceModel").value;
  const language = $("voiceLanguage").value;
  const modelKey = `${modelSize}:${language}`;
  const modelName = getModelDisplayName(modelSize, language);

  // Check if we already have this exact model loaded
  if (
    !forceReload &&
    loadedModelKey === modelKey &&
    VoiceInput.isModelLoaded()
  ) {
    showModelStatus("ready", 100, null, modelName);
    return;
  }

  // Dispose old model if switching to a different one
  if (loadedModelKey && loadedModelKey !== modelKey) {
    VoiceInput.dispose();
    loadedModelKey = null;
  }

  isDownloading = true;
  showModelStatus("downloading", 0, null, modelName);

  const success = await VoiceInput.initTranscriber({
    modelSize,
    language,
    onProgress: (percent) => {
      showModelStatus("downloading", percent, null, modelName);
    },
    onStateChange: (state, error) => {
      if (state === VoiceInput.VoiceState.IDLE) {
        loadedModelKey = modelKey;
        showModelStatus("ready", 100, null, modelName);
        isDownloading = false;
      } else if (state === VoiceInput.VoiceState.ERROR) {
        showModelStatus("error", 0, error, modelName);
        isDownloading = false;
      }
    },
  });

  if (!success) {
    isDownloading = false;
  }
}

/**
 * Show model download status in the UI
 */
function showModelStatus(status, progress = 0, error = null, modelName = "") {
  const statusDiv = $("voiceModelStatus");
  const statusText = $("voiceModelStatusText");
  const progressText = $("voiceModelProgress");
  const progressBar = $("voiceModelProgressBar");

  if (status === "downloading") {
    statusDiv.style.display = "block";
    statusText.textContent = `Downloading ${modelName}...`;
    statusText.style.color = "#333";
    progressText.textContent = `${progress}%`;
    progressBar.style.width = `${progress}%`;
    progressBar.style.background = "#2980b9";
  } else if (status === "ready") {
    statusDiv.style.display = "block";
    statusText.textContent = `${modelName} ready`;
    statusText.style.color = "#27ae60";
    progressText.textContent = "";
    progressBar.style.width = "100%";
    progressBar.style.background = "#27ae60";
    // Hide after a few seconds
    setTimeout(() => {
      statusDiv.style.display = "none";
    }, 3000);
  } else if (status === "error") {
    statusDiv.style.display = "block";
    statusText.textContent = `Error: ${error || "Failed to download"}`;
    statusText.style.color = "#c0392b";
    progressText.textContent = "";
    progressBar.style.width = "100%";
    progressBar.style.background = "#c0392b";
  } else {
    statusDiv.style.display = "none";
  }
}

function updateKeyRepeatOptionsVisibility() {
  const keyRepeatEnabled = $("keyRepeatEnabled").checked;
  $("keyRepeatOptions").style.display = keyRepeatEnabled ? "block" : "none";
}

async function loadDisplaySettings() {
  const result = await chrome.storage.local.get([
    STORAGE_KEYS.SHOW_OPEN_BUTTON,
    STORAGE_KEYS.SHOW_NUMBER_BAR,
    STORAGE_KEYS.SHOW_LANGUAGE_BUTTON,
    STORAGE_KEYS.SHOW_SETTINGS_BUTTON,
    STORAGE_KEYS.SHOW_URL_BUTTON,
    STORAGE_KEYS.SHOW_CLOSE_BUTTON,
    STORAGE_KEYS.SHOW_NUMBERS_BUTTON,
    STORAGE_KEYS.KEYBOARD_ZOOM_WIDTH,
    STORAGE_KEYS.KEYBOARD_ZOOM_HEIGHT,
    STORAGE_KEYS.KEYBOARD_ZOOM_LOCKED,
    STORAGE_KEYS.KEYBOARD_DRAGGABLE,
    STORAGE_KEYS.SPACEBAR_CURSOR_SWIPE,
    STORAGE_KEYS.STICKY_SHIFT,
    STORAGE_KEYS.AUTO_CAPS,
    STORAGE_KEYS.AUTOSTART,
    STORAGE_KEYS.VOICE_ENABLED,
    STORAGE_KEYS.VOICE_MODEL,
    STORAGE_KEYS.VOICE_LANGUAGE,
    STORAGE_KEYS.KEY_REPEAT_ENABLED,
    STORAGE_KEYS.KEY_REPEAT_DELAY,
    STORAGE_KEYS.KEY_REPEAT_SPEED,
  ]);

  $("showOpenButton").checked = result[STORAGE_KEYS.SHOW_OPEN_BUTTON] !== false;
  $("showNumberBar").checked = result[STORAGE_KEYS.SHOW_NUMBER_BAR] !== false;
  $("showLanguageButton").checked =
    result[STORAGE_KEYS.SHOW_LANGUAGE_BUTTON] === true;
  $("showSettingsButton").checked =
    result[STORAGE_KEYS.SHOW_SETTINGS_BUTTON] !== false;
  $("showUrlButton").checked = result[STORAGE_KEYS.SHOW_URL_BUTTON] !== false;
  $("showCloseButton").checked =
    result[STORAGE_KEYS.SHOW_CLOSE_BUTTON] !== false;
  $("showNumbersButton").checked =
    result[STORAGE_KEYS.SHOW_NUMBERS_BUTTON] !== false;
  $("keyboardZoomWidth").value =
    result[STORAGE_KEYS.KEYBOARD_ZOOM_WIDTH] || 100;
  $("keyboardZoomHeight").value =
    result[STORAGE_KEYS.KEYBOARD_ZOOM_HEIGHT] || 100;
  zoomLocked = result[STORAGE_KEYS.KEYBOARD_ZOOM_LOCKED] !== false;
  updateZoomLockCheckbox();
  $("keyboardDraggable").checked =
    result[STORAGE_KEYS.KEYBOARD_DRAGGABLE] === true;
  $("spacebarCursorSwipe").checked =
    result[STORAGE_KEYS.SPACEBAR_CURSOR_SWIPE] === true;
  $("stickyShift").checked = result[STORAGE_KEYS.STICKY_SHIFT] === true;
  $("autoCaps").checked = result[STORAGE_KEYS.AUTO_CAPS] === true;
  $("autostart").checked = result[STORAGE_KEYS.AUTOSTART] === true;
  $("voiceEnabled").checked = result[STORAGE_KEYS.VOICE_ENABLED] === true;
  $("voiceModel").value = result[STORAGE_KEYS.VOICE_MODEL] || "base-q8";
  $("voiceLanguage").value =
    result[STORAGE_KEYS.VOICE_LANGUAGE] || "multilingual";
  updateVoiceOptionsVisibility();
  $("keyRepeatEnabled").checked =
    result[STORAGE_KEYS.KEY_REPEAT_ENABLED] === true;
  $("keyRepeatDelay").value = result[STORAGE_KEYS.KEY_REPEAT_DELAY] || 400;
  $("keyRepeatSpeed").value = result[STORAGE_KEYS.KEY_REPEAT_SPEED] || 75;
  updateKeyRepeatOptionsVisibility();
}

function updateZoomLockCheckbox() {
  $("zoomLock").checked = zoomLocked;
}

function handleZoomWidthChange() {
  if (zoomLocked) {
    $("keyboardZoomHeight").value = $("keyboardZoomWidth").value;
  }
  saveDisplaySettings();
}

function handleZoomHeightChange() {
  if (zoomLocked) {
    $("keyboardZoomWidth").value = $("keyboardZoomHeight").value;
  }
  saveDisplaySettings();
}

function handleZoomLockChange() {
  zoomLocked = $("zoomLock").checked;
  if (zoomLocked) {
    // When locking, sync height to width
    $("keyboardZoomHeight").value = $("keyboardZoomWidth").value;
  }
  saveDisplaySettings();
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
  loadLayouts();
  await loadDisplaySettings();

  $("kl_add").addEventListener("click", addLayout);
  $("kl_remove").addEventListener("click", removeLayout);

  $("showOpenButton").addEventListener("change", saveDisplaySettings);
  $("showNumberBar").addEventListener("change", saveDisplaySettings);
  $("showLanguageButton").addEventListener("change", saveDisplaySettings);
  $("showSettingsButton").addEventListener("change", saveDisplaySettings);
  $("showUrlButton").addEventListener("change", saveDisplaySettings);
  $("showCloseButton").addEventListener("change", saveDisplaySettings);
  $("showNumbersButton").addEventListener("change", saveDisplaySettings);
  $("keyboardZoomWidth").addEventListener("change", handleZoomWidthChange);
  $("keyboardZoomHeight").addEventListener("change", handleZoomHeightChange);
  $("zoomLock").addEventListener("change", handleZoomLockChange);
  $("keyboardDraggable").addEventListener("change", saveDisplaySettings);
  $("spacebarCursorSwipe").addEventListener("change", saveDisplaySettings);
  $("stickyShift").addEventListener("change", saveDisplaySettings);
  $("autoCaps").addEventListener("change", saveDisplaySettings);
  $("autostart").addEventListener("change", saveDisplaySettings);
  $("resetPosition").addEventListener("click", () => {
    chrome.storage.local.set({ [STORAGE_KEYS.KEYBOARD_POSITION]: null });
  });
  $("voiceEnabled").addEventListener("change", () => {
    saveDisplaySettings();
    if ($("voiceEnabled").checked) {
      downloadVoiceModel();
    }
  });
  $("voiceModel").addEventListener("change", () => {
    saveDisplaySettings();
    if ($("voiceEnabled").checked) {
      downloadVoiceModel();
    }
  });
  $("voiceLanguage").addEventListener("change", () => {
    saveDisplaySettings();
    if ($("voiceEnabled").checked) {
      downloadVoiceModel();
    }
  });
  $("keyRepeatEnabled").addEventListener("change", saveDisplaySettings);
  $("keyRepeatDelay").addEventListener("change", saveDisplaySettings);
  $("keyRepeatSpeed").addEventListener("change", saveDisplaySettings);
});
