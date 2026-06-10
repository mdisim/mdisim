import { createClient } from '@/lib/supabase/server'
import { Bell, AlertTriangle, CheckCircle, Info, Check } from 'lucide-react'
import { markAllRead } from '@/app/actions/notifications'

interface NotificationRow {
  id: string
  title: string
  message: string | null
  type: string | null
  is_read: boolean
  created_at: string
}

function groupByDate(items: NotificationRow[]) {
  const groups: Record<string, NotificationRow[]> = {}
  for (const item of items) {
    const date = new Date(item.created_at).toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    })
    if (!groups[date]) groups[date] = []
    groups[date].push(item)
  }
  return groups
}

const typeIcon: Record<string, React.ReactNode> = {
  info: <Info size={16} className="text-blue-500" />,
  warning: <AlertTriangle size={16} className="text-amber-500" />,
  success: <CheckCircle size={16} className="text-green-500" />,
  error: <AlertTriangle size={16} className="text-red-500" />,
}

const typeBorder: Record<string, string> = {
  info: 'border-l-blue-400',
  warning: 'border-l-amber-400',
  success: 'border-l-green-400',
  error: 'border-l-red-400',
}

export default async function NotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: notifications } = await supabase
    .from('notifications')
    .select('id, title, message, type, is_read, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(200)

  const items: NotificationRow[] = (notifications ?? []) as NotificationRow[]
  const unreadCount = items.filter(n => !n.is_read).length
  const groups = groupByDate(items)

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
          <p className="text-slate-500 text-sm mt-1">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </p>
        </div>
        {unreadCount > 0 && (
          <form action={markAllRead}>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 text-sm font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg transition-colors"
            >
              <Check size={14} /> Mark all read
            </button>
          </form>
        )}
      </div>

      {items.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <Bell size={40} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No notifications yet</p>
          <p className="text-slate-400 text-sm mt-1">Activity updates will appear here.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groups).map(([date, dayItems]) => (
            <div key={date}>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">{date}</p>
              <div className="space-y-2">
                {dayItems.map((n) => {
                  const t = n.type ?? 'info'
                  return (
                    <div
                      key={n.id}
                      className={`bg-white border border-slate-200 border-l-4 rounded-xl px-4 py-3 flex items-start gap-3 ${typeBorder[t] ?? 'border-l-slate-300'} ${!n.is_read ? 'shadow-sm' : 'opacity-70'}`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {typeIcon[t] ?? <Bell size={16} className="text-slate-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${!n.is_read ? 'font-semibold text-slate-800' : 'font-medium text-slate-600'}`}>
                          {n.title}
                        </p>
                        {n.message && (
                          <p className="text-xs text-slate-500 mt-0.5">{n.message}</p>
                        )}
                        <p className="text-xs text-slate-400 mt-1">
                          {new Date(n.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      {!n.is_read && (
                        <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
