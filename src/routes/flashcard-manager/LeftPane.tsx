import { FlashcardTable } from '../../components/flashcard-manager/FlashcardTable';

interface LeftPaneProps {
  width: number;
}

export function LeftPane({ width }: LeftPaneProps) {
  return (
    <div
      className="h-full flex flex-col border-r bg-background"
      style={{ width: `${width}%` }}
    >
      <FlashcardTable />
    </div>
  );
}
