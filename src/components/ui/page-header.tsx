'use client'
import { useTranslation } from '@/lib/i18n/use-translation'

interface PageHeaderProps {
  titleKey: string
  subtitleKey?: string
  titleFallback: string
  subtitleFallback?: string
  children?: React.ReactNode
}

export function PageHeader({ titleKey, subtitleKey, titleFallback, subtitleFallback, children }: PageHeaderProps) {
  const { t } = useTranslation()
  return (
    <div className="flex items-start justify-between">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t(titleKey) || titleFallback}</h1>
        {(subtitleKey || subtitleFallback) && (
          <p className="text-slate-500 text-sm mt-1">{subtitleKey ? t(subtitleKey) : subtitleFallback}</p>
        )}
      </div>
      {children}
    </div>
  )
}
