/**
 * UTF-16 utilities for position tracking in contenteditable
 *
 * JavaScript strings use UTF-16 encoding where some characters
 * (emoji, rare Unicode) use 2 code units (surrogate pairs).
 * This module provides utilities for correctly handling positions
 * when dealing with text that may contain multi-byte characters.
 *
 * Test cases:
 * - Normal ASCII: "Hello" -> all single code units
 * - Emoji: "👋" (U+1F44B) -> 2 code units [0xD83D, 0xDC4B]
 * - Emoji: "🎉" (U+1F389) -> 2 code units [0xD83C, 0xDF89]
 * - Complex emoji: "👨‍👩‍👧‍👦" -> multiple code units with ZWJ (Zero Width Joiner)
 * - CJK: "世界" -> 2 single code units (BMP range)
 * - CJK: "こんにちは" -> 5 single code units (BMP range)
 * - Mixed: "Hello 👋 World 世界" -> combination of all above
 */

/**
 * Check if character code is a high surrogate (first half of surrogate pair)
 * High surrogates range: 0xD800 - 0xDBFF
 *
 * @param charCode - UTF-16 code unit to check
 * @returns true if charCode is a high surrogate
 *
 * @example
 * const emoji = "👋";
 * isHighSurrogate(emoji.charCodeAt(0)); // true (0xD83D)
 * isHighSurrogate(emoji.charCodeAt(1)); // false (0xDC4B is low surrogate)
 */
export function isHighSurrogate(charCode: number): boolean {
  return charCode >= 0xD800 && charCode <= 0xDBFF;
}

/**
 * Check if character code is a low surrogate (second half of surrogate pair)
 * Low surrogates range: 0xDC00 - 0xDFFF
 *
 * @param charCode - UTF-16 code unit to check
 * @returns true if charCode is a low surrogate
 *
 * @example
 * const emoji = "👋";
 * isLowSurrogate(emoji.charCodeAt(0)); // false (0xD83D is high surrogate)
 * isLowSurrogate(emoji.charCodeAt(1)); // true (0xDC4B)
 */
export function isLowSurrogate(charCode: number): boolean {
  return charCode >= 0xDC00 && charCode <= 0xDFFF;
}

/**
 * Check if character code is part of a surrogate pair (high or low)
 * Surrogate range: 0xD800 - 0xDFFF
 *
 * @param charCode - UTF-16 code unit to check
 * @returns true if charCode is part of a surrogate pair
 *
 * @example
 * const emoji = "👋";
 * isSurrogatePair(emoji.charCodeAt(0)); // true (high surrogate)
 * isSurrogatePair(emoji.charCodeAt(1)); // true (low surrogate)
 * isSurrogatePair("A".charCodeAt(0)); // false
 */
export function isSurrogatePair(charCode: number): boolean {
  return charCode >= 0xD800 && charCode <= 0xDFFF;
}

/**
 * Get the length in code units of the character at the given position
 *
 * @param text - The string to examine
 * @param position - Zero-based position in the string
 * @returns 1 for BMP characters, 2 for surrogate pairs, 0 if position is out of bounds
 *
 * @example
 * const mixed = "Hello 👋 World";
 * getCharacterLength(mixed, 0); // 1 ("H")
 * getCharacterLength(mixed, 6); // 2 ("👋" starts at position 6)
 * getCharacterLength(mixed, 7); // 1 (middle of surrogate pair, returns low surrogate length)
 * getCharacterLength(mixed, 9); // 1 ("W")
 */
export function getCharacterLength(text: string, position: number): number {
  if (position < 0 || position >= text.length) {
    return 0;
  }

  const charCode = text.charCodeAt(position);

  if (isHighSurrogate(charCode) && position + 1 < text.length) {
    const nextCharCode = text.charCodeAt(position + 1);
    if (isLowSurrogate(nextCharCode)) {
      return 2;
    }
  }

  return 1;
}

/**
 * Adjust a position to ensure it's not in the middle of a surrogate pair
 * If position points to a low surrogate, moves it back to the high surrogate
 *
 * @param text - The string to examine
 * @param position - Zero-based position to adjust
 * @returns Adjusted position at a valid character boundary
 *
 * @example
 * const text = "Hello 👋 World";
 * adjustPositionToBoundary(text, 7); // 6 (moves back from low surrogate to high surrogate)
 * adjustPositionToBoundary(text, 6); // 6 (already at valid boundary)
 * adjustPositionToBoundary(text, 0); // 0 (valid boundary)
 */
export function adjustPositionToBoundary(text: string, position: number): number {
  if (position <= 0 || position >= text.length) {
    return Math.max(0, Math.min(position, text.length));
  }

  const charCode = text.charCodeAt(position);

  if (isLowSurrogate(charCode)) {
    const prevCharCode = text.charCodeAt(position - 1);
    if (isHighSurrogate(prevCharCode)) {
      return position - 1;
    }
  }

  return position;
}

/**
 * Get the total length of text in UTF-16 code units
 * This is equivalent to text.length but explicitly named for clarity
 *
 * @param text - The string to measure
 * @returns Number of UTF-16 code units
 *
 * @example
 * getTextLength("Hello"); // 5
 * getTextLength("👋"); // 2 (one emoji = 2 code units)
 * getTextLength("Hello 👋 World"); // 14 (11 ASCII + 1 space + 2 emoji)
 * getTextLength("世界"); // 2 (CJK in BMP = 1 code unit each)
 */
export function getTextLength(text: string): number {
  return text.length;
}

/**
 * Count UTF-16 code units in a substring range
 *
 * @param text - The string to examine
 * @param start - Start position (inclusive)
 * @param end - End position (exclusive)
 * @returns Number of UTF-16 code units in the range
 * @throws Error if start > end or positions are out of bounds
 *
 * @example
 * const text = "Hello 👋 World";
 * countCodeUnits(text, 0, 5); // 5 ("Hello")
 * countCodeUnits(text, 6, 8); // 2 (emoji "👋")
 * countCodeUnits(text, 0, text.length); // 14 (entire string)
 */
export function countCodeUnits(text: string, start: number, end: number): number {
  if (start < 0 || end > text.length || start > end) {
    throw new Error(
      `Invalid range: start=${start}, end=${end}, text.length=${text.length}`
    );
  }

  return end - start;
}

/**
 * Find the next valid character boundary after the given position
 * Useful for navigation operations (moving cursor right)
 *
 * @param text - The string to examine
 * @param position - Current position
 * @returns Next valid character boundary, or text.length if at end
 *
 * @example
 * const text = "A👋B";
 * getNextBoundary(text, 0); // 1 (after "A")
 * getNextBoundary(text, 1); // 3 (after "👋", skipping 2 code units)
 * getNextBoundary(text, 3); // 4 (after "B")
 */
export function getNextBoundary(text: string, position: number): number {
  if (position >= text.length) {
    return text.length;
  }

  position = adjustPositionToBoundary(text, position);
  const charLength = getCharacterLength(text, position);

  return position + charLength;
}

/**
 * Find the previous valid character boundary before the given position
 * Useful for navigation operations (moving cursor left)
 *
 * @param text - The string to examine
 * @param position - Current position
 * @returns Previous valid character boundary, or 0 if at start
 *
 * @example
 * const text = "A👋B";
 * getPreviousBoundary(text, 4); // 3 (before "B")
 * getPreviousBoundary(text, 3); // 1 (before "👋", going back 2 code units)
 * getPreviousBoundary(text, 1); // 0 (before "A")
 */
export function getPreviousBoundary(text: string, position: number): number {
  if (position <= 0) {
    return 0;
  }

  position = adjustPositionToBoundary(text, position);

  if (position === 0) {
    return 0;
  }

  const prevPosition = position - 1;
  const prevCharCode = text.charCodeAt(prevPosition);

  if (isLowSurrogate(prevCharCode) && prevPosition > 0) {
    const beforePrevCharCode = text.charCodeAt(prevPosition - 1);
    if (isHighSurrogate(beforePrevCharCode)) {
      return prevPosition - 1;
    }
  }

  return prevPosition;
}
