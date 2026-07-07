'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Mail, Lock, Loader2, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { signIn } from '@/app/actions/auth'
import { ScaleMark } from '@/components/icons/marks'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const result = await signIn(email, password)
      if (result.error) { setError(result.error); setLoading(false) }
      else { router.push('/projects'); router.refresh() }
    } catch {
      setError('Unable to connect to the server. Please check your connection and try again.')
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
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">Welcome back</h1>
            <p className="text-[var(--color-text-muted)] text-sm mt-1.5">Sign in to pick up where you left off.</p>
          </div>

          <div className="p-7 rounded-[var(--radius-2xl)] bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[var(--shadow-lg)]">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="login-email" className="block text-[12px] font-medium text-[var(--color-text-secondary)]">
                  Email
                </label>
                <div className="relative group">
                  <Mail size={16} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] group-focus-within:text-[var(--color-brand)] transition-colors" />
                  <input
                    id="login-email"
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
                <div className="flex justify-between items-center">
                  <label htmlFor="login-password" className="text-[12px] font-medium text-[var(--color-text-secondary)]">
                    Password
                  </label>
                  <Link href="/forgot-password" className="text-[12px] text-[var(--color-text-link)] hover:text-[var(--color-text-link-hover)] transition-colors">
                    Forgot?
                  </Link>
                </div>
                <div className="relative group">
                  <Lock size={16} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] group-focus-within:text-[var(--color-brand)] transition-colors" />
                  <input
                    id="login-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
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
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>

            <p className="mt-6 text-center text-[13px] text-[var(--color-text-muted)]">
              New to Angel D.C.?{' '}
              <Link href="/register" className="text-[var(--color-text-link)] font-medium hover:text-[var(--color-text-link-hover)]">
                Create an account
              </Link>
            </p>
          </div>
        </motion.div>
      </main>
    </div>
  )
}
