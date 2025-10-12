export type KeyboardShortcut = {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  handler: (event: KeyboardEvent) => void;
};

export class KeyboardManager {
  private shortcuts: Map<string, KeyboardShortcut> = new Map();
  private isListening: boolean = false;

  register(id: string, shortcut: KeyboardShortcut): void {
    this.shortcuts.set(id, shortcut);
  }

  unregister(id: string): void {
    this.shortcuts.delete(id);
  }

  start(): void {
    if (this.isListening) return;

    window.addEventListener('keydown', this.handleKeyDown);
    this.isListening = true;
  }

  stop(): void {
    if (!this.isListening) return;

    window.removeEventListener('keydown', this.handleKeyDown);
    this.isListening = false;
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    for (const shortcut of this.shortcuts.values()) {
      if (this.matchesShortcut(event, shortcut)) {
        event.preventDefault();
        shortcut.handler(event);
        return;
      }
    }
  };

  private matchesShortcut(event: KeyboardEvent, shortcut: KeyboardShortcut): boolean {
    return (
      event.key === shortcut.key &&
      !!event.ctrlKey === !!shortcut.ctrl &&
      !!event.shiftKey === !!shortcut.shift &&
      !!event.altKey === !!shortcut.alt &&
      !!event.metaKey === !!shortcut.meta
    );
  }
}

export const keyboardManager = new KeyboardManager();
