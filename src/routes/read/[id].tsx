import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
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
import { TextSelectionMenu, ReadHighlighter, parseExcludedRanges, renderedPosToCleanedPos, TextEditor, InlineEditor, SelectionEditor, SelectionToolbar, InlineRegionEditor } from '../../lib/components/reading'
import { expandToSentenceBoundary, expandToSmartBoundary, shouldRespectExactSelection } from '../../lib/utils/sentenceBoundary'
import { getSelectionRange } from '../../lib/utils/domPosition'
import type { ClozeNote } from '../../lib/types/flashcard'
import type { ReadPageLocationState } from '@/lib/types'
import { FlashcardSidebar } from '../../lib/components/flashcard/FlashcardSidebar'
import { detectEditRegion } from '../../lib/utils/markdownEdit'
import { updateMarkPositions } from '../../lib/utils/markPositions'
import { useReadingHistoryStore } from '../../lib/stores/readingHistory'
import { ChevronLeft, MoreVertical, Edit2, Trash2, Link, Search, Check, RotateCcw, CheckCircle } from 'lucide-react'
import { SearchBar } from '../../lib/components/reading/SearchBar'
import { useSearchStore } from '../../lib/stores/search'
import { findMatches } from '../../lib/utils/textSearch'
import { api } from '../../lib/utils/tauri'

export function ReadPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const scrollPositionRef = useRef<number | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [showRenameDialog, setShowRenameDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showFinishedDialog, setShowFinishedDialog] = useState(false)
  const [showClearDialog, setShowClearDialog] = useState(false)
  const [renameTextTitle, setRenameTextTitle] = useState('')
  const [isEditMode, setIsEditMode] = useState(false)
  const [inlineEditActive, setInlineEditActive] = useState(false)
  const [isEditButtonProcessing, setIsEditButtonProcessing] = useState(false)
  const [editingContent, setEditingContent] = useState('')
  const [marks, setMarks] = useState<ClozeNote[]>([])
  const [selectionInfo, setSelectionInfo] = useState<{
    text: string
    start: number
    end: number
    position: { x: number; y: number; bottom: number; width: number; height: number }
  } | null>(null)
  const [editRegion, setEditRegion] = useState<{
    start: number
    end: number
    extractedText: string
  } | null>(null)
  const [inlineEditRegion, setInlineEditRegion] = useState<{
    start: number
    end: number
  } | null>(null)
  const [isUndoing, setIsUndoing] = useState(false)
  const [isRedoing, setIsRedoing] = useState(false)
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
    clearProgress,
    markRangeAsRead,
    unmarkRangeAsRead,
    isRangeRead
  } = useReadingStore()
  const { undo, redo, canUndo, canRedo, setOnReadingPage } = useReadingHistoryStore()
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

  useEffect(() => {
    if (currentText) {
      const historyStore = useReadingHistoryStore.getState()

      if (historyStore.currentTextId !== currentText.id) {
        console.log('[ReadPage] Resetting history for new text:', currentText.id)
        historyStore.resetForText(currentText.id)
      }
    }
  }, [currentText?.id])

  useEffect(() => {
    console.log('[ReadPage] Component mounted - setting isOnReadingPage to true')
    setOnReadingPage(true)

    return () => {
      console.log('[ReadPage] Component unmounting - setting isOnReadingPage to false')
      setOnReadingPage(false)
    }
  }, [])

  // Sync editing content when currentText changes
  useEffect(() => {
    if (currentText) {
      setEditingContent(currentText.content)
    }
  }, [currentText])

  // Restore scroll position when returning from ingest page
  useEffect(() => {
    const state = location.state as ReadPageLocationState | undefined

    // Only restore if we have a scroll position, the container exists, AND currentText is loaded
    // The currentText check ensures content is rendered before we try to scroll
    if (state?.restoreScrollPosition !== undefined && scrollContainerRef.current && currentText && !isLoading) {
      const scrollPosition = state.restoreScrollPosition

      console.log('[ReadPage] Preparing to restore scroll position:', scrollPosition)

      // Use triple RAF to ensure DOM is fully rendered including highlights and marks
      // Single RAF = paint scheduled, Double RAF = paint complete, Triple RAF = layout stable
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (scrollContainerRef.current) {
              scrollContainerRef.current.scrollTop = scrollPosition
              console.log('[ReadPage] Successfully restored scroll position to:', scrollPosition)

              // Only clear the state AFTER successfully restoring scroll
              navigate(location.pathname, { replace: true, state: {} })
            }
          })
        })
      })
    }
  }, [location.state, currentText, isLoading, navigate, location.pathname])

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
      console.log('[ReadPage] Changes detected, processing...');

      const editRegion = detectEditRegion(currentText.content, editingContent);
      console.log('[ReadPage] Edit region detected:', editRegion);

      const marksBeforeEdit = [...marks];

      const { marks: marksAfterEdit } = updateMarkPositions(
        marksBeforeEdit,
        {
          start: editRegion.start,
          end: editRegion.end,
          originalText: editRegion.deletedText
        },
        editRegion.insertedText
      );
      console.log('[ReadPage] Marks updated:', {
        before: marksBeforeEdit.length,
        after: marksAfterEdit.length
      });

      console.log('[ReadPage] Saving content update...');
      await api.texts.updateContent(currentText.id, editingContent)

      console.log('[ReadPage] Reloading text and marks...');
      await loadText(currentText.id)
      await loadMarks(currentText.id)

      const historyStore = useReadingHistoryStore.getState();
      if (!historyStore.isUndoRedoInProgress) {
        console.log('[ReadPage] Recording text edit in history');
        historyStore.recordTextEdit({
          editRegion: { start: editRegion.start, end: editRegion.end },
          previousContent: currentText.content,
          newContent: editingContent,
          editedText: editRegion.insertedText,
          originalText: editRegion.deletedText,
          marksBeforeEdit,
          marksAfterEdit
        });
      }

      console.log('[ReadPage] Deactivating inline edit');
      setInlineEditActive(false)
    } catch (error) {
      console.error('[ReadPage] Failed to save:', error)
      alert('Failed to save: ' + (error instanceof Error ? error.message : String(error)))
    }
  }

  const handleEditButtonClick = () => {
    // Prevent rapid state changes from double-clicks or quick successive clicks
    if (isEditButtonProcessing) {
      console.log('[ReadPage] Edit button click ignored - still processing previous click');
      return
    }

    setIsEditButtonProcessing(true)

    // If canceling edit, revert content changes
    if (inlineEditActive) {
      console.log('[ReadPage] Canceling inline edit - reverting content');
      setEditingContent(currentText?.content || '')
    }

    setInlineEditActive(!inlineEditActive)

    // Reset processing flag after cooldown period
    setTimeout(() => {
      setIsEditButtonProcessing(false)
    }, 400)
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
        x: rect.right,
        y: rect.top,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height
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

  const handleActivateInlineEdit = () => {
    if (!selectionInfo || !currentText) return

    scrollPositionRef.current = scrollContainerRef.current?.scrollTop ?? 0

    const { cleanedContent } = parseExcludedRanges(currentText.content)
    const cleanedStart = renderedPosToCleanedPos(selectionInfo.start, cleanedContent)
    const cleanedEnd = renderedPosToCleanedPos(selectionInfo.end, cleanedContent)

    // Determine if we should respect exact selection or expand to smart boundaries
    const respectExact = shouldRespectExactSelection(
      cleanedContent,
      cleanedStart,
      cleanedEnd
    )

    let regionStart: number
    let regionEnd: number

    if (respectExact) {
      // User made intentional full selection, respect it exactly
      console.log('[ReadPage] Respecting exact user selection:', {
        length: cleanedEnd - cleanedStart,
        text: cleanedContent.substring(cleanedStart, cleanedEnd).substring(0, 50) + '...'
      })
      regionStart = cleanedStart
      regionEnd = cleanedEnd
    } else {
      // Small/partial selection, expand to smart boundaries
      console.log('[ReadPage] Expanding partial selection to smart boundaries:', {
        originalLength: cleanedEnd - cleanedStart,
        text: cleanedContent.substring(cleanedStart, cleanedEnd)
      })
      const expanded = expandToSmartBoundary(
        cleanedContent,
        cleanedStart,
        cleanedEnd
      )
      regionStart = expanded.start
      regionEnd = expanded.end
      console.log('[ReadPage] Expanded to:', {
        boundaryType: expanded.boundaryType,
        newLength: regionEnd - regionStart,
        text: cleanedContent.substring(regionStart, regionEnd).substring(0, 50) + '...'
      })
    }

    setInlineEditRegion({
      start: regionStart,
      end: regionEnd
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
      // Toggle logic: check if range is already read
      if (isRangeRead(selectionInfo.start, selectionInfo.end)) {
        // Unmark as read
        await unmarkRangeAsRead(currentText.id, selectionInfo.start, selectionInfo.end)
      } else {
        // Mark as read
        await markRangeAsRead(currentText.id, selectionInfo.start, selectionInfo.end)
      }

      setSelectionInfo(null)
    } catch (error) {
      console.error('[ReadPage] Failed to toggle read status:', error)
      alert('Failed to toggle read status: ' + (error instanceof Error ? error.message : String(error)))
    }
  }

  const handleUndo = async () => {
    if (!currentText || isUndoing) return

    // Capture current scroll position from the scrollable container (not window)
    const scrollY = scrollContainerRef.current?.scrollTop ?? 0

    console.log('[ReadPage] Undo requested')
    setIsUndoing(true)

    try {
      // Get the action we're about to undo to determine what needs reloading
      const historyStore = useReadingHistoryStore.getState()
      const actionToUndo = historyStore.past[historyStore.past.length - 1]

      await undo()

      console.log('[ReadPage] Reloading state after undo for action type:', actionToUndo?.type)

      // Only reload what actually changed based on action type
      if (actionToUndo?.type === 'text_edit') {
        // Text content changed - need to reload everything
        await loadText(currentText.id)
        await loadMarks(currentText.id)
        await getReadRanges(currentText.id)
        await calculateProgress(currentText.id)
      } else if (actionToUndo?.type === 'mark' || actionToUndo?.type === 'unmark') {
        // Only read ranges changed - backend already refreshed them via markRangeAsRead/unmarkRangeAsRead
        // Just need to update local state without reloading text (avoids DOM replacement)
        await getReadRanges(currentText.id)
        await calculateProgress(currentText.id)
      }

      // Restore scroll position to the container after re-render
      // Double RAF ensures this runs after all other scroll effects (e.g., search)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = scrollY
          }
        })
      })

      console.log('[ReadPage] Undo complete')
    } catch (error) {
      console.error('[ReadPage] Undo failed:', error)
      alert('Failed to undo: ' + (error instanceof Error ? error.message : String(error)))
    } finally {
      setIsUndoing(false)
    }
  }

  const handleRedo = async () => {
    if (!currentText || isRedoing) return

    // Capture current scroll position from the scrollable container (not window)
    const scrollY = scrollContainerRef.current?.scrollTop ?? 0

    console.log('[ReadPage] Redo requested')
    setIsRedoing(true)

    try {
      // Get the action we're about to redo to determine what needs reloading
      const historyStore = useReadingHistoryStore.getState()
      const actionToRedo = historyStore.future[historyStore.future.length - 1]

      await redo()

      console.log('[ReadPage] Reloading state after redo for action type:', actionToRedo?.type)

      // Only reload what actually changed based on action type
      if (actionToRedo?.type === 'text_edit') {
        // Text content changed - need to reload everything
        await loadText(currentText.id)
        await loadMarks(currentText.id)
        await getReadRanges(currentText.id)
        await calculateProgress(currentText.id)
      } else if (actionToRedo?.type === 'mark' || actionToRedo?.type === 'unmark') {
        // Only read ranges changed - backend already refreshed them via markRangeAsRead/unmarkRangeAsRead
        // Just need to update local state without reloading text (avoids DOM replacement)
        await getReadRanges(currentText.id)
        await calculateProgress(currentText.id)
      }

      // Restore scroll position to the container after re-render
      // Double RAF ensures this runs after all other scroll effects (e.g., search)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = scrollY
          }
        })
      })

      console.log('[ReadPage] Redo complete')
    } catch (error) {
      console.error('[ReadPage] Redo failed:', error)
      alert('Failed to redo: ' + (error instanceof Error ? error.message : String(error)))
    } finally {
      setIsRedoing(false)
    }
  }

  const handleNavigateToIngest = (url: string) => {
    try {
      new URL(url)
    } catch {
      console.warn('[ReadPage] Invalid URL:', url)
      return
    }

    const currentScrollPosition = scrollContainerRef.current?.scrollTop ?? 0

    navigate('/ingest', {
      state: {
        wikipediaUrl: url,
        returnTo: {
          path: location.pathname,
          scrollPosition: currentScrollPosition,
          textId: currentText?.id
        }
      }
    })
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'z' && !isEditMode && !inlineEditActive && !editRegion && !inlineEditRegion) {
        e.preventDefault()
        if (canUndo() && !isUndoing) {
          console.log('[ReadPage] Ctrl+Z pressed - undoing')
          handleUndo()
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z' && !isEditMode && !inlineEditActive && !editRegion && !inlineEditRegion) {
        e.preventDefault()
        if (canRedo() && !isRedoing) {
          console.log('[ReadPage] Ctrl+Shift+Z pressed - redoing')
          handleRedo()
        }
      }
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'e' && !isEditMode && !inlineEditActive && !editRegion && !inlineEditRegion) {
        e.preventDefault()
        if (selectionInfo) {
          console.log('[ReadPage] Ctrl+E pressed with selection - activating inline region edit');
          handleActivateInlineEdit()
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
      if (e.key === 'Escape' && inlineEditRegion) {
        e.preventDefault()
        console.log('[ReadPage] Escape pressed - canceling inline region edit');
        setInlineEditRegion(null)

        requestAnimationFrame(() => {
          if (scrollPositionRef.current !== null && scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = scrollPositionRef.current
            scrollPositionRef.current = null
          }
        })
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
  }, [isOpen, isEditMode, inlineEditActive, editRegion, inlineEditRegion, selectionInfo, editingContent, currentText, openSearch, closeSearch, canUndo, canRedo, isUndoing, isRedoing, handleUndo, handleRedo])

  useEffect(() => {
    // Don't scroll to search matches during undo/redo to preserve scroll position
    if (isUndoing || isRedoing) return

    // Don't scroll to search matches if we're restoring scroll position from navigation
    const state = location.state as ReadPageLocationState | undefined
    if (state?.restoreScrollPosition !== undefined) return

    if (matches.length > 0 && currentIndex >= 0) {
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
  }, [currentIndex, matches, isUndoing, isRedoing, location.state])

  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection()
      if (!selection || selection.isCollapsed) {
        setSelectionInfo(null)
      }
    }

    document.addEventListener('selectionchange', handleSelectionChange)
    return () => document.removeEventListener('selectionchange', handleSelectionChange)
  }, [])

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
                  onClick={handleEditButtonClick}
                  onMouseDown={(e) => {
                    // Prevent blur event from firing on InlineEditor when clicking this button
                    // This prevents the view from bouncing between edit/read modes
                    if (inlineEditActive) {
                      e.preventDefault()
                    }
                  }}
                  disabled={isEditButtonProcessing}
                  title={inlineEditActive ? 'Cancel editing (Esc)' : 'Edit text inline (Ctrl+E)'}
                  aria-label={inlineEditActive ? 'Cancel editing' : 'Edit text globally'}
                  className="h-9"
                >
                  <Edit2 className="h-4 w-4 mr-1" />
                  {inlineEditActive ? 'Cancel Edit' : 'Global Edit'}
                </Button>
                <Button
                  variant={linksEnabled ? 'default' : 'outline'}
                  size="sm"
                  onClick={toggleLinks}
                  title={linksEnabled ? 'Links enabled (Ctrl+L)' : 'Links disabled (Ctrl+L)'}
                  aria-label={linksEnabled ? 'Disable links' : 'Enable links'}
                  className="h-9 w-9 p-0"
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

        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
          <div className="container mx-auto px-8 py-12 max-w-4xl">
{isEditMode ? (
              <TextEditor
                textId={currentText.id}
                initialContent={currentText.content}
                onSave={handleSaveEdit}
                onCancel={() => setIsEditMode(false)}
                fontSize={fontSize * 16}
              />
            ) : inlineEditRegion ? (
              <article className="reading-content mx-auto space-y-4" style={{ fontSize: `${fontSize}rem` }}>
                <InlineRegionEditor
                  content={parseExcludedRanges(currentText.content).cleanedContent}
                  editRegion={inlineEditRegion}
                  marks={(() => {
                    // Convert marks from RENDERED to CLEANED space for overlap detection
                    const cleanedContent = parseExcludedRanges(currentText.content).cleanedContent;
                    return marks.map(mark => ({
                      ...mark,
                      startPosition: renderedPosToCleanedPos(mark.startPosition, cleanedContent),
                      endPosition: renderedPosToCleanedPos(mark.endPosition, cleanedContent)
                    }));
                  })()}
                  readRanges={(() => {
                    const cleanedContent = parseExcludedRanges(currentText.content).cleanedContent;
                    // Convert positions to CLEANED space for overlap detection, but preserve original RENDERED positions for deletion
                    return readRanges.map(range => ({
                      ...range,
                      originalStartPosition: range.startPosition,  // Store RENDERED position for deletion
                      originalEndPosition: range.endPosition,      // Store RENDERED position for deletion
                      startPosition: renderedPosToCleanedPos(range.startPosition, cleanedContent),
                      endPosition: renderedPosToCleanedPos(range.endPosition, cleanedContent)
                    }));
                  })()}
                  textId={currentText.id}
                  onNavigateToIngest={handleNavigateToIngest}
                  onSave={async (mergedContent: string, deletedMarks?: ClozeNote[]) => {
                    try {
                      console.log('[ReadPage] InlineRegionEditor save - detecting changes...');

                      // Detect what was edited
                      const editRegion = detectEditRegion(currentText.content, mergedContent);
                      console.log('[ReadPage] Edit region detected:', editRegion);

                      const marksBeforeEdit = [...marks];

                      // Update mark positions based on the edit
                      const { marks: marksAfterEdit } = updateMarkPositions(
                        marksBeforeEdit,
                        {
                          start: editRegion.start,
                          end: editRegion.end,
                          originalText: editRegion.deletedText
                        },
                        editRegion.insertedText
                      );
                      console.log('[ReadPage] Marks updated:', {
                        before: marksBeforeEdit.length,
                        after: marksAfterEdit.length
                      });

                      // Save the updated content
                      await api.texts.updateContent(currentText.id, mergedContent)
                      await loadText(currentText.id)
                      await loadMarks(currentText.id)
                      await getReadRanges(currentText.id)

                      // Record in history
                      const historyStore = useReadingHistoryStore.getState();
                      if (!historyStore.isUndoRedoInProgress) {
                        console.log('[ReadPage] Recording inline region edit in history');
                        historyStore.recordTextEdit({
                          editRegion: { start: editRegion.start, end: editRegion.end },
                          previousContent: currentText.content,
                          newContent: mergedContent,
                          editedText: editRegion.insertedText,
                          originalText: editRegion.deletedText,
                          marksBeforeEdit,
                          marksAfterEdit,
                          deletedMarks
                        });
                      }

                      setInlineEditRegion(null)

                      requestAnimationFrame(() => {
                        if (scrollPositionRef.current !== null && scrollContainerRef.current) {
                          scrollContainerRef.current.scrollTop = scrollPositionRef.current
                          scrollPositionRef.current = null
                        }
                      })
                    } catch (error) {
                      console.error('[ReadPage] Failed to save inline region edit:', error)
                      alert('Failed to save: ' + (error instanceof Error ? error.message : String(error)))
                    }
                  }}
                  onCancel={() => {
                    setInlineEditRegion(null)

                    requestAnimationFrame(() => {
                      if (scrollPositionRef.current !== null && scrollContainerRef.current) {
                        scrollContainerRef.current.scrollTop = scrollPositionRef.current
                        scrollPositionRef.current = null
                      }
                    })
                  }}
                />
              </article>
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
                          onNavigateToIngest={handleNavigateToIngest}
                        />
                      </div>
                    )}
                  </TextSelectionMenu>
                </article>

                {selectionInfo && !inlineEditActive && (
                  <SelectionToolbar
                    selection={selectionInfo}
                    onEdit={handleActivateSelectionEdit}
                    onEditInline={handleActivateInlineEdit}
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
