'use client'

import { useState, useEffect } from 'react'
import { Sun, Moon, Search, ChevronDown, Globe, Bell } from 'lucide-react'
import { cn } from '@/lib/utils'

const LANGUAGES = [
  { code: 'en', label: 'EN', dir: 'ltr' },
  { code: 'ar', label: 'AR', dir: 'rtl' },
  { code: 'he', label: 'HE', dir: 'rtl' },
]

export function DashboardHeader() {
  const [dark, setDark] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const [currentLang, setCurrentLang] = useState('en')

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark')
    setDark(isDark)
    const savedLang = localStorage.getItem('angel-dc-language') || 'en'
    setCurrentLang(savedLang)
  }, [])

  const toggleTheme = () => {
    const next = !dark
    setDark(next)
    if (next) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    window.dispatchEvent(new CustomEvent('theme-change', { detail: { dark: next } }))
  }

  const setLanguage = (lang: typeof LANGUAGES[0]) => {
    setCurrentLang(lang.code)
    localStorage.setItem('angel-dc-language', lang.code)
    document.documentElement.setAttribute('dir', lang.dir)
    setLangOpen(false)
  }

  return (
    <header className="h-14 shrink-0 border-b border-slate-200 dark:border-white/[0.06] bg-white dark:bg-slate-900 flex items-center justify-between px-4 lg:px-6">
      {/* Breadcrumb area */}
      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
        <span className="hidden lg:inline text-slate-400 dark:text-slate-500">ANGEL D.C.</span>
        <span className="hidden lg:inline text-slate-300 dark:text-slate-600">/</span>
        <span className="font-medium text-slate-700 dark:text-slate-200">Dashboard</span>
      </div>

      {/* Right side controls */}
      <div className="flex items-center gap-2">
        {/* Search placeholder */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.06] text-slate-400 dark:text-slate-500 text-sm w-56">
          <Search size={14} />
          <span>Search...</span>
          <kbd className="ml-auto text-[10px] bg-slate-200 dark:bg-white/[0.06] px-1.5 py-0.5 rounded font-mono">/</kbd>
        </div>

        {/* Language selector */}
        <div className="relative">
          <button
            onClick={() => setLangOpen(!langOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-colors"
          >
            <Globe size={14} />
            <span className="text-xs uppercase">{currentLang}</span>
            <ChevronDown size={12} className={cn('transition-transform', langOpen && 'rotate-180')} />
          </button>
          {langOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setLangOpen(false)} />
              <div className="absolute right-0 top-full mt-1 z-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/[0.08] rounded-lg shadow-lg shadow-black/10 py-1 min-w-[80px]">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => setLanguage(lang)}
                    className={cn(
                      'w-full px-3 py-1.5 text-left text-sm hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors',
                      currentLang === lang.code
                        ? 'text-blue-500 font-medium'
                        : 'text-slate-600 dark:text-slate-300'
                    )}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Notifications */}
        <button
          className="relative p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-colors cursor-default opacity-60"
          title="Notifications — Coming soon"
          aria-label="Notifications — Coming soon"
          disabled
        >
          <Bell size={16} />
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-colors"
          title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {dark ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>
    </header>
  )
}
