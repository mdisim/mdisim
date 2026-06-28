'use server'

import { createClient } from '@/lib/supabase/server'
import { analyzeDrawing, estimateCosts } from '@/lib/ai/engine'
import type { AIFullAnalysis, AICostEstimate, UserCorrection } from '@/lib/ai/types'

export type { AIFullAnalysis, AICostEstimate }
export type {
  AIDetectedElement,
  AIBOQGroup,
  AIBOQItem,
  AIDrawingAnalysis,
  UserCorrection,
  MaterialBreakdown,
  Trade,
  ElementType,
  DetectedScale,
  RepeatedPattern,
} from '@/lib/ai/types'

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
  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      drawing: { drawingType: '', summary: '', elements: [], dimensions: [], detectedScale: null, repeatedPatterns: [] },
      boq: [],
      totalEstimatedCost: null,
      currency: 'USD',
      error: 'ANTHROPIC_API_KEY is not configured. Add it to your environment variables.',
    }
  }
  return analyzeDrawing(imageBase64, drawingName, drawingType, pageNumber, corrections)
}

export async function estimateProjectCosts(
  boqItems: { code: string; description: string; unit: string; quantity: number }[],
  projectContext: string,
): Promise<AICostEstimate[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  if (!process.env.ANTHROPIC_API_KEY) return []
  return estimateCosts(boqItems, projectContext)
}
