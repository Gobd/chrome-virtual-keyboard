// Unit tests for KeyMap.js - Key value resolution
import { beforeEach, describe, expect, it } from "vitest";
import { keyboardState } from "../../src/core/state.js";
import {
  applyShiftToCharacter,
  getKeyWithShift,
} from "../../src/keyboard/KeyMap.js";

describe("KeyMap.js", () => {
  beforeEach(() => {
    keyboardState.reset();
  });

  describe("getKeyWithShift", () => {
    it("should return base key when shift is off", () => {
      const mockElement = {
        dataset: { key: "a", keyShift: "A" },
      };

      keyboardState.set("shift", false);
      expect(getKeyWithShift(mockElement)).toBe("a");
    });

    it("should return shift key when shift is on", () => {
      const mockElement = {
        dataset: { key: "a", keyShift: "A" },
      };

      keyboardState.set("shift", true);
      expect(getKeyWithShift(mockElement)).toBe("A");
    });

    it("should return base key when no shift key defined", () => {
      const mockElement = {
        dataset: { key: "1" },
      };

      keyboardState.set("shift", true);
      expect(getKeyWithShift(mockElement)).toBe("1");
    });

    it("should handle symbol keys", () => {
      const mockElement = {
        dataset: { key: "/", keyShift: "?" },
      };

      keyboardState.set("shift", false);
      expect(getKeyWithShift(mockElement)).toBe("/");

      keyboardState.set("shift", true);
      expect(getKeyWithShift(mockElement)).toBe("?");
    });

    it("should handle special characters", () => {
      const mockElement = {
        dataset: { key: "ü", keyShift: "Ü" },
      };

      keyboardState.set("shift", true);
      expect(getKeyWithShift(mockElement)).toBe("Ü");
    });
  });

  describe("applyShiftToCharacter", () => {
    it("should convert lowercase to uppercase", () => {
      expect(applyShiftToCharacter("a")).toBe("A");
      expect(applyShiftToCharacter("z")).toBe("Z");
    });

    it("should handle already uppercase", () => {
      expect(applyShiftToCharacter("A")).toBe("A");
    });

    it("should handle numbers (no change)", () => {
      expect(applyShiftToCharacter("1")).toBe("1");
      expect(applyShiftToCharacter("9")).toBe("9");
    });

    it("should handle unicode characters", () => {
      expect(applyShiftToCharacter("é")).toBe("É");
      expect(applyShiftToCharacter("ñ")).toBe("Ñ");
      expect(applyShiftToCharacter("ö")).toBe("Ö");
    });

    it("should handle non-letter characters (no change)", () => {
      expect(applyShiftToCharacter("!")).toBe("!");
      expect(applyShiftToCharacter("@")).toBe("@");
      expect(applyShiftToCharacter(" ")).toBe(" ");
    });

    it("should handle Cyrillic characters", () => {
      expect(applyShiftToCharacter("а")).toBe("А");
      expect(applyShiftToCharacter("я")).toBe("Я");
    });

    it("should handle Greek characters", () => {
      expect(applyShiftToCharacter("α")).toBe("Α");
      expect(applyShiftToCharacter("ω")).toBe("Ω");
    });
  });
});
