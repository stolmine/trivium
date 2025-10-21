import { useEffect, useRef, useState } from 'react'
import { X, ChevronUp, ChevronDown } from 'lucide-react'
import { useSearchStore } from '../../stores/search'
import { Button } from '../ui'
import { cn } from '../../utils'
import { useDebounce } from '../../hooks/useDebounce'

interface SearchBarProps {
  onClose?: () => void;
}

export function SearchBar({ onClose }: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [localQuery, setLocalQuery] = useState('')
  const debouncedQuery = useDebounce(localQuery, 300)

  const {
    query,
    matches,
    currentIndex,
    caseSensitive,
    wholeWord,
    setQuery,
    nextMatch,
    previousMatch,
    toggleCaseSensitive,
    toggleWholeWord,
    closeSearch,
    reset
  } = useSearchStore()

  // Focus input on mount and select any existing text
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [])

  // Sync local query with store query on mount
  useEffect(() => {
    setLocalQuery(query)
  }, [query])

  // Update store query when debounced query changes
  useEffect(() => {
    setQuery(debouncedQuery)
  }, [debouncedQuery, setQuery])

  const handleClose = () => {
    setLocalQuery('')
    reset()
    closeSearch()
    onClose?.()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (e.shiftKey) {
        previousMatch()
      } else {
        nextMatch()
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleClose()
    }
  }

  const hasMatches = matches.length > 0
  const matchCountText = hasMatches ? `${currentIndex + 1}/${matches.length}` : '0/0'

  return (
    <div className="sticky top-0 z-50 flex items-center gap-2 bg-background border-b border-border px-4 py-2 shadow-sm">
      <input
        ref={inputRef}
        type="text"
        className="flex-1 h-8 px-3 py-1.5 border border-input rounded-md text-sm bg-transparent text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        placeholder="Find in page..."
        value={localQuery}
        onChange={(e) => setLocalQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={(e) => e.target.select()}
      />

      <span className="text-xs text-muted-foreground min-w-[50px] text-center font-mono">
        {matchCountText}
      </span>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={previousMatch}
        disabled={!hasMatches}
        title="Previous match (Shift+Enter)"
        aria-label="Previous match"
      >
        <ChevronUp className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={nextMatch}
        disabled={!hasMatches}
        title="Next match (Enter)"
        aria-label="Next match"
      >
        <ChevronDown className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "h-8 w-8 font-semibold",
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
          "h-8 w-8 font-mono text-xs",
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
        className="h-8 w-8"
        onClick={handleClose}
        title="Close (Esc)"
        aria-label="Close search"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
}
