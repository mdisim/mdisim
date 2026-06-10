'use client'

import { useEffect } from 'react'

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const lang = localStorage.getItem('app_language') ?? 'en'
    if (lang === 'ar' || lang === 'he') {
      document.documentElement.setAttribute('dir', 'rtl')
      document.documentElement.style.fontFamily = "'Arial', sans-serif"
    } else {
      document.documentElement.setAttribute('dir', 'ltr')
      document.documentElement.style.fontFamily = ''
    }
  }, [])

  return <>{children}</>
}
