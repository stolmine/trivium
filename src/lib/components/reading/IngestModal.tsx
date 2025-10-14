import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

interface IngestModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function IngestModal({ open, onOpenChange }: IngestModalProps) {
  const navigate = useNavigate()

  useEffect(() => {
    if (open) {
      navigate('/ingest')
      onOpenChange(false)
    }
  }, [open, navigate, onOpenChange])

  return null
}
