import { getCurrentSubscription, getPaymentHistory } from '@/app/actions/subscription'
import { BillingClient } from './billing-client'
import Link from 'next/link'
import { CreditCard } from 'lucide-react'

export default async function BillingPage() {
  const [subscription, payments] = await Promise.all([
    getCurrentSubscription(),
    getPaymentHistory(),
  ])

  if (!subscription) {
    return (
      <div className="max-w-[1400px] mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Billing</h1>
          <p className="text-slate-500 text-sm mt-1">Manage your subscription and payments</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
          <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <CreditCard size={24} className="text-slate-400" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">No active plan</h2>
          <p className="text-slate-500 text-sm mb-6">
            You don&apos;t have an active subscription. Choose a plan to get started.
          </p>
          <Link
            href="/subscription"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl shadow-sm transition-colors"
          >
            View Plans
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Billing</h1>
        <p className="text-slate-500 text-sm mt-1">Manage your subscription and payments</p>
      </div>
      <BillingClient subscription={subscription} payments={payments} />
    </div>
  )
}
