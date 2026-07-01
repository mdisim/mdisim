import Link from 'next/link'
import { HardHat, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0e0e10] flex flex-col items-center justify-center px-6 text-center">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 start-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-[var(--color-amber)]/5 blur-[120px]" />
      </div>

      <div className="relative flex items-center gap-3 mb-12">
        <div className="w-10 h-10 bg-[var(--color-amber)] rounded-xl flex items-center justify-center shadow-lg shadow-[var(--color-amber)]/20">
          <HardHat size={20} className="text-[var(--color-on-amber)]" />
        </div>
        <div className="text-start">
          <p className="font-bold text-white text-sm leading-tight tracking-widest">ANGEL D.C.</p>
          <p className="text-[var(--color-amber)]/70 text-xs tracking-widest uppercase font-mono">Construction Intelligence</p>
        </div>
      </div>

      <h1 className="relative text-[120px] font-black text-white leading-none mb-2 tracking-tight">404</h1>
      <h2 className="relative text-xl font-semibold text-white mb-3">Page Not Found</h2>
      <p className="relative text-[var(--color-text-muted)] max-w-md mb-8 text-sm">
        The page you are looking for does not exist or has been moved.
      </p>

      <Link
        href="/projects"
        className="relative inline-flex items-center gap-2 px-6 py-3 bg-[var(--color-amber)] text-[var(--color-on-amber)] font-semibold rounded-xl shadow-lg shadow-[var(--color-amber)]/20 hover:opacity-90 transition-all active:scale-95"
      >
        <ArrowLeft size={16} />
        Back to Dashboard
      </Link>
    </div>
  )
}
