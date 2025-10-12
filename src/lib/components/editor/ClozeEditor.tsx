import type { ClozeData } from '../../types';

interface ClozeEditorProps {
  selectedText: string;
  context: string;
  onSave: (cloze: ClozeData) => void;
  onCancel: () => void;
}

export function ClozeEditor({ selectedText, context, onSave, onCancel }: ClozeEditorProps) {
  // TODO: Implement cloze deletion editor
  // Features:
  // - Preview of cloze deletion
  // - Edit context window size
  // - Adjust cloze word selection
  // - Save/Cancel actions
  // - Keyboard shortcuts (Enter to save, Esc to cancel)

  return null;
}
