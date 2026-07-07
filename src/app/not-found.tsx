import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ScaleMark } from '@/components/icons/marks'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-center px-6 text-center">
      <div className="flex items-center gap-2.5 mb-12">
        <div className="w-8 h-8 rounded-[var(--radius-md)] bg-[var(--color-brand-tint)] flex items-center justify-center">
          <ScaleMark size={16} className="text-[var(--color-brand)]" />
        </div>
        <span className="font-bold text-[15px] tracking-tight text-[var(--foreground)]">Angel D.C.</span>
      </div>

      <h1 className="text-[120px] font-black text-[var(--foreground)] leading-none mb-2 tracking-tight">404</h1>
      <h2 className="text-xl font-semibold text-[var(--foreground)] mb-3">Page not found</h2>
      <p className="text-[var(--color-text-muted)] max-w-md mb-8 text-sm">
        The page you are looking for does not exist or has been moved.
      </p>

      <Link
        href="/projects"
        className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--color-brand)] text-white font-semibold rounded-[var(--radius-lg)] hover:bg-[var(--color-brand-strong)] transition-all active:scale-95"
      >
        <ArrowLeft size={16} />
        Back to projects
      </Link>
    </div>
  )
}
