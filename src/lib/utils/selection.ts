export interface SelectionInfo {
  text: string;
  startOffset: number;
  endOffset: number;
  range: Range;
}

export function getTextSelection(): SelectionInfo | null {
  const selection = window.getSelection();

  if (!selection || selection.rangeCount === 0) {
    return null;
  }

  const range = selection.getRangeAt(0);
  const text = selection.toString().trim();

  if (!text) {
    return null;
  }

  return {
    text,
    startOffset: range.startOffset,
    endOffset: range.endOffset,
    range,
  };
}

export function getContextAroundSelection(
  selection: SelectionInfo,
  contextLength: number = 50
): { before: string; after: string } {
  const range = selection.range;
  const container = range.commonAncestorContainer;
  const fullText = container.textContent || '';

  const startIndex = range.startOffset;
  const endIndex = range.endOffset;

  const before = fullText.slice(Math.max(0, startIndex - contextLength), startIndex);
  const after = fullText.slice(endIndex, Math.min(fullText.length, endIndex + contextLength));

  return { before, after };
}

export function clearSelection(): void {
  const selection = window.getSelection();
  if (selection) {
    selection.removeAllRanges();
  }
}
