/**
 * Position Space Validation and Reconciliation
 *
 * Validates text selection positions across three coordinate spaces:
 * 1. DOM selection (browser native)
 * 2. Rendered position (what user sees - no markdown)
 * 3. Cleaned position (markdown source stored in DB)
 *
 * The conversion chain must be reversible:
 * DOM → Rendered → Cleaned → Rendered → DOM
 *
 * This utility detects drift and applies auto-correction heuristics to ensure
 * positions land on safe boundaries (full links, word boundaries, sentences).
 */

export interface PositionValidationResult {
  /** Final corrected start position in rendered space */
  correctedRenderedStart: number
  /** Final corrected end position in rendered space */
  correctedRenderedEnd: number
  /** Final corrected start position in cleaned space */
  correctedCleanedStart: number
  /** Final corrected end position in cleaned space */
  correctedCleanedEnd: number
  /** Array of warnings and drift information */
  warnings: string[]
  /** Array of corrections applied */
  corrections: string[]
  /** Debug information about conversions */
  debugInfo: PositionDebugInfo
}

interface PositionDebugInfo {
  /** Original positions */
  original: {
    domStart: number
    domEnd: number
    renderedStart: number
    renderedEnd: number
    cleanedStart: number
    cleanedEnd: number
    selectedText: string
  }
  /** Round-trip verification results */
  roundTrip: {
    cleanedToRenderedStart: number
    cleanedToRenderedEnd: number
    renderedToCleanedStart: number
    renderedToCleanedEnd: number
    startDrift: number
    endDrift: number
  }
  /** Boundary analysis */
  boundaries: {
    startOnWordBoundary: boolean
    endOnWordBoundary: boolean
    startInLink: boolean
    endInLink: boolean
  }
}

interface ValidationParams {
  /** DOM selection start position */
  domStart: number
  /** DOM selection end position */
  domEnd: number
  /** Rendered space start position (from getSelectionRange) */
  renderedStart: number
  /** Rendered space end position (from getSelectionRange) */
  renderedEnd: number
  /** Cleaned space start position (after conversion) */
  cleanedStart: number
  /** Cleaned space end position (after conversion) */
  cleanedEnd: number
  /** Selected text from DOM */
  selectedText: string
  /** Cleaned content (with markdown syntax) */
  cleanedContent: string
  /** Rendered content (no markdown) */
  renderedContent: string
  /** Conversion function: rendered position → cleaned position */
  renderedPosToCleanedPos: (renderedPos: number, cleanedContent: string) => number
  /** Conversion function: cleaned position → rendered position */
  cleanedPosToRenderedPos: (cleanedPos: number, cleanedContent: string) => number
}

/**
 * Validate position consistency across all three coordinate spaces
 *
 * Performs round-trip verification and applies auto-correction heuristics
 * when drift is detected.
 *
 * @param params - Validation parameters including positions and conversion functions
 * @returns Validation result with corrected positions and warnings
 */
export function validatePositionConsistency(
  params: ValidationParams
): PositionValidationResult {
  const {
    domStart,
    domEnd,
    renderedStart,
    renderedEnd,
    cleanedStart,
    cleanedEnd,
    selectedText,
    cleanedContent,
    renderedContent,
    renderedPosToCleanedPos,
    cleanedPosToRenderedPos,
  } = params

  const warnings: string[] = []
  const corrections: string[] = []

  console.log('[PositionValidation] Starting validation:', {
    domRange: `${domStart}-${domEnd}`,
    renderedRange: `${renderedStart}-${renderedEnd}`,
    cleanedRange: `${cleanedStart}-${cleanedEnd}`,
    selectedTextLength: selectedText.length,
    selectedTextPreview: selectedText.substring(0, 100) + (selectedText.length > 100 ? '...' : ''),
  })

  // Step 1: Round-trip verification
  // Convert cleaned → rendered to see if we get back to original
  const roundTripRenderedStart = cleanedPosToRenderedPos(cleanedStart, cleanedContent)
  const roundTripRenderedEnd = cleanedPosToRenderedPos(cleanedEnd, cleanedContent)

  const startDrift = Math.abs(roundTripRenderedStart - renderedStart)
  const endDrift = Math.abs(roundTripRenderedEnd - renderedEnd)

  console.log('[PositionValidation] Round-trip verification:', {
    original: { renderedStart, renderedEnd },
    roundTrip: { renderedStart: roundTripRenderedStart, renderedEnd: roundTripRenderedEnd },
    drift: { start: startDrift, end: endDrift },
  })

  // Allow ±1 character tolerance for rounding
  const TOLERANCE = 1
  if (startDrift > TOLERANCE || endDrift > TOLERANCE) {
    warnings.push(
      `Round-trip drift detected: start=${startDrift}, end=${endDrift} (tolerance=${TOLERANCE})`
    )
  }

  // Step 2: Verify we can convert back cleaned → rendered → cleaned
  const doubleRoundTripCleanedStart = renderedPosToCleanedPos(roundTripRenderedStart, cleanedContent)
  const doubleRoundTripCleanedEnd = renderedPosToCleanedPos(roundTripRenderedEnd, cleanedContent)

  const cleanedStartDrift = Math.abs(doubleRoundTripCleanedStart - cleanedStart)
  const cleanedEndDrift = Math.abs(doubleRoundTripCleanedEnd - cleanedEnd)

  console.log('[PositionValidation] Double round-trip verification (cleaned→rendered→cleaned):', {
    original: { cleanedStart, cleanedEnd },
    doubleRoundTrip: { cleanedStart: doubleRoundTripCleanedStart, cleanedEnd: doubleRoundTripCleanedEnd },
    drift: { start: cleanedStartDrift, end: cleanedEndDrift },
  })

  if (cleanedStartDrift > TOLERANCE || cleanedEndDrift > TOLERANCE) {
    warnings.push(
      `Double round-trip drift detected: cleaned start=${cleanedStartDrift}, end=${cleanedEndDrift}`
    )
  }

  // Step 3: Analyze boundaries
  const boundaries = analyzeBoundaries(
    renderedStart,
    renderedEnd,
    cleanedStart,
    cleanedEnd,
    renderedContent,
    cleanedContent
  )

  console.log('[PositionValidation] Boundary analysis:', boundaries)

  // Step 4: Apply auto-correction heuristics if drift detected
  let correctedCleanedStart = cleanedStart
  let correctedCleanedEnd = cleanedEnd
  let correctedRenderedStart = renderedStart
  let correctedRenderedEnd = renderedEnd

  if (startDrift > TOLERANCE || endDrift > TOLERANCE || boundaries.startInLink || boundaries.endInLink) {
    // Check if positions split markdown links
    const linkExpansion = expandToFullLinks(
      correctedCleanedStart,
      correctedCleanedEnd,
      cleanedContent
    )

    if (linkExpansion.expanded) {
      corrections.push(
        `Expanded to include full markdown links: cleaned ${cleanedStart}-${cleanedEnd} → ${linkExpansion.start}-${linkExpansion.end}`
      )
      correctedCleanedStart = linkExpansion.start
      correctedCleanedEnd = linkExpansion.end

      // Recalculate rendered positions
      correctedRenderedStart = cleanedPosToRenderedPos(correctedCleanedStart, cleanedContent)
      correctedRenderedEnd = cleanedPosToRenderedPos(correctedCleanedEnd, cleanedContent)
    }

    // Prefer word boundaries if drift persists
    const wordExpansion = expandToWordBoundaries(
      correctedRenderedStart,
      correctedRenderedEnd,
      renderedContent
    )

    if (wordExpansion.expanded) {
      corrections.push(
        `Expanded to word boundaries: rendered ${renderedStart}-${renderedEnd} → ${wordExpansion.start}-${wordExpansion.end}`
      )
      correctedRenderedStart = wordExpansion.start
      correctedRenderedEnd = wordExpansion.end

      // Recalculate cleaned positions
      correctedCleanedStart = renderedPosToCleanedPos(correctedRenderedStart, cleanedContent)
      correctedCleanedEnd = renderedPosToCleanedPos(correctedRenderedEnd, cleanedContent)
    }

    // Prefer sentence boundaries for better user experience
    const sentenceExpansion = expandToSentenceBoundaries(
      correctedRenderedStart,
      correctedRenderedEnd,
      renderedContent
    )

    if (sentenceExpansion.expanded && sentenceExpansion.end - sentenceExpansion.start < 500) {
      // Only expand to sentence if it doesn't make selection too large
      corrections.push(
        `Expanded to sentence boundaries: rendered ${correctedRenderedStart}-${correctedRenderedEnd} → ${sentenceExpansion.start}-${sentenceExpansion.end}`
      )
      correctedRenderedStart = sentenceExpansion.start
      correctedRenderedEnd = sentenceExpansion.end

      // Recalculate cleaned positions
      correctedCleanedStart = renderedPosToCleanedPos(correctedRenderedStart, cleanedContent)
      correctedCleanedEnd = renderedPosToCleanedPos(correctedRenderedEnd, cleanedContent)
    }
  }

  // Step 5: Final verification of corrected positions
  const finalRenderedStart = cleanedPosToRenderedPos(correctedCleanedStart, cleanedContent)
  const finalRenderedEnd = cleanedPosToRenderedPos(correctedCleanedEnd, cleanedContent)
  const finalDrift = {
    start: Math.abs(finalRenderedStart - correctedRenderedStart),
    end: Math.abs(finalRenderedEnd - correctedRenderedEnd),
  }

  console.log('[PositionValidation] Final verification:', {
    corrected: {
      renderedStart: correctedRenderedStart,
      renderedEnd: correctedRenderedEnd,
      cleanedStart: correctedCleanedStart,
      cleanedEnd: correctedCleanedEnd,
    },
    finalRoundTrip: { renderedStart: finalRenderedStart, renderedEnd: finalRenderedEnd },
    finalDrift,
  })

  if (finalDrift.start > TOLERANCE || finalDrift.end > TOLERANCE) {
    warnings.push(
      `Final positions still have drift: start=${finalDrift.start}, end=${finalDrift.end}`
    )
  }

  const debugInfo: PositionDebugInfo = {
    original: {
      domStart,
      domEnd,
      renderedStart,
      renderedEnd,
      cleanedStart,
      cleanedEnd,
      selectedText,
    },
    roundTrip: {
      cleanedToRenderedStart: roundTripRenderedStart,
      cleanedToRenderedEnd: roundTripRenderedEnd,
      renderedToCleanedStart: doubleRoundTripCleanedStart,
      renderedToCleanedEnd: doubleRoundTripCleanedEnd,
      startDrift,
      endDrift,
    },
    boundaries,
  }

  return {
    correctedRenderedStart,
    correctedRenderedEnd,
    correctedCleanedStart,
    correctedCleanedEnd,
    warnings,
    corrections,
    debugInfo,
  }
}

/**
 * Analyze whether positions fall on clean boundaries
 */
function analyzeBoundaries(
  renderedStart: number,
  renderedEnd: number,
  cleanedStart: number,
  cleanedEnd: number,
  renderedContent: string,
  cleanedContent: string
): PositionDebugInfo['boundaries'] {
  // Check word boundaries in rendered content
  const startChar = renderedContent[renderedStart - 1] || ''
  const endChar = renderedContent[renderedEnd] || ''
  const startOnWordBoundary = !startChar || /\s/.test(startChar)
  const endOnWordBoundary = !endChar || /\s/.test(endChar)

  // Check if positions are inside markdown links
  const startInLink = isPositionInLink(cleanedStart, cleanedContent)
  const endInLink = isPositionInLink(cleanedEnd, cleanedContent)

  return {
    startOnWordBoundary,
    endOnWordBoundary,
    startInLink,
    endInLink,
  }
}

/**
 * Check if a position in cleaned content falls inside a markdown link
 */
function isPositionInLink(pos: number, cleanedContent: string): boolean {
  // Use the proper parser that handles parentheses in URLs
  const { parseMarkdownLink } = require('./markdownLinkParser')

  let i = 0
  while (i < cleanedContent.length) {
    const linkInfo = parseMarkdownLink(cleanedContent, i)
    if (linkInfo) {
      // Check if position is inside this link
      if (pos > linkInfo.startIndex && pos < linkInfo.endIndex) {
        return true
      }

      // Don't search beyond our position
      if (linkInfo.startIndex > pos) {
        break
      }

      i = linkInfo.endIndex
    } else {
      i++
    }
  }

  return false
}

/**
 * Expand positions to include full markdown links
 */
function expandToFullLinks(
  start: number,
  end: number,
  cleanedContent: string
): { start: number; end: number; expanded: boolean } {
  let expandedStart = start
  let expandedEnd = end
  let expanded = false

  // Use the proper parser that handles parentheses in URLs
  const { parseMarkdownLink } = require('./markdownLinkParser')

  let i = 0
  while (i < cleanedContent.length) {
    const linkInfo = parseMarkdownLink(cleanedContent, i)
    if (linkInfo) {
      const linkStart = linkInfo.startIndex
      const linkEnd = linkInfo.endIndex

      // If start position is inside a link, expand to include start of link
      if (start > linkStart && start < linkEnd) {
        expandedStart = linkStart
        expanded = true
      }

      // If end position is inside a link, expand to include end of link
      if (end > linkStart && end < linkEnd) {
        expandedEnd = linkEnd
        expanded = true
      }

      // Stop searching if we're past the end position
      if (linkStart > end) {
        break
      }

      i = linkInfo.endIndex
    } else {
      i++
    }
  }

  return { start: expandedStart, end: expandedEnd, expanded }
}

/**
 * Expand positions to word boundaries
 */
function expandToWordBoundaries(
  start: number,
  end: number,
  renderedContent: string
): { start: number; end: number; expanded: boolean } {
  let expandedStart = start
  let expandedEnd = end
  let expanded = false

  // Expand start to previous word boundary
  while (expandedStart > 0 && !/\s/.test(renderedContent[expandedStart - 1])) {
    expandedStart--
    expanded = true
  }

  // Expand end to next word boundary
  while (expandedEnd < renderedContent.length && !/\s/.test(renderedContent[expandedEnd])) {
    expandedEnd++
    expanded = true
  }

  return { start: expandedStart, end: expandedEnd, expanded }
}

/**
 * Expand positions to sentence boundaries
 */
function expandToSentenceBoundaries(
  start: number,
  end: number,
  renderedContent: string
): { start: number; end: number; expanded: boolean } {
  let expandedStart = start
  let expandedEnd = end
  let expanded = false

  // Expand start to previous sentence boundary (. ! ? followed by space/start)
  while (expandedStart > 0) {
    const prevChar = renderedContent[expandedStart - 1]
    const prevPrevChar = renderedContent[expandedStart - 2]

    // Beginning of text
    if (expandedStart === 0) break

    // Found sentence boundary
    if (/[.!?]/.test(prevPrevChar) && /\s/.test(prevChar)) {
      break
    }

    expandedStart--
    expanded = true
  }

  // Expand end to next sentence boundary
  while (expandedEnd < renderedContent.length) {
    const char = renderedContent[expandedEnd]
    const nextChar = renderedContent[expandedEnd + 1]

    // End of text
    if (expandedEnd === renderedContent.length - 1) {
      expandedEnd = renderedContent.length
      expanded = true
      break
    }

    // Found sentence boundary
    if (/[.!?]/.test(char) && (!nextChar || /\s/.test(nextChar))) {
      expandedEnd++
      expanded = true
      break
    }

    expandedEnd++
  }

  return { start: expandedStart, end: expandedEnd, expanded }
}
