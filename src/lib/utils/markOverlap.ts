import type { ClozeNote } from '@/lib/types/flashcard';
import type { ReadRange } from '@/lib/types/reading';

export interface OverlapResult {
  overlappingMarks: ClozeNote[];
  safeMarks: ClozeNote[];
  markIdsToDelete: number[];
  overlappingReadRanges: ReadRange[];
  safeReadRanges: ReadRange[];
  hasOverlap: boolean;
}

/**
 * Detect which marks overlap with an edit region
 *
 * A mark overlaps if ANY of these conditions are true:
 * 1. Mark starts inside edit region: mark.start >= editStart && mark.start < editEnd
 * 2. Mark ends inside edit region: mark.end > editStart && mark.end <= editEnd
 * 3. Mark completely contains edit region: mark.start < editStart && mark.end > editEnd
 * 4. Edit region completely contains mark: editStart <= mark.start && editEnd >= mark.end
 *
 * Simplified: mark overlaps if mark.start < editEnd AND mark.end > editStart
 *
 * Edge cases:
 * - Boundary conditions: mark.end === editStart or mark.start === editEnd do NOT overlap
 * - Empty edit region (editStart === editEnd): no overlaps possible
 * - Empty marks (mark.start === mark.end): checked for overlap normally
 * - All mark statuses included (pending, converted, skipped, buried, needs_review)
 *
 * @param editStart - Start position of the edit region (inclusive)
 * @param editEnd - End position of the edit region (exclusive)
 * @param allMarks - All marks to check against the edit region
 * @returns Object with overlapping marks, safe marks, IDs to delete, and hasOverlap flag
 *
 * @example
 * // Mark completely inside edit region
 * const marks = [{ id: 1, startPosition: 10, endPosition: 20, ... }];
 * detectMarkOverlap(5, 25, marks);
 * // Returns: { overlappingMarks: [mark1], safeMarks: [], markIdsToDelete: [1], hasOverlap: true }
 *
 * @example
 * // Mark at boundary (no overlap)
 * const marks = [{ id: 1, startPosition: 0, endPosition: 10, ... }];
 * detectMarkOverlap(10, 20, marks);
 * // Returns: { overlappingMarks: [], safeMarks: [mark1], markIdsToDelete: [], hasOverlap: false }
 *
 * @example
 * // Multiple marks with mixed overlap
 * const marks = [
 *   { id: 1, startPosition: 0, endPosition: 5, ... },    // before (safe)
 *   { id: 2, startPosition: 12, endPosition: 18, ... },  // overlaps
 *   { id: 3, startPosition: 25, endPosition: 30, ... },  // after (safe)
 * ];
 * detectMarkOverlap(10, 20, marks);
 * // Returns: { overlappingMarks: [mark2], safeMarks: [mark1, mark3], markIdsToDelete: [2], hasOverlap: true }
 */
export function detectMarkOverlap(
  editStart: number,
  editEnd: number,
  allMarks: ClozeNote[],
  readRanges: ReadRange[] = []
): OverlapResult {
  const overlappingMarks: ClozeNote[] = [];
  const safeMarks: ClozeNote[] = [];

  for (const mark of allMarks) {
    if (isOverlapping(editStart, editEnd, mark.startPosition, mark.endPosition)) {
      overlappingMarks.push(mark);
    } else {
      safeMarks.push(mark);
    }
  }

  const overlappingReadRanges: ReadRange[] = [];
  const safeReadRanges: ReadRange[] = [];

  for (const range of readRanges) {
    if (isOverlapping(editStart, editEnd, range.startPosition, range.endPosition)) {
      overlappingReadRanges.push(range);
    } else {
      safeReadRanges.push(range);
    }
  }

  return {
    overlappingMarks,
    safeMarks,
    markIdsToDelete: overlappingMarks.map((m) => m.id),
    overlappingReadRanges,
    safeReadRanges,
    hasOverlap: overlappingMarks.length > 0 || overlappingReadRanges.length > 0,
  };
}

/**
 * Check if a mark overlaps with an edit region
 *
 * Two ranges overlap if they share any positions (excluding boundaries)
 * Formula: mark.start < edit.end AND mark.end > edit.start
 *
 * This catches all overlap cases:
 * - Mark inside edit: both conditions satisfied
 * - Edit inside mark: both conditions satisfied
 * - Partial overlap (either end): both conditions satisfied
 *
 * Boundary conditions (no overlap):
 * - mark.end === edit.start: mark ends exactly where edit begins
 * - mark.start === edit.end: mark starts exactly where edit ends
 * - Empty edit region (editStart === editEnd): no overlap possible
 * - Empty mark (markStart === markEnd): no overlap possible
 *
 * @param editStart - Start position of edit region
 * @param editEnd - End position of edit region
 * @param markStart - Start position of mark
 * @param markEnd - End position of mark
 * @returns true if mark overlaps with edit region
 */
function isOverlapping(
  editStart: number,
  editEnd: number,
  markStart: number,
  markEnd: number
): boolean {
  if (editStart === editEnd || markStart === markEnd) {
    return false;
  }
  return markStart < editEnd && markEnd > editStart;
}
