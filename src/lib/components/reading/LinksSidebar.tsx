import { X, Link2, ChevronDown, ChevronRight, ArrowUpDown, Search } from 'lucide-react'
import { useLinksSidebarStore, type ParsedLink } from '@/lib/stores/linksSidebar'
import { LinkItem } from './LinkItem'
import { Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Input } from '../ui'
import { useMemo, useRef, useEffect, useLayoutEffect, useCallback } from 'react'

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
  // NOTE: Don't subscribe to scrollPosition - it causes re-renders on every scroll event
  // Instead, read it directly from store when needed (in ref callback and layout effect)
  const { isOpen, links, setOpen, showNonWikipedia, setShowNonWikipedia, showWikipedia, setShowWikipedia, sortMode, setSortMode, searchQuery, setSearchQuery, setScrollPosition } = useLinksSidebarStore()

  // Component lifecycle logging
  useEffect(() => {
    const timestamp = new Date().toISOString()
    console.log(`[LinksSidebar ${timestamp}] COMPONENT MOUNTED`)
    return () => {
      console.log(`[LinksSidebar ${timestamp}] COMPONENT UNMOUNTING`)
    }
  }, [])

  useEffect(() => {
    const timestamp = new Date().toISOString()
    console.log(`[LinksSidebar ${timestamp}] RENDER STATE:`, {
      isOpen,
      linksCount: links.length,
      showWikipedia,
      showNonWikipedia,
      sortMode,
      searchQuery
    })
  }, [isOpen, links, showWikipedia, showNonWikipedia, sortMode, searchQuery])

  // Scroll position preservation
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const isRestoringRef = useRef<boolean>(false)
  const hasInitiallyRestoredRef = useRef<boolean>(false)
  const previousLinksLengthRef = useRef<number>(links.length)

  // Ref callback: Apply scroll position synchronously on mount to avoid visual jump
  const scrollContainerCallback = useCallback((node: HTMLDivElement | null) => {
    const timestamp = new Date().toISOString()
    // Read scroll position directly from store (no subscription = no re-render)
    const scrollPosition = useLinksSidebarStore.getState().scrollPosition

    console.log(`[LinksSidebar ${timestamp}] REF CALLBACK INVOKED:`, {
      nodeAttached: !!node,
      savedPosition: scrollPosition,
      hasInitiallyRestored: hasInitiallyRestoredRef.current
    })

    scrollContainerRef.current = node

    // On initial mount, set scroll position synchronously BEFORE first paint
    if (node && scrollPosition > 0 && !hasInitiallyRestoredRef.current) {
      isRestoringRef.current = true
      node.scrollTop = scrollPosition
      hasInitiallyRestoredRef.current = true

      console.log(`[LinksSidebar ${timestamp}] INITIAL SCROLL SET SYNCHRONOUSLY:`, {
        targetPosition: scrollPosition,
        actualPosition: node.scrollTop,
        success: node.scrollTop === scrollPosition
      })

      // Reset restoration flag after a brief delay
      setTimeout(() => {
        isRestoringRef.current = false
        console.log(`[LinksSidebar ${timestamp}] Initial restore flag reset`)
      }, 50)
    }
  }, [])

  // Track when the ref gets attached/detached
  useEffect(() => {
    const timestamp = new Date().toISOString()
    const scrollPosition = useLinksSidebarStore.getState().scrollPosition
    console.log(`[LinksSidebar ${timestamp}] SCROLL CONTAINER REF STATUS:`, {
      attached: !!scrollContainerRef.current,
      scrollTop: scrollContainerRef.current?.scrollTop,
      savedPosition: scrollPosition
    })
  }, [scrollContainerRef.current])

  // Save scroll position whenever user scrolls (but not during restoration)
  const saveScrollPosition = () => {
    if (scrollContainerRef.current && !isRestoringRef.current) {
      const timestamp = new Date().toISOString()
      const savedPosition = scrollContainerRef.current.scrollTop
      setScrollPosition(savedPosition)
      console.log(`[LinksSidebar ${timestamp}] SCROLL POSITION SAVED:`, {
        position: savedPosition,
        scrollHeight: scrollContainerRef.current.scrollHeight,
        clientHeight: scrollContainerRef.current.clientHeight,
        isRestoring: isRestoringRef.current
      })
    }
  }

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

  // Restore scroll position after UI changes (using useLayoutEffect for pre-paint execution)
  // This handles cases where links CHANGE (e.g., after ingest) - different from initial mount
  useLayoutEffect(() => {
    const timestamp = new Date().toISOString()
    const linksChanged = previousLinksLengthRef.current !== links.length
    previousLinksLengthRef.current = links.length

    // Read scroll position directly from store (no subscription = no re-render)
    const scrollPosition = useLinksSidebarStore.getState().scrollPosition

    console.group(`[LinksSidebar ${timestamp}] RESTORE LAYOUT EFFECT TRIGGERED`)
    console.log('Dependencies:', {
      linksCount: links.length,
      linksChanged,
      filteredWikipediaCount: filteredWikipediaLinks.length,
      filteredOtherCount: filteredOtherLinks.length,
      showWikipedia,
      showNonWikipedia,
      hasInitiallyRestored: hasInitiallyRestoredRef.current
    })
    console.log('State before restoration:', {
      hasContainer: !!scrollContainerRef.current,
      savedPosition: scrollPosition,
      containerScrollTop: scrollContainerRef.current?.scrollTop,
      containerScrollHeight: scrollContainerRef.current?.scrollHeight,
      containerClientHeight: scrollContainerRef.current?.clientHeight,
      isRestoring: isRestoringRef.current
    })

    // Skip if already handled by ref callback (initial mount)
    if (!hasInitiallyRestoredRef.current) {
      console.log('SKIP RESTORE: Not yet initially restored (ref callback will handle)')
      console.groupEnd()
      return
    }

    // Only restore if we have a container and saved position
    if (scrollContainerRef.current && scrollPosition > 0) {
      isRestoringRef.current = true

      // If links changed (e.g., after ingest), use triple RAF for DOM stability
      // Otherwise (filter/sort/expand), use single RAF for speed
      if (linksChanged) {
        console.log('WILL RESTORE (LINKS CHANGED) - Starting triple RAF sequence to position:', scrollPosition)

        requestAnimationFrame(() => {
          console.log('RAF 1/3 - Frame scheduled')
          requestAnimationFrame(() => {
            console.log('RAF 2/3 - Paint complete')
            requestAnimationFrame(() => {
              console.log('RAF 3/3 - Layout stable')
              if (scrollContainerRef.current) {
                const beforeScroll = scrollContainerRef.current.scrollTop
                scrollContainerRef.current.scrollTop = scrollPosition
                const afterScroll = scrollContainerRef.current.scrollTop
                console.log('SCROLL RESTORED (triple RAF):', {
                  targetPosition: scrollPosition,
                  beforeScroll,
                  afterScroll,
                  success: afterScroll === scrollPosition,
                  scrollHeight: scrollContainerRef.current.scrollHeight,
                  clientHeight: scrollContainerRef.current.clientHeight
                })
                setTimeout(() => {
                  isRestoringRef.current = false
                  console.log('Restore flag reset - can save scroll again')
                }, 50)
              } else {
                console.warn('Container lost during RAF sequence!')
              }
              console.groupEnd()
            })
          })
        })
      } else {
        console.log('WILL RESTORE (FILTER/SORT/EXPAND) - Using single RAF to position:', scrollPosition)

        requestAnimationFrame(() => {
          console.log('RAF 1/1 - Applying scroll')
          if (scrollContainerRef.current) {
            const beforeScroll = scrollContainerRef.current.scrollTop
            scrollContainerRef.current.scrollTop = scrollPosition
            const afterScroll = scrollContainerRef.current.scrollTop
            console.log('SCROLL RESTORED (single RAF):', {
              targetPosition: scrollPosition,
              beforeScroll,
              afterScroll,
              success: afterScroll === scrollPosition,
              scrollHeight: scrollContainerRef.current.scrollHeight,
              clientHeight: scrollContainerRef.current.clientHeight
            })
            setTimeout(() => {
              isRestoringRef.current = false
              console.log('Restore flag reset - can save scroll again')
            }, 50)
          } else {
            console.warn('Container lost during RAF!')
          }
          console.groupEnd()
        })
      }
    } else {
      isRestoringRef.current = false
      console.log('SKIP RESTORE:', {
        reason: !scrollContainerRef.current ? 'no container' : 'no saved position',
        savedPosition: scrollPosition
      })
      console.groupEnd()
    }
  }, [links, filteredWikipediaLinks, filteredOtherLinks, showWikipedia, showNonWikipedia])

  // Early return AFTER all hooks
  if (!isOpen) {
    const timestamp = new Date().toISOString()
    console.log(`[LinksSidebar ${timestamp}] NOT RENDERING (isOpen: false)`)
    return null
  }

  const timestamp = new Date().toISOString()
  console.log(`[LinksSidebar ${timestamp}] RENDERING SIDEBAR UI`)

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

      <div
        ref={scrollContainerCallback}
        onScroll={saveScrollPosition}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
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
