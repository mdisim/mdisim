export default function DashboardLoading() {
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="h-8 bg-[var(--color-surface-hover)] rounded-lg w-48 mb-8 animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-28 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="h-64 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl animate-pulse" />
        <div className="h-64 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl animate-pulse" />
      </div>
    </div>
  )
}
