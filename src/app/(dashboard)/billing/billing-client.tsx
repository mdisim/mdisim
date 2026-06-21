'use client'

import { useState, useTransition } from 'react'
import { cancelSubscription } from '@/app/actions/subscription'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  CreditCard,
  Calendar,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react'

interface Subscription {
  id: string
  plan_id: string
  status: string
  cancel_at_period_end?: boolean
  current_period_start?: string
  current_period_end?: string
  plan?: {
    name: string
    price_cents: number
    [key: string]: unknown
  }
  [key: string]: unknown
}

interface Payment {
  id: string
  amount_cents: number
  currency: string
  status: string
  description: string
  paid_at: string
  [key: string]: unknown
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    succeeded: 'bg-emerald-100 text-emerald-700',
    active: 'bg-emerald-100 text-emerald-700',
    trialing: 'bg-blue-100 text-blue-700',
    failed: 'bg-red-100 text-red-700',
    pending: 'bg-amber-100 text-amber-700',
  }
  const icons: Record<string, typeof CheckCircle2> = {
    succeeded: CheckCircle2,
    active: CheckCircle2,
    trialing: Clock,
    failed: XCircle,
    pending: Clock,
  }
  const Icon = icons[status] ?? Clock
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] ?? 'bg-slate-100 text-slate-600'}`}>
      <Icon size={12} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

export function BillingClient({
  subscription,
  payments,
}: {
  subscription: Subscription
  payments: Payment[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showConfirm, setShowConfirm] = useState(false)

  function handleCancel() {
    startTransition(async () => {
      await cancelSubscription()
      setShowConfirm(false)
      router.refresh()
    })
  }

  const plan = subscription.plan
  const price = plan ? plan.price_cents / 100 : 0

  return (
    <div className="space-y-6">
      {/* Current Plan Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <CreditCard size={20} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                {plan?.name ?? 'Unknown'} Plan
              </h2>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                ${price}
                <span className="text-sm font-normal text-slate-500">/mo</span>
              </p>
            </div>
          </div>
          <StatusBadge status={subscription.status} />
        </div>

        {(subscription.current_period_start || subscription.current_period_end) && (
          <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
            <Calendar size={14} />
            {subscription.current_period_start && (
              <span>
                {formatDate(subscription.current_period_start)}
              </span>
            )}
            {subscription.current_period_end && (
              <span> &mdash; {formatDate(subscription.current_period_end)}</span>
            )}
          </div>
        )}

        {subscription.cancel_at_period_end && (
          <div className="mt-4 flex items-center gap-2 text-sm text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
            <AlertTriangle size={14} />
            Your subscription will be cancelled at the end of the current period.
          </div>
        )}

        <div className="mt-6 flex items-center gap-3">
          <Link
            href="/subscription"
            className="px-4 py-2 text-sm font-medium text-blue-600 border border-blue-200 rounded-xl hover:bg-blue-50 transition-colors"
          >
            Change Plan
          </Link>
          {!subscription.cancel_at_period_end && (
            <button
              onClick={() => setShowConfirm(true)}
              className="px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition-colors"
            >
              Cancel Subscription
            </button>
          )}
        </div>
      </div>

      {/* Cancel Confirmation */}
      {showConfirm && (
        <div className="bg-red-50 rounded-xl border border-red-200 p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="text-red-600 mt-0.5 shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-red-900">
                Cancel Subscription?
              </h3>
              <p className="text-sm text-red-700 mt-1">
                Your subscription will remain active until the end of the current billing period. After that, you will lose access to premium features.
              </p>
              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={handleCancel}
                  disabled={isPending}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isPending ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      Cancelling...
                    </>
                  ) : (
                    'Yes, Cancel'
                  )}
                </button>
                <button
                  onClick={() => setShowConfirm(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-xl hover:bg-white transition-colors"
                >
                  Keep Subscription
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment History */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">Payment History</h2>
        </div>
        {payments.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-slate-500">
            No payment history yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-6 py-3 font-medium text-slate-500">Date</th>
                  <th className="text-left px-6 py-3 font-medium text-slate-500">Description</th>
                  <th className="text-right px-6 py-3 font-medium text-slate-500">Amount</th>
                  <th className="text-right px-6 py-3 font-medium text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id} className="border-b border-slate-50 last:border-0">
                    <td className="px-6 py-3 text-slate-600">
                      {formatDate(payment.paid_at)}
                    </td>
                    <td className="px-6 py-3 text-slate-900">
                      {payment.description}
                    </td>
                    <td className="px-6 py-3 text-right text-slate-900 font-medium">
                      ${(payment.amount_cents / 100).toFixed(2)}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <StatusBadge status={payment.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
