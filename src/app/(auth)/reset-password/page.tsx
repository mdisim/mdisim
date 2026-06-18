'use client'

import { Suspense } from 'react'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { HardHat, Lock, Loader2, ArrowLeft } from 'lucide-react'

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
    if (!code) {
      setSessionReady(true)
      return
    }

    const supabase = createClient()
    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) {
        setError('Invalid or expired reset link. Please request a new one.')
      } else {
        setSessionReady(true)
      }
    })
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSuccess(true)
      setLoading(false)
      setTimeout(() => router.push('/login'), 2500)
    }
  }

  if (success) {
    return (
      <div className="text-center">
        <div className="w-14 h-14 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock size={24} className="text-green-400" />
        </div>
        <h2 className="text-white text-xl font-semibold mb-2">Password updated!</h2>
        <p className="text-slate-400 text-sm mb-4">Your password has been changed. Redirecting to login…</p>
        <Link href="/login" className="text-blue-400 hover:text-blue-300 text-sm flex items-center justify-center gap-1">
          <ArrowLeft size={14} /> Go to login
        </Link>
      </div>
    )
  }

  if (!sessionReady && !error) {
    return (
      <div className="text-center py-8">
        <Loader2 size={32} className="animate-spin text-blue-500 mx-auto mb-4" />
        <p className="text-slate-400 text-sm">Verifying reset link…</p>
      </div>
    )
  }

  if (error && !sessionReady) {
    return (
      <div className="space-y-4">
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">{error}</div>
        <Link href="/forgot-password" className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1">
          <ArrowLeft size={14} /> Request a new reset link
        </Link>
      </div>
    )
  }

  return (
    <>
      <h2 className="text-white text-xl font-semibold mb-1">Choose a new password</h2>
      <p className="text-slate-400 text-sm mb-6">Enter your new password below.</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-slate-300 mb-1.5">New Password</label>
          <div className="relative">
            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={8}
              className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-slate-300 mb-1.5">Confirm New Password</label>
          <div className="relative">
            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-semibold rounded-lg py-2.5 text-sm transition-colors flex items-center justify-center gap-2"
        >
          {loading && <Loader2 size={16} className="animate-spin" />}
          {loading ? 'Updating…' : 'Update Password'}
        </button>
      </form>
    </>
  )
}

export default function ResetPasswordPage() {
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
          <Suspense fallback={
            <div className="text-center py-8">
              <Loader2 size={32} className="animate-spin text-blue-500 mx-auto mb-4" />
              <p className="text-slate-400 text-sm">Loading…</p>
            </div>
          }>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
