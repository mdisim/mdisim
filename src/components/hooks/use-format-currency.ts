'use client'
import { useLocale } from '@/components/language-provider'
import { formatCurrency } from '@/lib/currency'

export function useFormatCurrency() {
  const { lang, currency } = useLocale()
  return (amount: number) => formatCurrency(amount, currency, lang)
}
