'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

/**
 * The workspace has no surrounding app shell to carry account/logout, so it
 * carries its own — a single unobtrusive affordance instead of reintroducing
 * a permanent header just to hold one button.
 */
export function WorkspaceUserMenu() {
  const router = useRouter()
  const [email, setEmail] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null))
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (!email) return null

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        title={email}
        aria-label="Account menu"
        className="flex items-center justify-center w-6 h-6 rounded-full bg-[var(--color-brand-tint)] text-[var(--color-brand)] text-[11px] font-semibold shrink-0 hover:opacity-80 transition-opacity focus-ring"
      >
        {email.charAt(0).toUpperCase()}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute end-0 top-full mt-1 z-20 bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-[var(--radius-md)] shadow-[var(--shadow-dropdown)] py-1 min-w-[180px]">
            <div className="px-3 py-1.5 text-[11px] text-[var(--color-text-muted)] truncate border-b border-[var(--color-border)] mb-1">{email}</div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-start text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-danger)] transition-colors"
            >
              <LogOut size={13} /> Log out
            </button>
          </div>
        </>
      )}
    </div>
  )
}
