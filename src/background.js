// Virtual Keyboard - Background Service Worker (MV3)

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
