// Virtual Keyboard - Popup Script

document.getElementById('openUrl').addEventListener('click', () => {
  chrome.runtime.sendMessage({ method: 'openUrlBar' });
  window.close();
});

document.getElementById('openSettings').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
  window.close();
});
