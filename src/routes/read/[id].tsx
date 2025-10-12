import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useReadingStore } from '../../lib/stores/reading'
import { Button } from '../../lib/components/ui'
import { TextSelectionMenu, ReadHighlighter } from '../../lib/components/reading'

export function ReadPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const {
    currentText,
    isLoading,
    error,
    loadText,
    readRanges,
    totalProgress,
    getReadRanges,
    getParagraphs,
    calculateProgress
  } = useReadingStore()

  useEffect(() => {
    if (id) {
      const textId = parseInt(id, 10)
      loadText(textId).then(() => {
        getReadRanges(textId)
        getParagraphs(textId)
        calculateProgress(textId)
      })
    }
  }, [id, loadText, getReadRanges, getParagraphs, calculateProgress])

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">Loading text...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
        <Button onClick={() => navigate('/')}>Back to Library</Button>
      </div>
    )
  }

  if (!currentText) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12 text-gray-500">Text not found</div>
        <Button onClick={() => navigate('/')}>Back to Library</Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <Button variant="outline" onClick={() => navigate('/')}>
          Back to Library
        </Button>
        <div className="text-sm text-gray-600">
          Progress: {totalProgress.toFixed(1)}%
        </div>
      </div>

      <article className="prose prose-lg max-w-none">
        <h1 className="text-4xl font-bold mb-4">{currentText.title}</h1>
        {currentText.author && (
          <p className="text-lg text-gray-600 mb-6">by {currentText.author}</p>
        )}
        <TextSelectionMenu>
          <ReadHighlighter
            content={currentText.content}
            readRanges={readRanges}
          />
        </TextSelectionMenu>
      </article>
    </div>
  )
}
