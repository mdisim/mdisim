'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { HardHat, Mail, Lock, Loader2, CheckCircle, ArrowRight, User } from 'lucide-react'
import { motion } from 'framer-motion'
import { signUp } from '@/app/actions/auth'

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match'); return }
    setLoading(true)
    setError(null)
    try {
      const result = await signUp(email, password)
      if (result.error) { setError(result.error); setLoading(false) }
      else if (result.confirmed) { router.push('/onboarding') }
      else { setSuccess(true) }
    } catch {
      setError('Unable to connect to the server. Please check your connection and try again.')
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#0e0e10] flex items-center justify-center p-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 start-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-[var(--color-amber)]/5 blur-[120px]" />
        </div>
        <motion.div
          className="relative bg-[var(--color-surface)] rounded-2xl p-8 max-w-md w-full text-center border border-[var(--color-border)] shadow-2xl shadow-black/40"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="w-14 h-14 bg-[var(--color-amber)]/15 border border-[var(--color-amber)]/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={28} className="text-[var(--color-amber)]" />
          </div>
          <h2 className="text-white text-xl font-semibold mb-2">Check your email</h2>
          <p className="text-[var(--color-text-muted)] text-sm">
            We sent a confirmation link to{' '}
            <strong className="text-white">{email}</strong>.{' '}
            Click it to activate your account.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-flex items-center gap-1.5 text-[var(--color-amber)] hover:opacity-80 transition-opacity text-sm font-medium"
          >
            Back to login
          </Link>
        </motion.div>
      </div>
    )
  }

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
          <h2 className="text-white text-xl font-semibold mb-1">Create account</h2>
          <p className="text-[var(--color-text-muted)] text-sm mb-6">Start managing your projects</p>

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm text-[var(--color-text-secondary)] mb-1.5" htmlFor="reg-email">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                <input
                  id="reg-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  className="w-full bg-[var(--color-surface-elevated)] border border-[var(--color-border)] text-white placeholder-[var(--color-text-muted)] rounded-xl ps-10 pe-4 py-2.5 text-sm focus:outline-none focus:border-[var(--color-amber)] focus:ring-2 focus:ring-[var(--color-amber)]/30 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-[var(--color-text-secondary)] mb-1.5" htmlFor="reg-password">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                <input
                  id="reg-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  minLength={8}
                  required
                  autoComplete="new-password"
                  className="w-full bg-[var(--color-surface-elevated)] border border-[var(--color-border)] text-white placeholder-[var(--color-text-muted)] rounded-xl ps-10 pe-4 py-2.5 text-sm focus:outline-none focus:border-[var(--color-amber)] focus:ring-2 focus:ring-[var(--color-amber)]/30 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-[var(--color-text-secondary)] mb-1.5" htmlFor="reg-confirm">Confirm Password</label>
              <div className="relative">
                <Lock size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                <input
                  id="reg-confirm"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repeat password"
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
              {loading ? <Loader2 size={16} className="animate-spin" /> : <User size={16} />}
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-[var(--color-text-muted)] mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-[var(--color-amber)] hover:opacity-80 transition-opacity font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
