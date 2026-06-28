export interface AIMessage {
  role: 'user' | 'assistant'
  content: string | AIMessagePart[]
}

export type AIMessagePart =
  | { type: 'text'; text: string }
  | { type: 'image'; source: { type: 'base64'; mediaType: string; data: string } }

export interface AIProviderResponse {
  text: string
  usage?: { inputTokens: number; outputTokens: number }
}

export interface AIProvider {
  name: string
  analyze(messages: AIMessage[], options?: { maxTokens?: number }): Promise<AIProviderResponse>
}

export class AnthropicProvider implements AIProvider {
  name = 'anthropic'

  async analyze(messages: AIMessage[], options?: { maxTokens?: number }): Promise<AIProviderResponse> {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not configured')
    const Anthropic = (await import('@anthropic-ai/sdk')).default
    const client = new Anthropic({ apiKey })

    const apiMessages = messages.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: typeof m.content === 'string'
        ? m.content
        : m.content.map(part => {
            if (part.type === 'text') return { type: 'text' as const, text: part.text }
            return {
              type: 'image' as const,
              source: {
                type: 'base64' as const,
                media_type: part.source.mediaType as 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp',
                data: part.source.data,
              },
            }
          }),
    }))

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: options?.maxTokens ?? 8192,
      thinking: { type: 'adaptive' },
      messages: apiMessages,
    })

    const textBlock = response.content.find(b => b.type === 'text')
    return {
      text: textBlock && textBlock.type === 'text' ? textBlock.text : '',
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    }
  }
}

export function getProvider(): AIProvider {
  const providerName = process.env.AI_PROVIDER ?? 'anthropic'
  switch (providerName) {
    case 'anthropic':
      return new AnthropicProvider()
    default:
      return new AnthropicProvider()
  }
}
