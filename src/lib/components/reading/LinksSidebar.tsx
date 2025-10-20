import { X, Link2, ChevronDown, ChevronRight, ArrowUpDown, Search } from 'lucide-react'
import { useLinksSidebarStore, type ParsedLink } from '@/lib/stores/linksSidebar'
import { LinkItem } from './LinkItem'
import { Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Input } from '../ui'
import { useMemo } from 'react'

interface LinksSidebarProps {
  onNavigateToIngest: (url: string) => void
}

function isWikipediaLink(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.hostname.includes('wikipedia.org')
  } catch {
    return false
  }
}

export function LinksSidebar({ onNavigateToIngest }: LinksSidebarProps) {
  // All hooks must be called BEFORE any early returns
  const { isOpen, links, setOpen, showNonWikipedia, setShowNonWikipedia, showWikipedia, setShowWikipedia, sortMode, setSortMode, searchQuery, setSearchQuery } = useLinksSidebarStore()

  const sortLinks = (linksToSort: ParsedLink[]) => {
    if (sortMode === 'alphabetical') {
      return [...linksToSort].sort((a, b) => a.displayText.localeCompare(b.displayText))
    }
    return [...linksToSort].sort((a, b) => a.firstAppearance - b.firstAppearance)
  }

  const filterLinks = (linksToFilter: ParsedLink[]) => {
    if (!searchQuery) return linksToFilter
    const query = searchQuery.toLowerCase()
    return linksToFilter.filter(link =>
      link.displayText.toLowerCase().includes(query) ||
      link.baseUrl.toLowerCase().includes(query)
    )
  }

  const wikipediaLinks = links.filter(link => isWikipediaLink(link.baseUrl))
  const otherLinks = links.filter(link => !isWikipediaLink(link.baseUrl))

  const sortedWikipediaLinks = useMemo(() => sortLinks(wikipediaLinks), [wikipediaLinks, sortMode])
  const sortedOtherLinks = useMemo(() => sortLinks(otherLinks), [otherLinks, sortMode])

  const filteredWikipediaLinks = useMemo(
    () => filterLinks(sortedWikipediaLinks),
    [sortedWikipediaLinks, searchQuery]
  )
  const filteredOtherLinks = useMemo(
    () => filterLinks(sortedOtherLinks),
    [sortedOtherLinks, searchQuery]
  )

  // Early return AFTER all hooks
  if (!isOpen) return null

  return (
    <aside className="w-96 border-l border-border bg-muted flex flex-col animate-slideInRight">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-2 flex-1">
          <div className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-foreground" />
            <h2 className="text-lg font-semibold text-foreground">Links ({links.length})</h2>
          </div>

          <Select value={sortMode} onValueChange={(value) => setSortMode(value as 'appearance' | 'alphabetical')}>
            <SelectTrigger className="w-[140px] h-7 text-xs ml-2">
              <ArrowUpDown className="w-3 h-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="appearance">Document Order</SelectItem>
              <SelectItem value="alphabetical">Alphabetical</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setOpen(false)}
          title="Close sidebar"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="px-4 py-2 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search links..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {links.length === 0 ? (
          <div className="text-center text-muted-foreground mt-8">
            <Link2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No links found in this article</p>
          </div>
        ) : searchQuery && filteredWikipediaLinks.length === 0 && filteredOtherLinks.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground mt-8 px-4">
            No links match "{searchQuery}"
          </div>
        ) : (
          <>
            {filteredWikipediaLinks.length > 0 && (
              <div>
                <button
                  onClick={() => setShowWikipedia(!showWikipedia)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide hover:text-foreground transition-colors w-full"
                >
                  {showWikipedia ? (
                    <ChevronDown className="w-3 h-3" />
                  ) : (
                    <ChevronRight className="w-3 h-3" />
                  )}
                  Wikipedia ({filteredWikipediaLinks.length})
                </button>
                {showWikipedia && (
                  <div className="space-y-3">
                    {filteredWikipediaLinks.map((link, index) => (
                      <LinkItem
                        key={`${link.baseUrl}-${index}`}
                        link={link}
                        onIngest={onNavigateToIngest}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {filteredOtherLinks.length > 0 && (
              <div>
                <button
                  onClick={() => setShowNonWikipedia(!showNonWikipedia)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide hover:text-foreground transition-colors"
                >
                  {showNonWikipedia ? (
                    <ChevronDown className="w-3 h-3" />
                  ) : (
                    <ChevronRight className="w-3 h-3" />
                  )}
                  Other Links ({filteredOtherLinks.length})
                </button>
                {showNonWikipedia && (
                  <div className="space-y-3">
                    {filteredOtherLinks.map((link, index) => (
                      <LinkItem
                        key={`${link.baseUrl}-${index}`}
                        link={link}
                        onIngest={onNavigateToIngest}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  )
}
