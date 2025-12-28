// Virtual Keyboard - Popup Toggle

const $ = (id) => document.getElementById(id);

window.addEventListener("load", async () => {
  // Button handlers
  $("toggleOn").onclick = () => {
    chrome.runtime.sendMessage({ method: "toggleKeyboardOn" });
    window.close();
  };

  $("toggleOff").onclick = () => {
    chrome.runtime.sendMessage({ method: "toggleKeyboardOff" });
    window.close();
  };

  $("toggleDemand").onclick = () => {
    chrome.runtime.sendMessage({ method: "toggleKeyboardDemand" });
    window.close();
  };

  $("settings").onclick = () => {
    window.open(chrome.runtime.getURL("options.html"));
  };

  $("goToUrl").onclick = () => {
    chrome.runtime.sendMessage({ method: "openUrlBar" });
    window.close();
  };

  // Highlight current state
  const result = await chrome.storage.local.get("keyboardEnabled");

  if (result.keyboardEnabled === "demand") {
    $("toggleDemand").className = "active";
  } else if (result.keyboardEnabled !== "false") {
    $("toggleOn").className = "active";
  } else {
    $("toggleOff").className = "active";
  }
});
