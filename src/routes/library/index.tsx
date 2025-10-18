import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useReadingStore } from '../../lib/stores/reading'
import { Button, DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '../../lib/components/ui'
import { api } from '../../lib/utils/tauri'
import { Plus, ArrowUpDown } from 'lucide-react'
import type { Text } from '../../lib/types'
import { TextContextMenu } from '../../components/library/TextContextMenu'
import { useTextProgress } from '../../lib/hooks/useTextProgress'
import { BackToReadingButton } from '../../lib/components/shared/BackToReadingButton'

type SortOption = 'name-asc' | 'name-desc' | 'date-newest' | 'date-oldest' | 'content-length'

const sortTexts = (texts: Text[], sortBy: SortOption): Text[] => {
  const textsCopy = [...texts]

  switch (sortBy) {
    case 'name-asc':
      return textsCopy.sort((a, b) => a.title.localeCompare(b.title))
    case 'name-desc':
      return textsCopy.sort((a, b) => b.title.localeCompare(a.title))
    case 'date-newest':
      return textsCopy.sort((a, b) => new Date(b.ingestedAt).getTime() - new Date(a.ingestedAt).getTime())
    case 'date-oldest':
      return textsCopy.sort((a, b) => new Date(a.ingestedAt).getTime() - new Date(b.ingestedAt).getTime())
    case 'content-length':
      return textsCopy.sort((a, b) => b.contentLength - a.contentLength)
    default:
      return textsCopy
  }
}

const getSortLabel = (sortBy: SortOption): string => {
  switch (sortBy) {
    case 'name-asc':
      return 'Name (A-Z)'
    case 'name-desc':
      return 'Name (Z-A)'
    case 'date-newest':
      return 'Date Created (Newest)'
    case 'date-oldest':
      return 'Date Created (Oldest)'
    case 'content-length':
      return 'Content Length'
    default:
      return 'Sort'
  }
}

function TextProgress({ textId }: { textId: number }) {
  const { progress } = useTextProgress(textId);

  if (progress === null || progress === 0) {
    return null;
  }

  return (
    <span className="text-sm text-muted-foreground">
      {Math.round(progress)}% read
    </span>
  );
}

export function LibraryPage() {
  const navigate = useNavigate()
  const { texts, isLoading, error, loadTexts } = useReadingStore()
  const [reviewStats, setReviewStats] = useState<{ due_count: number; new_count: number; learning_count: number; review_count: number } | null>(null)
  const [sortBy, setSortBy] = useState<SortOption>('date-newest')

  useEffect(() => {
    loadTexts()
    api.review.getStats().then(setReviewStats).catch((err) => {
      console.error('Failed to fetch review stats:', err)
      // Set default stats on error so button still renders
      setReviewStats({ due_count: 0, new_count: 0, learning_count: 0, review_count: 0 })
    })
  }, [loadTexts])

  const handleTextClick = (id: number) => {
    navigate(`/read/${id}`)
  }

  const handleImportText = () => {
    navigate('/ingest')
  }

  const sortedTexts = useMemo(() => sortTexts(texts, sortBy), [texts, sortBy])

  return (
    <div className="flex-1 overflow-auto">
      <div className="border-b">
        <div className="container max-w-6xl mx-auto px-8 h-14 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">Library</h1>
            <BackToReadingButton />
          </div>
          <div className="flex gap-3 items-center">
          {texts.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  title={getSortLabel(sortBy)}
                  aria-label="Sort library"
                >
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setSortBy(sortBy === 'name-asc' ? 'name-desc' : 'name-asc')}>
                  Name (A-Z)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy(sortBy === 'name-desc' ? 'name-asc' : 'name-desc')}>
                  Name (Z-A)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy(sortBy === 'date-newest' ? 'date-oldest' : 'date-newest')}>
                  Date Created (Newest)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy(sortBy === 'date-oldest' ? 'date-newest' : 'date-oldest')}>
                  Date Created (Oldest)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('content-length')}>
                  Content Length
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {reviewStats && (
            <Button
              onClick={() => navigate('/review')}
              disabled={(reviewStats.due_count ?? 0) === 0}
              variant="default"
              aria-label={`Review ${reviewStats.due_count ?? 0} due flashcard${(reviewStats.due_count ?? 0) !== 1 ? 's' : ''}`}
            >
              Review Cards ({reviewStats.due_count ?? 0})
            </Button>
          )}
          <Button onClick={handleImportText}>
            <Plus className="h-4 w-4 mr-2" />
            Import Text
          </Button>
          </div>
        </div>
      </div>
      <div className="container max-w-6xl mx-auto px-8 pb-8 pt-6">
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading texts...</div>
        ) : texts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="mb-4">No texts in your library yet.</p>
            <Button onClick={handleImportText}>
              <Plus className="h-4 w-4 mr-2" />
              Import Your First Text
            </Button>
          </div>
        ) : (
          <div className="grid gap-4">
            {sortedTexts.map((text) => (
              <TextContextMenu key={text.id} textId={text.id} textTitle={text.title}>
                <div
                  className="border rounded-lg p-4 hover:bg-accent cursor-pointer transition"
                  onClick={() => handleTextClick(text.id)}
                >
                  <h2 className="text-xl font-semibold mb-2">{text.title}</h2>
                  {text.author && (
                    <p className="text-sm text-muted-foreground mb-1">by {text.author}</p>
                  )}
                  <div className="flex items-center gap-3">
                    <p className="text-sm text-muted-foreground">
                      {text.contentLength.toLocaleString()} characters
                    </p>
                    <TextProgress textId={text.id} />
                  </div>
                </div>
              </TextContextMenu>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
