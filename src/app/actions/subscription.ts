'use server'

import { createClient } from '@/lib/supabase/server'

export async function getPlans() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('subscription_plans')
    .select('*')
    .order('price_cents', { ascending: true })

  return data ?? []
}

export async function getCurrentSubscription() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('user_subscriptions')
    .select('*, plan:subscription_plans(*)')
    .eq('user_id', user.id)
    .in('status', ['active', 'trialing'])
    .single()

  return data
}

export async function subscribeToPlan(planId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // Cancel any existing subscription
  await supabase
    .from('user_subscriptions')
    .update({ status: 'cancelled' })
    .eq('user_id', user.id)
    .in('status', ['active', 'trialing'])

  const now = new Date()
  const periodEnd = new Date(now)
  periodEnd.setMonth(periodEnd.getMonth() + 1)

  const { data: sub, error } = await supabase
    .from('user_subscriptions')
    .insert({
      user_id: user.id,
      plan_id: planId,
      status: 'active',
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
    })
    .select('*, plan:subscription_plans(*)')
    .single()

  if (error) return { error: error.message }

  // Record payment
  const { data: plan } = await supabase
    .from('subscription_plans')
    .select('price_cents, name')
    .eq('id', planId)
    .single()

  if (plan && sub) {
    await supabase.from('payment_history').insert({
      user_id: user.id,
      subscription_id: sub.id,
      amount_cents: plan.price_cents,
      currency: 'usd',
      status: 'succeeded',
      description: `${plan.name} - Monthly subscription`,
    })
  }

  return { subscription: sub }
}

export async function cancelSubscription() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { error } = await supabase
    .from('user_subscriptions')
    .update({ cancel_at_period_end: true })
    .eq('user_id', user.id)
    .in('status', ['active', 'trialing'])

  if (error) return { error: error.message }
  return { success: true }
}

export async function getPaymentHistory() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('payment_history')
    .select('*')
    .eq('user_id', user.id)
    .order('paid_at', { ascending: false })
    .limit(50)

  return data ?? []
}

export async function getAdminStats() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // Verify admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['super_admin', 'company_admin'].includes(profile.role ?? '')) {
    return { error: 'Forbidden' }
  }

  // Gather stats in parallel
  const [
    { count: totalUsers },
    { count: studentCount },
    { count: engineerCount },
    { count: companyCount },
    { count: activeSubCount },
    { data: recentPayments },
    { data: recentUsers },
    { count: totalCerts },
  ] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student'),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'engineer'),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).in('role', ['company_admin', 'project_manager', 'quantity_surveyor', 'site_engineer', 'viewer', 'super_admin']),
    supabase.from('user_subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('payment_history')
      .select('amount_cents, currency, paid_at, status')
      .eq('status', 'succeeded')
      .order('paid_at', { ascending: false })
      .limit(100),
    supabase.from('profiles')
      .select('id, full_name, role, created_at')
      .order('created_at', { ascending: false })
      .limit(20),
    supabase.from('certificates').select('id', { count: 'exact', head: true }),
  ])

  const totalRevenueCents = (recentPayments ?? []).reduce((sum, p) => sum + (p.amount_cents ?? 0), 0)

  return {
    totalUsers: totalUsers ?? 0,
    studentCount: studentCount ?? 0,
    engineerCount: engineerCount ?? 0,
    companyCount: companyCount ?? 0,
    activeSubscriptions: activeSubCount ?? 0,
    totalRevenueCents,
    totalCertificates: totalCerts ?? 0,
    recentUsers: recentUsers ?? [],
  }
}
