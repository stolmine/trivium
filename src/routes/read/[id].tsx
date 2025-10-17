import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useReadingStore } from '../../lib/stores/reading'
import { useLibraryStore } from '../../stores/library'
import { useSettingsStore } from '../../lib/stores/settings'
import {
  Button,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Input,
  Label
} from '../../lib/components/ui'
import { TextSelectionMenu, ReadHighlighter, parseExcludedRanges, renderedPosToCleanedPos, TextEditor, InlineEditor, SelectionEditor, SelectionToolbar } from '../../lib/components/reading'
import { expandToSentenceBoundary } from '../../lib/utils/sentenceBoundary'
import { getSelectionRange } from '../../lib/utils/domPosition'
import type { ClozeNote } from '../../lib/types/flashcard'
import { FlashcardSidebar } from '../../lib/components/flashcard/FlashcardSidebar'
import { ChevronLeft, MoreVertical, Edit2, Trash2, Link, Search, Check, RotateCcw, CheckCircle } from 'lucide-react'
import { SearchBar } from '../../lib/components/reading/SearchBar'
import { useSearchStore } from '../../lib/stores/search'
import { findMatches } from '../../lib/utils/textSearch'
import { api } from '../../lib/utils/tauri'

export function ReadPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [showRenameDialog, setShowRenameDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showFinishedDialog, setShowFinishedDialog] = useState(false)
  const [showClearDialog, setShowClearDialog] = useState(false)
  const [renameTextTitle, setRenameTextTitle] = useState('')
  const [isEditMode, setIsEditMode] = useState(false)
  const [inlineEditActive, setInlineEditActive] = useState(false)
  const [editingContent, setEditingContent] = useState('')
  const [marks, setMarks] = useState<ClozeNote[]>([])
  const [selectionInfo, setSelectionInfo] = useState<{
    text: string
    start: number
    end: number
    position: { x: number; y: number }
  } | null>(null)
  const [editRegion, setEditRegion] = useState<{
    start: number
    end: number
    extractedText: string
  } | null>(null)
  const {
    currentText,
    isLoading,
    error,
    loadText,
    readRanges,
    totalProgress,
    getReadRanges,
    getParagraphs,
    calculateProgress,
    setExcludedRanges,
    markAsFinished,
    clearProgress
  } = useReadingStore()
  const { renameText, deleteText } = useLibraryStore()
  const { linksEnabled, toggleLinks, fontSize, setFontSize } = useSettingsStore()
  const {
    isOpen,
    query,
    matches,
    currentIndex,
    caseSensitive,
    wholeWord,
    openSearch,
    closeSearch,
    setMatches
  } = useSearchStore()

  const loadMarks = async (textId: number) => {
    try {
      const fetchedMarks = await api.flashcards.getMarksForText(textId)
      const convertedMarks: ClozeNote[] = fetchedMarks.map(m => ({
        id: m.id,
        textId: m.textId,
        userId: 1,
        originalText: m.originalText,
        parsedSegments: '[]',
        clozeCount: 0,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
        startPosition: m.startPosition ?? 0,
        endPosition: m.endPosition ?? 0,
        status: m.status,
        notes: m.notes ?? undefined
      }))
      setMarks(convertedMarks)
    } catch (error) {
      console.error('Failed to load marks:', error)
      setMarks([])
    }
  }

  useEffect(() => {
    if (id) {
      const textId = parseInt(id, 10)
      loadText(textId).then(() => {
        getReadRanges(textId)
        getParagraphs(textId)
        calculateProgress(textId)
        loadMarks(textId)
      })
    }
  }, [id, loadText, getReadRanges, getParagraphs, calculateProgress])

  useEffect(() => {
    if (currentText) {
      const { excludedRanges } = parseExcludedRanges(currentText.content)
      setExcludedRanges(excludedRanges)
      setRenameTextTitle(currentText.title)
    }
  }, [currentText, setExcludedRanges])

  // Sync editing content when currentText changes
  useEffect(() => {
    if (currentText) {
      setEditingContent(currentText.content)
    }
  }, [currentText])

  useEffect(() => {
    if (!query || !currentText?.content) {
      setMatches([])
      return
    }

    console.log('[Search Performance] Executing search for query:', query)
    const startTime = performance.now()

    const { renderedContent } = parseExcludedRanges(currentText.content)
    const searchMatches = findMatches(renderedContent, query, {
      caseSensitive,
      wholeWord
    })

    const endTime = performance.now()
    console.log('[Search Performance] Search completed in', (endTime - startTime).toFixed(2), 'ms. Found', searchMatches.length, 'matches')

    setMatches(searchMatches)
  }, [query, caseSensitive, wholeWord, currentText?.content, setMatches])

  // Handler functions
  const handleRename = async () => {
    if (currentText && renameTextTitle.trim() && renameTextTitle.trim() !== currentText.title) {
      await renameText(currentText.id, renameTextTitle.trim())
      setShowRenameDialog(false)
      await loadText(currentText.id)
      await loadMarks(currentText.id)
    }
  }

  const handleDelete = async () => {
    if (currentText) {
      await deleteText(currentText.id)
      setShowDeleteDialog(false)
      // Navigate back to library after deletion
      navigate('/library')
    }
  }

  const handleMarkAsFinished = async () => {
    if (currentText) {
      await markAsFinished(currentText.id, currentText.contentLength)
      setShowFinishedDialog(false)
    }
  }

  const handleClearProgress = async () => {
    if (currentText) {
      await clearProgress(currentText.id)
      setShowClearDialog(false)
    }
  }

  const handleSaveEdit = async (newContent: string) => {
    if (!currentText) return
    await api.texts.updateContent(currentText.id, newContent)
    await loadText(currentText.id)
    await loadMarks(currentText.id)
    setIsEditMode(false)
  }

  const handleSaveInlineEdit = async () => {
    console.log('[ReadPage] handleSaveInlineEdit called', {
      hasCurrentText: !!currentText,
      editingContentLength: editingContent.length,
      currentTextContentLength: currentText?.content.length,
      areEqual: editingContent === currentText?.content
    });

    if (!currentText || editingContent === currentText.content) {
      console.log('[ReadPage] No changes, just deactivating');
      setInlineEditActive(false)
      return
    }

    try {
      console.log('[ReadPage] Saving content update...');
      await api.texts.updateContent(currentText.id, editingContent)
      console.log('[ReadPage] Reloading text...');
      await loadText(currentText.id)
      await loadMarks(currentText.id)
      console.log('[ReadPage] Deactivating inline edit');
      setInlineEditActive(false)
    } catch (error) {
      console.error('[ReadPage] Failed to save:', error)
    }
  }

  const handleTextSelection = () => {
    const selection = window.getSelection()
    if (!selection || selection.isCollapsed) {
      setSelectionInfo(null)
      return
    }

    const container = document.getElementById('article-content')
    if (!container) return

    const range = getSelectionRange(container)
    if (!range) return

    const rect = selection.getRangeAt(0).getBoundingClientRect()

    setSelectionInfo({
      text: selection.toString(),
      start: range.start,
      end: range.end,
      position: {
        x: rect.left + rect.width / 2,
        y: rect.top
      }
    })
  }

  const handleActivateSelectionEdit = () => {
    if (!selectionInfo || !currentText) return

    // Selection positions are in RENDERED space (DOM textContent)
    // Need to convert to CLEANED space (with markdown) for text extraction
    const { cleanedContent } = parseExcludedRanges(currentText.content)

    // Convert rendered positions to cleaned positions
    const cleanedStart = renderedPosToCleanedPos(selectionInfo.start, cleanedContent)
    const cleanedEnd = renderedPosToCleanedPos(selectionInfo.end, cleanedContent)

    // Expand to sentence boundaries in cleaned space
    const { start, end } = expandToSentenceBoundary(
      cleanedContent,
      cleanedStart,
      cleanedEnd
    )

    setEditRegion({
      start,
      end,
      extractedText: cleanedContent.substring(start, end)
    })

    setSelectionInfo(null)
  }

  const handleSaveSelectionEdit = async (newText: string, updatedMarks: ClozeNote[]) => {
    if (!currentText || !editRegion) return

    try {
      // editRegion positions are in CLEANED space (with markdown)
      // Merge the edited text back using cleaned content
      const { cleanedContent } = parseExcludedRanges(currentText.content)

      const mergedText =
        cleanedContent.substring(0, editRegion.start) +
        newText +
        cleanedContent.substring(editRegion.end)

      await api.texts.updateContent(currentText.id, mergedText)

      await loadText(currentText.id)
      await loadMarks(currentText.id)

      setEditRegion(null)

      console.log(`Text updated. ${updatedMarks.length} marks affected.`)
    } catch (error) {
      console.error('[ReadPage] Failed to save selection edit:', error)
      alert('Failed to save changes: ' + (error instanceof Error ? error.message : String(error)))
    }
  }

  const handleMarkSelectionRead = async () => {
    if (!selectionInfo || !currentText) return

    try {
      await api.reading.markRangeAsRead(
        currentText.id,
        selectionInfo.start,
        selectionInfo.end
      )

      await getReadRanges(currentText.id)
      await calculateProgress(currentText.id)

      setSelectionInfo(null)
    } catch (error) {
      console.error('[ReadPage] Failed to mark as read:', error)
      alert('Failed to mark as read: ' + (error instanceof Error ? error.message : String(error)))
    }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'e' && !isEditMode && !inlineEditActive && !editRegion) {
        e.preventDefault()
        if (selectionInfo) {
          console.log('[ReadPage] Ctrl+E pressed with selection - activating selection edit');
          handleActivateSelectionEdit()
        } else {
          console.log('[ReadPage] Ctrl+E pressed without selection - activating inline edit');
          setEditingContent(currentText?.content || '')
          setInlineEditActive(true)
        }
      }
      if (e.key === 'Escape' && inlineEditActive) {
        e.preventDefault()
        console.log('[ReadPage] Escape pressed - canceling inline edit, reverting content');
        setInlineEditActive(false)
        setEditingContent(currentText?.content || '')
      }
      if (e.key === 'Escape' && editRegion) {
        e.preventDefault()
        console.log('[ReadPage] Escape pressed - canceling selection edit');
        setEditRegion(null)
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's' && inlineEditActive) {
        e.preventDefault()
        console.log('[ReadPage] Ctrl+S pressed - saving inline edit');
        handleSaveInlineEdit()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'm' && selectionInfo && !editRegion) {
        e.preventDefault()
        console.log('[ReadPage] Ctrl+M pressed - marking selection as read');
        handleMarkSelectionRead()
      }
      if (!e.shiftKey && (e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault()
        openSearch()

        setTimeout(() => {
          const searchInput = document.querySelector('input[placeholder="Find in page..."]') as HTMLInputElement
          if (searchInput) {
            searchInput.focus()
            searchInput.select()
          }
        }, 0)
      }
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault()
        closeSearch()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isEditMode, inlineEditActive, editRegion, selectionInfo, editingContent, currentText, openSearch, closeSearch])

  useEffect(() => {
    if (matches.length > 0 && currentIndex >= 0) {
      // Use requestAnimationFrame to ensure DOM has updated before scrolling
      requestAnimationFrame(() => {
        const matchElement = document.querySelector(`[data-search-index="${currentIndex}"]`)

        if (matchElement) {
          matchElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest'
          })
        }
      })
    }
  }, [currentIndex, matches])

  // Add keyboard shortcuts for rename dialog
  useEffect(() => {
    if (!showRenameDialog) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && renameTextTitle.trim()) {
        e.preventDefault()
        handleRename()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showRenameDialog, renameTextTitle])

  // Add keyboard shortcuts for delete dialog
  useEffect(() => {
    if (!showDeleteDialog) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleDelete()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showDeleteDialog])

  // Add keyboard shortcuts for finished dialog
  useEffect(() => {
    if (!showFinishedDialog) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleMarkAsFinished()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showFinishedDialog])

  // Add keyboard shortcuts for clear dialog
  useEffect(() => {
    if (!showClearDialog) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleClearProgress()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showClearDialog])

  // Handle loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full py-12">
        <div className="text-muted-foreground">Loading text...</div>
      </div>
    )
  }

  // Handle error state
  if (error) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded mb-4">
          {error}
        </div>
        <Button variant="outline" onClick={() => navigate('/')}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>
    )
  }

  // Handle not found state
  if (!currentText) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="text-center py-12 text-muted-foreground">Text not found</div>
        <Button variant="outline" onClick={() => navigate('/')}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>
    )
  }

  // Render main content
  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto px-6 py-4 max-w-4xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
                <div>
                  <h1 className="text-lg font-semibold">{currentText.title}</h1>
                  {currentText.author && (
                    <p className="text-sm text-muted-foreground">by {currentText.author}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-sm text-muted-foreground">
                  Progress: <span className="font-medium">{totalProgress.toFixed(0)}%</span>
                </div>
                <Button
                  variant={inlineEditActive ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setInlineEditActive(!inlineEditActive)}
                  title={inlineEditActive ? 'Cancel editing (Esc)' : 'Edit text inline (Ctrl+E)'}
                  aria-label={inlineEditActive ? 'Cancel editing' : 'Edit text'}
                >
                  <Edit2 className="h-4 w-4 mr-1" />
                  {inlineEditActive ? 'Cancel Edit' : 'Edit'}
                </Button>
                <Button
                  variant={linksEnabled ? 'default' : 'outline'}
                  size="icon"
                  onClick={toggleLinks}
                  title={linksEnabled ? 'Links enabled (Ctrl+L)' : 'Links disabled (Ctrl+L)'}
                  aria-label={linksEnabled ? 'Disable links' : 'Enable links'}
                >
                  <Link className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    openSearch()
                    setTimeout(() => {
                      const searchInput = document.querySelector('input[placeholder="Find in page..."]') as HTMLInputElement
                      if (searchInput) {
                        searchInput.focus()
                        searchInput.select()
                      }
                    }, 0)
                  }}
                  title="Search in text (Ctrl+F)"
                  aria-label="Search in text"
                >
                  <Search className="h-4 w-4" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      title="Text options"
                      aria-label="Text options menu"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setShowRenameDialog(true)}>
                      <Edit2 className="mr-2 h-4 w-4" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setFontSize(1)}>
                      {fontSize === 1 && <Check className="mr-2 h-4 w-4" />}
                      {fontSize !== 1 && <span className="mr-6" />}
                      Small
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFontSize(1.25)}>
                      {fontSize === 1.25 && <Check className="mr-2 h-4 w-4" />}
                      {fontSize !== 1.25 && <span className="mr-6" />}
                      Medium
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFontSize(1.5)}>
                      {fontSize === 1.5 && <Check className="mr-2 h-4 w-4" />}
                      {fontSize !== 1.5 && <span className="mr-6" />}
                      Large
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFontSize(1.75)}>
                      {fontSize === 1.75 && <Check className="mr-2 h-4 w-4" />}
                      {fontSize !== 1.75 && <span className="mr-6" />}
                      Extra Large
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setShowFinishedDialog(true)}>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Mark as Finished
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowClearDialog(true)}>
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Clear Progress
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setShowDeleteDialog(true)}>
                      <Trash2 className="mr-2 h-4 w-4 text-destructive" />
                      <span className="text-destructive">Delete</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                  className="md:hidden"
                >
                  Cards
                </Button>
              </div>
            </div>
          </div>
        </header>

        {isOpen && <SearchBar />}

        <div className="flex-1 overflow-y-auto">
          <div className="container mx-auto px-8 py-12 max-w-4xl">
            {isEditMode ? (
              <TextEditor
                textId={currentText.id}
                initialContent={currentText.content}
                onSave={handleSaveEdit}
                onCancel={() => setIsEditMode(false)}
                fontSize={fontSize * 16}
              />
            ) : editRegion ? (
              <SelectionEditor
                fullText={currentText.content}
                marks={marks}
                editRegion={editRegion}
                onSave={handleSaveSelectionEdit}
                onCancel={() => setEditRegion(null)}
                fontSize={fontSize}
              />
            ) : (
              <>
                <article className="reading-content mx-auto space-y-4" style={{ fontSize: `${fontSize}rem` }}>
                  <TextSelectionMenu textId={currentText.id}>
                    {inlineEditActive ? (
                      <InlineEditor
                        initialContent={currentText.content}
                        onContentChange={setEditingContent}
                        onActivate={() => setInlineEditActive(true)}
                        onDeactivate={handleSaveInlineEdit}
                        isActive={true}
                        className="font-serif"
                        fontSize={fontSize}
                      />
                    ) : (
                      <div
                        id="article-content"
                        onMouseUp={handleTextSelection}
                        onKeyUp={handleTextSelection}
                      >
                        <ReadHighlighter
                          content={currentText.content}
                          readRanges={readRanges}
                          linksEnabled={linksEnabled}
                          searchMatches={matches}
                          activeSearchIndex={currentIndex}
                        />
                      </div>
                    )}
                  </TextSelectionMenu>
                </article>

                {selectionInfo && !inlineEditActive && (
                  <SelectionToolbar
                    selection={selectionInfo}
                    onEdit={handleActivateSelectionEdit}
                    onMarkAsRead={handleMarkSelectionRead}
                    position={selectionInfo.position}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <div
        className={`hidden md:flex flex-col border-l transition-all duration-300 ${
          isSidebarCollapsed ? 'w-12' : 'w-96'
        }`}
      >
        <FlashcardSidebar
          textId={currentText.id}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />
      </div>

      {/* Rename Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Text</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rename-text">Title</Label>
              <Input
                id="rename-text"
                value={renameTextTitle}
                onChange={(e) => setRenameTextTitle(e.target.value)}
                placeholder="Enter text title"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenameDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleRename} disabled={!renameTextTitle.trim()}>
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Text</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete "{currentText.title}"? This action cannot be undone. All
              flashcards associated with this text will also be deleted.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark as Finished Dialog */}
      <Dialog open={showFinishedDialog} onOpenChange={setShowFinishedDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as Finished?</DialogTitle>
            <DialogDescription>
              This will mark the entire text as read and set progress to 100%. You can still create flashcards from marked text.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFinishedDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleMarkAsFinished}>
              Mark as Finished
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clear Progress Dialog */}
      <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear Reading Progress?</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              This will remove all read marks for this text. Flashcards already created will not be affected. This action cannot be undone.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClearDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleClearProgress}>
              Clear Progress
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
