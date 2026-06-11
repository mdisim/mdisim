'use client'
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { Language, LANG_META } from '@/lib/i18n/translations'
import { CurrencyCode, DEFAULT_CURRENCY, CURRENCY_STORAGE_KEY, LANGUAGE_STORAGE_KEY } from '@/lib/currency'

interface LocaleContextValue {
  lang: Language
  currency: CurrencyCode
  dir: 'ltr' | 'rtl'
  setLang: (l: Language) => void
  setCurrency: (c: CurrencyCode) => void
}

const LocaleContext = createContext<LocaleContextValue>({
  lang: 'en', currency: 'ILS', dir: 'ltr',
  setLang: () => {}, setCurrency: () => {},
})

export function useLocale() { return useContext(LocaleContext) }

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>('en')
  const [currency, setCurrencyState] = useState<CurrencyCode>(DEFAULT_CURRENCY)

  useEffect(() => {
    const storedLang = localStorage.getItem(LANGUAGE_STORAGE_KEY) as Language
    const storedCurrency = localStorage.getItem(CURRENCY_STORAGE_KEY) as CurrencyCode
    if (storedLang && ['en','ar','he'].includes(storedLang)) setLangState(storedLang)
    if (storedCurrency && ['ILS','USD','EUR'].includes(storedCurrency)) setCurrencyState(storedCurrency)
  }, [])

  useEffect(() => {
    const meta = LANG_META[lang]
    document.documentElement.setAttribute('dir', meta.dir)
    document.documentElement.setAttribute('lang', lang)
    document.documentElement.classList.remove('font-arabic', 'font-hebrew')
    if (lang === 'ar') document.documentElement.classList.add('font-arabic')
    if (lang === 'he') document.documentElement.classList.add('font-hebrew')
  }, [lang])

  const setLang = (l: Language) => {
    setLangState(l)
    localStorage.setItem(LANGUAGE_STORAGE_KEY, l)
  }
  const setCurrency = (c: CurrencyCode) => {
    setCurrencyState(c)
    localStorage.setItem(CURRENCY_STORAGE_KEY, c)
  }

  return (
    <LocaleContext.Provider value={{ lang, currency, dir: LANG_META[lang].dir, setLang, setCurrency }}>
      {children}
    </LocaleContext.Provider>
  )
}
