// Key Map
// Handles key value resolution and shift character mapping

import { keyboardState } from "../core/state.js";

/**
 * Get the key value considering shift state
 * @param {HTMLElement} keyElement - Key button element
 * @returns {string} Key value
 */
export function getKeyWithShift(keyElement) {
  const baseKey = keyElement.dataset.key;
  const shiftKey = keyElement.dataset.keyShift;

  if (keyboardState.get("shift") && shiftKey) {
    // Auto-caps should only affect letters, not transform numbers/symbols
    if (keyboardState.get("autoCapsActive")) {
      if (/\p{L}/u.test(baseKey)) {
        return shiftKey;
      }
      return baseKey;
    }
    return shiftKey;
  }

  return baseKey;
}

/**
 * Apply shift transformation to a character
 * Fallback for keys without explicit shift mappings in the layout
 * @param {string} char - Character to transform
 * @returns {string} Transformed character
 */
export function applyShiftToCharacter(char) {
  // Auto-caps should only affect letters, not symbols/numbers
  if (keyboardState.get("autoCapsActive") && !/\p{L}/u.test(char)) {
    return char;
  }
  // Use built-in toUpperCase which handles all Unicode properly
  // This is a fallback for keys without data-key-shift in the layout
  return char.toUpperCase();
}

export default {
  getKeyWithShift,
  applyShiftToCharacter,
};
