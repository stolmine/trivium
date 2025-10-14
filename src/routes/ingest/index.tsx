import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useReadingStore } from '../../lib/stores/reading'
import {
  Button,
  Input,
  Textarea,
  Label,
} from '../../lib/components/ui'
import { ChevronLeft, X } from 'lucide-react'

export function IngestPage() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [author, setAuthor] = useState('')
  const [publicationDate, setPublicationDate] = useState('')
  const [publisher, setPublisher] = useState('')
  const { createText, isLoading } = useReadingStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      await createText({
        title,
        content,
        source: 'paste',
        author: author || undefined,
        publicationDate: publicationDate || undefined,
        publisher: publisher || undefined,
      })

      navigate('/library')
    } catch (error) {
      console.error('Failed to create text:', error)
    }
  }

  const handleCancel = () => {
    navigate(-1)
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-6 py-4 max-w-6xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={handleCancel}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <h1 className="text-2xl font-bold">Import New Text</h1>
            </div>
            <Button variant="ghost" size="icon" onClick={handleCancel} aria-label="Close">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-6 py-8 max-w-6xl">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <h2 className="text-lg font-semibold mb-4">Metadata</h2>

                <div className="space-y-2">
                  <Label htmlFor="title">
                    Title <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter the title of the text"
                    required
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="author">Author</Label>
                  <Input
                    id="author"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder="Enter the author's name"
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="publicationDate">Publication Date</Label>
                  <Input
                    id="publicationDate"
                    value={publicationDate}
                    onChange={(e) => setPublicationDate(e.target.value)}
                    placeholder="e.g., 2023, January 2023, or 2023-01-15"
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="publisher">Publisher</Label>
                  <Input
                    id="publisher"
                    value={publisher}
                    onChange={(e) => setPublisher(e.target.value)}
                    placeholder="Enter the publisher's name"
                    disabled={isLoading}
                  />
                </div>

                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    <span className="text-destructive">*</span> Required fields
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <h2 className="text-lg font-semibold mb-4">Content</h2>

                <div className="space-y-2">
                  <Label htmlFor="content">
                    Text Content <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Paste or type the full text content here..."
                    rows={20}
                    required
                    disabled={isLoading}
                    className="font-serif resize-none"
                  />
                  {content && (
                    <p className="text-xs text-muted-foreground">
                      {content.length.toLocaleString()} characters
                    </p>
                  )}
                </div>
              </div>
            </div>
          </form>
        </div>
      </main>

      <footer className="border-t bg-card sticky bottom-0">
        <div className="container mx-auto px-6 py-4 max-w-6xl">
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              onClick={handleSubmit}
              disabled={isLoading || !title || !content}
            >
              {isLoading ? 'Importing...' : 'Import to Library'}
            </Button>
          </div>
        </div>
      </footer>
    </div>
  )
}
