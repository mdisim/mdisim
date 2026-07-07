'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Mail, ArrowLeft, CheckCircle2, Loader2, Send } from 'lucide-react'
import { motion } from 'framer-motion'
import { ScaleMark } from '@/components/icons/marks'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) { setError(error.message) }
      else { setSent(true) }
    } catch {
      setError('Unable to connect to the authentication service. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col">
      <header className="w-full flex items-center px-6 py-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[var(--radius-md)] bg-[var(--color-brand-tint)] flex items-center justify-center">
            <ScaleMark size={16} className="text-[var(--color-brand)]" />
          </div>
          <span className="font-bold text-[15px] tracking-tight text-[var(--foreground)]">Angel D.C.</span>
        </div>
      </header>

      <main className="flex-grow flex flex-col items-center justify-center px-6 py-8">
        <motion.div
          className="w-full max-w-[400px]"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          {sent ? (
            <div className="p-7 rounded-[var(--radius-2xl)] bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[var(--shadow-lg)] text-center">
              <div className="w-14 h-14 bg-[var(--color-success-tint)] rounded-[var(--radius-2xl)] flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={26} className="text-[var(--color-success)]" />
              </div>
              <h2 className="text-lg font-semibold text-[var(--foreground)] mb-2">Check your email</h2>
              <p className="text-[var(--color-text-muted)] text-sm mb-6">
                We sent a password reset link to <strong className="text-[var(--foreground)]">{email}</strong>. Follow the instructions there to continue.
              </p>
              <Link href="/login" className="inline-flex items-center gap-1.5 text-[var(--color-text-link)] hover:text-[var(--color-text-link-hover)] text-sm font-medium">
                <ArrowLeft size={14} /> Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">Reset your password</h1>
                <p className="text-[var(--color-text-muted)] text-sm mt-1.5">We'll email you a link to choose a new one.</p>
              </div>

              <div className="p-7 rounded-[var(--radius-2xl)] bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[var(--shadow-lg)]">
                {error && (
                  <div className="mb-4 bg-[var(--color-danger-tint)] border border-[var(--color-danger)]/30 rounded-[var(--radius-lg)] px-3.5 py-2.5 text-[var(--color-danger)] text-[13px]">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label htmlFor="fp-email" className="block text-[12px] font-medium text-[var(--color-text-secondary)]">Email</label>
                    <div className="relative group">
                      <Mail size={16} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] group-focus-within:text-[var(--color-brand)] transition-colors" />
                      <input
                        id="fp-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder="you@company.com"
                        autoComplete="email"
                        className="w-full bg-[var(--color-surface-sunken)] border border-[var(--color-border)] rounded-[var(--radius-lg)] py-2.5 ps-10 pe-3.5 text-sm text-[var(--foreground)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] focus:border-[var(--color-border-focus)] transition-all"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[var(--color-brand)] text-white font-semibold text-sm py-3 rounded-[var(--radius-lg)] hover:bg-[var(--color-brand-strong)] disabled:opacity-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    {loading ? 'Sending…' : 'Send reset link'}
                  </button>
                </form>

                <div className="mt-6 text-center">
                  <Link href="/login" className="inline-flex items-center gap-1.5 text-[13px] text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors">
                    <ArrowLeft size={13} /> Back to sign in
                  </Link>
                </div>
              </div>
            </>
          )}
        </motion.div>
      </main>
    </div>
  )
}
