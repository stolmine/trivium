import { useNavigate, useLocation } from 'react-router-dom';
import { BookOpen, ArrowRight } from 'lucide-react';
import { Button } from '../ui/button';
import { useLastReadStore } from '../../stores/lastRead';
import type { ReadPageLocationState } from '../../types';
import { getModifierKey } from '../../utils/platform';

export function BackToReadingButton() {
  const navigate = useNavigate();
  const location = useLocation();
  const { textId, textTitle, scrollPosition, progress, hasLastRead } = useLastReadStore();
  const mod = getModifierKey();

  const shouldShow = hasLastRead() && !location.pathname.match(/^\/read(\/|$)/) && !location.pathname.match(/^\/review\/session(\/|$)/);

  if (!shouldShow || !textId || !textTitle) {
    return null;
  }

  const handleClick = () => {
    const state: ReadPageLocationState = {
      restoreScrollPosition: scrollPosition,
      __fromHistory: true
    };
    navigate(`/read/${textId}`, { state });
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      title={`Back to "${textTitle}" (${progress.toFixed(0)}% complete) - ${mod}+Shift+R`}
      className="gap-1 px-2"
    >
      <ArrowRight className="h-3.5 w-3.5" />
      <BookOpen className="h-4 w-4" />
    </Button>
  );
}
