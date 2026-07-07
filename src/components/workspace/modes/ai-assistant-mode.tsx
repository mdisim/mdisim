'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { useWorkspace } from '../workspace-context'
import { sendCopilotMessage } from '@/app/actions/ai-copilot'
import type { CopilotMessage } from '@/app/actions/ai-copilot'
import { Sparkles, Send, Loader2, Bot, User, AlertCircle } from 'lucide-react'

const SUGGESTIONS = [
  'Summarise this project\'s cost position',
  'Which BOQ items have no measurement source?',
  'Draft a variation order for the current selection',
  'Check quantities against the drawings for mismatches',
]

export function AiAssistantMode({ projectId }: { projectId: string }) {
  const { selection } = useWorkspace()
  const [messages, setMessages] = useState<CopilotMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  const contextLabel =
    selection.type === 'boq' ? `BOQ · ${selection.boqItem?.description}`
    : selection.type === 'drawing' ? `Drawing · ${selection.drawing?.name}`
    : selection.type === 'measurement' ? `Measurement · ${selection.measurement?.description}`
    : null

  const send = useCallback(async (text: string) => {
    if (!text.trim() || loading) return
    setError(null)
    const userMsg: CopilotMessage = { id: `u-${Date.now()}`, role: 'user', content: text.trim(), timestamp: new Date().toISOString() }
    const updated = [...messages, userMsg]
    setMessages(updated)
    setInput('')
    setLoading(true)
    try {
      const { reply, error: err } = await sendCopilotMessage(projectId, 'workspace-ai', updated, text.trim())
      if (err) setError(err)
      else setMessages(prev => [...prev, { id: `a-${Date.now()}`, role: 'assistant', content: reply, timestamp: new Date().toISOString() }])
    } catch {
      setError('Failed to reach the assistant')
    } finally {
      setLoading(false)
    }
  }, [loading, messages, projectId])

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto w-full">
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center gap-4">
            <div className="w-11 h-11 rounded-[var(--radius-lg)] bg-[var(--color-intel-tint)] flex items-center justify-center text-[var(--color-intel)]">
              <Sparkles size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--color-text)]">Ask about this project</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1 max-w-sm">Grounded in this project&apos;s drawings, measurements, BOQ, rates and payment history — nothing is fabricated.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-start text-[12px] px-3 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)]"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map(m => (
          <div key={m.id} className={cn('flex gap-2.5', m.role === 'user' && 'flex-row-reverse')}>
            <div className={cn(
              'w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5',
              m.role === 'user' ? 'bg-[var(--color-surface-active)] text-[var(--color-text-secondary)]' : 'bg-[var(--color-intel-tint)] text-[var(--color-intel)]'
            )}>
              {m.role === 'user' ? <User size={13} /> : <Bot size={13} />}
            </div>
            <div className={cn(
              'max-w-[80%] px-3.5 py-2.5 rounded-[var(--radius-lg)] text-[13px] leading-relaxed whitespace-pre-wrap',
              m.role === 'user' ? 'bg-[var(--color-brand)] text-white' : 'surface-elevated text-[var(--color-text)]'
            )}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-[var(--color-text-muted)] text-[12px] ps-9">
            <Loader2 size={13} className="animate-spin" /> Thinking…
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 text-[var(--color-danger)] text-[12px] ps-9">
            <AlertCircle size={13} /> {error}
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="border-t border-[var(--color-border)] p-3 shrink-0">
        {contextLabel && (
          <div className="mb-2 text-[10px] font-mono text-[var(--color-intel)] bg-[var(--color-intel-tint)] inline-flex px-2 py-0.5 rounded-full">
            Context: {contextLabel}
          </div>
        )}
        <form
          onSubmit={e => { e.preventDefault(); send(input) }}
          className="flex items-center gap-2"
        >
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask the AI engineer…"
            className="flex-1 px-3.5 py-2.5 text-[13px] rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-brand)] focus:shadow-[var(--shadow-focus)]"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="p-2.5 rounded-[var(--radius-md)] bg-[var(--color-brand)] text-white disabled:opacity-40 hover:bg-[var(--color-brand-strong)]"
            aria-label="Send"
          >
            <Send size={15} />
          </button>
        </form>
      </div>
    </div>
  )
}
