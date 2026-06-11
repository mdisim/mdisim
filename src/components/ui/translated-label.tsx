'use client'
import { useTranslation } from '@/lib/i18n/use-translation'

export function T({ k, fallback }: { k: string; fallback: string }) {
  const { t } = useTranslation()
  return <>{t(k) || fallback}</>
}
