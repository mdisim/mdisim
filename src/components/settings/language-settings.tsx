'use client'

import { useLocale } from '@/components/language-provider'
import { LANG_META, Language } from '@/lib/i18n/translations'
import { CURRENCIES, CurrencyCode } from '@/lib/currency'

const LANGUAGES: { code: Language; flag: string }[] = [
  { code: 'en', flag: '🇬🇧' },
  { code: 'ar', flag: '🇸🇦' },
  { code: 'he', flag: '🇮🇱' },
]

export function LanguageSettings() {
  const { lang, currency, setLang, setCurrency } = useLocale()

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 mt-6 space-y-6">
      {/* Language */}
      <div>
        <h2 className="text-base font-semibold text-slate-800 mb-1">Language &amp; Region</h2>
        <p className="text-sm text-slate-500 mb-4">Select your preferred language. RTL languages will switch the layout direction.</p>
        <div className="flex flex-wrap gap-3">
          {LANGUAGES.map(({ code, flag }) => {
            const meta = LANG_META[code]
            return (
              <button
                key={code}
                onClick={() => setLang(code)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                  lang === code
                    ? 'border-amber-400 bg-amber-50 text-amber-700 shadow-sm'
                    : 'border-slate-200 text-slate-600 hover:border-amber-300 hover:bg-amber-50'
                }`}
              >
                <span>{flag}</span>
                <span>{meta.nativeName}</span>
                {meta.dir === 'rtl' && (
                  <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded font-normal">RTL</span>
                )}
              </button>
            )
          })}
        </div>
        {(lang === 'ar' || lang === 'he') && (
          <p className="text-xs text-blue-600 mt-3">
            RTL layout is active. The page direction has been switched to right-to-left.
          </p>
        )}
      </div>

      {/* Currency */}
      <div>
        <h2 className="text-base font-semibold text-slate-800 mb-1">Currency</h2>
        <p className="text-sm text-slate-500 mb-4">Select the currency used for budgets and costs.</p>
        <div className="flex flex-wrap gap-3">
          {(Object.keys(CURRENCIES) as CurrencyCode[]).map((c) => (
            <button
              key={c}
              onClick={() => setCurrency(c)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                currency === c
                  ? 'border-amber-400 bg-amber-50 text-amber-700 shadow-sm'
                  : 'border-slate-200 text-slate-600 hover:border-amber-300 hover:bg-amber-50'
              }`}
            >
              <span className="font-bold text-base">{CURRENCIES[c].symbol}</span>
              <span>{CURRENCIES[c].name}</span>
              {c === 'ILS' && (
                <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded font-normal">Default</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
