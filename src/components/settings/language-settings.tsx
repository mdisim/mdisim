'use client'

import { useState, useEffect } from 'react'

const LANGUAGES = [
  { code: 'en', label: 'English', dir: 'ltr', flag: '🇬🇧' },
  { code: 'ar', label: 'Arabic (العربية)', dir: 'rtl', flag: '🇸🇦' },
  { code: 'he', label: 'Hebrew (עברית)', dir: 'rtl', flag: '🇮🇱' },
]

export function LanguageSettings() {
  const [current, setCurrent] = useState('en')

  useEffect(() => {
    const stored = localStorage.getItem('app_language') ?? 'en'
    setCurrent(stored)
  }, [])

  function handleChange(code: string) {
    setCurrent(code)
    localStorage.setItem('app_language', code)
    const lang = LANGUAGES.find(l => l.code === code)
    if (lang?.dir === 'rtl') {
      document.documentElement.setAttribute('dir', 'rtl')
      document.documentElement.style.fontFamily = "'Arial', sans-serif"
    } else {
      document.documentElement.setAttribute('dir', 'ltr')
      document.documentElement.style.fontFamily = ''
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 mt-6">
      <h2 className="text-base font-semibold text-slate-800 mb-1">Language &amp; Region</h2>
      <p className="text-sm text-slate-500 mb-4">Select your preferred language. RTL languages will switch the layout direction.</p>
      <div className="flex flex-wrap gap-3">
        {LANGUAGES.map(lang => (
          <button
            key={lang.code}
            onClick={() => handleChange(lang.code)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${
              current === lang.code
                ? 'border-amber-400 bg-amber-50 text-amber-700 shadow-sm'
                : 'border-slate-200 text-slate-600 hover:border-amber-300 hover:bg-amber-50'
            }`}
          >
            <span>{lang.flag}</span>
            <span>{lang.label}</span>
            {lang.dir === 'rtl' && (
              <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded font-normal">RTL</span>
            )}
          </button>
        ))}
      </div>
      {(current === 'ar' || current === 'he') && (
        <p className="text-xs text-blue-600 mt-3">
          RTL layout is active. The page direction has been switched to right-to-left.
        </p>
      )}
    </div>
  )
}
