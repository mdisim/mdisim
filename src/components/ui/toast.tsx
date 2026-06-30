'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ToastVariant = 'success' | 'danger' | 'warning' | 'info' | 'default'

export interface ToastOptions {
  title: string
  description?: string
  variant?: ToastVariant
  duration?: number
}

interface ToastItem extends Required<Pick<ToastOptions, 'title' | 'variant' | 'duration'>> {
  id: string
  description?: string
}

interface ToastContextType {
  toast: (options: ToastOptions) => string
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

const DEFAULT_DURATION = 4000

const VARIANT_CONFIG: Record<
  ToastVariant,
  { icon: typeof CheckCircle2; accent: string; iconBg: string; iconColor: string }
> = {
  success: {
    icon: CheckCircle2,
    accent: 'var(--color-success)',
    iconBg: 'var(--color-success-bg)',
    iconColor: 'var(--color-success)',
  },
  danger: {
    icon: XCircle,
    accent: 'var(--color-danger)',
    iconBg: 'var(--color-danger-bg)',
    iconColor: 'var(--color-danger)',
  },
  warning: {
    icon: AlertTriangle,
    accent: 'var(--color-warning)',
    iconBg: 'var(--color-warning-bg)',
    iconColor: 'var(--color-warning)',
  },
  info: {
    icon: Info,
    accent: 'var(--color-info)',
    iconBg: 'var(--color-info-bg)',
    iconColor: 'var(--color-info)',
  },
  default: {
    icon: Info,
    accent: 'var(--color-border-strong)',
    iconBg: 'var(--color-surface-hover)',
    iconColor: 'var(--color-text-secondary)',
  },
}

function useIsRTL() {
  const [isRTL, setIsRTL] = useState(false)

  useEffect(() => {
    const update = () => setIsRTL(document.documentElement.dir === 'rtl')
    update()
    const observer = new MutationObserver(update)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['dir'] })
    return () => observer.disconnect()
  }, [])

  return isRTL
}

function ToastCard({ toastItem, onDismiss }: { toastItem: ToastItem; onDismiss: (id: string) => void }) {
  const { icon: Icon, accent, iconBg, iconColor } = VARIANT_CONFIG[toastItem.variant]
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (toastItem.duration <= 0) return
    timerRef.current = setTimeout(() => onDismiss(toastItem.id), toastItem.duration)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [toastItem.id, toastItem.duration, onDismiss])

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.95, transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] } }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      role="status"
      aria-live="polite"
      className={cn(
        'glass-card pointer-events-auto relative flex w-full max-w-sm items-start gap-3 overflow-hidden rounded-2xl border p-4 pe-3',
        'bg-[var(--color-surface-elevated)]',
        'border-[var(--color-border)]'
      )}
      style={{
        boxShadow: 'var(--shadow-dropdown)',
        borderRadius: 'var(--radius-xl)',
      }}
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-0 start-0 w-1"
        style={{ background: accent }}
      />
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
        style={{ background: iconBg }}
      >
        <Icon size={18} style={{ color: iconColor }} />
      </div>
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="text-sm font-semibold text-[var(--color-text)]">{toastItem.title}</p>
        {toastItem.description && (
          <p className="mt-0.5 text-[13px] leading-snug text-[var(--color-text-secondary)]">
            {toastItem.description}
          </p>
        )}
      </div>
      <button
        onClick={() => onDismiss(toastItem.id)}
        aria-label="Close notification"
        title="Close"
        className="ms-1 shrink-0 rounded-lg p-1 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
      >
        <X size={16} />
      </button>
    </motion.div>
  )
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const isRTL = useIsRTL()

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback((options: ToastOptions) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    const item: ToastItem = {
      id,
      title: options.title,
      description: options.description,
      variant: options.variant ?? 'default',
      duration: options.duration ?? DEFAULT_DURATION,
    }
    setToasts((prev) => [...prev, item])
    return id
  }, [])

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      <div
        className={cn(
          'pointer-events-none fixed z-[var(--z-toast)] flex w-full max-w-sm flex-col gap-2 p-4',
          isRTL ? 'bottom-0 start-0' : 'bottom-0 end-0'
        )}
        style={{ zIndex: 'var(--z-toast)' as unknown as number }}
      >
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <ToastCard key={t.id} toastItem={t} onDismiss={dismiss} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
