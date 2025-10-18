import { create } from 'zustand';
import type { ClozeNote } from '../types/flashcard';
import type { ReadRange } from '../types/reading';
import { api } from '../utils/tauri';

interface HistoryAction {
  id: string;
  timestamp: number;
  type: 'text_edit' | 'mark' | 'unmark';
}

interface TextEditAction extends HistoryAction {
  type: 'text_edit';
  editRegion: {
    start: number;
    end: number;
  };
  previousContent: string;
  newContent: string;
  editedText: string;
  originalText: string;
  marksBeforeEdit: ClozeNote[];
  marksAfterEdit: ClozeNote[];
  deletedMarks?: ClozeNote[];
  cursorPosition?: number;
}

interface MarkAction extends HistoryAction {
  type: 'mark';
  range: {
    start: number;
    end: number;
  };
  rangeId?: number;
  contentSnapshot: string;
  markedText: string;
}

interface UnmarkAction extends HistoryAction {
  type: 'unmark';
  range: {
    start: number;
    end: number;
  };
  previousReadRanges: ReadRange[];
  contentSnapshot: string;
  unmarkedText: string;
}

type Action = TextEditAction | MarkAction | UnmarkAction;

interface HistoryState {
  past: Action[];
  future: Action[];
  maxHistorySize: number;
  currentTextId: number | null;
  isUndoRedoInProgress: boolean;
  isOnReadingPage: boolean;
}

interface ReadingHistoryStore extends HistoryState {
  recordTextEdit: (action: Omit<TextEditAction, 'id' | 'timestamp' | 'type'>) => void;
  recordMark: (action: Omit<MarkAction, 'id' | 'timestamp' | 'type'>) => void;
  recordUnmark: (action: Omit<UnmarkAction, 'id' | 'timestamp' | 'type'>) => void;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clearHistory: () => void;
  resetForText: (textId: number) => void;
  setOnReadingPage: (isOnPage: boolean) => void;
  _applyAction: (action: Action) => Promise<void>;
  _revertAction: (action: Action) => Promise<void>;
}

function generateActionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export const useReadingHistoryStore = create<ReadingHistoryStore>((set, get) => ({
  past: [],
  future: [],
  maxHistorySize: 50,
  currentTextId: null,
  isUndoRedoInProgress: false,
  isOnReadingPage: false,

  recordTextEdit: (action) => {
    const state = get();

    if (state.isUndoRedoInProgress) {
      return;
    }

    const fullAction: TextEditAction = {
      ...action,
      type: 'text_edit',
      id: generateActionId(),
      timestamp: Date.now()
    };

    console.log('[History] Recording text edit:', {
      editRegion: fullAction.editRegion,
      originalLength: fullAction.originalText.length,
      newLength: fullAction.editedText.length
    });

    let newPast = [...state.past, fullAction];

    if (newPast.length > state.maxHistorySize) {
      newPast = newPast.slice(newPast.length - state.maxHistorySize);
    }

    set({
      past: newPast,
      future: []
    });
  },

  recordMark: (action) => {
    const state = get();

    if (state.isUndoRedoInProgress) {
      return;
    }

    const fullAction: MarkAction = {
      ...action,
      type: 'mark',
      id: generateActionId(),
      timestamp: Date.now()
    };

    console.log('[History] Recording mark:', {
      range: fullAction.range,
      markedText: fullAction.markedText.substring(0, 50)
    });

    let newPast = [...state.past, fullAction];

    if (newPast.length > state.maxHistorySize) {
      newPast = newPast.slice(newPast.length - state.maxHistorySize);
    }

    set({
      past: newPast,
      future: []
    });
  },

  recordUnmark: (action) => {
    const state = get();

    if (state.isUndoRedoInProgress) {
      return;
    }

    const fullAction: UnmarkAction = {
      ...action,
      type: 'unmark',
      id: generateActionId(),
      timestamp: Date.now()
    };

    console.log('[History] Recording unmark:', {
      range: fullAction.range,
      unmarkedText: fullAction.unmarkedText.substring(0, 50)
    });

    let newPast = [...state.past, fullAction];

    if (newPast.length > state.maxHistorySize) {
      newPast = newPast.slice(newPast.length - state.maxHistorySize);
    }

    set({
      past: newPast,
      future: []
    });
  },

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,

  clearHistory: () => {
    console.log('[History] Clearing history');
    set({ past: [], future: [] });
  },

  resetForText: (textId) => {
    console.log('[History] Resetting for text:', textId);
    set({
      past: [],
      future: [],
      currentTextId: textId
    });
  },

  setOnReadingPage: (isOnPage) => {
    console.log('[History] Setting isOnReadingPage:', isOnPage);
    set({ isOnReadingPage: isOnPage });
  },

  _revertAction: async (action: Action) => {
    const state = get();

    if (!state.currentTextId) {
      throw new Error('No current text ID set');
    }

    console.log('[History] Reverting action:', action.type, action.id);

    switch (action.type) {
      case 'text_edit': {
        console.log('[History] Restoring previous content');
        await api.texts.updateContent(state.currentTextId, action.previousContent);

        if (action.deletedMarks && action.deletedMarks.length > 0) {
          console.log('[History] Restoring deleted marks:', action.deletedMarks.length);
          for (const mark of action.deletedMarks) {
            await api.flashcards.createMark(
              mark.textId,
              mark.originalText,
              mark.startPosition,
              mark.endPosition
            );
          }
        }
        break;
      }

      case 'mark': {
        console.log('[History] Unmarking range:', action.range);
        await api.reading.unmarkRangeAsRead(
          state.currentTextId,
          action.range.start,
          action.range.end
        );
        break;
      }

      case 'unmark': {
        console.log('[History] Re-marking range:', action.range);
        await api.reading.markRangeAsRead(
          state.currentTextId,
          action.range.start,
          action.range.end
        );
        break;
      }

      default:
        throw new Error(`Unknown action type: ${(action as Action).type}`);
    }
  },

  undo: async () => {
    const state = get();

    if (!state.isOnReadingPage) {
      console.warn('[History] Undo blocked - not on reading page');
      return;
    }

    if (state.past.length === 0) {
      console.warn('[History] No actions to undo');
      return;
    }

    if (state.isUndoRedoInProgress) {
      console.warn('[History] Undo already in progress');
      return;
    }

    const action = state.past[state.past.length - 1];
    console.log('[History] Undoing action:', action.type, action.id);

    set({ isUndoRedoInProgress: true });

    try {
      await get()._revertAction(action);

      set({
        past: state.past.slice(0, -1),
        future: [...state.future, action],
        isUndoRedoInProgress: false
      });

      console.log('[History] Undo successful');
    } catch (error) {
      console.error('[History] Undo failed:', error);
      set({ isUndoRedoInProgress: false });
      throw new Error(
        'Failed to undo: ' + (error instanceof Error ? error.message : 'Unknown error')
      );
    }
  },

  _applyAction: async (action: Action) => {
    const state = get();

    if (!state.currentTextId) {
      throw new Error('No current text ID set');
    }

    console.log('[History] Applying action:', action.type, action.id);

    switch (action.type) {
      case 'text_edit': {
        console.log('[History] Applying new content');
        await api.texts.updateContent(state.currentTextId, action.newContent);

        if (action.deletedMarks && action.deletedMarks.length > 0) {
          console.log('[History] Re-deleting marks:', action.deletedMarks.length);
          const markIds = action.deletedMarks.map(m => m.id);
          await api.flashcards.deleteMarks(markIds);
        }
        break;
      }

      case 'mark': {
        console.log('[History] Marking range:', action.range);
        await api.reading.markRangeAsRead(
          state.currentTextId,
          action.range.start,
          action.range.end
        );
        break;
      }

      case 'unmark': {
        console.log('[History] Unmarking range:', action.range);
        await api.reading.unmarkRangeAsRead(
          state.currentTextId,
          action.range.start,
          action.range.end
        );
        break;
      }

      default:
        throw new Error(`Unknown action type: ${(action as Action).type}`);
    }
  },

  redo: async () => {
    const state = get();

    if (!state.isOnReadingPage) {
      console.warn('[History] Redo blocked - not on reading page');
      return;
    }

    if (state.future.length === 0) {
      console.warn('[History] No actions to redo');
      return;
    }

    if (state.isUndoRedoInProgress) {
      console.warn('[History] Redo already in progress');
      return;
    }

    const action = state.future[state.future.length - 1];
    console.log('[History] Redoing action:', action.type, action.id);

    set({ isUndoRedoInProgress: true });

    try {
      await get()._applyAction(action);

      set({
        past: [...state.past, action],
        future: state.future.slice(0, -1),
        isUndoRedoInProgress: false
      });

      console.log('[History] Redo successful');
    } catch (error) {
      console.error('[History] Redo failed:', error);
      set({ isUndoRedoInProgress: false });
      throw new Error(
        'Failed to redo: ' + (error instanceof Error ? error.message : 'Unknown error')
      );
    }
  }
}));
