'use server'

import { gatherProjectContext } from '@/lib/ai/context'
import { analyzeProjectHealth } from '@/lib/ai/intelligence-engine'
import type { HealthScore } from '@/lib/ai/intelligence-engine'
export type { HealthScore, HealthDimension, Alert, Recommendation, AlertSeverity, AlertCategory } from '@/lib/ai/intelligence-engine'

export async function getProjectHealth(projectId: string): Promise<HealthScore> {
  const ctx = await gatherProjectContext(projectId)
  return analyzeProjectHealth(ctx)
}
