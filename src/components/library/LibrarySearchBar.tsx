import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X } from 'lucide-react'
import { useLibrarySearchStore } from '../../lib/stores/librarySearch'
import { Button } from '../../lib/components/ui'
import { cn } from '../../lib/utils'
import { useDebounce } from '../../lib/hooks/useDebounce'

type SearchContext = 'sidebar' | 'library';

interface LibrarySearchBarProps {
  context: SearchContext;
}

export function LibrarySearchBar({ context }: LibrarySearchBarProps) {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const [localQuery, setLocalQuery] = useState('')
  const debouncedQuery = useDebounce(localQuery, 300)

  const searchState = useLibrarySearchStore((state) => state[context]);
  const setQuery = useLibrarySearchStore((state) => state.setQuery);
  const toggleCaseSensitive = useLibrarySearchStore((state) => state.toggleCaseSensitive);
  const toggleWholeWord = useLibrarySearchStore((state) => state.toggleWholeWord);
  const nextMatch = useLibrarySearchStore((state) => state.nextMatch);
  const previousMatch = useLibrarySearchStore((state) => state.previousMatch);
  const closeSearch = useLibrarySearchStore((state) => state.closeSearch);
  const reset = useLibrarySearchStore((state) => state.reset);

  const {
    query,
    matchedTextIds,
    matchedFolderIds,
    currentMatchIndex,
    caseSensitive,
    wholeWord,
  } = searchState;

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
    setQuery(context, debouncedQuery)
  }, [debouncedQuery, setQuery, context])

  const handleClose = () => {
    setLocalQuery('')
    reset(context)
    closeSearch(context)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      handleClose()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      nextMatch(context)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      previousMatch(context)
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
    <div className="flex items-center gap-1 border-b border-border px-2 py-2 bg-background">
      <div className="flex items-center flex-1 gap-1.5 min-w-0">
        <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <input
          ref={inputRef}
          type="text"
          className="flex-1 min-w-0 h-7 px-2 py-1 border border-input rounded-md text-sm bg-transparent text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          placeholder="Search..."
          value={localQuery}
          onChange={(e) => setLocalQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={(e) => e.target.select()}
        />
      </div>

      <span className="text-xs text-muted-foreground min-w-[40px] text-right font-mono whitespace-nowrap flex-shrink-0">
        {matchCountText}
      </span>

      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "h-7 w-7 flex-shrink-0 font-semibold text-sm",
          caseSensitive && "bg-accent text-accent-foreground"
        )}
        onClick={() => toggleCaseSensitive(context)}
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
        onClick={() => toggleWholeWord(context)}
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
