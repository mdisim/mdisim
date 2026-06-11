'use client'
import { useLocale } from '@/components/language-provider'
import { translations } from './translations'

export function useTranslation() {
  const { lang } = useLocale()
  const t = (key: string): string => {
    return (translations[lang] as Record<string, string>)[key]
      ?? (translations.en as Record<string, string>)[key]
      ?? key
  }
  return { t, lang }
}
