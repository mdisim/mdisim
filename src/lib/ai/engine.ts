import { getProvider } from './provider'
import type { AIMessage } from './provider'
import type {
  AIFullAnalysis,
  AIDrawingAnalysis,
  AIBOQGroup,
  AIDetectedElement,
  AIBOQItem,
  UserCorrection,
  AICostEstimate,
  Trade,
} from './types'

const TRADE_LABELS: Record<Trade, string> = {
  concrete: 'Concrete Works',
  masonry: 'Masonry Works',
  steel: 'Steel & Rebar',
  carpentry: 'Carpentry & Formwork',
  plumbing: 'Plumbing',
  electrical: 'Electrical',
  mechanical: 'Mechanical / HVAC',
  finishing: 'Finishing Works',
  earthwork: 'Earthwork',
  roads: 'Roads & Paving',
  landscaping: 'Landscaping',
  general: 'General',
}

function buildAnalysisPrompt(drawingName: string, drawingType: string, pageNumber: number, corrections: UserCorrection[]): string {
  const correctionContext = corrections.length > 0
    ? `\n\nThe engineer has previously corrected your analysis. Learn from these corrections:\n${corrections.map(c => `- Element ${c.elementId}: changed ${c.field} from "${c.originalValue}" to "${c.correctedValue}"`).join('\n')}`
    : ''

  return `You are an expert quantity surveyor with 20+ years experience analyzing engineering drawings for construction projects. You work at Angel D.C., the leading AI-powered construction platform.

Drawing: "${drawingName}" (${drawingType}), Page ${pageNumber}${correctionContext}

TASK 1 — ELEMENT DETECTION
Thoroughly analyze this engineering drawing and identify ALL measurable elements:
- Structural: walls, slabs, beams, columns, footings, rebar
- Architectural: doors, windows, stairs, finishes
- MEP: pipes, ducts
- Civil: roads, curbs
- Look for repeated/patterned elements (e.g., identical windows, regularly spaced columns)
- Detect ANY visible dimension annotations on the drawing
- Detect the drawing scale if shown (e.g., 1:100, 1:50)

For each element provide:
1. Type classification
2. Label (W1, S1, B1 etc.)
3. Detailed description with ALL visible dimensions
4. Material if determinable
5. Appropriate measurement unit (m, m², m³, lm, nr, kg, ton)
6. Estimated quantity using detected dimensions
7. Confidence (0.0-1.0)
8. Approximate bounding box as percentage coordinates
9. Professional BOQ description
10. BOQ code (e.g., 04.01 for concrete in foundations)
11. Trade classification
12. Clear reasoning explaining HOW the quantity was calculated
13. Whether it appears repeated and how many times

TASK 2 — PRELIMINARY BOQ
Group all detected elements into a professional BOQ organized by trade:
- Concrete Works: calculate volumes (L×W×H) for each concrete element
- Steel/Rebar: estimate weight using standard ratios (e.g., 80-120 kg/m³ for slabs)
- Masonry: calculate block quantities from wall areas and standard block sizes
- Finishing: calculate areas for plastering, painting, tiling
- Include a BOQ code, unit, quantity, and reasoning for each item

TASK 3 — MATERIAL CALCULATIONS
For elements where you can determine dimensions:
- Concrete volume = L × W × H (in m³)
- Steel weight = concrete volume × reinforcement ratio (kg)
- Block count = wall area ÷ block face area (adjust for mortar joints)
- Finishing area = surface area needing treatment (m²)

Return JSON (no markdown fences) matching this exact structure:
{
  "drawing_type": "string",
  "summary": "string describing the drawing content",
  "elements": [
    {
      "type": "wall|slab|beam|column|door|window|stair|pipe|duct|road|curb|footing|rebar|block|finish|other",
      "label": "W1",
      "description": "200mm reinforced concrete wall, 3m height, 6m length",
      "material": "reinforced concrete",
      "dimensions": { "length": 6, "width": 0.2, "height": 3, "unit": "m" },
      "suggested_unit": "m³",
      "estimated_quantity": 3.6,
      "confidence": 0.85,
      "bounding_box": { "x_pct": 10, "y_pct": 20, "w_pct": 30, "h_pct": 40 },
      "boq_description": "Reinforced concrete in walls, 200mm thick, grade C30",
      "boq_code": "04.03",
      "boq_unit": "m³",
      "trade": "concrete",
      "reasoning": "Wall measured at 6.0m × 0.2m × 3.0m = 3.6 m³. Dimensions read from annotations.",
      "is_repeated": false,
      "repeat_count": 1
    }
  ],
  "detected_dimensions": [
    { "value": 6.0, "unit": "m", "location": { "x_pct": 15, "y_pct": 25, "w_pct": 5, "h_pct": 2 }, "confidence": 0.9 }
  ],
  "detected_scale": { "ratio": "1:100", "pixels_per_unit": 0, "unit": "m", "confidence": 0.7, "reasoning": "Scale bar visible at bottom" },
  "repeated_patterns": [
    { "element_type": "column", "count": 8, "description": "300×300mm columns at 4m spacing", "representative_element_label": "C1" }
  ],
  "boq_groups": [
    {
      "trade": "concrete",
      "items": [
        {
          "code": "04.03",
          "description": "Reinforced concrete in walls",
          "unit": "m³",
          "quantity": 3.6,
          "unit_rate": null,
          "confidence": 0.85,
          "reasoning": "Calculated from wall W1: 6.0m × 0.2m × 3.0m",
          "source_element_labels": ["W1"],
          "material_breakdown": { "concrete": { "volume": 3.6, "grade": "C30" }, "steel": { "weight": 360, "type": "Y12@200 BW" } }
        }
      ]
    }
  ]
}

Be thorough. A good quantity surveyor misses nothing. If you cannot determine exact dimensions, estimate based on standard construction practice and state your assumptions in the reasoning.`
}

function parseAnalysisResponse(text: string): AIFullAnalysis {
  let jsonStr = text
  const fenced = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenced) jsonStr = fenced[1]
  jsonStr = jsonStr.trim()
  const braceStart = jsonStr.indexOf('{')
  if (braceStart > 0) jsonStr = jsonStr.slice(braceStart)

  const parsed = JSON.parse(jsonStr)
  const timestamp = Date.now()

  const elements: AIDetectedElement[] = (parsed.elements || []).map(
    (el: Record<string, unknown>, i: number) => ({
      id: `ai-${timestamp}-${i}`,
      type: el.type || 'other',
      label: el.label || `E${i + 1}`,
      description: el.description || '',
      material: el.material || undefined,
      dimensions: el.dimensions || undefined,
      suggestedUnit: el.suggested_unit || 'nr',
      estimatedQuantity: el.estimated_quantity ?? null,
      confidence: el.confidence ?? 0.5,
      boundingBox: el.bounding_box
        ? {
            x: (el.bounding_box as Record<string, number>).x_pct,
            y: (el.bounding_box as Record<string, number>).y_pct,
            width: (el.bounding_box as Record<string, number>).w_pct,
            height: (el.bounding_box as Record<string, number>).h_pct,
          }
        : undefined,
      boqDescription: (el.boq_description as string) || (el.description as string) || '',
      boqUnit: (el.boq_unit as string) || (el.suggested_unit as string) || 'nr',
      boqCode: (el.boq_code as string) || undefined,
      trade: (el.trade as Trade) || 'general',
      reasoning: (el.reasoning as string) || '',
      isRepeated: (el.is_repeated as boolean) || false,
      repeatCount: (el.repeat_count as number) || 1,
    }),
  )

  const drawing: AIDrawingAnalysis = {
    drawingType: parsed.drawing_type || '',
    summary: parsed.summary || '',
    elements,
    dimensions: (parsed.detected_dimensions || []).map((d: Record<string, unknown>) => ({
      value: d.value,
      unit: d.unit,
      location: d.location
        ? {
            x: (d.location as Record<string, number>).x_pct,
            y: (d.location as Record<string, number>).y_pct,
            width: (d.location as Record<string, number>).w_pct,
            height: (d.location as Record<string, number>).h_pct,
          }
        : { x: 0, y: 0, width: 0, height: 0 },
      confidence: d.confidence ?? 0.5,
    })),
    detectedScale: parsed.detected_scale
      ? {
          ratio: parsed.detected_scale.ratio,
          pixelsPerUnit: parsed.detected_scale.pixels_per_unit || 0,
          unit: parsed.detected_scale.unit || 'm',
          confidence: parsed.detected_scale.confidence || 0.5,
          reasoning: parsed.detected_scale.reasoning || '',
        }
      : null,
    repeatedPatterns: (parsed.repeated_patterns || []).map((p: Record<string, unknown>) => ({
      elementType: p.element_type || 'other',
      count: p.count || 1,
      description: p.description || '',
      representativeElementId: elements.find(
        (e: AIDetectedElement) => e.label === p.representative_element_label,
      )?.id || '',
    })),
  }

  const boq: AIBOQGroup[] = (parsed.boq_groups || []).map((g: Record<string, unknown>) => ({
    trade: g.trade as Trade || 'general',
    tradeLabel: TRADE_LABELS[(g.trade as Trade) || 'general'] || (g.trade as string),
    items: ((g.items as Record<string, unknown>[]) || []).map((item: Record<string, unknown>, j: number) => ({
      code: item.code || '',
      description: item.description || '',
      unit: item.unit || 'nr',
      quantity: (item.quantity as number) || 0,
      unitRate: (item.unit_rate as number) ?? null,
      amount: (item.unit_rate as number) ? ((item.quantity as number) || 0) * (item.unit_rate as number) : null,
      confidence: (item.confidence as number) ?? 0.5,
      reasoning: (item.reasoning as string) || '',
      sourceElementIds: ((item.source_element_labels as string[]) || []).map(
        (label: string) => elements.find((e: AIDetectedElement) => e.label === label)?.id || label,
      ),
      materialBreakdown: item.material_breakdown || undefined,
    } as AIBOQItem)),
    subtotal: null,
  }))

  for (const group of boq) {
    group.subtotal = group.items.reduce((sum, item) => sum + (item.amount ?? 0), 0)
  }

  return {
    drawing,
    boq,
    totalEstimatedCost: boq.reduce((sum, g) => sum + (g.subtotal ?? 0), 0) || null,
    currency: 'USD',
  }
}

export async function analyzeDrawing(
  imageBase64: string,
  drawingName: string,
  drawingType: string,
  pageNumber: number,
  corrections: UserCorrection[] = [],
): Promise<AIFullAnalysis> {
  const provider = getProvider()

  const prompt = buildAnalysisPrompt(drawingName, drawingType, pageNumber, corrections)

  const messages: AIMessage[] = [
    {
      role: 'user',
      content: [
        {
          type: 'image',
          source: { type: 'base64', mediaType: 'image/png', data: imageBase64 },
        },
        { type: 'text', text: prompt },
      ],
    },
  ]

  try {
    const response = await provider.analyze(messages, { maxTokens: 8192 })
    return parseAnalysisResponse(response.text)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return {
      drawing: { drawingType: '', summary: '', elements: [], dimensions: [], detectedScale: null, repeatedPatterns: [] },
      boq: [],
      totalEstimatedCost: null,
      currency: 'USD',
      error: `AI analysis failed: ${msg}`,
    }
  }
}

export async function estimateCosts(
  boqItems: { code: string; description: string; unit: string; quantity: number }[],
  projectContext: string,
): Promise<AICostEstimate[]> {
  const provider = getProvider()

  const prompt = `You are an expert construction cost estimator. Given these BOQ items, suggest unit rates.

Project context: ${projectContext}

BOQ items:
${boqItems.map(item => `- ${item.code}: ${item.description} (${item.quantity} ${item.unit})`).join('\n')}

Return JSON array (no markdown fences):
[{
  "boq_item_code": "04.03",
  "suggested_unit_rate": 150.00,
  "currency": "USD",
  "confidence": 0.7,
  "source": "Standard construction rates 2024",
  "reasoning": "Average rate for C30 reinforced concrete including formwork and placing"
}]`

  try {
    const response = await provider.analyze([{ role: 'user', content: prompt }], { maxTokens: 4096 })
    let jsonStr = response.text.trim()
    const fenced = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (fenced) jsonStr = fenced[1]
    const bracketStart = jsonStr.indexOf('[')
    if (bracketStart > 0) jsonStr = jsonStr.slice(bracketStart)

    const parsed = JSON.parse(jsonStr)
    return (parsed as Record<string, unknown>[]).map((est) => ({
      boqItemCode: (est.boq_item_code as string) || '',
      suggestedUnitRate: (est.suggested_unit_rate as number) || 0,
      currency: (est.currency as string) || 'USD',
      confidence: (est.confidence as number) || 0.5,
      source: (est.source as string) || '',
      reasoning: (est.reasoning as string) || '',
    }))
  } catch {
    return []
  }
}
