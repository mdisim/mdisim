'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Mail, Lock, Loader2, ArrowRight, Fingerprint, ShieldCheck } from 'lucide-react'
import { motion } from 'framer-motion'
import { signIn } from '@/app/actions/auth'
import { useI18n } from '@/lib/i18n'

export default function LoginPage() {
  const router = useRouter()
  const { t, locale, setLocale } = useI18n()
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
    <div className="min-h-screen bg-[#131315] text-[#e5e1e4] flex flex-col overflow-x-hidden">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full bg-[#ffd165]/4 blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/4 w-[300px] h-[300px] rounded-full bg-[#eab308]/3 blur-[80px]" />
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
        <div className="flex items-center gap-1 bg-[#201f22]/40 backdrop-blur-md p-1 rounded-full border border-[#4f4633]/30">
          {(['en', 'ar', 'he'] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLocale(l)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-mono transition-all uppercase ${
                locale === l
                  ? 'text-[#ffd165] bg-[#ffd165]/10'
                  : 'text-[#d3c5ac] hover:text-[#e5e1e4]'
              }`}
            >
              {l}
            </button>
          ))}
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
          {/* Headline */}
          <div className="text-center mb-8">
            <h1 className="text-[36px] leading-[44px] font-semibold tracking-[-0.02em] text-[#e5e1e4]">Welcome Back</h1>
            <p className="text-[#d3c5ac] text-sm mt-2 opacity-80">Accessing the global structural intelligence network.</p>
          </div>

          {/* Glass card */}
          <div className="glass-card p-8 rounded-2xl relative overflow-hidden">
            {/* Top shine */}
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#ffd165]/30 to-transparent" />

            <form onSubmit={handleLogin} className="space-y-6">
              {/* Email */}
              <div className="space-y-2">
                <label
                  htmlFor="login-email"
                  className="block text-[#d3c5ac] text-[11px] uppercase tracking-widest font-mono opacity-70 ms-1"
                >
                  Corporate Identity
                </label>
                <div className="relative group">
                  <Mail
                    size={18}
                    className="absolute start-4 top-1/2 -translate-y-1/2 text-[#9b8f79] group-focus-within:text-[#ffd165] transition-colors"
                  />
                  <input
                    id="login-email"
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

              {/* Password */}
              <div className="space-y-2">
                <div className="flex justify-between items-center ms-1">
                  <label
                    htmlFor="login-password"
                    className="text-[#d3c5ac] text-[11px] uppercase tracking-widest font-mono opacity-70"
                  >
                    Security Key
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-[11px] font-mono text-[#ffd165]/80 hover:text-[#ffd165] transition-colors"
                  >
                    Recovery?
                  </Link>
                </div>
                <div className="relative group">
                  <Lock
                    size={18}
                    className="absolute start-4 top-1/2 -translate-y-1/2 text-[#9b8f79] group-focus-within:text-[#ffd165] transition-colors"
                  />
                  <input
                    id="login-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                    className="w-full bg-[#0e0e10]/40 border border-[#4f4633]/20 rounded-xl py-4 ps-12 pe-4 text-sm text-[#e5e1e4] placeholder:text-[#9b8f79]/50 focus:outline-none focus:ring-1 focus:ring-[#ffd165]/50 focus:border-[#ffd165]/50 transition-all"
                  />
                </div>
              </div>

              {error && (
                <div className="bg-[var(--color-danger-bg)] border border-[var(--color-danger)]/30 rounded-xl px-4 py-3 text-[var(--color-danger)] text-sm">
                  {error}
                </div>
              )}

              {/* CTA */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#eab308] text-[#604700] font-semibold text-base py-4 rounded-xl shadow-lg premium-glow disabled:opacity-50 active:scale-[0.96] transition-all relative overflow-hidden group"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
                  {loading ? 'Accessing…' : 'Access Dashboard →'}
                </span>
                {/* Shimmer */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-4 my-8">
              <div className="h-px bg-[#4f4633]/20 flex-grow" />
              <span className="text-[10px] text-[#9b8f79] tracking-widest uppercase font-mono">Federated Access</span>
              <div className="h-px bg-[#4f4633]/20 flex-grow" />
            </div>

            {/* SSO */}
            <button className="w-full bg-[#2a2a2c]/20 border border-[#4f4633]/30 text-[#e5e1e4] text-sm py-3.5 rounded-xl flex items-center justify-center gap-3 hover:bg-[#2a2a2c]/40 transition-all active:scale-[0.98]">
              <Fingerprint size={20} className="text-[#9b8f79]" />
              Sign in with Passkey
            </button>

            {/* Footer links */}
            <div className="mt-8 flex justify-between items-center px-2">
              <p className="text-[11px] text-[#d3c5ac]">
                Unregistered?{' '}
                <Link href="/register" className="text-[#ffd165] font-semibold hover:underline">
                  Request Node Access
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

      {/* Page footer */}
      <footer className="w-full p-6 z-10 relative">
        <p className="text-[11px] text-[#d3c5ac]/30 flex items-center justify-center gap-3 tracking-widest text-center font-mono">
          <ShieldCheck size={16} />
          <span>ANGEL D.C. CONSTRUCTION INTELLIGENCE · ENTERPRISE PLATFORM · SECURE NODE v1.2</span>
        </p>
      </footer>
    </div>
  )
}
