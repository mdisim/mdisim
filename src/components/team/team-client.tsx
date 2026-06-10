'use client'

import { useState } from 'react'
import { updateMemberRole, inviteMember, cancelInvitation } from '@/app/actions/team'

const roleBadge: Record<string, string> = {
  super_admin: 'bg-purple-100 text-purple-800',
  company_admin: 'bg-navy-100 text-blue-900 bg-blue-100',
  project_manager: 'bg-blue-100 text-blue-700',
  quantity_surveyor: 'bg-teal-100 text-teal-700',
  site_engineer: 'bg-amber-100 text-amber-700',
  viewer: 'bg-gray-100 text-gray-600',
}

const roleLabel: Record<string, string> = {
  super_admin: 'Super Admin',
  company_admin: 'Company Admin',
  project_manager: 'Project Manager',
  quantity_surveyor: 'Quantity Surveyor',
  site_engineer: 'Site Engineer',
  viewer: 'Viewer',
}

const allRoles = ['company_admin', 'project_manager', 'quantity_surveyor', 'site_engineer', 'viewer']

interface Member {
  id: string
  full_name: string | null
  role: string | null
  created_at: string
  [key: string]: unknown
}

interface Invitation {
  id: string
  email: string
  role: string
  created_at: string
  expires_at: string
  status: string | null
}

interface TeamClientProps {
  members: Record<string, unknown>[]
  invitations: Record<string, unknown>[]
  currentUserId: string
  currentRole: string
}

export function TeamClient({ members, invitations, currentUserId, currentRole }: TeamClientProps) {
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('viewer')
  const [inviting, setInviting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [toastMsg, setToastMsg] = useState('')

  const isAdmin = ['company_admin', 'super_admin'].includes(currentRole)

  const typedMembers = members as Member[]
  const typedInvitations = invitations as unknown as Invitation[]

  const admins = typedMembers.filter(m => ['super_admin', 'company_admin'].includes(m.role ?? ''))
  const activeThisMonth = typedMembers.length // placeholder
  const pendingCount = typedInvitations.length

  async function handleRoleChange(profileId: string, newRole: string) {
    const result = await updateMemberRole(profileId, newRole)
    if ('error' in result) {
      showToast('Error: ' + result.error)
    } else {
      showToast('Role updated')
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviting(true)
    const result = await inviteMember(inviteEmail, inviteRole)
    setInviting(false)
    if ('error' in result) {
      setMessage({ type: 'error', text: result.error ?? 'Error' })
    } else {
      setMessage({ type: 'success', text: 'Invitation created successfully' })
      setInviteEmail('')
      setInviteRole('viewer')
      setTimeout(() => {
        setShowInviteModal(false)
        setMessage(null)
      }, 1500)
    }
  }

  async function handleCancel(id: string) {
    const result = await cancelInvitation(id)
    if ('error' in result) {
      showToast('Error: ' + result.error)
    } else {
      showToast('Invitation cancelled')
    }
  }

  function showToast(text: string) {
    setToastMsg(text)
    setTimeout(() => setToastMsg(''), 3000)
  }

  function getInitials(name: string | null, email?: unknown) {
    if (name) {
      return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    }
    const e = email as string | undefined
    return e ? e[0].toUpperCase() : '?'
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-4 right-4 z-50 bg-slate-800 text-white px-4 py-2 rounded-lg shadow-lg text-sm">
          {toastMsg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Team Management</h1>
          <p className="text-slate-500 text-sm mt-1">Manage your company team members and invitations</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${roleBadge[currentRole] ?? 'bg-gray-100 text-gray-600'}`}>
            {roleLabel[currentRole] ?? currentRole}
          </span>
          {isAdmin && (
            <button
              onClick={() => setShowInviteModal(true)}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              + Invite Member
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Members', value: typedMembers.length },
          { label: 'Admins', value: admins.length },
          { label: 'Active This Month', value: activeThisMonth },
          { label: 'Pending Invitations', value: pendingCount },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-400 uppercase tracking-wide">{kpi.label}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Members Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">Members</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Member</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Role</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Joined</th>
                {isAdmin && <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {typedMembers.map(member => (
                <tr key={member.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-semibold text-sm shrink-0">
                        {getInitials(member.full_name, member.email)}
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{member.full_name ?? 'Unnamed'}</p>
                        <p className="text-xs text-slate-400">{String(member.email ?? '')}</p>
                      </div>
                      {member.id === currentUserId && (
                        <span className="text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full">You</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${roleBadge[member.role ?? ''] ?? 'bg-gray-100 text-gray-600'}`}>
                      {roleLabel[member.role ?? ''] ?? member.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500">
                    {new Date(member.created_at).toLocaleDateString()}
                  </td>
                  {isAdmin && (
                    <td className="px-6 py-4">
                      {member.id !== currentUserId && (
                        <select
                          defaultValue={member.role ?? 'viewer'}
                          onChange={e => handleRoleChange(member.id, e.target.value)}
                          className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                        >
                          {allRoles.map(r => (
                            <option key={r} value={r}>{roleLabel[r]}</option>
                          ))}
                        </select>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pending Invitations */}
      {typedInvitations.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800">Pending Invitations</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Email</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Role</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Invited</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Expires</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {typedInvitations.map(inv => (
                  <tr key={inv.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-slate-800">{inv.email}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${roleBadge[inv.role] ?? 'bg-gray-100 text-gray-600'}`}>
                        {roleLabel[inv.role] ?? inv.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">{new Date(inv.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-slate-500">{new Date(inv.expires_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">
                        {inv.status ?? 'pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => showToast('Resend functionality requires email integration')}
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          Resend
                        </button>
                        <button
                          onClick={() => handleCancel(inv.id)}
                          className="text-xs text-red-600 hover:text-red-800"
                        >
                          Cancel
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800">Invite Team Member</h3>
              <button onClick={() => { setShowInviteModal(false); setMessage(null) }} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleInvite} className="p-6 space-y-4">
              <div>
                <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1.5">Email Address</label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1.5">Role</label>
                <select
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {allRoles.map(r => (
                    <option key={r} value={r}>{roleLabel[r]}</option>
                  ))}
                </select>
              </div>
              {message && (
                <p className={`text-sm px-3 py-2 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                  {message.text}
                </p>
              )}
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => { setShowInviteModal(false); setMessage(null) }} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800">Cancel</button>
                <button type="submit" disabled={inviting} className="px-6 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors">
                  {inviting ? 'Sending...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
