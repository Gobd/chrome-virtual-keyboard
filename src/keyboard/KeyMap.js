// Key Map
// Handles key value resolution and shift character mapping

import { SPECIAL_KEYS } from "../core/config.js";
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
    return shiftKey;
  }

  return baseKey;
}

/**
 * Apply shift transformation to a character
 * Handles lowercase -> uppercase for keys without explicit shift mappings
 * @param {string} char - Character to transform
 * @returns {string} Transformed character
 */
export function applyShiftToCharacter(char) {
  // Use built-in toUpperCase which handles all Unicode properly
  return char.toUpperCase();
}

export default {
  getKeyWithShift,
  applyShiftToCharacter,
};
