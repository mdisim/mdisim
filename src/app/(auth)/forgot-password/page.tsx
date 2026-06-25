'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { HardHat, Mail, ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react'
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
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSent(true)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-500/20">
            <HardHat size={28} className="text-white" />
          </div>
          <h1 className="text-white text-2xl font-bold tracking-widest">ANGEL D.C.</h1>
          <p className="text-blue-400/70 text-sm mt-1 tracking-wide">Construction Intelligence</p>
        </div>

        <div className="bg-slate-900 rounded-2xl p-8 border border-slate-800 shadow-2xl shadow-black/20">
          {sent ? (
            <div className="text-center">
              <CheckCircle2 size={48} className="text-green-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-white mb-2">Check your email</h2>
              <p className="text-slate-400 text-sm mb-6">
                We sent a password reset link to <strong className="text-white">{email}</strong>. Check your inbox and follow the instructions.
              </p>
              <Link href="/login" className="text-blue-400 hover:text-blue-300 text-sm font-medium">
                Back to login
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-white text-xl font-semibold mb-1">Reset password</h2>
              <p className="text-slate-400 text-sm mb-6">Enter your email and we&apos;ll send you a reset link.</p>

              {error && (
                <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">{error}</div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-300 mb-1.5">Email address</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="you@company.com"
                      className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-semibold rounded-lg py-2.5 text-sm transition-colors flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 size={16} className="animate-spin" />}
                  {loading ? 'Sending...' : 'Send reset link'}
                </button>
              </form>

              <div className="mt-6 text-center">
                <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-300">
                  <ArrowLeft size={14} /> Back to login
                </Link>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  )
}
