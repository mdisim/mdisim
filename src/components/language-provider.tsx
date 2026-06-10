'use client'

import { useEffect } from 'react'

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const lang = localStorage.getItem('app_language') ?? 'en'
    const html = document.documentElement

    // Remove previous font classes
    html.classList.remove('font-arabic', 'font-hebrew')

    if (lang === 'ar') {
      html.setAttribute('dir', 'rtl')
      html.classList.add('font-arabic')
    } else if (lang === 'he') {
      html.setAttribute('dir', 'rtl')
      html.classList.add('font-hebrew')
    } else {
      html.setAttribute('dir', 'ltr')
    }
  }, [])

  return <>{children}</>
}
