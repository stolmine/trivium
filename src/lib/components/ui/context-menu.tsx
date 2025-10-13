import * as React from "react"
import { cn } from "../../utils"

interface ContextMenuContextValue {
  open: boolean
  setOpen: (open: boolean) => void
  position: { x: number; y: number }
  setPosition: (position: { x: number; y: number }) => void
}

const ContextMenuContext = React.createContext<ContextMenuContextValue | undefined>(undefined)

const useContextMenuContext = () => {
  const context = React.useContext(ContextMenuContext)
  if (!context) {
    throw new Error('Context menu components must be used within ContextMenu')
  }
  return context
}

interface ContextMenuProps {
  children: React.ReactNode
}

const ContextMenu: React.FC<ContextMenuProps> = ({ children }) => {
  const [open, setOpen] = React.useState(false)
  const [position, setPosition] = React.useState({ x: 0, y: 0 })

  return (
    <ContextMenuContext.Provider value={{ open, setOpen, position, setPosition }}>
      {children}
    </ContextMenuContext.Provider>
  )
}

interface ContextMenuTriggerProps {
  children: React.ReactNode
  asChild?: boolean
}

const ContextMenuTrigger: React.FC<ContextMenuTriggerProps> = ({ children, asChild }) => {
  const { setOpen, setPosition } = useContextMenuContext()

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    setPosition({ x: e.clientX, y: e.clientY })
    setOpen(true)
  }

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      onContextMenu: handleContextMenu
    } as any)
  }

  return (
    <div onContextMenu={handleContextMenu}>
      {children}
    </div>
  )
}

interface ContextMenuContentProps {
  children: React.ReactNode
  className?: string
}

const ContextMenuContent: React.FC<ContextMenuContentProps> = ({ children, className }) => {
  const { open, setOpen, position } = useContextMenuContext()
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open, setOpen])

  if (!open) return null

  return (
    <div
      ref={ref}
      className={cn(
        "fixed z-50 min-w-[8rem] overflow-hidden rounded-md border bg-white dark:bg-gray-800 p-1 text-gray-900 dark:text-gray-100 shadow-md",
        className
      )}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`
      }}
    >
      {children}
    </div>
  )
}

interface ContextMenuItemProps {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  className?: string
}

const ContextMenuItem: React.FC<ContextMenuItemProps> = ({
  children,
  onClick,
  disabled,
  className
}) => {
  const { setOpen } = useContextMenuContext()

  const handleClick = () => {
    if (!disabled && onClick) {
      onClick()
      setOpen(false)
    }
  }

  return (
    <div
      className={cn(
        "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors",
        !disabled && "hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      onClick={handleClick}
    >
      {children}
    </div>
  )
}

const ContextMenuSeparator: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={cn("my-1 h-px bg-gray-200 dark:bg-gray-700", className)} />
  )
}

const ContextMenuShortcut: React.FC<{
  children: React.ReactNode
  className?: string
}> = ({ children, className }) => {
  return (
    <span className={cn("ml-auto text-xs text-gray-500 dark:text-gray-400", className)}>
      {children}
    </span>
  )
}

const ContextMenuGroup = ({ children }: { children: React.ReactNode }) => <>{children}</>
const ContextMenuPortal = ({ children }: { children: React.ReactNode }) => <>{children}</>
const ContextMenuSub = ({ children }: { children: React.ReactNode }) => <>{children}</>
const ContextMenuSubContent = ({ children }: { children: React.ReactNode }) => <>{children}</>
const ContextMenuSubTrigger = ({ children }: { children: React.ReactNode }) => <>{children}</>
const ContextMenuRadioGroup = ({ children }: { children: React.ReactNode }) => <>{children}</>
const ContextMenuCheckboxItem = ({ children }: { children: React.ReactNode }) => <>{children}</>
const ContextMenuRadioItem = ({ children }: { children: React.ReactNode }) => <>{children}</>
const ContextMenuLabel = ({ children }: { children: React.ReactNode }) => <>{children}</>

export {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuCheckboxItem,
  ContextMenuRadioItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuGroup,
  ContextMenuPortal,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuRadioGroup,
}
