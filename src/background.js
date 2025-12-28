// Virtual Keyboard - Background Service Worker (MV3)
// Simplified: removed unused handlers, async/await

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  handleMessage(request, sender).then(sendResponse);
  return true; // Keep channel open for async response
});

async function handleMessage(request, sender) {
  switch (request.method) {
    // Iframe communication relay
    case "openFromIframe":
    case "clickFromIframe": {
      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, request);
      }
      return { data: "ok" };
    }

    // Keyboard toggle controls
    case "toggleKeyboard": {
      const result = await chrome.storage.local.get("keyboardEnabled");
      const newValue = result.keyboardEnabled !== "false" ? "false" : "true";
      await chrome.storage.local.set({ keyboardEnabled: newValue });

      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (tabs[0]) {
        updateIcon(tabs[0].id);
        chrome.tabs.sendMessage(
          tabs[0].id,
          newValue === "false" ? "closeKeyboard" : "openKeyboard",
        );
      }
      return { data: "ok" };
    }

    case "toggleKeyboardOn": {
      await chrome.storage.local.set({ keyboardEnabled: "true" });
      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (tabs[0]) {
        updateIcon(tabs[0].id);
        chrome.tabs.sendMessage(tabs[0].id, "openKeyboard");
      }
      return { data: "ok" };
    }

    case "toggleKeyboardDemand": {
      await chrome.storage.local.set({ keyboardEnabled: "demand" });
      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (tabs[0]) {
        updateIcon(tabs[0].id);
        chrome.tabs.sendMessage(tabs[0].id, "openKeyboard");
      }
      return { data: "ok" };
    }

    case "toggleKeyboardOff": {
      await chrome.storage.local.set({ keyboardEnabled: "false" });
      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (tabs[0]) {
        updateIcon(tabs[0].id);
        chrome.tabs.sendMessage(tabs[0].id, "closeKeyboard");
      }
      return { data: "ok" };
    }

    case "openUrlBar": {
      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, "openUrlBar");
      }
      return { data: "ok" };
    }

    default:
      return {};
  }
}

async function updateIcon(tabId) {
  const result = await chrome.storage.local.get("keyboardEnabled");
  let iconPath;

  if (result.keyboardEnabled === "demand") {
    iconPath = "buttons/keyboard_2.png";
  } else if (result.keyboardEnabled !== "false") {
    iconPath = "buttons/keyboard_1.png";
  } else {
    iconPath = "buttons/keyboard_3.png";
  }

  chrome.action.setIcon({ tabId, path: iconPath });
}

// Update icon on tab changes
chrome.tabs.onUpdated.addListener((tabId) => {
  updateIcon(tabId);
});
