import * as React from "react"
import { cn } from "../../utils"
import { ChevronDown } from "lucide-react"

interface SelectContextValue {
  value: string | undefined
  onValueChange: (value: string) => void
  open: boolean
  setOpen: (open: boolean) => void
}

const SelectContext = React.createContext<SelectContextValue | undefined>(undefined)

const useSelectContext = () => {
  const context = React.useContext(SelectContext)
  if (!context) {
    throw new Error('Select components must be used within Select')
  }
  return context
}

interface SelectProps {
  value: string | undefined
  onValueChange: (value: string) => void
  children: React.ReactNode
}

const Select: React.FC<SelectProps> = ({ value, onValueChange, children }) => {
  const [open, setOpen] = React.useState(false)

  return (
    <SelectContext.Provider value={{ value, onValueChange, open, setOpen }}>
      <div className="relative">
        {children}
      </div>
    </SelectContext.Provider>
  )
}

interface SelectTriggerProps {
  children: React.ReactNode
  className?: string
  placeholder?: string
}

const SelectTrigger: React.FC<SelectTriggerProps> = ({ children, className }) => {
  const { open, setOpen } = useSelectContext()

  return (
    <button
      type="button"
      className={cn(
        "flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      onClick={() => setOpen(!open)}
    >
      {children}
    </button>
  )
}

interface SelectValueProps {
  placeholder?: string
  children?: React.ReactNode
}

const SelectValue: React.FC<SelectValueProps> = ({ placeholder, children }) => {
  const { value } = useSelectContext()

  return (
    <span className="flex items-center gap-2">
      <span>{children || value || placeholder}</span>
      <ChevronDown className="h-4 w-4 opacity-50 ml-auto" />
    </span>
  )
}

interface SelectContentProps {
  children: React.ReactNode
  className?: string
}

const SelectContent: React.FC<SelectContentProps> = ({ children, className }) => {
  const { open, setOpen } = useSelectContext()
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
        "absolute z-50 min-w-[8rem] overflow-hidden rounded-md border bg-white dark:bg-gray-800 shadow-md mt-1 max-h-[300px] overflow-y-auto",
        className
      )}
    >
      {children}
    </div>
  )
}

interface SelectItemProps {
  value: string
  children: React.ReactNode
  className?: string
}

const SelectItem: React.FC<SelectItemProps> = ({ value, children, className }) => {
  const { value: selectedValue, onValueChange, setOpen } = useSelectContext()
  const isSelected = selectedValue === value

  const handleClick = () => {
    onValueChange(value)
    setOpen(false)
  }

  return (
    <div
      className={cn(
        "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-gray-100 dark:hover:bg-gray-700",
        isSelected && "bg-gray-100 dark:bg-gray-700 font-medium",
        className
      )}
      onClick={handleClick}
    >
      {children}
    </div>
  )
}

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem }
