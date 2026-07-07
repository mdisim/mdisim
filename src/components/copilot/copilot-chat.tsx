'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  MessageSquare,
  X,
  Send,
  Loader2,
  Bot,
  User,
  Sparkles,
  ChevronDown,
  Minimize2,
  Maximize2,
  Search,
  Copy,
  AlertTriangle,
  FileText,
  DollarSign,
  Ruler,
  BarChart3,
  Lightbulb,
  CheckCircle,
  GitBranch,
  Receipt,
  Lock,
  Users,
  GitCommit,
  Trash2,
  Settings,
  Key,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { sendCopilotMessage } from '@/app/actions/ai-copilot'
import type { CopilotMessage } from '@/app/actions/ai-copilot'
import { getCopilotQuickActions } from '@/lib/ai/quick-actions'
import type { QuickAction } from '@/lib/ai/quick-actions'

interface CopilotChatProps {
  projectId: string
  projectName: string
  currentPage: string
}

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  search: Search,
  copy: Copy,
  alert: AlertTriangle,
  file: FileText,
  dollar: DollarSign,
  lightbulb: Lightbulb,
  ruler: Ruler,
  trending: BarChart3,
  'git-branch': GitBranch,
  receipt: Receipt,
  lock: Lock,
  'alert-triangle': AlertTriangle,
  'bar-chart': BarChart3,
  users: Users,
  'git-commit': GitCommit,
  check: CheckCircle,
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatMessage(text: string): string {
  const escaped = escapeHtml(text)
  return escaped
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code class="px-1 py-0.5 bg-[var(--color-surface-elevated)] dark:bg-[var(--color-surface-elevated)] rounded text-[11px] font-mono">$1</code>')
    .replace(/^### (.+)$/gm, '<h3 class="font-bold text-sm mt-3 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="font-bold text-base mt-3 mb-1">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="font-bold text-lg mt-3 mb-1">$1</h1>')
    .replace(/^- (.+)$/gm, '<li class="ml-3 list-disc text-[12px] leading-relaxed">$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-3 list-decimal text-[12px] leading-relaxed">$2</li>')
    .replace(/\n{2,}/g, '<br/><br/>')
    .replace(/\n/g, '<br/>')
}

function QuickActionButton({ action, onClick }: { action: QuickAction; onClick: () => void }) {
  const IconComp = ICON_MAP[action.icon] ?? Sparkles
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2 text-left text-[11px] bg-white dark:bg-[var(--color-surface-elevated)] border border-[var(--color-border)] dark:border-[var(--color-border)] rounded-lg hover:border-violet-300 dark:hover:border-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/10 transition-all group"
    >
      <IconComp size={14} className="text-violet-500 shrink-0 group-hover:scale-110 transition-transform" />
      <span className="text-[var(--color-text-secondary)] dark:text-[var(--color-text-secondary)]">{action.label}</span>
    </button>
  )
}

function MessageBubble({ message }: { message: CopilotMessage }) {
  const isUser = message.role === 'user'
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={cn('flex gap-2', isUser ? 'flex-row-reverse' : 'flex-row')}>
      <div className={cn(
        'w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5',
        isUser ? 'bg-[var(--color-info-bg)] dark:bg-[var(--color-info-bg)]/30' : 'bg-gradient-to-br from-violet-100 to-[var(--color-info)] dark:from-violet-900/30 dark:to-[var(--color-info)]/30',
      )}>
        {isUser ? <User size={14} className="text-[var(--color-info)]" /> : <Bot size={14} className="text-violet-600" />}
      </div>
      <div className={cn(
        'max-w-[85%] rounded-xl px-3 py-2 text-[12px] leading-relaxed relative group',
        isUser
          ? 'bg-[var(--color-info-bg)] text-white rounded-tr-sm'
          : 'bg-white dark:bg-[var(--color-surface-elevated)] border border-[var(--color-border)] dark:border-[var(--color-border)] text-[var(--color-text-secondary)] dark:text-[var(--color-text)] rounded-tl-sm',
      )}>
        {isUser ? (
          <p>{message.content}</p>
        ) : (
          <div dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }} />
        )}
        {!isUser && (
          <button
            onClick={handleCopy}
            className="absolute top-1 right-1 p-1 opacity-0 group-hover:opacity-100 text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-opacity"
            title="Copy"
          >
            {copied ? <CheckCircle size={12} className="text-emerald-500" /> : <Copy size={12} />}
          </button>
        )}
      </div>
    </div>
  )
}

function ApiKeyDialog({ isOpen, onClose, onSuccess }: { isOpen: boolean; onClose: () => void; onSuccess: () => void }) {
  const [apiKey, setApiKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [dialogError, setDialogError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSave = async () => {
    if (!apiKey.startsWith('sk-ant-')) {
      setDialogError('API key must start with sk-ant-')
      return
    }
    setSaving(true)
    setDialogError(null)
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey }),
      })
      const data = await res.json()
      if (!res.ok) {
        setDialogError(data.error || 'Failed to save API key')
        return
      }
      setApiKey('')
      onSuccess()
      onClose()
    } catch {
      setDialogError('Failed to save API key. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/30 backdrop-blur-sm rounded-2xl">
      <div className="bg-white dark:bg-[var(--color-surface-elevated)] rounded-xl shadow-lg mx-4 w-full max-w-sm border border-[var(--color-border)] dark:border-[var(--color-border)]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)] dark:border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            <Key size={16} className="text-violet-500" />
            <h3 className="text-sm font-semibold text-[var(--color-text)] dark:text-[var(--color-text)]">API Key Setup</h3>
          </div>
          <button onClick={onClose} className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] dark:hover:text-[var(--color-text-secondary)]">
            <X size={14} />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <p className="text-[11px] text-[var(--color-text-muted)] dark:text-[var(--color-text-muted)]">
            Enter your Anthropic API key to use the AI Copilot. Your key is stored securely in an HTTP-only cookie.
          </p>
          <input
            type="password"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder="sk-ant-..."
            className="w-full px-3 py-2 text-sm bg-[var(--color-surface-elevated)] dark:bg-[var(--color-surface)] border border-[var(--color-border)] dark:border-[var(--color-border)] rounded-lg outline-none focus:border-violet-400 dark:focus:border-violet-600 text-[var(--color-text)] dark:text-[var(--color-text)] placeholder-slate-400"
            onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
          />
          {dialogError && (
            <p className="text-[11px] text-red-500">{dialogError}</p>
          )}
          <button
            onClick={handleSave}
            disabled={!apiKey.trim() || saving}
            className="w-full py-2 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 disabled:bg-[var(--color-surface)] dark:disabled:bg-[var(--color-surface-hover)] rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Key size={14} />}
            {saving ? 'Saving...' : 'Save API Key'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function CopilotChat({ projectId, projectName, currentPage }: CopilotChatProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [messages, setMessages] = useState<CopilotMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false)
  const [apiKeyConfigured, setApiKeyConfigured] = useState<boolean | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const quickActions = getCopilotQuickActions(currentPage)

  // Check API key status on mount
  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => setApiKeyConfigured(data.configured))
      .catch(() => setApiKeyConfigured(false))
  }, [])

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return

    // If key not configured, show setup dialog
    if (apiKeyConfigured === false) {
      setShowApiKeyDialog(true)
      return
    }

    setError(null)

    const userMsg: CopilotMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toISOString(),
    }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsLoading(true)

    try {
      const { reply, error: err } = await sendCopilotMessage(projectId, currentPage, [...messages, userMsg], text.trim())
      if (err) {
        setError(err)
      } else {
        const assistantMsg: CopilotMessage = {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: reply,
          timestamp: new Date().toISOString(),
        }
        setMessages(prev => [...prev, assistantMsg])
      }
    } catch {
      setError('Failed to get response. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, messages, projectId, currentPage, apiKeyConfigured])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const handleClearChat = () => {
    setMessages([])
    setError(null)
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-violet-600 to-[var(--color-info)] text-white rounded-full shadow-lg hover:shadow-xl hover:from-violet-700 hover:to-[var(--color-info)] transition-all group"
        title="AI Copilot"
      >
        <div className="relative">
          <Bot size={22} />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-violet-600 group-hover:border-violet-700" />
        </div>
        <span className="text-sm font-medium hidden sm:inline">AI Copilot</span>
      </button>
    )
  }

  return (
    <div
      className={cn(
        'fixed z-50 bg-white dark:bg-[var(--color-surface)] border border-[var(--color-border)] dark:border-[var(--color-border)] shadow-2xl flex flex-col transition-all duration-200',
        isExpanded
          ? 'inset-4 rounded-2xl'
          : 'bottom-6 right-6 w-[420px] h-[600px] max-h-[80vh] rounded-2xl',
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)] dark:border-[var(--color-border)] bg-gradient-to-r from-violet-50 to-[var(--color-info)] dark:from-violet-900/20 dark:to-[var(--color-info)]/20 rounded-t-2xl">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-[var(--color-info)] flex items-center justify-center">
              <Bot size={18} className="text-white" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white dark:border-[var(--color-border)]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--color-text)] dark:text-[var(--color-text)]">AI Copilot</h3>
            <p className="text-[10px] text-[var(--color-text-muted)] dark:text-[var(--color-text-muted)] truncate max-w-[200px]">{projectName}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setShowApiKeyDialog(true)} className="p-1.5 text-[var(--color-text-muted)] hover:text-violet-500 transition-colors" title="API Key Settings">
            <Settings size={14} />
          </button>
          {messages.length > 0 && (
            <button onClick={handleClearChat} className="p-1.5 text-[var(--color-text-muted)] hover:text-red-500 transition-colors" title="Clear chat">
              <Trash2 size={14} />
            </button>
          )}
          <button onClick={() => setIsExpanded(!isExpanded)} className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] dark:hover:text-[var(--color-text-secondary)] transition-colors" title={isExpanded ? 'Minimize' : 'Expand'}>
            {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
          <button onClick={() => { setIsOpen(false); setIsExpanded(false) }} className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] dark:hover:text-[var(--color-text-secondary)] transition-colors">
            <ChevronDown size={16} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center pt-4 pb-2">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-100 to-[var(--color-info)] dark:from-violet-900/20 dark:to-[var(--color-info)]/20 flex items-center justify-center mb-3">
              <Sparkles size={26} className="text-violet-500" />
            </div>
            <h4 className="text-sm font-semibold text-[var(--color-text)] dark:text-[var(--color-text)] mb-1">How can I help?</h4>
            <p className="text-[11px] text-[var(--color-text-muted)] dark:text-[var(--color-text-muted)] text-center max-w-[280px] mb-4">
              I have full context of this project — drawings, BOQ, measurements, costs, contracts, and more. Ask me anything.
            </p>

            <div className="w-full space-y-1.5">
              <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-medium px-1">Quick actions</p>
              {quickActions.map(action => (
                <QuickActionButton
                  key={action.id}
                  action={action}
                  onClick={() => sendMessage(action.prompt)}
                />
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {isLoading && (
          <div className="flex gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-100 to-[var(--color-info)] dark:from-violet-900/30 dark:to-[var(--color-info)]/30 flex items-center justify-center shrink-0">
              <Bot size={14} className="text-violet-600" />
            </div>
            <div className="bg-white dark:bg-[var(--color-surface-elevated)] border border-[var(--color-border)] dark:border-[var(--color-border)] rounded-xl rounded-tl-sm px-3 py-2">
              <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
                <Loader2 size={14} className="animate-spin text-violet-500" />
                <span>Analyzing project data...</span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg">
            <AlertTriangle size={14} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions after conversation */}
      {messages.length > 0 && !isLoading && (
        <div className="px-3 pb-1 flex gap-1.5 overflow-x-auto">
          {quickActions.slice(0, 3).map(action => (
            <button
              key={action.id}
              onClick={() => sendMessage(action.prompt)}
              className="shrink-0 px-2 py-1 text-[10px] text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 rounded-full hover:bg-violet-100 dark:hover:bg-violet-900/40 transition-colors"
            >
              {action.label}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-[var(--color-border)] dark:border-[var(--color-border)]">
        <div className="flex items-end gap-2 bg-[var(--color-surface-elevated)] dark:bg-[var(--color-surface-elevated)] rounded-xl border border-[var(--color-border)] dark:border-[var(--color-border)] focus-within:border-violet-300 dark:focus-within:border-violet-600 transition-colors">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your project..."
            rows={1}
            className="flex-1 bg-transparent px-3 py-2.5 text-sm text-[var(--color-text)] dark:text-[var(--color-text)] placeholder-slate-400 resize-none outline-none max-h-24"
            style={{ minHeight: '40px' }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
            className="p-2.5 text-white bg-violet-600 hover:bg-violet-700 disabled:bg-[var(--color-surface)] dark:disabled:bg-[var(--color-surface-hover)] rounded-lg mr-1 mb-1 transition-colors"
          >
            <Send size={16} />
          </button>
        </div>
        <p className="text-[9px] text-[var(--color-text-muted)] text-center mt-1.5">
          AI may make mistakes. Verify important engineering data.
        </p>
      </div>

      {/* API Key Setup Dialog */}
      <ApiKeyDialog
        isOpen={showApiKeyDialog}
        onClose={() => setShowApiKeyDialog(false)}
        onSuccess={() => setApiKeyConfigured(true)}
      />
    </div>
  )
}
