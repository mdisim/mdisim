'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Mail, Lock, Loader2, CheckCircle, ArrowRight, ShieldCheck } from 'lucide-react'
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
      <div className="min-h-screen bg-[#131315] flex items-center justify-center p-6">
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-[#ffd165]/4 blur-[120px]" />
        </div>
        <motion.div
          className="relative glass-card rounded-2xl p-8 max-w-md w-full text-center"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#ffd165]/30 to-transparent" />
          <div className="w-14 h-14 bg-[#ffd165]/10 border border-[#ffd165]/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={28} className="text-[#ffd165]" />
          </div>
          <h2 className="text-[#e5e1e4] text-xl font-semibold mb-2">Check your email</h2>
          <p className="text-[#9b8f79] text-sm">
            We sent a confirmation link to{' '}
            <strong className="text-[#e5e1e4]">{email}</strong>.{' '}
            Click it to activate your account.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-flex items-center gap-1.5 text-[#ffd165] hover:opacity-80 transition-opacity text-sm font-medium"
          >
            Back to login
          </Link>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#131315] text-[#e5e1e4] flex flex-col overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full bg-[#ffd165]/4 blur-[120px]" />
      </div>

      {/* Header */}
      <header className="w-full flex justify-between items-center px-6 py-4 z-10 relative">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#ffd165]/10 rounded-lg flex items-center justify-center border border-[#ffd165]/20">
            <span className="text-[#ffd165] font-bold text-lg leading-none">A</span>
          </div>
          <div className="flex flex-col -space-y-0.5">
            <span className="text-[#e5e1e4] font-semibold text-[22px] tracking-tight leading-none">Angel D.C.</span>
            <span className="text-[#ffd165] text-[10px] tracking-[0.2em] uppercase opacity-80 font-mono">Construction Intelligence</span>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-grow flex flex-col items-center justify-center px-6 relative z-10 py-8">
        <motion.div
          className="w-full max-w-[440px]"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="text-center mb-8">
            <h1 className="text-[36px] leading-[44px] font-semibold tracking-[-0.02em] text-[#e5e1e4]">Request Node Access</h1>
            <p className="text-[#d3c5ac] text-sm mt-2 opacity-80">Join the global structural intelligence network.</p>
          </div>

          <div className="glass-card p-8 rounded-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#ffd165]/30 to-transparent" />

            <form onSubmit={handleRegister} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="reg-email" className="block text-[#d3c5ac] text-[11px] uppercase tracking-widest font-mono opacity-70 ms-1">
                  Corporate Identity
                </label>
                <div className="relative group">
                  <Mail size={18} className="absolute start-4 top-1/2 -translate-y-1/2 text-[#9b8f79] group-focus-within:text-[#ffd165] transition-colors" />
                  <input
                    id="reg-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Work email address"
                    required
                    autoComplete="email"
                    className="w-full bg-[#0e0e10]/40 border border-[#4f4633]/20 rounded-xl py-4 ps-12 pe-4 text-sm text-[#e5e1e4] placeholder:text-[#9b8f79]/50 focus:outline-none focus:ring-1 focus:ring-[#ffd165]/50 focus:border-[#ffd165]/50 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="reg-password" className="block text-[#d3c5ac] text-[11px] uppercase tracking-widest font-mono opacity-70 ms-1">
                  Security Key
                </label>
                <div className="relative group">
                  <Lock size={18} className="absolute start-4 top-1/2 -translate-y-1/2 text-[#9b8f79] group-focus-within:text-[#ffd165] transition-colors" />
                  <input
                    id="reg-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    minLength={8}
                    required
                    autoComplete="new-password"
                    className="w-full bg-[#0e0e10]/40 border border-[#4f4633]/20 rounded-xl py-4 ps-12 pe-4 text-sm text-[#e5e1e4] placeholder:text-[#9b8f79]/50 focus:outline-none focus:ring-1 focus:ring-[#ffd165]/50 focus:border-[#ffd165]/50 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="reg-confirm" className="block text-[#d3c5ac] text-[11px] uppercase tracking-widest font-mono opacity-70 ms-1">
                  Confirm Key
                </label>
                <div className="relative group">
                  <Lock size={18} className="absolute start-4 top-1/2 -translate-y-1/2 text-[#9b8f79] group-focus-within:text-[#ffd165] transition-colors" />
                  <input
                    id="reg-confirm"
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Repeat security key"
                    required
                    autoComplete="new-password"
                    className="w-full bg-[#0e0e10]/40 border border-[#4f4633]/20 rounded-xl py-4 ps-12 pe-4 text-sm text-[#e5e1e4] placeholder:text-[#9b8f79]/50 focus:outline-none focus:ring-1 focus:ring-[#ffd165]/50 focus:border-[#ffd165]/50 transition-all"
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
                className="w-full bg-[#eab308] text-[#604700] font-semibold text-base py-4 rounded-xl shadow-lg premium-glow disabled:opacity-50 active:scale-[0.96] transition-all relative overflow-hidden group"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
                  {loading ? 'Creating access…' : 'Create Account →'}
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              </button>
            </form>

            <div className="mt-8 flex justify-between items-center px-2">
              <p className="text-[11px] text-[#d3c5ac]">
                Already registered?{' '}
                <Link href="/login" className="text-[#ffd165] font-semibold hover:underline">
                  Access Dashboard
                </Link>
              </p>
              <div className="flex items-center gap-2 opacity-40">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] text-[#9b8f79] font-mono">SECURE-V1</span>
              </div>
            </div>
          </div>
        </motion.div>
      </main>

      <footer className="w-full p-6 z-10 relative">
        <p className="text-[11px] text-[#d3c5ac]/30 flex items-center justify-center gap-3 tracking-widest text-center font-mono">
          <ShieldCheck size={16} />
          <span>ANGEL D.C. CONSTRUCTION INTELLIGENCE · ENTERPRISE PLATFORM · SECURE NODE v1.2</span>
        </p>
      </footer>
    </div>
  )
}
