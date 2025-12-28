Virtual Keyboard for Google Chrome&trade; (Fork)
================================================

## About

Virtual Keyboard for Google Chrome&trade; will popup automatically when the user clicks on an input field such as textboxes and textareas. Furthermore, the keyboard will disappear automatically once no longer needed.

This extension is ideal for touch screen devices. This keyboard works like an iOS/Android/Windows 8 touch virtual keyboard.

## Fork Differences

This is a fork of the [original Virtual Keyboard extension](https://github.com/nickytonline/chrome-virtual-keyboard) with the following changes:

- **Manifest V3 Migration** - Updated from Manifest V2 to V3 for continued Chrome Web Store compatibility
- **`role="textbox"` Support** - The keyboard now activates on elements with `role="textbox"` in addition to standard input fields (useful for custom form components and accessibility)
- **Improved iframe Support** - Better handling of keyboard in same-origin iframe scenarios

## Permissions

This extension requires the following permissions:

| Permission | Why It's Needed |
|------------|-----------------|
| `storage` | Saves your preferences (keyboard layout, size, theme) so they persist between browser sessions |
| `activeTab` | Allows the extension to interact with the current tab when you click the extension icon |
| `<all_urls>` (host permission) | Required to inject the keyboard into any webpage you visit. Without this, the keyboard would only work on whitelisted sites |

The content script runs on all pages to detect when you focus on input fields and display the keyboard.

## Known Limitations

Due to security reasons, communication between frames is restricted in Google Chrome. The only way to enable the keyboard in cross-origin iFrame scenarios is to disable web security using flags `--disable-web-security --disable-site-isolation-trials --user-data-dir=/tmp`. Warning: these flags make Chrome very vulnerable and should only be used for testing.
