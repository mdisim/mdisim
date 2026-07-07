'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Mail, Lock, Loader2, CheckCircle, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { signUp } from '@/app/actions/auth'
import { ScaleMark } from '@/components/icons/marks'

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
      else if (result.confirmed) { router.push('/projects') }
      else { setSuccess(true) }
    } catch {
      setError('Unable to connect to the server. Please check your connection and try again.')
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-6">
        <motion.div
          className="rounded-[var(--radius-2xl)] bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[var(--shadow-lg)] p-8 max-w-md w-full text-center"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="w-14 h-14 bg-[var(--color-success-tint)] rounded-[var(--radius-2xl)] flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={26} className="text-[var(--color-success)]" />
          </div>
          <h2 className="text-lg font-semibold text-[var(--foreground)] mb-2">Check your email</h2>
          <p className="text-[var(--color-text-muted)] text-sm">
            We sent a confirmation link to <strong className="text-[var(--foreground)]">{email}</strong>. Click it to activate your account.
          </p>
          <Link href="/login" className="mt-6 inline-block text-[var(--color-text-link)] hover:text-[var(--color-text-link-hover)] text-sm font-medium">
            Back to sign in
          </Link>
        </motion.div>
      </div>
    )
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
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">Create your account</h1>
            <p className="text-[var(--color-text-muted)] text-sm mt-1.5">Set up a project workspace in under a minute.</p>
          </div>

          <div className="p-7 rounded-[var(--radius-2xl)] bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[var(--shadow-lg)]">
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="reg-email" className="block text-[12px] font-medium text-[var(--color-text-secondary)]">Email</label>
                <div className="relative group">
                  <Mail size={16} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] group-focus-within:text-[var(--color-brand)] transition-colors" />
                  <input
                    id="reg-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    required
                    autoComplete="email"
                    className="w-full bg-[var(--color-surface-sunken)] border border-[var(--color-border)] rounded-[var(--radius-lg)] py-2.5 ps-10 pe-3.5 text-sm text-[var(--foreground)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] focus:border-[var(--color-border-focus)] transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="reg-password" className="block text-[12px] font-medium text-[var(--color-text-secondary)]">Password</label>
                <div className="relative group">
                  <Lock size={16} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] group-focus-within:text-[var(--color-brand)] transition-colors" />
                  <input
                    id="reg-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    minLength={8}
                    required
                    autoComplete="new-password"
                    className="w-full bg-[var(--color-surface-sunken)] border border-[var(--color-border)] rounded-[var(--radius-lg)] py-2.5 ps-10 pe-3.5 text-sm text-[var(--foreground)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] focus:border-[var(--color-border-focus)] transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="reg-confirm" className="block text-[12px] font-medium text-[var(--color-text-secondary)]">Confirm password</label>
                <div className="relative group">
                  <Lock size={16} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] group-focus-within:text-[var(--color-brand)] transition-colors" />
                  <input
                    id="reg-confirm"
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Repeat password"
                    required
                    autoComplete="new-password"
                    className="w-full bg-[var(--color-surface-sunken)] border border-[var(--color-border)] rounded-[var(--radius-lg)] py-2.5 ps-10 pe-3.5 text-sm text-[var(--foreground)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] focus:border-[var(--color-border-focus)] transition-all"
                  />
                </div>
              </div>

              {error && (
                <div className="bg-[var(--color-danger-tint)] border border-[var(--color-danger)]/30 rounded-[var(--radius-lg)] px-3.5 py-2.5 text-[var(--color-danger)] text-[13px]">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[var(--color-brand)] text-white font-semibold text-sm py-3 rounded-[var(--radius-lg)] hover:bg-[var(--color-brand-strong)] disabled:opacity-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                {loading ? 'Creating account…' : 'Create account'}
              </button>
            </form>

            <p className="mt-6 text-center text-[13px] text-[var(--color-text-muted)]">
              Already have an account?{' '}
              <Link href="/login" className="text-[var(--color-text-link)] font-medium hover:text-[var(--color-text-link-hover)]">
                Sign in
              </Link>
            </p>
          </div>
        </motion.div>
      </main>
    </div>
  )
}
