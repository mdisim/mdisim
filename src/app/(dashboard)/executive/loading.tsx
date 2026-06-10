export default function ExecutiveLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="h-4 w-20 bg-slate-200 rounded mb-3" />
            <div className="h-8 w-24 bg-slate-200 rounded" />
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-72 bg-slate-200 rounded-xl" />
        <div className="h-72 bg-slate-200 rounded-xl" />
      </div>

      <div className="h-64 bg-slate-200 rounded-xl" />
    </div>
  )
}
