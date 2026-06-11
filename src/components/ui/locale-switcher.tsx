'use client'
import { useLocale } from '@/components/language-provider'
import { LANG_META, Language } from '@/lib/i18n/translations'
import { CURRENCIES, CurrencyCode } from '@/lib/currency'
import { Globe, ChevronDown } from 'lucide-react'
import { useState } from 'react'

export function LocaleSwitcher() {
  const { lang, currency, setLang, setCurrency } = useLocale()
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm transition-colors"
      >
        <Globe size={14} />
        <span>{LANG_META[lang].nativeName}</span>
        <span className="opacity-60">|</span>
        <span>{CURRENCIES[currency].symbol}</span>
        <ChevronDown size={12} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full mt-1 end-0 z-50 w-56 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
            {/* Language section */}
            <div className="px-3 py-2 bg-slate-50 border-b border-slate-200">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Language</p>
            </div>
            {(Object.keys(LANG_META) as Language[]).map((l) => (
              <button
                key={l}
                onClick={() => { setLang(l); setOpen(false) }}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors ${lang === l ? 'text-amber-600 font-semibold bg-amber-50' : 'text-slate-700'}`}
              >
                <span>{LANG_META[l].nativeName}</span>
                <span className="text-xs text-slate-400">{LANG_META[l].dir.toUpperCase()}</span>
              </button>
            ))}

            {/* Currency section */}
            <div className="px-3 py-2 bg-slate-50 border-y border-slate-200">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Currency</p>
            </div>
            {(Object.keys(CURRENCIES) as CurrencyCode[]).map((c) => (
              <button
                key={c}
                onClick={() => { setCurrency(c); setOpen(false) }}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors ${currency === c ? 'text-amber-600 font-semibold bg-amber-50' : 'text-slate-700'}`}
              >
                <span>{CURRENCIES[c].name}</span>
                <span className="font-bold">{CURRENCIES[c].symbol}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
