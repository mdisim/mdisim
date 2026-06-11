export type CurrencyCode = 'ILS' | 'USD' | 'EUR'

export interface CurrencyConfig {
  code: CurrencyCode
  symbol: string
  name: string
  position: 'before' | 'after'
}

export const CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  ILS: { code: 'ILS', symbol: '₪', name: 'Israeli Shekel', position: 'before' },
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', position: 'before' },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', position: 'before' },
}

export const DEFAULT_CURRENCY: CurrencyCode = 'ILS'

export function formatCurrency(
  amount: number,
  currency: CurrencyCode = DEFAULT_CURRENCY,
  lang: 'en' | 'ar' | 'he' = 'en'
): string {
  const config = CURRENCIES[currency]

  // Use western digits for all locales (arabic-indic digits confuse construction professionals)
  const formatted = new Intl.NumberFormat('en-IL', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(amount))

  // For RTL languages, put symbol after the number per Israeli convention
  if (lang === 'he' || lang === 'ar') {
    return `${formatted} ${config.symbol}`
  }
  return `${config.symbol}${formatted}`
}

export function formatCurrencyFull(
  amount: number,
  currency: CurrencyCode = DEFAULT_CURRENCY,
  lang: 'en' | 'ar' | 'he' = 'en'
): string {
  return formatCurrency(amount, currency, lang)
}

// Storage key for user currency preference
export const CURRENCY_STORAGE_KEY = 'angel-dc-currency'
export const LANGUAGE_STORAGE_KEY = 'angel-dc-language'
