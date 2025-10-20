import { memo, useState } from 'react'
import { Download, ExternalLink, Copy, Check } from 'lucide-react'
import { openUrl } from '@tauri-apps/plugin-opener'
import { ParsedLink } from '@/lib/stores/linksSidebar'
import { Button } from '../ui'

interface LinkItemProps {
  link: ParsedLink
  onIngest: (url: string) => void
}

export const LinkItem = memo(function LinkItem({ link, onIngest }: LinkItemProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link.baseUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy URL:', error)
    }
  }

  const handleOpen = () => {
    openUrl(link.baseUrl).catch((error: Error) => {
      console.error('Failed to open URL:', error)
    })
  }

  const truncateUrl = (url: string, maxLength: number = 50) => {
    if (url.length <= maxLength) return url
    return url.slice(0, maxLength) + '...'
  }

  return (
    <div className="bg-card border border-border rounded-lg p-3 space-y-2 shadow-sm hover:shadow-md transition-shadow">
      <h3 className="font-medium text-sm text-card-foreground line-clamp-2">
        {link.displayText}
      </h3>

      <p className="text-xs text-muted-foreground truncate" title={link.baseUrl}>
        {truncateUrl(link.baseUrl)}
      </p>

      {link.frequency > 1 && (
        <p className="text-xs text-muted-foreground">
          Appears {link.frequency} times
          {link.anchors.length > 0 && ` • ${link.anchors.length} sections`}
        </p>
      )}

      <div className="flex gap-2">
        <Button
          onClick={() => onIngest(link.baseUrl)}
          variant="default"
          size="sm"
          className="flex-1 h-8 text-xs"
          title="Open in ingest page"
        >
          <Download className="w-3.5 h-3.5 mr-1" />
          <span>Ingest</span>
        </Button>

        <Button
          onClick={handleOpen}
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0"
          title="Open in browser"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </Button>

        <Button
          onClick={handleCopy}
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0"
          title={copied ? 'Copied!' : 'Copy URL'}
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
        </Button>
      </div>
    </div>
  )
})
