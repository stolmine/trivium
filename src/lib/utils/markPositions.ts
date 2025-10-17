import type { ClozeNote } from '@/lib/types/flashcard';

export interface EditRegion {
  start: number;
  end: number;
  originalText: string;
}

export interface UpdatedMarks {
  marks: ClozeNote[];
  flaggedForReview: number[];
  shifted: number[];
}

/**
 * Update mark positions after a text edit
 *
 * When text is edited, marks need to be updated based on their position relative
 * to the edit region:
 * - Marks before the edit: positions unchanged
 * - Marks after the edit: positions shifted by the length delta
 * - Marks overlapping the edit: flagged for review with updated status
 *
 * @param marks - Array of marks to update
 * @param edit - The region that was edited with original text
 * @param editedText - The new text that replaced the original text
 * @returns Updated marks with IDs of flagged and shifted marks
 *
 * @example
 * // Case 1: Edit before marks - marks are shifted
 * const marks = [
 *   { id: 1, startPosition: 10, endPosition: 15, originalText: "world" }
 * ];
 * const edit = { start: 0, end: 5, originalText: "Hello" };
 * const result = updateMarkPositions(marks, edit, "Hi");
 * // Result: mark at positions 7-12 (shifted left by 3)
 * // result.shifted = [1]
 *
 * @example
 * // Case 2: Edit overlaps mark - mark flagged for review
 * const marks = [
 *   { id: 1, startPosition: 5, endPosition: 15, originalText: "Hello world" }
 * ];
 * const edit = { start: 7, end: 12, originalText: "o wor" };
 * const result = updateMarkPositions(marks, edit, "i w");
 * // Result: mark flagged with status='needs_review'
 * // result.flaggedForReview = [1]
 *
 * @example
 * // Case 3: Edit after mark - no change
 * const marks = [
 *   { id: 1, startPosition: 0, endPosition: 5, originalText: "Hello" }
 * ];
 * const edit = { start: 10, end: 15, originalText: "world" };
 * const result = updateMarkPositions(marks, edit, "Earth");
 * // Result: mark positions unchanged
 * // result.shifted = [], result.flaggedForReview = []
 *
 * @example
 * // Case 4: Mark at exact edit boundary (end === edit.start)
 * const marks = [
 *   { id: 1, startPosition: 0, endPosition: 5, originalText: "Hello" }
 * ];
 * const edit = { start: 5, end: 10, originalText: " test" };
 * const result = updateMarkPositions(marks, edit, " world");
 * // Result: mark unchanged (end boundary is exclusive)
 * // result.shifted = [], result.flaggedForReview = []
 *
 * @example
 * // Case 5: Deletion (zero-length replacement)
 * const marks = [
 *   { id: 1, startPosition: 20, endPosition: 25, originalText: "after" }
 * ];
 * const edit = { start: 5, end: 15, originalText: "deleted" };
 * const result = updateMarkPositions(marks, edit, "");
 * // Result: mark shifted left by 10 (deletion length)
 * // result.shifted = [1]
 *
 * @example
 * // Case 6: Multiple marks with different relationships to edit
 * const marks = [
 *   { id: 1, startPosition: 0, endPosition: 5, originalText: "before" },
 *   { id: 2, startPosition: 10, endPosition: 15, originalText: "overlap" },
 *   { id: 3, startPosition: 20, endPosition: 25, originalText: "after" }
 * ];
 * const edit = { start: 8, end: 12, originalText: "xxxx" };
 * const result = updateMarkPositions(marks, edit, "yy");
 * // Result:
 * // - mark 1: unchanged (before edit)
 * // - mark 2: flagged (overlaps edit)
 * // - mark 3: shifted left by 2
 * // result.flaggedForReview = [2], result.shifted = [3]
 *
 * @example
 * // Case 7: Entire mark deleted
 * const marks = [
 *   { id: 1, startPosition: 5, endPosition: 10, originalText: "gone" }
 * ];
 * const edit = { start: 0, end: 20, originalText: "everything here is gone" };
 * const result = updateMarkPositions(marks, edit, "new");
 * // Result: mark flagged for review (was completely inside deleted region)
 * // result.flaggedForReview = [1]
 *
 * @example
 * // Case 8: Very small overlap (1-2 chars)
 * const marks = [
 *   { id: 1, startPosition: 5, endPosition: 10, originalText: "hello" }
 * ];
 * const edit = { start: 9, end: 12, originalText: "ox" };
 * const result = updateMarkPositions(marks, edit, "y");
 * // Result: mark flagged (even 1 char overlap triggers review)
 * // result.flaggedForReview = [1]
 */
export function updateMarkPositions(
  marks: ClozeNote[],
  edit: EditRegion,
  editedText: string
): UpdatedMarks {
  if (edit.start < 0 || edit.end < edit.start) {
    throw new Error(
      `Invalid edit region: start=${edit.start}, end=${edit.end}`
    );
  }

  const lengthDelta = editedText.length - edit.originalText.length;
  const flaggedForReview: number[] = [];
  const shifted: number[] = [];

  const updatedMarks = marks.map((mark) => {
    if (mark.endPosition <= edit.start) {
      return mark;
    }

    if (mark.startPosition >= edit.end) {
      const updatedMark = {
        ...mark,
        startPosition: mark.startPosition + lengthDelta,
        endPosition: mark.endPosition + lengthDelta,
      };
      shifted.push(mark.id);
      return updatedMark;
    }

    const updatedMark = {
      ...mark,
      status: 'needs_review',
      notes: 'Text was edited in marked region',
    };
    flaggedForReview.push(mark.id);
    return updatedMark;
  });

  return {
    marks: updatedMarks,
    flaggedForReview,
    shifted,
  };
}
