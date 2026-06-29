'use server'

import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { analyzeDrawing, estimateCosts } from '@/lib/ai/engine'
import type { AIFullAnalysis, AICostEstimate, UserCorrection } from '@/lib/ai/types'

export async function analyzeDrawingWithAI(
  imageBase64: string,
  drawingName: string,
  drawingType: string,
  pageNumber: number,
  corrections: UserCorrection[] = [],
): Promise<AIFullAnalysis> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const cookieStore = await cookies()
  const runtimeKey = cookieStore.get('angel-dc-api-key')?.value

  if (!runtimeKey && !process.env.ANTHROPIC_API_KEY) {
    return {
      drawing: { drawingType: '', summary: '', elements: [], dimensions: [], detectedScale: null, repeatedPatterns: [] },
      boq: [],
      totalEstimatedCost: null,
      currency: 'USD',
      error: 'Configure your API key in the copilot settings.',
    }
  }
  return analyzeDrawing(imageBase64, drawingName, drawingType, pageNumber, corrections, runtimeKey)
}

export async function estimateProjectCosts(
  boqItems: { code: string; description: string; unit: string; quantity: number }[],
  projectContext: string,
): Promise<AICostEstimate[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const cookieStore = await cookies()
  const runtimeKey = cookieStore.get('angel-dc-api-key')?.value

  if (!runtimeKey && !process.env.ANTHROPIC_API_KEY) return []
  return estimateCosts(boqItems, projectContext, runtimeKey)
}
