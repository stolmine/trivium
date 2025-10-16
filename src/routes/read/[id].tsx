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
  DialogFooter,
  Input,
  Label
} from '../../lib/components/ui'
import { TextSelectionMenu, ReadHighlighter, parseExcludedRanges } from '../../lib/components/reading'
import { FlashcardSidebar } from '../../lib/components/flashcard/FlashcardSidebar'
import { ChevronLeft, MoreVertical, Edit2, Trash2, Link } from 'lucide-react'

export function ReadPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [showRenameDialog, setShowRenameDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [renameTextTitle, setRenameTextTitle] = useState('')
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
    setExcludedRanges
  } = useReadingStore()
  const { renameText, deleteText } = useLibraryStore()
  const { linksEnabled, toggleLinks } = useSettingsStore()

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

  useEffect(() => {
    if (currentText) {
      const { excludedRanges } = parseExcludedRanges(currentText.content)
      setExcludedRanges(excludedRanges)
      setRenameTextTitle(currentText.title)
    }
  }, [currentText, setExcludedRanges])

  // Handler functions
  const handleRename = async () => {
    if (currentText && renameTextTitle.trim() && renameTextTitle.trim() !== currentText.title) {
      await renameText(currentText.id, renameTextTitle.trim())
      setShowRenameDialog(false)
      // Reload the text to get updated title
      await loadText(currentText.id)
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
                  variant={linksEnabled ? 'default' : 'outline'}
                  size="icon"
                  onClick={toggleLinks}
                  title={linksEnabled ? 'Links enabled (Ctrl+L)' : 'Links disabled (Ctrl+L)'}
                  aria-label={linksEnabled ? 'Disable links' : 'Enable links'}
                >
                  <Link className="h-4 w-4" />
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

        <div className="flex-1 overflow-y-auto">
          <div className="container mx-auto px-8 py-12 max-w-4xl">
            <article className="reading-content mx-auto space-y-4">
              <TextSelectionMenu textId={currentText.id}>
                <ReadHighlighter
                  content={currentText.content}
                  readRanges={readRanges}
                  linksEnabled={linksEnabled}
                />
              </TextSelectionMenu>
            </article>
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
    </div>
  )
}
