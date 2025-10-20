import { X, Link2, ChevronDown, ChevronRight } from 'lucide-react'
import { useLinksSidebarStore } from '@/lib/stores/linksSidebar'
import { LinkItem } from './LinkItem'
import { Button } from '../ui'

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
  const { isOpen, links, setOpen, showNonWikipedia, setShowNonWikipedia } = useLinksSidebarStore()

  if (!isOpen) return null

  const wikipediaLinks = links.filter(link => isWikipediaLink(link.baseUrl))
  const otherLinks = links.filter(link => !isWikipediaLink(link.baseUrl))

  return (
    <aside className="w-96 border-l border-border bg-muted flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <Link2 className="w-5 h-5 text-foreground" />
          <h2 className="text-lg font-semibold text-foreground">Links ({links.length})</h2>
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

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {links.length === 0 ? (
          <div className="text-center text-muted-foreground mt-8">
            <Link2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No links found in this article</p>
          </div>
        ) : (
          <>
            {wikipediaLinks.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                  Wikipedia ({wikipediaLinks.length})
                </h3>
                <div className="space-y-3">
                  {wikipediaLinks.map((link, index) => (
                    <LinkItem
                      key={`${link.baseUrl}-${index}`}
                      link={link}
                      onIngest={onNavigateToIngest}
                    />
                  ))}
                </div>
              </div>
            )}

            {otherLinks.length > 0 && (
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
                  Other Links ({otherLinks.length})
                </button>
                {showNonWikipedia && (
                  <div className="space-y-3">
                    {otherLinks.map((link, index) => (
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
