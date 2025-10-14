export function getDaysUntilDue(dueDate: string): number {
  const now = new Date()
  const due = new Date(dueDate)

  // Use actual timestamps for precise comparison
  const diffMs = due.getTime() - now.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  return diffDays
}

export function formatRelativeDue(dueDate: string): string {
  const now = new Date()
  const due = new Date(dueDate)
  const diffMs = due.getTime() - now.getTime()
  const diffHours = diffMs / (1000 * 60 * 60)

  // If overdue (in the past)
  if (diffMs < 0) {
    const absHours = Math.abs(diffHours)

    // Less than 1 hour overdue
    if (absHours < 1) {
      const minutes = Math.ceil(Math.abs(diffMs) / (1000 * 60))
      return `${minutes} min overdue`
    }

    // Less than 24 hours overdue
    if (absHours < 24) {
      const hours = Math.ceil(absHours)
      return `${hours} hour${hours !== 1 ? 's' : ''} overdue`
    }

    // Days overdue
    const daysOverdue = Math.abs(Math.floor(diffMs / (1000 * 60 * 60 * 24)))
    return daysOverdue === 1 ? '1 day overdue' : `${daysOverdue} days overdue`
  }

  // If due within 1 hour
  if (diffHours < 1) {
    const minutes = Math.ceil(diffMs / (1000 * 60))
    if (minutes <= 1) {
      return 'due now'
    }
    return `in ${minutes} min`
  }

  // If due within 24 hours
  if (diffHours < 24) {
    const hours = Math.ceil(diffHours)
    return `in ${hours} hour${hours !== 1 ? 's' : ''}`
  }

  // If due tomorrow (between 24 and 48 hours)
  const daysUntil = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (daysUntil === 1) {
    return 'tomorrow'
  }

  return `in ${daysUntil} days`
}

export function formatDueDate(dueDate: string): string {
  const date = new Date(dueDate)
  const now = new Date()

  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric'
  }

  if (date.getFullYear() !== now.getFullYear()) {
    options.year = 'numeric'
  }

  return date.toLocaleDateString('en-US', options)
}

export function getDueColorClass(dueDate: string): string {
  const now = new Date()
  const due = new Date(dueDate)
  const diffMs = due.getTime() - now.getTime()
  const diffHours = diffMs / (1000 * 60 * 60)

  // Overdue or due within next hour - red
  if (diffMs < 0 || diffHours < 1) {
    return 'text-red-600'
  }

  // Due within next 24 hours - yellow
  if (diffHours < 24) {
    return 'text-yellow-600'
  }

  // Due later - gray
  return 'text-gray-500'
}
