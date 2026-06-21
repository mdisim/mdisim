'use client'

import { useState, useTransition } from 'react'
import { subscribeToPlan } from '@/app/actions/subscription'
import { useRouter } from 'next/navigation'
import { Check, Crown, Loader2, GraduationCap, Briefcase, Building2 } from 'lucide-react'

interface Plan {
  id: string
  name: string
  price_cents: number
  features: string[] | null
  [key: string]: unknown
}

interface Subscription {
  plan_id: string
  plan?: Plan
  [key: string]: unknown
}

const planConfig: Record<string, {
  icon: typeof GraduationCap
  color: string
  bgColor: string
  borderColor: string
  badgeColor: string
  buttonColor: string
  features: string[]
}> = {
  Student: {
    icon: GraduationCap,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    badgeColor: 'bg-emerald-100 text-emerald-700',
    buttonColor: 'bg-emerald-600 hover:bg-emerald-700',
    features: [
      '10 courses',
      'Engineering calculators',
      'Practice exercises',
      'Certificates',
      'Sample projects',
    ],
  },
  Engineer: {
    icon: Briefcase,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    badgeColor: 'bg-blue-100 text-blue-700',
    buttonColor: 'bg-blue-600 hover:bg-blue-700',
    features: [
      'Unlimited courses',
      'Project management',
      'BOQ builder',
      'Rebar calculator',
      'Drawing management',
      'PDF/Excel export',
      'Rate analysis',
    ],
  },
  Company: {
    icon: Building2,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    badgeColor: 'bg-amber-100 text-amber-700',
    buttonColor: 'bg-amber-600 hover:bg-amber-700',
    features: [
      'Everything in Engineer',
      'Team management',
      'Procurement',
      'Cost control',
      'Daily reports',
      'Tenders',
      'Client exports',
      'Role-based access',
    ],
  },
}

const priceMap: Record<string, number> = {
  Student: 9,
  Engineer: 29,
  Company: 99,
}

export function SubscriptionClient({
  plans,
  currentSubscription,
}: {
  plans: Plan[]
  currentSubscription: Subscription | null
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [subscribingId, setSubscribingId] = useState<string | null>(null)

  function handleSubscribe(planId: string) {
    setSubscribingId(planId)
    startTransition(async () => {
      const result = await subscribeToPlan(planId)
      setSubscribingId(null)
      if (!('error' in result)) {
        router.refresh()
      }
    })
  }

  // Use DB plans if available, otherwise build from config
  const displayPlans = plans.length > 0
    ? plans
    : Object.entries(planConfig).map(([name], i) => ({
        id: `plan-${i}`,
        name,
        price_cents: priceMap[name] * 100,
        features: planConfig[name].features,
      }))

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {displayPlans.map((plan) => {
        const config = planConfig[plan.name] ?? planConfig.Student
        const Icon = config.icon
        const isCurrent = currentSubscription?.plan_id === plan.id
        const price = plan.price_cents / 100
        const features = plan.features ?? config.features

        return (
          <div
            key={plan.id}
            className={`relative bg-white rounded-xl border shadow-sm p-6 flex flex-col ${
              isCurrent ? config.borderColor + ' border-2' : 'border-slate-200'
            }`}
          >
            {isCurrent && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${config.badgeColor}`}>
                  <Crown size={12} />
                  Current Plan
                </span>
              </div>
            )}

            <div className={`w-10 h-10 rounded-lg ${config.bgColor} flex items-center justify-center mb-4`}>
              <Icon size={20} className={config.color} />
            </div>

            <h2 className="text-lg font-bold text-slate-900">{plan.name}</h2>
            <div className="mt-2 mb-6">
              <span className="text-3xl font-bold text-slate-900">${price}</span>
              <span className="text-slate-500 text-sm">/mo</span>
            </div>

            <ul className="space-y-3 flex-1 mb-6">
              {features.map((feature: string) => (
                <li key={feature} className="flex items-start gap-2 text-sm text-slate-600">
                  <Check size={16} className={`${config.color} mt-0.5 shrink-0`} />
                  {feature}
                </li>
              ))}
            </ul>

            {isCurrent ? (
              <button
                disabled
                className="w-full py-2.5 px-4 rounded-xl text-sm font-medium bg-slate-100 text-slate-400 cursor-not-allowed"
              >
                Current Plan
              </button>
            ) : (
              <button
                onClick={() => handleSubscribe(plan.id)}
                disabled={isPending}
                className={`w-full py-2.5 px-4 rounded-xl text-sm font-medium text-white ${config.buttonColor} shadow-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2`}
              >
                {subscribingId === plan.id && isPending ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Processing...
                  </>
                ) : currentSubscription ? (
                  'Upgrade'
                ) : (
                  'Subscribe'
                )}
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
