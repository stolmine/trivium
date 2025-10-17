import { adjustPositionToBoundary } from './utf16';

const SENTENCE_ENDINGS = /[.!?]/;
const LIST_ITEM_START = /^(\d+\.|-|\*)\s/;

export interface SentenceBoundary {
  start: number;
  end: number;
}

export function expandToSentenceBoundary(
  text: string,
  selectionStart: number,
  selectionEnd: number
): SentenceBoundary {
  const safeStart = adjustPositionToBoundary(text, selectionStart);
  const safeEnd = adjustPositionToBoundary(text, selectionEnd);

  const start = findSentenceStart(text, safeStart);
  const end = findSentenceEnd(text, safeEnd);

  return {
    start: adjustPositionToBoundary(text, start),
    end: adjustPositionToBoundary(text, end)
  };
}

export function findSentenceStart(text: string, position: number): number {
  const safePosition = adjustPositionToBoundary(text, position);

  if (safePosition === 0) {
    return 0;
  }

  let currentPos = safePosition;

  while (currentPos > 0) {
    const paragraphBreakIndex = text.lastIndexOf('\n\n', currentPos - 1);
    const sentenceEndIndex = findPreviousSentenceEnd(text, currentPos - 1);

    if (paragraphBreakIndex !== -1 && (sentenceEndIndex === -1 || paragraphBreakIndex > sentenceEndIndex)) {
      const afterBreak = paragraphBreakIndex + 2;
      return adjustPositionToBoundary(text, afterBreak);
    }

    if (sentenceEndIndex !== -1) {
      let afterEnd = sentenceEndIndex + 1;

      while (afterEnd < text.length && /\s/.test(text[afterEnd])) {
        afterEnd++;
      }

      const lineAfterEnd = getLineAt(text, afterEnd);
      if (LIST_ITEM_START.test(lineAfterEnd)) {
        return adjustPositionToBoundary(text, afterEnd);
      }

      return adjustPositionToBoundary(text, afterEnd);
    }

    const lineStart = getLineStart(text, currentPos);
    const line = text.slice(lineStart, currentPos);

    if (LIST_ITEM_START.test(line)) {
      return adjustPositionToBoundary(text, lineStart);
    }

    if (lineStart === 0) {
      return 0;
    }

    currentPos = lineStart - 1;
  }

  return 0;
}

export function findSentenceEnd(text: string, position: number): number {
  const safePosition = adjustPositionToBoundary(text, position);

  if (safePosition >= text.length) {
    return text.length;
  }

  let currentPos = safePosition;

  while (currentPos < text.length) {
    // Skip any trailing whitespace/newlines in the current selection
    // to avoid finding paragraph breaks that are already included
    let searchPos = currentPos;
    while (searchPos < text.length && /\s/.test(text[searchPos])) {
      searchPos++;
    }

    const paragraphBreakIndex = text.indexOf('\n\n', searchPos);
    const sentenceEndIndex = findNextSentenceEnd(text, currentPos);

    if (paragraphBreakIndex !== -1 && (sentenceEndIndex === -1 || paragraphBreakIndex < sentenceEndIndex)) {
      return adjustPositionToBoundary(text, paragraphBreakIndex);
    }

    if (sentenceEndIndex !== -1) {
      return adjustPositionToBoundary(text, sentenceEndIndex + 1);
    }

    const lineEnd = getLineEnd(text, currentPos);

    if (lineEnd >= text.length) {
      return text.length;
    }

    currentPos = lineEnd + 1;
  }

  return text.length;
}

function findPreviousSentenceEnd(text: string, position: number): number {
  for (let i = position; i >= 0; i--) {
    const char = text[i];

    if (SENTENCE_ENDINGS.test(char)) {
      if (!isAbbreviation(text, i) && !isEllipsis(text, i)) {
        return i;
      }
    }
  }

  return -1;
}

function findNextSentenceEnd(text: string, position: number): number {
  for (let i = position; i < text.length; i++) {
    const char = text[i];

    if (SENTENCE_ENDINGS.test(char)) {
      if (!isAbbreviation(text, i) && !isEllipsis(text, i)) {
        return i;
      }
    }
  }

  return -1;
}

function isAbbreviation(text: string, position: number): boolean {
  if (text[position] !== '.') {
    return false;
  }

  if (position + 1 >= text.length) {
    return false;
  }

  const nextChar = text[position + 1];
  if (!/\s/.test(nextChar)) {
    return true;
  }

  if (position === 0) {
    return false;
  }

  const prevChar = text[position - 1];
  if (!/[a-zA-Z]/.test(prevChar)) {
    return false;
  }

  const wordStart = getWordStart(text, position - 1);
  const word = text.slice(wordStart, position + 1);

  const commonAbbreviations = [
    'Dr.', 'Mr.', 'Mrs.', 'Ms.', 'Prof.', 'Sr.', 'Jr.',
    'etc.', 'vs.', 'e.g.', 'i.e.', 'Ph.D.', 'M.D.',
    'St.', 'Ave.', 'Rd.', 'Blvd.'
  ];

  return commonAbbreviations.some(abbr =>
    word.toLowerCase() === abbr.toLowerCase()
  );
}

function isEllipsis(text: string, position: number): boolean {
  const char = text[position];

  if (char === '.') {
    if (position + 2 < text.length &&
        text[position + 1] === '.' &&
        text[position + 2] === '.') {
      return true;
    }

    if (position >= 2 &&
        text[position - 1] === '.' &&
        text[position - 2] === '.') {
      return true;
    }

    if (position >= 1 && position + 1 < text.length &&
        text[position - 1] === '.' &&
        text[position + 1] === '.') {
      return true;
    }
  }

  return false;
}

function getWordStart(text: string, position: number): number {
  let i = position;

  while (i > 0 && /[a-zA-Z.]/.test(text[i - 1])) {
    i--;
  }

  return i;
}

function getLineStart(text: string, position: number): number {
  const lastNewline = text.lastIndexOf('\n', position - 1);
  return lastNewline === -1 ? 0 : lastNewline + 1;
}

function getLineEnd(text: string, position: number): number {
  const nextNewline = text.indexOf('\n', position);
  return nextNewline === -1 ? text.length : nextNewline;
}

function getLineAt(text: string, position: number): string {
  const start = getLineStart(text, position);
  const end = getLineEnd(text, position);
  return text.slice(start, end);
}

export function isParagraphBoundary(text: string, position: number): boolean {
  const safePosition = adjustPositionToBoundary(text, position);

  if (safePosition >= text.length - 1 || safePosition < 1) {
    return false;
  }

  return text[safePosition] === '\n' && text[safePosition + 1] === '\n';
}

export function findParagraphStart(text: string, position: number): number {
  const safePosition = adjustPositionToBoundary(text, position);

  if (safePosition === 0) {
    return 0;
  }

  const paragraphBreakIndex = text.lastIndexOf('\n\n', safePosition - 1);

  if (paragraphBreakIndex === -1) {
    return 0;
  }

  const afterBreak = paragraphBreakIndex + 2;
  return adjustPositionToBoundary(text, afterBreak);
}

export function findParagraphEnd(text: string, position: number): number {
  const safePosition = adjustPositionToBoundary(text, position);

  if (safePosition >= text.length) {
    return text.length;
  }

  // Check if we're already at or inside a paragraph break (\n\n)
  // If so, back up to just before the break
  if (safePosition > 0 &&
      text[safePosition - 1] === '\n' &&
      safePosition < text.length &&
      text[safePosition] === '\n') {
    // We're between the two newlines of a paragraph break
    return safePosition - 1;
  }

  if (safePosition < text.length &&
      text[safePosition] === '\n' &&
      safePosition + 1 < text.length &&
      text[safePosition + 1] === '\n') {
    // We're at the start of a paragraph break
    return safePosition;
  }

  // Search for the next paragraph break, starting from current position
  const paragraphBreakIndex = text.indexOf('\n\n', safePosition);

  if (paragraphBreakIndex === -1) {
    return text.length;
  }

  return adjustPositionToBoundary(text, paragraphBreakIndex);
}

export function expandToParagraphBoundary(
  text: string,
  selectionStart: number,
  selectionEnd: number
): { start: number; end: number } {
  const safeStart = adjustPositionToBoundary(text, selectionStart);
  const safeEnd = adjustPositionToBoundary(text, selectionEnd);

  const start = findParagraphStart(text, safeStart);
  const end = findParagraphEnd(text, safeEnd);

  return {
    start: adjustPositionToBoundary(text, start),
    end: adjustPositionToBoundary(text, end)
  };
}

export function expandToSmartBoundary(
  text: string,
  selectionStart: number,
  selectionEnd: number
): { start: number; end: number; boundaryType: 'sentence' | 'paragraph' } {
  const safeStart = adjustPositionToBoundary(text, selectionStart);
  const safeEnd = adjustPositionToBoundary(text, selectionEnd);

  const selectedText = text.slice(safeStart, safeEnd);
  const hasParagraphBreak = selectedText.includes('\n\n');
  const hasMultipleSentences = selectedText.split(SENTENCE_ENDINGS).length > 2;

  if (hasParagraphBreak || hasMultipleSentences) {
    const boundary = expandToParagraphBoundary(text, safeStart, safeEnd);
    return { ...boundary, boundaryType: 'paragraph' };
  }

  const boundary = expandToSentenceBoundary(text, safeStart, safeEnd);
  return { ...boundary, boundaryType: 'sentence' };
}

/**
 * Determines if a selection appears to be an intentional full selection
 * that should be respected exactly, vs a partial selection that should
 * be expanded to boundaries.
 *
 * This function analyzes both the length and boundary alignment of the
 * selection to infer user intent.
 */
export function shouldRespectExactSelection(
  text: string,
  start: number,
  end: number
): boolean {
  const safeStart = adjustPositionToBoundary(text, start);
  const safeEnd = adjustPositionToBoundary(text, end);
  const selectionLength = safeEnd - safeStart;

  // If selection is very small (< 20 chars), always expand
  // User likely wants help completing their selection
  if (selectionLength < 20) {
    return false;
  }

  // If selection is very large (> 200 chars), likely intentional
  // User took time to select a substantial region
  if (selectionLength > 200) {
    return true;
  }

  // For medium selections (20-200 chars), check boundary alignment
  // If both start and end are at natural boundaries, respect the selection
  const startsAtBoundary = isAtBoundary(text, safeStart, 'start');
  const endsAtBoundary = isAtBoundary(text, safeEnd, 'end');

  // If both boundaries are aligned and selection is at least moderate size (> 30 chars)
  // User made a deliberate selection of complete units
  // Lower threshold (30 instead of 50) to respect complete sentence selections
  if (startsAtBoundary && endsAtBoundary && selectionLength > 30) {
    return true;
  }

  // Default: expand to help the user
  return false;
}

/**
 * Check if a position is at a natural text boundary (sentence or paragraph start/end).
 * This helps determine if a user made an intentional selection of complete text units.
 */
function isAtBoundary(text: string, pos: number, side: 'start' | 'end'): boolean {
  const safePos = adjustPositionToBoundary(text, pos);

  if (side === 'start') {
    // Check if at start of text
    if (safePos === 0) return true;

    // Check if at paragraph start (after \n\n)
    if (safePos >= 2 && text.slice(safePos - 2, safePos) === '\n\n') return true;

    // Check if at sentence start (after sentence ending + space(s))
    // We need to look back to find sentence ending punctuation
    if (safePos > 0 && safePos < text.length) {
      // Look back for sentence ending followed by whitespace
      let lookBack = safePos - 1;
      // Skip whitespace
      while (lookBack >= 0 && /\s/.test(text[lookBack])) {
        lookBack--;
      }
      // Check if we found sentence ending punctuation
      if (lookBack >= 0 && SENTENCE_ENDINGS.test(text[lookBack])) {
        if (!isAbbreviation(text, lookBack) && !isEllipsis(text, lookBack)) {
          return true;
        }
      }
    }

    // Check if at line start (after single newline, for list items etc.)
    if (safePos > 0 && text[safePos - 1] === '\n') {
      // Check if this line starts with a list marker
      const lineStart = safePos;
      const lineEnd = getLineEnd(text, lineStart);
      const line = text.slice(lineStart, lineEnd);
      if (LIST_ITEM_START.test(line)) return true;
    }
  } else {
    // Check if at end of text
    if (safePos === text.length) return true;

    // Check if at paragraph end (before \n\n or at \n\n)
    if (safePos < text.length - 1 && text.slice(safePos, safePos + 2) === '\n\n') return true;
    if (safePos > 0 && safePos < text.length && text[safePos - 1] === '\n' && text[safePos] === '\n') return true;

    // Check if at sentence end (just after punctuation, possibly with trailing space)
    // Look back to find the actual sentence ending
    let lookBack = safePos - 1;
    // Skip trailing whitespace
    while (lookBack >= 0 && /\s/.test(text[lookBack])) {
      lookBack--;
    }
    if (lookBack >= 0 && SENTENCE_ENDINGS.test(text[lookBack])) {
      // Make sure it's not an abbreviation or ellipsis
      if (!isAbbreviation(text, lookBack) && !isEllipsis(text, lookBack)) {
        return true;
      }
    }

    // Check if at line end (single newline)
    if (safePos < text.length && text[safePos] === '\n') return true;
  }

  return false;
}
