'use client'

import { useState, useEffect } from 'react'
import { Sun, Moon, ChevronDown, Globe, Bell } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CommandPalette } from '@/components/ui/command-palette'
import { useI18n } from '@/lib/i18n'
import type { Locale } from '@/lib/i18n'

const LANGUAGES = [
  { code: 'en', label: 'EN' },
  { code: 'ar', label: 'AR' },
  { code: 'he', label: 'HE' },
]

export function DashboardHeader() {
  const [dark, setDark] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const { t, locale, setLocale } = useI18n()

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark')
    setDark(isDark)
  }, [])

  const toggleTheme = () => {
    const next = !dark
    setDark(next)
    if (next) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('angel-dc-theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('angel-dc-theme', 'light')
    }
    window.dispatchEvent(new CustomEvent('theme-change', { detail: { dark: next } }))
  }

  return (
    <header className="h-14 shrink-0 border-b border-[#4f4633] bg-[#131315] flex items-center justify-between px-4 lg:px-6">
      {/* Breadcrumb area */}
      <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
        <span className="hidden lg:inline text-[var(--color-text-muted)] opacity-60 font-mono text-xs uppercase tracking-widest">ANGEL D.C.</span>
        <span className="hidden lg:inline opacity-30">/</span>
        <span className="font-medium text-[var(--color-text)]">{t.nav.dashboard}</span>
      </div>

      {/* Right side controls */}
      <div className="flex items-center gap-2">
        {/* Command Palette */}
        <CommandPalette />

        {/* Language selector */}
        <div className="relative">
          <button
            onClick={() => setLangOpen(!langOpen)}
            aria-label="Switch language"
            aria-expanded={langOpen}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] transition-colors"
          >
            <Globe size={14} />
            <span className="text-xs uppercase">{locale}</span>
            <ChevronDown size={12} className={cn('transition-transform', langOpen && 'rotate-180')} />
          </button>
          {langOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setLangOpen(false)} />
              <div className="absolute end-0 top-full mt-1 z-20 bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-xl shadow-[var(--shadow-dropdown)] py-1 min-w-[80px]">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => { setLocale(lang.code as Locale); setLangOpen(false) }}
                    className={cn(
                      'w-full px-3 py-1.5 text-start text-sm hover:bg-[var(--color-surface-hover)] transition-colors',
                      locale === lang.code
                        ? 'text-[var(--color-amber)] font-semibold'
                        : 'text-[var(--color-text-secondary)]'
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
          className="relative p-2 rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] transition-colors cursor-default opacity-60"
          title={t.common.comingSoon}
          aria-label={t.common.comingSoon}
          disabled
        >
          <Bell size={16} />
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-amber)] transition-colors"
          title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {dark ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>
    </header>
  )
}
