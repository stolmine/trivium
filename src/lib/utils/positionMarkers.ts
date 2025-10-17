import { adjustPositionToBoundary } from './utf16';

const MARKER = '\u2588';

export function insertPositionMarker(
  text: string,
  position: number
): { markedText: string; marker: string } {
  const safePosition = adjustPositionToBoundary(text, position);

  const before = text.slice(0, safePosition);
  const after = text.slice(safePosition);

  return {
    markedText: before + MARKER + after,
    marker: MARKER
  };
}

export function findMarkerPosition(
  text: string,
  marker: string
): number {
  const index = text.indexOf(marker);

  if (index === -1) {
    return -1;
  }

  return adjustPositionToBoundary(text, index);
}

export function removeMarker(text: string, marker: string): string {
  return text.replace(marker, '');
}

export function preserveCursorThroughTransform(
  text: string,
  cursorPosition: number,
  transform: (text: string) => string
): { transformedText: string; newCursorPosition: number } {
  const { markedText, marker } = insertPositionMarker(text, cursorPosition);

  const transformed = transform(markedText);

  const newCursorPosition = findMarkerPosition(transformed, marker);

  const transformedText = removeMarker(transformed, marker);

  if (newCursorPosition === -1) {
    return {
      transformedText,
      newCursorPosition: Math.min(cursorPosition, transformedText.length)
    };
  }

  return {
    transformedText,
    newCursorPosition
  };
}

export function preserveSelectionThroughTransform(
  text: string,
  start: number,
  end: number,
  transform: (text: string) => string
): { transformedText: string; newStart: number; newEnd: number } {
  const startMarker = '\u2588';
  const endMarker = '\u2589';

  const safeStart = adjustPositionToBoundary(text, start);
  const safeEnd = adjustPositionToBoundary(text, end);

  const before = text.slice(0, safeStart);
  const middle = text.slice(safeStart, safeEnd);
  const after = text.slice(safeEnd);

  const markedText = before + startMarker + middle + endMarker + after;

  const transformed = transform(markedText);

  const newStart = transformed.indexOf(startMarker);
  const newEnd = transformed.indexOf(endMarker);

  let transformedText = transformed;
  transformedText = transformedText.replace(startMarker, '');
  transformedText = transformedText.replace(endMarker, '');

  if (newStart === -1 || newEnd === -1) {
    return {
      transformedText,
      newStart: Math.min(safeStart, transformedText.length),
      newEnd: Math.min(safeEnd, transformedText.length)
    };
  }

  const adjustedEnd = newEnd > newStart ? newEnd - 1 : newEnd;

  return {
    transformedText,
    newStart: adjustPositionToBoundary(transformedText, newStart),
    newEnd: adjustPositionToBoundary(transformedText, adjustedEnd)
  };
}
