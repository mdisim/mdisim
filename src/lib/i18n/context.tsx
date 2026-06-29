'use client'

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'
import { translations, type Locale, type TranslationKeys } from './translations'

interface I18nContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: TranslationKeys
  dir: 'ltr' | 'rtl'
  isRTL: boolean
}

const I18nContext = createContext<I18nContextType | null>(null)

const RTL_LOCALES: Locale[] = ['ar', 'he']

function applyLocale(loc: Locale) {
  const isRTL = RTL_LOCALES.includes(loc)
  document.documentElement.lang = loc
  document.documentElement.dir = isRTL ? 'rtl' : 'ltr'
  document.documentElement.classList.toggle('rtl', isRTL)
  if (loc === 'ar') {
    document.documentElement.classList.add('font-arabic')
    document.documentElement.classList.remove('font-hebrew')
  } else if (loc === 'he') {
    document.documentElement.classList.add('font-hebrew')
    document.documentElement.classList.remove('font-arabic')
  } else {
    document.documentElement.classList.remove('font-arabic', 'font-hebrew')
  }
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en')

  useEffect(() => {
    const saved = localStorage.getItem('angel-locale') as Locale | null
    if (saved && translations[saved]) {
      setLocaleState(saved)
      applyLocale(saved)
    }
  }, [])

  const setLocale = useCallback((loc: Locale) => {
    setLocaleState(loc)
    localStorage.setItem('angel-locale', loc)
    applyLocale(loc)
  }, [])

  const dir = RTL_LOCALES.includes(locale) ? 'rtl' as const : 'ltr' as const

  return (
    <I18nContext.Provider value={{
      locale,
      setLocale,
      t: translations[locale],
      dir,
      isRTL: dir === 'rtl',
    }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}
