// Virtual Keyboard - Background Service Worker
// Handles message relay between content scripts and iframes

import { MESSAGE_TYPES } from "./core/config.js";

// Open settings when extension icon is clicked
chrome.action.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage();
});

/**
 * Get the active tab in the current window
 * @returns {Promise<chrome.tabs.Tab>}
 */
async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

/**
 * Relay a message to the active tab
 * @param {Object} message
 */
async function relayToActiveTab(message) {
  const tab = await getActiveTab();
  if (tab?.id) {
    await chrome.tabs.sendMessage(tab.id, message);
  }
}

/**
 * Broadcast a message to all tabs
 * @param {Object} message
 */
async function broadcastToAllTabs(message) {
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (tab.id) {
      try {
        await chrome.tabs.sendMessage(tab.id, message);
      } catch {
        // Tab might not have content script loaded
      }
    }
  }
}

/**
 * Handle incoming messages
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  handleMessage(request, sender).then(sendResponse);
  return true; // Keep async channel open
});

/**
 * Process a message
 * @param {Object} request
 * @param {chrome.runtime.MessageSender} sender
 */
async function handleMessage(request, _sender) {
  switch (request.method) {
    case MESSAGE_TYPES.OPEN_FROM_IFRAME:
    case MESSAGE_TYPES.CLICK_FROM_IFRAME:
    case MESSAGE_TYPES.OPEN_FROM_BUTTON:
    case MESSAGE_TYPES.OPEN_URL_BAR:
      // Relay to active tab
      await relayToActiveTab(request);
      break;

    case MESSAGE_TYPES.KEYBOARD_STATE_CHANGE:
      // Broadcast to all tabs for open button sync
      await broadcastToAllTabs(request);
      break;

    default:
      // Unknown message type - relay to active tab as fallback
      await relayToActiveTab(request);
      break;
  }

  return { success: true };
}
