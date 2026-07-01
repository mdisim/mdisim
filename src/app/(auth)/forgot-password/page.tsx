'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { LayoutGrid, ArrowLeft, CheckCircle2, Loader2, Send, ShieldCheck } from 'lucide-react'
import { motion } from 'framer-motion'

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
    <div className="min-h-screen bg-[#131315] text-[#e5e1e4] flex flex-col overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full bg-[#ffd165]/4 blur-[120px]" />
      </div>

      <header className="w-full flex items-center px-6 py-4 z-10 relative">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#eab308] rounded-lg flex items-center justify-center border border-[#ffd165]/40 shadow-[0_2px_8px_rgba(234,179,8,0.3)]">
            <span className="text-[#604700] font-bold text-lg leading-none">A</span>
          </div>
          <div className="flex flex-col -space-y-0.5">
            <span className="text-[#e5e1e4] font-bold text-[28px] tracking-tight leading-none">Angel D.C.</span>
            <span className="text-[#ffd165] text-[10px] tracking-[0.2em] uppercase opacity-80 font-mono">Construction Intelligence</span>
          </div>
        </div>
      </header>

      <main className="flex-grow flex flex-col items-center justify-center px-6 relative z-10 py-8">
        <motion.div
          className="w-full max-w-[440px]"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          {sent ? (
            <>
              <div className="text-center mb-8">
                <h1 className="text-[42px] leading-[52px] font-bold tracking-[-0.02em] text-[#e5e1e4]">Key Dispatched</h1>
                <p className="text-[#d3c5ac] text-sm mt-2 opacity-80">Check your secure channel.</p>
              </div>
              <div className="p-8 rounded-2xl bg-[#1c1b1d]/90 border border-[#4f4633]/40 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.6)] relative overflow-hidden text-center">
                <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#ffd165]/30 to-transparent" />
                <div className="w-14 h-14 bg-[#ffd165]/10 border border-[#ffd165]/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 size={28} className="text-[#ffd165]" />
                </div>
                <h2 className="text-[#e5e1e4] text-xl font-semibold mb-2">Check your email</h2>
                <p className="text-[#9b8f79] text-sm mb-6">
                  We sent a password reset link to{' '}
                  <strong className="text-[#e5e1e4]">{email}</strong>.{' '}
                  Check your inbox and follow the instructions.
                </p>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-[#ffd165] hover:opacity-80 transition-opacity text-sm font-medium"
                >
                  <ArrowLeft size={14} /> Back to login
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className="text-center mb-8">
                <h1 className="text-[42px] leading-[52px] font-bold tracking-[-0.02em] text-[#e5e1e4]">Key Recovery</h1>
                <p className="text-[#d3c5ac] text-sm mt-2 opacity-80">Enter your identity to receive a reset key.</p>
              </div>

              <div className="p-8 rounded-2xl bg-[#1c1b1d]/90 border border-[#4f4633]/40 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.6)] relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#ffd165]/30 to-transparent" />

                {error && (
                  <div className="mb-5 bg-[var(--color-danger-bg)] border border-[var(--color-danger)]/30 rounded-xl px-4 py-3 text-[var(--color-danger)] text-sm">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <label htmlFor="fp-email" className="block text-[#d3c5ac] text-[11px] uppercase tracking-widest font-mono opacity-70 ms-1">
                      Corporate Identity
                    </label>
                    <div className="relative group">
                      <LayoutGrid size={18} className="absolute start-4 top-1/2 -translate-y-1/2 text-[#9b8f79] group-focus-within:text-[#ffd165] transition-colors" />
                      <input
                        id="fp-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder="Work email address"
                        autoComplete="email"
                        className="w-full bg-[#0e0e10]/40 border border-[#4f4633]/50 rounded-xl py-4 ps-12 pe-4 text-sm text-[#e5e1e4] placeholder:text-[#9b8f79]/50 focus:outline-none focus:ring-1 focus:ring-[#ffd165]/50 focus:border-[#ffd165]/50 transition-all"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#eab308] text-[#604700] font-semibold text-base py-4 rounded-xl shadow-lg premium-glow disabled:opacity-50 active:scale-[0.96] transition-all relative overflow-hidden group"
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                      {loading ? 'Dispatching…' : 'Dispatch Reset Key →'}
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                  </button>
                </form>

                <div className="mt-6 text-center">
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-1.5 text-sm text-[#9b8f79] hover:text-[#d3c5ac] transition-colors"
                  >
                    <ArrowLeft size={14} /> Back to login
                  </Link>
                </div>
              </div>
            </>
          )}
        </motion.div>
      </main>

      <footer className="w-full p-6 z-10 relative">
        <p className="text-[11px] text-[#d3c5ac]/30 flex items-center justify-center gap-3 tracking-widest text-center font-mono">
          <ShieldCheck size={16} />
          <span>ENCRYPTED ARCHITECTURAL PORTFOLIO MANAGEMENT · 2024</span>
        </p>
      </footer>
    </div>
  )
}
