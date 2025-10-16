import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X } from 'lucide-react'
import { useLibrarySearchStore } from '../../lib/stores/librarySearch'
import { Button } from '../../lib/components/ui'
import { cn } from '../../lib/utils'
import { useDebounce } from '../../lib/hooks/useDebounce'

export function LibrarySearchBar() {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const [localQuery, setLocalQuery] = useState('')
  const debouncedQuery = useDebounce(localQuery, 300)

  const {
    query,
    matchedTextIds,
    matchedFolderIds,
    currentMatchIndex,
    caseSensitive,
    wholeWord,
    setQuery,
    toggleCaseSensitive,
    toggleWholeWord,
    nextMatch,
    previousMatch,
    closeSearch,
    reset
  } = useLibrarySearchStore()

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [])

  useEffect(() => {
    setLocalQuery(query)
  }, [query])

  useEffect(() => {
    setQuery(debouncedQuery)
  }, [debouncedQuery, setQuery])

  const handleClose = () => {
    setLocalQuery('')
    reset()
    closeSearch()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      handleClose()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      nextMatch()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      previousMatch()
    } else if (e.key === 'Enter') {
      e.preventDefault()
      // Navigate to currently selected text match
      if (matchedTextIds.length > 0 && currentMatchIndex < matchedTextIds.length) {
        const textId = matchedTextIds[currentMatchIndex]
        navigate(`/read/${textId}`)
      }
    }
  }

  const textCount = matchedTextIds.length
  const folderCount = matchedFolderIds.length
  const totalMatches = textCount + folderCount

  const matchCountText = totalMatches === 0
    ? 'None'
    : folderCount > 0
    ? `${textCount}t, ${folderCount}f`
    : `${textCount}`

  return (
    <div className="flex items-center gap-1 border-b border-neutral-200 px-2 py-2 bg-white">
      <div className="flex items-center flex-1 gap-1.5 min-w-0">
        <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <input
          ref={inputRef}
          type="text"
          className="flex-1 min-w-0 h-7 px-2 py-1 border border-input rounded-md text-sm bg-transparent shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          placeholder="Search..."
          value={localQuery}
          onChange={(e) => setLocalQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={(e) => e.target.select()}
        />
      </div>

      <span className="text-xs text-neutral-500 min-w-[40px] text-right font-mono whitespace-nowrap flex-shrink-0">
        {matchCountText}
      </span>

      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "h-7 w-7 flex-shrink-0 font-semibold text-sm",
          caseSensitive && "bg-accent text-accent-foreground"
        )}
        onClick={toggleCaseSensitive}
        title="Match case"
        aria-label="Toggle case sensitive"
        aria-pressed={caseSensitive}
      >
        Aa
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "h-7 w-7 flex-shrink-0 font-mono text-xs",
          wholeWord && "bg-accent text-accent-foreground"
        )}
        onClick={toggleWholeWord}
        title="Match whole word"
        aria-label="Toggle whole word"
        aria-pressed={wholeWord}
      >
        Ab|
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 flex-shrink-0"
        onClick={handleClose}
        title="Close (Esc)"
        aria-label="Close search"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
}
