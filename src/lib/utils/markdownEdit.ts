export function updateLinkText(
  markdown: string,
  linkPosition: { start: number; end: number },
  newText: string
): string {
  const linkText = markdown.substring(linkPosition.start, linkPosition.end)

  const linkMatch = linkText.match(/\[([^\]]+)\]\(([^\)]+)\)/)
  if (!linkMatch) {
    throw new Error('Invalid link syntax at specified position')
  }

  const url = linkMatch[2]
  const newLinkSyntax = `[${newText}](${url})`

  return (
    markdown.substring(0, linkPosition.start) +
    newLinkSyntax +
    markdown.substring(linkPosition.end)
  )
}

export function replaceTextAtPosition(
  markdown: string,
  position: { start: number; end: number },
  newText: string
): string {
  if (position.start < 0 || position.end > markdown.length || position.start > position.end) {
    throw new Error('Invalid position range')
  }

  return (
    markdown.substring(0, position.start) +
    newText +
    markdown.substring(position.end)
  )
}

export function detectEditRegion(
  oldText: string,
  newText: string
): { start: number; end: number; deletedText: string; insertedText: string } {
  let start = 0
  while (start < oldText.length && start < newText.length && oldText[start] === newText[start]) {
    start++
  }

  let oldEnd = oldText.length
  let newEnd = newText.length
  while (
    oldEnd > start &&
    newEnd > start &&
    oldText[oldEnd - 1] === newText[newEnd - 1]
  ) {
    oldEnd--
    newEnd--
  }

  return {
    start,
    end: oldEnd,
    deletedText: oldText.substring(start, oldEnd),
    insertedText: newText.substring(start, newEnd)
  }
}
