import { cn, formatDueDate } from '../../utils'
import type { MarkWithContext } from '../../types'

interface MarkContextProps {
  mark: MarkWithContext
  className?: string
}

export function MarkContext({ mark, className }: MarkContextProps) {
  const contextBefore = mark.beforeContext.slice(-200)
  const contextAfter = mark.afterContext.slice(0, 200)

  const markedDate = formatDueDate(mark.createdAt)

  return (
    <div
      className={cn(
        'bg-card shadow-card rounded-lg p-6',
        'border border-border',
        className
      )}
    >
      <div className="mb-4 flex items-center justify-between text-sm text-muted-foreground">
        <span>From: "{mark.textTitle}"</span>
        <span>Created: {markedDate}</span>
      </div>

      <div className="font-serif text-lg leading-relaxed">
        {contextBefore && (
          <span className="text-muted-foreground">
            ...{contextBefore}{' '}
          </span>
        )}

        <span
          className={cn(
            'border-l-4 border-primary bg-primary/5 pl-4 py-2',
            'inline-block my-1'
          )}
        >
          {mark.markedText}
        </span>

        {contextAfter && (
          <span className="text-muted-foreground">
            {' '}{contextAfter}...
          </span>
        )}
      </div>
    </div>
  )
}
