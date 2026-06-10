interface LoadingSkeletonProps {
  rows?: number
  className?: string
}

export function LoadingSkeleton({ rows = 3, className }: LoadingSkeletonProps) {
  return (
    <div className={className}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="mb-3 last:mb-0">
          <div
            className="skeleton h-10 rounded-lg w-full"
            style={{ opacity: 1 - i * 0.1 }}
          />
        </div>
      ))}
    </div>
  )
}

export function LoadingCard() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="skeleton h-4 w-24 rounded mb-3" />
      <div className="skeleton h-8 w-16 rounded mb-2" />
      <div className="skeleton h-3 w-20 rounded" />
    </div>
  )
}
