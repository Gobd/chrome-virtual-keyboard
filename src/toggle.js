// Virtual Keyboard - Popup

const $ = (id) => document.getElementById(id);

window.addEventListener("load", () => {
  $("settings").onclick = () => {
    window.open(chrome.runtime.getURL("options.html"));
  };

  $("goToUrl").onclick = () => {
    chrome.runtime.sendMessage({ method: "openUrlBar" });
    window.close();
  };
});
