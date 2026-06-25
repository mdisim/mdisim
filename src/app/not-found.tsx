import Link from 'next/link'
import { HardHat } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center px-6 text-center">
      {/* Brand */}
      <div className="flex items-center gap-3 mb-10">
        <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center">
          <HardHat size={22} className="text-white" />
        </div>
        <div className="text-left">
          <p className="font-bold text-slate-800 dark:text-white text-sm leading-tight">ANGEL D.C.</p>
          <p className="text-amber-500 text-xs">Construction Management</p>
        </div>
      </div>

      {/* 404 */}
      <h1 className="text-8xl font-black text-slate-800 dark:text-white leading-none mb-4">404</h1>
      <h2 className="text-xl font-semibold text-slate-700 mb-3">Page Not Found</h2>
      <p className="text-slate-500 max-w-md mb-8">
        The page you are looking for does not exist or has been moved.
      </p>

      <Link
        href="/dashboard"
        className="px-6 py-3 bg-slate-800 dark:bg-slate-700 text-white font-medium rounded-lg hover:bg-slate-700 dark:hover:bg-slate-600 transition-colors"
      >
        Back to Dashboard
      </Link>
    </div>
  )
}
