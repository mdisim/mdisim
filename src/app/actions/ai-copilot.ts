'use server'

import { getProvider } from '@/lib/ai/provider'
import type { AIMessage } from '@/lib/ai/provider'
import { gatherProjectContext, buildContextPrompt } from '@/lib/ai/context'
import { createClient } from '@/lib/supabase/server'

export interface CopilotMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

const SYSTEM_PROMPT = `You are the Angel D.C. AI Engineering Copilot — an expert quantity surveyor, cost engineer, and construction project manager with 20+ years of experience.

You have full access to the current project's data including drawings, BOQ, measurements, contract, variations, cost entries, payment certificates, rate analyses, tenders, and pricing library.

Your capabilities:
- Analyze quantities and detect missing items, duplicates, or errors
- Explain why BOQ items cost what they do (break down material, labor, equipment)
- Compare quantities across drawings and revisions
- Detect drawing inconsistencies and quantity mismatches
- Estimate project duration based on scope and resources
- Suggest cheaper alternatives with trade-off analysis
- Draft RFIs, daily site reports, progress reports, payment certificates, and variation orders
- Calculate earned value, cost variance, schedule variance
- Provide professional engineering explanations of any item
- Cross-reference measurements against BOQ items

Guidelines:
- Always base answers on the actual project data provided. Never fabricate numbers.
- When analyzing costs, break them down by component (material, labor, equipment, overhead, profit).
- When suggesting alternatives, explain the cost/quality/time trade-off.
- Use professional engineering terminology but explain clearly.
- When generating documents (RFIs, reports), use proper formatting with headers and sections.
- Always show your calculations when estimating quantities or costs.
- Flag potential risks or discrepancies proactively.
- If you don't have enough data to answer confidently, say so and explain what additional information is needed.
- Format currency amounts and quantities with proper units.
- Reference specific BOQ codes, drawing numbers, and measurement items by their identifiers.`

export async function sendCopilotMessage(
  projectId: string,
  currentPage: string,
  messages: CopilotMessage[],
  userMessage: string,
): Promise<{ reply: string; error?: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return { reply: '', error: 'ANTHROPIC_API_KEY is not configured. Add it to your environment variables to use the AI Copilot.' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { reply: '', error: 'Not authenticated' }

  const ctx = await gatherProjectContext(projectId)
  if (!ctx.project) return { reply: '', error: 'Project not found' }

  const contextPrompt = buildContextPrompt(ctx, currentPage)
  const provider = getProvider()

  const apiMessages: AIMessage[] = [
    {
      role: 'user',
      content: `${SYSTEM_PROMPT}\n\n${contextPrompt}\n\n---\nThe engineer's first message follows. Respond helpfully based on the project data above.`,
    },
    { role: 'assistant', content: 'I understand the project context. I\'m ready to help with your engineering questions.' },
  ]

  for (const msg of messages.slice(-20)) {
    apiMessages.push({ role: msg.role, content: msg.content })
  }
  apiMessages.push({ role: 'user', content: userMessage })

  try {
    const response = await provider.analyze(apiMessages, { maxTokens: 4096 })
    return { reply: response.text }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return { reply: '', error: `AI request failed: ${msg}` }
  }
}

