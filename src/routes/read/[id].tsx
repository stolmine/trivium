import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useReadingStore } from '../../lib/stores/reading'
import { useLibraryStore } from '../../stores/library'
import { useSettingsStore } from '../../lib/stores/settings'
import { useLastReadStore } from '../../lib/stores/lastRead'
import { getModifierKey } from '../../lib/utils/platform'
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
import { TextSelectionMenu, ReadHighlighter, parseExcludedRanges, renderedPosToCleanedPos, TextEditor, InlineEditor, SelectionEditor, SelectionToolbar, InlineRegionEditor, LinksSidebar, TypewriterReader } from '../../lib/components/reading'
import { expandToSentenceBoundary, expandToSmartBoundary, shouldRespectExactSelection } from '../../lib/utils/sentenceBoundary'
import { getSelectionRange } from '../../lib/utils/domPosition'
import type { ClozeNote } from '../../lib/types/flashcard'
import type { ReadPageLocationState } from '@/lib/types'
import { FlashcardSidebar } from '../../lib/components/flashcard/FlashcardSidebar'
import { detectEditRegion } from '../../lib/utils/markdownEdit'
import { updateMarkPositions } from '../../lib/utils/markPositions'
import { useReadingHistoryStore } from '../../lib/stores/readingHistory'
import { MoreVertical, Edit2, Trash2, Link, Search, Check, RotateCcw, CheckCircle, Link2, Zap, CircleDot } from 'lucide-react'
import { SearchBar } from '../../lib/components/reading/SearchBar'
import { cn } from '../../lib/utils'
import { useSearchStore } from '../../lib/stores/search'
import { findMatches } from '../../lib/utils/textSearch'
import { api } from '../../lib/utils/tauri'
import { useLinksSidebarStore } from '../../lib/stores/linksSidebar'

export function ReadPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const scrollPositionRef = useRef<number | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [isFlashcardSidebarOpen, setIsFlashcardSidebarOpen] = useState(false)
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
  const [isTypewriterMode, setIsTypewriterMode] = useState(false)
  const sessionInactivityTimeoutRef = useRef<NodeJS.Timeout | null>(null)
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
  const { setLastRead } = useLastReadStore()
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
  const { extractLinks, isOpen: isLinksOpen, setOpen: setLinksOpen } = useLinksSidebarStore()
  const mod = getModifierKey()

  // Detect when both sidebars are open
  const bothSidebarsOpen = isLinksOpen && isFlashcardSidebarOpen

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
      extractLinks(currentText.content)
    }
  }, [currentText, setExcludedRanges, extractLinks])

  useEffect(() => {
    if (currentText) {
      const historyStore = useReadingHistoryStore.getState()

      if (historyStore.currentTextId !== currentText.id) {
        historyStore.resetForText(currentText.id)
      }
    }
  }, [currentText?.id])

  useEffect(() => {
    setOnReadingPage(true)

    return () => {
      setOnReadingPage(false)
    }
  }, [])

  useEffect(() => {
    if (!currentText) return

    const sessionId = crypto.randomUUID()
    const startTime = new Date()

    const startPosition = scrollContainerRef.current?.scrollTop ?? 0
    api.reading.startReadingSession(currentText.id, sessionId, startPosition)

    const resetInactivityTimer = () => {
      if (sessionInactivityTimeoutRef.current) {
        clearTimeout(sessionInactivityTimeoutRef.current)
      }

      sessionInactivityTimeoutRef.current = setTimeout(() => {
        const endPosition = scrollContainerRef.current?.scrollTop ?? 0
        const durationSeconds = Math.floor((new Date().getTime() - startTime.getTime()) / 1000)
        api.reading.endReadingSession(sessionId, endPosition, durationSeconds)
      }, 5 * 60 * 1000)
    }

    const handleActivity = () => resetInactivityTimer()
    const container = scrollContainerRef.current

    if (container) {
      container.addEventListener('scroll', handleActivity)
      container.addEventListener('mousedown', handleActivity)
      container.addEventListener('keydown', handleActivity)
    }

    resetInactivityTimer()

    return () => {
      const endPosition = scrollContainerRef.current?.scrollTop ?? 0
      const durationSeconds = Math.floor((new Date().getTime() - startTime.getTime()) / 1000)
      api.reading.endReadingSession(sessionId, endPosition, durationSeconds)

      if (container) {
        container.removeEventListener('scroll', handleActivity)
        container.removeEventListener('mousedown', handleActivity)
        container.removeEventListener('keydown', handleActivity)
      }

      if (sessionInactivityTimeoutRef.current) {
        clearTimeout(sessionInactivityTimeoutRef.current)
      }
    }
  }, [currentText?.id])

  useEffect(() => {
    if (!currentText || !scrollContainerRef.current) return

    const updateLastRead = () => {
      const scrollPosition = scrollContainerRef.current?.scrollTop ?? 0
      setLastRead(currentText.id, currentText.title, scrollPosition, totalProgress)
    }

    updateLastRead()

    let scrollTimeout: NodeJS.Timeout
    const handleScroll = () => {
      clearTimeout(scrollTimeout)
      scrollTimeout = setTimeout(() => {
        updateLastRead()
      }, 500)
    }

    const container = scrollContainerRef.current
    container.addEventListener('scroll', handleScroll)

    return () => {
      container?.removeEventListener('scroll', handleScroll)
      clearTimeout(scrollTimeout)
    }
  }, [currentText, totalProgress, setLastRead])

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

      // Use triple RAF to ensure DOM is fully rendered including highlights and marks
      // Single RAF = paint scheduled, Double RAF = paint complete, Triple RAF = layout stable
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (scrollContainerRef.current) {
              scrollContainerRef.current.scrollTop = scrollPosition

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

    const { renderedContent } = parseExcludedRanges(currentText.content)
    const searchMatches = findMatches(renderedContent, query, {
      caseSensitive,
      wholeWord
    })

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
      await markAsFinished(currentText.id)
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
    if (!currentText || editingContent === currentText.content) {
      setInlineEditActive(false)
      return
    }

    try {
      const editRegion = detectEditRegion(currentText.content, editingContent);

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

      await api.texts.updateContent(currentText.id, editingContent)

      await loadText(currentText.id)
      await loadMarks(currentText.id)

      const historyStore = useReadingHistoryStore.getState();
      if (!historyStore.isUndoRedoInProgress) {
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

      setInlineEditActive(false)
    } catch (error) {
      console.error('[ReadPage] Failed to save:', error)
      alert('Failed to save: ' + (error instanceof Error ? error.message : String(error)))
    }
  }

  const handleEditButtonClick = () => {
    // Prevent rapid state changes from double-clicks or quick successive clicks
    if (isEditButtonProcessing) {
      return
    }

    setIsEditButtonProcessing(true)

    // If canceling edit, revert content changes
    if (inlineEditActive) {
      setEditingContent(currentText?.content || '')
    }

    setInlineEditActive(!inlineEditActive)

    // Reset processing flag after cooldown period
    setTimeout(() => {
      setIsEditButtonProcessing(false)
    }, 400)
  }

  const handleTextSelection = useCallback(() => {
    // Delay state update to avoid re-renders during active selection
    setTimeout(() => {
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
    }, 150) // 150ms debounce - enough for browser to stabilize selection
  }, [])

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
      regionStart = cleanedStart
      regionEnd = cleanedEnd
    } else {
      // Small/partial selection, expand to smart boundaries
      const expanded = expandToSmartBoundary(
        cleanedContent,
        cleanedStart,
        cleanedEnd
      )
      regionStart = expanded.start
      regionEnd = expanded.end
    }

    setInlineEditRegion({
      start: regionStart,
      end: regionEnd
    })

    setSelectionInfo(null)
  }

  const handleSaveSelectionEdit = async (newText: string) => {
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
    } catch (error) {
      console.error('[ReadPage] Failed to save selection edit:', error)
      alert('Failed to save changes: ' + (error instanceof Error ? error.message : String(error)))
    }
  }

  const handleMarkSelectionRead = async () => {
    if (!selectionInfo || !currentText) return

    try {
      // Toggle logic: check if range is already read
      const isAlreadyRead = isRangeRead(selectionInfo.start, selectionInfo.end);

      if (isAlreadyRead) {
        // Unmark as read
        await unmarkRangeAsRead(currentText.id, selectionInfo.start, selectionInfo.end)
      } else {
        // Mark as read for progress tracking
        await markRangeAsRead(currentText.id, selectionInfo.start, selectionInfo.end)

        // Also create a mark for the Create Cards hub with position information
        try {
          await api.flashcards.createMark(
            currentText.id,
            selectionInfo.text,
            selectionInfo.start,
            selectionInfo.end
          )
        } catch (error) {
          console.error('[ReadPage] Failed to create mark:', error)
          // Don't block the read marking if mark creation fails
        }
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

    setIsUndoing(true)

    try {
      // Get the action we're about to undo to determine what needs reloading
      const historyStore = useReadingHistoryStore.getState()
      const actionToUndo = historyStore.past[historyStore.past.length - 1]

      await undo()

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

    setIsRedoing(true)

    try {
      // Get the action we're about to redo to determine what needs reloading
      const historyStore = useReadingHistoryStore.getState()
      const actionToRedo = historyStore.future[historyStore.future.length - 1]

      await redo()

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
          handleUndo()
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z' && !isEditMode && !inlineEditActive && !editRegion && !inlineEditRegion) {
        e.preventDefault()
        if (canRedo() && !isRedoing) {
          handleRedo()
        }
      }
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'e' && !isEditMode && !inlineEditActive && !editRegion && !inlineEditRegion) {
        e.preventDefault()
        if (selectionInfo) {
          handleActivateInlineEdit()
        } else {
          setEditingContent(currentText?.content || '')
          setInlineEditActive(true)
        }
      }
      if (e.key === 'Escape' && inlineEditActive) {
        e.preventDefault()
        setInlineEditActive(false)
        setEditingContent(currentText?.content || '')
      }
      if (e.key === 'Escape' && editRegion) {
        e.preventDefault()
        setEditRegion(null)
      }
      if (e.key === 'Escape' && inlineEditRegion) {
        e.preventDefault()
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
        handleSaveInlineEdit()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'd' && selectionInfo && !editRegion) {
        e.preventDefault()
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

  // Handle click-away to clear selection toolbar
  useEffect(() => {
    const handleClickAway = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      // Clear selection if clicking outside article content and not on toolbar
      if (!target.closest('#article-content') && !target.closest('[data-selection-toolbar]')) {
        setSelectionInfo(null)
      }
    }

    document.addEventListener('mousedown', handleClickAway)
    return () => document.removeEventListener('mousedown', handleClickAway)
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
      <div className="flex items-center justify-center h-full py-12 bg-background">
        <div className="text-muted-foreground">Loading text...</div>
      </div>
    )
  }

  // Handle error state
  if (error) {
    return (
      <div className="container mx-auto p-6 max-w-4xl bg-background min-h-screen">
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded mb-4">
          {error}
        </div>
        <Button variant="outline" onClick={() => navigate('/')}>
          Back to Dashboard
        </Button>
      </div>
    )
  }

  // Handle not found state
  if (!currentText) {
    return (
      <div className="container mx-auto p-6 max-w-4xl bg-background min-h-screen">
        <div className="text-center py-12 text-muted-foreground">Text not found</div>
        <Button variant="outline" onClick={() => navigate('/')}>
          Back to Dashboard
        </Button>
      </div>
    )
  }

  // Render main content
  return (
    <div className="flex h-full overflow-hidden bg-background">
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="sticky top-0 z-10 h-14 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto px-8 h-full max-w-4xl">
            <div className="reading-content mx-auto h-full">
              <div className="flex items-center justify-between h-full">
                <div className="flex items-center gap-4">
                  <div>
                    <h1
                      className={cn(
                        "text-lg font-semibold truncate",
                        bothSidebarsOpen ? "max-w-[200px]" : "max-w-[600px]"
                      )}
                      title={currentText.title}
                    >
                      {currentText.title}
                    </h1>
                    {currentText.author && (
                      <p className={cn(
                        "text-sm text-muted-foreground truncate",
                        bothSidebarsOpen ? "max-w-[200px]" : "max-w-[600px]"
                      )}
                        title={currentText.author}
                      >
                        by {currentText.author}
                      </p>
                    )}
                  </div>
                </div>
                <div className={cn(
                  "flex items-center",
                  bothSidebarsOpen ? "gap-1.5" : "gap-4"
                )}>
                <div className="text-sm text-muted-foreground whitespace-nowrap">
                  {!bothSidebarsOpen && 'Progress: '}
                  <span className="font-medium">{totalProgress.toFixed(0)}%</span>
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
                  title={inlineEditActive ? 'Cancel editing (Esc)' : `Edit text inline (${mod}+E)`}
                  aria-label={inlineEditActive ? 'Cancel editing' : 'Edit text globally'}
                  className={cn(
                    "h-9",
                    bothSidebarsOpen && "px-2.5"
                  )}
                >
                  <Edit2 className="h-4 w-4" />
                  {!bothSidebarsOpen && <span className="ml-2">{inlineEditActive ? 'Cancel Edit' : 'Global Edit'}</span>}
                </Button>
                <Button
                  variant={linksEnabled ? 'default' : 'outline'}
                  size="sm"
                  onClick={toggleLinks}
                  title={linksEnabled ? `Links enabled (${mod}+L)` : `Links disabled (${mod}+L)`}
                  aria-label={linksEnabled ? 'Disable links' : 'Enable links'}
                  className="h-9 w-9 p-0"
                >
                  <Link className="h-4 w-4" />
                </Button>
                <Button
                  variant={isLinksOpen ? 'default' : 'ghost'}
                  size="icon"
                  onClick={() => setLinksOpen(!isLinksOpen)}
                  title="Toggle links sidebar"
                  aria-label="Toggle links sidebar"
                >
                  <Link2 className="h-4 w-4" />
                </Button>
                <Button
                  variant={isFlashcardSidebarOpen ? 'default' : 'ghost'}
                  size="icon"
                  onClick={() => setIsFlashcardSidebarOpen(!isFlashcardSidebarOpen)}
                  title="Toggle flashcards sidebar"
                  aria-label="Toggle flashcards sidebar"
                >
                  <Zap className="h-4 w-4" />
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
                  title={`Search in text (${mod}+F)`}
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
                    <DropdownMenuItem onClick={() => setIsTypewriterMode(true)}>
                      <CircleDot className="mr-2 h-4 w-4" />
                      Focus Mode
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setShowDeleteDialog(true)}>
                      <Trash2 className="mr-2 h-4 w-4 text-destructive" />
                      <span className="text-destructive">Delete</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            </div>
          </div>
        </header>

        {isOpen && <SearchBar />}

        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
          <div className="container mx-auto px-8 pt-6 pb-12 max-w-4xl">
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
                      // Detect what was edited
                      const editRegion = detectEditRegion(currentText.content, mergedContent);

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

                      // Save the updated content
                      await api.texts.updateContent(currentText.id, mergedContent)
                      await loadText(currentText.id)
                      await loadMarks(currentText.id)
                      await getReadRanges(currentText.id)

                      // Record in history
                      const historyStore = useReadingHistoryStore.getState();
                      if (!historyStore.isUndoRedoInProgress) {
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
                {isTypewriterMode ? (
                  <TypewriterReader
                    content={currentText.content}
                    textId={currentText.id}
                    onExit={() => setIsTypewriterMode(false)}
                    linksEnabled={false}
                  />
                ) : (
                  <>
                    <article className="reading-content mx-auto space-y-4" style={{ fontSize: `${fontSize}rem` }}>
                      <TextSelectionMenu
                        textId={currentText.id}
                      >
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
                        onEditInline={handleActivateInlineEdit}
                        onMarkAsRead={handleMarkSelectionRead}
                        position={selectionInfo.position}
                      />
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {isFlashcardSidebarOpen && (
        <FlashcardSidebar
          textId={currentText.id}
          onClose={() => setIsFlashcardSidebarOpen(false)}
        />
      )}

      <LinksSidebar onNavigateToIngest={handleNavigateToIngest} />

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
