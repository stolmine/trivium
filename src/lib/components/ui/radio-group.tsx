import * as React from "react"
import { cn } from "../../utils"

interface RadioGroupContextValue {
  value: string
  onValueChange: (value: string) => void
  disabled?: boolean
}

const RadioGroupContext = React.createContext<RadioGroupContextValue | undefined>(undefined)

const useRadioGroupContext = () => {
  const context = React.useContext(RadioGroupContext)
  if (!context) {
    throw new Error('RadioGroup components must be used within RadioGroup')
  }
  return context
}

interface RadioGroupProps {
  value: string
  onValueChange: (value: string) => void
  disabled?: boolean
  className?: string
  children: React.ReactNode
}

const RadioGroup: React.FC<RadioGroupProps> = ({
  value,
  onValueChange,
  disabled,
  className,
  children
}) => {
  return (
    <RadioGroupContext.Provider value={{ value, onValueChange, disabled }}>
      <div className={cn("grid gap-2", className)} role="radiogroup">
        {children}
      </div>
    </RadioGroupContext.Provider>
  )
}

interface RadioGroupItemProps {
  value: string
  id: string
  disabled?: boolean
  className?: string
}

const RadioGroupItem = React.forwardRef<HTMLButtonElement, RadioGroupItemProps>(
  ({ value, disabled, className }, ref) => {
    const { value: selectedValue, onValueChange, disabled: groupDisabled } = useRadioGroupContext()
    const isDisabled = disabled || groupDisabled
    const isChecked = selectedValue === value

    return (
      <button
        ref={ref}
        type="button"
        role="radio"
        aria-checked={isChecked}
        disabled={isDisabled}
        className={cn(
          "h-4 w-4 rounded-full border border-input transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          isChecked && "border-primary",
          className
        )}
        onClick={() => !isDisabled && onValueChange(value)}
      >
        {isChecked && (
          <span className="flex items-center justify-center">
            <span className="h-2 w-2 rounded-full bg-primary" />
          </span>
        )}
      </button>
    )
  }
)
RadioGroupItem.displayName = "RadioGroupItem"

export { RadioGroup, RadioGroupItem }
