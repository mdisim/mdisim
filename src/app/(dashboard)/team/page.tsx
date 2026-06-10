import { createClient } from '@/lib/supabase/server'
import { TeamClient } from '@/components/team/team-client'

export default async function TeamPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let members: Record<string, unknown>[] = []
  let invitations: Record<string, unknown>[] = []
  let currentProfile: { role: string | null; company_id: string | null } | null = null

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id, role')
      .eq('id', user.id)
      .single()

    currentProfile = profile

    if (profile?.company_id) {
      const [{ data: m }, { data: inv }] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('company_id', profile.company_id)
          .order('created_at', { ascending: true }),
        supabase
          .from('team_invitations')
          .select('*')
          .eq('company_id', profile.company_id)
          .eq('status', 'pending')
          .order('created_at', { ascending: false }),
      ])
      members = m ?? []
      invitations = inv ?? []
    }
  }

  return (
    <TeamClient
      members={members}
      invitations={invitations}
      currentUserId={user?.id ?? ''}
      currentRole={currentProfile?.role ?? ''}
    />
  )
}
