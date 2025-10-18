import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../ui';
import { useNavigationHistory } from '../../stores/navigationHistory';
import { getModifierSymbol } from '../../utils/platform';

export function NavigationButtons() {
  const navigate = useNavigate();
  const location = useLocation();
  const { goBack, goForward, canGoBack, canGoForward } = useNavigationHistory();

  const handleBack = () => {
    if (location.pathname.startsWith('/ingest')) {
      return;
    }

    const entry = goBack();
    if (entry) {
      // Add __fromHistory flag to prevent NavigationTracker from pushing duplicate entry
      navigate(entry.pathname, {
        state: { ...entry.state, __fromHistory: true },
        replace: true
      });
    }
  };

  const handleForward = () => {
    if (location.pathname.startsWith('/ingest')) {
      return;
    }

    const entry = goForward();
    if (entry) {
      // Add __fromHistory flag to prevent NavigationTracker from pushing duplicate entry
      navigate(entry.pathname, {
        state: { ...entry.state, __fromHistory: true },
        replace: true
      });
    }
  };

  const modifierKey = getModifierSymbol();

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={handleBack}
        disabled={!canGoBack || location.pathname.startsWith('/ingest')}
        title={`Go back (${modifierKey}+[)`}
        aria-label="Navigate back"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={handleForward}
        disabled={!canGoForward || location.pathname.startsWith('/ingest')}
        title={`Go forward (${modifierKey}+])`}
        aria-label="Navigate forward"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
