'use client'
import { useEffect, useState } from 'react'
import { translations, Language } from './translations'

export function useTranslation() {
  const [lang, setLang] = useState<Language>('en')

  useEffect(() => {
    const stored = localStorage.getItem('angel-dc-language') as Language
    if (stored && translations[stored]) setLang(stored)
  }, [])

  const t = (key: string): string => {
    return (translations[lang] as Record<string, string>)[key] ?? (translations.en as Record<string, string>)[key] ?? key
  }

  return { t, lang }
}
