export default function ProjectLoading() {
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-24 bg-slate-200 dark:bg-slate-700 rounded-xl" />
        ))}
      </div>
      <div className="h-96 bg-slate-200 dark:bg-slate-700 rounded-xl" />
    </div>
  )
}
