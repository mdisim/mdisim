'use server'

import { createClient } from '@/lib/supabase/server'
import { gatherProjectContext } from '@/lib/ai/context'
import { analyzeProjectHealth } from '@/lib/ai/intelligence-engine'
import type { HealthScore } from '@/lib/ai/intelligence-engine'
export type { HealthScore, HealthDimension, Alert, Recommendation, AlertSeverity, AlertCategory } from '@/lib/ai/intelligence-engine'

export async function getProjectHealth(projectId: string): Promise<HealthScore> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const ctx = await gatherProjectContext(projectId)
  return analyzeProjectHealth(ctx)
}
