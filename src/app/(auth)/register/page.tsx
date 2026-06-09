'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { HardHat, Mail, Lock, Loader2, CheckCircle } from 'lucide-react'

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
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/api/auth/callback` },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSuccess(true)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md w-full text-center">
          <CheckCircle size={48} className="text-green-400 mx-auto mb-4" />
          <h2 className="text-white text-xl font-semibold mb-2">Check your email</h2>
          <p className="text-slate-400 text-sm">We sent a confirmation link to <strong className="text-white">{email}</strong>. Click it to activate your account.</p>
          <Link href="/login" className="mt-6 inline-block text-amber-400 hover:text-amber-300 text-sm">
            Back to login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-amber-500 rounded-2xl flex items-center justify-center mb-4">
            <HardHat size={28} className="text-white" />
          </div>
          <h1 className="text-white text-2xl font-bold">ANGEL D.C.</h1>
          <p className="text-slate-400 text-sm mt-1">Construction Management Platform</p>
        </div>

        <div className="bg-slate-900 rounded-2xl p-8 border border-slate-800">
          <h2 className="text-white text-xl font-semibold mb-1">Create account</h2>
          <p className="text-slate-400 text-sm mb-6">Start managing your projects</p>

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm text-slate-300 mb-1.5">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-1.5">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  minLength={8}
                  required
                  className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-1.5">Confirm Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repeat password"
                  required
                  className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-white font-semibold rounded-lg py-2.5 text-sm transition-colors flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-400 mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-amber-400 hover:text-amber-300">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
