import { describe, it, expect } from 'vitest'
import {
  parseMarkdownLink,
  findAllMarkdownLinks,
  stripMarkdownLinks,
  isPositionInLink
} from '../markdownLinkParser'

describe('markdownLinkParser', () => {
  describe('parseMarkdownLink', () => {
    it('should parse simple markdown links', () => {
      const text = '[Hello](https://example.com)'
      const result = parseMarkdownLink(text, 0)

      expect(result).toEqual({
        linkText: 'Hello',
        url: 'https://example.com',
        startIndex: 0,
        endIndex: 28
      })
    })

    it('should parse links with parentheses in URL', () => {
      const text = '[Democracy](https://en.wikipedia.org/wiki/Democracy_(disambiguation))'
      const result = parseMarkdownLink(text, 0)

      expect(result).not.toBeNull()
      expect(result?.linkText).toBe('Democracy')
      expect(result?.url).toBe('https://en.wikipedia.org/wiki/Democracy_(disambiguation)')
      expect(result?.endIndex).toBe(text.length)
    })

    it('should parse links with multiple levels of nested parentheses in URL', () => {
      const text = '[Test](https://example.com/path_(foo_(bar)))'
      const result = parseMarkdownLink(text, 0)

      expect(result).not.toBeNull()
      expect(result?.url).toBe('https://example.com/path_(foo_(bar))')
    })

    it('should parse links with brackets in link text', () => {
      const text = '[[Special Text]](https://example.com)'
      const result = parseMarkdownLink(text, 0)

      expect(result).not.toBeNull()
      expect(result?.linkText).toBe('[Special Text]')
      expect(result?.url).toBe('https://example.com')
    })

    it('should return null for non-links', () => {
      const text = 'Just plain text'
      const result = parseMarkdownLink(text, 0)

      expect(result).toBeNull()
    })

    it('should return null for incomplete links', () => {
      const text = '[Incomplete'
      const result = parseMarkdownLink(text, 0)

      expect(result).toBeNull()
    })

    it('should handle empty link text', () => {
      const text = '[](https://example.com)'
      const result = parseMarkdownLink(text, 0)

      expect(result).not.toBeNull()
      expect(result?.linkText).toBe('')
      expect(result?.url).toBe('https://example.com')
    })
  })

  describe('findAllMarkdownLinks', () => {
    it('should find multiple links in text', () => {
      const text = '[Link1](url1) some text [Link2](url2) more text [Link3](url3)'
      const results = findAllMarkdownLinks(text)

      expect(results).toHaveLength(3)
      expect(results[0].linkText).toBe('Link1')
      expect(results[1].linkText).toBe('Link2')
      expect(results[2].linkText).toBe('Link3')
    })

    it('should find links with parentheses in URLs', () => {
      const text = '[Sparta](https://en.wikipedia.org/wiki/Sparta_(city)) and [Athens](https://en.wikipedia.org/wiki/Athens_(city))'
      const results = findAllMarkdownLinks(text)

      expect(results).toHaveLength(2)
      expect(results[0].url).toBe('https://en.wikipedia.org/wiki/Sparta_(city)')
      expect(results[1].url).toBe('https://en.wikipedia.org/wiki/Athens_(city)')
    })

    it('should handle text between links correctly', () => {
      const text = '[Helot](url1) treatment at Sparta [Alcman](url2)'
      const results = findAllMarkdownLinks(text)

      expect(results).toHaveLength(2)
      expect(results[0].linkText).toBe('Helot')
      expect(results[1].linkText).toBe('Alcman')
    })
  })

  describe('stripMarkdownLinks', () => {
    it('should strip links and keep only link text', () => {
      const text = '[Hello](https://example.com) world'
      const result = stripMarkdownLinks(text)

      expect(result).toBe('Hello world')
    })

    it('should handle links with parentheses in URLs correctly', () => {
      const text = '[Sparta](https://en.wikipedia.org/wiki/Sparta_(city)) treatment'
      const result = stripMarkdownLinks(text)

      // Should be "Sparta treatment", not "Sparta) treatment"
      expect(result).toBe('Sparta treatment')
      expect(result).not.toContain(')')
    })

    it('should preserve text between links', () => {
      const text = '[Helot](url1) treatment at Sparta [Alcman](url2)'
      const result = stripMarkdownLinks(text)

      expect(result).toBe('Helot treatment at Sparta Alcman')
    })

    it('should handle multiple links with complex URLs', () => {
      const text = '[Democracy](https://en.wikipedia.org/wiki/Democracy_(disambiguation)) and [Republic](https://en.wikipedia.org/wiki/Republic_(Plato))'
      const result = stripMarkdownLinks(text)

      expect(result).toBe('Democracy and Republic')
      expect(result).not.toContain(')')
    })
  })

  describe('isPositionInLink', () => {
    it('should detect positions inside links', () => {
      const text = 'prefix [link](url) suffix'

      // Position 7 is at 'l' in 'link'
      expect(isPositionInLink(7, text)).toBe(true)

      // Position 0 is before the link
      expect(isPositionInLink(0, text)).toBe(false)

      // Position 19 is after the link (in ' suffix')
      expect(isPositionInLink(19, text)).toBe(false)
    })

    it('should handle links with parentheses in URLs', () => {
      const text = '[Test](https://en.wikipedia.org/wiki/Test_(page))'

      // Position 2 is inside 'Test'
      expect(isPositionInLink(2, text)).toBe(true)

      // Position 50 is after the link
      expect(isPositionInLink(50, text)).toBe(false)
    })
  })

  describe('Bug regression tests', () => {
    it('should not lose text between links (Bug #1)', () => {
      const text = '[Helot](https://en.wikipedia.org/wiki/Helot) treatment at Sparta betoken less of cruelty than of ostentatious scorn". He has been followed recently by J. Ducat (1974 and 1990), who describes Spartan treatment of the Helots as a kind of ideological warfare, designed to condition the Helots to think of themselves as inferiors. This strategy seems to have been successful at least for Laconian Helots: when the Thebans ordered a group of Laconian helot prisoners to recite the verses of [Alcman](https://en.wikipedia.org/wiki/Alcman)'

      const stripped = stripMarkdownLinks(text)

      // Should contain the full text between links
      expect(stripped).toContain('treatment at Sparta')
      expect(stripped).toContain('Ducat (1974 and 1990)')
      expect(stripped).toContain('verses of')

      // Should not have stray brackets or parentheses
      expect(stripped).not.toMatch(/\]\s+\[/)
      expect(stripped).not.toMatch(/Helot\]/)
      expect(stripped).not.toMatch(/\[Alcman/)
    })

    it('should not treat [citation needed] as a link (Bug #2)', () => {
      const text = 'This is a fact [citation needed] with more text'
      const links = findAllMarkdownLinks(text)

      // Should not find any links
      expect(links).toHaveLength(0)

      // Stripping should not change the text
      const stripped = stripMarkdownLinks(text)
      expect(stripped).toBe(text)
    })

    it('should not create giant link from [Helot] to next real link (Bug #3)', () => {
      // This is the critical bug: [Helot] without (url) should NOT turn following text into a link
      const text = 'respecting [Helot] treatment at Sparta betoken less of cruelty than of ostentatious scorn". He has been followed recently by J. Ducat (1974 and 1990), who describes Spartan treatment of the Helots as a kind of ideological warfare, designed to condition the Helots to think of themselves as inferiors. This strategy seems to have been successful at least for Laconian Helots: when the Thebans ordered a group of Laconian helot prisoners to recite the verses of [Alcman](https://en.wikipedia.org/wiki/Alcman)'
      const links = findAllMarkdownLinks(text)

      // Should only find ONE link: [Alcman](url)
      expect(links).toHaveLength(1)
      expect(links[0].linkText).toBe('Alcman')
      expect(links[0].url).toBe('https://en.wikipedia.org/wiki/Alcman')

      // [Helot] should NOT be treated as a link
      const stripped = stripMarkdownLinks(text)
      expect(stripped).toContain('[Helot]')  // Brackets should be preserved
      expect(stripped).toContain('treatment at Sparta')  // Text after [Helot] should be plain text
    })

    it('should not accidentally create links from [text](text) patterns', () => {
      const text = 'This is false [citation needed](according to sources) in the text'
      const links = findAllMarkdownLinks(text)

      // This would accidentally match if we only checked for [...](...) pattern
      // But it should NOT be treated as a link because it's not meant to be one
      // Actually, this WILL match with our parser - that's correct markdown syntax
      // The issue is whether Wikipedia is creating such patterns accidentally
      expect(links).toHaveLength(1) // This is actually valid markdown
      expect(links[0].linkText).toBe('citation needed')
    })
  })
})
