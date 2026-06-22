'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { completeOnboarding } from '@/app/actions/auth'
import {
  HardHat,
  GraduationCap,
  Wrench,
  Building2,
  Loader2,
  BookOpen,
  Calculator,
  FolderKanban,
  Users,
  FileText,
  BarChart3,
  ArrowRight,
} from 'lucide-react'
import type { AccountType } from '@/lib/types'
import { accountTypeToRole } from '@/lib/types'

const ACCOUNT_OPTIONS: {
  type: AccountType
  title: string
  subtitle: string
  icon: typeof GraduationCap
  color: string
  borderColor: string
  features: { icon: typeof BookOpen; label: string }[]
}[] = [
  {
    type: 'student',
    title: 'Student',
    subtitle: 'Learning civil engineering & quantity surveying',
    icon: GraduationCap,
    color: 'from-emerald-500 to-teal-600',
    borderColor: 'border-emerald-500',
    features: [
      { icon: BookOpen, label: 'Civil engineering courses' },
      { icon: Calculator, label: 'QS & BOQ training' },
      { icon: FileText, label: 'Measurement sheet practice' },
      { icon: BarChart3, label: 'Progress & certificates' },
    ],
  },
  {
    type: 'engineer',
    title: 'Engineer',
    subtitle: 'Freelancer, QS, site engineer, or civil engineer',
    icon: Wrench,
    color: 'from-blue-500 to-indigo-600',
    borderColor: 'border-blue-500',
    features: [
      { icon: FolderKanban, label: 'Project management' },
      { icon: FileText, label: 'BOQ, takeoff & drawings' },
      { icon: Calculator, label: 'Rebar schedule & rate analysis' },
      { icon: BarChart3, label: 'Reports & PDF/Excel export' },
    ],
  },
  {
    type: 'company',
    title: 'Company / Contractor',
    subtitle: 'Construction company or contracting firm',
    icon: Building2,
    color: 'from-amber-500 to-orange-600',
    borderColor: 'border-amber-500',
    features: [
      { icon: Users, label: 'Team & role management' },
      { icon: FolderKanban, label: 'Full project tracking' },
      { icon: BarChart3, label: 'Procurement, payments & cost control' },
      { icon: FileText, label: 'Client reports & daily site logs' },
    ],
  },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [selected, setSelected] = useState<AccountType | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleContinue = async () => {
    if (!selected) return
    setLoading(true)
    setError(null)

    try {
      const role = accountTypeToRole(selected)
      const result = await completeOnboarding(role)

      if (result.error) {
        setError(result.error)
        setLoading(false)
        return
      }

      router.push('/dashboard')
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mb-4">
            <HardHat size={28} className="text-white" />
          </div>
          <h1 className="text-white text-2xl font-bold">Welcome to ANGEL D.C.</h1>
          <p className="text-slate-400 text-sm mt-2">Choose your account type to get started</p>
        </div>

        {/* Account type cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {ACCOUNT_OPTIONS.map(opt => {
            const Icon = opt.icon
            const isSelected = selected === opt.type
            return (
              <button
                key={opt.type}
                onClick={() => setSelected(opt.type)}
                className={`relative text-left p-6 rounded-2xl border-2 transition-all duration-200 ${
                  isSelected
                    ? `${opt.borderColor} bg-slate-800/80 shadow-lg shadow-${opt.type === 'student' ? 'emerald' : opt.type === 'engineer' ? 'blue' : 'amber'}-500/10`
                    : 'border-slate-700 bg-slate-900 hover:border-slate-600 hover:bg-slate-800/60'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-white flex items-center justify-center">
                    <div className={`w-4 h-4 rounded-full bg-gradient-to-br ${opt.color}`} />
                  </div>
                )}
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${opt.color} flex items-center justify-center mb-4`}>
                  <Icon size={24} className="text-white" />
                </div>
                <h3 className="text-white text-lg font-semibold mb-1">{opt.title}</h3>
                <p className="text-slate-400 text-xs mb-4">{opt.subtitle}</p>
                <div className="space-y-2">
                  {opt.features.map((f, i) => {
                    const FIcon = f.icon
                    return (
                      <div key={i} className="flex items-center gap-2 text-xs text-slate-500">
                        <FIcon size={12} className={isSelected ? 'text-slate-300' : 'text-slate-600'} />
                        <span className={isSelected ? 'text-slate-300' : ''}>{f.label}</span>
                      </div>
                    )
                  })}
                </div>
              </button>
            )
          })}
        </div>

        {error && (
          <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        {/* Continue button */}
        <div className="flex justify-center">
          <button
            onClick={handleContinue}
            disabled={!selected || loading}
            className="flex items-center gap-2 px-8 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition-colors"
          >
            {loading ? (
              <><Loader2 size={16} className="animate-spin" /> Setting up your account...</>
            ) : (
              <>Continue <ArrowRight size={16} /></>
            )}
          </button>
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          You can change your account type later in Settings
        </p>
      </div>
    </div>
  )
}
