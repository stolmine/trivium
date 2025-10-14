import { useState, useCallback, useRef, useEffect } from 'react'

interface HistoryState {
  content: string
  cursorPosition: number
}

interface UseTextHistoryOptions {
  initialValue?: string
  maxHistorySize?: number
  debounceMs?: number
}

export function useTextHistory(options: UseTextHistoryOptions = {}) {
  const {
    initialValue = '',
    maxHistorySize = 100,
    debounceMs = 500,
  } = options

  const [content, setContent] = useState(initialValue)
  const [history, setHistory] = useState<HistoryState[]>([
    { content: initialValue, cursorPosition: 0 },
  ])
  const [historyIndex, setHistoryIndex] = useState(0)
  const isUndoRedoRef = useRef(false)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastSavedContentRef = useRef(initialValue)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const saveToHistory = useCallback(
    (newContent: string, cursorPosition: number) => {
      if (isUndoRedoRef.current) return

      setHistory((prev) => {
        const truncatedHistory = prev.slice(0, historyIndex + 1)

        const lastEntry = truncatedHistory[truncatedHistory.length - 1]
        if (lastEntry && lastEntry.content === newContent) {
          return prev
        }

        const newHistory = [
          ...truncatedHistory,
          { content: newContent, cursorPosition },
        ]

        if (newHistory.length > maxHistorySize) {
          return newHistory.slice(newHistory.length - maxHistorySize)
        }

        return newHistory
      })

      setHistoryIndex((prev) => {
        const newIndex = prev + 1
        return newIndex >= maxHistorySize ? maxHistorySize - 1 : newIndex
      })

      lastSavedContentRef.current = newContent
    },
    [historyIndex, maxHistorySize]
  )

  const handleContentChange = useCallback(
    (newContent: string) => {
      setContent(newContent)

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }

      debounceTimerRef.current = setTimeout(() => {
        const cursorPosition = textareaRef.current?.selectionStart ?? 0
        saveToHistory(newContent, cursorPosition)
      }, debounceMs)
    },
    [saveToHistory, debounceMs]
  )

  const handleContentChangeImmediate = useCallback(
    (newContent: string) => {
      setContent(newContent)

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = null
      }

      const cursorPosition = textareaRef.current?.selectionStart ?? 0
      saveToHistory(newContent, cursorPosition)
    },
    [saveToHistory]
  )

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = null
      }

      const currentContent = content
      const currentCursor = textareaRef.current?.selectionStart ?? 0

      if (currentContent !== lastSavedContentRef.current) {
        saveToHistory(currentContent, currentCursor)
        return
      }

      isUndoRedoRef.current = true
      const newIndex = historyIndex - 1
      const state = history[newIndex]

      setHistoryIndex(newIndex)
      setContent(state.content)

      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.setSelectionRange(
            state.cursorPosition,
            state.cursorPosition
          )
          textareaRef.current.focus()
        }
        isUndoRedoRef.current = false
      }, 0)
    }
  }, [historyIndex, history, content, saveToHistory])

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = null
      }

      isUndoRedoRef.current = true
      const newIndex = historyIndex + 1
      const state = history[newIndex]

      setHistoryIndex(newIndex)
      setContent(state.content)

      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.setSelectionRange(
            state.cursorPosition,
            state.cursorPosition
          )
          textareaRef.current.focus()
        }
        isUndoRedoRef.current = false
      }, 0)
    }
  }, [historyIndex, history])

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  return {
    content,
    setContent: handleContentChange,
    setContentImmediate: handleContentChangeImmediate,
    textareaRef,
    undo,
    redo,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
  }
}
