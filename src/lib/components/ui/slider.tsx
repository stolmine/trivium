import * as React from "react"
import { cn } from "../../utils"

interface SliderProps {
  value: number[]
  onValueChange: (value: number[]) => void
  min?: number
  max?: number
  step?: number
  disabled?: boolean
  className?: string
}

const Slider: React.FC<SliderProps> = ({
  value,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  disabled,
  className
}) => {
  const trackRef = React.useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = React.useState(false)

  const currentValue = value[0] ?? min

  const percentage = ((currentValue - min) / (max - min)) * 100

  const updateValue = React.useCallback((clientX: number) => {
    if (!trackRef.current || disabled) return

    const rect = trackRef.current.getBoundingClientRect()
    const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    const rawValue = min + percent * (max - min)
    const steppedValue = Math.round(rawValue / step) * step
    const clampedValue = Math.max(min, Math.min(max, steppedValue))

    onValueChange([clampedValue])
  }, [min, max, step, onValueChange, disabled])

  const handleMouseDown = (e: React.MouseEvent) => {
    if (disabled) return
    setIsDragging(true)
    updateValue(e.clientX)
  }

  React.useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      updateValue(e.clientX)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, updateValue])

  return (
    <div
      ref={trackRef}
      className={cn(
        "relative flex w-full touch-none select-none items-center",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      onMouseDown={handleMouseDown}
    >
      <div className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-secondary">
        <div
          className="absolute h-full bg-primary transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div
        className="absolute h-4 w-4 rounded-full border-2 border-primary bg-background shadow transition-all disabled:pointer-events-none disabled:opacity-50"
        style={{ left: `calc(${percentage}% - 0.5rem)` }}
      />
    </div>
  )
}

export { Slider }
