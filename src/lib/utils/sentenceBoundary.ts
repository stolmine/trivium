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
    const paragraphBreakIndex = text.indexOf('\n\n', currentPos);
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
