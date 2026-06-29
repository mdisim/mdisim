export default function DashboardLoading() {
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto animate-pulse">
      <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-48 mb-8" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-28 bg-slate-200 dark:bg-slate-700 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="h-64 bg-slate-200 dark:bg-slate-700 rounded-xl" />
        <div className="h-64 bg-slate-200 dark:bg-slate-700 rounded-xl" />
      </div>
    </div>
  )
}
