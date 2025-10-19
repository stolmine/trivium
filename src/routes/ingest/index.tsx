import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useReadingStore } from '../../lib/stores/reading'
import { useLibraryStore } from '../../stores/library'
import { useFolderStore } from '../../lib/stores/folder'
import { getModifierKey } from '../../lib/utils/platform'
import {
  Button,
  Input,
  Textarea,
  Label,
} from '../../lib/components/ui'
import { Loader2 } from 'lucide-react'
import { useTextHistory } from '../../hooks/useTextHistory'
import { api } from '../../lib/utils/tauri'
import { FolderSelect } from '@/lib/components/folders/FolderSelect'
import { BackToReadingButton } from '@/lib/components/shared/BackToReadingButton'
import type { IngestPageLocationState } from '@/lib/types'

export function IngestPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const initialState = location.state as IngestPageLocationState | undefined

  const [returnTo] = useState(initialState?.returnTo)
  const [title, setTitle] = useState('')
  const {
    content,
    setContent,
    setContentImmediate,
    textareaRef: contentRef,
    undo,
    redo,
  } = useTextHistory({ debounceMs: 500 })
  const [author, setAuthor] = useState('')
  const [publicationDate, setPublicationDate] = useState('')
  const [publisher, setPublisher] = useState('')
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(
    initialState?.selectedFolderId || null
  )
  const { createText, isLoading } = useReadingStore()
  const { texts, loadLibrary } = useLibraryStore()
  const { folderTree, loadFolderTree } = useFolderStore()
  const [wikipediaUrl, setWikipediaUrl] = useState(initialState?.wikipediaUrl || '')
  const [isFetching, setIsFetching] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [titleError, setTitleError] = useState<string | null>(null)
  const mod = getModifierKey()

  const handleFetchWikipedia = async () => {
    if (!wikipediaUrl.trim()) return

    setIsFetching(true)
    setFetchError(null)

    try {
      const article = await api.wikipedia.fetch(wikipediaUrl)

      setTitle(article.title)
      setContentImmediate(article.content)
      setPublisher('Wikipedia')
      setPublicationDate(article.timestamp.split('T')[0])
      setAuthor('')
    } catch (error) {
      console.error('Failed to fetch Wikipedia article:', error)
      setFetchError(error instanceof Error ? error.message : 'Failed to fetch Wikipedia article')
    } finally {
      setIsFetching(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const trimmedTitle = title.trim()
    if (!trimmedTitle || titleError) {
      return
    }

    try {
      await createText({
        title: trimmedTitle,
        content,
        source: wikipediaUrl ? 'wikipedia' : 'paste',
        sourceUrl: wikipediaUrl || undefined,
        author: author || undefined,
        publicationDate: publicationDate || undefined,
        publisher: publisher || undefined,
        folderId: selectedFolderId,
      })

      await loadLibrary()

      if (returnTo) {
        navigate(returnTo.path, {
          state: {
            restoreScrollPosition: returnTo.scrollPosition
          }
        })
      } else {
        navigate('/library')
      }
    } catch (error) {
      console.error('Failed to create text:', error)
    }
  }

  const handleCancel = () => {
    if (returnTo) {
      navigate(returnTo.path, {
        state: {
          restoreScrollPosition: returnTo.scrollPosition
        }
      })
    } else {
      navigate(-1)
    }
  }

  const wrapSelection = (before: string, after: string) => {
    const textarea = contentRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = content.substring(start, end)

    if (selectedText) {
      const newContent =
        content.substring(0, start) +
        before + selectedText + after +
        content.substring(end)

      setContentImmediate(newContent)

      setTimeout(() => {
        textarea.focus()
        textarea.setSelectionRange(
          start + before.length + selectedText.length + after.length,
          start + before.length + selectedText.length + after.length
        )
      }, 0)
    }
  }

  const handleWrapExclude = () => {
    wrapSelection('[[exclude]]', '[[/exclude]]')
  }

  useEffect(() => {
    loadFolderTree()
    loadLibrary()
  }, [loadFolderTree, loadLibrary])

  useEffect(() => {
    if (initialState?.wikipediaUrl && !content) {
      handleFetchWikipedia()
    }
  }, [])

  useEffect(() => {
    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setTitleError(null)
      return
    }

    console.log('[Ingest Validation] Checking for duplicates:', {
      title: trimmedTitle,
      selectedFolderId,
      totalTexts: texts.length,
      textsInFolder: texts.filter(t => t.folderId === selectedFolderId).length
    })

    const duplicateText = texts.find(
      t => t.folderId === selectedFolderId &&
      t.title.toLowerCase() === trimmedTitle.toLowerCase()
    )

    if (duplicateText) {
      console.log('[Ingest Validation] Duplicate found:', duplicateText)
      setTitleError('A text with this title already exists in this folder')
    } else {
      console.log('[Ingest Validation] No duplicate found')
      setTitleError(null)
    }
  }, [title, texts, selectedFolderId])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        handleCancel()
        return
      }

      if (e.key === 'Enter' && e.shiftKey) {
        e.preventDefault()
        if (title && content && !titleError) {
          handleSubmit(e as unknown as React.FormEvent)
        }
        return
      }

      if (document.activeElement === contentRef.current) {
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'E') {
          e.preventDefault()
          handleWrapExclude()
        }

        if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'z') {
          e.preventDefault()
          undo()
        }

        if (
          ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') ||
          ((e.ctrlKey || e.metaKey) && e.key === 'y')
        ) {
          e.preventDefault()
          redo()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [content, title, titleError, undo, redo, selectedFolderId])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10">
        <div className="container max-w-6xl mx-auto px-8 h-14 flex items-center gap-3">
          <h1 className="text-3xl font-bold">Ingest New Text</h1>
          <BackToReadingButton />
        </div>
      </header>
      <div className="flex-1 overflow-y-auto">
        <div className="container max-w-6xl mx-auto px-8 pb-8 pt-6">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <h2 className="text-lg font-semibold mb-4">Metadata</h2>

                <div className="space-y-2">
                  <Label htmlFor="wikipediaUrl">Wikipedia URL (optional)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="wikipediaUrl"
                      value={wikipediaUrl}
                      onChange={(e) => setWikipediaUrl(e.target.value)}
                      placeholder="https://en.wikipedia.org/wiki/..."
                      disabled={isLoading || isFetching}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      onClick={handleFetchWikipedia}
                      disabled={isLoading || isFetching || !wikipediaUrl.trim()}
                      variant="outline"
                    >
                      {isFetching ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </>
                      ) : (
                        'Fetch Article'
                      )}
                    </Button>
                  </div>
                  {fetchError && (
                    <p className="text-sm text-destructive">{fetchError}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Paste a Wikipedia URL and click "Fetch Article" to auto-fill the form, or manually enter text below.
                  </p>
                </div>

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
                  {titleError && (
                    <p className="text-sm text-destructive">{titleError}</p>
                  )}
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

                <div className="space-y-2">
                  <Label htmlFor="folder">Folder (optional)</Label>
                  <FolderSelect
                    value={selectedFolderId}
                    onChange={setSelectedFolderId}
                    folders={folderTree}
                  />
                  <p className="text-xs text-muted-foreground">
                    Select a folder to organize this text. Leave empty for root level.
                  </p>
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
                  <div className="flex items-center justify-between">
                    <Label htmlFor="content">
                      Text Content <span className="text-destructive">*</span>
                    </Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleWrapExclude}
                        disabled={isLoading}
                        title={`Exclude selection from progress (${mod}+Shift+E)`}
                      >
                        Exclude Text
                      </Button>
                    </div>
                  </div>
                  <Textarea
                    ref={contentRef}
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
                  <p className="text-xs text-muted-foreground">
                    Tip: Press Shift+Enter to ingest, Esc to cancel, {mod}+Z to undo, or {mod}+Shift+E to exclude selected text from progress tracking
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6">
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
                disabled={isLoading || !title || !content || !!titleError}
              >
                {isLoading ? 'Ingesting...' : 'Ingest to Library'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
