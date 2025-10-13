import { cn } from '../../utils'

interface FlashcardPreviewProps {
  html: string
  className?: string
}

export function FlashcardPreview({ html, className }: FlashcardPreviewProps) {
  return (
    <div
      className={cn(
        'rounded-md border border-input bg-background p-4',
        'prose prose-sm max-w-none',
        '[&_.cloze-hidden]:bg-primary [&_.cloze-hidden]:text-primary [&_.cloze-hidden]:px-2 [&_.cloze-hidden]:py-0.5 [&_.cloze-hidden]:rounded',
        '[&_.cloze-visible]:bg-secondary [&_.cloze-visible]:text-secondary-foreground [&_.cloze-visible]:px-2 [&_.cloze-visible]:py-0.5 [&_.cloze-visible]:rounded',
        className
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
