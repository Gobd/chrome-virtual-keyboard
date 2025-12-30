# Virtual Keyboard for Google Chrome&trade; (Fork)

![Virtual Keyboard Screenshot](screenshot.png)

## About

Virtual Keyboard for Google Chrome&trade; will popup automatically when the user clicks on an input field such as textboxes and textareas. Furthermore, the keyboard will disappear automatically once no longer needed.

This extension is ideal for touch screen devices. This keyboard works like an iOS/Android/Windows 8 touch virtual keyboard.

## Fork Differences

This is a fork of the [original Virtual Keyboard extension](https://github.com/xontab/chrome-virtual-keyboard) with the following changes:

- **Manifest V3 Migration** - Updated from Manifest V2 to V3 for continued Chrome Web Store compatibility
- **`role="textbox"` Support** - The keyboard now activates on elements with `role="textbox"` in addition to standard input fields (useful for custom form components and accessibility)
- **Improved iframe Support** - Better handling of keyboard in same-origin iframe scenarios
- **Efficient DOM Monitoring** - Replaced inefficient polling (scanning entire DOM every second) with MutationObserver for detecting new input fields. This uses zero CPU when the page is idle and responds instantly to dynamically added inputs
- **Cursor Positioning** - Type anywhere in a field, not just at the end. Drag on the spacebar to move the cursor
- **Open Button** - Optional floating keyboard button in the lower-right corner to manually show the keyboard (can be disabled in settings)
- **`.com` Button** - Quick-insert ".com" when typing in email fields or the URL bar

All features from the original extension are preserved.

## Permissions

This extension requires the following permissions:

| Permission  | Why It's Needed                                                                         |
| ----------- | --------------------------------------------------------------------------------------- |
| `storage`   | Saves your keyboard layout preference so it persists between browser sessions           |
| `activeTab` | Allows the extension to interact with the current tab when you click the extension icon |

The content script is configured to run on all pages (`<all_urls>`) to detect when you focus on input fields and display the keyboard.

## Development

```bash
pnpm install          # Install dependencies
pnpm build            # Build extension to dist/
pnpm watch            # Build and watch for changes
pnpm format           # Format code with Biome
pnpm lint             # Lint code with Biome
pnpm lint:fix         # Fix lint issues automatically
pnpm package          # Create zip for Chrome Web Store submission
```

Extension source files are in the `src/` directory.

### Testing

The project has both unit tests (Vitest) and E2E tests (Playwright).

```bash
# Setup
pnpm test:install     # Install Playwright browser (first time)

# Run tests
pnpm test             # Run all tests (unit + E2E)
pnpm test:unit        # Run unit tests only
pnpm test:e2e         # Run E2E tests only
pnpm test:headed      # Run E2E tests with visible browser
pnpm test:ui          # Run E2E tests with Playwright UI
pnpm test:debug       # Run E2E tests in debug mode
pnpm test:report      # View Playwright test report
```

### Coverage

Coverage can be generated for unit tests, E2E tests, or combined.

```bash
pnpm coverage         # Run all tests with combined coverage report
pnpm coverage:unit    # Run unit tests with coverage
pnpm coverage:e2e     # Run E2E tests with coverage
pnpm coverage:all     # Generate combined coverage (unit + E2E)
pnpm coverage:summary # Display coverage summary for all test types
```

Coverage reports are generated in:
- `coverage/` - Combined coverage report (HTML)
- `coverage-unit/` - Unit test coverage
- `coverage-e2e/` - E2E test coverage

## Known Limitations

Due to security reasons, communication between frames is restricted in Google Chrome. The only way to enable the keyboard in cross-origin iFrame scenarios is to disable web security using flags `--disable-web-security --disable-site-isolation-trials --user-data-dir=/tmp`. Warning: these flags make Chrome very vulnerable and should only be used for testing.
