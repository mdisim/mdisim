import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { I18nProvider } from '@/lib/i18n'

/**
 * The instrument workspace gets the whole viewport — no AppSidebar, no
 * DashboardHeader, no ProjectNav. Those belong to the rest of the product;
 * the workspace's own titlebar is the only chrome it needs.
 */
export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <I18nProvider>
      <div className="h-screen overflow-hidden bg-[var(--background)]">
        {children}
      </div>
    </I18nProvider>
  )
}
