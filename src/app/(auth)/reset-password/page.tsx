'use client'

import { Suspense } from 'react'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { HardHat, Lock, Loader2, ArrowLeft, CheckCircle2, ShieldCheck } from 'lucide-react'
import { motion } from 'framer-motion'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)

  useEffect(() => {
    const code = searchParams.get('code')
    if (!code) { setSessionReady(true); return }
    const supabase = createClient()
    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) { setError('Invalid or expired reset link. Please request a new one.') }
      else { setSessionReady(true) }
    }).catch(() => {
      setError('Unable to verify reset link. Please try again.')
    })
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) { setError('Passwords do not match.'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    setLoading(true)
    setError(null)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password })
      if (error) { setError(error.message) }
      else { setSuccess(true); setTimeout(() => router.push('/login'), 2500) }
    } catch {
      setError('Unable to connect to the server. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="text-center">
        <div className="w-14 h-14 bg-[var(--color-amber)]/15 border border-[var(--color-amber)]/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 size={28} className="text-[var(--color-amber)]" />
        </div>
        <h2 className="text-white text-xl font-semibold mb-2">Password updated!</h2>
        <p className="text-[var(--color-text-muted)] text-sm mb-4">
          Your password has been changed. Redirecting to login…
        </p>
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-[var(--color-amber)] hover:opacity-80 transition-opacity text-sm font-medium"
        >
          <ArrowLeft size={14} /> Go to login
        </Link>
      </div>
    )
  }

  if (!sessionReady && !error) {
    return (
      <div className="text-center py-8">
        <Loader2 size={32} className="animate-spin text-[var(--color-amber)] mx-auto mb-4" />
        <p className="text-[var(--color-text-muted)] text-sm">Verifying reset link…</p>
      </div>
    )
  }

  if (error && !sessionReady) {
    return (
      <div className="space-y-4">
        <div className="bg-[var(--color-danger-bg)] border border-[var(--color-danger)]/30 rounded-xl px-4 py-3 text-[var(--color-danger)] text-sm">{error}</div>
        <Link
          href="/forgot-password"
          className="inline-flex items-center gap-1.5 text-[var(--color-amber)] hover:opacity-80 transition-opacity text-sm font-medium"
        >
          <ArrowLeft size={14} /> Request a new reset link
        </Link>
      </div>
    )
  }

  return (
    <>
      <h2 className="text-white text-xl font-semibold mb-1">Choose a new password</h2>
      <p className="text-[var(--color-text-muted)] text-sm mb-6">Enter your new password below.</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-[var(--color-text-secondary)] mb-1.5" htmlFor="rp-password">New Password</label>
          <div className="relative">
            <Lock size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              id="rp-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full bg-[var(--color-surface-elevated)] border border-[var(--color-border)] text-white placeholder-[var(--color-text-muted)] rounded-xl ps-10 pe-4 py-2.5 text-sm focus:outline-none focus:border-[var(--color-amber)] focus:ring-2 focus:ring-[var(--color-amber)]/30 transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-[var(--color-text-secondary)] mb-1.5" htmlFor="rp-confirm">Confirm New Password</label>
          <div className="relative">
            <Lock size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              id="rp-confirm"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="new-password"
              className="w-full bg-[var(--color-surface-elevated)] border border-[var(--color-border)] text-white placeholder-[var(--color-text-muted)] rounded-xl ps-10 pe-4 py-2.5 text-sm focus:outline-none focus:border-[var(--color-amber)] focus:ring-2 focus:ring-[var(--color-amber)]/30 transition-all"
            />
          </div>
        </div>

        {error && (
          <div className="bg-[var(--color-danger-bg)] border border-[var(--color-danger)]/30 rounded-xl px-4 py-3 text-[var(--color-danger)] text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[var(--color-amber)] hover:opacity-90 disabled:opacity-50 text-[var(--color-on-amber)] font-semibold rounded-xl py-2.5 text-sm transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
          {loading ? 'Updating…' : 'Update Password'}
        </button>
      </form>
    </>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-[#0e0e10] flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 start-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-[var(--color-amber)]/5 blur-[120px]" />
      </div>

      <motion.div
        className="relative w-full max-w-md"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-[var(--color-amber)] rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-[var(--color-amber)]/20">
            <HardHat size={28} className="text-[var(--color-on-amber)]" />
          </div>
          <h1 className="text-white text-2xl font-bold tracking-widest">ANGEL D.C.</h1>
          <p className="text-[var(--color-amber)]/70 text-xs mt-1 tracking-widest uppercase font-mono">Construction Intelligence</p>
        </div>

        <div className="bg-[var(--color-surface)] rounded-2xl p-8 border border-[var(--color-border)] shadow-2xl shadow-black/40">
          <Suspense fallback={
            <div className="text-center py-8">
              <Loader2 size={32} className="animate-spin text-[var(--color-amber)] mx-auto mb-4" />
              <p className="text-[var(--color-text-muted)] text-sm">Loading…</p>
            </div>
          }>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </motion.div>
    </div>
  )
}
