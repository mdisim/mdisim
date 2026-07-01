export default function ProjectLoading() {
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-24 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl animate-pulse" />
        ))}
      </div>
      <div className="h-96 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl animate-pulse" />
    </div>
  )
}
