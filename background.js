// MV3 Service Worker - uses chrome.storage.local instead of localStorage

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.method == "getLocalStorage") {
        chrome.storage.local.get(request.key, function(result) {
            sendResponse({ data: result[request.key] });
        });
        return true; // Keep channel open for async response
    }
    else if (request.method == "getSmallKeyboardCoords") {
        chrome.storage.local.get([
            "smallKeyboard",
            "smallKeyboardTop",
            "smallKeyboardBottom",
            "smallKeyboardRight",
            "smallKeyboardLeft"
        ], function(result) {
            sendResponse({
                smallKeyboard: result.smallKeyboard,
                smallKeyboardTop: result.smallKeyboardTop,
                smallKeyboardBottom: result.smallKeyboardBottom,
                smallKeyboardRight: result.smallKeyboardRight,
                smallKeyboardLeft: result.smallKeyboardLeft
            });
        });
        return true;
    }
    else if (request.method == "loadKeyboardSettings") {
        chrome.storage.local.get([
            "openedFirstTime",
            "capsLock",
            "smallKeyboard",
            "touchEvents",
            "keyboardLayout1",
            "urlButton",
            "keyboardEnabled"
        ], function(result) {
            sendResponse({
                openedFirstTime: result.openedFirstTime,
                capsLock: result.capsLock,
                smallKeyboard: result.smallKeyboard,
                touchEvents: result.touchEvents,
                keyboardLayout1: result.keyboardLayout1,
                urlButton: result.urlButton,
                keyboardEnabled: result.keyboardEnabled
            });
        });
        return true;
    }
    else if (request.method == "initLoadKeyboardSettings") {
        chrome.storage.local.get([
            "hardwareAcceleration",
            "zoomLevel",
            "autoTrigger",
            "repeatLetters",
            "intelligentScroll",
            "autoTriggerLinks",
            "autoTriggerAfter",
            "refreshTime"
        ], function(result) {
            sendResponse({
                hardwareAcceleration: result.hardwareAcceleration,
                zoomLevel: result.zoomLevel,
                autoTrigger: result.autoTrigger,
                repeatLetters: result.repeatLetters,
                intelligentScroll: result.intelligentScroll,
                autoTriggerLinks: result.autoTriggerLinks,
                autoTriggerAfter: result.autoTriggerAfter,
                refreshTime: result.refreshTime
            });
        });
        return true;
    }
    else if (request.method == "setLocalStorage") {
        let obj = {};
        obj[request.key] = request.value;
        chrome.storage.local.set(obj, function() {
            sendResponse({ data: "ok", setted_key: request.key });
        });
        return true;
    }
    else if (request.method == "openFromIframe") {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, request);
            }
        });
    }
    else if (request.method == "clickFromIframe") {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, request);
            }
        });
    }
    else if (request.method == "toogleKeyboard") {
        chrome.storage.local.get("keyboardEnabled", function(result) {
            let newValue = result.keyboardEnabled != "false" ? "false" : "true";
            chrome.storage.local.set({ keyboardEnabled: newValue }, function() {
                chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                    if (tabs[0]) {
                        vkeyboard_loadPageIcon(tabs[0].id);
                        let message = newValue == "false" ? "closeKeyboard" : "openKeyboard";
                        chrome.tabs.sendMessage(tabs[0].id, message);
                    }
                });
            });
        });
        sendResponse({ data: "ok" });
    }
    else if (request.method == "toogleKeyboardOn") {
        chrome.storage.local.set({ keyboardEnabled: "true" }, function() {
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                if (tabs[0]) {
                    vkeyboard_loadPageIcon(tabs[0].id);
                    chrome.tabs.sendMessage(tabs[0].id, "openKeyboard");
                }
            });
        });
        sendResponse({ data: "ok" });
    }
    else if (request.method == "toogleKeyboardDemand") {
        chrome.storage.local.set({ keyboardEnabled: "demand" }, function() {
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                if (tabs[0]) {
                    vkeyboard_loadPageIcon(tabs[0].id);
                    chrome.tabs.sendMessage(tabs[0].id, "openKeyboard");
                }
            });
        });
        sendResponse({ data: "ok" });
    }
    else if (request.method == "toogleKeyboardOff") {
        chrome.storage.local.set({ keyboardEnabled: "false" }, function() {
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                if (tabs[0]) {
                    vkeyboard_loadPageIcon(tabs[0].id);
                    chrome.tabs.sendMessage(tabs[0].id, "closeKeyboard");
                }
            });
        });
        sendResponse({ data: "ok" });
    }
    else if (request.method == "openUrlBar") {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, "openUrlBar");
                sendResponse({ data: "ok" });
            }
        });
        return true;
    }
    else if (request.method == "createTab") {
        chrome.tabs.create({ url: request.url });
    }
    else {
        sendResponse({});
    }
});

function vkeyboard_loadPageIcon(tabId) {
    chrome.storage.local.get("keyboardEnabled", function(result) {
        let iconPath;
        if (result.keyboardEnabled == "demand") {
            iconPath = "buttons/keyboard_2.png";
        } else if (result.keyboardEnabled != "false") {
            iconPath = "buttons/keyboard_1.png";
        } else {
            iconPath = "buttons/keyboard_3.png";
        }
        chrome.action.setIcon({ tabId: tabId, path: iconPath });
    });
}

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    chrome.storage.local.get("toogleKeyboard", function(result) {
        if (result.toogleKeyboard != "false") {
            vkeyboard_loadPageIcon(tabId);
        } else {
            chrome.storage.local.set({ keyboardEnabled: "true" });
        }
    });
});
