import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { PageTransition } from '@/components/layout/page-transition'
import { DashboardHeader } from './dashboard-header'
import { CopilotProvider } from '@/components/copilot/copilot-provider'

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

  const { data: projects } = await supabase
    .from('projects')
    .select('id, name')
    .order('created_at', { ascending: false })

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-900">
      <AppSidebar userEmail={user.email} />
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardHeader />
        <main className="flex-1 overflow-y-auto">
          <PageTransition>
            {children}
          </PageTransition>
        </main>
      </div>
      <CopilotProvider projects={(projects ?? []).map(p => ({ id: p.id, name: p.name }))} />
    </div>
  )
}
