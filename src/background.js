// Virtual Keyboard - Background Service Worker (MV3)

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  handleMessage(request, sender).then(sendResponse);
  return true; // Keep channel open for async response
});

async function handleMessage(request, sender) {
  switch (request.method) {
    // Relay messages to active tab
    case "openFromIframe":
    case "clickFromIframe":
    case "openFromButton":
    case "keyboardStateChange":
    case "openUrlBar": {
      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      for (const tab of tabs) {
        chrome.tabs.sendMessage(tab.id, request);
      }
      return { data: "ok" };
    }

    default:
      return {};
  }
}
