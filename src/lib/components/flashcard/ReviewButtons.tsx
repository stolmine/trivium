import type { ReviewQuality } from '../../types';

interface ReviewButtonsProps {
  onRate: (quality: ReviewQuality) => void;
  disabled?: boolean;
}

export function ReviewButtons({ onRate: _onRate, disabled: _disabled }: ReviewButtonsProps) {
  // TODO: Implement review quality buttons
  // Features:
  // - 6 quality levels (0-5) based on SM-2
  // - Keyboard shortcuts (1-6 keys)
  // - Visual feedback on hover/click
  // - Display next review interval preview

  return null;
}
