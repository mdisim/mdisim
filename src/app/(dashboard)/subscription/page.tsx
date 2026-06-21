import { getPlans, getCurrentSubscription } from '@/app/actions/subscription'
import { SubscriptionClient } from './subscription-client'

export default async function SubscriptionPage() {
  const [plans, subscription] = await Promise.all([
    getPlans(),
    getCurrentSubscription(),
  ])

  return (
    <div className="max-w-[1400px] mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Subscription Plans</h1>
        <p className="text-slate-500 text-sm mt-1">
          Choose the plan that fits your needs
        </p>
      </div>
      <SubscriptionClient plans={plans} currentSubscription={subscription} />
    </div>
  )
}
