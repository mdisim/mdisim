'use client'
import { useTranslation } from '@/lib/i18n/use-translation'
import { ReactNode } from 'react'

interface TButtonProps {
  labelKey: string
  fallback: string
  onClick?: () => void
  className?: string
  type?: 'button' | 'submit'
  disabled?: boolean
  children?: ReactNode
}

export function TButton({ labelKey, fallback, onClick, className, type = 'button', disabled, children }: TButtonProps) {
  const { t } = useTranslation()
  return (
    <button type={type} onClick={onClick} className={className} disabled={disabled}>
      {children}{t(labelKey) || fallback}
    </button>
  )
}
