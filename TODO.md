# TODO

## Chrome Web Store Rejection Workaround

If the extension continues to be rejected for spam/policy reasons, consider implementing a dual-build system:

### Two Versions

**Store Version (limited)**
- Replace `<all_urls>` content script with `activeTab` permission
- Keyboard activates when user clicks extension icon (not auto-popup)
- More likely to pass Chrome Web Store review

**GitHub Version (full)**
- Keep `<all_urls>` for auto-popup on any page
- Full functionality, distributed via GitHub Releases
- Users sideload via "Load unpacked" in developer mode

### Implementation

Add build scripts:
```bash
pnpm run build              # full version (GitHub)
pnpm run build:store        # limited version (Chrome Web Store)
```

Changes needed for store version:
- [ ] Create alternate manifest with `activeTab` instead of `<all_urls>` content script
- [ ] Modify background.js to inject content script on icon click via `chrome.scripting.executeScript`
- [ ] Update build.js to accept `--store` flag
- [ ] Update package.json with `build:store` and `package:store` scripts

### Rejection History

1. First rejection: Spam - had iOS/Android mentions in description
2. Second rejection: Spam - cleaned up description
3. Third attempt: Changed name from "Virtual Keyboard" to "SmartKey - Auto-Popup Keyboard"
