// Virtual Keyboard - Popup Script

document.getElementById('openUrl').addEventListener('click', () => {
  chrome.runtime.sendMessage({ method: 'openUrlBar' });
  window.close();
});

document.getElementById('openSettings').addEventListener('click', () => {
  window.open(chrome.runtime.getURL('options.html'));
  window.close();
});
