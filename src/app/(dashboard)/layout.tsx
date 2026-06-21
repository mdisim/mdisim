import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { BottomNav } from '@/components/layout/bottom-nav'
import { SidebarProvider } from '@/components/layout/sidebar-context'
import { LanguageProvider } from '@/components/language-provider'
import { AdminModeProvider } from '@/components/admin-mode-context'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const [{ count: unreadCount }, { data: profileData }] = await Promise.all([
    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false),
    supabase
      .from('profiles')
      .select('account_type')
      .eq('id', user.id)
      .single(),
  ])

  const accountType = (profileData?.account_type as string | null)
    ?? (user.user_metadata?.account_type as string | null)
    ?? null

  return (
    <LanguageProvider>
      <AdminModeProvider>
        <SidebarProvider>
          <div className="flex h-screen bg-slate-50 overflow-hidden">
            <Sidebar unreadNotifications={unreadCount ?? 0} userEmail={user.email} accountType={accountType} />
            <div className="flex-1 flex flex-col overflow-hidden min-w-0">
              <Header userEmail={user.email} />
              <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-20 md:pb-8">
                {children}
              </main>
            </div>
            <BottomNav accountType={accountType} />
          </div>
        </SidebarProvider>
      </AdminModeProvider>
    </LanguageProvider>
  )
}
