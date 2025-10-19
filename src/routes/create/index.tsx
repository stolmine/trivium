import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/lib/components/ui/button';
import { X, BookOpen, AlertTriangle } from 'lucide-react';
import { ScopeSelector } from '@/lib/components/create/ScopeSelector';
import { MarkDisplay } from '@/lib/components/create/MarkDisplay';
import { CardCreator } from '@/lib/components/create/CardCreator';
import { CreatedCardsList } from '@/lib/components/create/CreatedCardsList';
import { useCardCreationStore } from '@/lib/stores/cardCreation';
import { BackToReadingButton } from '@/lib/components/shared/BackToReadingButton';
import { getModifierKey } from '@/lib/utils/platform';

export function CreateCardsPage() {
  const navigate = useNavigate();
  const [showHelp, setShowHelp] = useState(false);
  const mod = getModifierKey();

  const marks = useCardCreationStore((state) => state.marks);
  const currentMarkIndex = useCardCreationStore((state) => state.currentMarkIndex);
  const createdCards = useCardCreationStore((state) => state.createdCards);
  const buriedMarkIds = useCardCreationStore((state) => state.buriedMarkIds);
  const isLoading = useCardCreationStore((state) => state.isLoading);
  const error = useCardCreationStore((state) => state.error);
  const loadMarks = useCardCreationStore((state) => state.loadMarks);
  const createCard = useCardCreationStore((state) => state.createCard);
  const nextMark = useCardCreationStore((state) => state.nextMark);
  const prevMark = useCardCreationStore((state) => state.prevMark);
  const buryMark = useCardCreationStore((state) => state.buryMark);
  const deleteCard = useCardCreationStore((state) => state.deleteCard);
  const reset = useCardCreationStore((state) => state.reset);

  const currentMark = marks[currentMarkIndex];

  // Load initial marks on mount
  useEffect(() => {
    loadMarks();

    // Cleanup on unmount
    return () => {
      reset();
    };
  }, []);

  // Keyboard shortcuts for help
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ?: Show help
      if (e.key === '?') {
        e.preventDefault();
        setShowHelp(true);
      }

      // Escape or Enter: Close help
      if ((e.key === 'Escape' || e.key === 'Enter') && showHelp) {
        e.preventDefault();
        setShowHelp(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showHelp]);

  // Handlers for card creation
  const handleCreateCard = async (selectedText: string, clozeText: string) => {
    try {
      await createCard(selectedText, clozeText);
    } catch (error) {
      console.error('Failed to create card:', error);
    }
  };

  const handleBuryMark = async () => {
    try {
      await buryMark();
    } catch (error) {
      console.error('Failed to bury mark:', error);
    }
  };

  const handleDeleteCard = async (cardId: number) => {
    try {
      deleteCard(cardId);
    } catch (error) {
      console.error('Failed to delete card:', error);
      throw error;
    }
  };

  const handleEditCard = (card: any) => {
    console.log('Edit card:', card);
  };

  // Empty state: no marks
  if (marks.length === 0 && !isLoading && !error) {
    return (
      <div className="flex flex-col h-full overflow-hidden bg-background">
        <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10">
          <div className="container max-w-6xl mx-auto px-8 h-14 flex items-center gap-3">
            <h1 className="text-3xl font-bold text-foreground">Create Flashcards</h1>
            <BackToReadingButton />
          </div>
        </header>
        <div className="flex-1 overflow-y-auto bg-background">
          <div className="container max-w-6xl mx-auto px-8 pb-8 pt-6">
            {/* Scope Selector */}
            <ScopeSelector />

            {/* Empty state message */}
            <div className="flex flex-col items-center justify-center py-16 space-y-6">
              <BookOpen className="h-16 w-16 text-muted-foreground" />
              <div className="text-center space-y-2">
                <h2 className="text-xl font-semibold">No marks need cards yet!</h2>
                <p className="text-muted-foreground max-w-md">
                  All your marked text already has flashcards, or no text is marked.
                </p>
              </div>
              <div className="flex gap-4">
                <Button onClick={() => navigate('/')}>
                  Back to Dashboard
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col h-full overflow-hidden bg-background">
        <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10">
          <div className="container max-w-6xl mx-auto px-8 h-14 flex items-center gap-3">
            <h1 className="text-3xl font-bold text-foreground">Create Flashcards</h1>
            <BackToReadingButton />
          </div>
        </header>
        <div className="flex-1 overflow-y-auto bg-background">
          <div className="container max-w-6xl mx-auto px-8 pb-8 pt-6">
            <div className="flex flex-col items-center justify-center py-16 space-y-6">
              <AlertTriangle className="h-16 w-16 text-destructive" />
              <div className="text-center space-y-2">
                <h2 className="text-xl font-semibold">Failed to load marks</h2>
                <p className="text-muted-foreground max-w-md">
                  Unable to fetch marked text from database.
                </p>
                <p className="text-sm text-destructive">{error}</p>
              </div>
              <div className="flex gap-4">
                <Button onClick={() => window.location.reload()}>
                  Retry
                </Button>
                <Button variant="outline" onClick={() => navigate('/')}>
                  Go to Dashboard
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col h-full overflow-hidden bg-background">
        <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10">
          <div className="container max-w-6xl mx-auto px-8 h-14 flex items-center gap-3">
            <h1 className="text-3xl font-bold text-foreground">Create Flashcards</h1>
            <BackToReadingButton />
          </div>
        </header>
        <div className="flex-1 overflow-y-auto bg-background">
          <div className="container max-w-6xl mx-auto px-8 pb-8 pt-6">
            <div className="space-y-6">
              {/* Scope selector skeleton */}
              <div className="p-6 border rounded-lg animate-pulse">
                <div className="h-4 bg-muted rounded w-32 mb-4"></div>
                <div className="h-10 bg-muted rounded"></div>
              </div>

              {/* Mark navigation skeleton */}
              <div className="p-6 border rounded-lg animate-pulse">
                <div className="h-6 bg-muted rounded w-48 mb-4"></div>
                <div className="flex gap-4">
                  <div className="h-10 bg-muted rounded flex-1"></div>
                  <div className="h-10 bg-muted rounded flex-1"></div>
                </div>
              </div>

              {/* Context skeleton */}
              <div className="p-6 border rounded-lg bg-muted/30 animate-pulse">
                <div className="space-y-3">
                  <div className="h-4 bg-muted rounded"></div>
                  <div className="h-4 bg-muted rounded"></div>
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                </div>
              </div>

              {/* Card creator skeleton */}
              <div className="p-6 border rounded-lg animate-pulse">
                <div className="space-y-4">
                  <div className="h-24 bg-muted rounded"></div>
                  <div className="h-24 bg-muted rounded"></div>
                  <div className="h-10 bg-muted rounded w-32"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main content with marks
  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10">
        <div className="container max-w-6xl mx-auto px-8 h-14 flex items-center gap-3">
          <h1 className="text-3xl font-bold text-foreground">Create Flashcards</h1>
          <BackToReadingButton />
        </div>
      </header>
      <div className="flex-1 overflow-y-auto bg-background">
        <div className="container max-w-6xl mx-auto px-8 pb-8 pt-6">
          <div className="space-y-6">
            {/* Scope Selector */}
            <ScopeSelector />

            {/* Mark Display (integrated navigation + context) */}
            {currentMark && (
              <MarkDisplay
                mark={currentMark}
                currentIndex={currentMarkIndex}
                totalMarks={marks.length}
                isBuried={buriedMarkIds.has(currentMark.id)}
                onBury={handleBuryMark}
                onPrevious={prevMark}
                onNext={nextMark}
              />
            )}

            {/* Card Creator */}
            {currentMark && (
              <div className="p-6 border border-border rounded-lg bg-card">
                <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground mb-4">
                  Create Flashcard
                </h2>
                <CardCreator
                  mark={{
                    id: currentMark.id,
                    textId: currentMark.textId,
                    markedText: currentMark.markedText,
                  }}
                  onCreateCard={handleCreateCard}
                />
              </div>
            )}
          </div>

          {/* Created Cards List */}
          <CreatedCardsList
            cards={createdCards}
            onEdit={handleEditCard}
            onDelete={handleDeleteCard}
          />
        </div>
      </div>

      {/* Keyboard Shortcuts Help Modal */}
      {showHelp && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowHelp(false)}
        >
          <div
            className="bg-card border border-border rounded-lg shadow-lg max-w-2xl w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-foreground">Keyboard Shortcuts</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHelp(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="font-medium mb-3 text-sm uppercase tracking-wide text-muted-foreground">
                  Navigation
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm">Next mark</span>
                    <div className="flex gap-2">
                      <kbd className="px-2 py-1 text-xs font-mono bg-muted rounded">→</kbd>
                      <span className="text-muted-foreground text-xs">or</span>
                      <kbd className="px-2 py-1 text-xs font-mono bg-muted rounded">{mod}+J</kbd>
                    </div>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm">Previous mark</span>
                    <div className="flex gap-2">
                      <kbd className="px-2 py-1 text-xs font-mono bg-muted rounded">←</kbd>
                      <span className="text-muted-foreground text-xs">or</span>
                      <kbd className="px-2 py-1 text-xs font-mono bg-muted rounded">{mod}+K</kbd>
                    </div>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm">Bury mark (permanent, 0-card)</span>
                    <kbd className="px-2 py-1 text-xs font-mono bg-muted rounded">Shift+B</kbd>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-3 text-sm uppercase tracking-wide text-muted-foreground">
                  Scope Selection
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm">Library scope</span>
                    <kbd className="px-2 py-1 text-xs font-mono bg-muted rounded">Alt+1</kbd>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm">Folder scope</span>
                    <kbd className="px-2 py-1 text-xs font-mono bg-muted rounded">Alt+2</kbd>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm">Text scope</span>
                    <kbd className="px-2 py-1 text-xs font-mono bg-muted rounded">Alt+3</kbd>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-3 text-sm uppercase tracking-wide text-muted-foreground">
                  Card Creation
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm">Wrap selection in cloze</span>
                    <kbd className="px-2 py-1 text-xs font-mono bg-muted rounded">{mod}+Shift+C</kbd>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm">Create/Update card</span>
                    <kbd className="px-2 py-1 text-xs font-mono bg-muted rounded">Shift+Enter</kbd>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm">Undo</span>
                    <kbd className="px-2 py-1 text-xs font-mono bg-muted rounded">{mod}+Z</kbd>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm">Redo</span>
                    <div className="flex gap-2">
                      <kbd className="px-2 py-1 text-xs font-mono bg-muted rounded">{mod}+Shift+Z</kbd>
                      <span className="text-muted-foreground text-xs">or</span>
                      <kbd className="px-2 py-1 text-xs font-mono bg-muted rounded">{mod}+Y</kbd>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-3 text-sm uppercase tracking-wide text-muted-foreground">
                  Global
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm">Open Flashcard Hub</span>
                    <kbd className="px-2 py-1 text-xs font-mono bg-muted rounded">{mod}+3</kbd>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm">Show this help</span>
                    <kbd className="px-2 py-1 text-xs font-mono bg-muted rounded">?</kbd>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t">
              <Button onClick={() => setShowHelp(false)} className="w-full">
                Close (Esc or Enter)
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
