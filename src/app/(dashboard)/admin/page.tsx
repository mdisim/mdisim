import { getAdminStats } from '@/app/actions/subscription'
import Link from 'next/link'
import {
  Users,
  GraduationCap,
  Wrench,
  Building2,
  CreditCard,
  DollarSign,
  Award,
  Shield,
  ClipboardList,
} from 'lucide-react'

function timeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

const TYPE_BADGE: Record<string, string> = {
  student: 'bg-emerald-100 text-emerald-800',
  engineer: 'bg-blue-100 text-blue-800',
  company: 'bg-amber-100 text-amber-800',
}

export default async function AdminDashboardPage() {
  const result = await getAdminStats()

  if ('error' in result) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Shield className="h-16 w-16 text-red-400" />
        <h1 className="text-2xl font-bold text-slate-800">Access Denied</h1>
        <p className="text-slate-500">{result.error}</p>
        <Link
          href="/dashboard"
          className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Back to Dashboard
        </Link>
      </div>
    )
  }

  const {
    totalUsers,
    studentCount,
    engineerCount,
    companyCount,
    activeSubscriptions,
    totalRevenueCents,
    totalCertificates,
    recentUsers,
  } = result

  const revenueFormatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(totalRevenueCents / 100)

  const stats = [
    { label: 'Total Users', value: totalUsers, icon: Users, bg: 'bg-blue-100', text: 'text-blue-600' },
    { label: 'Students', value: studentCount, icon: GraduationCap, bg: 'bg-emerald-100', text: 'text-emerald-600' },
    { label: 'Engineers', value: engineerCount, icon: Wrench, bg: 'bg-blue-100', text: 'text-blue-600' },
    { label: 'Companies', value: companyCount, icon: Building2, bg: 'bg-amber-100', text: 'text-amber-600' },
    { label: 'Active Subscriptions', value: activeSubscriptions, icon: CreditCard, bg: 'bg-violet-100', text: 'text-violet-600' },
    { label: 'Total Revenue', value: revenueFormatted, icon: DollarSign, bg: 'bg-green-100', text: 'text-green-600' },
    { label: 'Certificates Issued', value: totalCertificates, icon: Award, bg: 'bg-rose-100', text: 'text-rose-600' },
  ]

  const studentPct = totalUsers ? ((studentCount / totalUsers) * 100).toFixed(1) : '0'
  const engineerPct = totalUsers ? ((engineerCount / totalUsers) * 100).toFixed(1) : '0'
  const companyPct = totalUsers ? ((companyCount / totalUsers) * 100).toFixed(1) : '0'
  const otherCount = totalUsers - studentCount - engineerCount - companyCount
  const otherPct = totalUsers ? ((otherCount / totalUsers) * 100).toFixed(1) : '0'

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-slate-800">Admin Dashboard</h1>
          <span className="px-3 py-1 text-xs font-semibold bg-red-100 text-red-700 rounded-full uppercase tracking-wide">
            Super Admin
          </span>
        </div>
        <Link
          href="/admin/audit"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <ClipboardList className="h-4 w-4" />
          Audit Log
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div
              key={stat.label}
              className="bg-white rounded-xl border border-slate-200 shadow-sm p-5"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`${stat.bg} p-2.5 rounded-lg`}>
                  <Icon className={`h-5 w-5 ${stat.text}`} />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
              <p className="text-sm text-slate-500 mt-1">{stat.label}</p>
            </div>
          )
        })}
      </div>

      {/* Account Type Distribution */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Account Type Distribution</h2>
        <div className="flex h-8 rounded-lg overflow-hidden">
          {Number(studentPct) > 0 && (
            <div
              className="bg-emerald-500 flex items-center justify-center text-xs font-medium text-white"
              style={{ width: `${studentPct}%` }}
            >
              {Number(studentPct) > 5 && `${studentPct}%`}
            </div>
          )}
          {Number(engineerPct) > 0 && (
            <div
              className="bg-blue-500 flex items-center justify-center text-xs font-medium text-white"
              style={{ width: `${engineerPct}%` }}
            >
              {Number(engineerPct) > 5 && `${engineerPct}%`}
            </div>
          )}
          {Number(companyPct) > 0 && (
            <div
              className="bg-amber-500 flex items-center justify-center text-xs font-medium text-white"
              style={{ width: `${companyPct}%` }}
            >
              {Number(companyPct) > 5 && `${companyPct}%`}
            </div>
          )}
          {Number(otherPct) > 0 && (
            <div
              className="bg-slate-400 flex items-center justify-center text-xs font-medium text-white"
              style={{ width: `${otherPct}%` }}
            >
              {Number(otherPct) > 5 && `${otherPct}%`}
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-4 mt-3 text-sm">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-emerald-500" /> Students ({studentPct}%)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-blue-500" /> Engineers ({engineerPct}%)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-amber-500" /> Companies ({companyPct}%)
          </span>
          {otherCount > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-slate-400" /> Other ({otherPct}%)
            </span>
          )}
        </div>
      </div>

      {/* Recent Users Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">Recent Users</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-slate-500">
                <th className="px-6 py-3 font-medium">Name</th>
                <th className="px-6 py-3 font-medium">Account Type</th>
                <th className="px-6 py-3 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-3 font-medium text-slate-800">
                    {user.full_name || '—'}
                  </td>
                  <td className="px-6 py-3">
                    {user.role ? (
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${TYPE_BADGE[user.role] ?? 'bg-slate-100 text-slate-700'}`}
                      >
                        {user.role}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-slate-500">
                    {timeAgo(user.created_at)}
                  </td>
                </tr>
              ))}
              {recentUsers.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-slate-400">
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
