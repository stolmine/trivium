import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useReadingStore } from '../../lib/stores/reading'
import { Button } from '../../lib/components/ui'
import { api } from '../../lib/utils/tauri'
import { Plus } from 'lucide-react'

export function LibraryPage() {
  const navigate = useNavigate()
  const { texts, isLoading, error, loadTexts } = useReadingStore()
  const [reviewStats, setReviewStats] = useState<{ due_count: number; new_count: number; learning_count: number; review_count: number } | null>(null)

  useEffect(() => {
    loadTexts()
    api.review.getStats().then(setReviewStats).catch(console.error)
  }, [loadTexts])

  const handleTextClick = (id: number) => {
    navigate(`/read/${id}`)
  }

  const handleImportText = () => {
    navigate('/ingest')
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Library</h1>
        <div className="flex gap-3 items-center">
          {reviewStats && (
            <Button
              onClick={() => navigate('/review')}
              disabled={reviewStats.due_count === 0}
              variant="default"
              aria-label={`Review ${reviewStats.due_count} due flashcard${reviewStats.due_count !== 1 ? 's' : ''}`}
            >
              Review Cards ({reviewStats.due_count})
            </Button>
          )}
          <Button onClick={handleImportText}>
            <Plus className="h-4 w-4 mr-2" />
            Import Text
          </Button>
        </div>
      </div>

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
          {texts.map((text) => (
            <div
              key={text.id}
              className="border rounded-lg p-4 hover:bg-accent cursor-pointer transition"
              onClick={() => handleTextClick(text.id)}
            >
              <h2 className="text-xl font-semibold mb-2">{text.title}</h2>
              {text.author && (
                <p className="text-sm text-muted-foreground mb-1">by {text.author}</p>
              )}
              <p className="text-sm text-muted-foreground">
                {text.contentLength.toLocaleString()} characters
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
