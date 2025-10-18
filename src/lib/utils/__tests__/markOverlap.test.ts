import { describe, it, expect } from 'vitest';
import { detectMarkOverlap } from '../markOverlap';
import type { ClozeNote } from '@/lib/types/flashcard';

const createMark = (
  id: number,
  start: number,
  end: number,
  status: string = 'pending'
): ClozeNote => ({
  id,
  textId: 1,
  userId: 1,
  originalText: `mark${id}_text`,
  parsedSegments: '[]',
  clozeCount: 0,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  startPosition: start,
  endPosition: end,
  status,
});

describe('detectMarkOverlap', () => {
  describe('No overlap cases', () => {
    it('should not detect mark completely before edit region', () => {
      const marks = [createMark(1, 0, 5)];
      const result = detectMarkOverlap(10, 20, marks);

      expect(result.overlappingMarks).toHaveLength(0);
      expect(result.safeMarks).toHaveLength(1);
      expect(result.safeMarks[0].id).toBe(1);
      expect(result.markIdsToDelete).toEqual([]);
      expect(result.hasOverlap).toBe(false);
    });

    it('should not detect mark completely after edit region', () => {
      const marks = [createMark(1, 25, 30)];
      const result = detectMarkOverlap(10, 20, marks);

      expect(result.overlappingMarks).toHaveLength(0);
      expect(result.safeMarks).toHaveLength(1);
      expect(result.markIdsToDelete).toEqual([]);
      expect(result.hasOverlap).toBe(false);
    });

    it('should not detect mark ending exactly at edit start (exclusive boundary)', () => {
      const marks = [createMark(1, 0, 10)];
      const result = detectMarkOverlap(10, 20, marks);

      expect(result.overlappingMarks).toHaveLength(0);
      expect(result.safeMarks).toHaveLength(1);
      expect(result.hasOverlap).toBe(false);
    });

    it('should not detect mark starting exactly at edit end (exclusive boundary)', () => {
      const marks = [createMark(1, 20, 30)];
      const result = detectMarkOverlap(10, 20, marks);

      expect(result.overlappingMarks).toHaveLength(0);
      expect(result.safeMarks).toHaveLength(1);
      expect(result.hasOverlap).toBe(false);
    });
  });

  describe('Overlap cases - mark inside edit', () => {
    it('should detect mark completely inside edit region', () => {
      const marks = [createMark(1, 12, 18)];
      const result = detectMarkOverlap(10, 20, marks);

      expect(result.overlappingMarks).toHaveLength(1);
      expect(result.overlappingMarks[0].id).toBe(1);
      expect(result.safeMarks).toHaveLength(0);
      expect(result.markIdsToDelete).toEqual([1]);
      expect(result.hasOverlap).toBe(true);
    });

    it('should detect mark at exact start and end of edit region', () => {
      const marks = [createMark(1, 10, 20)];
      const result = detectMarkOverlap(10, 20, marks);

      expect(result.overlappingMarks).toHaveLength(1);
      expect(result.hasOverlap).toBe(true);
    });
  });

  describe('Overlap cases - partial overlap', () => {
    it('should detect mark partially overlapping at start', () => {
      const marks = [createMark(1, 5, 15)];
      const result = detectMarkOverlap(10, 20, marks);

      expect(result.overlappingMarks).toHaveLength(1);
      expect(result.overlappingMarks[0].id).toBe(1);
      expect(result.safeMarks).toHaveLength(0);
      expect(result.hasOverlap).toBe(true);
    });

    it('should detect mark partially overlapping at end', () => {
      const marks = [createMark(1, 15, 25)];
      const result = detectMarkOverlap(10, 20, marks);

      expect(result.overlappingMarks).toHaveLength(1);
      expect(result.hasOverlap).toBe(true);
    });

    it('should detect mark overlapping by 1 character at start', () => {
      const marks = [createMark(1, 9, 11)];
      const result = detectMarkOverlap(10, 20, marks);

      expect(result.overlappingMarks).toHaveLength(1);
      expect(result.hasOverlap).toBe(true);
    });

    it('should detect mark overlapping by 1 character at end', () => {
      const marks = [createMark(1, 19, 21)];
      const result = detectMarkOverlap(10, 20, marks);

      expect(result.overlappingMarks).toHaveLength(1);
      expect(result.hasOverlap).toBe(true);
    });
  });

  describe('Overlap cases - containment', () => {
    it('should detect mark completely containing edit region', () => {
      const marks = [createMark(1, 5, 30)];
      const result = detectMarkOverlap(10, 20, marks);

      expect(result.overlappingMarks).toHaveLength(1);
      expect(result.overlappingMarks[0].id).toBe(1);
      expect(result.hasOverlap).toBe(true);
    });

    it('should detect edit region completely containing mark', () => {
      const marks = [createMark(1, 12, 18)];
      const result = detectMarkOverlap(10, 20, marks);

      expect(result.overlappingMarks).toHaveLength(1);
      expect(result.hasOverlap).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty edit region (start === end)', () => {
      const marks = [createMark(1, 8, 12)];
      const result = detectMarkOverlap(10, 10, marks);

      expect(result.overlappingMarks).toHaveLength(0);
      expect(result.safeMarks).toHaveLength(1);
      expect(result.hasOverlap).toBe(false);
    });

    it('should handle empty mark (start === end)', () => {
      const marks = [createMark(1, 15, 15)];
      const result = detectMarkOverlap(10, 20, marks);

      expect(result.overlappingMarks).toHaveLength(0);
      expect(result.safeMarks).toHaveLength(1);
      expect(result.hasOverlap).toBe(false);
    });

    it('should handle zero-width edit at mark boundary', () => {
      const marks = [createMark(1, 10, 20)];
      const result = detectMarkOverlap(10, 10, marks);

      expect(result.overlappingMarks).toHaveLength(0);
      expect(result.hasOverlap).toBe(false);
    });

    it('should handle empty marks array', () => {
      const result = detectMarkOverlap(10, 20, []);

      expect(result.overlappingMarks).toHaveLength(0);
      expect(result.safeMarks).toHaveLength(0);
      expect(result.markIdsToDelete).toEqual([]);
      expect(result.hasOverlap).toBe(false);
    });
  });

  describe('Multiple marks', () => {
    it('should correctly categorize multiple marks', () => {
      const marks = [
        createMark(1, 0, 5), // before (safe)
        createMark(2, 12, 18), // inside (overlap)
        createMark(3, 25, 30), // after (safe)
        createMark(4, 8, 15), // partial overlap at start
        createMark(5, 15, 25), // partial overlap at end
      ];
      const result = detectMarkOverlap(10, 20, marks);

      expect(result.overlappingMarks).toHaveLength(3);
      expect(result.overlappingMarks.map((m) => m.id).sort()).toEqual([2, 4, 5]);
      expect(result.safeMarks).toHaveLength(2);
      expect(result.safeMarks.map((m) => m.id).sort()).toEqual([1, 3]);
      expect(result.markIdsToDelete.sort()).toEqual([2, 4, 5]);
      expect(result.hasOverlap).toBe(true);
    });

    it('should handle all marks being safe', () => {
      const marks = [
        createMark(1, 0, 5),
        createMark(2, 5, 10),
        createMark(3, 30, 35),
        createMark(4, 35, 40),
      ];
      const result = detectMarkOverlap(10, 20, marks);

      expect(result.overlappingMarks).toHaveLength(0);
      expect(result.safeMarks).toHaveLength(4);
      expect(result.hasOverlap).toBe(false);
    });

    it('should handle all marks overlapping', () => {
      const marks = [
        createMark(1, 12, 15),
        createMark(2, 14, 18),
        createMark(3, 10, 20),
        createMark(4, 5, 25),
      ];
      const result = detectMarkOverlap(10, 20, marks);

      expect(result.overlappingMarks).toHaveLength(4);
      expect(result.safeMarks).toHaveLength(0);
      expect(result.markIdsToDelete).toEqual([1, 2, 3, 4]);
      expect(result.hasOverlap).toBe(true);
    });

    it('should preserve mark order in results', () => {
      const marks = [
        createMark(5, 0, 5), // safe
        createMark(3, 12, 15), // overlap
        createMark(1, 25, 30), // safe
        createMark(4, 15, 18), // overlap
        createMark(2, 30, 35), // safe
      ];
      const result = detectMarkOverlap(10, 20, marks);

      expect(result.overlappingMarks.map((m) => m.id)).toEqual([3, 4]);
      expect(result.safeMarks.map((m) => m.id)).toEqual([5, 1, 2]);
    });
  });

  describe('Mark status handling', () => {
    it('should include marks with status "pending"', () => {
      const marks = [createMark(1, 12, 18, 'pending')];
      const result = detectMarkOverlap(10, 20, marks);

      expect(result.overlappingMarks).toHaveLength(1);
      expect(result.hasOverlap).toBe(true);
    });

    it('should include marks with status "converted"', () => {
      const marks = [createMark(1, 12, 18, 'converted')];
      const result = detectMarkOverlap(10, 20, marks);

      expect(result.overlappingMarks).toHaveLength(1);
      expect(result.hasOverlap).toBe(true);
    });

    it('should include marks with status "skipped"', () => {
      const marks = [createMark(1, 12, 18, 'skipped')];
      const result = detectMarkOverlap(10, 20, marks);

      expect(result.overlappingMarks).toHaveLength(1);
      expect(result.hasOverlap).toBe(true);
    });

    it('should include marks with status "buried"', () => {
      const marks = [createMark(1, 12, 18, 'buried')];
      const result = detectMarkOverlap(10, 20, marks);

      expect(result.overlappingMarks).toHaveLength(1);
      expect(result.hasOverlap).toBe(true);
    });

    it('should include marks with status "needs_review"', () => {
      const marks = [createMark(1, 12, 18, 'needs_review')];
      const result = detectMarkOverlap(10, 20, marks);

      expect(result.overlappingMarks).toHaveLength(1);
      expect(result.hasOverlap).toBe(true);
    });

    it('should include marks with mixed statuses', () => {
      const marks = [
        createMark(1, 11, 13, 'pending'),
        createMark(2, 13, 15, 'converted'),
        createMark(3, 15, 17, 'skipped'),
        createMark(4, 17, 19, 'buried'),
      ];
      const result = detectMarkOverlap(10, 20, marks);

      expect(result.overlappingMarks).toHaveLength(4);
      expect(result.hasOverlap).toBe(true);
    });
  });

  describe('Boundary precision', () => {
    it('should handle adjacent marks with precise boundaries', () => {
      const marks = [
        createMark(1, 0, 10), // ends at edit start (no overlap)
        createMark(2, 20, 30), // starts at edit end (no overlap)
      ];
      const result = detectMarkOverlap(10, 20, marks);

      expect(result.overlappingMarks).toHaveLength(0);
      expect(result.safeMarks).toHaveLength(2);
      expect(result.hasOverlap).toBe(false);
    });

    it('should detect overlap when mark extends 1 char into edit region', () => {
      const marks = [
        createMark(1, 0, 11), // extends 1 char into edit
        createMark(2, 19, 30), // starts 1 char before edit end
      ];
      const result = detectMarkOverlap(10, 20, marks);

      expect(result.overlappingMarks).toHaveLength(2);
      expect(result.hasOverlap).toBe(true);
    });

    it('should handle consecutive non-overlapping regions', () => {
      const marks = [
        createMark(1, 0, 10),
        createMark(2, 10, 20),
        createMark(3, 20, 30),
      ];
      const result = detectMarkOverlap(10, 20, marks);

      // Only mark 2 overlaps (exact match with edit region)
      expect(result.overlappingMarks).toHaveLength(1);
      expect(result.overlappingMarks[0].id).toBe(2);
      expect(result.safeMarks).toHaveLength(2);
      expect(result.hasOverlap).toBe(true);
    });
  });

  describe('Large-scale scenarios', () => {
    it('should handle many marks efficiently', () => {
      const marks: ClozeNote[] = [];
      for (let i = 0; i < 100; i++) {
        marks.push(createMark(i, i * 10, i * 10 + 5));
      }
      const result = detectMarkOverlap(150, 160, marks);

      // Marks 15 (150-155), and possibly others depending on exact positions
      expect(result.hasOverlap).toBe(true);
      expect(result.overlappingMarks.length + result.safeMarks.length).toBe(100);
    });

    it('should correctly identify overlap in complex nested scenario', () => {
      const marks = [
        createMark(1, 5, 25), // contains edit
        createMark(2, 10, 20), // exact match
        createMark(3, 12, 18), // inside edit
        createMark(4, 8, 15), // partial left
        createMark(5, 15, 22), // partial right
        createMark(6, 0, 5), // before
        createMark(7, 25, 30), // after
      ];
      const result = detectMarkOverlap(10, 20, marks);

      expect(result.overlappingMarks).toHaveLength(5);
      expect(result.overlappingMarks.map((m) => m.id).sort()).toEqual([1, 2, 3, 4, 5]);
      expect(result.safeMarks).toHaveLength(2);
      expect(result.safeMarks.map((m) => m.id).sort()).toEqual([6, 7]);
      expect(result.hasOverlap).toBe(true);
    });
  });
});
