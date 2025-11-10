import { describe, it, expect } from 'vitest'
import { shouldRespectExactSelection, expandToSmartBoundary, expandToSentenceBoundary } from '../sentenceBoundary'

describe('shouldRespectExactSelection', () => {
  describe('Small selections (< 20 chars) - should always expand', () => {
    it('should expand 3-word selection', () => {
      const text = 'This is a test sentence. Another sentence here.'
      const start = 10 // "test"
      const end = 14
      expect(shouldRespectExactSelection(text, start, end)).toBe(false)
    })

    it('should expand single word selection', () => {
      const text = 'Hello world this is a test.'
      const start = 6 // "world"
      const end = 11
      expect(shouldRespectExactSelection(text, start, end)).toBe(false)
    })

    it('should expand very short selection', () => {
      const text = 'The quick brown fox jumps.'
      const start = 4 // "quick"
      const end = 9
      expect(shouldRespectExactSelection(text, start, end)).toBe(false)
    })
  })

  describe('Large selections (> 200 chars) - should respect exactly', () => {
    it('should respect large selection', () => {
      const text = 'A'.repeat(250)
      const start = 0
      const end = 250
      expect(shouldRespectExactSelection(text, start, end)).toBe(true)
    })

    it('should respect multi-paragraph selection', () => {
      const text = `This is the first paragraph with quite a bit of content here. It continues with more details and explanations about the topic at hand.\n\nThis is the second paragraph that also contains significant text. It provides additional context and information that the user has deliberately selected.`
      const start = 0
      const end = text.length
      expect(shouldRespectExactSelection(text, start, end)).toBe(true)
    })
  })

  describe('Medium selections (20-200 chars) with boundary alignment', () => {
    it('should respect complete sentence selection at boundaries', () => {
      const text = 'First sentence. Second sentence here with more content. Third sentence.'
      const start = 16 // Start of "Second" (after ". ")
      const end = 56 // After "content." and the space (right before "Third")
      // This selection is 40 chars and includes trailing space after period
      // The end position (56) is at a sentence boundary (start of "Third")
      expect(shouldRespectExactSelection(text, start, end)).toBe(true)
    })

    it('should expand partial sentence selection', () => {
      const text = 'This is a longer sentence with many words in the middle of it. Another sentence.'
      const start = 20 // middle of sentence, not at boundary
      const end = 50 // middle of sentence
      expect(shouldRespectExactSelection(text, start, end)).toBe(false)
    })

    it('should respect paragraph boundary selection', () => {
      const text = 'First paragraph.\n\nSecond paragraph with enough content to be meaningful.\n\nThird paragraph.'
      const start = 18 // Start of second paragraph
      const end = 73 // End of second paragraph (before \n\n)
      // Length is 55 chars, both boundaries aligned, > 30 threshold
      expect(shouldRespectExactSelection(text, start, end)).toBe(true)
    })

    it('should expand if only start is at boundary but not end', () => {
      const text = 'First sentence. Second sentence with content. Third sentence.'
      const start = 16 // Start of "Second" (at boundary)
      const end = 35 // Middle of "content" (not at boundary)
      expect(shouldRespectExactSelection(text, start, end)).toBe(false)
    })

    it('should expand if only end is at boundary but not start', () => {
      const text = 'First sentence. Second sentence with content. Third sentence.'
      const start = 20 // Middle of "Second" (not at boundary)
      const end = 45 // End of "content." (at boundary)
      expect(shouldRespectExactSelection(text, start, end)).toBe(false)
    })
  })

  describe('Edge cases', () => {
    it('should respect selection at document start', () => {
      const text = 'This is a complete sentence at the start of the document with sufficient length.'
      const start = 0
      const end = 80
      expect(shouldRespectExactSelection(text, start, end)).toBe(true)
    })

    it('should respect selection at document end', () => {
      const text = 'Preceding text. This is a complete sentence at the end of the document.'
      const start = 16
      const end = text.length
      expect(shouldRespectExactSelection(text, start, end)).toBe(true)
    })

    it('should expand selection with trailing whitespace', () => {
      const text = 'A sentence here.   ' // 19 chars with spaces
      const start = 0
      const end = 19
      // This is < 20 chars, so should expand
      expect(shouldRespectExactSelection(text, start, end)).toBe(false)
    })

    it('should handle empty or near-empty selections', () => {
      const text = 'Some text here.'
      const start = 5
      const end = 5 // Empty selection
      expect(shouldRespectExactSelection(text, start, end)).toBe(false)
    })
  })
})

describe('expandToSmartBoundary integration', () => {
  describe('Should expand partial selections', () => {
    it('should expand word selection to sentence', () => {
      const text = 'This is a test sentence. Another one here.'
      const start = 10 // "test"
      const end = 14
      const result = expandToSmartBoundary(text, start, end)
      expect(result.start).toBe(0)
      expect(result.end).toBe(24)
      expect(result.boundaryType).toBe('sentence')
    })

    it('should expand partial sentence to full sentence', () => {
      const text = 'First sentence. Second sentence with more content. Third sentence.'
      const start = 20 // "sentence with"
      const end = 35
      const result = expandToSmartBoundary(text, start, end)
      expect(result.start).toBe(16)
      expect(result.end).toBe(50)
      expect(result.boundaryType).toBe('sentence')
    })

    it('should expand to paragraph for multi-sentence selection', () => {
      const text = 'Sentence one. Sentence two. Sentence three.\n\nNext paragraph.'
      const start = 0
      const end = 30 // Spans multiple sentences
      const result = expandToSmartBoundary(text, start, end)
      expect(result.boundaryType).toBe('paragraph')
      expect(result.start).toBe(0)
      // The paragraph ends at position 43 (before \n\n), not 44
      expect(result.end).toBe(43)
    })
  })

  describe('Intent-based expansion workflow', () => {
    it('small selection: should expand', () => {
      const text = 'This is a test sentence with some content. Another sentence.'
      const start = 10 // "test"
      const end = 14

      // Check intent
      const respect = shouldRespectExactSelection(text, start, end)
      expect(respect).toBe(false)

      // Should expand
      const result = expandToSmartBoundary(text, start, end)
      expect(result.start).toBe(0)
      expect(result.end).toBe(42)
    })

    it('large aligned selection: should respect exactly', () => {
      const text = 'First sentence. This is a carefully selected sentence that contains enough content to meet the threshold. Final sentence.'
      const start = 16 // Start of second sentence
      const end = 105 // End of second sentence (89 chars, > 30 threshold, at boundaries)

      // Check intent
      const respect = shouldRespectExactSelection(text, start, end)
      expect(respect).toBe(true)

      // Should NOT expand (respect exact)
      // In real usage, we would skip calling expandToSmartBoundary
      expect(end - start).toBeGreaterThan(30)
    })

    it('medium unaligned selection: should expand', () => {
      const text = 'This is the first sentence. This is the second sentence with more content here. Third.'
      const start = 30 // Middle of second sentence
      const end = 65 // Middle of second sentence

      // Check intent
      const respect = shouldRespectExactSelection(text, start, end)
      expect(respect).toBe(false)

      // Should expand
      const result = expandToSmartBoundary(text, start, end)
      expect(result.start).toBe(28)
      expect(result.end).toBe(79)
    })
  })
})

describe('expandToSentenceBoundary - abbreviation handling', () => {
  describe('Parenthetical abbreviations in historical texts', () => {
    it('should not break on "(r." in reigned dates', () => {
      const text = 'King Edgar (r. 960-976) was an important monarch.'
      const start = 0
      const end = 10 // "King Edgar"
      const result = expandToSentenceBoundary(text, start, end)
      expect(result.start).toBe(0)
      expect(result.end).toBe(text.length) // Should include the full sentence, not break at "(r."
    })

    it('should not break on "(b." for birth dates', () => {
      const text = 'Shakespeare (b. 1564) wrote many plays.'
      const start = 0
      const end = 11 // "Shakespeare"
      const result = expandToSentenceBoundary(text, start, end)
      expect(result.start).toBe(0)
      expect(result.end).toBe(text.length)
    })

    it('should not break on "(d." for death dates', () => {
      const text = 'Leonardo da Vinci (d. 1519) was a polymath.'
      const start = 0
      const end = 17 // "Leonardo da Vinci"
      const result = expandToSentenceBoundary(text, start, end)
      expect(result.start).toBe(0)
      expect(result.end).toBe(text.length)
    })

    it('should not break on "(c." for circa dates', () => {
      const text = 'The building was constructed (c. 1450) in Florence.'
      const start = 0
      const end = 20 // "The building was constructed"
      const result = expandToSentenceBoundary(text, start, end)
      expect(result.start).toBe(0)
      expect(result.end).toBe(text.length)
    })

    it('should not break on "(fl." for flourished dates', () => {
      const text = 'The poet (fl. 1300-1350) wrote in vernacular Italian.'
      const start = 0
      const end = 8 // "The poet"
      const result = expandToSentenceBoundary(text, start, end)
      expect(result.start).toBe(0)
      expect(result.end).toBe(text.length)
    })

    it('should handle multiple parenthetical abbreviations in one sentence', () => {
      const text = 'King John (b. 1166, r. 1199-1216, d. 1216) signed the Magna Carta.'
      const start = 0
      const end = 9 // "King John"
      const result = expandToSentenceBoundary(text, start, end)
      expect(result.start).toBe(0)
      expect(result.end).toBe(text.length)
    })

    it('should correctly identify sentence end after parenthetical abbreviation', () => {
      const text = 'King Edgar (r. 960-976) was important. Another sentence here.'
      const start = 0
      const end = 10 // "King Edgar"
      const result = expandToSentenceBoundary(text, start, end)
      expect(result.start).toBe(0)
      expect(result.end).toBe(38) // Should stop at the real sentence ending, not at "(r."
    })
  })
})
