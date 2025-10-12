import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useReadingStore } from '../../lib/stores/reading'
import { IngestModal } from '../../lib/components/reading'
import { Button } from '../../lib/components/ui'

export function LibraryPage() {
  const navigate = useNavigate()
  const { texts, isLoading, error, loadTexts } = useReadingStore()
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    loadTexts()
  }, [loadTexts])

  const handleTextClick = (id: number) => {
    navigate(`/read/${id}`)
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Library</h1>
        <Button onClick={() => setIsModalOpen(true)}>Import Text</Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12">Loading texts...</div>
      ) : texts.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="mb-4">No texts in your library yet.</p>
          <Button onClick={() => setIsModalOpen(true)}>Import Your First Text</Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {texts.map((text) => (
            <div
              key={text.id}
              className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition"
              onClick={() => handleTextClick(text.id)}
            >
              <h2 className="text-xl font-semibold mb-2">{text.title}</h2>
              {text.author && (
                <p className="text-sm text-gray-600 mb-1">by {text.author}</p>
              )}
              <p className="text-sm text-gray-500">
                {text.content_length.toLocaleString()} characters
              </p>
            </div>
          ))}
        </div>
      )}

      <IngestModal open={isModalOpen} onOpenChange={setIsModalOpen} />
    </div>
  )
}
