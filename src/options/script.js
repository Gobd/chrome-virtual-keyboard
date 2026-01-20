// Virtual Keyboard Options - Layout selector and display settings

import { STORAGE_KEYS } from "../core/config.js";
import { getLayoutsList } from "../core/storage.js";

// Firefox uses browser.*, Chrome uses chrome.*
const storageLocal = (typeof browser !== "undefined" && browser.storage)
  ? browser.storage.local
  : storageLocal;
import * as WhisperInput from "../voice/VoiceInput.js";
// Vosk is only available in kiosk builds (requires unsafe-eval CSP)
// eslint-disable-next-line no-undef
const isFirefox = typeof __IS_FIREFOX__ !== "undefined" && __IS_FIREFOX__;
// Dynamically import VoskInput only in kiosk mode
let VoskInput = null;
if (isFirefox) {
  import("../voice/VoskInput.js").then((module) => {
    VoskInput = module;
  });
}

const $ = (id) => document.getElementById(id);

// Track if model download is in progress
let isDownloading = false;
// Track which models have been downloaded (persisted in chrome.storage)
let downloadedModels = new Set();

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
  const voiceEngine = isFirefox ? $("voiceEngine").value : "whisper";
  const voiceModel = $("voiceModel").value;
  const voiceVadMode = $("voiceVadMode").checked;
  const keyRepeatEnabled = $("keyRepeatEnabled").checked;
  const keyRepeatDelay = parseInt($("keyRepeatDelay").value, 10) || 400;
  const keyRepeatSpeed = parseInt($("keyRepeatSpeed").value, 10) || 75;
  const hideCursor = $("hideCursor").checked;

  storageLocal.set({
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
    [STORAGE_KEYS.VOICE_ENGINE]: voiceEngine,
    [STORAGE_KEYS.VOICE_MODEL]: voiceModel,
    [STORAGE_KEYS.VOICE_VAD_MODE]: voiceVadMode,
    [STORAGE_KEYS.KEY_REPEAT_ENABLED]: keyRepeatEnabled,
    [STORAGE_KEYS.KEY_REPEAT_DELAY]: keyRepeatDelay,
    [STORAGE_KEYS.KEY_REPEAT_SPEED]: keyRepeatSpeed,
    [STORAGE_KEYS.HIDE_CURSOR]: hideCursor,
  });

  // Toggle voice options visibility
  updateVoiceOptionsVisibility();
  // Toggle key repeat options visibility
  updateKeyRepeatOptionsVisibility();
}

// Model options for each engine
// Quantized (q8) = smaller & faster, Full = larger & higher quality
const WHISPER_MODELS = [
  // Quantized models - smaller, faster
  { value: "tiny-q8-en", label: "Tiny Fast - English (41 MB)" },
  { value: "tiny-q8-multi", label: "Tiny Fast - All languages (41 MB)" },
  { value: "base-q8-en", label: "Base Fast - English (77 MB)" },
  { value: "base-q8-multi", label: "Base Fast - All languages (77 MB) - Recommended", default: true },
  { value: "small-q8-en", label: "Small Fast - English (244 MB)" },
  { value: "small-q8-multi", label: "Small Fast - All languages (244 MB)" },
  // Full precision models - larger, higher quality
  { value: "tiny-en", label: "Tiny HQ - English (75 MB)" },
  { value: "tiny-multi", label: "Tiny HQ - All languages (75 MB)" },
  { value: "base-en", label: "Base HQ - English (145 MB)" },
  { value: "base-multi", label: "Base HQ - All languages (145 MB)" },
  { value: "small-en", label: "Small HQ - English (488 MB) - Best quality" },
  { value: "small-multi", label: "Small HQ - All languages (488 MB) - Best multilingual" },
];

// Vosk models (kiosk builds only - streaming recognition)
const VOSK_MODELS = [
  { value: "en-small", label: "English (45 MB)", default: true },
  { value: "de-small", label: "German (45 MB)" },
  { value: "fr-small", label: "French (41 MB)" },
  { value: "es-small", label: "Spanish (39 MB)" },
  { value: "it-small", label: "Italian (48 MB)" },
  { value: "pt-small", label: "Portuguese (31 MB)" },
  { value: "ru-small", label: "Russian (45 MB)" },
  { value: "zh-small", label: "Chinese (42 MB)" },
];


function updateVoiceOptionsVisibility() {
  const voiceEnabled = $("voiceEnabled").checked;
  $("voiceOptions").style.display = voiceEnabled ? "block" : "none";
  if (voiceEnabled) {
    // Show engine selection only in kiosk builds
    if (isFirefox) {
      $("voiceEngineRow").style.display = "flex";
    }
    populateModelDropdown();
    updateDownloadButton();
    updateVadModeVisibility();
  }
}

function updateVadModeVisibility() {
  // VAD mode only available for Whisper engine
  const engine = isFirefox ? $("voiceEngine").value : "whisper";
  const vadContainer = $("vadModeContainer");
  if (vadContainer) {
    vadContainer.style.display = engine === "whisper" ? "block" : "none";
  }
}

function populateModelDropdown() {
  const select = $("voiceModel");
  const currentValue = select.value;
  const engine = isFirefox ? $("voiceEngine").value : "whisper";
  const models = engine === "vosk" ? VOSK_MODELS : WHISPER_MODELS;

  select.innerHTML = "";
  let hasCurrentValue = false;

  for (const model of models) {
    const option = document.createElement("option");
    option.value = model.value;
    option.textContent = model.label;
    if (model.value === currentValue) {
      option.selected = true;
      hasCurrentValue = true;
    } else if (model.default && !hasCurrentValue) {
      option.selected = true;
    }
    select.appendChild(option);
  }
}

/**
 * Get display name for current model
 */
function getModelDisplayName() {
  const model = $("voiceModel").value;
  const engine = isFirefox ? $("voiceEngine").value : "whisper";
  const models = engine === "vosk" ? VOSK_MODELS : WHISPER_MODELS;
  const found = models.find(m => m.value === model);
  return found ? found.label.split(" - ")[0] : model;
}

/**
 * Save downloaded models to storage
 */
async function saveDownloadedModels() {
  const arr = Array.from(downloadedModels);
  await storageLocal.set({
    [STORAGE_KEYS.VOICE_DOWNLOADED_MODELS]: JSON.stringify(arr),
  });
}

/**
 * Load downloaded models from storage
 */
async function loadDownloadedModels() {
  const result = await storageLocal.get([STORAGE_KEYS.VOICE_DOWNLOADED_MODELS]);
  const json = result[STORAGE_KEYS.VOICE_DOWNLOADED_MODELS];
  if (json) {
    try {
      const arr = JSON.parse(json);
      downloadedModels = new Set(arr);
    } catch {
      downloadedModels = new Set();
    }
  }
}

/**
 * Download the selected voice model
 */
async function downloadVoiceModel() {
  if (isDownloading) return;

  const model = $("voiceModel").value;
  const modelName = getModelDisplayName();
  const engine = isFirefox ? $("voiceEngine").value : "whisper";

  // Check if we already have this model downloaded
  // Use engine-prefixed key to track downloads separately
  const downloadKey = `${engine}:${model}`;
  if (downloadedModels.has(downloadKey)) {
    showModelStatus("ready", 100, null, modelName);
    return;
  }

  isDownloading = true;

  if (engine === "vosk" && VoskInput) {
    // Vosk model download (streaming, no progress available)
    showModelStatus("downloading", 0, null, modelName, true);

    const initOptions = {
      modelKey: model,
      onStateChange: async (state, error) => {
        console.log("[Options] Vosk state change:", state, error || "");
        if (state === VoskInput.VoiceState.IDLE) {
          console.log("[Options] Model ready, updating UI");
          downloadedModels.add(downloadKey);
          await saveDownloadedModels();
          showModelStatus("ready", 100, null, modelName);
          isDownloading = false;
        } else if (state === VoskInput.VoiceState.ERROR) {
          showModelStatus("error", 0, error, modelName);
          isDownloading = false;
        }
      },
    };

    const success = await VoskInput.initTranscriber(initOptions);
    if (!success) {
      isDownloading = false;
    }
  } else {
    // Whisper model download
    showModelStatus("downloading", 0, null, modelName, false);

    // Parse model string like "base-q8-multi" into modelSize and language
    const parts = model.split("-");
    const isMulti = parts.pop() === "multi";

    const initOptions = {
      modelSize: parts.join("-"), // "base-q8" or "tiny-q8" etc
      language: isMulti ? "multilingual" : "en",
      onProgress: (percent) => {
        showModelStatus("downloading", percent, null, modelName, false);
      },
      onStateChange: async (state, error) => {
        if (state === WhisperInput.VoiceState.IDLE) {
          downloadedModels.add(downloadKey);
          await saveDownloadedModels();
          showModelStatus("ready", 100, null, modelName);
          isDownloading = false;
        } else if (state === WhisperInput.VoiceState.ERROR) {
          showModelStatus("error", 0, error, modelName);
          isDownloading = false;
        }
      },
    };

    const success = await WhisperInput.initTranscriber(initOptions);
    if (!success) {
      isDownloading = false;
    }
  }
}

/**
 * Update the download button state
 */
function updateDownloadButton() {
  const btn = $("downloadModel");
  const model = $("voiceModel").value;
  const engine = isFirefox ? $("voiceEngine").value : "whisper";
  const downloadKey = `${engine}:${model}`;
  const isDownloaded = downloadedModels.has(downloadKey);

  if (isDownloading) {
    btn.textContent = "Downloading...";
    btn.disabled = true;
    btn.style.background = "";
    btn.style.color = "";
  } else if (isDownloaded) {
    btn.textContent = "Ready";
    btn.disabled = true;
    btn.style.background = "#27ae60";
    btn.style.color = "white";
  } else {
    btn.textContent = "Download";
    btn.disabled = false;
    btn.style.background = "";
    btn.style.color = "";
  }
}

/**
 * Show model download status in the UI
 */
function showModelStatus(status, progress = 0, error = null, modelName = "", isIndeterminate = false) {
  const statusDiv = $("voiceModelStatus");
  const statusText = $("voiceModelStatusText");
  const progressText = $("voiceModelProgress");
  const progressBar = $("voiceModelProgressBar");

  if (status === "downloading") {
    statusDiv.style.display = "block";
    statusText.textContent = `Downloading ${modelName}...`;
    statusText.style.color = "#333";

    if (isIndeterminate) {
      // For Vosk - show animated indeterminate progress
      progressText.textContent = "";
      progressBar.style.width = "100%";
      progressBar.style.background = "linear-gradient(90deg, #2980b9 25%, #5dade2 50%, #2980b9 75%)";
      progressBar.style.backgroundSize = "200% 100%";
      progressBar.style.animation = "shimmer 1.5s infinite linear";
    } else {
      progressText.textContent = `${progress}%`;
      progressBar.style.width = `${progress}%`;
      progressBar.style.background = "#2980b9";
      progressBar.style.animation = "";
    }
    updateDownloadButton();
  } else if (status === "ready") {
    statusDiv.style.display = "block";
    statusText.textContent = `${modelName} ready!`;
    statusText.style.color = "#27ae60";
    progressText.textContent = "";
    progressBar.style.width = "100%";
    progressBar.style.background = "#27ae60";
    progressBar.style.animation = "";
    updateDownloadButton();
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
    progressBar.style.animation = "";
    updateDownloadButton();
  } else {
    statusDiv.style.display = "none";
    updateDownloadButton();
  }
}

function updateKeyRepeatOptionsVisibility() {
  const keyRepeatEnabled = $("keyRepeatEnabled").checked;
  $("keyRepeatOptions").style.display = keyRepeatEnabled ? "block" : "none";
}

async function loadDisplaySettings() {
  const result = await storageLocal.get([
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
    STORAGE_KEYS.VOICE_ENGINE,
    STORAGE_KEYS.VOICE_MODEL,
    STORAGE_KEYS.VOICE_VAD_MODE,
    STORAGE_KEYS.KEY_REPEAT_ENABLED,
    STORAGE_KEYS.KEY_REPEAT_DELAY,
    STORAGE_KEYS.KEY_REPEAT_SPEED,
    STORAGE_KEYS.HIDE_CURSOR,
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
  // Set engine first (kiosk builds only), then populate models
  if (isFirefox) {
    const savedEngine = result[STORAGE_KEYS.VOICE_ENGINE] || "whisper";
    $("voiceEngine").value = savedEngine;
  }
  // Populate model dropdown first, then set value
  populateModelDropdown();
  const savedModel = result[STORAGE_KEYS.VOICE_MODEL];
  if (savedModel) {
    $("voiceModel").value = savedModel;
  }
  $("voiceVadMode").checked = result[STORAGE_KEYS.VOICE_VAD_MODE] === true;
  updateVoiceOptionsVisibility();
  $("keyRepeatEnabled").checked =
    result[STORAGE_KEYS.KEY_REPEAT_ENABLED] === true;
  $("keyRepeatDelay").value = result[STORAGE_KEYS.KEY_REPEAT_DELAY] || 400;
  $("keyRepeatSpeed").value = result[STORAGE_KEYS.KEY_REPEAT_SPEED] || 75;
  updateKeyRepeatOptionsVisibility();
  $("hideCursor").checked = result[STORAGE_KEYS.HIDE_CURSOR] === true;
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

  storageLocal.set({
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
  await loadDownloadedModels();
  await loadDisplaySettings();

  $("closeSettings").addEventListener("click", () => {
    // Try to close the window/tab, fall back to navigating back
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.close();
    }
  });

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
    storageLocal.set({ [STORAGE_KEYS.KEYBOARD_POSITION]: null });
  });
  $("voiceEnabled").addEventListener("change", () => {
    saveDisplaySettings();
  });
  if (isFirefox) {
    $("voiceEngine").addEventListener("change", () => {
      populateModelDropdown();
      updateDownloadButton();
      updateVadModeVisibility();
      saveDisplaySettings();
    });
  }
  $("voiceModel").addEventListener("change", () => {
    saveDisplaySettings();
    updateDownloadButton();
  });
  $("downloadModel").addEventListener("click", () => {
    if ($("voiceEnabled").checked) {
      downloadVoiceModel();
    }
  });
  $("voiceVadMode").addEventListener("change", saveDisplaySettings);
  $("keyRepeatEnabled").addEventListener("change", saveDisplaySettings);
  $("keyRepeatDelay").addEventListener("change", saveDisplaySettings);
  $("keyRepeatSpeed").addEventListener("change", saveDisplaySettings);
  $("hideCursor").addEventListener("change", saveDisplaySettings);
});
