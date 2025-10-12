import { useState } from 'react'
import { useReadingStore } from '../../stores/reading'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
  Input,
  Textarea,
  Label,
} from '../ui'

interface IngestModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function IngestModal({ open, onOpenChange }: IngestModalProps) {
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

      setTitle('')
      setContent('')
      setAuthor('')
      setPublicationDate('')
      setPublisher('')
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to create text:', error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import Text</DialogTitle>
          <DialogDescription>
            Add a new text to your library
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter title"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste your text here"
              rows={10}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="author">Author (optional)</Label>
            <Input
              id="author"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Enter author"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="publicationDate">Publication Date (optional)</Label>
            <Input
              id="publicationDate"
              value={publicationDate}
              onChange={(e) => setPublicationDate(e.target.value)}
              placeholder="Enter publication date"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="publisher">Publisher (optional)</Label>
            <Input
              id="publisher"
              value={publisher}
              onChange={(e) => setPublisher(e.target.value)}
              placeholder="Enter publisher"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Importing...' : 'Import'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
